package fi.ksykmaps.ui

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.TypedValue
import android.widget.RemoteViews
import fi.ksykmaps.R
import fi.ksykmaps.schedule.ScheduleEngine
import java.time.LocalDate
import java.time.LocalDateTime

class CurrentLessonWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        ids.forEach { updateWidget(context, manager, it) }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == NextLessonWidget.ACTION_TIMETABLE_CHANGED) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, CurrentLessonWidget::class.java))
            ids.forEach { updateWidget(context, manager, it) }
        }
    }

    override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, newOptions: Bundle) {
        super.onAppWidgetOptionsChanged(context, manager, id, newOptions)
        updateWidget(context, manager, id)
    }

    companion object {
        private fun launchPendingIntent(context: Context): PendingIntent {
            val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                ?: Intent()
            return PendingIntent.getActivity(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        }

        private fun updateWidget(context: Context, manager: AppWidgetManager, id: Int) {
            val prefs = context.getSharedPreferences("ksyk_widget", Context.MODE_PRIVATE)
            val entries = parseWidgetEntries(prefs.getString("entries_json", null))
            val jaksot  = parseWidgetJaksot(prefs.getString("jaksot_json", null))
            val lang = getAppLanguage(context)
            val views = RemoteViews(context.packageName, R.layout.widget_current_lesson)
            views.setOnClickPendingIntent(R.id.widget_root, launchPendingIntent(context))

            // Adaptive text sizes
            val widgetWidth = manager.getAppWidgetOptions(id)
                .getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 180)
            val (subjectSize, detailSize, metaSize) = when {
                widgetWidth < 200   -> Triple(14f, 10f, 9f)
                widgetWidth > 1000  -> Triple(56f, 26f, 22f)
                widgetWidth > 800   -> Triple(44f, 22f, 18f)
                widgetWidth > 560   -> Triple(32f, 18f, 15f)
                widgetWidth > 380   -> Triple(24f, 15f, 13f)
                widgetWidth > 280   -> Triple(20f, 13f, 11f)
                else                -> Triple(17f, 11f, 9f)
            }
            views.setTextViewTextSize(R.id.widget_subject, TypedValue.COMPLEX_UNIT_SP, subjectSize)
            views.setTextViewTextSize(R.id.widget_details, TypedValue.COMPLEX_UNIT_SP, detailSize)
            views.setTextViewTextSize(R.id.widget_until, TypedValue.COMPLEX_UNIT_SP, metaSize)
            views.setTextViewTextSize(R.id.widget_remaining, TypedValue.COMPLEX_UNIT_SP, metaSize)

            // v4.7.2: use ScheduleEngine so "current" means the lesson
            // that is currently in progress on TODAY specifically, not
            // "any HH:mm range that contains now regardless of date/jakso".
            val now = LocalDateTime.now()
            val today = LocalDate.now()
            // Materialize a small window (today only is enough for
            // "current"; the engine tolerates a wider window for free).
            val allLessons = ScheduleEngine.materializeRollingWindow(entries, jaksot, today, days = 1)
            val current = ScheduleEngine.currentLesson(allLessons, now)
            val roomWord = if (lang == "fi") "Luokka" else "Room"

            if (current != null) {
                val subject = current.subject
                val start = current.startTime.toString()
                val end = current.endTime.toString()
                val room = current.roomNumber

                val duration = java.time.Duration.between(current.startDateTime, current.endDateTime).toMinutes().coerceAtLeast(1)
                val elapsed = java.time.Duration.between(current.startDateTime, now).toMinutes().coerceIn(0, duration)
                val progressPct = ((elapsed * 100) / duration).toInt().coerceIn(0, 100)
                val remainingMins = current.minutesUntilEnd(now).coerceAtLeast(0).toInt()

                val details = buildString {
                    append("$start–$end")
                    if (room.isNotBlank()) append("  ·  $roomWord $room")
                }

                views.setInt(R.id.widget_root, "setBackgroundResource", R.drawable.widget_background_active)
                views.setTextViewText(R.id.widget_label, if (lang == "fi") "NYT TUNNILLA" else "NOW IN CLASS")
                views.setTextViewText(R.id.widget_subject, subject)
                views.setTextViewText(R.id.widget_details, details)
                views.setProgressBar(R.id.widget_progress, 100, progressPct, false)
                views.setTextViewText(
                    R.id.widget_until,
                    if (lang == "fi") "asti $end" else "until $end"
                )
                views.setTextViewText(
                    R.id.widget_remaining,
                    if (remainingMins > 0)
                        (if (lang == "fi") "$remainingMins min jäljellä" else "$remainingMins min remaining")
                    else ""
                )
            } else {
                views.setInt(R.id.widget_root, "setBackgroundResource", R.drawable.widget_background)
                views.setTextViewText(R.id.widget_label, if (lang == "fi") "NYT TUNNILLA" else "NOW IN CLASS")
                views.setTextViewText(
                    R.id.widget_subject,
                    if (lang == "fi") "Ei tuntia juuri nyt" else "No lesson right now"
                )
                views.setTextViewText(R.id.widget_details, "")
                views.setProgressBar(R.id.widget_progress, 100, 0, false)
                views.setTextViewText(R.id.widget_until, "")
                views.setTextViewText(R.id.widget_remaining, "")
            }
            manager.updateAppWidget(id, views)
        }
    }
}
