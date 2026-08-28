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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
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
                    listOf("Yleiskatsaus", "Wi-Fi", "Sijainti", "Toiminnot")
                else
                    listOf("Overview", "Wi-Fi", "Live", "Actions"),
            )
            when (selectedSection) {
                0 -> AdminOverviewSection(isFi, scope)
                1 -> AdminWifiSection(isFi, ctx, scope, onOpenBeaconCapture)
                2 -> AdminLiveSection(isFi)
                3 -> AdminActionsSection(isFi, ctx, onSignOut, scope)
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

    LaunchedEffect(Unit) { if (hasPermission) triggerScan() }

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

// ── Helpers ───────────────────────────────────────────────────────────

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
