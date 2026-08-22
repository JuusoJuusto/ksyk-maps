package fi.ksykmaps.ui

import kotlinx.serialization.json.*
import kotlin.math.sin
import kotlin.random.Random

/**
 * Development-only Wi-Fi positioning simulator.
 *
 * Produces synthetic scan data to exercise the positioning and smoothing
 * pipeline without physically walking through the school. Enable via
 * developer mode in Settings (never active in normal use).
 *
 * Scenarios cover the robustness cases from the product specification:
 *   STRONG_SIGNAL         — lots of strong APs, expect high confidence
 *   WEAK_SIGNAL           — few weak APs, expect low confidence / no match
 *   NO_APS                — empty scan, engine must return null gracefully
 *   WRONG_FLOOR           — APs from a floor that likely has no fingerprints
 *   RAPID_CHANGES         — heavy RSSI jitter, tests smoothing effectiveness
 *   AP_APPEARING          — new AP shows up each call, tests incremental state
 *   AP_DISAPPEARING       — APs drop out progressively, tests decay logic
 *   NOISE_HEAVY           — ±15 dBm noise on every reading
 *   COMPETING_FINGERPRINTS — overlapping signal vectors from adjacent rooms
 *
 * Usage (in dev/test code):
 *   val readings = WifiSimulator.generate(WifiSimulator.Scenario.STRONG_SIGNAL)
 *   val pos = LocalPositioning.locate(readings.map {
 *       val o = it as JsonObject
 *       LocalPositioning.Reading(
 *           bssid = (o["bssid"] as JsonPrimitive).content,
 *           rssi  = (o["rssi"]  as JsonPrimitive).int,
 *       )
 *   })
 */
object WifiSimulator {

    enum class Scenario {
        STRONG_SIGNAL,
        WEAK_SIGNAL,
        NO_APS,
        WRONG_FLOOR,
        RAPID_CHANGES,
        AP_APPEARING,
        AP_DISAPPEARING,
        NOISE_HEAVY,
        COMPETING_FINGERPRINTS,
    }

    private var callCount = 0

    /** Reset the call counter — call before starting a new simulation run. */
    fun reset() { callCount = 0 }

