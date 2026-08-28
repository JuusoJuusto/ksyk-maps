package fi.ksykmaps.data

import android.util.Log
import androidx.compose.runtime.mutableStateOf
import fi.ksykmaps.KsykApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch
import java.io.File
import java.time.Instant
import java.util.concurrent.ConcurrentLinkedDeque

/**
 * In-memory + disk-backed log ring for the mobile app.
 *
 * Every module (Api, MapScreen, LessonReminder, WifiPositioning, etc.)
 * calls AppLog.info/warn/error(tag, message). Entries are kept in a
 * bounded ring and mirrored to `filesDir/app_log.txt` so they survive
 * process kills. The Settings > Logs viewer reads back the ring plus the
 * file for anything from before the last cold start.
 *
 * WARN/ERROR entries are also forwarded to the server via the
 * adblock-safe `/api/session/heartbeat` endpoint so the admin panel's
 * Aktiviteetti tab shows real-time mobile errors alongside web ones.
 */
object AppLog {
    private const val MAX_ENTRIES = 500
    private const val LOG_FILE = "app_log.txt"

    data class Entry(
        val timestampMs: Long,
        val level: Level,
        val tag: String,
        val message: String,
    ) {
        val isoTime: String get() = try { Instant.ofEpochMilli(timestampMs).toString() } catch (_: Exception) { "" }
    }

    enum class Level { DEBUG, INFO, WARN, ERROR }

    private val ring = ConcurrentLinkedDeque<Entry>()
    val entriesState = mutableStateOf<List<Entry>>(emptyList())

    // ── Server forwarding — batched to avoid one HTTP hit per log line. ─
    private val forwardScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val forwardQueue = Channel<Entry>(capacity = 200)
    private const val FORWARD_BATCH_MS = 5000L

    init {
        forwardScope.launch {
            val buffer = mutableListOf<Entry>()
            while (true) {
                try {
                    val first = forwardQueue.receive()
                    buffer.add(first)
                    val deadline = System.currentTimeMillis() + FORWARD_BATCH_MS
                    while (System.currentTimeMillis() < deadline && buffer.size < 40) {
                        val next = forwardQueue.tryReceive().getOrNull() ?: break
                        buffer.add(next)
                    }
                    flushForward(buffer)
                    buffer.clear()
                } catch (_: Throwable) {
                    // Keep the forwarder alive across transient failures.
                }
            }
        }
    }

    private fun flushForward(entries: List<Entry>) {
        if (entries.isEmpty()) return
        try {
            val json = buildBeacon(entries)
            Api.postFireAndForget("/session/heartbeat", json)
        } catch (_: Throwable) { /* silent */ }
    }

    private fun buildBeacon(entries: List<Entry>): String {
        val sb = StringBuilder()
        sb.append("{\"source\":\"android\",\"sessionId\":\"")
        sb.append(sessionId())
        sb.append("\",\"events\":[")
        entries.forEachIndexed { idx, e ->
            if (idx > 0) sb.append(',')
            sb.append("{\"type\":\"log\",\"ts\":\"")
            sb.append(e.isoTime)
            sb.append("\",\"level\":\"")
            sb.append(e.level.name.lowercase())
            sb.append("\",\"tag\":\"")
            sb.append(escape(e.tag))
            sb.append("\",\"message\":\"")
            sb.append(escape(e.message.take(500)))
            sb.append("\"}")
        }
        sb.append("]}")
        return sb.toString()
    }

    private fun escape(s: String): String {
        val out = StringBuilder(s.length)
        for (c in s) when {
            c == '\\' -> out.append("\\\\")
            c == '"' -> out.append("\\\"")
            c == '\n' -> out.append("\\n")
            c == '\r' -> out.append("\\r")
            c == '\t' -> out.append("\\t")
            c.code < 0x20 -> out.append("\\u").append(String.format("%04x", c.code))
            else -> out.append(c)
        }
        return out.toString()
    }

    private fun sessionId(): String {
        return try {
            val sp = KsykApp.instance.getSharedPreferences("ksyk_session", android.content.Context.MODE_PRIVATE)
            var s = sp.getString("session_id", null)
            if (s.isNullOrBlank()) {
                s = "and_" + java.util.UUID.randomUUID().toString().take(12)
                sp.edit().putString("session_id", s).apply()
            }
            s ?: "and_anon"
        } catch (_: Throwable) { "and_anon" }
    }

    fun debug(tag: String, message: String) = add(Level.DEBUG, tag, message)
    fun info(tag: String, message: String) = add(Level.INFO, tag, message)
    fun warn(tag: String, message: String) = add(Level.WARN, tag, message)
    fun error(tag: String, message: String) = add(Level.ERROR, tag, message)

    private fun add(level: Level, tag: String, message: String) {
        when (level) {
            Level.DEBUG -> Log.d("KSYK/$tag", message)
            Level.INFO -> Log.i("KSYK/$tag", message)
            Level.WARN -> Log.w("KSYK/$tag", message)
            Level.ERROR -> Log.e("KSYK/$tag", message)
        }
        val entry = Entry(System.currentTimeMillis(), level, tag, message)
        ring.addFirst(entry)
        while (ring.size > MAX_ENTRIES) ring.removeLast()
        entriesState.value = ring.toList()
        try {
            val ctx = KsykApp.instance
            val f = File(ctx.filesDir, LOG_FILE)
            if (f.exists() && f.length() > 200_000) f.delete()
            f.appendText("${entry.isoTime}\t${level.name}\t$tag\t$message\n")
        } catch (_: Throwable) {}
        // Forward WARN/ERROR to server so the admin panel sees real-time
        // mobile issues. INFO/DEBUG stay local to keep bandwidth low.
        if (level == Level.WARN || level == Level.ERROR) {
            try { forwardQueue.trySend(entry) } catch (_: Throwable) {}
        }
    }

    fun snapshot(): List<Entry> = ring.toList()

    fun readFile(): String {
        return try {
            val ctx = KsykApp.instance
            val f = File(ctx.filesDir, LOG_FILE)
            if (f.exists()) f.readText() else ""
        } catch (_: Throwable) { "" }
    }

    fun clear() {
        ring.clear()
        entriesState.value = emptyList()
        try {
            val ctx = KsykApp.instance
            File(ctx.filesDir, LOG_FILE).delete()
        } catch (_: Throwable) {}
    }
}
