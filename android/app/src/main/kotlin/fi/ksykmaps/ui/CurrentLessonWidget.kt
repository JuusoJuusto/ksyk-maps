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

    override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, newOptions: Bundle) {
        super.onAppWidgetOptionsChanged(context, manager, id, newOptions)
        updateWidget(context, manager, id)
    }

    companion object {
        private fun launchPendingIntent(context: Context): PendingIntent {
            val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                ?: Intent()
            return PendingIntent.getActivity(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        }

        private fun updateWidget(context: Context, manager: AppWidgetManager, id: Int) {
            val prefs = context.getSharedPreferences("ksyk_widget", Context.MODE_PRIVATE)
            val raw = prefs.getString("entries_json", null)
            val activeJakso = prefs.getString("active_jakso", "").takeIf { it?.isNotBlank() == true }
            val lang = getAppLanguage(context)
            val views = RemoteViews(context.packageName, R.layout.widget_current_lesson)
            views.setOnClickPendingIntent(R.id.widget_root, launchPendingIntent(context))

            // Adaptive text sizes
            val widgetWidth = manager.getAppWidgetOptions(id)
                .getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 180)
            val (subjectSize, detailSize, metaSize) = when {
                widgetWidth < 200  -> Triple(14f, 10f, 9f)
                widgetWidth > 800  -> Triple(44f, 22f, 18f)
                widgetWidth > 560  -> Triple(32f, 18f, 15f)
                widgetWidth > 380  -> Triple(24f, 15f, 13f)
                widgetWidth > 280  -> Triple(20f, 13f, 11f)
                else               -> Triple(17f, 11f, 9f)
            }
            views.setTextViewTextSize(R.id.widget_subject, TypedValue.COMPLEX_UNIT_SP, subjectSize)
            views.setTextViewTextSize(R.id.widget_details, TypedValue.COMPLEX_UNIT_SP, detailSize)
            views.setTextViewTextSize(R.id.widget_until, TypedValue.COMPLEX_UNIT_SP, metaSize)
            views.setTextViewTextSize(R.id.widget_remaining, TypedValue.COMPLEX_UNIT_SP, metaSize)
            val now = LocalTime.now()
            val nowMins = now.hour * 60 + now.minute
            val current = if (raw != null) findCurrent(raw, nowMins, activeJakso) else null
            val roomWord = if (lang == "fi") "Luokka" else "Room"

            if (current != null) {
                val subject = current.optString("subject", "").ifBlank { "?" }
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
                    if (room.isNotBlank()) append("  ·  $roomWord $room")
                }

                views.setInt(R.id.widget_root, "setBackgroundResource", R.drawable.widget_background_active)
                views.setTextViewText(R.id.widget_label, if (lang == "fi") "NYT TUNNILLA" else "NOW IN CLASS")
                views.setTextViewText(R.id.widget_subject, subject)
                views.setTextViewText(R.id.widget_details, details)
                views.setProgressBar(R.id.widget_progress, 100, progressPct, false)
                views.setTextViewText(
                    R.id.widget_until,
                    if (end.isNotBlank()) (if (lang == "fi") "asti $end" else "until $end") else ""
                )
                views.setTextViewText(
                    R.id.widget_remaining,
                    if (remainingMins > 0)
                        (if (lang == "fi") "$remainingMins min jäljellä" else "$remainingMins min remaining")
                    else ""
                )
            } else {
                views.setInt(R.id.widget_root, "setBackgroundResource", R.drawable.widget_background)
                views.setTextViewText(R.id.widget_label, if (lang == "fi") "NYT TUNNILLA" else "NOW IN CLASS")
                views.setTextViewText(
                    R.id.widget_subject,
                    if (lang == "fi") "Ei tuntia juuri nyt" else "No lesson right now"
                )
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

        private fun findCurrent(raw: String, nowMins: Int, activeJakso: String?): org.json.JSONObject? {
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
                    .firstOrNull { obj ->
                        val startMins = toMins(obj.optString("startHhmm"))
                        val endMins = toMins(obj.optString("endHhmm"))
                        nowMins in startMins until endMins
                    }
            } catch (_: Exception) { null }
        }
    }
}
