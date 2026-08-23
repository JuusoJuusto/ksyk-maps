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

class LessonReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val subject = intent.getStringExtra("subject") ?: return
        val startHhmm = intent.getStringExtra("startHhmm") ?: ""
        val roomNumber = intent.getStringExtra("roomNumber") ?: ""
        val teacher = intent.getStringExtra("teacher") ?: ""

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ActivityCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED
        ) return

        val tapPi = PendingIntent.getActivity(
            context, 0,
            Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
            },
            PendingIntent.FLAG_IMMUTABLE,
        )

        val body = buildString {
            append(subject)
            if (startHhmm.isNotBlank()) append(" at $startHhmm")
            if (roomNumber.isNotBlank()) append(" · Room $roomNumber")
            if (teacher.isNotBlank()) append(" · $teacher")
        }

        val notif = NotificationCompat.Builder(context, KsykApp.CHANNEL_TIMETABLE)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("Lesson in ${LessonReminderScheduler.REMINDER_MINUTES} min")
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(tapPi)
            .setAutoCancel(true)
            .build()

        NotificationManagerCompat.from(context).notify(NOTIF_ID, notif)
    }

    companion object {
        const val NOTIF_ID = 1001
    }
}
