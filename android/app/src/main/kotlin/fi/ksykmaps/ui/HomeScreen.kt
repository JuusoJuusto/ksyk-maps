package fi.ksykmaps.ui

import android.content.Context
import androidx.compose.foundation.Image
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
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import fi.ksykmaps.R
import fi.ksykmaps.data.Api
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*
import org.json.JSONArray
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

private val HOME_SUBJECT_PALETTE = listOf(
    0xFF3B82F6L, 0xFF8B5CF6L, 0xFF10B981L, 0xFFEF4444L,
    0xFFf59E0BL, 0xFF06B6D4L, 0xFFEC4899L, 0xFF84CC16L,
    0xFF6366F1L, 0xFFF97316L,
)
private fun homeSubjectColor(subject: String): Color {
    val idx = Math.abs(subject.trim().lowercase().hashCode()) % HOME_SUBJECT_PALETTE.size
    return Color(HOME_SUBJECT_PALETTE[idx])
}

private data class HomeTimetableLesson(
    val subject: String,
    val startHhmm: String,
    val endHhmm: String,
    val roomNumber: String,
    val roomId: String = "",
    val teacher: String = "",
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onOpenRooms: () -> Unit,
    onOpenBeacons: () -> Unit,
    onOpenAnnouncements: () -> Unit,
    onOpenAccount: () -> Unit,
    onOpenTimetable: () -> Unit = {},
    onOpenBuildings: () -> Unit = onOpenRooms,
    onOpenLunch: () -> Unit = {},
) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var rooms by remember { mutableStateOf(0) }
    var buildings by remember { mutableStateOf(0) }
    var announcementCount by remember { mutableStateOf(0) }
    var recentAnnouncements by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }
    var refreshing by remember { mutableStateOf(false) }
    var apiOk by remember { mutableStateOf(true) }
    var currentLesson by remember { mutableStateOf<HomeTimetableLesson?>(null) }
    var nextLesson by remember { mutableStateOf<HomeTimetableLesson?>(null) }
    var todaySchedule by remember { mutableStateOf<List<HomeTimetableLesson>>(emptyList()) }
    var hasWilmaSetup by remember { mutableStateOf(false) }

    fun reload() {
        loading = true
        scope.launch {
            try {
                val rs = withContext(Dispatchers.IO) { Api.get("/rooms") }
                val bs = withContext(Dispatchers.IO) { Api.get("/buildings") }
                val ans = withContext(Dispatchers.IO) { Api.get("/announcements?limit=20") }
                rooms = rs.jsonArray.size
                buildings = bs.jsonArray.size
                announcementCount = ans.jsonArray.size
                recentAnnouncements = ans.jsonArray.mapNotNull { it as? JsonObject }.take(3)
                apiOk = true
            } catch (_: Exception) {
                apiOk = false
            } finally {
                try {
                    val prefs = ctx.getSharedPreferences("ksyk_widget", Context.MODE_PRIVATE)
                    val json = prefs.getString("entries_json", "[]") ?: "[]"
                    val arr = JSONArray(json)
                    val fmt = DateTimeFormatter.ofPattern("HH:mm")
                    val now = LocalTime.now()
                    val todayDow = LocalDate.now().dayOfWeek.value
                    val allToday = (0 until arr.length()).mapNotNull { i ->
                        val o = arr.getJSONObject(i)
                        if (o.optInt("dayOfWeek") == todayDow) {
                            HomeTimetableLesson(
                                o.optString("subject"),
                                o.optString("startHhmm"),
                                o.optString("endHhmm"),
                                o.optString("roomNumber"),
                                o.optString("roomId"),
                                o.optString("teacher"),
                            )
                        } else null
                    }.sortedBy { it.startHhmm }
                    hasWilmaSetup = arr.length() > 0
                    todaySchedule = allToday
                    currentLesson = allToday.firstOrNull { e ->
                        val s = runCatching { LocalTime.parse(e.startHhmm, fmt) }.getOrNull() ?: return@firstOrNull false
                        val en = runCatching { LocalTime.parse(e.endHhmm, fmt) }.getOrNull() ?: return@firstOrNull false
                        !now.isBefore(s) && now.isBefore(en)
                    }
                    nextLesson = allToday.firstOrNull { e ->
                        val s = runCatching { LocalTime.parse(e.startHhmm, fmt) }.getOrNull() ?: return@firstOrNull false
                        now.isBefore(s)
                    }
                } catch (_: Exception) {}
                loading = false
                refreshing = false
            }
        }
    }

    LaunchedEffect(Unit) { reload() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Image(
                            painter = painterResource(id = R.drawable.ksykmaps_logo),
                            contentDescription = null,
                            modifier = Modifier.size(26.dp),
                        )
                        Spacer(Modifier.width(10.dp))
                        Text("KSYK Maps", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    }
                },
                actions = {
                    IconButton(onClick = { refreshing = true; reload() }) {
                        Icon(Icons.Outlined.Refresh, contentDescription = "Päivitä")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
    ) { pad ->
        // Hoist composable-only state above LazyColumn (LazyListScope is not composable).
        val timeFmt = remember { DateTimeFormatter.ofPattern("HH:mm") }
        val upcoming = remember(todaySchedule) {
            val nowTime = LocalTime.now()
            todaySchedule.filter { e ->
                val en = runCatching { LocalTime.parse(e.endHhmm, timeFmt) }.getOrNull() ?: return@filter false
                nowTime.isBefore(en)
            }
        }

        PullToRefreshBox(
            isRefreshing = refreshing,
            onRefresh = { refreshing = true; reload() },
            modifier = Modifier.fillMaxSize().padding(pad),
        ) {
            LazyColumn(
                Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (loading) {
                    item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
                }

                // ── Hero greeting ──────────────────────────────────────────────
                item { HeroCard(apiOk = apiOk) }

                // ── Current / next lesson ──────────────────────────────────────
                item {
                    LessonStatusCard(
                        current = currentLesson,
                        next = nextLesson,
                        hasWilmaSetup = hasWilmaSetup,
                        onOpenTimetable = onOpenTimetable,
                        onNavigate = { lesson ->
                            if (lesson.roomId.isNotBlank()) {
                                MapNavIntent.pendingRoomId = lesson.roomId
                                onOpenRooms()
                            }
                        },
                    )
                }

                // ── Today's remaining schedule (compact timeline) ──────────────
                if (upcoming.size > 1) {
                    item {
                        ScheduleStrip(
                            lessons = upcoming.take(5),
                            currentSubject = currentLesson?.subject,
                            onOpenTimetable = onOpenTimetable,
                        )
                    }
                }

                // ── Stats row ──────────────────────────────────────────────────
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        CompactStatCard(
                            modifier = Modifier.weight(1f),
                            icon = Icons.Outlined.MeetingRoom,
                            value = rooms.toString(),
                            label = "Luokat",
                            accent = Color(0xFF3B82F6),
                            onClick = onOpenRooms,
                        )
                        CompactStatCard(
                            modifier = Modifier.weight(1f),
                            icon = Icons.Outlined.Business,
                            value = buildings.toString(),
                            label = "Rakennukset",
                            accent = Color(0xFF8B5CF6),
                            onClick = onOpenBuildings,
                        )
                        CompactStatCard(
                            modifier = Modifier.weight(1f),
                            icon = Icons.Outlined.Campaign,
                            value = announcementCount.toString(),
                            label = "Uutiset",
                            accent = Color(0xFF10B981),
                            onClick = onOpenAnnouncements,
                        )
                    }
                }

                // ── Quick actions ──────────────────────────────────────────────
                item {
                    Text(
                        "Pikavalinnat",
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 4.dp, bottom = 2.dp),
                    )
                }
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        QuickTile(Modifier.weight(1f), Icons.Outlined.Place, "Kartta", Color(0xFF2563EB), onOpenRooms)
                        QuickTile(Modifier.weight(1f), Icons.Outlined.CalendarMonth, "Lukujärjestys", Color(0xFF8B5CF6), onOpenTimetable)
                    }
                }
                item {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        QuickTile(Modifier.weight(1f), Icons.Outlined.Restaurant, "Lounas", Color(0xFFEA580C), onOpenLunch)
                        QuickTile(Modifier.weight(1f), Icons.Outlined.Campaign, "Ilmoitukset", Color(0xFF10B981), onOpenAnnouncements)
                    }
                }

                // ── Recent announcements ───────────────────────────────────────
                if (recentAnnouncements.isNotEmpty()) {
                    item {
                        Text(
                            "Viimeisimmät uutiset",
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 4.dp, bottom = 2.dp),
                        )
                    }
                    items(recentAnnouncements) { a -> AnnouncementPreview(a, onOpenAnnouncements) }
                }

                item { Spacer(Modifier.height(16.dp)) }
            }
        }
    }
}

