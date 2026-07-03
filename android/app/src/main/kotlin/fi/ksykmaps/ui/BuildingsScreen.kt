package fi.ksykmaps.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Business
import androidx.compose.material.icons.outlined.MeetingRoom
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
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
 * Buildings directory. Shows each campus wing/building with a live room
 * count that comes from cross-referencing /api/rooms.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BuildingsScreen() {
    val scope = rememberCoroutineScope()
    var buildings by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var roomCounts by remember { mutableStateOf<Map<String, Int>>(emptyMap()) }
    var loading by remember { mutableStateOf(true) }
    var refreshing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    fun reload() {
        loading = true; error = null
        scope.launch {
            try {
                val bs = withContext(Dispatchers.IO) { Api.get("/buildings") }
                val rs = withContext(Dispatchers.IO) { Api.get("/rooms") }
                buildings = bs.jsonArray.mapNotNull { it as? JsonObject }
                    .sortedBy { (it["name"] as? JsonPrimitive)?.contentOrNull ?: "" }
                val counts = mutableMapOf<String, Int>()
                for (r in rs.jsonArray) {
                    val obj = r as? JsonObject ?: continue
                    val bid = (obj["buildingId"] as? JsonPrimitive)?.contentOrNull ?: continue
                    counts[bid] = (counts[bid] ?: 0) + 1
                }
                roomCounts = counts
            } catch (e: Exception) { error = Api.friendly(e) }
            finally { loading = false; refreshing = false }
        }
    }
    LaunchedEffect(Unit) { reload() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Buildings", fontWeight = FontWeight.SemiBold) },
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
                if (loading && buildings.isEmpty()) LinearProgressIndicator(Modifier.fillMaxWidth())
                error?.let {
                    Card(
                        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
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

                LazyColumn(
                    Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(buildings) { b ->
                        BuildingCard(b, roomCounts[(b["id"] as? JsonPrimitive)?.contentOrNull ?: ""] ?: 0)
                    }
                }
            }
        }
    }
}

@Composable
private fun BuildingCard(b: JsonObject, roomCount: Int) {
    val name = (b["name"] as? JsonPrimitive)?.contentOrNull ?: "—"
    val type = (b["type"] as? JsonPrimitive)?.contentOrNull ?: ""
    val floors = (b["floors"] as? JsonPrimitive)?.contentOrNull ?: ""
    val address = (b["address"] as? JsonPrimitive)?.contentOrNull ?: ""
    val description = (b["description"] as? JsonPrimitive)?.contentOrNull ?: ""

    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(46.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Outlined.Business, null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(22.dp),
                    )
                }
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text(name, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                    if (type.isNotBlank() || address.isNotBlank()) {
                        Text(
                            listOfNotNull(
                                type.ifBlank { null },
                                address.ifBlank { null },
                            ).joinToString(" · "),
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
            if (description.isNotBlank()) {
                Spacer(Modifier.height(8.dp))
                Text(
                    description,
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Chip(
                    icon = Icons.Outlined.MeetingRoom,
                    text = "$roomCount rooms",
                )
                if (floors.isNotBlank()) {
                    Chip(text = "$floors floors")
                }
            }
        }
    }
}

@Composable
private fun Chip(
    icon: androidx.compose.ui.graphics.vector.ImageVector? = null,
    text: String,
) {
    Row(
        Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(horizontal = 10.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) {
            Icon(
                icon, null,
                modifier = Modifier.size(14.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.width(4.dp))
        }
        Text(
            text,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
