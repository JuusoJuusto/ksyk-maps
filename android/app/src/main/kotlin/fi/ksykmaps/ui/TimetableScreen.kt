package fi.ksykmaps.ui

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
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import android.content.Context
import fi.ksykmaps.data.Api
import com.posthog.PostHog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.*
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.*

@Serializable
data class ScheduleEntry(
    val id: String = UUID.randomUUID().toString(),
    val dayOfWeek: Int,     // 1=Mon … 5=Fri
    val startHhmm: String,  // "08:15"
    val endHhmm: String,    // "09:45"
    val subject: String,
    val roomId: String = "",
    val roomNumber: String = "",
    val teacher: String = "",
    val jaksoId: String = "all",  // "all" = every jakso; "j1"… = specific period
)

private fun todayDow(): Int = LocalDate.now().dayOfWeek.value // Mon=1, Sun=7

private val SUBJECT_PALETTE = listOf(
    0xFF3B82F6, 0xFF8B5CF6, 0xFF10B981, 0xFFEF4444,
    0xFFf59E0B, 0xFF06B6D4, 0xFFEC4899, 0xFF84CC16,
    0xFF6366F1, 0xFFF97316,
)
private fun subjectColor(subject: String): Color {
    val idx = Math.abs(subject.trim().lowercase().hashCode()) % SUBJECT_PALETTE.size
    return Color(SUBJECT_PALETTE[idx].toLong())
}

private fun nowHhmm(): String = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm"))

private fun formatJaksoDate(iso: String, lang: String): String {
    return try {
        val d = LocalDate.parse(iso)
        val loc = if (lang == "fi") Locale("fi") else Locale.ENGLISH
        d.format(DateTimeFormatter.ofPattern("d.M.", loc))
    } catch (_: Exception) { iso }
}

