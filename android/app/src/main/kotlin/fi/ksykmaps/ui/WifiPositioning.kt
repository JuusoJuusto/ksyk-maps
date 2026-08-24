package fi.ksykmaps.ui

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.net.wifi.WifiManager
import androidx.core.content.ContextCompat
import fi.ksykmaps.data.Api
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*
import kotlin.math.abs

/** Live position estimate returned by /api/wifi/locate. */
data class WifiPosition(
    val roomId: String,
    val positionLabel: String,
    val lat: Double?,
    val lng: Double?,
    val floor: Int?,
    val confidence: Confidence,
    val confidenceScore: Int,    // 0–100
    val sharedApCount: Int,
    val visibleApCount: Int,
) {
    enum class Confidence { HIGH, MEDIUM, LOW, NONE }
}

/**
 * Stateful Wi-Fi positioning helper. Call [startScanning] inside a
 * coroutine scope to start the background loop; cancel the scope to stop.
 *
 * Mode:
 *   IDLE     — long interval (30s). Useful when the map is just open.
 *   NAVIGATE — short interval (5s). Used when the user is actively navigating.
 *
 * Signal processing:
 *   - Exponential moving average (α=0.3) smooths noisy RSSI readings.
 *   - Absent APs decay toward -100 dBm so stale fingerprints don't persist.
 *   - Floor changes require a 2-of-3 majority window to prevent rapid flicker.
 *   - Position updates are suppressed when the RSSI delta is below a threshold,
 *     saving battery and reducing server load in steady-state.
 */
object WifiPositioning {

    sealed class Mode {
        object Idle : Mode()
        object Navigate : Mode()
    }

    private val _position = MutableStateFlow<WifiPosition?>(null)
    val position: StateFlow<WifiPosition?> = _position

    private val _scanCount = MutableStateFlow(0)
    val scanCount: StateFlow<Int> = _scanCount

    var mode: Mode = Mode.Idle

    // ── RSSI smoothing ────────────────────────────────────────────────
    // Exponential weighted moving average per BSSID.
    //   smoothed = α·new + (1−α)·prev
    // α=0.3 means 70% weight on history — enough to damp typical RSSI
    // jitter (~±5 dBm) without making the system sluggish to real movement.
    private const val ALPHA = 0.3
    private val smoothedRssi = mutableMapOf<String, Double>()

    // ── Floor hysteresis ──────────────────────────────────────────────
    // Floor estimates are noisier than X/Y position — a single bad scan
    // can briefly place the user on the wrong floor. We require 2 of the
    // last 3 estimates to agree before committing to a floor switch.
    private const val FLOOR_WINDOW = 3
    private const val FLOOR_SWITCH_VOTES = 2
    private val floorVotes = ArrayDeque<Int>()

    // ── Update suppression ────────────────────────────────────────────
    // Don't send a locate request when the overall RSSI vector hasn't
    // changed meaningfully. We hash the top-10 BSSIDs by smoothed RSSI;
    // if the hash matches the previous locate call we skip. This avoids
    // hammering the server while the user is standing still.
    private var lastLocateHash = 0

    private var isScanning = false

    suspend fun startScanning(ctx: Context) {
        if (isScanning) return
        isScanning = true
        try {
            LocalPositioning.refresh()

            while (true) {
                val intervalMs: Long = when (mode) {
                    is Mode.Navigate -> 5_000L
                    else             -> 30_000L
                }

                if (hasPermission(ctx)) {
                    val raw = scanWifi(ctx)
                    _scanCount.value = raw.size
                    if (raw.isNotEmpty()) {
                        val smoothed = applySmoothing(raw)
                        val hash = rssiHash(smoothed)
                        val shouldLocate = mode is Mode.Navigate || hash != lastLocateHash
                        if (shouldLocate) {
                            try {
                                val estimate = locate(smoothed)
                                lastLocateHash = hash
                                if (estimate != null) {
                                    val stabilizedFloor = stabilizeFloor(estimate.floor)
                                    _position.value = estimate.copy(floor = stabilizedFloor)
                                }
                            } catch (_: Exception) {}
                        }
                    }
                }

                delay(intervalMs)
            }
        } finally {
            isScanning = false
        }
    }

    /** Reset all smoothing state — call when the user signs out or changes context. */
    fun reset() {
        smoothedRssi.clear()
        floorVotes.clear()
        lastLocateHash = 0
        _position.value = null
        _scanCount.value = 0
    }

    // ── Smoothing ─────────────────────────────────────────────────────

    private fun applySmoothing(raw: List<JsonObject>): List<JsonObject> {
        val visible = mutableSetOf<String>()

        // Update EMA for each visible AP.
        raw.forEach { r ->
            val bssid = (r["bssid"] as? JsonPrimitive)?.contentOrNull?.lowercase() ?: return@forEach
            val rssi  = (r["rssi"]  as? JsonPrimitive)?.doubleOrNull ?: return@forEach
            visible += bssid
            val prev = smoothedRssi[bssid]
            smoothedRssi[bssid] = if (prev == null) rssi else ALPHA * rssi + (1.0 - ALPHA) * prev
        }

        // Decay APs that are no longer visible — pull them toward -100 dBm.
        // Once they fall below -96 we drop them from the map so old, irrelevant
        // fingerprints don't crowd out currently-visible APs.
        val toRemove = mutableListOf<String>()
        for ((bssid, prev) in smoothedRssi) {
            if (bssid in visible) continue
            val decayed = ALPHA * (-100.0) + (1.0 - ALPHA) * prev
            if (decayed < -96.0) toRemove += bssid else smoothedRssi[bssid] = decayed
        }
        toRemove.forEach { smoothedRssi.remove(it) }

        // Build the output list from the smoothed values for visible APs.
        return raw.mapNotNull { r ->
            val bssid = (r["bssid"] as? JsonPrimitive)?.contentOrNull?.lowercase() ?: return@mapNotNull null
            val s = smoothedRssi[bssid] ?: return@mapNotNull null
            buildJsonObject {
                put("bssid", bssid)
                put("rssi", s.toInt())
                (r["ssid"] as? JsonPrimitive)?.contentOrNull?.let { put("ssid", it) }
            }
        }
    }

