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
                widgetWidth < 200 -> Triple(14f, 10f, 9f)
                widgetWidth > 280 -> Triple(20f, 13f, 11f)
                else              -> Triple(17f, 11f, 10f)
            }
            views.setTextViewTextSize(R.id.widget_subject, TypedValue.COMPLEX_UNIT_SP, subjectSize)
            views.setTextViewTextSize(R.id.widget_details, TypedValue.COMPLEX_UNIT_SP, detailSize)
            views.setTextViewTextSize(R.id.widget_countdown, TypedValue.COMPLEX_UNIT_SP, countdownSize)

            val nowMins = LocalTime.now().let { it.hour * 60 + it.minute }
            val next = if (raw != null) findNext(raw, nowMins, activeJakso) else null

            if (next != null) {
                val subject = next.optString("subject", "—").ifBlank { "—" }
                val start = next.optString("startHhmm", "")
                val room = next.optString("roomNumber", "")
                val startMins = toMins(start)
                val minutesAway = (startMins - nowMins).coerceAtLeast(0)
                val roomWord = if (lang == "fi") "Luokka" else "Room"

                val details = buildString {
                    if (start.isNotBlank()) append(start)
                    if (room.isNotBlank()) append("  ·  $roomWord $room")
                }

                views.setTextViewText(R.id.widget_subject, subject)
                views.setTextViewText(R.id.widget_details, details)
                views.setTextViewText(R.id.widget_countdown, formatCountdown(minutesAway, lang))
            } else {
                views.setTextViewText(
                    R.id.widget_subject,
                    if (lang == "fi") "Ei enää tunteja tänään" else "No more lessons today"
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

        private fun findNext(raw: String, nowMins: Int, activeJakso: String?): org.json.JSONObject? {
            return try {
                val arr = JSONArray(raw)
                val today = LocalDate.now().dayOfWeek.value
                (0 until arr.length())
                    .map { arr.getJSONObject(it) }
                    .filter { it.optInt("dayOfWeek") == today }
                    .filter { obj ->
                        if (activeJakso == null) return@filter true
                        val ej = obj.optString("jaksoId", "all").ifBlank { "all" }
                        ej == "all" || ej == activeJakso
                    }
                    .filter { obj -> toMins(obj.optString("startHhmm")) > nowMins }
                    .minByOrNull { obj -> toMins(obj.optString("startHhmm")) }
            } catch (_: Exception) { null }
        }
    }
}
