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
        AppLog.info("FCM", "Message received: ${message.notification?.title}")

        val title = message.notification?.title
            ?: message.data["title"]
            ?: "KSYK Maps"
        val body = message.notification?.body
            ?: message.data["body"]
            ?: return

        val screen = message.data["screen"]

        // Build tap intent — opens app and navigates to the right screen
        val intent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            screen?.let { putExtra("ksyk_screen", it) }
        } ?: return

        val pi = PendingIntent.getActivity(
            this, System.currentTimeMillis().toInt(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val channel = when (message.data["type"]) {
            "schedule_change", "timetable" -> KsykApp.CHANNEL_TIMETABLE
            else -> KsykApp.CHANNEL_PUSH
        }

        val notification = NotificationCompat.Builder(this, channel)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(pi)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        try {
            NotificationManagerCompat.from(this)
                .notify(System.currentTimeMillis().toInt(), notification)
        } catch (_: SecurityException) {
            // POST_NOTIFICATIONS not granted — notification silently dropped
        }
    }
}
