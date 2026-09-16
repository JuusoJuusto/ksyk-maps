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
import fi.ksykmaps.schedule.LessonState
import fi.ksykmaps.schedule.ScheduleEngine
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalDateTime
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

        private val rowIds     = listOf(R.id.row1, R.id.row2, R.id.row3, R.id.row4, R.id.row5, R.id.row6)
        private val timeIds    = listOf(R.id.time1, R.id.time2, R.id.time3, R.id.time4, R.id.time5, R.id.time6)
        private val subjectIds = listOf(R.id.subject1, R.id.subject2, R.id.subject3, R.id.subject4, R.id.subject5, R.id.subject6)
        private val roomIds    = listOf(R.id.room1, R.id.room2, R.id.room3, R.id.room4, R.id.room5, R.id.room6)

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
            val entries = parseWidgetEntries(prefs.getString("entries_json", null))
            val jaksot  = parseWidgetJaksot(prefs.getString("jaksot_json", null))
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

            val nowDt = LocalDateTime.now()
            val locale = if (lang == "fi") Locale("fi") else Locale.ENGLISH

            // v4.7.2: materialize the rolling 14-day window ONCE through
            // ScheduleEngine, then all further queries are pure lookups.
            val allLessons = ScheduleEngine.materializeRollingWindow(entries, jaksot, LocalDate.now(), days = 14)

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
            // v1.87.0 — added XXL bucket + bumped every tier so stretched
            // widgets look right on tablets and 5-column launchers.
            val (timeSize, subjectSize, roomSize) = when {
                widgetWidth < 200   -> Triple(10f, 12f, 10f)
                widgetWidth > 1400  -> Triple(42f, 56f, 32f)
                widgetWidth > 1000  -> Triple(36f, 48f, 28f)
                widgetWidth > 800   -> Triple(28f, 38f, 22f)
                widgetWidth > 560   -> Triple(20f, 28f, 17f)
                widgetWidth > 380   -> Triple(15f, 20f, 14f)
                widgetWidth > 280   -> Triple(13f, 17f, 12f)
                else                -> Triple(11f, 14f, 11f)
            }
            // Widget layout has 6 row slots (row1..row6); can't exceed that.
            val maxRows = when {
                widgetHeight > 300 -> 6
                widgetHeight > 220 -> 5
                else               -> 4
            }

            // v4.7.2: ScheduleEngine gives us date-classified lessons in
            // one call — no manual (hh:mm × dayOfWeek × jaksoId) filter.
            var effectiveDate = displayDate
            var classified = ScheduleEngine.classifyForDate(allLessons, effectiveDate, nowDt)

            // Auto-roll: when the user is on "today" AND every lesson has
            // ended (or the day is empty), jump forward to the next school
            // day that has lessons. Respects manual browsing (offset != 0).
            if (offset == 0) {
                val allEndedOrEmpty = classified.isEmpty() || classified.all { it.state == LessonState.PAST }
                if (allEndedOrEmpty) {
                    val nextDay = ScheduleEngine.nextSchoolDayWithLessons(
                        allLessons, effectiveDate.plusDays(1), inclusive = true,
                    )
                    if (nextDay != null) {
                        effectiveDate = nextDay
                        classified = ScheduleEngine.classifyForDate(allLessons, effectiveDate, nowDt)
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

            if (classified.isEmpty()) {
                views.setViewVisibility(R.id.widget_empty, View.VISIBLE)
                // Contextual empty state — weekend vs weekday vs summer
                val isWeekend = effectiveDate.dayOfWeek == DayOfWeek.SATURDAY || effectiveDate.dayOfWeek == DayOfWeek.SUNDAY
                val emptyText = when {
                    isWeekend         -> if (lang == "fi") "Viikonloppu 🌤️" else "Weekend 🌤️"
                    effectiveDiff == 0 -> if (lang == "fi") "Ei tunteja tänään" else "No lessons today"
                    else              -> if (lang == "fi") "Ei tunteja" else "No lessons"
                }
                views.setTextViewText(R.id.widget_empty, emptyText)
                rowIds.forEach { views.setViewVisibility(it, View.GONE) }
            } else {
                views.setViewVisibility(R.id.widget_empty, View.GONE)
                classified.take(maxRows).forEachIndexed { i, c ->
                    val lesson = c.lesson
                    val isCurrent = c.state == LessonState.CURRENT
                    val isPast    = c.state == LessonState.PAST
                    views.setViewVisibility(rowIds[i], View.VISIBLE)

                    if (isCurrent) {
                        views.setInt(rowIds[i], "setBackgroundResource", R.drawable.widget_row_current)
                    } else {
                        views.setInt(rowIds[i], "setBackgroundResource", 0)
                    }

                    val timeColor    = when {
                        isCurrent -> Color.parseColor("#FFFFFFFF")
                        isPast    -> Color.parseColor("#44FFFFFF")
                        else      -> Color.parseColor("#88FFFFFF")
                    }
                    val subjectColor = when {
                        isCurrent -> Color.WHITE
                        isPast    -> Color.parseColor("#66FFFFFF")
                        else      -> Color.parseColor("#CCFFFFFF")
                    }
                    val roomColor    = when {
                        isCurrent -> Color.parseColor("#EEFFFFFF")
                        isPast    -> Color.parseColor("#33FFFFFF")
                        else      -> Color.parseColor("#77FFFFFF")
                    }
                    val startHhmm = "%02d:%02d".format(lesson.startTime.hour, lesson.startTime.minute)
                    val timeLabel = when {
                        isCurrent -> "● $startHhmm"
                        isPast    -> "✓ $startHhmm"
                        else      -> startHhmm
                    }

                    views.setTextViewText(timeIds[i], timeLabel)
                    views.setTextColor(timeIds[i], timeColor)
                    views.setTextViewTextSize(timeIds[i], TypedValue.COMPLEX_UNIT_SP, timeSize)

                    val accent = subjectColorHex(lesson.subject)
                    val rawSubject = if (isCurrent) {
                        val remain = lesson.minutesUntilEnd(nowDt).coerceAtLeast(0)
                        if (remain > 0) "${lesson.subject}  ·  $remain min" else lesson.subject
                    } else lesson.subject
                    val htmlEscaped = rawSubject
                        .replace("&", "&amp;")
                        .replace("<", "&lt;")
                        .replace(">", "&gt;")
                    val html = buildString {
                        append("<font color=\"$accent\">●</font>&nbsp;&nbsp;")
                        if (isPast) {
                            append("<s>").append(htmlEscaped).append("</s>")
                        } else {
                            append(htmlEscaped)
                        }
                    }
                    val subjectSpanned: CharSequence = Html.fromHtml(html, Html.FROM_HTML_MODE_LEGACY)
                    views.setTextViewText(subjectIds[i], subjectSpanned)
                    views.setTextColor(subjectIds[i], subjectColor)
                    views.setTextViewTextSize(subjectIds[i], TypedValue.COMPLEX_UNIT_SP, subjectSize)

                    views.setTextViewText(roomIds[i], lesson.roomNumber)
                    views.setTextColor(roomIds[i], roomColor)
                    views.setTextViewTextSize(roomIds[i], TypedValue.COMPLEX_UNIT_SP, roomSize)
                }
                for (i in classified.size.coerceAtMost(maxRows) until rowIds.size) {
                    views.setViewVisibility(rowIds[i], View.GONE)
                }
            }

            manager.updateAppWidget(id, views)
        }
    }
}
