package fi.ksykmaps

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
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
    override fun onCreate() {
        super.onCreate()
        instance = this
        installCrashHandler()
        createNotificationChannels()
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
                pw.println("App version: 1.31.0 (33)")
                pw.println()
                throwable.printStackTrace(pw)
                pw.flush()
                log.writeText(sw.toString())
            } catch (_: Throwable) { /* nothing we can do */ }
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
    }

    companion object {
        lateinit var instance: KsykApp
            private set

        const val CHANNEL_TIMETABLE  = "ksyk_timetable"
        const val CHANNEL_NAVIGATION = "ksyk_navigation"
        const val CHANNEL_GENERAL    = "ksyk_general"
    }
}
