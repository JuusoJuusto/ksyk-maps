@file:OptIn(ExperimentalMaterial3Api::class)

package fi.ksykmaps.ui

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.net.wifi.WifiManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
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
import fi.ksykmaps.data.ApiException
import fi.ksykmaps.data.AppLog
import fi.ksykmaps.data.DiskCache
import fi.ksykmaps.data.Session
import com.posthog.PostHog
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
    var showSignOutConfirm by remember { mutableStateOf(false) }

    if (showSignOutConfirm) {
        AlertDialog(
            onDismissRequest = { showSignOutConfirm = false },
            shape = RoundedCornerShape(20.dp),
            icon = {
                Icon(Icons.AutoMirrored.Outlined.Logout, null,
                    tint = MaterialTheme.colorScheme.error)
            },
            title = {
                Text(
                    if (isFi) "Kirjaudu ulos?" else "Sign out?",
                    fontWeight = FontWeight.SemiBold,
                )
            },
            text = {
                Text(
                    if (isFi) "Sinut kirjataan ulos hallintapaneelista tällä laitteella."
                    else "You will be signed out of the admin panel on this device.",
                )
            },
            confirmButton = {
                TextButton(onClick = { showSignOutConfirm = false; onSignOut() }) {
                    Text(
                        if (isFi) "Kirjaudu ulos" else "Sign out",
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = { showSignOutConfirm = false }) {
                    Text(if (isFi) "Peruuta" else "Cancel")
                }
            },
        )
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.surface,
        topBar = {
            TopAppBar(
                navigationIcon = {
                    Box(
                        Modifier
                            .padding(start = 12.dp)
                            .size(36.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(MaterialTheme.colorScheme.primaryContainer),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            Icons.Outlined.AdminPanelSettings, null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp),
                        )
                    }
                },
                title = {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                if (isFi) "Hallintapaneeli" else "Admin Panel",
                                fontSize = 17.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Spacer(Modifier.width(7.dp))
                            Box(
                                Modifier
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(MaterialTheme.colorScheme.primaryContainer)
                                    .padding(horizontal = 5.dp, vertical = 2.dp),
                            ) {
                                Text(
                                    "ADMIN",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    letterSpacing = 0.8.sp,
                                    color = MaterialTheme.colorScheme.primary,
                                )
                            }
                        }
                        val email = Api.sessionEmail
                        if (email != null) {
                            Text(
                                email,
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                },
                actions = {
                    IconButton(onClick = { showSignOutConfirm = true }) {
                        Icon(
                            Icons.AutoMirrored.Outlined.Logout,
                            contentDescription = if (isFi) "Kirjaudu ulos" else "Sign out",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
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
                tabs = if (isFi) listOf(
                    Icons.Outlined.GridView to "Yleiskatsaus",
                    Icons.Outlined.BarChart to "Aktiviteetti",
                    Icons.Outlined.Campaign to "Ilmoitukset",
                    Icons.Outlined.Wifi to "Wi-Fi",
                    Icons.Outlined.GpsFixed to "Sijainti",
                    Icons.Outlined.Group to "Käyttäjät",
                    Icons.Outlined.Tune to "Toiminnot",
                ) else listOf(
                    Icons.Outlined.GridView to "Overview",
                    Icons.Outlined.BarChart to "Activity",
                    Icons.Outlined.Campaign to "News",
                    Icons.Outlined.Wifi to "Wi-Fi",
                    Icons.Outlined.GpsFixed to "Live",
                    Icons.Outlined.Group to "Users",
                    Icons.Outlined.Tune to "Actions",
                ),
            )
            val onSessionExpired: () -> Unit = { onSignOut() }
            when (selectedSection) {
                0 -> AdminOverviewSection(isFi, scope)
                1 -> AdminActivitySection(isFi, onSessionExpired)
                2 -> AdminAnnouncementsSection(isFi, scope)
                3 -> AdminWifiSection(isFi, ctx, scope, onOpenBeaconCapture)
                4 -> AdminLiveSection(isFi)
                5 -> AdminUsersSection(isFi, onSessionExpired)
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
    tabs: List<Pair<ImageVector, String>>,
) {
    val scroll = rememberScrollState()
    Row(
        Modifier
            .fillMaxWidth()
            .horizontalScroll(scroll)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        tabs.forEachIndexed { i, (icon, label) ->
            val isSel = selected == i
            Row(
                Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(
                        if (isSel) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.surfaceContainerHigh,
                    )
                    .clickable { onSelect(i) }
                    .heightIn(min = 48.dp)
                    .padding(horizontal = 14.dp, vertical = 9.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    icon, null,
                    modifier = Modifier.size(14.dp),
                    tint = if (isSel) MaterialTheme.colorScheme.onPrimary
                           else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.65f),
                )
                Spacer(Modifier.width(5.dp))
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
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        // System status banner
        item {
            val statusOk = !stats.loading && stats.error == null
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(
                        if (statusOk) Color(0xFF10B981).copy(alpha = 0.12f)
                        else if (stats.loading) MaterialTheme.colorScheme.surfaceContainerLow
                        else Color(0xFFF59E0B).copy(alpha = 0.12f),
                    )
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(
                            if (statusOk) Color(0xFF10B981).copy(alpha = 0.2f)
                            else if (stats.loading) MaterialTheme.colorScheme.surfaceContainerHigh
                            else Color(0xFFF59E0B).copy(alpha = 0.2f),
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    if (stats.loading) {
                        CircularProgressIndicator(Modifier.size(14.dp), strokeWidth = 2.dp)
                    } else {
                        Icon(
                            if (statusOk) Icons.Outlined.CheckCircle else Icons.Outlined.Warning,
                            null,
                            tint = if (statusOk) Color(0xFF10B981) else Color(0xFFF59E0B),
                            modifier = Modifier.size(16.dp),
                        )
                    }
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        when {
                            stats.loading -> if (isFi) "Ladataan…" else "Loading…"
                            statusOk -> if (isFi) "Järjestelmä OK" else "System OK"
                            else -> if (isFi) "Osittainen virhe" else "Partial error"
                        },
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = when {
                            stats.loading -> MaterialTheme.colorScheme.onSurface
                            statusOk -> Color(0xFF059669)
                            else -> Color(0xFFD97706)
                        },
                    )
                    if (!stats.loading) {
                        Text(
                            if (isFi) "Kaikki palvelut toiminnassa" else "All services operational",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
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
    var lastActionIsError by remember { mutableStateOf(false) }

    // Broadcast push state
    var showBroadcastDialog by remember { mutableStateOf(false) }
    var broadcastMsg by remember { mutableStateOf("") }
    var broadcasting by remember { mutableStateOf(false) }

    // Server cache purge
    var purging by remember { mutableStateOf(false) }

    // Maintenance mode
    var maintenanceEnabled by remember { mutableStateOf<Boolean?>(null) }
    var maintenanceLoading by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        runCatching {
            val res = withContext(Dispatchers.IO) { Api.get("/admin/maintenance") }
            maintenanceEnabled = res.jsonObject["enabled"]?.jsonPrimitive?.boolean ?: false
        }
    }

    if (showBroadcastDialog) {
        AlertDialog(
            onDismissRequest = { if (!broadcasting) showBroadcastDialog = false },
            icon = { Icon(Icons.Outlined.Campaign, null, tint = Color(0xFF8B5CF6)) },
            title = { Text(if (isFi) "Lähetä kaikille" else "Broadcast to all") },
            text = {
                OutlinedTextField(
                    value = broadcastMsg,
                    onValueChange = { broadcastMsg = it },
                    label = { Text(if (isFi) "Viesti" else "Message") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = false,
                    maxLines = 4,
                    enabled = !broadcasting,
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        if (broadcastMsg.isBlank()) return@TextButton
                        broadcasting = true
                        scope.launch {
                            val res = runCatching {
                                withContext(Dispatchers.IO) {
                                    Api.post("/admin/notify/push", buildJsonObject {
                                        put("message", broadcastMsg.trim())
                                    })
                                }
                            }
                            broadcasting = false
                            showBroadcastDialog = false
                            broadcastMsg = ""
                            lastActionIsError = res.isFailure
                            lastAction = if (res.isSuccess)
                                if (isFi) "Viesti lähetetty kaikille laitteille" else "Broadcast sent to all devices"
                            else
                                (if (isFi) "Lähetys epäonnistui" else "Broadcast failed") +
                                    ": " + Api.friendly(res.exceptionOrNull() ?: Exception())
                        }
                    },
                    enabled = !broadcasting && broadcastMsg.isNotBlank(),
                ) {
                    if (broadcasting) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
                    else Text(if (isFi) "Lähetä" else "Send")
                }
            },
            dismissButton = {
                TextButton(onClick = { showBroadcastDialog = false }, enabled = !broadcasting) {
                    Text(if (isFi) "Peruuta" else "Cancel")
                }
            },
        )
    }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // ── Section: Web tools ──
        item {
            Text(
                if (isFi) "Verkkotyökalut" else "Web tools",
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 4.dp, bottom = 2.dp),
            )
        }
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

        // ── Section: Notifications ──
        item {
            Text(
                if (isFi) "Ilmoitukset" else "Notifications",
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 4.dp, top = 4.dp, bottom = 2.dp),
            )
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
                    lastActionIsError = false
                    lastAction = if (isFi) "Testi-ilmoitus lähetetty" else "Test notification sent"
                },
            )
        }
        item {
            ActionCard(
                icon = Icons.Outlined.Campaign,
                iconColor = Color(0xFF8B5CF6),
                title = if (isFi) "Lähetä kaikille" else "Broadcast push",
                subtitle = if (isFi) "Lähetä push-viesti kaikille laitteille"
                           else "Send a push message to every registered device",
                actionText = if (isFi) "Kirjoita" else "Compose",
                onAction = { showBroadcastDialog = true },
            )
        }

        // ── Section: Server ──
        item {
            Text(
                if (isFi) "Palvelin" else "Server",
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 4.dp, top = 4.dp, bottom = 2.dp),
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
                    clearing || refreshingCdn -> "…"
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
                        lastActionIsError = false
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
                icon = Icons.Outlined.DeleteSweep,
                iconColor = Color(0xFFEF4444),
                title = if (isFi) "Tyhjennä palvelinvälimuisti" else "Purge server cache",
                subtitle = if (isFi) "Pakottaa palvelimen hakemaan tuoreimmat tiedot uudelleen"
                           else "Forces the server to drop its cached responses",
                actionText = if (purging) "…" else if (isFi) "Tyhjennä" else "Purge",
                actionEnabled = !purging,
                onAction = {
                    purging = true
                    scope.launch {
                        val res = runCatching {
                            withContext(Dispatchers.IO) { Api.post("/admin/cache/purge", buildJsonObject {}) }
                        }
                        purging = false
                        lastActionIsError = res.isFailure
                        lastAction = if (res.isSuccess)
                            if (isFi) "Palvelinvälimuisti tyhjennetty" else "Server cache purged"
                        else
                            (if (isFi) "Tyhjennys epäonnistui" else "Purge failed") +
                                ": " + Api.friendly(res.exceptionOrNull() ?: Exception())
                    }
                },
            )
        }
        item {
            val on = maintenanceEnabled
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(MaterialTheme.colorScheme.surfaceContainerLow)
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    Modifier.size(40.dp).clip(CircleShape)
                        .background(Color(0xFFF97316).copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Outlined.Build, null,
                        tint = Color(0xFFF97316), modifier = Modifier.size(20.dp))
                }
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        if (isFi) "Huoltotila" else "Maintenance mode",
                        fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Text(
                        if (isFi) "Estää muiden kirjautumisen sovellukseen"
                        else "Blocks non-admin logins across the app",
                        fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant,
                        lineHeight = 14.sp,
                    )
                }
                if (maintenanceLoading || on == null) {
                    CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                } else {
                    Switch(
                        checked = on,
                        onCheckedChange = { newVal ->
                            maintenanceLoading = true
                            scope.launch {
                                val mOk = runCatching {
                                    withContext(Dispatchers.IO) {
                                        Api.post("/admin/maintenance", buildJsonObject { put("enabled", newVal) })
                                    }
                                }.onSuccess { maintenanceEnabled = newVal }.isSuccess
                                maintenanceLoading = false
                                lastActionIsError = !mOk
                                lastAction = when {
                                    mOk && newVal -> if (isFi) "Huoltotila käytössä" else "Maintenance mode ON"
                                    mOk -> if (isFi) "Huoltotila poistettu" else "Maintenance mode OFF"
                                    else -> if (isFi) "Huoltotilan muutos epäonnistui" else "Maintenance update failed"
                                }
                            }
                        },
                    )
                }
            }
        }

        // ── Section: App info ──
        item {
            Text(
                if (isFi) "Sovellustiedot" else "App info",
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 4.dp, top = 4.dp, bottom = 2.dp),
            )
        }
        item {
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(MaterialTheme.colorScheme.surfaceContainerLow)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.Info, null, tint = Color(0xFF3B82F6), modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(10.dp))
                    Text(if (isFi) "Versiotiedot" else "Build info",
                        fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface)
                }
                InfoRow(if (isFi) "Versio" else "Version", fi.ksykmaps.BuildConfig.VERSION_NAME)
                InfoRow(if (isFi) "Versiokoodi" else "Version code", fi.ksykmaps.BuildConfig.VERSION_CODE.toString())
                InfoRow(if (isFi) "Paketti" else "Package", ctx.packageName)
                InfoRow(if (isFi) "Laite" else "Device",
                    "${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}")
                InfoRow("Android", android.os.Build.VERSION.RELEASE)
            }
        }

        // ── Last action feedback ──
        if (lastAction != null) {
            item {
                val feedbackColor = if (lastActionIsError) Color(0xFFEF4444) else Color(0xFF10B981)
                val feedbackIcon = if (lastActionIsError) Icons.Outlined.Error else Icons.Outlined.CheckCircle
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(feedbackColor.copy(alpha = 0.12f))
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(feedbackIcon, null, tint = feedbackColor, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(10.dp))
                    Text(
                        lastAction!!,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = feedbackColor,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }

        // ── Sign out ──
        item {
            Spacer(Modifier.height(4.dp))
            OutlinedButton(
                onClick = onSignOut,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.5f)),
            ) {
                Icon(Icons.AutoMirrored.Outlined.Logout, null,
                    tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text(if (isFi) "Kirjaudu ulos" else "Sign out",
                    color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.SemiBold)
            }
        }
        item { Spacer(Modifier.height(16.dp)) }
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontSize = 12.sp, fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSurface)
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
    var audience by remember { mutableStateOf("all") }
    var pinned by remember { mutableStateOf(false) }
    var startDate by remember { mutableStateOf<String?>(null) }
    var endDate by remember { mutableStateOf<String?>(null) }
    var showPreview by remember { mutableStateOf(false) }
    var editingId by remember { mutableStateOf<String?>(null) }
    var posting by remember { mutableStateOf(false) }
    var toast by remember { mutableStateOf<String?>(null) }
    var toastIsError by remember { mutableStateOf(false) }
    var recent by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var refreshTrigger by remember { mutableIntStateOf(0) }
    var deleteTarget by remember { mutableStateOf<JsonObject?>(null) }
    var showStartDatePicker by remember { mutableStateOf(false) }
    var showEndDatePicker by remember { mutableStateOf(false) }

    LaunchedEffect(refreshTrigger) {
        withContext(Dispatchers.IO) {
            runCatching {
                val arr = Api.get("/announcements?limit=30").jsonArray
                recent = arr.mapNotNull { it as? JsonObject }
            }
        }
    }

    fun resetForm() {
        title = ""; body = ""; type = "info"; audience = "all"
        pinned = false; startDate = null; endDate = null
        showPreview = false; editingId = null
    }

    fun millisToDate(millis: Long?): String? {
        if (millis == null) return null
        return try {
            java.time.Instant.ofEpochMilli(millis)
                .atZone(java.time.ZoneId.of("UTC"))
                .toLocalDate().toString()
        } catch (_: Exception) { null }
    }

    val startPickerState = rememberDatePickerState()
    if (showStartDatePicker) {
        DatePickerDialog(
            onDismissRequest = { showStartDatePicker = false },
            confirmButton = {
                TextButton(onClick = { startDate = millisToDate(startPickerState.selectedDateMillis); showStartDatePicker = false }) {
                    Text(if (isFi) "Valitse" else "Select")
                }
            },
            dismissButton = { TextButton(onClick = { showStartDatePicker = false }) { Text(if (isFi) "Peruuta" else "Cancel") } },
        ) { DatePicker(state = startPickerState) }
    }

    val endPickerState = rememberDatePickerState()
    if (showEndDatePicker) {
        DatePickerDialog(
            onDismissRequest = { showEndDatePicker = false },
            confirmButton = {
                TextButton(onClick = { endDate = millisToDate(endPickerState.selectedDateMillis); showEndDatePicker = false }) {
                    Text(if (isFi) "Valitse" else "Select")
                }
            },
            dismissButton = { TextButton(onClick = { showEndDatePicker = false }) { Text(if (isFi) "Peruuta" else "Cancel") } },
        ) { DatePicker(state = endPickerState) }
    }

    deleteTarget?.let { target ->
        val ttl = (target["title"] as? JsonPrimitive)?.contentOrNull ?: ""
        val id = (target["id"] as? JsonPrimitive)?.contentOrNull ?: ""
        AlertDialog(
            onDismissRequest = { deleteTarget = null },
            shape = RoundedCornerShape(20.dp),
            icon = { Icon(Icons.Outlined.Delete, null, tint = MaterialTheme.colorScheme.error) },
            title = { Text(if (isFi) "Poista ilmoitus?" else "Delete announcement?", fontWeight = FontWeight.SemiBold) },
            text = { Text("\"$ttl\"") },
            confirmButton = {
                TextButton(onClick = {
                    deleteTarget = null
                    scope.launch {
                        val ok = withContext(Dispatchers.IO) { runCatching { Api.delete("/announcements/$id") }.isSuccess }
                        toast = if (ok) (if (isFi) "Poistettu" else "Deleted") else (if (isFi) "Poisto epäonnistui" else "Delete failed")
                        toastIsError = !ok
                        if (ok) refreshTrigger++
                    }
                }) { Text(if (isFi) "Poista" else "Delete", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { deleteTarget = null }) { Text(if (isFi) "Peruuta" else "Cancel") } },
        )
    }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // ── Form card ────────────────────────────────────────────────
        item {
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp))
                    .background(MaterialTheme.colorScheme.surfaceContainerLow).padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        if (editingId != null) Icons.Outlined.Edit else Icons.Outlined.Campaign,
                        null, tint = Color(0xFF3B82F6), modifier = Modifier.size(22.dp),
                    )
                    Spacer(Modifier.width(10.dp))
                    Text(
                        if (editingId != null) (if (isFi) "Muokkaa ilmoitusta" else "Edit announcement")
                        else (if (isFi) "Uusi ilmoitus" else "New announcement"),
                        fontWeight = FontWeight.SemiBold, fontSize = 16.sp,
                    )
                    if (editingId != null) {
                        Spacer(Modifier.weight(1f))
                        TextButton(onClick = { resetForm() }) { Text(if (isFi) "Peruuta" else "Cancel", fontSize = 12.sp) }
                    }
                }
                OutlinedTextField(
                    value = title, onValueChange = { title = it },
                    label = { Text(if (isFi) "Otsikko" else "Title") },
                    modifier = Modifier.fillMaxWidth(), singleLine = true, shape = RoundedCornerShape(10.dp),
                )
                OutlinedTextField(
                    value = body, onValueChange = { body = it },
                    label = { Text(if (isFi) "Sisältö" else "Body") },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 96.dp),
                    shape = RoundedCornerShape(10.dp), minLines = 3,
                )
                // Type chips
                Text(if (isFi) "Tyyppi" else "Type", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
                    listOf("info" to Color(0xFF3B82F6), "warning" to Color(0xFFF59E0B), "urgent" to Color(0xFFEF4444), "event" to Color(0xFF8B5CF6)).forEach { (t, c) ->
                        val label = when (t) { "info" -> if (isFi) "Tieto" else "Info"; "warning" -> if (isFi) "Varoitus" else "Warning"; "urgent" -> if (isFi) "Kiireellinen" else "Urgent"; else -> if (isFi) "Tapahtuma" else "Event" }
                        val isSel = type == t
                        Box(Modifier.clip(RoundedCornerShape(14.dp)).background(if (isSel) c else c.copy(alpha = 0.12f)).clickable { type = t }.padding(horizontal = 12.dp, vertical = 6.dp)) {
                            Text(label, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = if (isSel) Color.White else c)
                        }
                    }
                }
                // Audience chips
                Text(if (isFi) "Kohderyhmä" else "Audience", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
                    listOf(
                        "all" to (if (isFi) "Kaikki" else "All"),
                        "grade1" to (if (isFi) "1. luokka" else "Grade 1"),
                        "grade2" to (if (isFi) "2. luokka" else "Grade 2"),
                        "grade3" to (if (isFi) "3. luokka" else "Grade 3"),
                        "teachers" to (if (isFi) "Opettajat" else "Teachers"),
                    ).forEach { (a, label) ->
                        val isSel = audience == a
                        Box(
                            Modifier.clip(RoundedCornerShape(14.dp))
                                .background(if (isSel) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceContainerHigh)
                                .clickable { audience = a }
                                .padding(horizontal = 12.dp, vertical = 6.dp),
                        ) {
                            Text(label, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = if (isSel) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface)
                        }
                    }
                }
                // Date range
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    OutlinedButton(onClick = { showStartDatePicker = true }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(10.dp)) {
                        Icon(Icons.Outlined.CalendarToday, null, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(6.dp))
                        Text(startDate ?: (if (isFi) "Alkaa" else "Start"), fontSize = 12.sp, maxLines = 1)
                    }
                    OutlinedButton(onClick = { showEndDatePicker = true }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(10.dp)) {
                        Icon(Icons.Outlined.Event, null, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(6.dp))
                        Text(endDate ?: (if (isFi) "Päättyy" else "End"), fontSize = 12.sp, maxLines = 1)
                    }
                    if (startDate != null || endDate != null) {
                        IconButton(onClick = { startDate = null; endDate = null }, modifier = Modifier.size(36.dp)) {
                            Icon(Icons.Outlined.Close, null, modifier = Modifier.size(16.dp))
                        }
                    }
                }
                // Pin toggle
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.PushPin, null, modifier = Modifier.size(18.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.width(10.dp))
                    Text(if (isFi) "Kiinnitä ylös" else "Pin to top", fontSize = 13.sp, modifier = Modifier.weight(1f))
                    Switch(checked = pinned, onCheckedChange = { pinned = it })
                }
                // Preview toggle
                TextButton(onClick = { showPreview = !showPreview }, modifier = Modifier.align(Alignment.End)) {
                    Icon(if (showPreview) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility, null, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(if (showPreview) (if (isFi) "Piilota esikatselu" else "Hide preview") else (if (isFi) "Esikatselu" else "Preview"), fontSize = 12.sp)
                }
                AnimatedVisibility(visible = showPreview && title.isNotBlank(), enter = fadeIn() + expandVertically(), exit = fadeOut() + shrinkVertically()) {
                    AnnouncementPreviewCard(title, body, type, pinned, audience, startDate, endDate, isFi)
                }
                toast?.let {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            if (toastIsError) Icons.Outlined.ErrorOutline else Icons.Outlined.CheckCircle,
                            null, modifier = Modifier.size(14.dp),
                            tint = if (toastIsError) MaterialTheme.colorScheme.error else Color(0xFF10B981),
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(it, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = if (toastIsError) MaterialTheme.colorScheme.error else Color(0xFF10B981))
                    }
                }
                Button(
                    onClick = {
                        if (title.isBlank() || body.isBlank()) return@Button
                        posting = true; toast = null
                        scope.launch {
                            val payload = buildJsonObject {
                                put("title", title.trim()); put("content", body.trim()); put("type", type)
                                put("audience", audience); put("pinned", pinned); put("active", true)
                                startDate?.let { put("startDate", it) }; endDate?.let { put("endDate", it) }
                            }
                            val ok = withContext(Dispatchers.IO) {
                                runCatching { if (editingId != null) Api.put("/announcements/$editingId", payload) else Api.post("/announcements", payload) }.isSuccess
                            }
                            posting = false
                            if (ok) {
                                runCatching { PostHog.capture(if (editingId != null) "admin_announcement_updated" else "admin_announcement_published", properties = mapOf("type" to type)) }
                                toast = if (editingId != null) (if (isFi) "Ilmoitus päivitetty" else "Announcement updated") else (if (isFi) "Ilmoitus julkaistu" else "Announcement posted")
                                toastIsError = false; resetForm(); refreshTrigger++
                            } else { toast = if (isFi) "Julkaisu epäonnistui" else "Failed to post"; toastIsError = true }
                        }
                    },
                    enabled = !posting && title.isNotBlank() && body.isNotBlank(),
                    modifier = Modifier.fillMaxWidth().height(46.dp), shape = RoundedCornerShape(12.dp),
                ) {
                    if (posting) { CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp, color = Color.White); Spacer(Modifier.width(10.dp)) }
                    else { Icon(if (editingId != null) Icons.Outlined.Save else Icons.Outlined.Send, null, Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)) }
                    Text(if (editingId != null) (if (isFi) "Päivitä" else "Update") else (if (isFi) "Julkaise" else "Publish"), fontWeight = FontWeight.SemiBold)
                }
            }
        }
        // ── Announcement list ────────────────────────────────────────
        item {
            Row(Modifier.fillMaxWidth().padding(start = 4.dp, top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                Text((if (isFi) "Ilmoitukset" else "Announcements") + " · ${recent.size}", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                IconButton(onClick = { refreshTrigger++ }) { Icon(Icons.Outlined.Refresh, null, tint = MaterialTheme.colorScheme.primary) }
            }
        }
        if (recent.isEmpty()) {
            item { Text(if (isFi) "Ei ilmoituksia." else "No announcements yet.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(4.dp)) }
        }
        items(recent, key = { (it["id"] as? JsonPrimitive)?.contentOrNull ?: it.hashCode().toString() }) { a ->
            val id = (a["id"] as? JsonPrimitive)?.contentOrNull ?: ""
            val ttl = (a["title"] as? JsonPrimitive)?.contentOrNull ?: ""
            val bod = (a["content"] as? JsonPrimitive)?.contentOrNull ?: (a["body"] as? JsonPrimitive)?.contentOrNull ?: ""
            val tpe = (a["type"] as? JsonPrimitive)?.contentOrNull ?: "info"
            val isPinned = (a["pinned"] as? JsonPrimitive)?.booleanOrNull ?: false
            val aud = (a["audience"] as? JsonPrimitive)?.contentOrNull ?: "all"
            val sDate = (a["startDate"] as? JsonPrimitive)?.contentOrNull
            val eDate = (a["endDate"] as? JsonPrimitive)?.contentOrNull
            val initActive = (a["active"] as? JsonPrimitive)?.booleanOrNull ?: true
            var itemActive by remember(id, initActive) { mutableStateOf(initActive) }
            var togglingActive by remember { mutableStateOf(false) }
            val accent = when (tpe.lowercase()) { "urgent" -> Color(0xFFEF4444); "warning" -> Color(0xFFF59E0B); "event" -> Color(0xFF8B5CF6); else -> Color(0xFF3B82F6) }
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp))
                    .background(if (itemActive) MaterialTheme.colorScheme.surfaceContainerLow else MaterialTheme.colorScheme.surfaceContainerLowest)
                    .padding(14.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Row(verticalAlignment = Alignment.Top) {
                    Box(Modifier.padding(top = 2.dp).size(width = 4.dp, height = 42.dp).clip(RoundedCornerShape(2.dp)).background(accent.copy(alpha = if (itemActive) 1f else 0.35f)))
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            if (isPinned) { Icon(Icons.Outlined.PushPin, null, modifier = Modifier.size(11.dp), tint = MaterialTheme.colorScheme.primary); Spacer(Modifier.width(3.dp)) }
                            Text(ttl, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = if (itemActive) 1f else 0.5f))
                        }
                        if (bod.isNotBlank()) Text(bod.take(100), fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = if (itemActive) 1f else 0.5f), maxLines = 2)
                        if (sDate != null || eDate != null || aud != "all") {
                            Row(horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                                if (sDate != null || eDate != null) {
                                    Box(Modifier.clip(RoundedCornerShape(5.dp)).background(MaterialTheme.colorScheme.surfaceContainerHigh).padding(horizontal = 5.dp, vertical = 2.dp)) {
                                        Text(listOfNotNull(sDate, eDate).joinToString(" → "), fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                                if (aud != "all") {
                                    Box(Modifier.clip(RoundedCornerShape(5.dp)).background(MaterialTheme.colorScheme.primaryContainer).padding(horizontal = 5.dp, vertical = 2.dp)) {
                                        Text(aud, fontSize = 10.sp, color = MaterialTheme.colorScheme.primary)
                                    }
                                }
                            }
                        }
                    }
                    // Action icons
                    Row {
                        // Toggle visibility
                        IconButton(
                            onClick = {
                                togglingActive = true
                                scope.launch {
                                    val ok = withContext(Dispatchers.IO) { runCatching { Api.put("/announcements/$id", buildJsonObject { put("active", !itemActive) }) }.isSuccess }
                                    if (ok) itemActive = !itemActive
                                    togglingActive = false
                                }
                            },
                            modifier = Modifier.size(32.dp), enabled = !togglingActive,
                        ) {
                            if (togglingActive) CircularProgressIndicator(Modifier.size(13.dp), strokeWidth = 1.5.dp)
                            else Icon(if (itemActive) Icons.Outlined.Visibility else Icons.Outlined.VisibilityOff, null, modifier = Modifier.size(16.dp), tint = if (itemActive) Color(0xFF10B981) else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f))
                        }
                        // Edit
                        IconButton(
                            onClick = {
                                editingId = id; title = ttl; body = bod; type = tpe
                                audience = aud; pinned = isPinned; startDate = sDate; endDate = eDate
                                showPreview = false; toast = null
                            },
                            modifier = Modifier.size(32.dp),
                        ) { Icon(Icons.Outlined.Edit, contentDescription = if (isFi) "Muokkaa" else "Edit", modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary) }
                        // Delete
                        IconButton(onClick = { deleteTarget = a }, modifier = Modifier.size(32.dp)) {
                            Icon(Icons.Outlined.Delete, contentDescription = if (isFi) "Poista" else "Delete", modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.error)
                        }
                    }
                }
            }
        }
        item { Spacer(Modifier.height(12.dp)) }
    }
}

