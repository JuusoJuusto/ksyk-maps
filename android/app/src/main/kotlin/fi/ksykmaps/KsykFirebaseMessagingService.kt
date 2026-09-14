package fi.ksykmaps

import android.app.PendingIntent
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import fi.ksykmaps.data.Api
import fi.ksykmaps.data.AppLog
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class KsykFirebaseMessagingService : FirebaseMessagingService() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onNewToken(token: String) {
        AppLog.info("FCM", "New token — registering with server")
        scope.launch {
            try {
                val body = buildJsonObject {
                    put("fcmToken", token)
                    put("platform", "android")
                    put("appVersion", BuildConfig.VERSION_NAME)
                }
                Api.post("/push-tokens", body)
                AppLog.info("FCM", "Token registered")
            } catch (e: Exception) {
                AppLog.warn("FCM", "Token registration failed: ${e.message}")
            }
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        // v1.76.0: step-by-step logging so admins can trace exactly what
        // happened per message from the phone's log viewer.
        val step = { label: String -> AppLog.info("FCM", label) }
        step("[1/6] onMessageReceived from=${message.from}")
        step("[2/6] data keys=${message.data.keys.joinToString(",")} notif=${message.notification?.title != null}")

        val title = message.data["title"]
            ?: message.notification?.title
            ?: "KSYK Maps"
        val body = message.data["body"]
            ?: message.notification?.body
            ?: run {
                AppLog.warn("FCM", "Message had no body — dropping")
                return
            }
        step("[3/6] title=$title body=${body.take(40)}")

        val screen = message.data["screen"]

        // Build tap intent — opens app and navigates to the right screen
        val intent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            screen?.let { putExtra("ksyk_screen", it) }
        } ?: run {
            AppLog.warn("FCM", "No launch intent — device may be in an unusual state")
            return
        }

        val pi = PendingIntent.getActivity(
            this, System.currentTimeMillis().toInt(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val channel = when (message.data["type"]) {
            "schedule_change", "timetable" -> KsykApp.CHANNEL_TIMETABLE
            else -> KsykApp.CHANNEL_PUSH
        }
        step("[4/6] channel=$channel")

        // Defensively (re)create the channel in case KsykApp.onCreate
        // didn't run yet (rare on the very first push after install).
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            try {
                val nm = getSystemService(android.app.NotificationManager::class.java)
                if (nm?.getNotificationChannel(channel) == null) {
                    nm?.createNotificationChannel(
                        android.app.NotificationChannel(
                            channel,
                            "KSYK",
                            android.app.NotificationManager.IMPORTANCE_HIGH,
                        )
                    )
                    AppLog.info("FCM", "Recovered missing channel $channel")
                }
            } catch (t: Throwable) {
                AppLog.warn("FCM", "Channel check failed: ${t.message}")
            }
        }

        val notification = NotificationCompat.Builder(this, channel)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(pi)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .build()
        step("[5/6] notification built")

        // Check permission explicitly on Android 13+ so we log a clear
        // reason when nothing appears (rather than silently swallowing).
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            val granted = androidx.core.app.ActivityCompat.checkSelfPermission(
                this, android.Manifest.permission.POST_NOTIFICATIONS,
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED
            if (!granted) {
                AppLog.warn("FCM", "POST_NOTIFICATIONS not granted — user must enable in Settings")
                return
            }
        }

        try {
            NotificationManagerCompat.from(this)
                .notify(System.currentTimeMillis().toInt(), notification)
            step("[6/6] notify() called successfully")
        } catch (e: SecurityException) {
            AppLog.warn("FCM", "SecurityException on notify: ${e.message}")
        } catch (t: Throwable) {
            AppLog.error("FCM", "notify() threw: ${t.message}")
        }
    }
}
