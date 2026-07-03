package fi.ksykmaps.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.OpenInNew
import androidx.compose.material.icons.outlined.MeetingRoom
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Share
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
import fi.ksykmaps.data.Api
import fi.ksykmaps.ui.components.SkeletonRoomCard
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray

/**
 * Searchable room list. Type-filter chips across the top let the user
 * quickly narrow by classroom / hallway / lab etc. Tap a card to open a
 * detail bottom sheet with all the metadata + share + open-in-map buttons.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoomFinderScreen() {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var rooms by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var query by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(true) }
    var refreshing by remember { mutableStateOf(false) }
    var typeFilter by remember { mutableStateOf<String?>(null) }
    var selected by remember { mutableStateOf<JsonObject?>(null) }

    fun reload() {
        loading = true; error = null
        scope.launch {
            try {
                val result = withContext(Dispatchers.IO) { Api.get("/rooms") }
                rooms = result.jsonArray.mapNotNull { it as? JsonObject }
            } catch (e: Exception) { error = Api.friendly(e) }
            finally { loading = false; refreshing = false }
        }
    }
    LaunchedEffect(Unit) { reload() }

    // Type set for filter chips
    val availableTypes = remember(rooms) {
        rooms.mapNotNull { (it["type"] as? JsonPrimitive)?.contentOrNull }
            .filter { it.isNotBlank() }
            .distinct()
            .sorted()
    }

    val filtered = remember(rooms, query, typeFilter) {
        val q = query.trim().lowercase()
        rooms
            .filter { r -> typeFilter == null || (r["type"] as? JsonPrimitive)?.contentOrNull == typeFilter }
            .filter { r ->
                if (q.isEmpty()) true
                else (r["roomNumber"] as? JsonPrimitive)?.contentOrNull?.lowercase()?.contains(q) == true
                  || (r["name"] as? JsonPrimitive)?.contentOrNull?.lowercase()?.contains(q) == true
                  || (r["type"] as? JsonPrimitive)?.contentOrNull?.lowercase()?.contains(q) == true
            }
            .sortedBy { (it["roomNumber"] as? JsonPrimitive)?.contentOrNull ?: "" }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Find a room", fontWeight = FontWeight.SemiBold) },
                actions = {
                    IconButton(onClick = { reload() }) {
                        Icon(Icons.Outlined.Refresh, contentDescription = "Reload")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
    ) { pad ->
        PullToRefreshBox(
            isRefreshing = refreshing,
            onRefresh = { refreshing = true; reload() },
            modifier = Modifier.fillMaxSize().padding(pad),
        ) {
            Column(Modifier.fillMaxSize()) {
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    placeholder = { Text("Search by number, name or type") },
                    leadingIcon = { Icon(Icons.Outlined.Search, null) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                )

                // Type filter chips
                if (availableTypes.isNotEmpty()) {
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState())
                            .padding(horizontal = 12.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        FilterChip(
                            selected = typeFilter == null,
                            onClick = { typeFilter = null },
                            label = { Text("All") },
                        )
                        availableTypes.forEach { t ->
                            FilterChip(
                                selected = typeFilter == t,
                                onClick = { typeFilter = if (typeFilter == t) null else t },
                                label = { Text(t) },
                            )
                        }
                    }
                }

                if (loading && rooms.isEmpty()) {
                    // Skeleton list instead of a progress bar — feels
                    // more like content is on the way.
                    Column(
                        Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 4.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        repeat(6) { SkeletonRoomCard() }
                    }
                }
                error?.let {
                    Card(
                        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer,
                        ),
                    ) {
                        Column(Modifier.padding(14.dp)) {
                            Text(it, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                            Spacer(Modifier.height(6.dp))
                            TextButton(onClick = { reload() }) { Text("Try again") }
                        }
                    }
                }

                Text(
                    "${filtered.size} room${if (filtered.size == 1) "" else "s"}",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp),
                )

                if (filtered.isEmpty() && !loading) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(
                            "Nothing matches your search.",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }

                LazyColumn(
                    Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 4.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    items(filtered) { r -> RoomCard(r) { selected = r } }
                }
            }
        }
    }

    selected?.let { r ->
        RoomDetailSheet(r, onDismiss = { selected = null }) {
            val id = (r["id"] as? JsonPrimitive)?.contentOrNull
            val uri = if (id != null) "https://ksykmaps.fi/?room=$id" else "https://ksykmaps.fi"
            try { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(uri))) } catch (_: Exception) { }
            selected = null
        }
    }
}

@Composable
private fun RoomCard(r: JsonObject, onClick: () -> Unit) {
    val num = (r["roomNumber"] as? JsonPrimitive)?.contentOrNull ?: "—"
    val name = (r["name"] as? JsonPrimitive)?.contentOrNull ?: ""
    val type = (r["type"] as? JsonPrimitive)?.contentOrNull ?: ""
    val floor = (r["floor"] as? JsonPrimitive)?.contentOrNull ?: ""
    val status = (r["currentStatus"] as? JsonPrimitive)?.contentOrNull ?: "unknown"

    Card(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(
            Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(
                Modifier
                    .size(46.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Outlined.MeetingRoom, null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(24.dp),
                )
            }
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(num, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    if (floor.isNotBlank()) {
                        Spacer(Modifier.width(8.dp))
                        Box(
                            Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(MaterialTheme.colorScheme.surfaceVariant)
                                .padding(horizontal = 6.dp, vertical = 2.dp),
                        ) {
                            Text(
                                "F$floor",
                                fontSize = 10.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                    if (status.isNotBlank() && status != "unknown") {
                        Spacer(Modifier.width(6.dp))
                        StatusDot(status)
                    }
                }
                if (name.isNotBlank()) {
                    Text(
                        name,
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (type.isNotBlank()) {
                    Text(
                        type,
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                    )
                }
            }
            Icon(
                Icons.AutoMirrored.Outlined.OpenInNew,
                contentDescription = "Open on map",
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(18.dp),
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RoomDetailSheet(r: JsonObject, onDismiss: () -> Unit, onOpenInMap: () -> Unit) {
    val ctx = LocalContext.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val num = (r["roomNumber"] as? JsonPrimitive)?.contentOrNull ?: "—"
    val name = (r["name"] as? JsonPrimitive)?.contentOrNull ?: ""
    val type = (r["type"] as? JsonPrimitive)?.contentOrNull ?: ""
    val floor = (r["floor"] as? JsonPrimitive)?.contentOrNull ?: ""
    val status = (r["currentStatus"] as? JsonPrimitive)?.contentOrNull ?: "unknown"
    val id = (r["id"] as? JsonPrimitive)?.contentOrNull ?: ""

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(Modifier.padding(horizontal = 24.dp, vertical = 4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(56.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Outlined.MeetingRoom, null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(28.dp),
                    )
                }
                Spacer(Modifier.width(14.dp))
                Column {
                    Text("Room $num", fontWeight = FontWeight.Bold, fontSize = 22.sp)
                    if (name.isNotBlank()) {
                        Text(
                            name,
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            Spacer(Modifier.height(20.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (floor.isNotBlank()) InfoChip("Floor $floor")
                if (type.isNotBlank()) InfoChip(type)
                if (status.isNotBlank() && status != "unknown") StatusDot(status)
            }

            Spacer(Modifier.height(20.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                Button(
                    onClick = onOpenInMap,
                    modifier = Modifier.weight(1f).height(48.dp),
                    shape = RoundedCornerShape(10.dp),
                ) {
                    Icon(Icons.AutoMirrored.Outlined.OpenInNew, null)
                    Spacer(Modifier.width(6.dp))
                    Text("Open on map", fontWeight = FontWeight.SemiBold)
                }
                OutlinedButton(
                    onClick = {
                        val share = Intent(Intent.ACTION_SEND).apply {
                            setType("text/plain")
                            putExtra(Intent.EXTRA_TEXT, "Room $num · https://ksykmaps.fi/?room=$id")
                        }
                        try { ctx.startActivity(Intent.createChooser(share, "Share room")) } catch (_: Exception) { }
                    },
                    modifier = Modifier.height(48.dp),
                    shape = RoundedCornerShape(10.dp),
                ) {
                    Icon(Icons.Outlined.Share, contentDescription = "Share")
                }
            }
            Spacer(Modifier.height(28.dp))
        }
    }
}

@Composable
private fun InfoChip(text: String) {
    Box(
        Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(horizontal = 10.dp, vertical = 4.dp),
    ) {
        Text(
            text,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun StatusDot(status: String) {
    val color = when (status.lowercase()) {
        "available" -> Color(0xFF16A34A)
        "occupied"  -> Color(0xFFDC2626)
        "busy"      -> Color(0xFFF59E0B)
        else        -> Color.Gray
    }
    Row(
        Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(color.copy(alpha = 0.15f))
            .padding(horizontal = 6.dp, vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(6.dp).clip(CircleShape).background(color))
        Spacer(Modifier.width(4.dp))
        Text(status, fontSize = 10.sp, color = color, fontWeight = FontWeight.SemiBold)
    }
}
