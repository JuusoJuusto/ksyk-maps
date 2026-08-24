package fi.ksykmaps.ui

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews
import fi.ksykmaps.R
import org.json.JSONArray
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.TextStyle
import java.util.Locale

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
        private data class Lesson(
            val startHhmm: String,
            val endHhmm: String,
            val subject: String,
            val room: String,
            val isCurrent: Boolean,
        )

        private val rowIds     = listOf(R.id.row1, R.id.row2, R.id.row3, R.id.row4)
        private val timeIds    = listOf(R.id.time1, R.id.time2, R.id.time3, R.id.time4)
        private val subjectIds = listOf(R.id.subject1, R.id.subject2, R.id.subject3, R.id.subject4)
        private val roomIds    = listOf(R.id.room1, R.id.room2, R.id.room3, R.id.room4)

        private fun toMins(hhmm: String): Int {
            val parts = hhmm.split(":")
            return if (parts.size == 2) (parts[0].toIntOrNull() ?: 0) * 60 + (parts[1].toIntOrNull() ?: 0) else 0
        }

        private fun updateWidget(context: Context, manager: AppWidgetManager, id: Int) {
            val prefs = context.getSharedPreferences("ksyk_widget", Context.MODE_PRIVATE)
            val raw = prefs.getString("entries_json", null)
            val views = RemoteViews(context.packageName, R.layout.widget_today_schedule)
            val today = LocalDate.now()
            val nowMins = LocalTime.now().let { it.hour * 60 + it.minute }
            val dayName = today.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)
            views.setTextViewText(R.id.widget_day, dayName.uppercase())

            val lessons = if (raw != null) todayLessons(raw, nowMins) else emptyList()

            if (lessons.isEmpty()) {
                views.setViewVisibility(R.id.widget_empty, View.VISIBLE)
                rowIds.forEach { views.setViewVisibility(it, View.GONE) }
            } else {
                views.setViewVisibility(R.id.widget_empty, View.GONE)
                lessons.take(4).forEachIndexed { i, lesson ->
                    views.setViewVisibility(rowIds[i], View.VISIBLE)

                    // Current lesson: brighter colors; past/future: dimmer
                    val timeColor = if (lesson.isCurrent) Color.parseColor("#EEFFFFFF") else Color.parseColor("#88FFFFFF")
                    val subjectColor = if (lesson.isCurrent) Color.WHITE else Color.parseColor("#CCFFFFFF")
                    val roomColor = if (lesson.isCurrent) Color.parseColor("#AAFFFFFF") else Color.parseColor("#55FFFFFF")
                    val timeLabel = if (lesson.isCurrent) "● ${lesson.startHhmm}" else lesson.startHhmm

                    views.setTextViewText(timeIds[i], timeLabel)
                    views.setTextColor(timeIds[i], timeColor)
                    views.setTextViewText(subjectIds[i], lesson.subject)
                    views.setTextColor(subjectIds[i], subjectColor)
                    views.setTextViewText(roomIds[i], lesson.room)
                    views.setTextColor(roomIds[i], roomColor)
                }
                // Hide unused rows
                for (i in lessons.size until 4) {
                    views.setViewVisibility(rowIds[i], View.GONE)
                }
            }

            manager.updateAppWidget(id, views)
        }

        private fun todayLessons(raw: String, nowMins: Int): List<Lesson> {
            return try {
                val arr = JSONArray(raw)
                val today = LocalDate.now().dayOfWeek.value
                (0 until arr.length())
                    .map { arr.getJSONObject(it) }
                    .filter { it.optInt("dayOfWeek") == today }
                    .mapNotNull { obj ->
                        val start = obj.optString("startHhmm").takeIf { it.isNotBlank() } ?: return@mapNotNull null
                        val end = obj.optString("endHhmm", "")
                        val startMins = toMins(start)
                        val endMins = if (end.isNotBlank()) toMins(end) else Int.MAX_VALUE
                        if (endMins <= nowMins) return@mapNotNull null
                        val isCurrent = nowMins in startMins until endMins
                        Lesson(
                            startHhmm = start,
                            endHhmm = end,
                            subject = obj.optString("subject", "—").ifBlank { "—" },
                            room = obj.optString("roomNumber", "").let { if (it.isNotBlank()) it else "" },
                            isCurrent = isCurrent,
                        )
                    }
                    .sortedBy { toMins(it.startHhmm) }
            } catch (_: Exception) { emptyList() }
        }
    }
}
