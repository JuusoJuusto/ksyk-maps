package fi.ksykmaps.ui

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import fi.ksykmaps.data.Api
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import java.time.LocalDate
import java.util.UUID
import java.util.concurrent.TimeUnit

/**
 * Periodically re-fetches the Wilma iCalendar feed and refreshes the
 * stored schedule entries. Runs every 3 hours via WorkManager so any
 * teacher/room change in Wilma shows up without the user having to
 * manually tap "Sync now". Also invoked on app-open when the last sync
 * was on a previous calendar date (new school day = fresh data needed).
 *
 * Only runs when a Wilma URL is stored (i.e. the user has connected
 * Wilma). Manual entries are preserved — only `wilma_*` ids are replaced.
 */
class WilmaRefreshWorker(
    ctx: Context,
    params: WorkerParameters,
) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result {
        val ctx = applicationContext
        val url = getStoredWilmaUrl(ctx) ?: return Result.success()
        return try {
            syncNow(ctx, url)
            ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putString(KEY_LAST_SYNC_DATE, LocalDate.now().toString()).apply()
            Result.success()
        } catch (_: Throwable) {
            Result.retry()
        }
    }

    companion object {
        private const val PREFS = "ksyk_wilma"
        internal const val KEY_LAST_SYNC_DATE = "last_sync_date"
        private const val WORK_NAME = "wilma_schedule_refresh"

        fun enqueue(ctx: Context) {
            val request = PeriodicWorkRequestBuilder<WilmaRefreshWorker>(
                3, TimeUnit.HOURS,
            ).build()
            WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request,
            )
        }

        fun getLastSyncDate(ctx: Context): String? =
            ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString(KEY_LAST_SYNC_DATE, null)

        /** Core sync logic — shared between the Worker and on-open trigger
         *  in TimetableScreen so there's a single parsing path. */
        suspend fun syncNow(ctx: Context, url: String) {
            val jaksot = loadJaksot(ctx)
            val body = buildJsonObject { put("url", url) }
            val result = Api.post("/calendar/parse", body)
            val obj = result.jsonObject
            val eventsArr = obj["events"]?.jsonArray ?: JsonArray(emptyList())

            val imported = eventsArr.mapNotNull { el ->
                try {
                    val ev = el.jsonObject
                    val dow = ev["dayOfWeek"]?.jsonPrimitive?.intOrNull ?: return@mapNotNull null
                    val start = ev["startHhmm"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null
                    val end = ev["endHhmm"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null
                    val summary = ev["summary"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null
                    val rawDate = (ev["localDate"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull
                        ?: (ev["date"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull
                    val dateStr = rawDate?.take(10)
                    val jaksoId = if (dateStr != null && dateStr.matches(Regex("\\d{4}-\\d{2}-\\d{2}"))) {
                        try {
                            jaksot.firstOrNull { j -> j.startDate <= dateStr && dateStr <= j.endDate }?.id ?: "all"
                        } catch (_: Exception) { "all" }
                    } else "all"
                    val uidStr = ev["uid"]?.jsonPrimitive?.contentOrNull ?: UUID.randomUUID().toString()
                    val subjectCode = ev["subjectCode"]?.jsonPrimitive?.contentOrNull ?: ""
                    ScheduleEntry(
                        id            = "wilma_${uidStr}_${jaksoId}",
                        dayOfWeek     = dow,
                        startHhmm     = start,
                        endHhmm       = end,
                        // Keep full summary as fallback subject; resolved name shown at display time
                        subject       = subjectCode.ifBlank { summary },
                        roomId        = ev["matchedRoomId"]?.jsonPrimitive?.contentOrNull ?: "",
                        roomNumber    = ev["matchedRoomNumber"]?.jsonPrimitive?.contentOrNull ?: "",
                        teacher       = ev["teacher"]?.jsonPrimitive?.contentOrNull ?: "",
                        jaksoId       = jaksoId,
                        subjectCode   = subjectCode,
                        teacherAbbrev = ev["teacherAbbrev"]?.jsonPrimitive?.contentOrNull ?: "",
                    )
                } catch (_: Exception) { null }
            }

            val deduped = imported.distinctBy {
                listOf(it.dayOfWeek, it.startHhmm, it.endHhmm, it.subject, it.jaksoId)
            }
            val manual = loadEntries(ctx).filter { !it.id.startsWith("wilma_") }
            withContext(Dispatchers.Main) {
                saveEntries(ctx, manual + deduped)
            }
        }
    }
}
