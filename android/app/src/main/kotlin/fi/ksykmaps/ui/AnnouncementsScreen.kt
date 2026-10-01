package fi.ksykmaps.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Campaign
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import fi.ksykmaps.data.Api
import fi.ksykmaps.ui.components.SkeletonLine
import com.posthog.PostHog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AnnouncementsScreen() {
    val ctx = androidx.compose.ui.platform.LocalContext.current
    LanguageState.init(ctx); val lang = LanguageState.current ?: "fi"
    val scope = rememberCoroutineScope()
    var items by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var refreshing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var selectedForDetail by remember { mutableStateOf<JsonObject?>(null) }

    fun reload() {
        loading = true; error = null
        scope.launch {
            try {
                val result = withContext(Dispatchers.IO) { Api.get("/announcements?limit=50") }
                items = result.jsonArray.mapNotNull { it as? JsonObject }
            } catch (e: Exception) { error = Api.friendly(e) }
            finally { loading = false; refreshing = false }
        }
    }
    LaunchedEffect(Unit) { reload() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        if (lang == "fi") "Tiedotteet" else "Announcements",
                        fontWeight = FontWeight.SemiBold,
                    )
                },
                actions = {
                    IconButton(onClick = { reload() }) {
                        Icon(
                            Icons.Outlined.Refresh,
                            contentDescription = if (lang == "fi") "Päivitä" else "Reload",
                        )
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
                if (loading && items.isEmpty()) {
                    Column(
                        Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        repeat(4) {
                            Card(
                                Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                                ),
                                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                            ) {
                                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    SkeletonLine(fraction = 0.55f, heightDp = 14.dp)
                                    SkeletonLine(fraction = 0.95f, heightDp = 10.dp)
                                    SkeletonLine(fraction = 0.75f, heightDp = 10.dp)
                                }
                            }
                        }
                    }
                }
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
                            TextButton(onClick = { reload() }) {
                                Text(if (lang == "fi") "Yritä uudelleen" else "Try again")
                            }
                        }
                    }
                }

                if (items.isEmpty() && !loading && error == null) {
                    EmptyState(
                        icon = Icons.Outlined.Campaign,
                        title = if (lang == "fi") "Ei tiedotteita" else "No announcements",
                        message = if (lang == "fi")
                            "Kun koulu julkaisee uutisia, ne näkyvät täällä."
                        else
                            "When the school posts news, it'll show up here.",
                    )
                }

                LazyColumn(
                    Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(items) { a ->
                        AnnouncementCard(a, isFi = lang == "fi", onClick = {
                            val type = (a["type"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull ?: "info"
                            runCatching { PostHog.capture("announcement_opened", properties = mapOf("announcement_type" to type)) }
                            selectedForDetail = a
                        })
                    }
                }
            }
        }
    }

    selectedForDetail?.let { a ->
        AnnouncementDetailSheet(a, isFi = lang == "fi") { selectedForDetail = null }
    }
}

@Composable
private fun AnnouncementCard(a: JsonObject, isFi: Boolean = false, onClick: () -> Unit) {
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
        Modifier.fillMaxWidth().clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Row(Modifier.height(IntrinsicSize.Min)) {
            Box(Modifier.width(4.dp).fillMaxHeight().background(typeColor(type)))
            Column(Modifier.padding(14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        title.ifBlank { "—" },
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.weight(1f),
                    )
                    TypeChip(type)
                }
                if (body.isNotBlank()) {
                    Spacer(Modifier.height(6.dp))
                    Text(
                        if (body.length > 200) body.take(200) + "…" else body,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                val rangeText = formatRange(startDate, endDate, createdAt, isFi)
                if (rangeText.isNotBlank()) {
                    Spacer(Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Outlined.CalendarMonth, null,
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AnnouncementDetailSheet(a: JsonObject, isFi: Boolean = false, onDismiss: () -> Unit) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val title = (a["title"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull ?: "Untitled"
    val body = ((a["content"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull
        ?: (a["body"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull
        ?: "")
    val type = (a["type"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull ?: "info"
    val startDate = (a["startDate"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull
        ?: (a["startsAt"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull
    val endDate = (a["endDate"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull
        ?: (a["endsAt"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull
    val createdAt = (a["createdAt"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
    ) {
        Column(
            Modifier.padding(horizontal = 22.dp, vertical = 8.dp).verticalScroll(rememberScrollState()),
        ) {
            TypeChip(type)
            Spacer(Modifier.height(12.dp))
            Text(
                title,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
            )
            val range = formatRange(startDate, endDate, createdAt, isFi)
            if (range.isNotBlank()) {
                Spacer(Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Outlined.CalendarMonth, null,
                        modifier = Modifier.size(14.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(range, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Spacer(Modifier.height(18.dp))
            Text(body, fontSize = 15.sp, lineHeight = 22.sp)
            Spacer(Modifier.height(28.dp))
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

@Composable
private fun EmptyState(icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, message: String) {
    Column(
        Modifier.fillMaxSize().padding(40.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(icon, null, modifier = Modifier.size(52.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f))
        Spacer(Modifier.height(12.dp))
        Text(title, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        Spacer(Modifier.height(4.dp))
        Text(
            message,
            fontSize = 13.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        )
    }
}

private fun typeColor(type: String): Color = when (type.lowercase()) {
    "urgent"  -> Color(0xFFDC2626)
    "warning" -> Color(0xFFF59E0B)
    "event"   -> Color(0xFF8B5CF6)
    else      -> Color(0xFF003D82)
}

private fun formatRange(start: String?, end: String?, created: String?, isFi: Boolean): String {
    val s = parseDate(start)
    val e = parseDate(end)
    val c = parseDate(created)
    val fmt = DateTimeFormatter.ofPattern("d MMM yyyy")
    return when {
        s != null && e != null -> "${s.format(fmt)} – ${e.format(fmt)}"
        s != null              -> if (isFi) "Alkaen ${s.format(fmt)}" else "From ${s.format(fmt)}"
        e != null              -> if (isFi) "Asti ${e.format(fmt)}" else "Until ${e.format(fmt)}"
        c != null              -> if (isFi) "Julkaistu ${c.format(fmt)}" else "Posted ${c.format(fmt)}"
        else                   -> ""
    }
}

private fun parseDate(s: String?): LocalDate? {
    if (s == null || s.length < 10) return null
    return try { LocalDate.parse(s.substring(0, 10)) }
    catch (_: DateTimeParseException) { null }
}