    // ── Floor hysteresis ──────────────────────────────────────────────

    private fun stabilizeFloor(newFloor: Int?): Int? {
        if (newFloor == null) return _position.value?.floor
        if (floorVotes.size >= FLOOR_WINDOW) floorVotes.removeFirst()
        floorVotes.addLast(newFloor)
        // Require FLOOR_SWITCH_VOTES of the last FLOOR_WINDOW estimates to agree.
        val dominant = floorVotes.groupingBy { it }.eachCount().maxByOrNull { it.value }
        return if ((dominant?.value ?: 0) >= FLOOR_SWITCH_VOTES) dominant?.key
               else _position.value?.floor ?: newFloor
    }

    // ── RSSI hash ─────────────────────────────────────────────────────

    // Cheap fingerprint of the top-10 BSSIDs by signal strength.
    // Rounds RSSI to the nearest 3 dBm to tolerate minor fluctuations.
    private fun rssiHash(readings: List<JsonObject>): Int {
        val top10 = readings
            .mapNotNull { r ->
                val bssid = (r["bssid"] as? JsonPrimitive)?.contentOrNull ?: return@mapNotNull null
                val rssi  = (r["rssi"]  as? JsonPrimitive)?.intOrNull ?: return@mapNotNull null
                bssid to (rssi / 3) // quantize to 3 dBm buckets
            }
            .sortedByDescending { it.second }
            .take(10)
        return top10.hashCode()
    }

    // ── Scanning ──────────────────────────────────────────────────────

    @SuppressLint("MissingPermission")
    private fun scanWifi(ctx: Context): List<JsonObject> {
        val wm = ctx.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        @Suppress("DEPRECATION")
        wm.startScan()
        @Suppress("DEPRECATION")
        return wm.scanResults.map { r ->
            buildJsonObject {
                put("bssid", r.BSSID ?: "")
                put("rssi",  r.level)
                @Suppress("DEPRECATION")
                put("ssid",  r.SSID ?: "")
            }
        }
    }

    // ── Server locate call (with local KNN fallback) ──────────────────

    private suspend fun locate(readings: List<JsonObject>): WifiPosition? =
        withContext(Dispatchers.IO) {
            val body = buildJsonObject { put("readings", JsonArray(readings)) }

            // Try server-side positioning first.
            val serverPos = try {
                val obj = Api.post("/wifi/locate", body) as? JsonObject
                if (obj != null) parseServerResponse(obj, readings.size) else null
            } catch (_: Exception) { null }

            if (serverPos != null) return@withContext serverPos

            // Server unreachable or returned no match — fall back to on-device KNN.
            if (!LocalPositioning.isReady) return@withContext null
            val localReadings = readings.mapNotNull { r ->
                val bssid = (r["bssid"] as? JsonPrimitive)?.contentOrNull ?: return@mapNotNull null
                val rssi  = (r["rssi"]  as? JsonPrimitive)?.intOrNull     ?: return@mapNotNull null
                LocalPositioning.Reading(bssid, rssi)
            }
            LocalPositioning.locate(localReadings)
        }

    private fun parseServerResponse(obj: JsonObject, visibleApCount: Int): WifiPosition? {
        val roomId    = (obj["roomId"]          as? JsonPrimitive)?.contentOrNull ?: return null
        val posLabel  = (obj["positionLabel"]   as? JsonPrimitive)?.contentOrNull ?: ""
        val lat       = (obj["lat"]             as? JsonPrimitive)?.doubleOrNull
        val lng       = (obj["lng"]             as? JsonPrimitive)?.doubleOrNull
        val floor     = (obj["floor"]           as? JsonPrimitive)?.contentOrNull?.toIntOrNull()
        val confStr   = (obj["confidence"]      as? JsonPrimitive)?.contentOrNull ?: "low"
        val confScore = (obj["confidenceScore"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() ?: 0
        val sharedAp  = (obj["sharedApCount"]   as? JsonPrimitive)?.contentOrNull?.toIntOrNull() ?: 0

        val conf = when (confStr.lowercase()) {
            "high"   -> WifiPosition.Confidence.HIGH
            "medium" -> WifiPosition.Confidence.MEDIUM
            else     -> WifiPosition.Confidence.LOW
        }
        return WifiPosition(
            roomId          = roomId,
            positionLabel   = posLabel,
            lat             = lat,
            lng             = lng,
            floor           = floor,
            confidence      = conf,
            confidenceScore = confScore,
            sharedApCount   = sharedAp,
            visibleApCount  = visibleApCount,
        )
    }

    private fun hasPermission(ctx: Context): Boolean =
        ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED &&
        ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_WIFI_STATE) ==
            PackageManager.PERMISSION_GRANTED
}
