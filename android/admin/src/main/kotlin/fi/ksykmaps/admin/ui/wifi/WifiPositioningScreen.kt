package fi.ksykmaps.admin.ui.wifi

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.wifi.WifiManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import fi.ksykmaps.admin.data.AdminApi
import com.posthog.PostHog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*

private data class CoverageRoom(
    val roomId: String,
    val roomNumber: String?,
    val floor: Int?,
    val positionCount: Int,
    val avgQuality: Int,
    val qualityLabel: String,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WifiPositioningScreen() {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Coverage", "Survey", "Test Locate")

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Wi-Fi Positioning", fontWeight = FontWeight.SemiBold) })
        },
    ) { pad ->
        Column(Modifier.fillMaxSize().padding(pad)) {
            TabRow(selectedTabIndex = selectedTab) {
                tabs.forEachIndexed { i, label ->
                    Tab(selected = selectedTab == i, onClick = { selectedTab = i }, text = { Text(label) })
                }
            }
            when (selectedTab) {
                0 -> CoverageTab()
                1 -> SurveyTab()
                2 -> TestLocateTab()
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CoverageTab() {
    val scope = rememberCoroutineScope()
    var rooms by remember { mutableStateOf<List<CoverageRoom>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var refreshing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var floorFilter by remember { mutableStateOf<Int?>(null) }

    suspend fun load() = withContext(Dispatchers.IO) {
        val data = AdminApi.get("/beacons/coverage-quality")
        rooms = (data as? JsonArray)?.mapNotNull { el ->
            val o = el as? JsonObject ?: return@mapNotNull null
            CoverageRoom(
                roomId       = (o["roomId"] as? JsonPrimitive)?.contentOrNull ?: return@mapNotNull null,
                roomNumber   = (o["roomNumber"] as? JsonPrimitive)?.contentOrNull,
                floor        = (o["floor"] as? JsonPrimitive)?.intOrNull,
                positionCount = (o["positionCount"] as? JsonPrimitive)?.intOrNull ?: 0,
                avgQuality   = (o["avgQuality"] as? JsonPrimitive)?.intOrNull ?: 0,
                qualityLabel = (o["qualityLabel"] as? JsonPrimitive)?.contentOrNull ?: "none",
            )
        } ?: emptyList()
    }

    LaunchedEffect(Unit) {
        try { load() } catch (e: Exception) { error = AdminApi.friendly(e) }
        loading = false
    }

    if (loading) { Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }; return }

    val floors = rooms.mapNotNull { it.floor }.distinct().sorted()
    val displayed = if (floorFilter == null) rooms else rooms.filter { it.floor == floorFilter }
    val calibrated = displayed.count { it.positionCount > 0 }

    PullToRefreshBox(isRefreshing = refreshing, onRefresh = {
        refreshing = true
        scope.launch {
            try { load() } catch (e: Exception) { error = AdminApi.friendly(e) }
            refreshing = false
        }
    }) {
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            // Summary row
            item {
                Row(Modifier.fillMaxWidth().padding(bottom = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    SummaryChip("${displayed.size} rooms", Icons.Outlined.MeetingRoom)
                    SummaryChip("$calibrated calibrated", Icons.Outlined.CheckCircle)
                    SummaryChip("${displayed.sumOf { it.positionCount }} fingerprints", Icons.Outlined.Fingerprint)
                }
            }
            // Floor filter chips
            if (floors.size > 1) {
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        FilterChip(selected = floorFilter == null, onClick = { floorFilter = null }, label = { Text("All") })
                        floors.forEach { f ->
                            FilterChip(selected = floorFilter == f, onClick = { floorFilter = f }, label = { Text("Floor $f") })
                        }
                    }
                }
            }
            // Room list
            items(displayed) { room -> CoverageRoomRow(room) }
            // Error
            if (error != null) item {
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                    Text(error!!, Modifier.padding(12.dp), color = MaterialTheme.colorScheme.onErrorContainer)
                }
            }
        }
    }
}

@Composable
private fun SummaryChip(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Surface(shape = RoundedCornerShape(50), color = MaterialTheme.colorScheme.secondaryContainer) {
        Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSecondaryContainer)
            Spacer(Modifier.width(4.dp))
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSecondaryContainer)
        }
    }
}

