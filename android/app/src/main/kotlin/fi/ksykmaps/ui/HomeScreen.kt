package fi.ksykmaps.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import fi.ksykmaps.data.Api
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/**
 * Landing dashboard. Mirrors the desktop admin's Dashboard tab: shows
 * live counts, a greeting card, quick-action tiles that jump into the
 * other tabs, and the latest announcements.
 *
 * Pull down to refresh the whole screen at once.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onOpenRooms: () -> Unit,
    onOpenBeacons: () -> Unit,
    onOpenAnnouncements: () -> Unit,
    onOpenAccount: () -> Unit,
    onOpenBuildings: () -> Unit = onOpenRooms,
) {
    val scope = rememberCoroutineScope()
    var rooms by remember { mutableStateOf(0) }
    var buildings by remember { mutableStateOf(0) }
    var openTickets by remember { mutableStateOf(0) }
    var announcementCount by remember { mutableStateOf(0) }
    var recentAnnouncements by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }
    var refreshing by remember { mutableStateOf(false) }
    var lastRefreshed by remember { mutableStateOf<LocalDateTime?>(null) }
    var apiOk by remember { mutableStateOf(true) }

    fun reload() {
        loading = true
        scope.launch {
            try {
                val rs = withContext(Dispatchers.IO) { Api.get("/rooms") }
                val bs = withContext(Dispatchers.IO) { Api.get("/buildings") }
                val ts = try { withContext(Dispatchers.IO) { Api.get("/tickets") } } catch (_: Exception) { null }
                val ans = withContext(Dispatchers.IO) { Api.get("/announcements?limit=20") }

                rooms = rs.jsonArray.size
                buildings = bs.jsonArray.size
                openTickets = ts?.jsonArray?.count {
                    val obj = it as? JsonObject
                    val st = (obj?.get("status") as? JsonPrimitive)?.contentOrNull?.lowercase()
                    st == "pending" || st == "in_progress" || st == "open"
                } ?: 0
                announcementCount = ans.jsonArray.size
                recentAnnouncements = ans.jsonArray.mapNotNull { it as? JsonObject }.take(3)
                apiOk = true
                lastRefreshed = LocalDateTime.now()
            } catch (_: Exception) {
                apiOk = false
            } finally {
                loading = false
                refreshing = false
            }
        }
    }

    LaunchedEffect(Unit) { reload() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("KSYK Maps", fontWeight = FontWeight.SemiBold) },
                actions = {
                    IconButton(onClick = { refreshing = true; reload() }) {
                        Icon(Icons.Outlined.Refresh, contentDescription = "Reload")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
    ) { pad ->
        LazyColumn(
            Modifier.fillMaxSize().padding(pad),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (loading) {
                item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
            }

            // Greeting card — big gradient banner with signed-in email
            item {
                GreetingCard(
                    email = Api.sessionEmail ?: "guest",
                    apiOk = apiOk,
                    lastRefreshed = lastRefreshed,
                )
            }

            // Stats row — 4 cards in 2x2 grid
            item {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    StatCard(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Outlined.MeetingRoom,
                        value = rooms.toString(),
                        label = "ROOMS",
                        accent = Color(0xFF3B82F6),
                        onClick = onOpenRooms,
                    )
                    StatCard(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Outlined.Business,
                        value = buildings.toString(),
                        label = "BUILDINGS",
                        accent = Color(0xFF8B5CF6),
                        onClick = onOpenBuildings,
                    )
                }
            }
            item {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    StatCard(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Outlined.SupportAgent,
                        value = openTickets.toString(),
                        label = "OPEN TICKETS",
                        accent = Color(0xFFEF4444),
                    )
                    StatCard(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Outlined.Campaign,
                        value = announcementCount.toString(),
                        label = "ANNOUNCEMENTS",
                        accent = Color(0xFF10B981),
                        onClick = onOpenAnnouncements,
                    )
                }
            }

            // Quick actions
            item {
                Text(
                    "Quick actions",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp,
                    modifier = Modifier.padding(top = 8.dp, bottom = 4.dp),
                )
            }
            item {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    ActionTile(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Outlined.Search,
                        label = "Find a room",
                        onClick = onOpenRooms,
                    )
                    ActionTile(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Outlined.Wifi,
                        label = "Beacon survey",
                        onClick = onOpenBeacons,
                    )
                }
            }
            item {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    ActionTile(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Outlined.Campaign,
                        label = "Read news",
                        onClick = onOpenAnnouncements,
                    )
                    ActionTile(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Outlined.Person,
                        label = "Account",
                        onClick = onOpenAccount,
                    )
                }
            }

            // Recent announcements preview
            if (recentAnnouncements.isNotEmpty()) {
                item {
                    Text(
                        "Latest news",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 15.sp,
                        modifier = Modifier.padding(top = 12.dp, bottom = 4.dp),
                    )
                }
                items(recentAnnouncements) { a -> AnnouncementPreview(a, onOpenAnnouncements) }
            }
        }
    }
}

@Composable
private fun GreetingCard(email: String, apiOk: Boolean, lastRefreshed: LocalDateTime?) {
    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
    ) {
        Box(
            Modifier
                .fillMaxWidth()
                .background(
                    Brush.linearGradient(
                        listOf(Color(0xFF1E3A8A), Color(0xFF2563EB), Color(0xFF3B82F6))
                    )
                )
                .padding(20.dp),
        ) {
            Column {
                Text(
                    "Welcome back",
                    color = Color.White.copy(alpha = 0.85f),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    email,
                    color = Color.White,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.height(10.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(if (apiOk) Color(0xFF34D399) else Color(0xFFF59E0B))
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(
                        if (apiOk) "Connected to ksykmaps.fi" else "Server unreachable",
                        color = Color.White.copy(alpha = 0.9f),
                        fontSize = 12.sp,
                    )
                    if (lastRefreshed != null) {
                        Spacer(Modifier.width(8.dp))
                        Text(
                            "· ${lastRefreshed.format(DateTimeFormatter.ofPattern("HH:mm"))}",
                            color = Color.White.copy(alpha = 0.7f),
                            fontSize = 11.sp,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun StatCard(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    value: String,
    label: String,
    accent: Color,
    onClick: (() -> Unit)? = null,
) {
    val cardModifier = if (onClick != null) modifier.clickable { onClick() } else modifier
    Card(
        modifier = cardModifier.height(112.dp),
        shape = RoundedCornerShape(14.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(
            Modifier.padding(14.dp),
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(30.dp)
                        .clip(CircleShape)
                        .background(accent.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(icon, null, tint = accent, modifier = Modifier.size(18.dp))
                }
            }
            Column {
                Text(value, fontSize = 26.sp, fontWeight = FontWeight.Bold, color = accent)
                Text(
                    label,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun ActionTile(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
) {
    Card(
        modifier = modifier.clickable { onClick() }.height(72.dp),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.35f),
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Row(
            Modifier.fillMaxSize().padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Icon(icon, null, tint = MaterialTheme.colorScheme.primary)
            Text(label, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
        }
    }
}

@Composable
private fun AnnouncementPreview(a: JsonObject, onOpenAll: () -> Unit) {
    val title = (a["title"] as? JsonPrimitive)?.contentOrNull ?: "Untitled"
    val body = (a["content"] as? JsonPrimitive)?.contentOrNull
        ?: (a["body"] as? JsonPrimitive)?.contentOrNull
        ?: ""
    val type = (a["type"] as? JsonPrimitive)?.contentOrNull ?: "info"
    val accent = when (type.lowercase()) {
        "urgent"  -> Color(0xFFDC2626)
        "warning" -> Color(0xFFF59E0B)
        "event"   -> Color(0xFF8B5CF6)
        else      -> Color(0xFF2563EB)
    }
    Card(
        Modifier.fillMaxWidth().clickable { onOpenAll() },
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(Modifier.height(IntrinsicSize.Min)) {
            Box(Modifier.width(4.dp).fillMaxHeight().background(accent))
            Column(Modifier.padding(12.dp)) {
                Text(title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                if (body.isNotBlank()) {
                    Spacer(Modifier.height(2.dp))
                    Text(
                        body.take(120) + if (body.length > 120) "…" else "",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}
