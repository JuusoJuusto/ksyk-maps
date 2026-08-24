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

// Finnish upper secondary school jaksot for 2025–2026 and 2026–2027.
// Dates are typical for Finnish lukio; schools vary by ~1 week.
private val DEFAULT_JAKSOT = listOf(
    // 2025–2026
    Jakso("j1",  "Jakso 1",     "2025-08-11", "2025-10-03"),
    Jakso("j2",  "Jakso 2",     "2025-10-13", "2025-12-05"),
    Jakso("j3",  "Jakso 3",     "2025-12-08", "2026-01-30"),
    Jakso("j4",  "Jakso 4",     "2026-02-02", "2026-04-09"),
    Jakso("j5",  "Jakso 5",     "2026-04-13", "2026-05-29"),
    // 2026–2027
    Jakso("j6",  "Jakso 1 '26", "2026-08-12", "2026-10-02"),
    Jakso("j7",  "Jakso 2 '26", "2026-10-12", "2026-12-04"),
    Jakso("j8",  "Jakso 3 '26", "2026-12-07", "2027-01-29"),
    Jakso("j9",  "Jakso 4 '27", "2027-02-01", "2027-04-09"),
    Jakso("j10", "Jakso 5 '27", "2027-04-12", "2027-05-29"),
)

internal suspend fun loadJaksot(ctx: Context): List<Jakso> {
    val pref = ctx.scheduleStore.data.first()[JAKSO_KEY]
    val stored = if (pref != null) {
        try { scheduleJson.decodeFromString<List<Jakso>>(pref) } catch (_: Exception) { emptyList() }
    } else { emptyList() }
    if (stored.isEmpty()) return DEFAULT_JAKSOT
    // Merge: add DEFAULT entries whose ID is missing from stored so new
    // academic-year jaksot appear for users who already have stored data.
    val storedIds = stored.map { it.id }.toSet()
    return (stored + DEFAULT_JAKSOT.filter { it.id !in storedIds })
        .sortedBy { it.startDate }
}

internal suspend fun saveJaksot(ctx: Context, jaksot: List<Jakso>) {
    val encoded = scheduleJson.encodeToString(jaksot)
    ctx.scheduleStore.edit { prefs -> prefs[JAKSO_KEY] = encoded }
}

internal fun activeJaksoId(jaksot: List<Jakso>): String? {
    val today = LocalDate.now().toString()
    // Return the currently active jakso
    jaksot.firstOrNull { j -> j.startDate <= today && today <= j.endDate }?.id?.let { return it }
    // No active jakso (e.g., summer break) — return the nearest upcoming one
    return jaksot
        .filter { j -> j.startDate > today }
        .minByOrNull { j -> j.startDate }
        ?.id
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
