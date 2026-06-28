package fi.ksykmaps.ui

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.net.wifi.WifiManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import fi.ksykmaps.data.Api
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*
import java.time.Instant

/**
 * Mobile beacon survey. Press Capture and the app:
 *   1. Triggers a fresh WiFi scan
 *   2. Pulls a high-accuracy GPS fix
 *   3. Combines them into a /api/beacons/:roomId/positions POST
 *
 * Continuously polls scanResults every 4 s so the live count is fresh.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BeaconScreen() {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()

    var rooms by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var selectedRoom by remember { mutableStateOf<JsonObject?>(null) }
    var status by remember { mutableStateOf("Pick a room, then Capture.") }
    var statusColor by remember { mutableStateOf(Color.Gray) }
    var capturing by remember { mutableStateOf(false) }

    // Live state
    var liveBssidCount by remember { mutableStateOf(0) }
    var liveLat by remember { mutableStateOf(0.0) }
    var liveLng by remember { mutableStateOf(0.0) }
    var liveAcc by remember { mutableStateOf(0.0) }

    var savedPositions by remember { mutableStateOf<List<JsonObject>>(emptyList()) }

    var roomSheetOpen by rememberSaveable { mutableStateOf(false) }

    val permLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions(),
    ) { /* recheck on capture */ }

    // Ask for perms + load rooms on first composition.
    LaunchedEffect(Unit) {
        permLauncher.launch(arrayOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_WIFI_STATE,
            Manifest.permission.CHANGE_WIFI_STATE,
            Manifest.permission.NEARBY_WIFI_DEVICES,
        ))
        try {
            val rs = withContext(Dispatchers.IO) { Api.get("/rooms") }
            rooms = rs.jsonArray.mapNotNull { it as? JsonObject }
                .sortedBy {
                    (it["roomNumber"] as? JsonPrimitive)?.contentOrNull ?: ""
                }
            status = "${rooms.size} rooms loaded · pick one"
        } catch (e: Exception) {
            status = Api.friendly(e); statusColor = Color.Red
        }
    }

    // Continuous WiFi count poller — every 4s pulls scanResults so the
    // chip on the header shows how many BSSIDs are visible right now.
    LaunchedEffect(Unit) {
        while (true) {
            try {
                @SuppressLint("MissingPermission")
                val wifi = ctx.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
                @Suppress("DEPRECATION") wifi.startScan()
                liveBssidCount = wifi.scanResults.size
            } catch (_: Exception) { /* permission not yet granted */ }
            // Best-effort fresh GPS — silent fail if perms not yet granted.
            try {
                if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION)
                    == PackageManager.PERMISSION_GRANTED) {
                    val fused = LocationServices.getFusedLocationProviderClient(ctx)
                    @SuppressLint("MissingPermission")
                    val loc = fused.lastLocation.await()
                    if (loc != null) {
                        liveLat = loc.latitude; liveLng = loc.longitude
                        liveAcc = loc.accuracy.toDouble()
                    }
                }
            } catch (_: Exception) { }
            delay(4000)
        }
    }

    suspend fun reloadPositions(roomId: String) {
        try {
            val rs = withContext(Dispatchers.IO) { Api.get("/beacons/$roomId/positions") }
            savedPositions = rs.jsonArray.mapNotNull { it as? JsonObject }
                .sortedByDescending {
                    (it["capturedAt"] as? JsonPrimitive)?.contentOrNull ?: ""
                }
        } catch (_: Exception) { savedPositions = emptyList() }
    }

    fun doCapture() {
        val room = selectedRoom ?: return run {
            status = "Pick a room first."; statusColor = Color.Red
        }
        capturing = true
        status = "Capturing GPS + WiFi…"
        statusColor = Color(0xFF2563EB)
        scope.launch {
            val roomId = (room["id"] as? JsonPrimitive)?.contentOrNull ?: return@launch
            try {
                // 1. Fresh WiFi scan
                @SuppressLint("MissingPermission")
                val wifi = ctx.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
                @Suppress("DEPRECATION") wifi.startScan()
                val scan = try { wifi.scanResults } catch (_: SecurityException) { emptyList() }
                val readings = scan.map {
                    buildJsonObject {
                        put("bssid", it.BSSID ?: "")
                        put("rssi", it.level)
                        @Suppress("DEPRECATION")
                        put("ssid", it.SSID ?: "")
                    }
                }

                // 2. Fresh high-accuracy GPS
                var lat = 0.0; var lng = 0.0; var acc = 0.0
                if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION)
                    == PackageManager.PERMISSION_GRANTED) {
                    val fused = LocationServices.getFusedLocationProviderClient(ctx)
                    @SuppressLint("MissingPermission")
                    val loc = fused.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null).await()
                    if (loc != null) {
                        lat = loc.latitude; lng = loc.longitude
                        acc = loc.accuracy.toDouble()
                    }
                }

                // 3. POST it. positionLabel auto-numbers.
                val nextIdx = savedPositions.size + 1
                val body = buildJsonObject {
                    put("positionLabel", "Auto $nextIdx (mobile)")
                    put("capturedAt", Instant.now().toString())
                    put("lat", lat); put("lng", lng); put("accuracyM", acc)
                    put("readings", JsonArray(readings))
                }
                withContext(Dispatchers.IO) {
                    Api.post("/beacons/$roomId/positions", body)
                }
                status = "Captured ${scan.size} BSSIDs · GPS ±${"%.1f".format(acc)} m"
                statusColor = Color(0xFF16A34A)
                reloadPositions(roomId)
            } catch (e: Exception) {
                status = Api.friendly(e); statusColor = Color.Red
            } finally {
                capturing = false
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Beacons", fontWeight = FontWeight.SemiBold) },
                actions = {
                    StatusChip(
                        icon = Icons.Outlined.Wifi,
                        label = "${liveBssidCount}",
                        active = liveBssidCount > 0,
                    )
                    Spacer(Modifier.width(6.dp))
                    StatusChip(
                        icon = Icons.Outlined.GpsFixed,
                        label = if (liveAcc > 0) "±${liveAcc.toInt()}m" else "—",
                        active = liveAcc in 0.01..40.0,
                    )
                    Spacer(Modifier.width(10.dp))
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { if (!capturing) doCapture() },
                expanded = true,
                containerColor = if (capturing) MaterialTheme.colorScheme.surfaceVariant
                                 else MaterialTheme.colorScheme.primary,
                contentColor = if (capturing) MaterialTheme.colorScheme.onSurfaceVariant
                               else MaterialTheme.colorScheme.onPrimary,
                icon = {
                    if (capturing) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp), strokeWidth = 2.5.dp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    } else {
                        Icon(Icons.Outlined.RadioButtonChecked, null)
                    }
                },
                text = { Text(if (capturing) "Capturing…" else "Capture") },
            )
        },
    ) { pad ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(pad)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // Room picker
            ElevatedCard(
                onClick = { roomSheetOpen = true },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
            ) {
                Row(
                    Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Icon(
                        Icons.Outlined.MeetingRoom,
                        null,
                        tint = MaterialTheme.colorScheme.primary,
                    )
                    Column(Modifier.weight(1f)) {
                        if (selectedRoom == null) {
                            Text("Pick a room", fontWeight = FontWeight.SemiBold)
                            Text(
                                "Tap to search the ${rooms.size} rooms",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        } else {
                            val r = selectedRoom!!
                            Text(
                                "Room ${(r["roomNumber"] as? JsonPrimitive)?.contentOrNull ?: "—"}",
                                fontWeight = FontWeight.SemiBold,
                            )
                            val name = (r["name"] as? JsonPrimitive)?.contentOrNull
                            if (!name.isNullOrBlank()) {
                                Text(
                                    name,
                                    fontSize = 13.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                    Icon(Icons.Outlined.KeyboardArrowDown, null)
                }
            }

            // Status line
            Card(
                Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = statusColor.copy(alpha = 0.12f),
                ),
                shape = RoundedCornerShape(12.dp),
            ) {
                Text(
                    status,
                    color = if (statusColor == Color.Gray) MaterialTheme.colorScheme.onSurfaceVariant else statusColor,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(14.dp),
                )
            }

            // Live GPS readout
            if (liveLat != 0.0) {
                Text(
                    "GPS: %.6f, %.6f · ±%.1f m".format(liveLat, liveLng, liveAcc),
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            HorizontalDivider()
            Text(
                "Saved positions (${savedPositions.size})",
                fontWeight = FontWeight.SemiBold,
            )
            LazyColumn(
                Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(bottom = 80.dp),
            ) {
                items(savedPositions) { p -> PositionRow(p) }
            }
        }
    }

    if (roomSheetOpen) {
        RoomPickerSheet(
            rooms = rooms,
            onDismiss = { roomSheetOpen = false },
            onPick = { r ->
                selectedRoom = r
                roomSheetOpen = false
                scope.launch { reloadPositions((r["id"] as? JsonPrimitive)?.contentOrNull ?: "") }
            },
        )
    }
}

@Composable
private fun StatusChip(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    active: Boolean,
) {
    val bg = if (active) Color(0xFF16A34A).copy(alpha = 0.16f) else Color.Gray.copy(alpha = 0.12f)
    val fg = if (active) Color(0xFF15803D) else Color.Gray
    Row(
        Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(bg)
            .padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, tint = fg, modifier = Modifier.size(14.dp))
        Spacer(Modifier.width(4.dp))
        Text(label, color = fg, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun PositionRow(p: JsonObject) {
    val label = (p["positionLabel"] as? JsonPrimitive)?.contentOrNull ?: "—"
    val captured = (p["capturedAt"] as? JsonPrimitive)?.contentOrNull?.take(19)?.replace("T", " ") ?: ""
    val n = (p["readings"] as? JsonArray)?.size ?: 0
    val lat = (p["lat"] as? JsonPrimitive)?.doubleOrNull
    val lng = (p["lng"] as? JsonPrimitive)?.doubleOrNull

    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(
            Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Icon(Icons.Outlined.LocationOn, null, tint = MaterialTheme.colorScheme.primary)
            Column(Modifier.weight(1f)) {
                Text(label, fontWeight = FontWeight.SemiBold)
                Text(
                    "$n BSSIDs · $captured",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (lat != null && lng != null && lat != 0.0) {
                    Text(
                        "%.6f, %.6f".format(lat, lng),
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RoomPickerSheet(
    rooms: List<JsonObject>,
    onDismiss: () -> Unit,
    onPick: (JsonObject) -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var query by remember { mutableStateOf("") }
    val filtered = remember(rooms, query) {
        val q = query.trim().lowercase()
        if (q.isEmpty()) rooms
        else rooms.filter {
            val num = (it["roomNumber"] as? JsonPrimitive)?.contentOrNull ?: ""
            val name = (it["name"] as? JsonPrimitive)?.contentOrNull ?: ""
            num.lowercase().contains(q) || name.lowercase().contains(q)
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
    ) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
            Text(
                "Pick a room",
                fontWeight = FontWeight.SemiBold,
                fontSize = 18.sp,
                modifier = Modifier.padding(vertical = 8.dp),
            )
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                placeholder = { Text("Search by number or name") },
                leadingIcon = { Icon(Icons.Outlined.Search, null) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
            )
            Spacer(Modifier.height(8.dp))
            LazyColumn(Modifier.fillMaxWidth().heightIn(max = 480.dp)) {
                items(filtered) { r ->
                    ListItem(
                        headlineContent = {
                            Text((r["roomNumber"] as? JsonPrimitive)?.contentOrNull ?: "—")
                        },
                        supportingContent = {
                            Text(
                                (r["name"] as? JsonPrimitive)?.contentOrNull ?: "",
                                fontSize = 12.sp,
                            )
                        },
                        trailingContent = {
                            Text(
                                "F${(r["floor"] as? JsonPrimitive)?.contentOrNull ?: "1"}",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        },
                        modifier = Modifier.clickable { onPick(r) },
                    )
                    HorizontalDivider()
                }
            }
        }
    }
}

