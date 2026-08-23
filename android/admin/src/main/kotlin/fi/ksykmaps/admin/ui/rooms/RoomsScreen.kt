package fi.ksykmaps.admin.ui.rooms

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import fi.ksykmaps.admin.data.AdminApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*

private data class AdminRoom(
    val id: String,
    val roomNumber: String,
    val name: String?,
    val floor: Int?,
    val type: String?,
    val capacity: Int?,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoomsScreen() {
    val scope = rememberCoroutineScope()
    var allRooms by remember { mutableStateOf<List<AdminRoom>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var refreshing by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }
    var floorFilter by remember { mutableStateOf<Int?>(null) }
    var typeFilter by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    suspend fun load() = withContext(Dispatchers.IO) {
        val data = AdminApi.get("/rooms") as? JsonArray ?: return@withContext
        allRooms = data.mapNotNull { el ->
            val o = el as? JsonObject ?: return@mapNotNull null
            AdminRoom(
                id         = (o["id"] as? JsonPrimitive)?.contentOrNull ?: return@mapNotNull null,
                roomNumber = (o["roomNumber"] as? JsonPrimitive)?.contentOrNull ?: "?",
                name       = (o["name"] as? JsonPrimitive)?.contentOrNull,
                floor      = (o["floor"] as? JsonPrimitive)?.intOrNull,
                type       = (o["type"] as? JsonPrimitive)?.contentOrNull,
                capacity   = (o["capacity"] as? JsonPrimitive)?.intOrNull,
            )
        }
    }

    LaunchedEffect(Unit) {
        try { load() } catch (e: Exception) { error = AdminApi.friendly(e) }
        loading = false
    }

    val floors = allRooms.mapNotNull { it.floor }.distinct().sorted()
    val types = allRooms.mapNotNull { it.type }.distinct().sorted()

    val displayed = allRooms.filter { room ->
        (query.isBlank() || room.roomNumber.contains(query, ignoreCase = true) || room.name?.contains(query, ignoreCase = true) == true) &&
        (floorFilter == null || room.floor == floorFilter) &&
        (typeFilter == null || room.type == typeFilter)
    }

    Scaffold(
        topBar = {
            Column {
                TopAppBar(title = {
                    Text("Rooms", fontWeight = FontWeight.SemiBold)
                }, actions = {
                    IconButton(onClick = { refreshing = true; scope.launch { try { load() } catch (e: Exception) { error = AdminApi.friendly(e) }; refreshing = false } }) {
                        Icon(Icons.Outlined.Refresh, "Refresh")
                    }
                })
                SearchBar(
                    inputField = {
                        SearchBarDefaults.InputField(
                            query = query,
                            onQueryChange = { query = it },
                            onSearch = {},
                            expanded = false,
                            onExpandedChange = {},
                            placeholder = { Text("Search rooms…") },
                            leadingIcon = { Icon(Icons.Outlined.Search, null) },
                            trailingIcon = if (query.isNotEmpty()) {{ IconButton(onClick = { query = "" }) { Icon(Icons.Outlined.Clear, null) } }} else null,
                        )
                    },
                    expanded = false,
                    onExpandedChange = {},
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp),
                    content = {},
                )
            }
        },
    ) { pad ->
        if (loading) { Box(Modifier.fillMaxSize().padding(pad), contentAlignment = Alignment.Center) { CircularProgressIndicator() }; return@Scaffold }

        PullToRefreshBox(isRefreshing = refreshing, onRefresh = {
            refreshing = true
            scope.launch { try { load() } catch (e: Exception) { error = AdminApi.friendly(e) }; refreshing = false }
        }) {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(pad),
                contentPadding = PaddingValues(12.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                // Filter chips
                if (floors.size > 1 || types.size > 1) {
                    item {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            FilterChip(selected = floorFilter == null && typeFilter == null, onClick = { floorFilter = null; typeFilter = null }, label = { Text("All") })
                            floors.take(5).forEach { f ->
                                FilterChip(selected = floorFilter == f, onClick = { floorFilter = if (floorFilter == f) null else f }, label = { Text("F$f") })
                            }
                        }
                    }
                }
                // Count
                item {
                    Text(
                        "${displayed.size} of ${allRooms.size} rooms",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                // Room list
                items(displayed, key = { it.id }) { room ->
                    RoomRow(room)
                }
                if (error != null) item {
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                        Text(error!!, Modifier.padding(12.dp), color = MaterialTheme.colorScheme.onErrorContainer)
                    }
                }
            }
        }
    }
}

@Composable
private fun RoomRow(room: AdminRoom) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Outlined.MeetingRoom, null, Modifier.size(20.dp), tint = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(room.roomNumber, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                if (!room.name.isNullOrBlank()) Text(room.name, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Column(horizontalAlignment = Alignment.End) {
                if (room.floor != null) Text("Floor ${room.floor}", style = MaterialTheme.typography.labelSmall)
                if (room.type != null) Text(room.type, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (room.capacity != null) Text("Cap: ${room.capacity}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
