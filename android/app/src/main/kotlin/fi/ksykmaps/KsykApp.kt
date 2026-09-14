package fi.ksykmaps

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.google.firebase.messaging.FirebaseMessaging
import com.posthog.PostHog
import com.posthog.android.PostHogAndroid
import com.posthog.android.PostHogAndroidConfig
import io.sentry.Sentry
import io.sentry.android.core.SentryAndroid
import fi.ksykmaps.data.Api
import fi.ksykmaps.data.AppLog
import fi.ksykmaps.ui.refreshServerMapDefaults
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Application singleton. Holds the in-memory session + the OkHttp client
 * used by every screen so we don't pay the socket-setup cost on every
 * navigate.
 *
 * Notification channels (Android 8+):
 *   CHANNEL_TIMETABLE — upcoming lesson reminders
 *   CHANNEL_NAVIGATION — turn-by-turn navigation prompts
 *   CHANNEL_GENERAL — announcements and general alerts
 */
class KsykApp : Application() {
    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    override fun onCreate() {
        super.onCreate()
        instance = this
        // Each initialiser wrapped separately — a failure in one must not
        // cascade and take down the whole app. Historically Firebase auto-init
        // (v1.68-1.70) failed with NoClassDefFoundError on some devices and
        // crashed the whole process, taking the map with it.
        runCatching { installCrashHandler() }
        runCatching { initSentry() }
        runCatching { initPostHog() }
        runCatching { createNotificationChannels() }
        runCatching { prefetchMapData() }
        runCatching { registerFcmToken() }
    }

    private fun initSentry() {
        runCatching {
            SentryAndroid.init(this) { options ->
                options.dsn = BuildConfig.SENTRY_DSN
                options.release = "${BuildConfig.APPLICATION_ID}@${BuildConfig.VERSION_NAME}"
                options.tracesSampleRate = 0.2
                options.isEnableUserInteractionTracing = true
                options.isEnableAppLifecycleBreadcrumbs = true
            }
            android.util.Log.i("Sentry", "Initialized (release=${BuildConfig.APPLICATION_ID}@${BuildConfig.VERSION_NAME})")
        }.onFailure {
            android.util.Log.w("Sentry", "Init failed: ${it.message}")
        }
    }

    private fun initPostHog() {
        val apiKey = BuildConfig.POSTHOG_API_KEY ?: run {
            android.util.Log.w("PostHog", "POSTHOG_API_KEY not configured — analytics disabled")
            return
        }
        runCatching {
            val host = BuildConfig.POSTHOG_HOST ?: "https://us.i.posthog.com"
            val config = PostHogAndroidConfig(apiKey = apiKey, host = host).apply {
                // v1.71.0: broadened replay config so admins can watch users
                // navigate the map/timetable in the panel. Images are NOT
                // masked (map tiles need to render) but text inputs ARE
                // (search, name fields — anything PII).
                sessionReplay = true
                captureApplicationLifecycleEvents = true
                captureDeepLinks = true
                captureScreenViews = true
                sessionReplayConfig.maskAllImages = false
                sessionReplayConfig.maskAllTextInputs = true
                sessionReplayConfig.captureLogcat = true
                sessionReplayConfig.screenshot = true
                sessionReplayConfig.throttleDelayMs = 500
            }
            PostHogAndroid.setup(this, config)
            android.util.Log.i("PostHog", "Initialized (session replay + screenshots + logcat on)")
            // Register our ksyk_session_id as a super-property so every
            // PostHog event carries it. Makes the admin panel's
            // "Watch replay in PostHog" link resolve via property filter.
            // PostHog Android SDK register() takes (key, value), not a Map.
            runCatching {
                val ksykSessionId = fi.ksykmaps.data.Analytics.sessionId()
                PostHog.register("ksyk_session_id", ksykSessionId)
            }
            PostHog.capture(
                "app_started",
                properties = mapOf(
                    "platform"     to "android",
                    "app_version"  to BuildConfig.VERSION_NAME,
                    "version_code" to BuildConfig.VERSION_CODE,
                    "android_sdk"  to Build.VERSION.SDK_INT,
                    "device"       to "${Build.MANUFACTURER} ${Build.MODEL}",
                    "locale"       to Locale.getDefault().toString(),
                ),
            )
        }.onFailure {
            android.util.Log.w("PostHog", "Init failed: ${it.message}")
        }
    }