@Composable
private fun AnnouncementPreviewCard(
    title: String, body: String, type: String, pinned: Boolean,
    audience: String, startDate: String?, endDate: String?, isFi: Boolean,
) {
    val accent = when (type.lowercase()) { "urgent" -> Color(0xFFEF4444); "warning" -> Color(0xFFF59E0B); "event" -> Color(0xFF8B5CF6); else -> Color(0xFF3B82F6) }
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surfaceContainerHigh).padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Row(verticalAlignment = Alignment.Top) {
            Box(Modifier.padding(top = 2.dp).size(width = 3.dp, height = 38.dp).clip(RoundedCornerShape(2.dp)).background(accent))
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (pinned) { Icon(Icons.Outlined.PushPin, null, modifier = Modifier.size(11.dp), tint = accent); Spacer(Modifier.width(3.dp)) }
                    Text(title.ifBlank { "…" }, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                }
                Text(body.take(120), fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 3)
            }
            Spacer(Modifier.width(8.dp))
            Box(Modifier.clip(RoundedCornerShape(6.dp)).background(accent.copy(alpha = 0.15f)).padding(horizontal = 6.dp, vertical = 3.dp)) {
                val typeLabel = when (type) { "warning" -> if (isFi) "Varoitus" else "Warning"; "urgent" -> if (isFi) "Kiireellinen" else "Urgent"; "event" -> if (isFi) "Tapahtuma" else "Event"; else -> if (isFi) "Tieto" else "Info" }
                Text(typeLabel, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = accent)
            }
        }
        if (startDate != null || endDate != null || audience != "all") {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                if (startDate != null || endDate != null) Text(listOfNotNull(startDate, endDate).joinToString(" → "), fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (audience != "all") {
                    Box(Modifier.clip(RoundedCornerShape(5.dp)).background(MaterialTheme.colorScheme.primaryContainer).padding(horizontal = 5.dp, vertical = 2.dp)) {
                        Text(audience, fontSize = 10.sp, color = MaterialTheme.colorScheme.primary)
                    }
                }
            }
        }
    }
}

