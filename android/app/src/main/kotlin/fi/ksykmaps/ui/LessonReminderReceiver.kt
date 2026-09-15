package fi.ksykmaps.ui

import android.Manifest
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import fi.ksykmaps.KsykApp
import fi.ksykmaps.MainActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class LessonReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val subject = intent.getStringExtra("subject") ?: return
        val startHhmm = intent.getStringExtra("startHhmm") ?: ""
        val roomNumber = intent.getStringExtra("roomNumber") ?: ""
        val teacher = intent.getStringExtra("teacher") ?: ""

        val lang = getAppLanguage(context)

        // Silent fail on missing perm (Android 13+) — checkSelfPermission
        // is safe on older SDKs (always returns granted).
        val permOk = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            (ActivityCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
                PackageManager.PERMISSION_GRANTED)

        if (permOk) {
            val tapPi = PendingIntent.getActivity(
                context, 0,
                Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
                    putExtra("open_tab", "timetable")
                },
                PendingIntent.FLAG_IMMUTABLE,
            )

            val roomWord = if (lang == "fi") "Luokka" else "Room"
            val body = buildString {
                append(subject)
                if (startHhmm.isNotBlank())
                    append(if (lang == "fi") " klo $startHhmm" else " at $startHhmm")
                if (roomNumber.isNotBlank()) append(" · $roomWord $roomNumber")
                if (teacher.isNotBlank()) append(" · $teacher")
            }
            val leadMin = LessonReminderScheduler.leadMinutes(context)
            val title = if (lang == "fi")
                "Tunti alkaa $leadMin minuutin päästä"
            else
                "Lesson in $leadMin min"

            val notif = NotificationCompat.Builder(context, KsykApp.CHANNEL_TIMETABLE)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setContentIntent(tapPi)
                .setAutoCancel(true)
                .build()

            NotificationManagerCompat.from(context).notify(NOTIF_ID, notif)
        }

        // Chain the next alarm — AlarmManager only fires once. The
        // scheduler internally goes through ScheduleEngine which handles
        // jakso date-range filtering, so no manual jakso filter here.
        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val entries = loadEntries(context)
                if (entries.isNotEmpty()) {
                    LessonReminderScheduler.schedule(context, entries)
                }
            } catch (_: Throwable) { /* silent */ }
            finally { pendingResult.finish() }
        }
    }

    companion object {
        const val NOTIF_ID = 1001
    }
}
