package fi.ksykmaps.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Campaign
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import fi.ksykmaps.data.Api
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException

/**
 * Latest announcements from /api/announcements. Shows the title, body,
 * type chip (info / warning / urgent / event), and the start/end date
 * range when set.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AnnouncementsScreen() {
    val scope = rememberCoroutineScope()
    var items by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    fun reload() {
        loading = true; error = null
        scope.launch {
            try {
                val result = withContext(Dispatchers.IO) { Api.get("/announcements?limit=50") }
                items = result.jsonArray.mapNotNull { it as? JsonObject }
            } catch (e: Exception) { error = Api.friendly(e) }
            finally { loading = false }
        }
    }
    LaunchedEffect(Unit) { reload() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Announcements", fontWeight = FontWeight.SemiBold) },
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
        Column(
            Modifier.fillMaxSize().padding(pad),
        ) {
            if (loading) {
                LinearProgressIndicator(Modifier.fillMaxWidth())
            }
            error?.let {
                Card(
                    Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer,
                    ),
                ) {
                    Text(it, modifier = Modifier.padding(14.dp), fontSize = 13.sp)
                }
            }
            if (items.isEmpty() && !loading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Outlined.Campaign,
                            null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(48.dp),
                        )
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "No announcements yet",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            LazyColumn(
                Modifier.fillMaxSize().padding(horizontal = 14.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(vertical = 10.dp),
            ) {
                items(items) { a -> AnnouncementCard(a) }
            }
        }
    }
}

@Composable
private fun AnnouncementCard(a: JsonObject) {
    val title = (a["title"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull ?: ""
    val body = ((a["content"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull
        ?: (a["body"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull
        ?: "")
    val type = (a["type"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull ?: "info"
    val startDate = (a["startDate"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull
        ?: (a["startsAt"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull
    val endDate = (a["endDate"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull
        ?: (a["endsAt"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull
    val createdAt = (a["createdAt"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull

    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(Modifier.height(IntrinsicSize.Min)) {
            // Coloured accent strip on the left, colour-coded by type.
            Box(
                Modifier
                    .width(5.dp)
                    .fillMaxHeight()
                    .background(typeColor(type))
            )
            Column(Modifier.padding(14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        title.ifBlank { "Untitled" },
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp,
                        modifier = Modifier.weight(1f),
                    )
                    TypeChip(type)
                }
                if (body.isNotBlank()) {
                    Spacer(Modifier.height(6.dp))
                    Text(
                        body,
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                // Date range (start/end) or fallback to created date
                val rangeText = formatRange(startDate, endDate, createdAt)
                if (rangeText.isNotBlank()) {
                    Spacer(Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Outlined.CalendarMonth,
                            null,
                            modifier = Modifier.size(14.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Spacer(Modifier.width(4.dp))
                        Text(
                            rangeText,
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun TypeChip(type: String) {
    Box(
        Modifier
            .clip(RoundedCornerShape(6.dp))
            .background(typeColor(type).copy(alpha = 0.15f))
            .padding(horizontal = 8.dp, vertical = 3.dp),
    ) {
        Text(
            type.uppercase(),
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            color = typeColor(type),
        )
    }
}

private fun typeColor(type: String): Color = when (type.lowercase()) {
    "urgent"  -> Color(0xFFDC2626)
    "warning" -> Color(0xFFF59E0B)
    "event"   -> Color(0xFF8B5CF6)
    else      -> Color(0xFF2563EB)  // info / default
}

/**
 * Format a date range nicely:
 *   • Both start and end present → "1 Sep – 14 Sep 2026"
 *   • Start only                 → "From 1 Sep 2026"
 *   • End only                   → "Until 14 Sep 2026"
 *   • Neither, but createdAt     → "Posted 28 Jun 2026"
 */
private fun formatRange(start: String?, end: String?, created: String?): String {
    val s = parseDate(start)
    val e = parseDate(end)
    val c = parseDate(created)
    val fmt = DateTimeFormatter.ofPattern("d MMM yyyy")
    return when {
        s != null && e != null -> "${s.format(fmt)} – ${e.format(fmt)}"
        s != null              -> "From ${s.format(fmt)}"
        e != null              -> "Until ${e.format(fmt)}"
        c != null              -> "Posted ${c.format(fmt)}"
        else                   -> ""
    }
}

private fun parseDate(s: String?): LocalDate? {
    if (s == null || s.length < 10) return null
    return try { LocalDate.parse(s.substring(0, 10)) }
    catch (_: DateTimeParseException) { null }
}
