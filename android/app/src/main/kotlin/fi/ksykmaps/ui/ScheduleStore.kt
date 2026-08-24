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
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate

internal val Context.scheduleStore: DataStore<Preferences>
    by preferencesDataStore(name = "ksyk_schedule")

internal val SCHEDULE_KEY = stringPreferencesKey("entries")
internal val JAKSO_KEY    = stringPreferencesKey("jaksot")

internal val scheduleJson = Json { ignoreUnknownKeys = true }

@Serializable
data class Jakso(
    val id: String,
    val name: String,
    val startDate: String,   // ISO "2025-08-11"
    val endDate: String,     // ISO "2026-05-29"
)

// Default Finnish upper secondary school jaksot for academic year 2025–2026.
// Dates are typical for Finnish lukio; schools vary by ~1 week.
private val DEFAULT_JAKSOT = listOf(
    Jakso("j1", "Jakso 1", "2025-08-11", "2025-10-03"),
    Jakso("j2", "Jakso 2", "2025-10-13", "2025-12-05"),
    Jakso("j3", "Jakso 3", "2025-12-08", "2026-01-30"),
    Jakso("j4", "Jakso 4", "2026-02-02", "2026-04-09"),
    Jakso("j5", "Jakso 5", "2026-04-13", "2026-05-29"),
)

internal suspend fun loadJaksot(ctx: Context): List<Jakso> {
    val pref = ctx.scheduleStore.data.first()[JAKSO_KEY] ?: return DEFAULT_JAKSOT
    return try {
        scheduleJson.decodeFromString<List<Jakso>>(pref).ifEmpty { DEFAULT_JAKSOT }
    } catch (_: Exception) { DEFAULT_JAKSOT }
}

internal suspend fun saveJaksot(ctx: Context, jaksot: List<Jakso>) {
    val encoded = scheduleJson.encodeToString(jaksot)
    ctx.scheduleStore.edit { prefs -> prefs[JAKSO_KEY] = encoded }
}

internal fun activeJaksoId(jaksot: List<Jakso>): String? {
    val today = LocalDate.now().toString()
    return jaksot.firstOrNull { j -> j.startDate <= today && today <= j.endDate }?.id
}

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
