package fi.ksykmaps.data

import android.content.Context
import android.os.Build
import fi.ksykmaps.KsykApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.time.Instant
import java.util.UUID

/**
 * KSYK Maps — first-party mobile telemetry SDK.
 *
 * Mirrors the web SDK API (client/src/lib/analytics-sdk.ts):
 *
 *   Analytics.track(eventName, metadata)
 *   Analytics.pageView(screen)
 *   Analytics.featureUsed(feature, action)
 *   Analytics.error(tag, message)
 *   Analytics.performance(name, valueMs)
 *   Analytics.easterEgg(eggId)
 *
 * Design:
 *  - Events are queued in memory and mirrored to `filesDir/telemetry_queue.json`
 *    every mutation, so an app kill mid-session doesn't lose data.
 *  - Flushed every 15 s or when the queue reaches [MAX_BATCH].
 *  - On flush failure (HTTP 429/5xx/network), re-queue with exponential
 *    backoff. Successful uploads clear the corresponding entries.
 *  - Queue capped at [MAX_QUEUE] events; oldest drop first.
 *  - Session id is a random UUID persisted in SharedPreferences per
 *    process lifetime (rotates on app-cold-start).
 *  - Legacy helpers (trackBuildingSearch, trackRoomView, …) stay for
 *    back-compat with existing call sites; they forward to featureUsed
 *    / search.
 */
object Analytics {
    private const val TAG = "Analytics"
    private const val QUEUE_FILE = "telemetry_queue.json"
    private const val SESSION_PREFS = "ksyk_session"
    private const val SESSION_KEY = "session_id"
    private const val ANON_KEY = "anonymous_id"

    private const val MAX_QUEUE = 400
    private const val MAX_BATCH = 40
    private const val FLUSH_INTERVAL_MS = 15_000L

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val mutex = Mutex()
    private val queue: ArrayDeque<JSONObject> = ArrayDeque()
    @Volatile private var backoffUntil = 0L
    @Volatile private var consecutiveFails = 0
    @Volatile private var initialised = false
    @Volatile private var sessionStartMs = System.currentTimeMillis()

    /** Called once on app startup. Loads persisted queue and starts flush loop. */
    fun init(ctx: Context) {
        if (initialised) return
        initialised = true
        sessionStartMs = System.currentTimeMillis()
        scope.launch {
            loadPersistedQueue(ctx)
            track(
                "session_started",
                mapOf(
                    "device" to Build.MODEL,
                    "manufacturer" to Build.MANUFACTURER,
                    "osVersion" to Build.VERSION.RELEASE,
                    "sdkInt" to Build.VERSION.SDK_INT.toString(),
                ),
            )
            while (true) {
                try {
                    kotlinx.coroutines.delay(FLUSH_INTERVAL_MS)
                    flush()
                } catch (_: Throwable) { /* keep loop alive */ }
            }
        }
    }

    // ── Public API ─────────────────────────────────────────────────────
    fun track(eventName: String, metadata: Map<String, Any?> = emptyMap()) {
        enqueue(baseEvent(eventName).apply { put("metadata", metadata.toJson()) })
    }

    fun pageView(screen: String) {
        enqueue(baseEvent("screen_view").apply {
            put("screen", screen)
            put("url", screen)
        })
    }

    fun featureUsed(feature: String, action: String = "used", metadata: Map<String, Any?> = emptyMap()) {
        enqueue(baseEvent("feature").apply {
            put("name", feature)
            put("action", action)
            put("metadata", metadata.toJson())
        })
    }

    fun error(tag: String, message: String, stack: String? = null) {
        enqueue(baseEvent("error").apply {
            put("level", "error")
            put("tag", tag)
            put("message", message.take(500))
            if (stack != null) put("stack", stack.take(2000))
        })
    }

    fun performance(name: String, valueMs: Number, meta: Map<String, Any?> = emptyMap()) {
        enqueue(baseEvent("performance").apply {
            put("metric", name)
            put("value", valueMs)
            put("metadata", meta.toJson())
        })
    }

    fun easterEgg(eggId: String, metadata: Map<String, Any?> = emptyMap()) {
        enqueue(baseEvent("easter_egg").apply {
            put("eggId", eggId)
            put("metadata", metadata.toJson())
        })
    }

    fun search(query: String, hits: Int = 0) {
        enqueue(baseEvent("search").apply {
            put("query", query.take(200))
            put("hits", hits)
        })
    }

    fun navigation(fromRoom: String?, toRoom: String?, distance: Double? = null, durationSec: Int? = null) {
        enqueue(baseEvent("navigation").apply {
            if (fromRoom != null) put("fromRoom", fromRoom)
            if (toRoom != null) put("toRoom", toRoom)
            if (distance != null) put("distance", distance)
            if (durationSec != null) put("duration", durationSec)
        })
    }

