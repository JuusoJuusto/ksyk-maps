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
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import fi.ksykmaps.data.Analytics
import fi.ksykmaps.data.Api
import fi.ksykmaps.data.DiskCache
import fi.ksykmaps.data.Session
import com.posthog.android.PostHogAndroid
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*
import java.time.Instant

/**
 * Admin control panel — only shown when Session.isAdmin is true.
 *
 * Groups every capability that a non-admin doesn't need into one place:
 *   - Overview   → live counts (buildings / rooms / doors / fingerprints)
 *                  + a "clear map cache" button that force-refreshes on next open
 *   - Wi-Fi      → live scan + one-tap fingerprint capture (room + optional GPS)
 *                  + coverage summary from /api/beacons/coverage
 *   - Live pos   → real-time output of the positioning engine on this device
 *                  (mirrors the /wifi/locate call the map uses)
 *   - Actions    → open the desktop /builder, test push notification, sign out
 *
 * Deliberately mobile-shaped: three vertically stacked "cards" you swipe
 * between via segmented pills at the top, not a bottom tab bar. Feels
 * like Apple's iOS admin panels (Family Sharing, Screen Time), not like
 * a nav bar buried in a nav bar.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminPanelScreen(
    onSignOut: () -> Unit,
    onOpenBeaconCapture: () -> Unit,
) {
    val ctx = LocalContext.current
    LanguageState.init(ctx); val lang = LanguageState.current ?: "fi"
    val isFi = lang == "fi"
    val scope = rememberCoroutineScope()

    var selectedSection by rememberSaveableInt(0)

    Scaffold(
        containerColor = MaterialTheme.colorScheme.surface,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            if (isFi) "Hallintapaneeli" else "Admin panel",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 18.sp,
                        )
                        val email = Api.sessionEmail
                        if (email != null) {
                            Text(
                                email,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Normal,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                },
                actions = {
                    IconButton(onClick = onSignOut) {
                        Icon(
                            Icons.AutoMirrored.Outlined.Logout,
                            contentDescription = if (isFi) "Kirjaudu ulos" else "Sign out",
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
    ) { pad ->
        Column(Modifier.fillMaxSize().padding(pad)) {
            SectionPills(
                selected = selectedSection,
                onSelect = { selectedSection = it },
                labels = if (isFi)
                    listOf("Yleiskatsaus", "Aktiviteetti", "Ilmoitukset", "Wi-Fi", "Sijainti", "Käyttäjät", "Toiminnot")
                else
                    listOf("Overview", "Activity", "News", "Wi-Fi", "Live", "Users", "Actions"),
            )
            when (selectedSection) {
                0 -> AdminOverviewSection(isFi, scope)
                1 -> AdminActivitySection(isFi)
                2 -> AdminAnnouncementsSection(isFi, scope)
                3 -> AdminWifiSection(isFi, ctx, scope, onOpenBeaconCapture)
                4 -> AdminLiveSection(isFi)
                5 -> AdminUsersSection(isFi)
                6 -> AdminActionsSection(isFi, ctx, onSignOut, scope)
            }
        }
    }
}

@Composable
private fun rememberSaveableInt(default: Int) = androidx.compose.runtime.saveable.rememberSaveable {
    androidx.compose.runtime.mutableIntStateOf(default)
}

@Composable
private fun SectionPills(
    selected: Int,
    onSelect: (Int) -> Unit,
    labels: List<String>,
) {
    val scroll = rememberScrollState()
    Row(
        Modifier
            .fillMaxWidth()
            .horizontalScroll(scroll)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        labels.forEachIndexed { i, label ->
            val isSel = selected == i
            Box(
                Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(
                        if (isSel) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.surfaceContainerHigh
                    )
                    .clickable { onSelect(i) }
                    .padding(horizontal = 16.dp, vertical = 8.dp),
            ) {
                Text(
                    label,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (isSel) MaterialTheme.colorScheme.onPrimary
                            else MaterialTheme.colorScheme.onSurface,
                )
            }
        }
    }
}

// ── Overview section ──────────────────────────────────────────────────

private data class AdminStats(
    val buildings: Int,
    val rooms: Int,
    val doors: Int,
    val hallways: Int,
    val fingerprints: Int,
    val coverageRooms: Int,
    val loading: Boolean = false,
    val error: String? = null,
)

@Composable
private fun AdminOverviewSection(isFi: Boolean, scope: kotlinx.coroutines.CoroutineScope) {
    var stats by remember { mutableStateOf(AdminStats(0, 0, 0, 0, 0, 0, loading = true)) }
    var refreshTrigger by remember { mutableIntStateOf(0) }

    LaunchedEffect(refreshTrigger) {
        stats = stats.copy(loading = true, error = null)
        val newStats = withContext(Dispatchers.IO) {
            var b = 0; var r = 0; var d = 0; var h = 0; var fp = 0; var cov = 0
            var err: String? = null
            runCatching { b = Api.get("/buildings").jsonArray.size }.onFailure { err = "buildings: ${it.message}" }
            runCatching { r = Api.get("/rooms").jsonArray.size }
            runCatching { d = Api.get("/doors").jsonArray.size }
            runCatching { h = Api.get("/hallways").jsonArray.size }
            runCatching {
                val obj = Api.get("/wifi/locate").jsonObject
                fp = (obj["fingerprintCount"] as? JsonPrimitive)?.intOrNull ?: 0
            }
            runCatching {
                cov = Api.get("/beacons/coverage").jsonArray.size
            }
            AdminStats(b, r, d, h, fp, cov, loading = false, error = err)
        }
        stats = newStats
    }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        if (stats.loading) {
            item {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(MaterialTheme.colorScheme.surfaceContainerLow)
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    CircularProgressIndicator(
                        Modifier.size(16.dp),
                        strokeWidth = 2.dp,
                    )
                    Spacer(Modifier.width(12.dp))
                    Text(
                        if (isFi) "Ladataan tilastoja…" else "Loading stats…",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                    )
                }
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatTile(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Outlined.Business,
                    value = stats.buildings.toString(),
                    label = if (isFi) "Rakennukset" else "Buildings",
                    color = Color(0xFF3B82F6),
                )
                StatTile(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Outlined.MeetingRoom,
                    value = stats.rooms.toString(),
                    label = if (isFi) "Luokat" else "Rooms",
                    color = Color(0xFF10B981),
                )
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatTile(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Outlined.DoorFront,
                    value = stats.doors.toString(),
                    label = if (isFi) "Ovet" else "Doors",
                    color = Color(0xFFF59E0B),
                )
                StatTile(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Outlined.LinearScale,
                    value = stats.hallways.toString(),
                    label = if (isFi) "Käytävät" else "Hallways",
                    color = Color(0xFFEC4899),
                )
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatTile(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Outlined.Wifi,
                    value = stats.fingerprints.toString(),
                    label = if (isFi) "Sormenjäljet" else "Fingerprints",
                    color = Color(0xFF8B5CF6),
                )
                StatTile(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Outlined.GpsFixed,
                    value = stats.coverageRooms.toString(),
                    label = if (isFi) "Peitto" else "Coverage",
                    color = Color(0xFF06B6D4),
                )
            }
        }
        if (stats.error != null) {
            item {
                Text(
                    "⚠ ${stats.error}",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }
        item {
            Button(
                onClick = { refreshTrigger++ },
                enabled = !stats.loading,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(14.dp),
            ) {
                Icon(Icons.Outlined.Refresh, null, Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text(
                    if (isFi) "Päivitä tilastot" else "Refresh stats",
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
        item { Spacer(Modifier.height(8.dp)) }
    }
}

@Composable
private fun StatTile(
    modifier: Modifier,
    icon: ImageVector,
    value: String,
    label: String,
    color: Color,
) {
    Column(
        modifier
            .clip(RoundedCornerShape(18.dp))
            .background(MaterialTheme.colorScheme.surfaceContainerLow)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(
            Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(color.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, null, tint = color, modifier = Modifier.size(20.dp))
        }
        Text(
            value,
            fontSize = 26.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Text(
            label,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

// ── Wi-Fi section ─────────────────────────────────────────────────────

@Composable
private fun AdminWifiSection(
    isFi: Boolean,
    ctx: Context,
    scope: kotlinx.coroutines.CoroutineScope,
    onOpenBeaconCapture: () -> Unit,
) {
    var scanCount by remember { mutableIntStateOf(0) }
    var topAps by remember { mutableStateOf<List<Triple<String, String, Int>>>(emptyList()) }
    var scanning by remember { mutableStateOf(false) }
    var hasPermission by remember {
        mutableStateOf(ContextCompat.checkSelfPermission(
            ctx, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED)
    }
    // "Where am I?" combined WiFi + GPS room detection
    var whereAmI by remember { mutableStateOf<WhereAmIResult?>(null) }
    var detecting by remember { mutableStateOf(false) }

    val permLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions(),
    ) { grants ->
        hasPermission = grants[Manifest.permission.ACCESS_FINE_LOCATION] == true
    }

    fun triggerScan() {
        if (!hasPermission) {
            permLauncher.launch(arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_WIFI_STATE,
            ))
            return
        }
        scanning = true
        scope.launch {
            val results = withContext(Dispatchers.IO) { scanNowForAdmin(ctx) }
            scanCount = results.size
            topAps = results
                .sortedByDescending { it.third }
                .take(6)
            scanning = false
        }
    }

    fun triggerWhereAmI() {
        if (!hasPermission) {
            permLauncher.launch(arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_WIFI_STATE,
            ))
            return
        }
        detecting = true
        scope.launch {
            whereAmI = withContext(Dispatchers.IO) { detectWhereAmI(ctx) }
            detecting = false
        }
    }

    LaunchedEffect(Unit) { if (hasPermission) triggerScan() }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        // ── Where am I? — combined WiFi + GPS room detection ──
        item {
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(18.dp))
                    .background(Color(0xFF06B6D4).copy(alpha = 0.12f))
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF06B6D4).copy(alpha = 0.25f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            Icons.Outlined.GpsFixed, null,
                            tint = Color(0xFF0891B2),
                            modifier = Modifier.size(22.dp),
                        )
                    }
                    Spacer(Modifier.width(14.dp))
                    Column(Modifier.weight(1f)) {
                        Text(
                            if (isFi) "Missä olen?" else "Where am I?",
                            fontWeight = FontWeight.SemiBold, fontSize = 16.sp,
                        )
                        Text(
                            if (isFi)
                                "Tunnistaa nykyisen huoneesi Wi-Fi:n ja GPS:n perusteella"
                            else
                                "Detects your current room from Wi-Fi + GPS",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    if (detecting) {
                        CircularProgressIndicator(
                            Modifier.size(20.dp),
                            strokeWidth = 2.dp,
                            color = Color(0xFF0891B2),
                        )
                    }
                }
                whereAmI?.let { r ->
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(MaterialTheme.colorScheme.surface)
                            .padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        if (r.roomLabel != null) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Outlined.MeetingRoom, null,
                                     tint = Color(0xFF0891B2), modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Column {
                                    Text(
                                        r.roomLabel,
                                        fontWeight = FontWeight.Bold, fontSize = 16.sp,
                                    )
                                    if (r.floor != null) {
                                        Text(
                                            (if (isFi) "Kerros " else "Floor ") + r.floor +
                                                    (if (r.confidence != null) " · ${r.confidence}%" else ""),
                                            fontSize = 12.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }
                        } else {
                            Text(
                                if (isFi) "Ei tunnistettu — tarvitaan lisää sormenjälkiä."
                                else "Not identified — need more fingerprints.",
                                fontSize = 13.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        if (r.lat != null && r.lng != null) {
                            Text(
                                "GPS: %.5f, %.5f".format(r.lat, r.lng) +
                                        (r.accuracyM?.let { " · ±${it.toInt()} m" } ?: ""),
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Text(
                            "Wi-Fi: ${r.wifiApCount} APs" +
                                    (r.matchedApCount?.let { " · matched $it" } ?: ""),
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                Button(
                    onClick = { triggerWhereAmI() },
                    enabled = !detecting,
                    modifier = Modifier.fillMaxWidth().height(46.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0891B2)),
                ) {
                    Icon(Icons.Outlined.MyLocation, null, Modifier.size(18.dp), tint = Color.White)
                    Spacer(Modifier.width(8.dp))
                    Text(
                        if (isFi) "Tunnista nykyinen huone" else "Detect current room",
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White,
                    )
                }
            }
        }

        item {
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(18.dp))
                    .background(MaterialTheme.colorScheme.surfaceContainerLow)
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF8B5CF6).copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            Icons.Outlined.Wifi, null,
                            tint = Color(0xFF8B5CF6),
                            modifier = Modifier.size(22.dp),
                        )
                    }
                    Spacer(Modifier.width(14.dp))
                    Column(Modifier.weight(1f)) {
                        Text(
                            if (isFi) "Live-skannaus" else "Live scan",
                            fontWeight = FontWeight.SemiBold, fontSize = 16.sp,
                        )
                        Text(
                            if (!hasPermission)
                                (if (isFi) "Anna sijaintilupa aloittaaksesi"
                                 else "Grant location permission to start")
                            else "$scanCount " + (if (isFi) "tukiasemaa näkyvissä" else "APs visible"),
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    if (scanning) {
                        CircularProgressIndicator(
                            Modifier.size(20.dp),
                            strokeWidth = 2.dp,
                        )
                    }
                }
                Button(
                    onClick = { triggerScan() },
                    enabled = !scanning,
                    modifier = Modifier.fillMaxWidth().height(46.dp),
                    shape = RoundedCornerShape(12.dp),
                ) {
                    Icon(Icons.Outlined.Refresh, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(
                        if (isFi) "Skannaa uudelleen" else "Rescan",
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }

        if (topAps.isNotEmpty()) {
            item {
                Text(
                    if (isFi) "Vahvimmat signaalit" else "Strongest signals",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(start = 4.dp, top = 4.dp),
                )
            }
            items(topAps) { ap ->
                ApRow(ssid = ap.first, bssid = ap.second, rssi = ap.third)
            }
        }

        item {
            // Route to the dedicated fingerprint-capture screen (BeaconScreen).
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(18.dp))
                    .background(MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.6f))
                    .clickable { onOpenBeaconCapture() }
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Outlined.AddLocationAlt, null,
                        tint = MaterialTheme.colorScheme.onPrimaryContainer,
                        modifier = Modifier.size(24.dp),
                    )
                    Spacer(Modifier.width(12.dp))
                    Text(
                        if (isFi) "Kaappaa sormenjälki" else "Capture fingerprint",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                    )
                }
                Text(
                    if (isFi)
                        "Kävele huoneeseen, valitse se listasta, ja tallenna nykyinen Wi-Fi- ja GPS-lukema. Näin karttapositiointi paranee."
                    else
                        "Walk into a room, select it, and save the current Wi-Fi + GPS snapshot. This is what improves map positioning.",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f),
                )
            }
        }
        item { Spacer(Modifier.height(8.dp)) }
    }
}

@Composable
private fun ApRow(ssid: String, bssid: String, rssi: Int) {
    val strength = when {
        rssi > -55 -> 4
        rssi > -70 -> 3
        rssi > -80 -> 2
        else -> 1
    }
    val color = when (strength) {
        4 -> Color(0xFF10B981)
        3 -> Color(0xFF3B82F6)
        2 -> Color(0xFFF59E0B)
        else -> Color(0xFFEF4444)
    }
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surfaceContainerLow)
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(28.dp)
                .clip(CircleShape)
                .background(color.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Outlined.Wifi, null, tint = color, modifier = Modifier.size(16.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(
                ssid.ifBlank { "<hidden>" },
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                bssid,
                fontSize = 10.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Text(
            "$rssi dBm",
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = color,
        )
    }
}

// ── Live positioning section ──────────────────────────────────────────

@Composable
private fun AdminLiveSection(isFi: Boolean) {
    val position by WifiPositioning.position.collectAsState()
    val scanCount by WifiPositioning.scanCount.collectAsState()

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(18.dp))
                    .background(MaterialTheme.colorScheme.surfaceContainerLow)
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Outlined.GpsFixed, null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(22.dp),
                    )
                    Spacer(Modifier.width(10.dp))
                    Text(
                        if (isFi) "Nykyinen sijainti" else "Live position",
                        fontWeight = FontWeight.SemiBold, fontSize = 16.sp,
                    )
                }
                if (position == null) {
                    Text(
                        if (isFi)
                            "Sijaintia ei vielä arvioitu. Avaa Kartta-välilehti, jotta skannauskierros käynnistyy."
                        else
                            "No estimate yet. Open the Map tab so the scan loop starts.",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                } else {
                    LiveDetail(
                        label = if (isFi) "Sijainti" else "Location",
                        value = position!!.positionLabel.ifBlank { "—" },
                    )
                    LiveDetail(
                        label = if (isFi) "Huone-ID" else "Room ID",
                        value = position!!.roomId,
                    )
                    LiveDetail(
                        label = if (isFi) "Kerros" else "Floor",
                        value = position!!.floor?.toString() ?: "—",
                    )
                    val confColor = when (position!!.confidence) {
                        WifiPosition.Confidence.HIGH -> Color(0xFF10B981)
                        WifiPosition.Confidence.MEDIUM -> Color(0xFFF59E0B)
                        else -> Color(0xFFEF4444)
                    }
                    LiveDetail(
                        label = if (isFi) "Varmuus" else "Confidence",
                        value = "${position!!.confidence.name} · ${position!!.confidenceScore}%",
                        valueColor = confColor,
                    )
                    LiveDetail(
                        label = if (isFi) "Yhteiset AP:t" else "Matched APs",
                        value = "${position!!.sharedApCount} / ${position!!.visibleApCount}",
                    )
                    if (position!!.lat != null && position!!.lng != null) {
                        LiveDetail(
                            label = "GPS",
                            value = "%.6f, %.6f".format(position!!.lat, position!!.lng),
                        )
                    }
                }
            }
        }
        item {
            Text(
                (if (isFi) "Skannauskierroksia: " else "Scan cycles: ") + scanCount,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 4.dp),
            )
        }
        item { Spacer(Modifier.height(8.dp)) }
    }
}

@Composable
private fun LiveDetail(
    label: String,
    value: String,
    valueColor: Color = MaterialTheme.colorScheme.onSurface,
) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top,
    ) {
        Text(
            label,
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontWeight = FontWeight.Medium,
        )
        Text(
            value,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = valueColor,
            modifier = Modifier.padding(start = 12.dp),
        )
    }
}

// ── Actions section ───────────────────────────────────────────────────

@Composable
private fun AdminActionsSection(
    isFi: Boolean,
    ctx: Context,
    onSignOut: () -> Unit,
    scope: kotlinx.coroutines.CoroutineScope,
) {
    var cacheBytes by remember { mutableStateOf(DiskCache.sizeBytes()) }
    var clearing by remember { mutableStateOf(false) }
    var refreshingCdn by remember { mutableStateOf(false) }
    var lastAction by remember { mutableStateOf<String?>(null) }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            ActionCard(
                icon = Icons.Outlined.Public,
                iconColor = Color(0xFF06B6D4),
                title = if (isFi) "Avaa web-rakennin" else "Open web builder",
                subtitle = if (isFi) "Muokkaa polygonipohjaisia rakennuksia ja huoneita"
                           else "Edit polygon buildings and rooms",
                actionText = if (isFi) "Avaa" else "Open",
                onAction = {
                    try {
                        ctx.startActivity(
                            android.content.Intent(
                                android.content.Intent.ACTION_VIEW,
                                android.net.Uri.parse("https://ksykmaps.fi/builder"),
                            )
                        )
                    } catch (_: Exception) {}
                },
            )
        }
        item {
            ActionCard(
                icon = Icons.Outlined.Dashboard,
                iconColor = Color(0xFF3B82F6),
                title = if (isFi) "Avaa hallintapaneeli" else "Open web admin",
                subtitle = if (isFi) "Kaikki työpöytäominaisuudet selaimessa"
                           else "Full desktop admin dashboard",
                actionText = if (isFi) "Avaa" else "Open",
                onAction = {
                    try {
                        ctx.startActivity(
                            android.content.Intent(
                                android.content.Intent.ACTION_VIEW,
                                android.net.Uri.parse("https://ksykmaps.fi/admin"),
                            )
                        )
                    } catch (_: Exception) {}
                },
            )
        }
        item {
            ActionCard(
                icon = Icons.Outlined.Refresh,
                iconColor = Color(0xFFF59E0B),
                title = if (isFi) "Päivitä välimuisti" else "Force refresh cache",
                subtitle = if (isFi) "Tyhjennä levyvälimuisti ja hae tuoreet tiedot"
                           else "Clear disk cache and fetch fresh data",
                actionText = when {
                    clearing || refreshingCdn -> if (isFi) "…" else "…"
                    else -> if (isFi) "Päivitä" else "Refresh"
                },
                actionEnabled = !clearing && !refreshingCdn,
                onAction = {
                    clearing = true
                    DiskCache.clear()
                    cacheBytes = 0L
                    clearing = false
                    refreshingCdn = true
                    scope.launch {
                        withContext(Dispatchers.IO) {
                            runCatching { Api.get("/buildings") }
                            runCatching { Api.get("/rooms") }
                            runCatching { Api.get("/doors") }
                            runCatching { Api.get("/hallways") }
                        }
                        refreshingCdn = false
                        lastAction = if (isFi) "Välimuisti päivitetty" else "Cache refreshed"
                    }
                },
            )
            if (cacheBytes > 0L) {
                Spacer(Modifier.height(4.dp))
                Text(
                    (if (isFi) "Nykyinen välimuisti: " else "Current cache: ") + formatBytesAdmin(cacheBytes),
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 4.dp),
                )
            }
        }
        item {
            ActionCard(
                icon = Icons.Outlined.NotificationsActive,
                iconColor = Color(0xFF10B981),
                title = if (isFi) "Testaa push-ilmoitus" else "Test push notification",
                subtitle = if (isFi) "Varmista että ilmoitukset toimivat tällä laitteella"
                           else "Verify notifications work on this device",
                actionText = if (isFi) "Lähetä" else "Send",
                onAction = {
                    try { sendTestNotification(ctx, isFi) } catch (_: Exception) {}
                    lastAction = if (isFi) "Testi-ilmoitus lähetetty" else "Test notification sent"
                },
            )
        }
        if (lastAction != null) {
            item {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFF10B981).copy(alpha = 0.15f))
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Outlined.CheckCircle, null,
                        tint = Color(0xFF10B981),
                        modifier = Modifier.size(18.dp),
                    )
                    Spacer(Modifier.width(10.dp))
                    Text(
                        lastAction!!,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF10B981),
                    )
                }
            }
        }
        item {
            Spacer(Modifier.height(4.dp))
            OutlinedButton(
                onClick = onSignOut,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(14.dp),
                border = androidx.compose.foundation.BorderStroke(
                    1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.5f)
                ),
            ) {
                Icon(
                    Icons.AutoMirrored.Outlined.Logout, null,
                    tint = MaterialTheme.colorScheme.error,
                    modifier = Modifier.size(18.dp),
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    if (isFi) "Kirjaudu ulos" else "Sign out",
                    color = MaterialTheme.colorScheme.error,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
        item { Spacer(Modifier.height(16.dp)) }
    }
}

@Composable
private fun ActionCard(
    icon: ImageVector,
    iconColor: Color,
    title: String,
    subtitle: String,
    actionText: String,
    actionEnabled: Boolean = true,
    onAction: () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surfaceContainerLow)
            .clickable(enabled = actionEnabled, onClick = onAction)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(iconColor.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, null, tint = iconColor, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(
                title,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                subtitle,
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = 14.sp,
            )
        }
        FilledTonalButton(
            onClick = onAction,
            enabled = actionEnabled,
            shape = RoundedCornerShape(20.dp),
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
        ) {
            Text(actionText, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

// ── Announcements section ─────────────────────────────────────────────

@Composable
private fun AdminAnnouncementsSection(
    isFi: Boolean,
    scope: kotlinx.coroutines.CoroutineScope,
) {
    var title by remember { mutableStateOf("") }
    var body by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("info") }
    var posting by remember { mutableStateOf(false) }
    var toast by remember { mutableStateOf<String?>(null) }
    var recent by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var refreshTrigger by remember { mutableIntStateOf(0) }

    LaunchedEffect(refreshTrigger) {
        withContext(Dispatchers.IO) {
            runCatching {
                val arr = Api.get("/announcements?limit=15").jsonArray
                recent = arr.mapNotNull { it as? JsonObject }
            }
        }
    }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(18.dp))
                    .background(MaterialTheme.colorScheme.surfaceContainerLow)
                    .padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Outlined.Campaign, null,
                        tint = Color(0xFF3B82F6),
                        modifier = Modifier.size(22.dp),
                    )
                    Spacer(Modifier.width(10.dp))
                    Text(
                        if (isFi) "Uusi ilmoitus" else "New announcement",
                        fontWeight = FontWeight.SemiBold, fontSize = 16.sp,
                    )
                }
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text(if (isFi) "Otsikko" else "Title") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(10.dp),
                )
                OutlinedTextField(
                    value = body,
                    onValueChange = { body = it },
                    label = { Text(if (isFi) "Sisältö" else "Body") },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 96.dp),
                    shape = RoundedCornerShape(10.dp),
                    minLines = 3,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("info" to Color(0xFF3B82F6),
                           "warning" to Color(0xFFF59E0B),
                           "urgent" to Color(0xFFEF4444),
                           "event" to Color(0xFF8B5CF6)).forEach { (t, c) ->
                        val label = when (t) {
                            "info" -> if (isFi) "Tieto" else "Info"
                            "warning" -> if (isFi) "Varoitus" else "Warning"
                            "urgent" -> if (isFi) "Kiireellinen" else "Urgent"
                            else -> if (isFi) "Tapahtuma" else "Event"
                        }
                        val isSel = type == t
                        Box(
                            Modifier
                                .clip(RoundedCornerShape(14.dp))
                                .background(if (isSel) c else c.copy(alpha = 0.12f))
                                .clickable { type = t }
                                .padding(horizontal = 12.dp, vertical = 6.dp),
                        ) {
                            Text(
                                label,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = if (isSel) Color.White else c,
                            )
                        }
                    }
                }
                Button(
                    onClick = {
                        if (title.isBlank() || body.isBlank()) return@Button
                        posting = true; toast = null
                        scope.launch {
                            val ok = withContext(Dispatchers.IO) {
                                runCatching {
                                    Api.post("/announcements", buildJsonObject {
                                        put("title", title.trim())
                                        put("content", body.trim())
                                        put("type", type)
                                        put("active", true)
                                    })
                                }.isSuccess
                            }
                            posting = false
                            if (ok) {
                                runCatching { PostHogAndroid.getInstance().capture("admin_announcement_published", mapOf("announcement_type" to type)) }
                                toast = if (isFi) "Ilmoitus julkaistu" else "Announcement posted"
                                title = ""; body = ""; type = "info"
                                refreshTrigger++
                            } else {
                                toast = if (isFi) "Julkaisu epäonnistui" else "Failed to post"
                            }
                        }
                    },
                    enabled = !posting && title.isNotBlank() && body.isNotBlank(),
                    modifier = Modifier.fillMaxWidth().height(46.dp),
                    shape = RoundedCornerShape(12.dp),
                ) {
                    if (posting) {
                        CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp, color = Color.White)
                        Spacer(Modifier.width(10.dp))
                    } else {
                        Icon(Icons.Outlined.Send, null, Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                    }
                    Text(
                        if (isFi) "Julkaise" else "Publish",
                        fontWeight = FontWeight.SemiBold,
                    )
                }
                toast?.let {
                    Text(
                        it,
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }
        item {
            Text(
                if (isFi) "Viimeisimmät" else "Recent",
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.padding(start = 4.dp, top = 4.dp),
            )
        }
        if (recent.isEmpty()) {
            item {
                Text(
                    if (isFi) "Ei ilmoituksia." else "No announcements yet.",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(4.dp),
                )
            }
        }
        items(recent) { a ->
            val ttl = (a["title"] as? JsonPrimitive)?.contentOrNull ?: ""
            val bod = (a["content"] as? JsonPrimitive)?.contentOrNull
                ?: (a["body"] as? JsonPrimitive)?.contentOrNull ?: ""
            val tpe = (a["type"] as? JsonPrimitive)?.contentOrNull ?: "info"
            val accent = when (tpe.lowercase()) {
                "urgent" -> Color(0xFFEF4444)
                "warning" -> Color(0xFFF59E0B)
                "event" -> Color(0xFF8B5CF6)
                else -> Color(0xFF3B82F6)
            }
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(MaterialTheme.colorScheme.surfaceContainerLow)
                    .padding(14.dp),
                verticalAlignment = Alignment.Top,
            ) {
                Box(
                    Modifier
                        .size(width = 4.dp, height = 40.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(accent)
                )
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        ttl,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    if (bod.isNotBlank()) {
                        Text(
                            bod.take(120),
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 3,
                        )
                    }
                }
            }
        }
        item { Spacer(Modifier.height(12.dp)) }
    }
}

// ── Users section ─────────────────────────────────────────────────────

@Composable
private fun AdminUsersSection(isFi: Boolean) {
    var users by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var refreshTrigger by remember { mutableIntStateOf(0) }

    LaunchedEffect(refreshTrigger) {
        loading = true; error = null
        withContext(Dispatchers.IO) {
            runCatching {
                val arr = Api.get("/users").jsonArray
                users = arr.mapNotNull { it as? JsonObject }
            }.onFailure { error = it.message ?: "load failed" }
        }
        loading = false
    }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    (if (isFi) "Käyttäjät · " else "Users · ") + users.size,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f),
                )
                IconButton(onClick = { refreshTrigger++ }) {
                    Icon(Icons.Outlined.Refresh, null, tint = MaterialTheme.colorScheme.primary)
                }
            }
        }
        if (loading) {
            item {
                Row(
                    Modifier.fillMaxWidth().padding(20.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                }
            }
        }
        if (error != null) {
            item {
                Text(
                    "⚠ $error",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.error,
                )
            }
        }
        items(users) { u ->
            val email = (u["email"] as? JsonPrimitive)?.contentOrNull ?: "—"
            val name = (u["name"] as? JsonPrimitive)?.contentOrNull ?: ""
            val role = (u["role"] as? JsonPrimitive)?.contentOrNull ?: "user"
            val roleColor = when (role.lowercase()) {
                "admin", "superadmin", "owner" -> Color(0xFF10B981)
                "moderator" -> Color(0xFF8B5CF6)
                else -> Color(0xFF64748B)
            }
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(MaterialTheme.colorScheme.surfaceContainerLow)
                    .padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .background(roleColor.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        email.take(1).uppercase(),
                        fontWeight = FontWeight.Bold,
                        color = roleColor,
                    )
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        if (name.isNotBlank()) name else email,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Text(
                        email,
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Box(
                    Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(roleColor.copy(alpha = 0.15f))
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                ) {
                    Text(
                        role,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = roleColor,
                    )
                }
            }
        }
        item { Spacer(Modifier.height(12.dp)) }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────

data class WhereAmIResult(
    val roomLabel: String?,
    val floor: Int?,
    val confidence: Int?,
    val lat: Double?,
    val lng: Double?,
    val accuracyM: Double?,
    val wifiApCount: Int,
    val matchedApCount: Int?,
)

@SuppressLint("MissingPermission")
private suspend fun detectWhereAmI(ctx: Context): WhereAmIResult {
    // Step 1: WiFi scan
    val readings = scanNowForAdmin(ctx)
    val wifiApCount = readings.size

    // Step 2: GPS fix (best-effort — non-blocking)
    var lat: Double? = null; var lng: Double? = null; var acc: Double? = null
    try {
        val fused = com.google.android.gms.location.LocationServices.getFusedLocationProviderClient(ctx)
        val loc: android.location.Location? = kotlinx.coroutines.withTimeoutOrNull(4000) {
            fused.getCurrentLocation(
                com.google.android.gms.location.Priority.PRIORITY_HIGH_ACCURACY,
                null,
            ).await()
        }
        if (loc != null) { lat = loc.latitude; lng = loc.longitude; acc = loc.accuracy.toDouble() }
    } catch (_: Exception) {}

    // Step 3: Send to /api/wifi/locate for room match
    var roomLabel: String? = null; var floor: Int? = null; var conf: Int? = null; var matched: Int? = null
    try {
        val body = buildJsonObject {
            put("readings", JsonArray(readings.map { (ssid, bssid, rssi) ->
                buildJsonObject {
                    put("bssid", bssid)
                    put("rssi", rssi)
                    put("ssid", ssid)
                }
            }))
            if (lat != null && lng != null) {
                put("lat", lat!!)
                put("lng", lng!!)
            }
        }
        val resp = withContext(Dispatchers.IO) { Api.post("/wifi/locate", body) }
        val obj = resp as? JsonObject
        val posLabel = (obj?.get("positionLabel") as? JsonPrimitive)?.contentOrNull
        val roomId = (obj?.get("roomId") as? JsonPrimitive)?.contentOrNull
        val f = (obj?.get("floor") as? JsonPrimitive)?.contentOrNull?.toIntOrNull()
        val c = (obj?.get("confidenceScore") as? JsonPrimitive)?.contentOrNull?.toIntOrNull()
        val shared = (obj?.get("sharedApCount") as? JsonPrimitive)?.contentOrNull?.toIntOrNull()
        // Enrich with the room name/number from /api/rooms
        val prettyName = if (roomId != null) {
            try {
                val rooms = withContext(Dispatchers.IO) { Api.get("/rooms") }.jsonArray
                    .mapNotNull { it as? JsonObject }
                val room = rooms.firstOrNull { (it["id"] as? JsonPrimitive)?.contentOrNull == roomId }
                val num = (room?.get("roomNumber") as? JsonPrimitive)?.contentOrNull
                val name = (room?.get("name") as? JsonPrimitive)?.contentOrNull
                listOfNotNull(num, name).joinToString(" ").ifBlank { posLabel ?: roomId }
            } catch (_: Exception) { posLabel ?: roomId }
        } else posLabel
        roomLabel = prettyName
        floor = f
        conf = c
        matched = shared
    } catch (_: Exception) {}

    return WhereAmIResult(
        roomLabel = roomLabel,
        floor = floor,
        confidence = conf,
        lat = lat,
        lng = lng,
        accuracyM = acc,
        wifiApCount = wifiApCount,
        matchedApCount = matched,
    )
}

@SuppressLint("MissingPermission")
private fun scanNowForAdmin(ctx: Context): List<Triple<String, String, Int>> {
    return try {
        val wm = ctx.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        @Suppress("DEPRECATION")
        wm.startScan()
        @Suppress("DEPRECATION")
        wm.scanResults.map { r ->
            @Suppress("DEPRECATION")
            Triple(r.SSID ?: "", r.BSSID ?: "", r.level)
        }
    } catch (_: Exception) { emptyList() }
}

private fun formatBytesAdmin(b: Long): String = when {
    b < 1024 -> "$b B"
    b < 1024 * 1024 -> "%.1f KB".format(b / 1024.0)
    else -> "%.1f MB".format(b / (1024.0 * 1024.0))
}

// ── Activity / analytics section ──────────────────────────────────────
// Streams unified activity feed from /api/admin/activity plus headline
// stats from /api/admin/activity/live-stats. Filters by source (web /
// android / server) and log level. Auto-refreshes every 15 s while the
// tab is visible.

private data class ActivityRow(
    val id: String,
    val ts: String,
    val kind: String,
    val level: String,
    val source: String,
    val message: String,
    val url: String,
)

private data class ActivityStats(
    val pageviews24h: Int,
    val pageviewsLastHour: Int,
    val errors24h: Int,
    val topScreens: List<Pair<String, Int>>,
    val bySource: Map<String, Int>,
)

@Composable
private fun AdminActivitySection(isFi: Boolean) {
    var rows by remember { mutableStateOf<List<ActivityRow>>(emptyList()) }
    var stats by remember { mutableStateOf<ActivityStats?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var sourceFilter by remember { mutableStateOf<String?>(null) } // null = all
    var levelFilter by remember { mutableStateOf<String?>(null) }
    var refreshTick by remember { mutableIntStateOf(0) }

    LaunchedEffect(refreshTick, sourceFilter, levelFilter) {
        loading = true
        val fetched = withContext(Dispatchers.IO) {
            val qs = buildString {
                append("?limit=300")
                sourceFilter?.let { append("&source=$it") }
                levelFilter?.let { append("&level=$it") }
            }
            val rowsResult = runCatching {
                val obj = Api.get("/admin/activity$qs").jsonObject
                val arr = obj["rows"]?.jsonArray ?: JsonArray(emptyList())
                arr.mapNotNull { el ->
                    val o = el as? JsonObject ?: return@mapNotNull null
                    ActivityRow(
                        id = (o["id"] as? JsonPrimitive)?.contentOrNull ?: return@mapNotNull null,
                        ts = (o["ts"] as? JsonPrimitive)?.contentOrNull ?: "",
                        kind = (o["kind"] as? JsonPrimitive)?.contentOrNull ?: "",
                        level = (o["level"] as? JsonPrimitive)?.contentOrNull ?: "info",
                        source = (o["source"] as? JsonPrimitive)?.contentOrNull ?: "",
                        message = (o["message"] as? JsonPrimitive)?.contentOrNull ?: "",
                        url = (o["url"] as? JsonPrimitive)?.contentOrNull ?: "",
                    )
                }
            }
            val statsResult = runCatching {
                val o = Api.get("/admin/activity/live-stats").jsonObject
                val topArr = o["topScreens"]?.jsonArray ?: JsonArray(emptyList())
                val top = topArr.mapNotNull { el ->
                    val ob = el as? JsonObject ?: return@mapNotNull null
                    val u = (ob["url"] as? JsonPrimitive)?.contentOrNull ?: return@mapNotNull null
                    val c = (ob["count"] as? JsonPrimitive)?.intOrNull ?: 0
                    u to c
                }
                val by = (o["bySource"] as? JsonObject)?.mapValues {
                    (it.value as? JsonPrimitive)?.intOrNull ?: 0
                } ?: emptyMap()
                ActivityStats(
                    pageviews24h = (o["pageviews24h"] as? JsonPrimitive)?.intOrNull ?: 0,
                    pageviewsLastHour = (o["pageviewsLastHour"] as? JsonPrimitive)?.intOrNull ?: 0,
                    errors24h = (o["errors24h"] as? JsonPrimitive)?.intOrNull ?: 0,
                    topScreens = top,
                    bySource = by,
                )
            }
            rowsResult to statsResult
        }
        fetched.first.onSuccess { rows = it; error = null }
            .onFailure { error = it.message }
        fetched.second.onSuccess { stats = it }
        loading = false
    }

    // Auto-refresh every 15 s.
    LaunchedEffect(Unit) {
        while (true) {
            kotlinx.coroutines.delay(15_000)
            refreshTick++
        }
    }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatTile(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Outlined.Visibility,
                    label = if (isFi) "24h katselut" else "Views 24h",
                    value = stats?.pageviews24h?.toString() ?: "…",
                    color = MaterialTheme.colorScheme.primary,
                )
                StatTile(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Outlined.Bolt,
                    label = if (isFi) "Viim. tunti" else "Last hour",
                    value = stats?.pageviewsLastHour?.toString() ?: "…",
                    color = MaterialTheme.colorScheme.tertiary,
                )
                StatTile(
                    modifier = Modifier.weight(1f),
                    icon = Icons.Outlined.Warning,
                    label = if (isFi) "Virheet 24h" else "Errors 24h",
                    value = stats?.errors24h?.toString() ?: "…",
                    color = MaterialTheme.colorScheme.error,
                )
            }
        }

        // ── Source filter pills ─────────────────────────────────────
        item {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    if (isFi) "Lähde" else "Source",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    val items = listOf(
                        null to (if (isFi) "Kaikki" else "All"),
                        "web" to "Web",
                        "android" to "Android",
                        "server" to "Server",
                    )
                    items(items) { (key, label) ->
                        FilterChipTiny(
                            selected = sourceFilter == key,
                            label = label,
                            onClick = { sourceFilter = key },
                        )
                    }
                }
                Text(
                    if (isFi) "Taso" else "Level",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    val items = listOf(
                        null to (if (isFi) "Kaikki" else "All"),
                        "error" to "Error",
                        "warn" to "Warn",
                        "info" to "Info",
                        "debug" to "Debug",
                    )
                    items(items) { (key, label) ->
                        FilterChipTiny(
                            selected = levelFilter == key,
                            label = label,
                            onClick = { levelFilter = key },
                        )
                    }
                }
            }
        }

        // ── Top screens ─────────────────────────────────────────────
        stats?.topScreens?.takeIf { it.isNotEmpty() }?.let { top ->
            item {
                Column(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(MaterialTheme.colorScheme.surfaceContainerLow)
                        .padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(
                        if (isFi) "Suosituimmat näkymät" else "Top screens",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                    top.take(6).forEach { (u, c) ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(u.ifBlank { "/" }, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("$c", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                        }
                    }
                }
            }
        }

        // ── Event stream ─────────────────────────────────────────────
        item {
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    if (isFi) "Tapahtumat" else "Events",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (loading) CircularProgressIndicator(
                        Modifier.size(14.dp), strokeWidth = 2.dp,
                    )
                    Spacer(Modifier.width(8.dp))
                    IconButton(onClick = { refreshTick++ }) {
                        Icon(Icons.Outlined.Refresh, null, modifier = Modifier.size(20.dp))
                    }
                }
            }
        }
        error?.let { err ->
            item {
                Text(
                    (if (isFi) "Virhe: " else "Error: ") + err,
                    color = MaterialTheme.colorScheme.error,
                    fontSize = 12.sp,
                )
            }
        }
        if (!loading && rows.isEmpty() && error == null) {
            item {
                Text(
                    if (isFi) "Ei tapahtumia valituilla suodattimilla."
                    else "No events matching the filters.",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(vertical = 12.dp),
                )
            }
        }
        items(rows, key = { it.id }) { row ->
            ActivityRowCard(row)
        }
    }
}

@Composable
private fun FilterChipTiny(
    selected: Boolean,
    label: String,
    onClick: () -> Unit,
) {
    Box(
        Modifier
            .clip(RoundedCornerShape(14.dp))
            .background(
                if (selected) MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.surfaceContainerHigh,
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 6.dp),
    ) {
        Text(
            label,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = if (selected) MaterialTheme.colorScheme.onPrimary
            else MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
private fun ActivityRowCard(row: ActivityRow) {
    val badgeColor = when (row.level) {
        "error" -> MaterialTheme.colorScheme.error
        "warn" -> MaterialTheme.colorScheme.tertiary
        "debug" -> MaterialTheme.colorScheme.outline
        else -> MaterialTheme.colorScheme.primary
    }
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surfaceContainerLow)
            .padding(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(width = 44.dp, height = 20.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .background(badgeColor.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    row.level.uppercase(),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = badgeColor,
                )
            }
            Spacer(Modifier.width(8.dp))
            Text(
                row.source.uppercase(),
                fontSize = 10.sp,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.weight(1f))
            Text(
                formatShortTime(row.ts),
                fontSize = 10.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Spacer(Modifier.height(6.dp))
        Text(row.message, fontSize = 12.sp, fontWeight = FontWeight.Medium)
        if (row.url.isNotBlank()) {
            Spacer(Modifier.height(2.dp))
            Text(
                row.url,
                fontSize = 10.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

private fun formatShortTime(iso: String): String {
    return try {
        val i = Instant.parse(iso)
        val delta = (System.currentTimeMillis() - i.toEpochMilli()) / 1000
        when {
            delta < 60 -> "${delta}s"
            delta < 3600 -> "${delta / 60}m"
            delta < 86_400 -> "${delta / 3600}h"
            else -> "${delta / 86_400}d"
        }
    } catch (_: Throwable) { iso.take(19) }
}