// ── Composables ─────────────────────────────────────────────────────────────

@Composable
private fun HeroCard(apiOk: Boolean) {
    val now = remember { LocalDateTime.now() }
    val dateLine = remember {
        val day = now.dayOfWeek.getDisplayName(TextStyle.FULL, Locale("fi"))
            .replaceFirstChar { it.uppercaseChar() }
        val dm = "${now.dayOfMonth}. ${now.month.getDisplayName(TextStyle.FULL, Locale("fi")).lowercase()} ${now.year}"
        "$day, $dm"
    }
    Box(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(
                Brush.linearGradient(listOf(Color(0xFF0F172A), Color(0xFF1E3A8A), Color(0xFF2563EB)))
            )
            .padding(20.dp),
    ) {
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(46.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.12f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.ksykmaps_logo),
                        contentDescription = null,
                        modifier = Modifier.size(32.dp),
                    )
                }
                Spacer(Modifier.width(14.dp))
                Column {
                    Text("KSYK Maps", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 19.sp)
                    Text("Kulosaaren yhteiskoulu", color = Color.White.copy(alpha = 0.65f), fontSize = 11.sp)
                }
            }
            Spacer(Modifier.height(18.dp))
            Text(dateLine, color = Color.White.copy(alpha = 0.9f), fontSize = 13.sp, fontWeight = FontWeight.Medium)
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(if (apiOk) Color(0xFF34D399) else Color(0xFFF59E0B))
                )
                Spacer(Modifier.width(7.dp))
                Text(
                    if (apiOk) "Yhteys kunnossa · ksykmaps.fi" else "Palvelin ei vastaa",
                    color = Color.White.copy(alpha = 0.8f),
                    fontSize = 12.sp,
                )
            }
        }
    }
}

