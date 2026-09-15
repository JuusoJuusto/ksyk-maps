package fi.ksykmaps.ui

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import fi.ksykmaps.schedule.ScheduleEngine
import fi.ksykmaps.schedule.TimedLesson
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId

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
     * v4.7.2 — schedule the next reminder via [ScheduleEngine]. Reads the
     * jakso list from the widget prefs cache so the alarm respects the
     * same date-range filtering the widgets use. Chains itself: after
     * firing, [LessonReminderReceiver] calls back into schedule().
     */
    fun schedule(context: Context, entries: List<ScheduleEntry>) {
        cancel(context)
        if (entries.isEmpty()) return

        val jaksot = parseWidgetJaksot(
            context.getSharedPreferences("ksyk_widget", Context.MODE_PRIVATE)
                .getString("jaksot_json", null)
        )

        val now = LocalDateTime.now()
        val today = LocalDate.now()
        val lead = leadMinutes(context)

        val all = ScheduleEngine.materializeRollingWindow(entries, jaksot, today, days = 7)
        val next: TimedLesson = all
            .firstOrNull { it.startDateTime.minusMinutes(lead).isAfter(now) }
            ?: return

        val reminderTime = next.startDateTime.minusMinutes(lead)
        val triggerMs = reminderTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()

        val pi = buildPendingIntent(context, next)
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

    private fun buildPendingIntent(context: Context, lesson: TimedLesson): PendingIntent {
        val startHhmm = "%02d:%02d".format(lesson.startTime.hour, lesson.startTime.minute)
        val intent = Intent(context, LessonReminderReceiver::class.java).apply {
            putExtra("subject", lesson.subject)
            putExtra("startHhmm", startHhmm)
            putExtra("roomNumber", lesson.roomNumber)
            putExtra("teacher", lesson.teacher)
        }
        return PendingIntent.getBroadcast(
            context, REQUEST_CODE, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}
