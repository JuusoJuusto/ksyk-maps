package fi.ksykmaps.ui

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.text.Html
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
            val isPast: Boolean,
        )

        private val rowIds     = listOf(R.id.row1, R.id.row2, R.id.row3, R.id.row4, R.id.row5, R.id.row6)
        private val timeIds    = listOf(R.id.time1, R.id.time2, R.id.time3, R.id.time4, R.id.time5, R.id.time6)
        private val subjectIds = listOf(R.id.subject1, R.id.subject2, R.id.subject3, R.id.subject4, R.id.subject5, R.id.subject6)
        private val roomIds    = listOf(R.id.room1, R.id.room2, R.id.room3, R.id.room4, R.id.room5, R.id.room6)

        private fun toMins(hhmm: String): Int {
            val parts = hhmm.split(":")
            return if (parts.size == 2) (parts[0].toIntOrNull() ?: 0) * 60 + (parts[1].toIntOrNull() ?: 0) else 0
        }

        /**
         * Colour palette for subject accent dots. Deterministic hash of the
         * subject name → one of these hues, so "Matematiikka" always gets
         * the same colour every render. Chosen for good contrast on the
         * dark widget background and enough variety across the ~10 typical
         * subjects a KSYK student has.
         */
        private val SUBJECT_PALETTE = listOf(
            "#F87171", // rose
            "#FB923C", // orange
            "#FBBF24", // amber
            "#4ADE80", // green
            "#22D3EE", // cyan
            "#60A5FA", // blue
            "#A78BFA", // violet
            "#F472B6", // pink
            "#94A3B8", // slate
            "#34D399", // emerald
        )

        private fun subjectColorHex(subject: String): String {
            if (subject.isBlank()) return SUBJECT_PALETTE[8]
            // Stable positive hash — kotlin's hashCode() may be negative,
            // and abs() overflows on MIN_VALUE; mod after masking to 31 bits.
            val h = (subject.trim().lowercase().hashCode() and 0x7FFFFFFF)
            return SUBJECT_PALETTE[h % SUBJECT_PALETTE.size]
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

            // Day label with contextual chip: "TODAY · MA · 14.10.", "TOMORROW · TI · 15.10.",
            // "THIS WEEK · KE · 16.10." — clarifies which day the user is browsing when
            // the arrows have shifted the offset beyond today.
            val today = LocalDate.now()
            val diff = today.until(displayDate, java.time.temporal.ChronoUnit.DAYS).toInt()
            val chip = when {
                diff == 0                 -> if (lang == "fi") "TÄNÄÄN" else "TODAY"
                diff == 1                 -> if (lang == "fi") "HUOMENNA" else "TOMORROW"
                diff == -1                -> if (lang == "fi") "EILEN" else "YESTERDAY"
                diff in 2..6              -> if (lang == "fi") "TÄLLÄ VIIKOLLA" else "THIS WEEK"
                diff in -6..-2            -> if (lang == "fi") "VIIME VIIKOLLA" else "LAST WEEK"
                diff in 7..13             -> if (lang == "fi") "ENSI VIIKKO" else "NEXT WEEK"
                else                      -> null
            }
            val dayAbbr = displayDate.dayOfWeek.getDisplayName(TextStyle.SHORT, locale).uppercase(locale)
            val datePart = if (lang == "fi") {
                "${displayDate.dayOfMonth}.${displayDate.monthValue}."
            } else {
                "${displayDate.month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)} ${displayDate.dayOfMonth}"
            }
            val dayLabel = if (chip != null) "$chip · $dayAbbr $datePart" else "$dayAbbr · $datePart"
            views.setTextViewText(R.id.widget_day, dayLabel)

            // Scalable text and row count based on widget dimensions
            val opts = manager.getAppWidgetOptions(id)
            val widgetWidth  = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 180)
            val widgetHeight = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 180)
            // v1.76.0: added an extra "extra-large" bucket so 5x5+ widgets
            // don't render tiny text. Previous cap was 15sp subjects; new
            // cap at wider than 380dp is 18sp — matches the readability of
            // Apple Calendar's XL widget.
            val (timeSize, subjectSize, roomSize) = when {
                widgetWidth < 200 -> Triple(9f, 11f, 9f)
                widgetWidth > 560 -> Triple(18f, 24f, 16f)
                widgetWidth > 380 -> Triple(14f, 18f, 13f)
                widgetWidth > 280 -> Triple(12f, 15f, 11f)
                else              -> Triple(10f, 13f, 10f)
            }
            // Widget layout has 6 row slots (row1..row6); can't exceed that.
            val maxRows = when {
                widgetHeight > 300 -> 6
                widgetHeight > 220 -> 5
                else               -> 4
            }

            // v1.75.0: when the user is on "today" AND today has no lessons
            // OR all of today's lessons have ended, auto-jump forward to the
            // next school day (up to 7 days ahead) so the widget always shows
            // something useful. When offset != 0 the user is browsing manually
            // — respect their pick even if the day is empty.
            var effectiveDate = displayDate
            var effectiveIsToday = (effectiveDate == LocalDate.now())
            var lessons: List<Lesson> = if (raw != null)
                todayLessons(raw, nowMins, activeJakso, effectiveDate.dayOfWeek.value, effectiveIsToday)
            else emptyList()

            if (offset == 0 && raw != null) {
                val allEndedOrEmpty = lessons.isEmpty() || lessons.all { it.isPast }
                if (allEndedOrEmpty) {
                    var probe = effectiveDate.plusDays(1)
                    var tries = 0
                    while (tries < 7) {
                        val probeLessons = todayLessons(raw, 0, activeJakso, probe.dayOfWeek.value, isToday = false)
                        if (probeLessons.isNotEmpty()) {
                            effectiveDate = probe
                            effectiveIsToday = false
                            lessons = probeLessons
                            break
                        }
                        probe = probe.plusDays(1)
                        tries++
                    }
                }
            }
            // Recompute the day header chip + label against the effective date
            val effectiveDiff = LocalDate.now().until(effectiveDate, java.time.temporal.ChronoUnit.DAYS).toInt()
            val effectiveChip = when {
                effectiveDiff == 0    -> if (lang == "fi") "TÄNÄÄN" else "TODAY"
                effectiveDiff == 1    -> if (lang == "fi") "HUOMENNA" else "TOMORROW"
                effectiveDiff == -1   -> if (lang == "fi") "EILEN" else "YESTERDAY"
                effectiveDiff in 2..6 -> if (lang == "fi") "TÄLLÄ VIIKOLLA" else "THIS WEEK"
                else                  -> null
            }
            val effectiveDayAbbr = effectiveDate.dayOfWeek.getDisplayName(TextStyle.SHORT, locale).uppercase(locale)
            val effectiveDatePart = if (lang == "fi") {
                "${effectiveDate.dayOfMonth}.${effectiveDate.monthValue}."
            } else {
                "${effectiveDate.month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)} ${effectiveDate.dayOfMonth}"
            }
            val effectiveLabel = if (effectiveChip != null) "$effectiveChip · $effectiveDayAbbr $effectiveDatePart" else "$effectiveDayAbbr · $effectiveDatePart"
            views.setTextViewText(R.id.widget_day, effectiveLabel)

            if (lessons.isEmpty()) {
                views.setViewVisibility(R.id.widget_empty, View.VISIBLE)
                // Contextual empty state — weekend vs weekday vs summer
                val isWeekend = displayDate.dayOfWeek == DayOfWeek.SATURDAY || displayDate.dayOfWeek == DayOfWeek.SUNDAY
                val emptyText = when {
                    isWeekend      -> if (lang == "fi") "Viikonloppu 🌤️" else "Weekend 🌤️"
                    diff == 0      -> if (lang == "fi") "Ei tunteja tänään" else "No lessons today"
                    else           -> if (lang == "fi") "Ei tunteja" else "No lessons"
                }
                views.setTextViewText(R.id.widget_empty, emptyText)
                rowIds.forEach { views.setViewVisibility(it, View.GONE) }
            } else {
                views.setViewVisibility(R.id.widget_empty, View.GONE)
                lessons.take(maxRows).forEachIndexed { i, lesson ->
                    views.setViewVisibility(rowIds[i], View.VISIBLE)

                    // Row background: highlight the current lesson row with a
                    // subtle translucent tile — makes it pop at a glance without
                    // dominating the whole widget. Non-current rows: transparent.
                    if (lesson.isCurrent) {
                        views.setInt(rowIds[i], "setBackgroundResource", R.drawable.widget_row_current)
                    } else {
                        views.setInt(rowIds[i], "setBackgroundResource", 0)
                    }

                    // Colour ramp: past = grey/40 %, current = white/100 %, future = white/85 %
                    val timeColor    = when {
                        lesson.isCurrent -> Color.parseColor("#FFFFFFFF")
                        lesson.isPast    -> Color.parseColor("#44FFFFFF")
                        else             -> Color.parseColor("#88FFFFFF")
                    }
                    val subjectColor = when {
                        lesson.isCurrent -> Color.WHITE
                        lesson.isPast    -> Color.parseColor("#66FFFFFF")
                        else             -> Color.parseColor("#CCFFFFFF")
                    }
                    val roomColor    = when {
                        lesson.isCurrent -> Color.parseColor("#EEFFFFFF")
                        lesson.isPast    -> Color.parseColor("#33FFFFFF")
                        else             -> Color.parseColor("#77FFFFFF")
                    }
                    val timeLabel    = when {
                        lesson.isCurrent -> "● ${lesson.startHhmm}"
                        lesson.isPast    -> "✓ ${lesson.startHhmm}"
                        else             -> lesson.startHhmm
                    }

                    views.setTextViewText(timeIds[i], timeLabel)
                    views.setTextColor(timeIds[i], timeColor)
                    views.setTextViewTextSize(timeIds[i], TypedValue.COMPLEX_UNIT_SP, timeSize)

                    // Subject label: per-subject accent dot at the start,
                    // optional strikethrough on past classes, "· X min"
                    // suffix on the current class.
                    val accent = subjectColorHex(lesson.subject)
                    val rawSubject = if (lesson.isCurrent) {
                        val endM = toMins(lesson.endHhmm)
                        val remain = (endM - nowMins).coerceAtLeast(0)
                        if (remain > 0) "${lesson.subject}  ·  ${remain} min" else lesson.subject
                    } else lesson.subject
                    val htmlEscaped = rawSubject
                        .replace("&", "&amp;")
                        .replace("<", "&lt;")
                        .replace(">", "&gt;")
                    val html = buildString {
                        append("<font color=\"$accent\">●</font>&nbsp;&nbsp;")
                        if (lesson.isPast) {
                            append("<s>").append(htmlEscaped).append("</s>")
                        } else {
                            append(htmlEscaped)
                        }
                    }
                    val subjectSpanned: CharSequence = Html.fromHtml(html, Html.FROM_HTML_MODE_LEGACY)
                    views.setTextViewText(subjectIds[i], subjectSpanned)
                    views.setTextColor(subjectIds[i], subjectColor)
                    views.setTextViewTextSize(subjectIds[i], TypedValue.COMPLEX_UNIT_SP, subjectSize)

                    views.setTextViewText(roomIds[i], lesson.room)
                    views.setTextColor(roomIds[i], roomColor)
                    views.setTextViewTextSize(roomIds[i], TypedValue.COMPLEX_UNIT_SP, roomSize)
                }
                for (i in lessons.size.coerceAtMost(maxRows) until rowIds.size) {
                    views.setViewVisibility(rowIds[i], View.GONE)
                }
            }

            manager.updateAppWidget(id, views)
        }

        /**
         * @param isToday when true, we compare lesson times to `nowMins` so
         *  past lessons render dimmed and the ongoing one is marked current.
         *  When false (browsing another day), no lesson is "current" and
         *  none are "past" — the widget shows the full day plainly.
         */
        private fun todayLessons(
            raw: String,
            nowMins: Int,
            activeJakso: String?,
            dayOfWeek: Int,
            isToday: Boolean,
        ): List<Lesson> {
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
                        // v1.75.0: show past classes greyed out instead of
                        // filtering them out — user knows what happened today.
                        val isCurrent = isToday && nowMins in startMins until endMins
                        val isPast    = isToday && endMins <= nowMins
                        Lesson(
                            startHhmm = start,
                            endHhmm = end,
                            subject = obj.optString("subject", "?").ifBlank { "?" },
                            room = obj.optString("roomNumber", ""),
                            isCurrent = isCurrent,
                            isPast = isPast,
                        )
                    }
                    .sortedBy { toMins(it.startHhmm) }
            } catch (_: Exception) { emptyList() }
        }
    }
}