@Composable
private fun LessonStatusCard(
    current: HomeTimetableLesson?,
    next: HomeTimetableLesson?,
    hasWilmaSetup: Boolean,
    onOpenTimetable: () -> Unit,
    onNavigate: (HomeTimetableLesson) -> Unit,
) {
    if (current == null && next == null) {
        if (!hasWilmaSetup) {
            Card(
                Modifier.fillMaxWidth().clickable { onOpenTimetable() },
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.45f)),
            ) {
                Row(
                    Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Outlined.CalendarMonth, null, tint = MaterialTheme.colorScheme.primary,
                             modifier = Modifier.size(22.dp))
                    }
                    Spacer(Modifier.width(14.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Tuo lukujärjestys", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Text("Avaa Lukujärjestys ja tuo Wilma-kalenteri", fontSize = 12.sp,
                             color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Icon(Icons.Outlined.ChevronRight, null,
                         tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp))
                }
            }
        } else {
            Card(
                Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
            ) {
                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.CheckCircle, null, tint = Color(0xFF10B981), modifier = Modifier.size(28.dp))
                    Spacer(Modifier.width(14.dp))
                    Column {
                        Text("Ei tunteja juuri nyt", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                        Text("Nauti vapaa-ajastasi!", fontSize = 12.sp,
                             color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
        return
    }

    val fmt = DateTimeFormatter.ofPattern("HH:mm")
    Card(
        Modifier.fillMaxWidth().clickable { onOpenTimetable() },
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            if (current != null) {
                val subColor = homeSubjectColor(current.subject)
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(subColor)
                                .padding(horizontal = 8.dp, vertical = 3.dp),
                        ) {
                            Text("NYT", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                        Spacer(Modifier.width(10.dp))
                        Text(current.subject, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    }
                    if (current.roomId.isNotBlank()) {
                        IconButton(onClick = { onNavigate(current) }, modifier = Modifier.size(34.dp)) {
                            Icon(Icons.Outlined.Navigation, "Navigoi", Modifier.size(18.dp),
                                 tint = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.Schedule, null, Modifier.size(14.dp),
                         tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.width(4.dp))
                    Text("${current.startHhmm}–${current.endHhmm}", fontSize = 13.sp,
                         color = MaterialTheme.colorScheme.onSurfaceVariant)
                    if (current.roomNumber.isNotBlank()) {
                        Text("  ·  Luokka ${current.roomNumber}", fontSize = 13.sp,
                             color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                // Progress bar — how far through the lesson we are
                val progress = remember(current.startHhmm, current.endHhmm) {
                    try {
                        val s = LocalTime.parse(current.startHhmm, fmt)
                        val e = LocalTime.parse(current.endHhmm, fmt)
                        val total = Duration.between(s, e).toMinutes().toFloat()
                        val elapsed = Duration.between(s, LocalTime.now()).toMinutes().toFloat()
                        (elapsed / total).coerceIn(0f, 1f)
                    } catch (_: Exception) { 0f }
                }
                LinearProgressIndicator(
                    progress = { progress },
                    modifier = Modifier.fillMaxWidth().height(4.dp).clip(RoundedCornerShape(2.dp)),
                    color = subColor,
                    trackColor = subColor.copy(alpha = 0.15f),
                )
            }
            if (next != null) {
                if (current != null) HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                            .padding(horizontal = 8.dp, vertical = 3.dp),
                    ) {
                        Text("SEURAAVA", color = MaterialTheme.colorScheme.onSurfaceVariant,
                             fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.width(10.dp))
                    Text(next.subject, fontWeight = FontWeight.SemiBold, fontSize = 14.sp,
                         modifier = Modifier.weight(1f))
                    Text(next.startHhmm, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    if (next.roomNumber.isNotBlank()) {
                        Text(" · ${next.roomNumber}", fontSize = 12.sp,
                             color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

@Composable
private fun ScheduleStrip(
    lessons: List<HomeTimetableLesson>,
    currentSubject: String?,
    onOpenTimetable: () -> Unit,
) {
    Card(
        Modifier.fillMaxWidth().clickable { onOpenTimetable() },
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Row(
                Modifier.fillMaxWidth().padding(bottom = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Tänään", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                Text("${lessons.size} tuntia", fontSize = 11.sp,
                     color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            lessons.forEach { lesson ->
                val isCurrent = lesson.subject == currentSubject
                val subColor = homeSubjectColor(lesson.subject)
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (isCurrent) subColor.copy(alpha = 0.1f) else Color.Transparent)
                        .padding(horizontal = 6.dp, vertical = 5.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        Modifier
                            .size(width = 3.dp, height = 28.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(subColor)
                    )
                    Spacer(Modifier.width(10.dp))
                    Text(
                        lesson.startHhmm,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.width(36.dp),
                    )
                    Column(Modifier.weight(1f)) {
                        Text(
                            lesson.subject,
                            fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Medium,
                            fontSize = 13.sp,
                        )
                        if (lesson.roomNumber.isNotBlank()) {
                            Text("Luokka ${lesson.roomNumber}", fontSize = 10.sp,
                                 color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    if (isCurrent) {
                        Box(
                            Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(subColor)
                                .padding(horizontal = 5.dp, vertical = 2.dp),
                        ) {
                            Text("NYT", color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CompactStatCard(
    modifier: Modifier,
    icon: ImageVector,
    value: String,
    label: String,
    accent: Color,
    onClick: (() -> Unit)? = null,
) {
    Card(
        modifier = modifier
            .then(if (onClick != null) Modifier.clickable { onClick() } else Modifier)
            .height(88.dp),
        shape = RoundedCornerShape(14.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(
            Modifier.fillMaxSize().padding(12.dp),
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            Icon(icon, null, tint = accent, modifier = Modifier.size(18.dp))
            Column {
                Text(value, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = accent)
                Text(label, fontSize = 9.sp, fontWeight = FontWeight.Bold,
                     color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun QuickTile(
    modifier: Modifier,
    icon: ImageVector,
    label: String,
    accent: Color,
    onClick: () -> Unit,
) {
    Card(
        modifier = modifier.clickable { onClick() }.height(64.dp),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = accent.copy(alpha = 0.1f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Row(
            Modifier.fillMaxSize().padding(horizontal = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Box(
                Modifier.size(32.dp).clip(CircleShape).background(accent.copy(alpha = 0.18f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, null, tint = accent, modifier = Modifier.size(17.dp))
            }
            Text(label, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
        }
    }
}

@Composable
private fun AnnouncementPreview(a: JsonObject, onOpenAll: () -> Unit) {
    val title = (a["title"] as? JsonPrimitive)?.contentOrNull ?: "Ilmoitus"
    val body = (a["content"] as? JsonPrimitive)?.contentOrNull
        ?: (a["body"] as? JsonPrimitive)?.contentOrNull ?: ""
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
