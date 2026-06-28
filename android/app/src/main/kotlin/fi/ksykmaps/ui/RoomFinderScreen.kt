package fi.ksykmaps.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import fi.ksykmaps.data.Api
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * Room finder — type to filter, tap a room to see its details. Same data
 * source as the desktop apps, so anything an admin saves on a laptop
 * appears here within a second.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoomFinderScreen() {
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
                rooms = result.jsonArray.mapNotNull { (it as? JsonObject) }
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
                else (it["roomNumber"]?.jsonPrimitive?.content ?: "").lowercase().contains(q)
                  || (it["name"]?.jsonPrimitive?.content ?: "").lowercase().contains(q)
            }
            .sortedBy { it["roomNumber"]?.jsonPrimitive?.content ?: "" }
    }

    Column(Modifier.fillMaxSize().padding(12.dp)) {
        Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            OutlinedTextField(
                value = query, onValueChange = { query = it },
                label = { Text("Find a room") },
                leadingIcon = { Icon(Icons.Outlined.Search, null) },
                modifier = Modifier.weight(1f),
                singleLine = true,
            )
            Spacer(Modifier.width(8.dp))
            IconButton(onClick = { reload() }) {
                Icon(Icons.Outlined.Refresh, contentDescription = "Reload")
            }
        }

        if (loading) {
            LinearProgressIndicator(Modifier.fillMaxWidth().padding(top = 8.dp))
        }
        error?.let {
            Card(Modifier.fillMaxWidth().padding(top = 8.dp)) {
                Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(12.dp))
            }
        }

        LazyColumn(Modifier.fillMaxSize().padding(top = 8.dp)) {
            items(filtered) { r ->
                ListItem(
                    headlineContent = { Text(r["roomNumber"]?.jsonPrimitive?.content ?: "—") },
                    supportingContent = { Text(r["name"]?.jsonPrimitive?.content ?: "") },
                    trailingContent = {
                        Text("F${r["floor"]?.jsonPrimitive?.content ?: "1"}",
                             style = MaterialTheme.typography.bodySmall)
                    },
                )
                Divider()
            }
        }
    }
}
