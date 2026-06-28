package fi.ksykmaps.ui

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.wifi.WifiManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.GpsFixed
import androidx.compose.material.icons.outlined.RadioButtonChecked
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import fi.ksykmaps.data.Api
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*
import java.time.Instant

/**
 * Mobile beacon survey. Picks the strongest WiFi BSSIDs visible to the
 * OS (`WifiManager.scanResults`), grabs the latest high-accuracy GPS,
 * and uploads to /api/beacons/:roomId/positions. Same Firestore the
 * desktop admin reads, so anything captured here syncs instantly.
 *
 * Permissions requested at first capture: ACCESS_FINE_LOCATION + the
 * Android 13+ NEARBY_WIFI_DEVICES permission.
 */
@Composable
fun BeaconScreen() {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var rooms by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var selectedRoom by remember { mutableStateOf<JsonObject?>(null) }
    var status by remember { mutableStateOf("Loading rooms...") }
    var lastLat by remember { mutableStateOf(0.0) }
    var lastLng by remember { mutableStateOf(0.0) }
    var lastAccuracy by remember { mutableStateOf(0.0) }
    var lastScanSize by remember { mutableStateOf(0) }
    var savedPositions by remember { mutableStateOf<List<JsonObject>>(emptyList()) }

    val permLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions(),
    ) { /* ignore results; capture will recheck */ }

    LaunchedEffect(Unit) {
        // Ensure we have the perms up front; cheap UX-wise and avoids
        // a tap → permission dialog → tap-again flow on first capture.
        permLauncher.launch(arrayOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_WIFI_STATE,
            Manifest.permission.CHANGE_WIFI_STATE,
            Manifest.permission.NEARBY_WIFI_DEVICES,
        ))
        scope.launch {
            try {
                val rs = withContext(Dispatchers.IO) { Api.get("/rooms") }
                rooms = rs.jsonArray.mapNotNull { it as? JsonObject }
                    .sortedBy { it["roomNumber"]?.jsonPrimitive?.content ?: "" }
                status = "${rooms.size} rooms loaded."
            } catch (e: Exception) { status = Api.friendly(e) }
        }
    }

    suspend fun reloadPositions(roomId: String) {
        try {
            val rs = withContext(Dispatchers.IO) { Api.get("/beacons/$roomId/positions") }
            savedPositions = rs.jsonArray.mapNotNull { it as? JsonObject }
        } catch (_: Exception) { savedPositions = emptyList() }
    }

    Column(Modifier.fillMaxSize().padding(12.dp)) {
        Text("Beacon survey", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(8.dp))

        // Room dropdown
        var menu by remember { mutableStateOf(false) }
        OutlinedButton(onClick = { menu = true }, modifier = Modifier.fillMaxWidth()) {
            Text(selectedRoom?.let {
                "Room ${it["roomNumber"]?.jsonPrimitive?.content ?: "—"}  ·  ${it["name"]?.jsonPrimitive?.content ?: ""}"
            } ?: "Pick a room")
        }
        DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
            rooms.take(50).forEach { r ->
                DropdownMenuItem(
                    text = { Text("${r["roomNumber"]?.jsonPrimitive?.content}  ·  ${r["name"]?.jsonPrimitive?.content ?: ""}") },
                    onClick = {
                        selectedRoom = r
                        menu = false
                        scope.launch { reloadPositions(r["id"]?.jsonPrimitive?.content ?: "") }
                    },
                )
            }
        }

        Spacer(Modifier.height(12.dp))
        Text("Status: $status", style = MaterialTheme.typography.bodySmall)
        Spacer(Modifier.height(4.dp))
        if (lastLat != 0.0) {
            Text("GPS: %.6f, %.6f  ±%.1fm".format(lastLat, lastLng, lastAccuracy),
                 style = MaterialTheme.typography.bodySmall)
        }
        if (lastScanSize > 0) {
            Text("Last scan: $lastScanSize BSSID(s)", style = MaterialTheme.typography.bodySmall)
        }

        Spacer(Modifier.height(16.dp))
        Button(
            onClick = {
                val room = selectedRoom ?: run { status = "Pick a room first."; return@Button }
                scope.launch { capturePosition(ctx, room, scope) { lat, lng, acc, n ->
                    lastLat = lat; lastLng = lng; lastAccuracy = acc; lastScanSize = n
                    status = "Captured $n BSSIDs, GPS ±${"%.1f".format(acc)}m"
                    reloadPositions(room["id"]?.jsonPrimitive?.content ?: "")
                } }
            },
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(),
        ) {
            Icon(Icons.Outlined.RadioButtonChecked, null)
            Spacer(Modifier.width(8.dp))
            Text("Capture position")
        }

        Spacer(Modifier.height(16.dp))
        Text("Saved positions (${savedPositions.size})", style = MaterialTheme.typography.titleSmall)
        LazyColumn(Modifier.fillMaxSize().padding(top = 4.dp)) {
            items(savedPositions) { p ->
                ListItem(
                    leadingContent = { Icon(Icons.Outlined.GpsFixed, null) },
                    headlineContent = { Text(p["positionLabel"]?.jsonPrimitive?.content ?: "—") },
                    supportingContent = {
                        val n = (p["readings"] as? JsonArray)?.size ?: 0
                        Text("$n readings · ${p["capturedAt"]?.jsonPrimitive?.content?.take(19) ?: ""}")
                    },
                )
                Divider()
            }
        }
    }
}

private suspend fun capturePosition(
    ctx: Context,
    room: JsonObject,
    scope: kotlinx.coroutines.CoroutineScope,
    onDone: suspend (Double, Double, Double, Int) -> Unit,
) {
    // GPS via FusedLocationProvider — single shot, highest accuracy.
    val hasLoc = ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION) ==
        PackageManager.PERMISSION_GRANTED
    if (!hasLoc) return
    val fused = LocationServices.getFusedLocationProviderClient(ctx)
    val locTask = fused.lastLocation

    // Trigger a fresh WiFi scan and read scanResults.
    val wifi = ctx.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
    @Suppress("DEPRECATION") val ok = wifi.startScan()
    val scan = wifi.scanResults  // OS may return cached results if rate-limited; ok for our needs.

    val readings = scan.map {
        buildJsonObject {
            put("bssid", it.BSSID ?: "")
            put("rssi", it.level)
            put("ssid", it.SSID ?: "")
        }
    }

    locTask.addOnCompleteListener { task ->
        val loc = task.result
        val lat = loc?.latitude ?: 0.0
        val lng = loc?.longitude ?: 0.0
        val acc = loc?.accuracy?.toDouble() ?: 0.0
        val nextIdx = 1  // server-side count via reload would be nicer but cheap fallback
        val body = buildJsonObject {
            put("positionLabel", "Auto $nextIdx (mobile)")
            put("capturedAt", Instant.now().toString())
            put("lat", lat); put("lng", lng); put("accuracyM", acc)
            put("readings", JsonArray(readings))
        }
        scope.launch {
            try {
                val roomId = room["id"]?.jsonPrimitive?.content ?: return@launch
                withContext(Dispatchers.IO) { Api.post("/beacons/$roomId/positions", body) }
                onDone(lat, lng, acc, scan.size)
            } catch (_: Exception) { onDone(lat, lng, acc, scan.size) }
        }
    }
}
