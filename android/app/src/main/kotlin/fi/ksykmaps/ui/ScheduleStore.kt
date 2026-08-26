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
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
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

// KSYK jaksot for the 2026–2027 academic year with official dates.
private val DEFAULT_JAKSOT = listOf(
    Jakso("j1", "1. jakso", "2026-08-12", "2026-10-05"),
    Jakso("j2", "2. jakso", "2026-10-06", "2026-12-01"),
    Jakso("j3", "3. jakso", "2026-12-02", "2027-02-08"),
    Jakso("j4", "4. jakso", "2027-02-09", "2027-04-12"),
    Jakso("j5", "5. jakso", "2027-04-13", "2027-06-05"),
)

internal suspend fun loadJaksot(ctx: Context): List<Jakso> {
    // Prefer live server-configured jaksot (admin editable). Fall back
    // to the DataStore cache when offline, then to hardcoded defaults.
    try {
        val json = fi.ksykmaps.data.Api.get("/jaksot")
        val fresh = json.jsonArray.mapNotNull { el ->
            val o = el as? kotlinx.serialization.json.JsonObject ?: return@mapNotNull null
            val id = (o["id"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull ?: return@mapNotNull null
            val name = (o["name"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull ?: id
            val start = (o["startDate"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull ?: return@mapNotNull null
            val end = (o["endDate"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull ?: return@mapNotNull null
            Jakso(id, name, start, end)
        }
        if (fresh.isNotEmpty()) {
            saveJaksot(ctx, fresh)
            return fresh.sortedBy { it.startDate }
        }
    } catch (_: Throwable) { /* offline — fall through */ }
    val pref = ctx.scheduleStore.data.first()[JAKSO_KEY]
    val stored = if (pref != null) {
        try { scheduleJson.decodeFromString<List<Jakso>>(pref) } catch (_: Exception) { emptyList() }
    } else { emptyList() }
    if (stored.isNotEmpty()) return stored.sortedBy { it.startDate }
    return DEFAULT_JAKSOT
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
