package fi.ksykmaps.ui

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.util.TypedValue
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
        when (intent.action) {
            ACTION_DAY_PREV -> {
                val prefs = context.getSharedPreferences(PREFS_WIDGET, Context.MODE_PRIVATE)
                val current = prefs.getInt(KEY_DAY_OFFSET, 0)
                prefs.edit().putInt(KEY_DAY_OFFSET, (current - 1).coerceIn(-7, 14)).apply()
                updateAllWidgets(context)
            }
            ACTION_DAY_NEXT -> {
                val prefs = context.getSharedPreferences(PREFS_WIDGET, Context.MODE_PRIVATE)
                val current = prefs.getInt(KEY_DAY_OFFSET, 0)
                prefs.edit().putInt(KEY_DAY_OFFSET, (current + 1).coerceIn(-7, 14)).apply()
                updateAllWidgets(context)
            }
            NextLessonWidget.ACTION_TIMETABLE_CHANGED -> updateAllWidgets(context)
        }
    }

    override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, newOptions: Bundle) {
        super.onAppWidgetOptionsChanged(context, manager, id, newOptions)
        updateWidget(context, manager, id)
    }

    companion object {
        const val ACTION_DAY_PREV = "fi.ksykmaps.WIDGET_TODAY_PREV"
        const val ACTION_DAY_NEXT = "fi.ksykmaps.WIDGET_TODAY_NEXT"
        private const val PREFS_WIDGET = "ksyk_widget"
        private const val KEY_DAY_OFFSET = "today_schedule_day_offset"

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

        /** Skip Saturday (6) and Sunday (7) to next Monday. */
        private fun nextSchoolDay(from: LocalDate): LocalDate {
            var d = from
            while (d.dayOfWeek == DayOfWeek.SATURDAY || d.dayOfWeek == DayOfWeek.SUNDAY) {
                d = d.plusDays(1)
            }
            return d
        }

        fun updateAllWidgets(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, TodayScheduleWidget::class.java))
            ids.forEach { updateWidget(context, manager, it) }
        }

        private fun updateWidget(context: Context, manager: AppWidgetManager, id: Int) {
            val prefs = context.getSharedPreferences(PREFS_WIDGET, Context.MODE_PRIVATE)
            val raw = prefs.getString("entries_json", null)
            val activeJakso = prefs.getString("active_jakso", "").takeIf { it?.isNotBlank() == true }
            val offset = prefs.getInt(KEY_DAY_OFFSET, 0)
            val lang = getAppLanguage(context)
            val views = RemoteViews(context.packageName, R.layout.widget_today_schedule)

            // Launch app on root click
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: Intent()
            val pi = PendingIntent.getActivity(context, 0, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.widget_root, pi)

            // Prev/next day button intents
            val prevIntent = Intent(context, TodayScheduleWidget::class.java).apply { action = ACTION_DAY_PREV }
            val prevPi = PendingIntent.getBroadcast(context, 1, prevIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.btn_prev_day, prevPi)

            val nextIntent = Intent(context, TodayScheduleWidget::class.java).apply { action = ACTION_DAY_NEXT }
            val nextPi = PendingIntent.getBroadcast(context, 2, nextIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.btn_next_day, nextPi)

            // Compute display date — if offset==0 and it's a weekend, jump to Monday
            var displayDate = LocalDate.now().plusDays(offset.toLong())
            if (offset == 0 && (displayDate.dayOfWeek == DayOfWeek.SATURDAY || displayDate.dayOfWeek == DayOfWeek.SUNDAY)) {
                displayDate = nextSchoolDay(displayDate)
            }

            val nowMins = LocalTime.now().let { it.hour * 60 + it.minute }
            val locale = if (lang == "fi") Locale("fi") else Locale.ENGLISH

            // Day label: "MA · 14.10." or "MON · Oct 14"
            val dayAbbr = displayDate.dayOfWeek.getDisplayName(TextStyle.SHORT, locale).uppercase(locale)
            val datePart = if (lang == "fi") {
                "${displayDate.dayOfMonth}.${displayDate.monthValue}."
            } else {
                "${displayDate.month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)} ${displayDate.dayOfMonth}"
            }
            views.setTextViewText(R.id.widget_day, "$dayAbbr · $datePart")

            // Scalable text based on widget width
            val widgetWidth = manager.getAppWidgetOptions(id)
                .getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 180)
            val (timeSize, subjectSize, roomSize) = when {
                widgetWidth < 200 -> Triple(9f, 11f, 9f)
                widgetWidth > 280 -> Triple(12f, 15f, 11f)
                else              -> Triple(10f, 13f, 10f)
            }

            val lessons = if (raw != null) todayLessons(raw, nowMins, activeJakso, displayDate.dayOfWeek.value) else emptyList()

            if (lessons.isEmpty()) {
                views.setViewVisibility(R.id.widget_empty, View.VISIBLE)
                rowIds.forEach { views.setViewVisibility(it, View.GONE) }
            } else {
                views.setViewVisibility(R.id.widget_empty, View.GONE)
                lessons.take(4).forEachIndexed { i, lesson ->
                    views.setViewVisibility(rowIds[i], View.VISIBLE)

                    val timeColor    = if (lesson.isCurrent) Color.parseColor("#EEFFFFFF") else Color.parseColor("#88FFFFFF")
                    val subjectColor = if (lesson.isCurrent) Color.WHITE else Color.parseColor("#CCFFFFFF")
                    val roomColor    = if (lesson.isCurrent) Color.parseColor("#AAFFFFFF") else Color.parseColor("#55FFFFFF")
                    val timeLabel    = if (lesson.isCurrent) "● ${lesson.startHhmm}" else lesson.startHhmm

                    views.setTextViewText(timeIds[i], timeLabel)
                    views.setTextColor(timeIds[i], timeColor)
                    views.setTextViewTextSize(timeIds[i], TypedValue.COMPLEX_UNIT_SP, timeSize)

                    views.setTextViewText(subjectIds[i], lesson.subject)
                    views.setTextColor(subjectIds[i], subjectColor)
                    views.setTextViewTextSize(subjectIds[i], TypedValue.COMPLEX_UNIT_SP, subjectSize)

                    views.setTextViewText(roomIds[i], lesson.room)
                    views.setTextColor(roomIds[i], roomColor)
                    views.setTextViewTextSize(roomIds[i], TypedValue.COMPLEX_UNIT_SP, roomSize)
                }
                for (i in lessons.size until 4) {
                    views.setViewVisibility(rowIds[i], View.GONE)
                }
            }

            manager.updateAppWidget(id, views)
        }

        private fun todayLessons(raw: String, nowMins: Int, activeJakso: String?, dayOfWeek: Int): List<Lesson> {
            return try {
                val arr = JSONArray(raw)
                (0 until arr.length())
                    .map { arr.getJSONObject(it) }
                    .filter { it.optInt("dayOfWeek") == dayOfWeek }
                    .filter { obj ->
                        if (activeJakso == null) return@filter true
                        val ej = obj.optString("jaksoId", "all").ifBlank { "all" }
                        ej == "all" || ej == activeJakso
                    }
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
                            subject = obj.optString("subject", "?").ifBlank { "?" },
                            room = obj.optString("roomNumber", ""),
                            isCurrent = isCurrent,
                        )
                    }
                    .sortedBy { toMins(it.startHhmm) }
            } catch (_: Exception) { emptyList() }
        }
    }
}
