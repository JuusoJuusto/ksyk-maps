package fi.ksykmaps.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.OpenInNew
import androidx.compose.material.icons.outlined.MeetingRoom
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.*
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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray

/**
 * Searchable list of every campus room. Tap a row to open the live web
 * map zoomed on that room.
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

    fun reload() {
        loading = true; error = null
        scope.launch {
            try {
                val result = withContext(Dispatchers.IO) { Api.get("/rooms") }
                rooms = result.jsonArray.mapNotNull { it as? JsonObject }
            } catch (e: Exception) { error = Api.friendly(e) }
            finally { loading = false }
        }
    }
    LaunchedEffect(Unit) { reload() }

    val filtered = remember(rooms, query) {
        val q = query.trim().lowercase()
        rooms
            .filter {
                if (q.isEmpty()) true
                else (it["roomNumber"] as? JsonPrimitive)?.contentOrNull?.lowercase()?.contains(q) == true
                  || (it["name"] as? JsonPrimitive)?.contentOrNull?.lowercase()?.contains(q) == true
                  || (it["type"] as? JsonPrimitive)?.contentOrNull?.lowercase()?.contains(q) == true
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
        Column(Modifier.fillMaxSize().padding(pad)) {
            // Search bar
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

            if (loading) LinearProgressIndicator(Modifier.fillMaxWidth())

            error?.let {
                Card(
                    Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer,
                    ),
                ) {
                    Text(it, modifier = Modifier.padding(14.dp), fontSize = 13.sp)
                }
            }

            // Count chip
            Text(
                "${filtered.size} room${if (filtered.size == 1) "" else "s"}",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp),
            )

            LazyColumn(
                Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                items(filtered) { r ->
                    RoomCard(r) {
                        val id = (r["id"] as? JsonPrimitive)?.contentOrNull
                        val uri = if (id != null) "https://ksykmaps.fi/?room=$id" else "https://ksykmaps.fi"
                        try {
                            ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(uri)))
                        } catch (_: Exception) { /* no browser */ }
                    }
                }
            }
        }
    }
}

@Composable
private fun RoomCard(r: JsonObject, onOpen: () -> Unit) {
    val num = (r["roomNumber"] as? JsonPrimitive)?.contentOrNull ?: "—"
    val name = (r["name"] as? JsonPrimitive)?.contentOrNull ?: ""
    val type = (r["type"] as? JsonPrimitive)?.contentOrNull ?: ""
    val floor = (r["floor"] as? JsonPrimitive)?.contentOrNull ?: ""
    val status = (r["currentStatus"] as? JsonPrimitive)?.contentOrNull ?: "unknown"

    Card(
        modifier = Modifier.fillMaxWidth().clickable { onOpen() },
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(
            Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // Coloured room-number badge
            Box(
                Modifier
                    .size(46.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Outlined.MeetingRoom,
                    null,
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
