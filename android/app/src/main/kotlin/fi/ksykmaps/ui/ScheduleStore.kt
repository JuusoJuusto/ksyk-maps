package fi.ksykmaps.ui

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.json.JSONArray
import org.json.JSONObject

internal val Context.scheduleStore: DataStore<Preferences>
    by preferencesDataStore(name = "ksyk_schedule")

internal val SCHEDULE_KEY = stringPreferencesKey("entries")

internal val scheduleJson = Json { ignoreUnknownKeys = true }

internal suspend fun loadEntries(ctx: Context): List<ScheduleEntry> {
    val pref = ctx.scheduleStore.data.first()[SCHEDULE_KEY] ?: return emptyList()
    return try {
        scheduleJson.decodeFromString<List<ScheduleEntry>>(pref)
    } catch (_: Exception) { emptyList() }
}

internal suspend fun saveEntries(ctx: Context, entries: List<ScheduleEntry>) {
    val encoded = scheduleJson.encodeToString(entries)
    ctx.scheduleStore.edit { prefs -> prefs[SCHEDULE_KEY] = encoded }
    withContext(Dispatchers.Main) {
        val widgetJson = buildWidgetJson(entries)
        NextLessonWidget.saveEntriesForWidget(ctx, widgetJson)
        NextLessonWidget.notifyTimetableChanged(ctx)
        LessonReminderScheduler.schedule(ctx, entries)
    }
}

internal fun buildWidgetJson(entries: List<ScheduleEntry>): String {
    val arr = JSONArray()
    for (e in entries) {
        arr.put(JSONObject().apply {
            put("dayOfWeek", e.dayOfWeek)
            put("startHhmm", e.startHhmm)
            put("endHhmm", e.endHhmm)
            put("subject", e.subject)
            put("roomNumber", e.roomNumber)
            put("teacher", e.teacher)
        })
    }
    return arr.toString()
}
