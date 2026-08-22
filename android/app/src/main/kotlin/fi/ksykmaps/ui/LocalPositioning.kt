package fi.ksykmaps.ui

import fi.ksykmaps.data.Api
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*
import kotlin.math.sqrt

/**
 * On-device K-nearest-neighbour Wi-Fi positioning.
 *
 * Downloads the full fingerprint database from /api/wifi/fingerprints once and
 * caches it on disk via DiskCache (which Api.get() does automatically). When
 * the server is unreachable, locate() runs locally against whatever fingerprints
 * are cached — letting positioning work in airplane mode or during an outage.
 *
 * Algorithm mirrors server/kvStorage.ts:computeRssiDistance() + wifiLocate()
 * so results are consistent regardless of which path produced them:
 *   K = 3              — three nearest neighbours
 *   MISSING_RSSI = -92 — assumed RSSI for an AP not in the current scan
 *   EXTRA_WEIGHT = 0.3 — penalty for APs visible now but absent from fingerprint
 *   MAX_DISTANCE = 250 — reject candidates beyond this Euclidean RSSI distance
 */
object LocalPositioning {

    private const val K = 3
    private const val MISSING_RSSI = -92.0
    private const val EXTRA_WEIGHT = 0.3
    private const val MAX_DISTANCE = 250.0

    data class Reading(val bssid: String, val rssi: Int)

    private data class Fingerprint(
        val id: String,
        val roomId: String,
        val positionLabel: String,
        val lat: Double?,
        val lng: Double?,
        val floor: Int?,
        val readings: List<Reading>,
    )

    @Volatile private var fingerprints: List<Fingerprint>? = null

    val isReady: Boolean get() = (fingerprints?.size ?: 0) > 0
    val fingerprintCount: Int get() = fingerprints?.size ?: 0

    /**
     * Download (or fall back to the disk copy of) the fingerprint database.
     * Api.get() writes to DiskCache on success and reads from it when offline,
     * so this call is safe to make regardless of network state.
     */
    suspend fun refresh() = withContext(Dispatchers.IO) {
        try {
            val arr = Api.get("/wifi/fingerprints") as? JsonArray ?: return@withContext
            fingerprints = arr.mapNotNull { parseFp(it as? JsonObject ?: return@mapNotNull null) }
        } catch (_: Exception) {
            // Api.get() already exhausted the disk fallback; nothing to do here.
        }
    }

    /**
     * Match [currentReadings] against cached fingerprints with KNN.
     * Returns null if no fingerprints are loaded or no candidate is within
     * [MAX_DISTANCE] — the caller should surface a "no match" state.
     */
    fun locate(currentReadings: List<Reading>): WifiPosition? {
        val fps = fingerprints ?: return null
        if (fps.isEmpty() || currentReadings.isEmpty()) return null

        val curMap = currentReadings.associate { it.bssid.lowercase() to it.rssi.toDouble() }

        data class Scored(val fp: Fingerprint, val distance: Double, val shared: Int)

        val scored = fps.map { fp ->
            val fpMap = fp.readings.associate { it.bssid.lowercase() to it.rssi.toDouble() }
            var sumSq = 0.0
            var count = 0
            var shared = 0

            for ((bssid, fpRssi) in fpMap) {
                val curRssi = curMap[bssid] ?: MISSING_RSSI
                val diff = fpRssi - curRssi
                sumSq += diff * diff
                count++
                if (curMap.containsKey(bssid)) shared++
            }
            for ((bssid, curRssi) in curMap) {
                if (!fpMap.containsKey(bssid)) {
                    val diff = curRssi - MISSING_RSSI
                    sumSq += diff * diff * EXTRA_WEIGHT
                    count++
                }
            }

            val dist = if (count > 0) sqrt(sumSq / count) else 9999.0
            Scored(fp, dist, shared)
        }.sortedBy { it.distance }

        val best = scored.firstOrNull() ?: return null
        if (best.distance > MAX_DISTANCE) return null

        val shared = best.shared
        val conf: WifiPosition.Confidence
        val confScore: Int
        when {
            shared >= 5 && best.distance < 18 -> {
                conf = WifiPosition.Confidence.HIGH
                confScore = (99.0 - best.distance).coerceIn(80.0, 99.0).toInt()
            }
            shared >= 3 && best.distance < 40 -> {
                conf = WifiPosition.Confidence.MEDIUM
                confScore = (79.0 - best.distance * 0.85).coerceIn(45.0, 79.0).toInt()
            }
            else -> {
                conf = WifiPosition.Confidence.LOW
                confScore = (44.0 - best.distance * 0.3).coerceIn(10.0, 44.0).toInt()
            }
        }

        return WifiPosition(
            roomId          = best.fp.roomId,
            positionLabel   = best.fp.positionLabel,
            lat             = best.fp.lat,
            lng             = best.fp.lng,
            floor           = best.fp.floor,
            confidence      = conf,
            confidenceScore = confScore,
            sharedApCount   = shared,
            visibleApCount  = currentReadings.size,
        )
    }

    private fun parseFp(obj: JsonObject): Fingerprint? {
        val id       = (obj["id"]            as? JsonPrimitive)?.contentOrNull ?: return null
        val roomId   = (obj["roomId"]         as? JsonPrimitive)?.contentOrNull ?: return null
        val posLabel = (obj["positionLabel"]  as? JsonPrimitive)?.contentOrNull ?: ""
        val lat      = (obj["lat"]            as? JsonPrimitive)?.doubleOrNull
        val lng      = (obj["lng"]            as? JsonPrimitive)?.doubleOrNull
        val floor    = (obj["floor"]          as? JsonPrimitive)?.contentOrNull?.toIntOrNull()
        val readings = (obj["readings"] as? JsonArray)?.mapNotNull { e ->
            val r     = e as? JsonObject ?: return@mapNotNull null
            val bssid = (r["bssid"] as? JsonPrimitive)?.contentOrNull?.lowercase() ?: return@mapNotNull null
            val rssi  = (r["rssi"]  as? JsonPrimitive)?.intOrNull ?: return@mapNotNull null
            Reading(bssid, rssi)
        } ?: return null
        return Fingerprint(id, roomId, posLabel, lat, lng, floor, readings)
    }
}