@Composable
private fun CoverageRoomRow(room: CoverageRoom) {
    val (bgColor, labelText) = qualityStyle(room.qualityLabel)
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    "Room ${room.roomNumber ?: room.roomId}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                )
                Text(
                    "Floor ${room.floor ?: "?"} · ${room.positionCount} positions",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Box(
                    modifier = Modifier.clip(RoundedCornerShape(4.dp)).background(bgColor).padding(horizontal = 8.dp, vertical = 3.dp),
                ) {
                    Text(labelText, style = MaterialTheme.typography.labelSmall, color = Color.White, fontWeight = FontWeight.SemiBold)
                }
                if (room.positionCount > 0) {
                    Text("Q: ${room.avgQuality}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

private fun qualityStyle(label: String): Pair<Color, String> = when (label) {
    "excellent" -> Color(0xFF059669) to "EXCELLENT"
    "good"      -> Color(0xFF0EA5E9) to "GOOD"
    "fair"      -> Color(0xFFD97706) to "FAIR"
    "poor"      -> Color(0xFFDC2626) to "POOR"
    else        -> Color(0xFF64748B) to "NONE"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SurveyTab() {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var rooms by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var selectedRoom by remember { mutableStateOf<JsonObject?>(null) }
    var positions by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var posLabel by remember { mutableStateOf("Corner NW") }
    var wifiReadings by remember { mutableStateOf<List<Pair<String, Int>>>(emptyList()) }
    var scanning by remember { mutableStateOf(false) }
    var saving by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf<String?>(null) }
    var hasWifiPerm by remember { mutableStateOf(
        ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
    )}

    val permLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        hasWifiPerm = granted
    }

    LaunchedEffect(Unit) {
        runCatching {
            rooms = (AdminApi.get("/rooms") as? JsonArray)?.mapNotNull { it as? JsonObject } ?: emptyList()
        }
    }

    LaunchedEffect(selectedRoom) {
        val id = (selectedRoom?.get("id") as? JsonPrimitive)?.contentOrNull ?: return@LaunchedEffect
        runCatching {
            positions = withContext(Dispatchers.IO) {
                (AdminApi.get("/beacons/$id/positions") as? JsonArray)?.mapNotNull { it as? JsonObject } ?: emptyList()
            }
        }
    }

    Column(Modifier.fillMaxSize().padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        // Room selector
        var expanded by remember { mutableStateOf(false) }
        ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
            OutlinedTextField(
                value = selectedRoom?.let {
                    val rn = (it["roomNumber"] as? JsonPrimitive)?.contentOrNull ?: ""
                    val name = (it["name"] as? JsonPrimitive)?.contentOrNull ?: ""
                    "$rn${if (name.isNotBlank()) " – $name" else ""}"
                } ?: "Select room…",
                onValueChange = {},
                readOnly = true,
                label = { Text("Room") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                modifier = Modifier.menuAnchor().fillMaxWidth(),
            )
            ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                rooms.take(100).forEach { r ->
                    val rn = (r["roomNumber"] as? JsonPrimitive)?.contentOrNull ?: "?"
                    val name = (r["name"] as? JsonPrimitive)?.contentOrNull ?: ""
                    DropdownMenuItem(
                        text = { Text("$rn${if (name.isNotBlank()) " – $name" else ""}") },
                        onClick = { selectedRoom = r; expanded = false },
                    )
                }
            }
        }

        // Position label
        OutlinedTextField(
            value = posLabel,
            onValueChange = { posLabel = it },
            label = { Text("Position label (e.g. Corner NW)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )

        // Wi-Fi scan
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(
                onClick = {
                    if (!hasWifiPerm) {
                        permLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
                        return@Button
                    }
                    scanning = true
                    scope.launch {
                        delay(300)
                        val wm = ctx.getSystemService(Context.WIFI_SERVICE) as WifiManager
                        @Suppress("DEPRECATION") wm.startScan()
                        delay(2000)
                        @Suppress("DEPRECATION")
                        val results = wm.scanResults
                        wifiReadings = results.map { it.BSSID.lowercase() to it.level }
                            .sortedByDescending { it.second }
                        scanning = false
                    }
                },
                modifier = Modifier.weight(1f),
                enabled = !scanning && selectedRoom != null,
            ) {
                if (scanning) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
                else { Icon(Icons.Outlined.Wifi, null, Modifier.size(16.dp)); Spacer(Modifier.width(4.dp)); Text("Scan Wi-Fi") }
            }
            Button(
                onClick = {
                    val roomId = (selectedRoom?.get("id") as? JsonPrimitive)?.contentOrNull ?: return@Button
                    if (wifiReadings.isEmpty()) { status = "Scan Wi-Fi first"; return@Button }
                    saving = true
                    scope.launch {
                        runCatching {
                            val readingsJson = wifiReadings.joinToString(",") { (b, r) -> """{"bssid":"$b","rssi":$r}""" }
                            withContext(Dispatchers.IO) {
                                AdminApi.post(
                                    "/beacons/$roomId/positions",
                                    """{"positionLabel":"$posLabel","readings":[$readingsJson]}""",
                                )
                            }
                            // Refresh positions
                            positions = withContext(Dispatchers.IO) {
                                (AdminApi.get("/beacons/$roomId/positions") as? JsonArray)?.mapNotNull { it as? JsonObject } ?: emptyList()
                            }
                            runCatching { PostHog.capture("wifi_fingerprint_saved", properties = mapOf("access_point_count" to wifiReadings.size)) }
                            status = "Saved ${wifiReadings.size} APs at '$posLabel'"
                            wifiReadings = emptyList()
                        }.onFailure { status = "Error: ${it.message}" }
                        saving = false
                    }
                },
                modifier = Modifier.weight(1f),
                enabled = !saving && wifiReadings.isNotEmpty() && selectedRoom != null,
            ) {
                if (saving) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
                else { Icon(Icons.Outlined.Save, null, Modifier.size(16.dp)); Spacer(Modifier.width(4.dp)); Text("Save") }
            }
        }

        if (wifiReadings.isNotEmpty()) {
            Text("${wifiReadings.size} APs detected · top: ${wifiReadings.take(3).joinToString { "${it.first.takeLast(5)} ${it.second}dBm" }}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (status != null) {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
                Text(status!!, Modifier.padding(10.dp), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onPrimaryContainer)
            }
        }

        // Saved positions
        if (positions.isNotEmpty()) {
            HorizontalDivider()
            Text("Saved positions (${positions.size})", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
            LazyColumn(Modifier.fillMaxWidth().heightIn(max = 200.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                items(positions) { pos ->
                    val label = (pos["positionLabel"] as? JsonPrimitive)?.contentOrNull ?: "?"
                    val count = (pos["readings"] as? JsonArray)?.size ?: 0
                    val ts = (pos["capturedAt"] as? JsonPrimitive)?.contentOrNull?.take(16)?.replace("T", " ") ?: ""
                    Card {
                        Row(Modifier.fillMaxWidth().padding(10.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(label, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
                            Text("$count APs · $ts", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TestLocateTab() {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var scanning by remember { mutableStateOf(false) }
    var result by remember { mutableStateOf<JsonObject?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var hasWifiPerm by remember { mutableStateOf(
        ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
    )}

    val permLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        hasWifiPerm = granted
    }

    Column(
        Modifier.fillMaxSize().padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Icon(Icons.Outlined.MyLocation, null, Modifier.size(56.dp), tint = MaterialTheme.colorScheme.primary)
        Text("Position Test", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Text(
            "Scan current Wi-Fi environment and test the locate API. Useful for verifying fingerprint quality.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Button(
            onClick = {
                if (!hasWifiPerm) { permLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION); return@Button }
                scanning = true; error = null; result = null
                scope.launch {
                    runCatching {
                        val wm = ctx.getSystemService(Context.WIFI_SERVICE) as WifiManager
                        @Suppress("DEPRECATION") wm.startScan()
                        delay(2000)
                        @Suppress("DEPRECATION")
                        val readings = wm.scanResults
                        val readingsJson = readings.joinToString(",") { """{"bssid":"${it.BSSID.lowercase()}","rssi":${it.level}}""" }
                        result = withContext(Dispatchers.IO) {
                            AdminApi.post("/wifi/locate", """{"readings":[$readingsJson]}""")
                        } as? JsonObject
                        runCatching { PostHog.capture("wifi_location_test_completed", properties = mapOf("access_point_count" to readings.size, "location_found" to (result != null))) }
                    }.onFailure { error = AdminApi.friendly(it as Exception) }
                    scanning = false
                }
            },
            enabled = !scanning,
            modifier = Modifier.fillMaxWidth().height(52.dp),
        ) {
            if (scanning) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
            else { Icon(Icons.Outlined.Search, null, Modifier.size(18.dp)); Spacer(Modifier.width(6.dp)); Text("Scan & Test Location") }
        }

        result?.let { r ->
            val roomId = (r["roomId"] as? JsonPrimitive)?.contentOrNull ?: "?"
            val label = (r["positionLabel"] as? JsonPrimitive)?.contentOrNull ?: "?"
            val floor = (r["floor"] as? JsonPrimitive)?.intOrNull
            val conf = (r["confidence"] as? JsonPrimitive)?.contentOrNull ?: "?"
            val score = (r["confidenceScore"] as? JsonPrimitive)?.intOrNull ?: 0
            val sharedAps = (r["sharedApCount"] as? JsonPrimitive)?.intOrNull ?: 0
            val dist = (r["distance"] as? JsonPrimitive)?.doubleOrNull ?: 0.0

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Result", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("$roomId · $label", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimaryContainer)
                    Text("Floor: ${floor ?: "?"}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onPrimaryContainer)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Badge(containerColor = confidenceBg(conf)) { Text("$conf ($score%)", fontWeight = FontWeight.Bold) }
                        Text("$sharedAps shared APs · dist $dist", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onPrimaryContainer)
                    }
                }
            }
        }

        if (error != null) {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                Text(error!!, Modifier.padding(12.dp), color = MaterialTheme.colorScheme.onErrorContainer)
            }
        }
    }
}

private fun confidenceBg(conf: String): Color = when (conf) {
    "high"   -> Color(0xFF059669)
    "medium" -> Color(0xFFD97706)
    else     -> Color(0xFFDC2626)
}