    private fun registerFcmToken() {
        // Wrap the whole call in appScope + try/catch so a missing/failed
        // Firebase init cannot crash the app on startup. This ran on the
        // main thread indirectly (via lazy getInstance) in v1.68-1.70 and
        // caused a NoClassDefFoundError chain that killed the map on open.
        appScope.launch(Dispatchers.IO) {
            try {
                // Firebase is initialised automatically via google-services.json.
                // If Play Services isn't present on the device, getInstance()
                // will throw — we swallow that here so the app stays usable.
                val messaging = try { FirebaseMessaging.getInstance() }
                    catch (t: Throwable) {
                        AppLog.warn("FCM", "Firebase unavailable: ${t.message}")
                        return@launch
                    }
                val token = try { messaging.token.await() }
                    catch (t: Throwable) {
                        AppLog.warn("FCM", "Token fetch failed: ${t.message}")
                        return@launch
                    }
                val body = buildJsonObject {
                    put("fcmToken", token)
                    put("platform", "android")
                    put("appVersion", BuildConfig.VERSION_NAME)
                }
                try {
                    Api.post("/push-tokens", body)
                    AppLog.info("FCM", "Token registered on startup")
                } catch (e: Exception) {
                    AppLog.warn("FCM", "Token upload failed: ${e.message}")
                }
            } catch (t: Throwable) {
                AppLog.warn("FCM", "Startup registration threw: ${t.message}")
            }
        }
    }

    private fun prefetchMapData() {
        val paths = listOf("/buildings", "/rooms", "/hallways", "/doors")
        paths.forEach { path ->
            appScope.launch(Dispatchers.IO) {
                try { Api.get(path) } catch (_: Exception) {}
            }
        }
        // Fetch server-defined map defaults (camera centre + rotation/tilt)
        // so MapScreen uses the admin-configured bearing on first open.
        appScope.launch(Dispatchers.IO) {
            try { refreshServerMapDefaults(applicationContext) } catch (_: Exception) {}
        }
    }

    /**
     * Persist crashes to filesDir so the user can share them from the
     * Settings screen. Without this a raw force-close leaves no artifact.
     */
    private fun installCrashHandler() {
        val default = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            try {
                val log = File(filesDir, "last_crash.txt")
                val sw = StringWriter()
                val pw = PrintWriter(sw)
                pw.println("=== KSYK crash ${SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date())} ===")
                pw.println("Thread: ${thread.name}")
                pw.println("Android: ${Build.VERSION.SDK_INT} ${Build.MANUFACTURER} ${Build.MODEL}")
                pw.println("App version: ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})")
                pw.println()
                throwable.printStackTrace(pw)
                pw.flush()
                log.writeText(sw.toString())
            } catch (_: Throwable) { /* nothing we can do */ }
            try { Sentry.captureException(throwable) } catch (_: Throwable) {}
            try {
                PostHog.capture(
                    "app_crash",
                    properties = mapOf(
                        "error_message" to (throwable.message ?: "unknown"),
                        "error_type" to throwable.javaClass.simpleName,
                        "thread" to thread.name,
                        "app_version" to BuildConfig.VERSION_NAME,
                        "android_sdk" to Build.VERSION.SDK_INT,
                        "device" to "${Build.MANUFACTURER} ${Build.MODEL}",
                    ),
                )
            } catch (_: Throwable) {}
            default?.uncaughtException(thread, throwable)
        }
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = getSystemService(NotificationManager::class.java) ?: return

        nm.createNotificationChannel(NotificationChannel(
            CHANNEL_TIMETABLE,
            "Lukujärjestys",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply { description = "Muistutukset tulevista tunneista" })

        nm.createNotificationChannel(NotificationChannel(
            CHANNEL_NAVIGATION,
            "Navigointi",
            NotificationManager.IMPORTANCE_LOW,
        ).apply { description = "Sisäopastuksen ohjeet" })

        nm.createNotificationChannel(NotificationChannel(
            CHANNEL_GENERAL,
            "Tiedotteet",
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply { description = "Koulun tiedotteet ja ilmoitukset" })

        nm.createNotificationChannel(NotificationChannel(
            CHANNEL_PUSH,
            "Push-ilmoitukset",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply { description = "Reaaliaikaiset ilmoitukset koulusta" })
    }

    companion object {
        lateinit var instance: KsykApp
            private set

        const val CHANNEL_TIMETABLE  = "ksyk_timetable"
        const val CHANNEL_NAVIGATION = "ksyk_navigation"
        const val CHANNEL_GENERAL    = "ksyk_general"
        const val CHANNEL_PUSH       = "ksyk_push"
    }
}
