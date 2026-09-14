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
import org.json.JSONArray
import java.time.LocalDate
import java.time.LocalTime
import java.util.Locale

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

    override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, newOptions: Bundle) {
        super.onAppWidgetOptionsChanged(context, manager, id, newOptions)
        updateWidget(context, manager, id)
    }

    companion object {
        const val ACTION_TIMETABLE_CHANGED = "fi.ksykmaps.TIMETABLE_CHANGED"

        fun notifyTimetableChanged(context: Context) {
            context.sendBroadcast(Intent(ACTION_TIMETABLE_CHANGED).apply {
                setPackage(context.packageName)
            })
        }

        fun saveEntriesForWidget(context: Context, entriesJson: String) {
            context.getSharedPreferences("ksyk_widget", Context.MODE_PRIVATE)
                .edit()
                .putString("entries_json", entriesJson)
                .apply()
        }

        private fun toMins(hhmm: String): Int {
            val parts = hhmm.split(":")
            return if (parts.size == 2) (parts[0].toIntOrNull() ?: 0) * 60 + (parts[1].toIntOrNull() ?: 0) else 0
        }

        private fun updateWidget(context: Context, manager: AppWidgetManager, id: Int) {
            val prefs = context.getSharedPreferences("ksyk_widget", Context.MODE_PRIVATE)
            val raw = prefs.getString("entries_json", null)
            val activeJakso = prefs.getString("active_jakso", "").takeIf { it?.isNotBlank() == true }
            val lang = getAppLanguage(context)
            val views = RemoteViews(context.packageName, R.layout.widget_next_lesson)
            val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: Intent()
            val pi = PendingIntent.getActivity(context, 0, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.widget_root, pi)
            views.setTextViewText(
                R.id.widget_label,
                if (lang == "fi") "SEURAAVA TUNTI" else "NEXT LESSON"
            )

            // Adaptive text sizes based on widget width
            val widgetWidth = manager.getAppWidgetOptions(id)
                .getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 180)
            val (subjectSize, detailSize, countdownSize) = when {
                widgetWidth < 200  -> Triple(14f, 10f, 9f)
                widgetWidth > 800  -> Triple(44f, 22f, 18f)
                widgetWidth > 560  -> Triple(32f, 18f, 15f)
                widgetWidth > 380  -> Triple(24f, 15f, 13f)
                widgetWidth > 280  -> Triple(20f, 13f, 11f)
                else               -> Triple(17f, 11f, 10f)
            }
            views.setTextViewTextSize(R.id.widget_subject, TypedValue.COMPLEX_UNIT_SP, subjectSize)
            views.setTextViewTextSize(R.id.widget_details, TypedValue.COMPLEX_UNIT_SP, detailSize)
            views.setTextViewTextSize(R.id.widget_countdown, TypedValue.COMPLEX_UNIT_SP, countdownSize)

            val nowMins = LocalTime.now().let { it.hour * 60 + it.minute }
            val hit = if (raw != null) findNextAcrossDays(raw, nowMins, activeJakso) else null

            if (hit != null) {
                val next = hit.obj
                val subject = next.optString("subject", "—").ifBlank { "—" }
                val start = next.optString("startHhmm", "")
                val room = next.optString("roomNumber", "")
                val startMins = toMins(start)
                val roomWord = if (lang == "fi") "Luokka" else "Room"

                // Date prefix on the details line when the next class is
                // not today so users see e.g. "Tomorrow · 08:15 · Room K27".
                val datePrefix = when {
                    hit.daysAway == 0 -> ""
                    hit.daysAway == 1 -> if (lang == "fi") "Huomenna" else "Tomorrow"
                    hit.daysAway in 2..6 -> {
                        val locale = if (lang == "fi") Locale("fi") else Locale.ENGLISH
                        hit.date.dayOfWeek.getDisplayName(java.time.format.TextStyle.FULL, locale)
                            .replaceFirstChar { it.uppercaseChar() }
                    }
                    else -> if (lang == "fi") "${hit.date.dayOfMonth}.${hit.date.monthValue}."
                            else "${hit.date.month.getDisplayName(java.time.format.TextStyle.SHORT, Locale.ENGLISH)} ${hit.date.dayOfMonth}"
                }
                val details = buildString {
                    if (datePrefix.isNotBlank()) append(datePrefix).append("  ·  ")
                    if (start.isNotBlank()) append(start)
                    if (room.isNotBlank()) append("  ·  $roomWord $room")
                }

                // Countdown — same-day = minutes; across-day = "Tomorrow" / weekday
                val countdown = when {
                    hit.daysAway == 0 -> {
                        val minutesAway = (startMins - nowMins).coerceAtLeast(0)
                        formatCountdown(minutesAway, lang)
                    }
                    hit.daysAway == 1 -> if (lang == "fi") "huomenna" else "tomorrow"
                    else              -> if (lang == "fi") "${hit.daysAway} päivän kuluttua"
                                         else "in ${hit.daysAway} days"
                }

                views.setTextViewText(R.id.widget_subject, subject)
                views.setTextViewText(R.id.widget_details, details)
                views.setTextViewText(R.id.widget_countdown, countdown)
            } else {
                views.setTextViewText(
                    R.id.widget_subject,
                    if (lang == "fi") "Ei tulevia tunteja" else "No upcoming lessons"
                )
                views.setTextViewText(R.id.widget_details, "")
                views.setTextViewText(R.id.widget_countdown, "")
            }

            manager.updateAppWidget(id, views)
        }

        private fun formatCountdown(minutesAway: Int, lang: String): String = when {
            minutesAway <= 0 -> if (lang == "fi") "nyt" else "now"
            minutesAway < 60 -> if (lang == "fi") "$minutesAway min kuluttua" else "in $minutesAway min"
            else -> {
                val h = minutesAway / 60; val m = minutesAway % 60
                if (m == 0) (if (lang == "fi") "${h}t kuluttua" else "in ${h}h")
                else (if (lang == "fi") "${h}t ${m}min kuluttua" else "in ${h}h ${m}m")
            }
        }

        private data class NextHit(val obj: org.json.JSONObject, val date: LocalDate, val daysAway: Int)

        /**
         * v1.75.0: search forward across days (up to 14) so the widget
         * stays useful after school ends. Previously it went blank at
         * 14:50 even though tomorrow had classes.
         */
        private fun findNextAcrossDays(raw: String, nowMins: Int, activeJakso: String?): NextHit? {
            return try {
                val arr = JSONArray(raw)
                val today = LocalDate.now()
                for (delta in 0..14) {
                    val date = today.plusDays(delta.toLong())
                    val dow = date.dayOfWeek.value
                    val filtered = (0 until arr.length())
                        .map { arr.getJSONObject(it) }
                        .filter { it.optInt("dayOfWeek") == dow }
                        .filter { obj ->
                            if (activeJakso == null) return@filter true
                            val ej = obj.optString("jaksoId", "all").ifBlank { "all" }
                            ej == "all" || ej == activeJakso
                        }
                    val candidates =
                        if (delta == 0) filtered.filter { toMins(it.optString("startHhmm")) > nowMins }
                        else filtered
                    val hit = candidates.minByOrNull { toMins(it.optString("startHhmm")) }
                    if (hit != null) return NextHit(hit, date, delta)
                }
                null
            } catch (_: Exception) { null }
        }
    }
}