private fun hhmm(s: String): Int {
    val parts = s.split(":").mapNotNull { it.toIntOrNull() }
    return if (parts.size == 2) parts[0] * 60 + parts[1] else 0
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TimetableScreen(
    onNavigateToRoom: (roomId: String) -> Unit = {},
    onOpenWilmaConnect: () -> Unit = {},
) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()

    var entries by remember { mutableStateOf<List<ScheduleEntry>>(emptyList()) }
    var jaksot by remember { mutableStateOf<List<Jakso>>(emptyList()) }
    var selectedJaksoId by remember { mutableStateOf<String>("all") }
    var showAdd by remember { mutableStateOf(false) }
    var editEntry by remember { mutableStateOf<ScheduleEntry?>(null) }
    var rooms by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    val todayDow = remember { todayDow() }
    var selectedDow by remember { mutableIntStateOf(todayDow) }
    val isToday = selectedDow == todayDow
    val nowMins = hhmm(nowHhmm())
    val wilmaConnected = remember { mutableStateOf(getStoredWilmaUrl(ctx) != null) }
    val wilmaCount = remember { mutableStateOf(0) }

    LaunchedEffect(Unit) {
        entries = loadEntries(ctx)
        wilmaCount.value = entries.count { it.id.startsWith("wilma_") }
        val loadedJaksot = loadJaksot(ctx)
        jaksot = loadedJaksot
        // Auto-select the current active jakso; fall back to "all"
        selectedJaksoId = activeJaksoId(loadedJaksot) ?: loadedJaksot.firstOrNull()?.id ?: "all"
        try {
            val r = withContext(Dispatchers.IO) { Api.get("/rooms") }
            rooms = r.jsonArray.mapNotNull { it as? JsonObject }
        } catch (_: Exception) {
            rooms = (Api.getOffline("/rooms")?.jsonArray?.mapNotNull { it as? JsonObject }) ?: emptyList()
        }
    }

    val countByDow = remember(entries, selectedJaksoId) {
        entries
            .filter { selectedJaksoId == "all" || it.jaksoId == "all" || it.jaksoId == selectedJaksoId }
            .groupBy { it.dayOfWeek }
            .mapValues { it.value.size }
    }

    val dayEntries = entries
        .filter { it.dayOfWeek == selectedDow }
        .filter { selectedJaksoId == "all" || it.jaksoId == "all" || it.jaksoId == selectedJaksoId }
        .sortedBy { hhmm(it.startHhmm) }

    val currentEntry = if (isToday) dayEntries.firstOrNull { e ->
        hhmm(e.startHhmm) <= nowMins && nowMins < hhmm(e.endHhmm)
    } else null
    val nextEntry = if (isToday) dayEntries.firstOrNull { e ->
        hhmm(e.startHhmm) > nowMins
    } else null

    LanguageState.init(ctx); val lang = LanguageState.current ?: "fi"
    val loc = remember(lang) { if (lang == "fi") Locale("fi") else Locale.ENGLISH }
    val dayName = DayOfWeek.of(if (selectedDow in 1..7) selectedDow else 1)
        .getDisplayName(TextStyle.FULL, loc)

    Scaffold(
        containerColor = MaterialTheme.colorScheme.surface,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        if (lang == "fi") "Lukujärjestys" else "Timetable",
                        fontWeight = FontWeight.SemiBold,
                    )
                },
                actions = {
                    IconButton(onClick = onOpenWilmaConnect) {
                        Icon(
                            Icons.Outlined.CalendarMonth,
                            contentDescription = if (lang == "fi") "Wilma-kalenteri" else "Wilma calendar",
                        )
                    }
                    IconButton(onClick = { showAdd = true }) {
                        Icon(
                            Icons.Outlined.Add,
                            contentDescription = if (lang == "fi") "Lisää tunti" else "Add lesson",
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
    ) { pad ->
        // Hoisted composable state (LazyListScope is not composable)
        val activeJaksoIdComputed = remember(jaksot) { activeJaksoId(jaksot) }
        LazyColumn(
            Modifier.fillMaxSize().padding(pad),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Wilma calendar banner — compact, only when relevant
            if (!wilmaConnected.value) {
                item { WilmaConnectBanner(onConnect = onOpenWilmaConnect, lang = lang) }
            } else if (wilmaCount.value > 0) {
                item { WilmaLinkedChip(count = wilmaCount.value, onOpen = onOpenWilmaConnect, lang = lang) }
            }

            // Large date header — Apple Calendar style
            item {
                val today = LocalDate.now()
                val diff = selectedDow - todayDow
                val selectedDate = today.plusDays(diff.toLong())
                val monthDay = selectedDate.format(
                    DateTimeFormatter.ofPattern(
                        if (lang == "fi") "d. MMMM" else "MMMM d",
                        loc,
                    ),
                )
                Row(
                    Modifier.fillMaxWidth().padding(top = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(
                            dayName.replaceFirstChar { it.titlecase(loc) },
                            fontSize = 32.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface,
                            lineHeight = 36.sp,
                        )
                        Text(
                            monthDay,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Medium,
                            color = if (isToday) MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    if (!isToday) {
                        FilledTonalButton(
                            onClick = { selectedDow = todayDow },
                            shape = RoundedCornerShape(24.dp),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        ) {
                            Text(
                                if (lang == "fi") "Tänään" else "Today",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                }
            }

            // Day selector — pill row
            item {
                DaySelector(
                    selected = selectedDow,
                    today = todayDow,
                    onSelect = { selectedDow = it },
                    countByDow = countByDow,
                    lang = lang,
                )
            }

            // Jakso (period) selector — pill row underneath, if any exist
            if (jaksot.isNotEmpty()) {
                item {
                    JaksoSelector(
                        jaksot = jaksot,
                        selected = selectedJaksoId,
                        onSelect = { selectedJaksoId = it },
                        lang = lang,
                    )
                }
                val activeId = activeJaksoIdComputed
                val active = jaksot.firstOrNull { it.id == activeId }
                if (active != null) {
                    item {
                        Text(
                            if (lang == "fi")
                                "Nyt käynnissä: ${active.name} · ${formatJaksoDate(active.startDate, lang)} – ${formatJaksoDate(active.endDate, lang)}"
                            else
                                "Currently: ${active.name} · ${formatJaksoDate(active.startDate, lang)} – ${formatJaksoDate(active.endDate, lang)}",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(start = 2.dp),
                        )
                    }
                }
            }

            // Today at a glance — combined NOW/NEXT summary
            if (isToday && selectedDow in 1..5 && (currentEntry != null || nextEntry != null)) {
                item {
                    TodayGlanceCard(
                        current = currentEntry,
                        next = nextEntry,
                        nowMins = nowMins,
                        lang = lang,
                        onNavigate = { entry ->
                            if (entry.roomId.isNotBlank()) onNavigateToRoom(entry.roomId)
                        },
                    )
                }
            }

            // Timeline — Apple Calendar's day view: time on left, coloured event bar on right
            if (dayEntries.isNotEmpty()) {
                item {
                    Text(
                        if (isToday) (if (lang == "fi") "Aikataulu" else "Schedule")
                        else (if (lang == "fi") "Päivän tunnit" else "Day schedule"),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.padding(top = 4.dp, start = 2.dp),
                    )
                }
                items(dayEntries) { entry ->
                    TimelineRow(
                        entry = entry,
                        isCurrent = entry == currentEntry,
                        lang = lang,
                        onDelete = {
                            runCatching { PostHog.capture("timetable_entry_deleted", mapOf("entry_source" to if (entry.id.startsWith("wilma_")) "wilma" else "manual")) }
                            val updated = entries.filterNot { it.id == entry.id }
                            entries = updated
                            scope.launch { saveEntries(ctx, updated) }
                        },
                        onNavigate = {
                            if (entry.roomId.isNotBlank()) onNavigateToRoom(entry.roomId)
                        },
                        onEdit = { editEntry = entry },
                    )
                }
            } else if (selectedDow in 1..5) {
                item { EmptyState(lang = lang) }
            } else {
                item {
                    Card(
                        Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceContainerLow
                        ),
                        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                    ) {
                        Row(
                            Modifier.padding(20.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                Icons.Outlined.WbSunny, null,
                                tint = Color(0xFFF59E0B),
                                modifier = Modifier.size(24.dp),
                            )
                            Spacer(Modifier.width(14.dp))
                            Text(
                                if (lang == "fi") "Viikonloppu — nauti siitä" else "Weekend — enjoy it",
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 15.sp,
                            )
                        }
                    }
                }
            }

            item { Spacer(Modifier.height(24.dp)) }
        }
    }

    if (showAdd || editEntry != null) {
        AddEditDialog(
            rooms = rooms,
            jaksot = jaksot,
            defaultJaksoId = selectedJaksoId,
            existing = editEntry,
            lang = lang,
            onSave = { e ->
                val updated = if (editEntry != null) {
                    entries.map { if (it.id == editEntry!!.id) e else it }
                } else {
                    entries + e
                }
                entries = updated
                runCatching { PostHog.capture("timetable_entry_saved", mapOf("entry_action" to if (editEntry != null) "updated" else "created", "has_room" to e.roomId.isNotBlank(), "has_period" to (e.jaksoId != "all"))) }
                scope.launch { saveEntries(ctx, updated) }
                showAdd = false; editEntry = null
            },
            onDismiss = { showAdd = false; editEntry = null },
        )
    }
}

@Composable
private fun TodayGlanceCard(
    current: ScheduleEntry?,
    next: ScheduleEntry?,
    nowMins: Int,
    lang: String,
    onNavigate: (ScheduleEntry) -> Unit,
) {
    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            if (current != null) {
                val subColor = subjectColor(current.subject)
                val remaining = (hhmm(current.endHhmm) - nowMins).coerceAtLeast(0)
                Row(
                    Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.Top,
                ) {
                    Column(Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                Modifier
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(subColor)
                            )
                            Spacer(Modifier.width(6.dp))
                            Text(
                                if (lang == "fi") "Nyt käynnissä" else "In progress",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = subColor,
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(
                                if (lang == "fi") "$remaining min jäljellä" else "$remaining min left",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Spacer(Modifier.height(4.dp))
                        Text(
                            current.subject,
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp,
                        )
                        Spacer(Modifier.height(2.dp))
                        Text(
                            buildString {
                                append("${current.startHhmm}–${current.endHhmm}")
                                if (current.roomNumber.isNotBlank())
                                    append("  ·  ${if (lang == "fi") "Luokka" else "Room"} ${current.roomNumber}")
                                if (current.teacher.isNotBlank())
                                    append("  ·  ${current.teacher}")
                            },
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    if (current.roomId.isNotBlank()) {
                        Box(
                            Modifier
                                .size(44.dp)
                                .shadow(elevation = 4.dp, shape = CircleShape, clip = false)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primary)
                                .clickable { onNavigate(current) },
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                Icons.Outlined.Navigation, null,
                                Modifier.size(20.dp),
                                tint = MaterialTheme.colorScheme.onPrimary,
                            )
                        }
                    }
                }
                val progress: Float = run {
                    val total = (hhmm(current.endHhmm) - hhmm(current.startHhmm)).coerceAtLeast(1)
                    val elapsed = (nowMins - hhmm(current.startHhmm)).coerceAtLeast(0)
                    (elapsed.toFloat() / total).coerceIn(0f, 1f)
                }
                LinearProgressIndicator(
                    progress = { progress },
                    modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
                    color = subColor,
                    trackColor = subColor.copy(alpha = 0.12f),
                )
            }
            if (next != null) {
                if (current != null) {
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                }
                val countdown = (hhmm(next.startHhmm) - nowMins).coerceAtLeast(0)
                val countdownStr = when {
                    countdown == 0 -> if (lang == "fi") "alkaa nyt" else "starting now"
                    countdown < 60 -> if (lang == "fi") "${countdown} min päästä" else "in ${countdown} min"
                    else -> {
                        val h = countdown / 60; val m = countdown % 60
                        if (lang == "fi")
                            "${h}h${if (m > 0) " ${m}m" else ""} päästä"
                        else
                            "in ${h}h${if (m > 0) " ${m}m" else ""}"
                    }
                }
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.surfaceContainerHighest),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            Icons.Outlined.Schedule, null,
                            Modifier.size(18.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(
                            if (lang == "fi") "Seuraavaksi · $countdownStr" else "Up next · $countdownStr",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            next.subject,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                        )
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            next.startHhmm,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                        if (next.roomNumber.isNotBlank()) {
                            Text(
                                next.roomNumber,
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TimelineRow(
    entry: ScheduleEntry,
    isCurrent: Boolean,
    lang: String,
    onDelete: () -> Unit,
    onNavigate: () -> Unit,
    onEdit: () -> Unit,
) {
    val sColor = subjectColor(entry.subject)
    Row(
        Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top,
    ) {
        // Time column — Apple Calendar style, small and dim on the left
        Column(
            Modifier.width(56.dp).padding(top = 14.dp),
            horizontalAlignment = Alignment.End,
        ) {
            Text(
                entry.startHhmm,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = if (isCurrent) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.onSurface,
            )
            Text(
                entry.endHhmm,
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Spacer(Modifier.width(14.dp))
        // Event card
        Card(
            Modifier
                .weight(1f)
                .clickable { onEdit() },
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = if (isCurrent) sColor.copy(alpha = 0.12f)
                                 else MaterialTheme.colorScheme.surfaceContainerLow
            ),
            elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        ) {
            Row(
                Modifier.padding(14.dp).height(IntrinsicSize.Min),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Left color rail
                Box(
                    Modifier
                        .width(4.dp)
                        .fillMaxHeight()
                        .clip(RoundedCornerShape(2.dp))
                        .background(sColor)
                )
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        entry.subject,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Row(
                        Modifier.padding(top = 2.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        if (entry.roomNumber.isNotBlank()) {
                            Icon(
                                Icons.Outlined.MeetingRoom, null,
                                Modifier.size(12.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Spacer(Modifier.width(3.dp))
                            Text(
                                entry.roomNumber,
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        if (entry.teacher.isNotBlank()) {
                            if (entry.roomNumber.isNotBlank()) {
                                Text(
                                    " · ",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Text(
                                entry.teacher,
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
                if (entry.roomId.isNotBlank()) {
                    IconButton(
                        onClick = onNavigate,
                        modifier = Modifier.size(40.dp),
                    ) {
                        Icon(
                            Icons.Outlined.Navigation,
                            contentDescription = if (lang == "fi") "Navigoi" else "Navigate",
                            modifier = Modifier.size(20.dp),
                            tint = MaterialTheme.colorScheme.primary,
                        )
                    }
                }
                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.size(40.dp),
                ) {
                    Icon(
                        Icons.Outlined.Delete,
                        contentDescription = if (lang == "fi") "Poista" else "Delete",
                        modifier = Modifier.size(18.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

@Composable
private fun EmptyState(lang: String) {
    Column(
        Modifier.fillMaxWidth().padding(vertical = 40.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            Modifier
                .size(64.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.surfaceContainerLow),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Outlined.CalendarToday, null,
                modifier = Modifier.size(28.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Text(
            if (lang == "fi") "Ei tunteja tälle päivälle" else "No lessons for this day",
            color = MaterialTheme.colorScheme.onSurface,
            fontWeight = FontWeight.SemiBold,
            fontSize = 15.sp,
        )
        Text(
            if (lang == "fi") "Tuo Wilmasta tai paina + lisätäksesi käsin"
            else "Import from Wilma or tap + to add manually",
            fontSize = 13.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun JaksoSelector(
    jaksot: List<Jakso>,
    selected: String,
    onSelect: (String) -> Unit,
    lang: String,
) {
    val today = remember { LocalDate.now().toString() }
    Row(
        Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        jaksot.forEach { jakso ->
            val isCurrent = jakso.startDate <= today && today <= jakso.endDate
            val isSelected = selected == jakso.id
            Box(
                Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(
                        when {
                            isSelected && isCurrent -> MaterialTheme.colorScheme.primary
                            isSelected -> MaterialTheme.colorScheme.secondaryContainer
                            else -> MaterialTheme.colorScheme.surfaceContainerLow
                        }
                    )
                    .clickable { onSelect(jakso.id) }
                    .padding(horizontal = 14.dp, vertical = 8.dp),
            ) {
                Text(
                    if (isCurrent) "${jakso.name} · ${if (lang == "fi") "nyt" else "now"}" else jakso.name,
                    fontSize = 12.sp,
                    fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Medium,
                    color = when {
                        isSelected && isCurrent -> MaterialTheme.colorScheme.onPrimary
                        isSelected -> MaterialTheme.colorScheme.onSecondaryContainer
                        else -> MaterialTheme.colorScheme.onSurfaceVariant
                    },
                )
            }
        }
    }
}

@Composable
private fun DaySelector(
    selected: Int,
    today: Int,
    onSelect: (Int) -> Unit,
    countByDow: Map<Int, Int>,
    lang: String,
) {
    val labels = if (lang == "fi")
        listOf("Ma", "Ti", "Ke", "To", "Pe", "La", "Su")
    else
        listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
    val todayDate = remember { LocalDate.now() }
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        labels.forEachIndexed { i, label ->
            val dow = i + 1
            val diff = dow - todayDate.dayOfWeek.value
            val date = todayDate.plusDays(diff.toLong())
            val count = countByDow[dow] ?: 0
            val isSelected = selected == dow
            val isToday = dow == today
            Column(
                Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(14.dp))
                    .background(
                        when {
                            isSelected -> MaterialTheme.colorScheme.primary
                            isToday -> MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f)
                            else -> Color.Transparent
                        }
                    )
                    .clickable { onSelect(dow) }
                    .padding(vertical = 8.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(
                    label,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = when {
                        isSelected -> MaterialTheme.colorScheme.onPrimary
                        isToday -> MaterialTheme.colorScheme.primary
                        else -> MaterialTheme.colorScheme.onSurfaceVariant
                    },
                )
                Text(
                    date.dayOfMonth.toString(),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = when {
                        isSelected -> MaterialTheme.colorScheme.onPrimary
                        isToday -> MaterialTheme.colorScheme.primary
                        else -> MaterialTheme.colorScheme.onSurface
                    },
                )
                Box(
                    Modifier
                        .size(4.dp)
                        .clip(CircleShape)
                        .background(
                            if (count > 0)
                                (if (isSelected) MaterialTheme.colorScheme.onPrimary
                                 else MaterialTheme.colorScheme.primary).copy(alpha = 0.6f)
                            else Color.Transparent
                        )
                )
            }
        }
    }
}

@Composable
private fun WilmaConnectBanner(onConnect: () -> Unit, lang: String) {
    Card(
        onClick = onConnect,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Row(
            Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.18f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Outlined.CalendarMonth, null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(20.dp),
                )
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    if (lang == "fi") "Tuo Wilmasta" else "Import from Wilma",
                    fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                )
                Text(
                    if (lang == "fi") "Täytä lukujärjestys automaattisesti"
                    else "Auto-fill your timetable",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Icon(
                Icons.Outlined.ChevronRight, null,
                modifier = Modifier.size(20.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun WilmaLinkedChip(count: Int, onOpen: () -> Unit, lang: String) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable { onOpen() }
            .padding(horizontal = 4.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            Icons.Outlined.CheckCircle, null,
            modifier = Modifier.size(14.dp),
            tint = Color(0xFF10B981),
        )
        Spacer(Modifier.width(6.dp))
        Text(
            if (lang == "fi") "Wilma yhdistetty · $count tuntia"
            else "Wilma linked · $count lessons",
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.weight(1f))
        Icon(
            Icons.Outlined.ChevronRight, null,
            modifier = Modifier.size(14.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddEditDialog(
    rooms: List<JsonObject>,
    jaksot: List<Jakso>,
    defaultJaksoId: String,
    existing: ScheduleEntry?,
    lang: String,
    onSave: (ScheduleEntry) -> Unit,
    onDismiss: () -> Unit,
) {
    val DAYS = if (lang == "fi") listOf("Ma", "Ti", "Ke", "To", "Pe")
               else listOf("Mon", "Tue", "Wed", "Thu", "Fri")
    var day by remember { mutableStateOf(existing?.dayOfWeek ?: todayDow().coerceIn(1, 5)) }
    var start by remember { mutableStateOf(existing?.startHhmm ?: "08:15") }
    var end by remember { mutableStateOf(existing?.endHhmm ?: "09:45") }
    var subject by remember { mutableStateOf(existing?.subject ?: "") }
    var teacher by remember { mutableStateOf(existing?.teacher ?: "") }
    var jaksoId by remember { mutableStateOf(existing?.jaksoId ?: defaultJaksoId) }
    var selectedRoom by remember { mutableStateOf<JsonObject?>(
        existing?.roomId?.let { id -> rooms.firstOrNull { (it["id"] as? JsonPrimitive)?.contentOrNull == id } }
    ) }
    var roomSheet by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        shape = RoundedCornerShape(24.dp),
        title = {
            Text(
                if (existing != null) (if (lang == "fi") "Muokkaa tuntia" else "Edit lesson")
                else (if (lang == "fi") "Lisää tunti" else "Add lesson"),
                fontWeight = FontWeight.SemiBold,
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                // Day picker
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    DAYS.forEachIndexed { idx, label ->
                        val d = idx + 1
                        FilterChip(
                            selected = day == d,
                            onClick = { day = d },
                            label = { Text(label, fontSize = 12.sp) },
                            shape = RoundedCornerShape(12.dp),
                        )
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = start,
                        onValueChange = { start = it },
                        label = { Text(if (lang == "fi") "Alkaa" else "Start") },
                        placeholder = { Text("08:15") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                    )
                    OutlinedTextField(
                        value = end,
                        onValueChange = { end = it },
                        label = { Text(if (lang == "fi") "Loppuu" else "End") },
                        placeholder = { Text("09:45") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                    )
                }
                OutlinedTextField(
                    value = subject,
                    onValueChange = { subject = it },
                    label = { Text(if (lang == "fi") "Aine" else "Subject") },
                    placeholder = { Text(if (lang == "fi") "Matematiikka" else "Mathematics") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                )
                OutlinedTextField(
                    value = teacher,
                    onValueChange = { teacher = it },
                    label = { Text(if (lang == "fi") "Opettaja (valinnainen)" else "Teacher (optional)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                )
                if (jaksot.isNotEmpty()) {
                    Text(
                        if (lang == "fi") "Jakso" else "Period",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Row(
                        Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        FilterChip(
                            selected = jaksoId == "all",
                            onClick = { jaksoId = "all" },
                            label = { Text(if (lang == "fi") "Kaikki" else "All", fontSize = 11.sp) },
                            shape = RoundedCornerShape(12.dp),
                        )
                        jaksot.forEach { j ->
                            FilterChip(
                                selected = jaksoId == j.id,
                                onClick = { jaksoId = j.id },
                                label = { Text(j.name, fontSize = 11.sp) },
                                shape = RoundedCornerShape(12.dp),
                            )
                        }
                    }
                }
                OutlinedCard(
                    onClick = { roomSheet = true },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                ) {
                    Row(
                        Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Outlined.MeetingRoom, null, tint = MaterialTheme.colorScheme.primary)
                        Spacer(Modifier.width(10.dp))
                        val roomLabel = selectedRoom?.let {
                            val num = (it["roomNumber"] as? JsonPrimitive)?.contentOrNull ?: ""
                            val name = (it["name"] as? JsonPrimitive)?.contentOrNull ?: ""
                            val roomWord = if (lang == "fi") "Luokka" else "Room"
                            if (num.isNotBlank()) "$roomWord $num${if (name.isNotBlank()) " – $name" else ""}" else name
                        } ?: if (lang == "fi") "Valitse luokka (valinnainen)" else "Pick a room (optional)"
                        Text(
                            roomLabel,
                            fontSize = 13.sp,
                            color = if (selectedRoom == null)
                                MaterialTheme.colorScheme.onSurfaceVariant
                            else MaterialTheme.colorScheme.onSurface,
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (subject.isBlank() || start.isBlank() || end.isBlank()) return@Button
                    val roomId = (selectedRoom?.get("id") as? JsonPrimitive)?.contentOrNull ?: existing?.roomId ?: ""
                    val roomNum = (selectedRoom?.get("roomNumber") as? JsonPrimitive)?.contentOrNull ?: existing?.roomNumber ?: ""
                    onSave(
                        ScheduleEntry(
                            id = existing?.id ?: UUID.randomUUID().toString(),
                            dayOfWeek = day,
                            startHhmm = start,
                            endHhmm = end,
                            subject = subject.trim(),
                            roomId = roomId,
                            roomNumber = roomNum,
                            teacher = teacher.trim(),
                            jaksoId = jaksoId,
                        )
                    )
                },
                shape = RoundedCornerShape(24.dp),
            ) { Text(if (lang == "fi") "Tallenna" else "Save") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(if (lang == "fi") "Peruuta" else "Cancel")
            }
        },
    )

    if (roomSheet) {
        val filteredRooms = remember(query, rooms) {
            val q = query.lowercase()
            if (q.isBlank()) rooms else rooms.filter {
                val num = (it["roomNumber"] as? JsonPrimitive)?.contentOrNull ?: ""
                val name = (it["name"] as? JsonPrimitive)?.contentOrNull ?: ""
                num.lowercase().contains(q) || name.lowercase().contains(q)
            }
        }
        ModalBottomSheet(onDismissRequest = { roomSheet = false }) {
            Column(Modifier.padding(horizontal = 20.dp)) {
                Text(
                    if (lang == "fi") "Valitse luokka" else "Pick a room",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 20.sp,
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    placeholder = { Text(if (lang == "fi") "Hae" else "Search") },
                    leadingIcon = { Icon(Icons.Outlined.Search, null) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(16.dp),
                )
                Spacer(Modifier.height(8.dp))
                LazyColumn(Modifier.heightIn(max = 420.dp)) {
                    item {
                        ListItem(
                            headlineContent = { Text(if (lang == "fi") "Ei luokkaa" else "None") },
                            modifier = Modifier.clickable { selectedRoom = null; roomSheet = false },
                        )
                        HorizontalDivider()
                    }
                    items(filteredRooms) { r ->
                        val num = (r["roomNumber"] as? JsonPrimitive)?.contentOrNull ?: "—"
                        val name = (r["name"] as? JsonPrimitive)?.contentOrNull ?: ""
                        val floor = (r["floor"] as? JsonPrimitive)?.contentOrNull ?: "1"
                        ListItem(
                            headlineContent = { Text("${if (lang == "fi") "Luokka" else "Room"} $num") },
                            supportingContent = { if (name.isNotBlank()) Text(name, fontSize = 12.sp) },
                            trailingContent = {
                                Text(
                                    "${if (lang == "fi") "K" else "F"}$floor",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            },
                            modifier = Modifier.clickable { selectedRoom = r; roomSheet = false },
                        )
                        HorizontalDivider()
                    }
                }
            }
        }
    }
}
