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
 *   IDLE    — long interval (30s). Useful when the map is just open.
 *   NAVIGATE — short interval (5s). Used when the user is actively navigating.
 *
 * The helper is designed to be shared across the app — one instance per
 * MapScreen composition. The [position] StateFlow can be collected from
 * multiple places.
 */
object WifiPositioning {

    sealed class Mode {
        object Idle : Mode()
        object Navigate : Mode()
    }

    private val _position = MutableStateFlow<WifiPosition?>(null)
    val position: StateFlow<WifiPosition?> = _position

    private val _scanCount = MutableStateFlow(0) // visible AP count
    val scanCount: StateFlow<Int> = _scanCount

    var mode: Mode = Mode.Idle

    suspend fun startScanning(ctx: Context) {
        while (true) {
            val intervalMs: Long = when (mode) {
                is Mode.Navigate -> 5_000L
                else             -> 30_000L
            }

            if (hasPermission(ctx)) {
                val readings = scanWifi(ctx)
                _scanCount.value = readings.size
                if (readings.isNotEmpty()) {
                    try {
                        val estimate = locate(readings)
                        _position.value = estimate
                    } catch (_: Exception) {
                        // Server unreachable or no fingerprints yet — keep old position
                    }
                }
            }

            delay(intervalMs)
        }
    }

    @SuppressLint("MissingPermission")
    private fun scanWifi(ctx: Context): List<JsonObject> {
        val wm = ctx.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        @Suppress("DEPRECATION")
        wm.startScan()
        @Suppress("DEPRECATION")
        return wm.scanResults.map { r ->
            buildJsonObject {
                put("bssid", r.BSSID ?: "")
                put("rssi", r.level)
                @Suppress("DEPRECATION")
                put("ssid", r.SSID ?: "")
            }
        }
    }

    private suspend fun locate(readings: List<JsonObject>): WifiPosition? =
        withContext(Dispatchers.IO) {
            val body = buildJsonObject { put("readings", JsonArray(readings)) }
            val resp = try { Api.post("/wifi/locate", body) } catch (_: Exception) { return@withContext null }
            val obj = resp as? JsonObject ?: return@withContext null

            val roomId = (obj["roomId"] as? JsonPrimitive)?.contentOrNull ?: return@withContext null
            val posLabel = (obj["positionLabel"] as? JsonPrimitive)?.contentOrNull ?: ""
            val lat = (obj["lat"] as? JsonPrimitive)?.doubleOrNull
            val lng = (obj["lng"] as? JsonPrimitive)?.doubleOrNull
            val floor = (obj["floor"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull()
            val confStr = (obj["confidence"] as? JsonPrimitive)?.contentOrNull ?: "low"
            val confScore = (obj["confidenceScore"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() ?: 0
            val sharedAp = (obj["sharedApCount"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() ?: 0

            val conf = when (confStr.lowercase()) {
                "high"   -> WifiPosition.Confidence.HIGH
                "medium" -> WifiPosition.Confidence.MEDIUM
                else     -> WifiPosition.Confidence.LOW
            }

            WifiPosition(
                roomId = roomId,
                positionLabel = posLabel,
                lat = lat,
                lng = lng,
                floor = floor,
                confidence = conf,
                confidenceScore = confScore,
                sharedApCount = sharedAp,
                visibleApCount = readings.size,
            )
        }

    private fun hasPermission(ctx: Context): Boolean =
        ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED &&
        ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_WIFI_STATE) ==
            PackageManager.PERMISSION_GRANTED
}
