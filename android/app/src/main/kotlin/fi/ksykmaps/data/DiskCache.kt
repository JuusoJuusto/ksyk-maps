package fi.ksykmaps.data

import fi.ksykmaps.KsykApp
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import java.io.File

/**
 * File-backed JSON cache for API responses.
 *
 * Every successful GET is mirrored to `filesDir/api_cache/<slug>.json`,
 * and reads fall back to that file when the network is unreachable.
 * This is what makes the phone useful on the school Wi-Fi's captive
 * portal, on a subway with no signal, or during a full outage — the
 * app opens instantly with the last-good data instead of showing an
 * error card.
 *
 * We deliberately never expire entries. If a room got renamed six
 * months ago the offline view will still work; the next successful
 * fetch overwrites the file. Explicit "stale" is fine because every
 * screen also displays a `lastRefreshed` timestamp.
 */
object DiskCache {
    private val json = Json { ignoreUnknownKeys = true }

    /** Read the cached response for the given API path, or null if none. */
    fun read(path: String): JsonElement? {
        val f = fileFor(path) ?: return null
        if (!f.exists()) return null
        return try { json.parseToJsonElement(f.readText()) } catch (_: Exception) { null }
    }

    /** Write a fresh response for the given API path. */
    fun write(path: String, value: JsonElement) {
        val f = fileFor(path) ?: return
        try {
            f.parentFile?.mkdirs()
            f.writeText(value.toString())
        } catch (_: Exception) { /* disk full / permission — drop silently */ }
    }

    /** Wipe the entire cache — used from Settings > "Clear offline data". */
    fun clear() {
        try { dir()?.deleteRecursively() } catch (_: Exception) {}
    }

    /** Total on-disk size of cached responses, in bytes. */
    fun sizeBytes(): Long {
        val d = dir() ?: return 0L
        if (!d.exists()) return 0L
        return d.walkTopDown().filter { it.isFile }.map { it.length() }.sum()
    }

    private fun dir(): File? {
        val ctx = try { KsykApp.instance } catch (_: Exception) { return null }
        return File(ctx.filesDir, "api_cache")
    }

    private fun fileFor(path: String): File? {
        val d = dir() ?: return null
        // Turn "/rooms?limit=20" into "rooms_limit20.json" — replace
        // every non-alphanumeric run with an underscore so paths with
        // slashes or query strings all land on disk safely.
        val slug = path.trim('/').replace(Regex("[^A-Za-z0-9]+"), "_").take(120)
        return File(d, "$slug.json")
    }
}
