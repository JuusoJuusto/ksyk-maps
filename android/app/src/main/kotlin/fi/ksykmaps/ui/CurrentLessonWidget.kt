package fi.ksykmaps.ui

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.widget.RemoteViews
import fi.ksykmaps.R
import org.json.JSONArray
import java.time.LocalDate
import java.time.LocalTime

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

    companion object {
        private fun updateWidget(context: Context, manager: AppWidgetManager, id: Int) {
            val prefs = context.getSharedPreferences("ksyk_widget", Context.MODE_PRIVATE)
            val raw = prefs.getString("entries_json", null)
            val views = RemoteViews(context.packageName, R.layout.widget_current_lesson)
            val now = LocalTime.now()
            val nowMins = now.hour * 60 + now.minute
            val current = if (raw != null) findCurrent(raw, nowMins) else null

            if (current != null) {
                val subject = current.optString("subject", "—").ifBlank { "—" }
                val start = current.optString("startHhmm", "")
                val end = current.optString("endHhmm", "")
                val room = current.optString("roomNumber", "")

                val startMins = toMins(start)
                val endMins = toMins(end)
                val duration = (endMins - startMins).coerceAtLeast(1)
                val elapsed = (nowMins - startMins).coerceIn(0, duration)
                val progressPct = (elapsed * 100 / duration).coerceIn(0, 100)
                val remainingMins = (endMins - nowMins).coerceAtLeast(0)

                val details = buildString {
                    if (start.isNotBlank() && end.isNotBlank()) append("$start–$end")
                    if (room.isNotBlank()) append("  ·  Room $room")
                }

                views.setInt(R.id.widget_root, "setBackgroundResource", R.drawable.widget_background_active)
                views.setTextViewText(R.id.widget_label, "NOW IN CLASS")
                views.setTextViewText(R.id.widget_subject, subject)
                views.setTextViewText(R.id.widget_details, details)
                views.setProgressBar(R.id.widget_progress, 100, progressPct, false)
                views.setTextViewText(
                    R.id.widget_until,
                    if (end.isNotBlank()) "until $end" else ""
                )
                views.setTextViewText(
                    R.id.widget_remaining,
                    if (remainingMins > 0) "$remainingMins min remaining" else ""
                )
            } else {
                views.setInt(R.id.widget_root, "setBackgroundResource", R.drawable.widget_background)
                views.setTextViewText(R.id.widget_label, "NOW IN CLASS")
                views.setTextViewText(R.id.widget_subject, "No lesson right now")
                views.setTextViewText(R.id.widget_details, "")
                views.setProgressBar(R.id.widget_progress, 100, 0, false)
                views.setTextViewText(R.id.widget_until, "")
                views.setTextViewText(R.id.widget_remaining, "")
            }
            manager.updateAppWidget(id, views)
        }

        private fun toMins(hhmm: String): Int {
            val parts = hhmm.split(":")
            return if (parts.size == 2) (parts[0].toIntOrNull() ?: 0) * 60 + (parts[1].toIntOrNull() ?: 0) else 0
        }

        private fun findCurrent(raw: String, nowMins: Int): org.json.JSONObject? {
            return try {
                val arr = JSONArray(raw)
                val today = LocalDate.now().dayOfWeek.value
                (0 until arr.length())
                    .map { arr.getJSONObject(it) }
                    .filter { it.optInt("dayOfWeek") == today }
                    .firstOrNull { obj ->
                        val startMins = toMins(obj.optString("startHhmm"))
                        val endMins = toMins(obj.optString("endHhmm"))
                        nowMins in startMins until endMins
                    }
            } catch (_: Exception) { null }
        }
    }
}
