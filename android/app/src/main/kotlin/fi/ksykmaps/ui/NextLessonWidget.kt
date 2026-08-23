package fi.ksykmaps.ui

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import fi.ksykmaps.R
import org.json.JSONArray
import java.time.LocalDate
import java.time.LocalTime

class NextLessonWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        ids.forEach { updateWidget(context, manager, it) }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_TIMETABLE_CHANGED) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, NextLessonWidget::class.java))
            ids.forEach { updateWidget(context, manager, it) }
        }
    }

    companion object {
        const val ACTION_TIMETABLE_CHANGED = "fi.ksykmaps.TIMETABLE_CHANGED"

        fun notifyTimetableChanged(context: Context) {
            context.sendBroadcast(Intent(ACTION_TIMETABLE_CHANGED).apply {
                setPackage(context.packageName)
            })
        }

        // Exposed so TimetableScreen can persist the JSON for the widget to read
        fun saveEntriesForWidget(context: Context, entriesJson: String) {
            context.getSharedPreferences("ksyk_widget", Context.MODE_PRIVATE)
                .edit()
                .putString("entries_json", entriesJson)
                .apply()
        }

        private fun updateWidget(context: Context, manager: AppWidgetManager, id: Int) {
            val prefs = context.getSharedPreferences("ksyk_widget", Context.MODE_PRIVATE)
            val raw = prefs.getString("entries_json", null)

            val views = RemoteViews(context.packageName, R.layout.widget_next_lesson)

            val next = if (raw != null) findNext(raw) else null

            if (next != null) {
                val subject = next.optString("subject", "—").ifBlank { "—" }
                val start = next.optString("startHhmm", "")
                val room = next.optString("roomNumber", "")
                val details = buildString {
                    if (start.isNotBlank()) append(start)
                    if (room.isNotBlank()) append(" · Room $room")
                }
                views.setTextViewText(R.id.widget_subject, subject)
                views.setTextViewText(R.id.widget_details, details)
            } else {
                views.setTextViewText(R.id.widget_subject, "No more lessons today")
                views.setTextViewText(R.id.widget_details, "")
            }

            manager.updateAppWidget(id, views)
        }

        private fun findNext(raw: String): org.json.JSONObject? {
            return try {
                val arr = JSONArray(raw)
                val today = LocalDate.now().dayOfWeek.value
                val nowMins = LocalTime.now().let { it.hour * 60 + it.minute }
                (0 until arr.length())
                    .map { arr.getJSONObject(it) }
                    .filter { it.optInt("dayOfWeek") == today }
                    .filter { obj ->
                        val parts = obj.optString("startHhmm").split(":")
                        if (parts.size == 2)
                            (parts[0].toIntOrNull() ?: 0) * 60 + (parts[1].toIntOrNull() ?: 0) > nowMins
                        else false
                    }
                    .minByOrNull { obj ->
                        val parts = obj.optString("startHhmm").split(":")
                        if (parts.size == 2)
                            (parts[0].toIntOrNull() ?: 0) * 60 + (parts[1].toIntOrNull() ?: 0)
                        else Int.MAX_VALUE
                    }
            } catch (_: Exception) { null }
        }
    }
}