    // ── Back-compat helpers used elsewhere in the codebase. ────────────
    fun trackBuildingSearch(query: String, resultCount: Int) = search(query, resultCount)
    fun trackRoomView(roomId: String, roomNumber: String, building: String = "") =
        featureUsed("room_view", "opened", mapOf("id" to roomId, "num" to roomNumber, "building" to building))
    fun trackBuildingOpen(buildingId: String, buildingName: String) =
        featureUsed("building_open", "opened", mapOf("id" to buildingId, "name" to buildingName))
    fun trackTabSwitch(tab: String) = pageView(tab)
    fun trackError(screen: String, message: String) = error(screen, message)
    fun trackEasterEgg(name: String) = easterEgg(name)
    fun trackLunchView(day: String) = featureUsed("lunch", "opened", mapOf("day" to day))
    fun trackMapAction(action: String) = featureUsed("map", action)

    fun endSession() {
        track("session_ended", mapOf("durationMs" to (System.currentTimeMillis() - sessionStartMs)))
        scope.launch { flush() }
    }

    // ── Session + anon ids ─────────────────────────────────────────────
    fun sessionId(): String {
        return try {
            val sp = KsykApp.instance.getSharedPreferences(SESSION_PREFS, Context.MODE_PRIVATE)
            var s = sp.getString(SESSION_KEY, null)
            if (s.isNullOrBlank()) {
                s = "and_" + UUID.randomUUID().toString().take(12)
                sp.edit().putString(SESSION_KEY, s).apply()
            }
            s ?: "and_anon"
        } catch (_: Throwable) { "and_anon" }
    }

    fun anonymousId(): String {
        return try {
            val sp = KsykApp.instance.getSharedPreferences(SESSION_PREFS, Context.MODE_PRIVATE)
            var a = sp.getString(ANON_KEY, null)
            if (a.isNullOrBlank()) {
                a = "usr_" + UUID.randomUUID().toString().replace("-", "").take(16)
                sp.edit().putString(ANON_KEY, a).apply()
            }
            a ?: "usr_anon"
        } catch (_: Throwable) { "usr_anon" }
    }

    // ── Internals ──────────────────────────────────────────────────────
    private fun baseEvent(type: String): JSONObject {
        return JSONObject().apply {
            put("type", type)
            put("ts", Instant.now().toString())
        }
    }

    private fun enqueue(ev: JSONObject) {
        scope.launch {
            mutex.withLock {
                queue.addLast(ev)
                while (queue.size > MAX_QUEUE) queue.removeFirst()
                persistQueue()
            }
            if (queue.size >= MAX_BATCH) flush()
        }
    }

    private suspend fun flush() {
        if (System.currentTimeMillis() < backoffUntil) return
        val batch: List<JSONObject> = mutex.withLock {
            if (queue.isEmpty()) return@withLock emptyList()
            val take = ArrayList<JSONObject>(queue.size)
            while (queue.isNotEmpty()) take.add(queue.removeFirst())
            take
        }
        if (batch.isEmpty()) return
        val ok = uploadBatch(batch)
        if (!ok) {
            // Requeue at the front, backoff.
            mutex.withLock {
                for (i in batch.indices.reversed()) queue.addFirst(batch[i])
                while (queue.size > MAX_QUEUE) queue.removeLast()
                persistQueue()
            }
            consecutiveFails += 1
            val delay = minOf(30_000L * (1L shl (consecutiveFails - 1).coerceAtMost(4)), 600_000L)
            backoffUntil = System.currentTimeMillis() + delay
        } else {
            consecutiveFails = 0
            backoffUntil = 0
            mutex.withLock { persistQueue() }
        }
    }

    private fun uploadBatch(batch: List<JSONObject>): Boolean {
        return try {
            val body = JSONObject().apply {
                put("source", "android")
                put("sessionId", sessionId())
                put("anonymousId", anonymousId())
                put("appVersion", fi.ksykmaps.BuildConfig.VERSION_NAME)
                put("osVersion", Build.VERSION.RELEASE)
                put("deviceType", "mobile")
                put("events", JSONArray(batch))
            }.toString()
            Api.postFireAndForget("/session/heartbeat", body)
            true
        } catch (_: Throwable) {
            false
        }
    }

    private fun persistQueue() {
        try {
            val ctx = KsykApp.instance
            val file = File(ctx.filesDir, QUEUE_FILE)
            val arr = JSONArray()
            queue.forEach { arr.put(it) }
            file.writeText(arr.toString())
        } catch (_: Throwable) { /* disk full — drop persistence */ }
    }

    private fun loadPersistedQueue(ctx: Context) {
        try {
            val file = File(ctx.filesDir, QUEUE_FILE)
            if (!file.exists()) return
            val arr = JSONArray(file.readText())
            for (i in 0 until arr.length()) {
                val o = arr.optJSONObject(i) ?: continue
                queue.addLast(o)
            }
            while (queue.size > MAX_QUEUE) queue.removeFirst()
        } catch (_: Throwable) { /* corrupt file — start fresh */ }
    }
}

// Small JSON helper — turns a Map<String, Any?> into a JSONObject.
private fun Map<String, Any?>.toJson(): JSONObject {
    val o = JSONObject()
    for ((k, v) in this) {
        try {
            when (v) {
                null -> o.put(k, JSONObject.NULL)
                is Boolean, is Number, is String -> o.put(k, v)
                is Map<*, *> -> {
                    @Suppress("UNCHECKED_CAST")
                    o.put(k, (v as Map<String, Any?>).toJson())
                }
                else -> o.put(k, v.toString())
            }
        } catch (_: Throwable) { /* ignore unserialisable */ }
    }
    return o
}
