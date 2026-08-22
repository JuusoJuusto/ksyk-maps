package fi.ksykmaps

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build

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
    override fun onCreate() {
        super.onCreate()
        instance = this
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = getSystemService(NotificationManager::class.java) ?: return

        nm.createNotificationChannel(NotificationChannel(
            CHANNEL_TIMETABLE,
            "Timetable reminders",
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply { description = "Upcoming lesson and room reminders" })

        nm.createNotificationChannel(NotificationChannel(
            CHANNEL_NAVIGATION,
            "Navigation",
            NotificationManager.IMPORTANCE_LOW,
        ).apply { description = "Turn-by-turn indoor navigation prompts" })

        nm.createNotificationChannel(NotificationChannel(
            CHANNEL_GENERAL,
            "Announcements",
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply { description = "School announcements and general alerts" })
    }

    companion object {
        lateinit var instance: KsykApp
            private set

        const val CHANNEL_TIMETABLE  = "ksyk_timetable"
        const val CHANNEL_NAVIGATION = "ksyk_navigation"
        const val CHANNEL_GENERAL    = "ksyk_general"
    }
}
