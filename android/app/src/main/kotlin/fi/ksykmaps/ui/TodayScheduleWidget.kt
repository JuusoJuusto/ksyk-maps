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

class TodayScheduleWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        ids.forEach { updateWidget(context, manager, it) }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == NextLessonWidget.ACTION_TIMETABLE_CHANGED) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, TodayScheduleWidget::class.java))
            ids.forEach { updateWidget(context, manager, it) }
        }
    }

    companion object {
        private data class Lesson(val startHhmm: String, val endHhmm: String, val subject: String, val room: String)

        private val rowIds = listOf(R.id.row1, R.id.row2, R.id.row3, R.id.row4)
        private val timeIds = listOf(R.id.time1, R.id.time2, R.id.time3, R.id.time4)
        private val subjectIds = listOf(R.id.subject1, R.id.subject2, R.id.subject3, R.id.subject4)
        private val roomIds = listOf(R.id.room1, R.id.room2, R.id.room3, R.id.room4)
        private val divIds = listOf(R.id.div1, R.id.div2, R.id.div3)

        private fun updateWidget(context: Context, manager: AppWidgetManager, id: Int) {
            val prefs = context.getSharedPreferences("ksyk_widget", Context.MODE_PRIVATE)
            val raw = prefs.getString("entries_json", null)
            val views = RemoteViews(context.packageName, R.layout.widget_today_schedule)
            val lessons = if (raw != null) todayLessons(raw) else emptyList()

            if (lessons.isEmpty()) {
                views.setViewVisibility(R.id.widget_empty, View.VISIBLE)
                rowIds.forEach { views.setViewVisibility(it, View.GONE) }
                divIds.forEach { views.setViewVisibility(it, View.GONE) }
            } else {
                views.setViewVisibility(R.id.widget_empty, View.GONE)
                lessons.take(4).forEachIndexed { i, lesson ->
                    views.setViewVisibility(rowIds[i], View.VISIBLE)
                    views.setTextViewText(timeIds[i], lesson.startHhmm)
                    views.setTextViewText(subjectIds[i], lesson.subject)
                    views.setTextViewText(roomIds[i], lesson.room)
                    if (i < divIds.size && i < lessons.size - 1) {
                        views.setViewVisibility(divIds[i], View.VISIBLE)
                    } else if (i < divIds.size) {
                        views.setViewVisibility(divIds[i], View.GONE)
                    }
                }
                // Hide unused rows
                for (i in lessons.size until 4) {
                    views.setViewVisibility(rowIds[i], View.GONE)
                    if (i < divIds.size) views.setViewVisibility(divIds[i], View.GONE)
                }
            }

            manager.updateAppWidget(id, views)
        }

        private fun todayLessons(raw: String): List<Lesson> {
            return try {
                val arr = JSONArray(raw)
                val today = LocalDate.now().dayOfWeek.value
                val nowMins = LocalTime.now().let { it.hour * 60 + it.minute }
                (0 until arr.length())
                    .map { arr.getJSONObject(it) }
                    .filter { it.optInt("dayOfWeek") == today }
                    .mapNotNull { obj ->
                        val start = obj.optString("startHhmm").takeIf { it.isNotBlank() } ?: return@mapNotNull null
                        val parts = start.split(":")
                        if (parts.size != 2) return@mapNotNull null
                        val startMins = (parts[0].toIntOrNull() ?: 0) * 60 + (parts[1].toIntOrNull() ?: 0)
                        val end = obj.optString("endHhmm", "")
                        val endParts = end.split(":")
                        val endMins = if (endParts.size == 2) (endParts[0].toIntOrNull() ?: 0) * 60 + (endParts[1].toIntOrNull() ?: 0) else Int.MAX_VALUE
                        // Include current and upcoming (not already finished)
                        if (endMins <= nowMins) return@mapNotNull null
                        Lesson(
                            startHhmm = start,
                            endHhmm = end,
                            subject = obj.optString("subject", "—").ifBlank { "—" },
                            room = obj.optString("roomNumber", ""),
                        )
                    }
                    .sortedBy { lesson ->
                        val p = lesson.startHhmm.split(":")
                        if (p.size == 2) (p[0].toIntOrNull() ?: 0) * 60 + (p[1].toIntOrNull() ?: 0) else Int.MAX_VALUE
                    }
            } catch (_: Exception) { emptyList() }
        }
    }
}
