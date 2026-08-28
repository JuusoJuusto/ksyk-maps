package fi.ksykmaps.data

import android.util.Log
import androidx.compose.runtime.mutableStateOf
import fi.ksykmaps.KsykApp
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
 * Reactive: the [entriesState] is a Compose-observable snapshot that
 * updates every time a new entry lands, so the logs screen streams live.
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

    /** Compose-observable snapshot — bumped on every new entry so LogsScreen recomposes. */
    val entriesState = mutableStateOf<List<Entry>>(emptyList())

    fun debug(tag: String, message: String) = add(Level.DEBUG, tag, message)
    fun info(tag: String, message: String) = add(Level.INFO, tag, message)
    fun warn(tag: String, message: String) = add(Level.WARN, tag, message)
    fun error(tag: String, message: String) = add(Level.ERROR, tag, message)

    private fun add(level: Level, tag: String, message: String) {
        // Also log to logcat so devs can grep during development.
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
        // Best-effort file append. Failures (disk full, no context) drop
        // silently — we don't want the log system itself to crash the app.
        try {
            val ctx = KsykApp.instance
            val f = File(ctx.filesDir, LOG_FILE)
            // Truncate the file if it grows past ~200 KB to keep memory
            // and disk bounded across long install lifetimes.
            if (f.exists() && f.length() > 200_000) f.delete()
            f.appendText("${entry.isoTime}\t${level.name}\t$tag\t$message\n")
        } catch (_: Throwable) {}
    }

    /** Return combined in-memory entries newest first. */
    fun snapshot(): List<Entry> = ring.toList()

    /** Read any historical entries from the log file. */
    fun readFile(): String {
        return try {
            val ctx = KsykApp.instance
            val f = File(ctx.filesDir, LOG_FILE)
            if (f.exists()) f.readText() else ""
        } catch (_: Throwable) { "" }
    }

    /** Wipe both memory and disk. */
    fun clear() {
        ring.clear()
        entriesState.value = emptyList()
        try {
            val ctx = KsykApp.instance
            File(ctx.filesDir, LOG_FILE).delete()
        } catch (_: Throwable) {}
    }
}
