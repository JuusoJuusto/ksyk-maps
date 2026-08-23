package fi.ksykmaps.ui

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId

private fun hhmm(s: String): Int {
    val parts = s.split(":")
    if (parts.size != 2) return Int.MAX_VALUE
    return (parts[0].toIntOrNull() ?: 0) * 60 + (parts[1].toIntOrNull() ?: 0)
}

object LessonReminderScheduler {
    const val REMINDER_MINUTES = 5L
    private const val REQUEST_CODE = 42_001

    fun schedule(context: Context, entries: List<ScheduleEntry>) {
        cancel(context)

        val today = LocalDate.now()
        val now = LocalDateTime.now()

        val nextEntry = entries
            .filter { it.dayOfWeek == today.dayOfWeek.value }
            .sortedBy { hhmm(it.startHhmm) }
            .firstOrNull { entry ->
                val parts = entry.startHhmm.split(":")
                if (parts.size != 2) return@firstOrNull false
                val lessonStart = LocalTime.of(parts[0].toInt(), parts[1].toInt())
                val reminderTime = LocalDateTime.of(today, lessonStart)
                    .minusMinutes(REMINDER_MINUTES)
                reminderTime.isAfter(now)
            } ?: return

        val parts = nextEntry.startHhmm.split(":")
        val lessonStart = LocalTime.of(parts[0].toInt(), parts[1].toInt())
        val triggerMs = LocalDateTime.of(today, lessonStart)
            .minusMinutes(REMINDER_MINUTES)
            .atZone(ZoneId.systemDefault())
            .toInstant()
            .toEpochMilli()

        val pi = buildPendingIntent(context, nextEntry)
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
            am.set(AlarmManager.RTC_WAKEUP, triggerMs, pi)
        } else {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMs, pi)
        }
    }

    fun cancel(context: Context) {
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pi = PendingIntent.getBroadcast(
            context, REQUEST_CODE,
            Intent(context, LessonReminderReceiver::class.java),
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE,
        ) ?: return
        am.cancel(pi)
        pi.cancel()
    }

    private fun buildPendingIntent(context: Context, entry: ScheduleEntry): PendingIntent {
        val intent = Intent(context, LessonReminderReceiver::class.java).apply {
            putExtra("subject", entry.subject)
            putExtra("startHhmm", entry.startHhmm)
            putExtra("roomNumber", entry.roomNumber)
            putExtra("teacher", entry.teacher)
        }
        return PendingIntent.getBroadcast(
            context, REQUEST_CODE, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}