// ── Users section ─────────────────────────────────────────────────────

@Composable
private fun AdminUsersSection(isFi: Boolean, onSessionExpired: () -> Unit = {}) {
    val scope = rememberCoroutineScope()
    var users by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var refreshTrigger by remember { mutableIntStateOf(0) }
    var searchQuery by remember { mutableStateOf("") }
    var roleFilter by remember { mutableStateOf<String?>(null) }
    var showAddUser by remember { mutableStateOf(false) }
    var actionSheetUser by remember { mutableStateOf<JsonObject?>(null) }

    LaunchedEffect(refreshTrigger) {
        loading = true; error = null
        withContext(Dispatchers.IO) {
            runCatching {
                val arr = Api.get("/users").jsonArray
                users = arr.mapNotNull { it as? JsonObject }
            }.onFailure { t ->
                error = if (t is ApiException && t.status == 401) "401" else Api.friendly(t)
            }
        }
        loading = false
    }

    val filteredUsers = users.filter { u ->
        val email = (u["email"] as? JsonPrimitive)?.contentOrNull ?: ""
        val name = (u["name"] as? JsonPrimitive)?.contentOrNull ?: ""
        val role = (u["role"] as? JsonPrimitive)?.contentOrNull ?: "user"
        val matchesSearch = searchQuery.isBlank() || email.contains(searchQuery, ignoreCase = true) || name.contains(searchQuery, ignoreCase = true)
        val matchesRole = roleFilter == null || role.lowercase().startsWith(roleFilter!!)
        matchesSearch && matchesRole
    }

    if (showAddUser) {
        AddUserDialog(isFi = isFi, onDismiss = { showAddUser = false }, onAdded = { showAddUser = false; refreshTrigger++ })
    }

    actionSheetUser?.let { user ->
        UserActionSheet(
            user = user, isFi = isFi, scope = scope,
            onDismiss = { actionSheetUser = null },
            onChanged = { actionSheetUser = null; refreshTrigger++ },
            onSessionExpired = { actionSheetUser = null; onSessionExpired() },
        )
    }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Row(Modifier.fillMaxWidth().padding(bottom = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                Text((if (isFi) "Käyttäjät" else "Users") + " · ${filteredUsers.size}", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                IconButton(onClick = { refreshTrigger++ }) { Icon(Icons.Outlined.Refresh, null, tint = MaterialTheme.colorScheme.primary) }
                FilledTonalButton(onClick = { showAddUser = true }, shape = RoundedCornerShape(10.dp), modifier = Modifier.height(36.dp)) {
                    Icon(Icons.Outlined.PersonAdd, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(if (isFi) "Lisää" else "Add", fontSize = 12.sp)
                }
            }
        }
        item {
            OutlinedTextField(
                value = searchQuery, onValueChange = { searchQuery = it },
                placeholder = { Text(if (isFi) "Hae sähköposti tai nimi…" else "Search email or name…", fontSize = 13.sp) },
                leadingIcon = { Icon(Icons.Outlined.Search, null, modifier = Modifier.size(18.dp)) },
                trailingIcon = { if (searchQuery.isNotBlank()) IconButton(onClick = { searchQuery = "" }) { Icon(Icons.Outlined.Close, null, modifier = Modifier.size(16.dp)) } },
                modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            )
        }
        item {
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf(null to (if (isFi) "Kaikki" else "All"), "admin" to "Admin", "moderator" to (if (isFi) "Moderaattori" else "Moderator"), "user" to (if (isFi) "Käyttäjä" else "User")).forEach { (r, label) ->
                    val isSel = roleFilter == r
                    Box(
                        Modifier.clip(RoundedCornerShape(14.dp))
                            .background(if (isSel) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceContainerHigh)
                            .clickable { roleFilter = r }.padding(horizontal = 12.dp, vertical = 6.dp),
                    ) {
                        Text(label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = if (isSel) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface)
                    }
                }
            }
        }
        if (loading) { item { Row(Modifier.fillMaxWidth().padding(20.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) { CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp) } } }
        if (error != null) {
            item {
                if (error == "401") SessionExpiredCard(isFi = isFi, onReLogin = onSessionExpired)
                else Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.6f)).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.Warning, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(16.dp)); Spacer(Modifier.width(8.dp))
                    Text(error!!, fontSize = 12.sp, color = MaterialTheme.colorScheme.onErrorContainer)
                }
            }
        }
        if (!loading && error == null && filteredUsers.isEmpty()) { item { Text(if (isFi) "Ei käyttäjiä." else "No users found.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(4.dp)) } }
        items(filteredUsers, key = { (it["id"] as? JsonPrimitive)?.contentOrNull ?: it.hashCode().toString() }) { u ->
            val email = (u["email"] as? JsonPrimitive)?.contentOrNull ?: "—"
            val name = (u["name"] as? JsonPrimitive)?.contentOrNull ?: ""
            val role = (u["role"] as? JsonPrimitive)?.contentOrNull ?: "user"
            val roleColor = when (role.lowercase()) { "admin", "superadmin", "owner" -> Color(0xFF10B981); "moderator" -> Color(0xFF8B5CF6); else -> Color(0xFF64748B) }
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(MaterialTheme.colorScheme.surfaceContainerLow)
                    .clickable { actionSheetUser = u }.padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(Modifier.size(38.dp).clip(CircleShape).background(roleColor.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                    Text(email.take(1).uppercase(), fontWeight = FontWeight.Bold, color = roleColor)
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(if (name.isNotBlank()) name else email, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    if (name.isNotBlank()) Text(email, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Box(Modifier.clip(RoundedCornerShape(10.dp)).background(roleColor.copy(alpha = 0.15f)).padding(horizontal = 8.dp, vertical = 4.dp)) {
                    Text(role, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = roleColor)
                }
                Spacer(Modifier.width(4.dp))
                Icon(Icons.Outlined.ChevronRight, null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f))
            }
        }
        item { Spacer(Modifier.height(12.dp)) }
    }
}

@Composable
private fun AddUserDialog(isFi: Boolean, onDismiss: () -> Unit, onAdded: () -> Unit) {
    val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var role by remember { mutableStateOf("user") }
    var sendInvite by remember { mutableStateOf(false) }
    var submitting by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var showPassword by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = { if (!submitting) onDismiss() },
        shape = RoundedCornerShape(20.dp),
        icon = { Icon(Icons.Outlined.PersonAdd, null) },
        title = { Text(if (isFi) "Lisää käyttäjä" else "Add user", fontWeight = FontWeight.SemiBold) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                // ── Mode toggle ────────────────────────────────────────
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(MaterialTheme.colorScheme.surfaceContainerHigh)
                        .padding(4.dp),
                ) {
                    listOf(false to (if (isFi) "Luo salasanalla" else "Set password"),
                           true  to (if (isFi) "Lähetä kutsu" else "Send invite"))
                        .forEach { (inv, label) ->
                            Box(
                                Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(7.dp))
                                    .background(if (sendInvite == inv) MaterialTheme.colorScheme.surface else Color.Transparent)
                                    .clickable { sendInvite = inv; error = null }
                                    .padding(vertical = 8.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
                                    color = if (sendInvite == inv) MaterialTheme.colorScheme.onSurface
                                            else MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                }
                // ── Fields ─────────────────────────────────────────────
                OutlinedTextField(
                    value = email, onValueChange = { email = it; error = null },
                    label = { Text("Email") }, singleLine = true,
                    shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                )
                OutlinedTextField(
                    value = name, onValueChange = { name = it },
                    label = { Text(if (isFi) "Nimi (valinnainen)" else "Name (optional)") },
                    singleLine = true, shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth(),
                )
                if (!sendInvite) {
                    OutlinedTextField(
                        value = password, onValueChange = { password = it; error = null },
                        label = { Text(if (isFi) "Salasana" else "Password") },
                        singleLine = true, shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth(),
                        visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                        trailingIcon = {
                            IconButton(onClick = { showPassword = !showPassword }) {
                                Icon(if (showPassword) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility, null, modifier = Modifier.size(18.dp))
                            }
                        },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    )
                } else {
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f))
                            .padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Outlined.Email, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(
                            if (isFi) "Käyttäjä saa sähköpostin kirjautumislinkin kanssa"
                            else "User receives an email with a sign-in link",
                            fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                // ── Role chips ─────────────────────────────────────────
                Text(if (isFi) "Rooli" else "Role", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("user" to (if (isFi) "Käyttäjä" else "User"),
                           "moderator" to (if (isFi) "Moderaattori" else "Moderator"),
                           "admin" to "Admin").forEach { (r, label) ->
                        val isSel = role == r
                        val c = when (r) { "admin" -> Color(0xFF10B981); "moderator" -> Color(0xFF8B5CF6); else -> MaterialTheme.colorScheme.primary }
                        Box(
                            Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .background(if (isSel) c else c.copy(alpha = 0.12f))
                                .clickable { role = r }
                                .padding(horizontal = 12.dp, vertical = 7.dp),
                        ) {
                            Text(label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = if (isSel) Color.White else c)
                        }
                    }
                }
                error?.let {
                    Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.error)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (email.isBlank()) { error = if (isFi) "Sähköposti puuttuu" else "Email required"; return@Button }
                    if (!sendInvite && password.isBlank()) { error = if (isFi) "Salasana puuttuu" else "Password required"; return@Button }
                    submitting = true
                    scope.launch {
                        val ok = withContext(Dispatchers.IO) {
                            if (sendInvite) {
                                runCatching {
                                    Api.post("/users/invite", buildJsonObject {
                                        put("email", email.trim())
                                        if (name.isNotBlank()) put("name", name.trim())
                                        put("role", role)
                                    })
                                }.onFailure { t -> error = Api.friendly(t) }.isSuccess
                            } else {
                                runCatching {
                                    Api.post("/users", buildJsonObject {
                                        put("email", email.trim())
                                        if (name.isNotBlank()) put("name", name.trim())
                                        put("password", password)
                                        put("role", role)
                                    })
                                }.onFailure { t -> error = Api.friendly(t) }.isSuccess
                            }
                        }
                        submitting = false
                        if (ok) onAdded()
                    }
                },
                enabled = !submitting,
            ) {
                if (submitting) CircularProgressIndicator(Modifier.size(14.dp), strokeWidth = 2.dp, color = Color.White)
                else Text(if (sendInvite) (if (isFi) "Lähetä kutsu" else "Send invite") else (if (isFi) "Luo" else "Create"))
            }
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !submitting) { Text(if (isFi) "Peruuta" else "Cancel") } },
    )
}