    /**
     * Generate a synthetic Wi-Fi scan matching [scenario].
     * [seed] is used for reproducible random jitter in tests.
     * Returns a list in the same format as WifiPositioning.scanWifi().
     */
    fun generate(scenario: Scenario, seed: Long = callCount.toLong()): List<JsonObject> {
        callCount++
        val rng = Random(seed)

        return when (scenario) {

            Scenario.STRONG_SIGNAL -> buildAps(listOf(
                "aa:bb:cc:11:22:33" to -42,
                "aa:bb:cc:44:55:66" to -47,
                "aa:bb:cc:77:88:99" to -53,
                "aa:bb:cc:aa:bb:cc" to -58,
                "aa:bb:cc:dd:ee:ff" to -61,
                "11:22:33:44:55:66" to -65,
                "11:22:33:77:88:99" to -68,
                "11:22:33:aa:bb:cc" to -72,
                "22:33:44:55:66:77" to -75,
                "22:33:44:88:99:aa" to -78,
            ), jitter = 2, rng = rng)

            Scenario.WEAK_SIGNAL -> buildAps(listOf(
                "aa:bb:cc:11:22:33" to -82,
                "aa:bb:cc:44:55:66" to -87,
                "aa:bb:cc:77:88:99" to -90,
            ), jitter = 5, rng = rng)

            Scenario.NO_APS -> emptyList()

            Scenario.WRONG_FLOOR -> buildAps(listOf(
                "ff:ee:dd:11:22:33" to -48,
                "ff:ee:dd:44:55:66" to -55,
                "ff:ee:dd:77:88:99" to -62,
                "ff:ee:dd:aa:bb:cc" to -70,
            ), jitter = 3, rng = rng)

            Scenario.RAPID_CHANGES -> buildAps(listOf(
                "aa:bb:cc:11:22:33" to (-50 + (sin(callCount * 0.8) * 20).toInt()),
                "aa:bb:cc:44:55:66" to (-60 + (sin(callCount * 1.2) * 18).toInt()),
                "aa:bb:cc:77:88:99" to (-70 + rng.nextInt(-20, 20)),
                "aa:bb:cc:aa:bb:cc" to (-75 + rng.nextInt(-15, 15)),
                "11:22:33:44:55:66" to (-80 + rng.nextInt(-10, 10)),
            ), jitter = 0, rng = rng)

            Scenario.AP_APPEARING -> {
                val base = listOf(
                    "aa:bb:cc:11:22:33" to -50,
                    "aa:bb:cc:44:55:66" to -60,
                )
                val extras = listOf(
                    "dd:ee:ff:11:22:33" to -65,
                    "dd:ee:ff:44:55:66" to -70,
                    "dd:ee:ff:77:88:99" to -75,
                    "dd:ee:ff:aa:bb:cc" to -80,
                )
                val visible = base + extras.take(minOf(callCount, extras.size))
                buildAps(visible, jitter = 3, rng = rng)
            }

            Scenario.AP_DISAPPEARING -> {
                val all = listOf(
                    "aa:bb:cc:11:22:33" to -48,
                    "aa:bb:cc:44:55:66" to -55,
                    "aa:bb:cc:77:88:99" to -62,
                    "aa:bb:cc:aa:bb:cc" to -68,
                    "11:22:33:44:55:66" to -72,
                    "11:22:33:77:88:99" to -75,
                )
                val remaining = all.dropLast(minOf(callCount, all.size - 1))
                buildAps(remaining, jitter = 3, rng = rng)
            }

            Scenario.NOISE_HEAVY -> buildAps(listOf(
                "aa:bb:cc:11:22:33" to -52,
                "aa:bb:cc:44:55:66" to -61,
                "aa:bb:cc:77:88:99" to -70,
                "aa:bb:cc:aa:bb:cc" to -74,
                "11:22:33:44:55:66" to -78,
                "11:22:33:77:88:99" to -82,
            ), jitter = 15, rng = rng)   // heavy ±15 dBm jitter

            Scenario.COMPETING_FINGERPRINTS -> buildAps(listOf(
                // Mix of APs from two similar adjacent rooms
                "aa:bb:cc:11:22:33" to -51,
                "aa:bb:cc:44:55:66" to -58,
                "bb:cc:dd:11:22:33" to -53,   // room B's primary AP
                "bb:cc:dd:44:55:66" to -60,
                "aa:bb:cc:77:88:99" to -65,
                "bb:cc:dd:77:88:99" to -67,
                "cc:dd:ee:11:22:33" to -72,
            ), jitter = 4, rng = rng)
        }
    }

    /** Human-readable description of each scenario for the debug UI. */
    fun describe(scenario: Scenario): String = when (scenario) {
        Scenario.STRONG_SIGNAL          -> "10 APs, -42 to -78 dBm — expect HIGH confidence"
        Scenario.WEAK_SIGNAL            -> "3 APs, -82 to -90 dBm — expect LOW or no match"
        Scenario.NO_APS                 -> "Empty scan — engine must return null gracefully"
        Scenario.WRONG_FLOOR            -> "Unknown BSSIDs — no fingerprint match expected"
        Scenario.RAPID_CHANGES          -> "Sinusoidal RSSI — tests smoothing effectiveness"
        Scenario.AP_APPEARING           -> "New AP added each call — tests incremental state"
        Scenario.AP_DISAPPEARING        -> "APs drop out progressively — tests decay logic"
        Scenario.NOISE_HEAVY            -> "±15 dBm noise — positioning should remain stable"
        Scenario.COMPETING_FINGERPRINTS -> "Two adjacent rooms — verify correct room wins"
    }

    private fun buildAps(
        pairs: List<Pair<String, Int>>,
        jitter: Int,
        rng: Random,
    ): List<JsonObject> = pairs.map { (bssid, rssi) ->
        val noise = if (jitter > 0) rng.nextInt(-jitter, jitter + 1) else 0
        val clamped = (rssi + noise).coerceIn(-100, -20)
        buildJsonObject {
            put("bssid", bssid)
            put("rssi", clamped)
            put("ssid", "KSYK")
        }
    }
}
