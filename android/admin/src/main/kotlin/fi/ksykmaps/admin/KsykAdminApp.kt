package fi.ksykmaps.admin

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.posthog.android.PostHogAndroid
import com.posthog.android.PostHogAndroidConfig

class KsykAdminApp : Application() {
    override fun onCreate() {
        super.onCreate()
        initializePostHog()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(
                NotificationChannel(
                    "admin_alerts",
                    "Admin Alerts",
                    NotificationManager.IMPORTANCE_DEFAULT,
                ).apply { description = "KSYK Maps Admin alerts and notifications" }
            )
        }
    }

    private fun initializePostHog() {
        val apiKey = BuildConfig.POSTHOG_API_KEY
        if (apiKey.isBlank()) {
            if (BuildConfig.DEBUG) {
                error("POSTHOG_API_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_API_KEY is configured")
            }
            return
        }

        val host = BuildConfig.POSTHOG_HOST
        if (host.isBlank()) {
            if (BuildConfig.DEBUG) {
                error("POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_HOST is configured")
            }
            return
        }

        PostHogAndroid.setup(this, PostHogAndroidConfig(apiKey = apiKey, host = host).apply {
            errorTrackingConfig.autoCapture = true
        })
    }
}
