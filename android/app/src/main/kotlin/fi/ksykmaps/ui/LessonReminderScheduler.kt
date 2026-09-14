package fi.ksykmaps.ui

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import java.time.DayOfWeek
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
    /** Default lead time in minutes if user hasn't overridden it in Settings. */
    private const val DEFAULT_REMINDER_MINUTES = 5L
    private const val PREFS_REMINDER = "ksyk_prefs"
    private const val KEY_LEAD_MINUTES = "reminder_lead_minutes"

    /**
     * Read the user-configured reminder lead time (Settings → Notifications).
     * Falls back to 5 minutes if unset or the stored value is out of range.
     */
    fun leadMinutes(context: Context): Long {
        return try {
            val v = context.getSharedPreferences(PREFS_REMINDER, Context.MODE_PRIVATE)
                .getInt(KEY_LEAD_MINUTES, DEFAULT_REMINDER_MINUTES.toInt())
            v.coerceIn(0, 60).toLong()
        } catch (_: Throwable) { DEFAULT_REMINDER_MINUTES }
    }

    fun setLeadMinutes(context: Context, minutes: Int) {
        context.getSharedPreferences(PREFS_REMINDER, Context.MODE_PRIVATE)
            .edit().putInt(KEY_LEAD_MINUTES, minutes.coerceIn(0, 60)).apply()
    }
    private const val REQUEST_CODE = 42_001

    /**
     * Schedule an alarm for the next lesson reminder — looks at today
     * first, then rolls forward day by day up to 7 days out so that a
     * Friday evening still lines up a Monday morning reminder. The
     * receiver calls back into schedule() after firing, giving us a
     * self-sustaining chain without any polling.
     */
    fun schedule(context: Context, entries: List<ScheduleEntry>) {
        cancel(context)

        if (entries.isEmpty()) return
        val now = LocalDateTime.now()
        val today = LocalDate.now()

        // Look ahead up to 7 days for the very next reminder that hasn't
        // already passed (accounting for the 5-min lead time).
        val next = (0..7)
            .asSequence()
            .flatMap { offset ->
                val day = today.plusDays(offset.toLong())
                val dow = day.dayOfWeek.value
                entries
                    .filter { it.dayOfWeek == dow }
                    .sortedBy { hhmm(it.startHhmm) }
                    .mapNotNull { entry ->
                        val parts = entry.startHhmm.split(":")
                        if (parts.size != 2) return@mapNotNull null
                        val h = parts[0].toIntOrNull() ?: return@mapNotNull null
                        val m = parts[1].toIntOrNull() ?: return@mapNotNull null
                        val reminderTime = LocalDateTime.of(day, LocalTime.of(h, m))
                            .minusMinutes(leadMinutes(context))
                        if (reminderTime.isAfter(now)) Pair(entry, reminderTime) else null
                    }
                    .asSequence()
            }
            .firstOrNull() ?: return

        val nextEntry = next.first
        val reminderTime = next.second
        val triggerMs = reminderTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()

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
