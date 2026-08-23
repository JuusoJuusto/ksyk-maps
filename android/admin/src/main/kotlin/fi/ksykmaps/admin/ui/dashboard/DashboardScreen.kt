package fi.ksykmaps.admin.ui.dashboard

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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import fi.ksykmaps.admin.data.AdminApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*

private data class DashboardState(
    val backendOk: Boolean? = null,
    val dbOk: Boolean? = null,
    val backendVersion: String? = null,
    val apiLatencyMs: Long? = null,
    val wifiFingerprints: Int? = null,
    val wifiReady: Boolean? = null,
    val roomCount: Int? = null,
    val userCount: Int? = null,
    val recentErrors: List<JsonObject> = emptyList(),
    val error: String? = null,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen() {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(DashboardState()) }
    var refreshing by remember { mutableStateOf(false) }

    suspend fun load() = coroutineScope {
        val t0 = System.currentTimeMillis()
        val healthJob = async(Dispatchers.IO) {
            runCatching {
                val h = AdminApi.get("/health") as? JsonObject
                Triple(
                    (h?.get("status") as? JsonPrimitive)?.contentOrNull != "error",
                    (h?.get("db") as? JsonPrimitive)?.booleanOrNull
                        ?: ((h?.get("database") as? JsonPrimitive)?.contentOrNull != "error"),
                    (h?.get("version") as? JsonPrimitive)?.contentOrNull,
                )
            }.getOrNull()
        }
        val wifiJob = async(Dispatchers.IO) {
            runCatching {
                val w = AdminApi.get("/wifi/status") as? JsonObject
                Pair(
                    (w?.get("fingerprintCount") as? JsonPrimitive)?.intOrNull
                        ?: (w?.get("count") as? JsonPrimitive)?.intOrNull,
                    (w?.get("ready") as? JsonPrimitive)?.booleanOrNull,
                )
            }.getOrNull()
        }
        val roomsJob = async(Dispatchers.IO) {
            runCatching { (AdminApi.get("/rooms") as? JsonArray)?.size }.getOrNull()
        }
        val usersJob = async(Dispatchers.IO) {
            runCatching { (AdminApi.get("/users") as? JsonArray)?.size }.getOrNull()
        }
        val logsJob = async(Dispatchers.IO) {
            runCatching {
                (AdminApi.get("/logs?limit=5&severity=error") as? JsonArray)
                    ?.mapNotNull { it as? JsonObject } ?: emptyList()
            }.getOrElse { emptyList() }
        }
        val latency = System.currentTimeMillis() - t0
        val health = healthJob.await()
        val wifi = wifiJob.await()
        state = DashboardState(
            backendOk = health?.first,
            dbOk = health?.second,
            backendVersion = health?.third,
            apiLatencyMs = latency,
            wifiFingerprints = wifi?.first,
            wifiReady = wifi?.second,
            roomCount = roomsJob.await(),
            userCount = usersJob.await(),
            recentErrors = logsJob.await(),
        )
    }

    LaunchedEffect(Unit) {
        runCatching { load() }.onFailure { state = state.copy(error = AdminApi.friendly(it as Exception)) }
    }

    PullToRefreshBox(
        isRefreshing = refreshing,
        onRefresh = {
            refreshing = true
            scope.launch {
                runCatching { load() }.onFailure { state = state.copy(error = AdminApi.friendly(it as Exception)) }
                refreshing = false
            }
        },
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Text("System Health", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(6.dp))
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        HealthRow(Icons.Outlined.Cloud,    "Backend",          state.backendOk)
                        HealthRow(Icons.Outlined.Storage,  "Database",         state.dbOk)
                        HealthRow(Icons.Outlined.Wifi,     "Wi-Fi Positioning",state.wifiReady)
                        HorizontalDivider()
                        MetricRow("Backend version", state.backendVersion ?: "—")
                        MetricRow("API latency",
                            if (state.apiLatencyMs != null) "${state.apiLatencyMs} ms" else "—",
                            tint = when {
                                (state.apiLatencyMs ?: 9999) < 300 -> MaterialTheme.colorScheme.secondary
                                (state.apiLatencyMs ?: 9999) < 800 -> MaterialTheme.colorScheme.tertiary
                                else -> MaterialTheme.colorScheme.error
                            }
                        )
                    }
                }
            }

            item {
                Spacer(Modifier.height(4.dp))
                Text("Wi-Fi Positioning", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(6.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    StatCard(
                        modifier = Modifier.weight(1f),
                        label = "Fingerprints",
                        value = state.wifiFingerprints?.toString() ?: "—",
                        icon = Icons.Outlined.Fingerprint,
                    )
                    StatCard(
                        modifier = Modifier.weight(1f),
                        label = "Status",
                        value = when (state.wifiReady) { true -> "Ready"; false -> "Not ready"; null -> "—" },
                        icon = Icons.Outlined.LocationOn,
                    )
                }
            }

            item {
                Spacer(Modifier.height(4.dp))
                Text("Campus Data", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(6.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    StatCard(Modifier.weight(1f), "Rooms",  state.roomCount?.toString() ?: "—", Icons.Outlined.MeetingRoom)
                    StatCard(Modifier.weight(1f), "Users",  state.userCount?.toString() ?: "—", Icons.Outlined.People)
                }
            }

            if (state.recentErrors.isNotEmpty()) {
                item {
                    Spacer(Modifier.height(4.dp))
                    Text("Recent Errors", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(6.dp))
                }
                items(state.recentErrors) { err -> ErrorRow(err); Spacer(Modifier.height(4.dp)) }
            }

            if (state.error != null) {
                item {
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Outlined.ErrorOutline, null, tint = MaterialTheme.colorScheme.error)
                            Spacer(Modifier.width(10.dp))
                            Text(state.error!!, color = MaterialTheme.colorScheme.onErrorContainer)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HealthRow(icon: ImageVector, label: String, ok: Boolean?) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, Modifier.size(18.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.width(10.dp))
            Text(label, style = MaterialTheme.typography.bodyMedium)
        }
        when (ok) {
            true  -> Badge(containerColor = MaterialTheme.colorScheme.secondary)  { Text("OK",    color = MaterialTheme.colorScheme.onSecondary) }
            false -> Badge(containerColor = MaterialTheme.colorScheme.error)       { Text("ERROR", color = MaterialTheme.colorScheme.onError) }
            null  -> Text("—", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun MetricRow(label: String, value: String, tint: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.onSurface) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = tint)
    }
}

@Composable
private fun StatCard(modifier: Modifier = Modifier, label: String, value: String, icon: ImageVector) {
    Card(modifier = modifier) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, null, Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.width(4.dp))
                Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(Modifier.height(4.dp))
            Text(value, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun ErrorRow(err: JsonObject) {
    val msg = (err["message"] as? JsonPrimitive)?.contentOrNull
        ?: (err["error"] as? JsonPrimitive)?.contentOrNull ?: "Error"
    val severity = (err["severity"] as? JsonPrimitive)?.contentOrNull ?: "error"
    val ts = (err["timestamp"] as? JsonPrimitive)?.contentOrNull
        ?: (err["createdAt"] as? JsonPrimitive)?.contentOrNull
    val requestId = (err["requestId"] as? JsonPrimitive)?.contentOrNull

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.35f)),
    ) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.Top) {
            Icon(Icons.Outlined.Warning, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(16.dp).padding(top = 2.dp))
            Spacer(Modifier.width(8.dp))
            Column(Modifier.weight(1f)) {
                Text(msg, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
                if (ts != null) Text(ts.take(19).replace("T", " "), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (requestId != null) Text("ID: $requestId", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Badge(containerColor = MaterialTheme.colorScheme.error) { Text(severity.uppercase(), style = MaterialTheme.typography.labelSmall) }
        }
    }
}
