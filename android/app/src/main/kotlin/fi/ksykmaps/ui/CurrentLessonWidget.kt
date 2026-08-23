package fi.ksykmaps.ui

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.view.View
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
            val current = if (raw != null) findCurrent(raw) else null
            if (current != null) {
                val subject = current.optString("subject", "—").ifBlank { "—" }
                val start = current.optString("startHhmm", "")
                val end = current.optString("endHhmm", "")
                val room = current.optString("roomNumber", "")
                val details = buildString {
                    if (start.isNotBlank() && end.isNotBlank()) append("$start–$end")
                    if (room.isNotBlank()) append(" · Room $room")
                }
                views.setTextViewText(R.id.widget_label, "NOW IN CLASS")
                views.setTextViewText(R.id.widget_subject, subject)
                views.setTextViewText(R.id.widget_details, details)
            } else {
                views.setTextViewText(R.id.widget_label, "NOW IN CLASS")
                views.setTextViewText(R.id.widget_subject, "No lesson right now")
                views.setTextViewText(R.id.widget_details, "")
            }
            manager.updateAppWidget(id, views)
        }

        private fun findCurrent(raw: String): org.json.JSONObject? {
            return try {
                val arr = JSONArray(raw)
                val today = LocalDate.now().dayOfWeek.value
                val now = LocalTime.now()
                val nowMins = now.hour * 60 + now.minute
                (0 until arr.length())
                    .map { arr.getJSONObject(it) }
                    .filter { it.optInt("dayOfWeek") == today }
                    .firstOrNull { obj ->
                        val startParts = obj.optString("startHhmm").split(":")
                        val endParts = obj.optString("endHhmm").split(":")
                        if (startParts.size == 2 && endParts.size == 2) {
                            val startMins = (startParts[0].toIntOrNull() ?: 0) * 60 + (startParts[1].toIntOrNull() ?: 0)
                            val endMins = (endParts[0].toIntOrNull() ?: 0) * 60 + (endParts[1].toIntOrNull() ?: 0)
                            nowMins in startMins until endMins
                        } else false
                    }
            } catch (_: Exception) { null }
        }
    }
}