@Composable
private fun UserActionSheet(
    user: JsonObject, isFi: Boolean, scope: kotlinx.coroutines.CoroutineScope,
    onDismiss: () -> Unit, onChanged: () -> Unit, onSessionExpired: () -> Unit,
) {
    val email = (user["email"] as? JsonPrimitive)?.contentOrNull ?: ""
    val name = (user["name"] as? JsonPrimitive)?.contentOrNull ?: ""
    val id = (user["id"] as? JsonPrimitive)?.contentOrNull ?: ""
    val currentRole = (user["role"] as? JsonPrimitive)?.contentOrNull ?: "user"
    val roleColor = when (currentRole.lowercase()) { "admin", "superadmin", "owner" -> Color(0xFF10B981); "moderator" -> Color(0xFF8B5CF6); else -> Color(0xFF64748B) }
    var showDeleteConfirm by remember { mutableStateOf(false) }
    var working by remember { mutableStateOf(false) }
    var toast by remember { mutableStateOf<String?>(null) }

    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false }, shape = RoundedCornerShape(20.dp),
            icon = { Icon(Icons.Outlined.Delete, null, tint = MaterialTheme.colorScheme.error) },
            title = { Text(if (isFi) "Poista käyttäjä?" else "Delete user?", fontWeight = FontWeight.SemiBold) },
            text = { Text(email) },
            confirmButton = {
                TextButton(onClick = {
                    showDeleteConfirm = false; working = true
                    scope.launch {
                        val res = withContext(Dispatchers.IO) { runCatching { Api.delete("/users/$id") } }
                        working = false
                        res.onSuccess { onChanged() }.onFailure { t ->
                            if (t is ApiException && t.status == 401) onSessionExpired() else toast = Api.friendly(t)
                        }
                    }
                }) { Text(if (isFi) "Poista" else "Delete", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { showDeleteConfirm = false }) { Text(if (isFi) "Peruuta" else "Cancel") } },
        )
    }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 12.dp)) {
                Box(Modifier.size(44.dp).clip(CircleShape).background(roleColor.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                    Text(email.take(1).uppercase(), fontWeight = FontWeight.Bold, fontSize = 18.sp, color = roleColor)
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(if (name.isNotBlank()) name else email, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                    if (name.isNotBlank()) Text(email, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Box(Modifier.clip(RoundedCornerShape(8.dp)).background(roleColor.copy(alpha = 0.15f)).padding(horizontal = 6.dp, vertical = 2.dp)) {
                        Text(currentRole, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = roleColor)
                    }
                }
            }
            HorizontalDivider()
            Spacer(Modifier.height(8.dp))
            Text(if (isFi) "Vaihda rooli" else "Change role", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(4.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("user" to (if (isFi) "Käyttäjä" else "User"), "moderator" to (if (isFi) "Moderaattori" else "Moderator"), "admin" to "Admin").forEach { (r, label) ->
                    val isCurrent = currentRole == r
                    val c = when (r) { "admin" -> Color(0xFF10B981); "moderator" -> Color(0xFF8B5CF6); else -> MaterialTheme.colorScheme.primary }
                    OutlinedButton(
                        onClick = {
                            if (isCurrent) return@OutlinedButton
                            working = true
                            scope.launch {
                                val res = withContext(Dispatchers.IO) { runCatching { Api.put("/users/$id", buildJsonObject { put("role", r) }) } }
                                working = false
                                res.onSuccess { onChanged() }.onFailure { t ->
                                    if (t is ApiException && t.status == 401) onSessionExpired() else toast = Api.friendly(t)
                                }
                            }
                        },
                        enabled = !working && !isCurrent, shape = RoundedCornerShape(10.dp),
                        colors = if (isCurrent) ButtonDefaults.outlinedButtonColors(containerColor = c.copy(alpha = 0.15f)) else ButtonDefaults.outlinedButtonColors(),
                    ) { Text(label, fontSize = 12.sp, color = if (isCurrent) c else MaterialTheme.colorScheme.onSurface) }
                }
            }
            Spacer(Modifier.height(8.dp))
            OutlinedButton(
                onClick = {
                    working = true; toast = null
                    scope.launch {
                        val ok = withContext(Dispatchers.IO) { runCatching { Api.post("/users/$id/reset-password", buildJsonObject {}) }.isSuccess }
                        working = false
                        toast = if (ok) (if (isFi) "Salasanan nollaus lähetetty" else "Password reset sent") else (if (isFi) "Epäonnistui" else "Failed")
                    }
                },
                enabled = !working, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
            ) {
                Icon(Icons.Outlined.LockReset, null, modifier = Modifier.size(16.dp)); Spacer(Modifier.width(8.dp))
                Text(if (isFi) "Nollaa salasana" else "Reset password")
            }
            OutlinedButton(
                onClick = { showDeleteConfirm = true },
                enabled = !working, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.5f)),
            ) {
                Icon(Icons.Outlined.Delete, null, modifier = Modifier.size(16.dp)); Spacer(Modifier.width(8.dp))
                Text(if (isFi) "Poista käyttäjä" else "Delete user")
            }
            if (working) Row(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.Center) { CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp) }
            toast?.let { Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(top = 4.dp)) }
        }
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
private fun AdminActivitySection(isFi: Boolean, onSessionExpired: () -> Unit = {}) {
    var rows by remember { mutableStateOf<List<ActivityRow>>(emptyList()) }
    var stats by remember { mutableStateOf<ActivityStats?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var sourceFilter by remember { mutableStateOf<String?>(null) } // null = all
    var levelFilter by remember { mutableStateOf<String?>(null) }
    var refreshTick by remember { mutableIntStateOf(0) }
    var showMobile by remember { mutableStateOf(false) }
    val localLogs by AppLog.entriesState

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
            .onFailure { t ->
                error = if (t is ApiException && t.status == 401) "401"
                        else Api.friendly(t)
            }
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

        // ── Source toggle: Server vs Mobile ─────────────────────────
        item {
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surfaceContainerHigh)
                    .padding(4.dp),
            ) {
                listOf(false to (if (isFi) "Palvelin" else "Server"), true to (if (isFi) "Mobiili" else "Mobile"))
                    .forEach { (isMobile, label) ->
                        Box(
                            Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(9.dp))
                                .background(if (showMobile == isMobile) MaterialTheme.colorScheme.surface else Color.Transparent)
                                .clickable { showMobile = isMobile }
                                .padding(vertical = 8.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                label,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = if (showMobile == isMobile) MaterialTheme.colorScheme.onSurface
                                        else MaterialTheme.colorScheme.onSurfaceVariant,
                            )
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
                    if (showMobile) (if (isFi) "Laitteen lokit" else "Device logs")
                    else (if (isFi) "Tapahtumat" else "Events"),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (!showMobile && loading) CircularProgressIndicator(
                        Modifier.size(14.dp), strokeWidth = 2.dp,
                    )
                    Spacer(Modifier.width(8.dp))
                    if (!showMobile) {
                        IconButton(onClick = { refreshTick++ }) {
                            Icon(Icons.Outlined.Refresh, null, modifier = Modifier.size(20.dp))
                        }
                    } else {
                        IconButton(onClick = { AppLog.clear() }) {
                            Icon(Icons.Outlined.DeleteSweep, null, modifier = Modifier.size(20.dp))
                        }
                    }
                }
            }
        }
        if (showMobile) {
            val filtered = localLogs.let { logs ->
                levelFilter?.let { lf -> logs.filter { it.level.name.lowercase() == lf } } ?: logs
            }
            if (filtered.isEmpty()) {
                item {
                    Text(
                        if (isFi) "Ei lokimerkintöjä." else "No log entries.",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(vertical = 12.dp),
                    )
                }
            }
            items(filtered, key = { it.timestampMs }) { entry ->
                val badgeColor = when (entry.level) {
                    AppLog.Level.ERROR -> MaterialTheme.colorScheme.error
                    AppLog.Level.WARN -> MaterialTheme.colorScheme.tertiary
                    AppLog.Level.DEBUG -> MaterialTheme.colorScheme.outline
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
                            Modifier.size(width = 44.dp, height = 20.dp).clip(RoundedCornerShape(6.dp))
                                .background(badgeColor.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(entry.level.name, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = badgeColor)
                        }
                        Spacer(Modifier.width(8.dp))
                        Text(entry.tag.uppercase(), fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.weight(1f))
                        Text(
                            run {
                                val delta = (System.currentTimeMillis() - entry.timestampMs) / 1000
                                when { delta < 60 -> "${delta}s"; delta < 3600 -> "${delta / 60}m"; else -> "${delta / 3600}h" }
                            },
                            fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(entry.message, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                }
            }
        } else {
            error?.let { err ->
                item {
                    if (err == "401") {
                        SessionExpiredCard(isFi = isFi, onReLogin = onSessionExpired)
                    } else {
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.6f))
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(Icons.Outlined.Warning, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(
                                (if (isFi) "Virhe: " else "Error: ") + err,
                                color = MaterialTheme.colorScheme.onErrorContainer,
                                fontSize = 12.sp,
                            )
                        }
                    }
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

@Composable
private fun SessionExpiredCard(isFi: Boolean, onReLogin: () -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.errorContainer)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.error.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Outlined.Lock, null,
                    tint = MaterialTheme.colorScheme.error,
                    modifier = Modifier.size(18.dp),
                )
            }
            Spacer(Modifier.width(12.dp))
            Column {
                Text(
                    if (isFi) "Istunto vanhentunut" else "Session expired",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onErrorContainer,
                )
                Text(
                    if (isFi) "Kirjaudu uudelleen jatkaaksesi" else "Sign in again to continue",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onErrorContainer.copy(alpha = 0.75f),
                )
            }
        }
        Button(
            onClick = onReLogin,
            modifier = Modifier.fillMaxWidth().height(44.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.error,
                contentColor = MaterialTheme.colorScheme.onError,
            ),
        ) {
            Icon(Icons.Outlined.Login, null, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(8.dp))
            Text(
                if (isFi) "Kirjaudu uudelleen" else "Sign in again",
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp,
            )
        }
    }
}
