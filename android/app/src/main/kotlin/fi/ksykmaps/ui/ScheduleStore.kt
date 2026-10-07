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

internal fun activeJaksoId(jaksot: List<Jakso>): String? =
    jaksoIdForDate(jaksot, LocalDate.now())

/**
 * Which jakso does the given date fall in? Returns the containing jakso
 * first, and only falls back to the nearest upcoming one if no jakso
 * actually contains the date. This is what the timetable date picker
 * uses to auto-switch the jakso dropdown when the user picks a date
 * that belongs to a different period.
 */
internal fun jaksoIdForDate(jaksot: List<Jakso>, date: LocalDate): String? {
    val d = date.toString()
    jaksot.firstOrNull { j -> j.startDate <= d && d <= j.endDate }?.id?.let { return it }
    return jaksot
        .filter { j -> j.startDate > d }
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
    val jaksot = try { loadJaksot(ctx) } catch (_: Exception) { emptyList() }
    val activeJakso = activeJaksoId(jaksot)
    // Cache the active jakso ID + full jakso list in SharedPreferences
    // so AppWidgetProviders can read them synchronously (they can't
    // call suspend functions). v4.7.2: jaksot are needed for the new
    // ScheduleEngine which does date-range filtering rather than the
    // old "just match active jakso ID" approach.
    ctx.getSharedPreferences("ksyk_widget", Context.MODE_PRIVATE)
        .edit()
        .putString("active_jakso", activeJakso ?: "")
        .putString("jaksot_json", scheduleJson.encodeToString(jaksot))
        .apply()
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
            put("id", e.id)                 // v4.7.2: for TimedLesson.entryId
            put("dayOfWeek", e.dayOfWeek)
            put("startHhmm", e.startHhmm)
            put("endHhmm", e.endHhmm)
            put("subject", e.subject)
            put("roomNumber", e.roomNumber)
            put("roomId", e.roomId)
            put("teacher", e.teacher)
            // jaksoId is critical: without it the Home dashboard and
            // widget can't filter to the currently active period, so
            // they'd show lessons from every jakso stacked together.
            put("jaksoId", e.jaksoId)
            put("subjectCode", e.subjectCode)
            put("teacherAbbrev", e.teacherAbbrev)
        })
    }
    return arr.toString()
}

/**
 * v4.7.2 — parse the widget-cached JSON payload back into ScheduleEntry
 * objects for the ScheduleEngine. Called synchronously from widgets;
 * cannot use suspend / DataStore. Returns null on malformed input so
 * widgets can fall back to the empty state.
 */
fun parseWidgetEntries(raw: String?): List<ScheduleEntry> {
    if (raw.isNullOrBlank()) return emptyList()
    return try {
        val arr = JSONArray(raw)
        (0 until arr.length()).mapNotNull { i ->
            val o = arr.getJSONObject(i)
            ScheduleEntry(
                id            = o.optString("id").ifBlank { "e${i}" },
                dayOfWeek     = o.optInt("dayOfWeek", 0).takeIf { it in 1..7 } ?: return@mapNotNull null,
                startHhmm     = o.optString("startHhmm"),
                endHhmm       = o.optString("endHhmm"),
                subject       = o.optString("subject"),
                roomId        = o.optString("roomId"),
                roomNumber    = o.optString("roomNumber"),
                teacher       = o.optString("teacher"),
                jaksoId       = o.optString("jaksoId").ifBlank { "all" },
                subjectCode   = o.optString("subjectCode"),
                teacherAbbrev = o.optString("teacherAbbrev"),
            )
        }
    } catch (_: Throwable) { emptyList() }
}

/**
 * v4.7.2 — parse cached jaksot from widget prefs. Used by widgets that
 * need the ScheduleEngine's jakso-range filtering. Falls back to the
 * hardcoded DEFAULT_JAKSOT if the cache is empty (first launch pre-sync).
 */
fun parseWidgetJaksot(raw: String?): List<Jakso> {
    if (raw.isNullOrBlank()) return DEFAULT_JAKSOT
    return try {
        val list = scheduleJson.decodeFromString<List<Jakso>>(raw)
        if (list.isEmpty()) DEFAULT_JAKSOT else list
    } catch (_: Throwable) { DEFAULT_JAKSOT }
}
