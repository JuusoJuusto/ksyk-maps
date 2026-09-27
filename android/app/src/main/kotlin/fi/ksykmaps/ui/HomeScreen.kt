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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
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
    LanguageState.init(ctx); val lang = LanguageState.current ?: "fi"
    val scope = rememberCoroutineScope()
    var homeLayout by remember { mutableStateOf(HomeSectionPrefs.load(ctx)) }
    // Re-read section layout AND refresh the greeting time whenever the
    // screen resumes (e.g. user returns from Settings or the app comes
    // back from the background). DisposableEffect(Unit) only fires once;
    // LifecycleEventObserver fires on every ON_RESUME.
    var greetingTime by remember { mutableStateOf(java.time.LocalDateTime.now()) }
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                homeLayout = HomeSectionPrefs.load(ctx)
                greetingTime = java.time.LocalDateTime.now()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }
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
    var tomorrowSchedule by remember { mutableStateOf<List<HomeTimetableLesson>>(emptyList()) }
    var hasWilmaSetup by remember { mutableStateOf(false) }

    fun reload() {
        loading = true
        scope.launch {
            var loadOk = true
            try {
                val rs = withContext(Dispatchers.IO) { Api.get("/rooms") }
                rooms = rs.jsonArray.size
            } catch (_: Exception) { loadOk = false }
            try {
                val bs = withContext(Dispatchers.IO) { Api.get("/buildings") }
                buildings = bs.jsonArray.size
            } catch (_: Exception) { loadOk = false }
            try {
                val ans = withContext(Dispatchers.IO) { Api.get("/announcements?limit=20") }
                announcementCount = ans.jsonArray.size
                recentAnnouncements = ans.jsonArray.mapNotNull { it as? JsonObject }.take(3)
            } catch (_: Exception) { /* announcements are non-critical */ }
            apiOk = loadOk
            try {
                val prefs = ctx.getSharedPreferences("ksyk_widget", Context.MODE_PRIVATE)
                val json = prefs.getString("entries_json", "[]") ?: "[]"
                val arr = JSONArray(json)
                val fmt = DateTimeFormatter.ofPattern("HH:mm")
                val now = LocalTime.now()
                val today = LocalDate.now()
                val todayDow = today.dayOfWeek.value
                // Tomorrow in DayOfWeek values (1=Mon … 7=Sun, wraps Mon after Sun)
                val tomorrowDow = (todayDow % 7) + 1
                // Determine the currently active jakso. Only entries
                // whose jaksoId matches (or "all") should appear on
                // the dashboard — otherwise we'd stack lessons from
                // every period on today, which is what the user was
                // seeing when jakso-2 lessons showed up in jakso 1.
                val jaksot = try { loadJaksot(ctx) } catch (_: Exception) { emptyList() }
                val activeJakso = try { activeJaksoId(jaksot) } catch (_: Exception) { null }
                fun parseEntries(targetDow: Int) = (0 until arr.length()).mapNotNull { i ->
                    val o = arr.getJSONObject(i)
                    if (o.optInt("dayOfWeek") != targetDow) return@mapNotNull null
                    val entryJakso = o.optString("jaksoId", "all").ifBlank { "all" }
                    val jaksoOk = when {
                        entryJakso == "all" -> true
                        activeJakso == null -> true
                        else -> entryJakso == activeJakso
                    }
                    if (!jaksoOk) return@mapNotNull null
                    HomeTimetableLesson(
                        o.optString("subject"),
                        o.optString("startHhmm"),
                        o.optString("endHhmm"),
                        o.optString("roomNumber"),
                        o.optString("roomId"),
                        o.optString("teacher"),
                    )
                }.sortedBy { it.startHhmm }
                val allToday = parseEntries(todayDow)
                hasWilmaSetup = arr.length() > 0
                todaySchedule = allToday
                tomorrowSchedule = parseEntries(tomorrowDow)
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

    LaunchedEffect(Unit) { reload() }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.surface,
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
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                // Greeting header — Google Maps style: soft, big, personal
                item { GreetingHeader(now = greetingTime, apiOk = apiOk, lang = lang, onReload = { refreshing = true; reload() }) }

                if (loading) {
                    item {
                        LinearProgressIndicator(
                            Modifier.fillMaxWidth().clip(RoundedCornerShape(2.dp)),
                            trackColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
                        )
                    }
                }

                // Offline banner — shown when API failed
                if (!apiOk && !loading) {
                    item {
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(Color(0xFFF59E0B).copy(alpha = 0.12f))
                                .clickable { refreshing = true; reload() }
                                .padding(horizontal = 14.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(Icons.Outlined.CloudOff, null,
                                tint = Color(0xFFF59E0B), modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(10.dp))
                            Column(Modifier.weight(1f)) {
                                Text(
                                    if (lang == "fi") "Ei yhteyttä palvelimeen" else "No server connection",
                                    fontSize = 13.sp, fontWeight = FontWeight.SemiBold,
                                    color = Color(0xFFF59E0B),
                                )
                                Text(
                                    if (lang == "fi") "Näytetään välimuistista · Napauta päivittääksesi"
                                    else "Showing cached data · Tap to refresh",
                                    fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Icon(Icons.Outlined.Refresh, null,
                                tint = Color(0xFFF59E0B), modifier = Modifier.size(16.dp))
                        }
                    }
                }

                // v1.89.0 — sections rendered in user-configured order.
                // See HomeSectionPrefs / HomeSectionsScreen.
                val todayDone = hasWilmaSetup && upcoming.isEmpty()
                homeLayout.sections.forEach { (section, visible) ->
                    if (!visible) return@forEach
                    when (section) {
                        HomeSection.QUICK_ACTIONS -> item {
                            QuickChipRow(
                                lang = lang,
                                onOpenRooms = onOpenRooms,
                                onOpenBuildings = onOpenBuildings,
                                onOpenTimetable = onOpenTimetable,
                                onOpenLunch = onOpenLunch,
                                onOpenAnnouncements = onOpenAnnouncements,
                            )
                        }
                        HomeSection.LESSON_STATUS -> item {
                            LessonStatusCard(
                                current = currentLesson,
                                next = nextLesson,
                                hasWilmaSetup = hasWilmaSetup,
                                lang = lang,
                                onOpenTimetable = onOpenTimetable,
                                onNavigate = { lesson ->
                                    if (lesson.roomId.isNotBlank()) {
                                        MapNavIntent.pendingRoomId = lesson.roomId
                                        onOpenRooms()
                                    }
                                },
                            )
                        }
                        HomeSection.TODAY_SCHEDULE -> if (upcoming.size > 1) {
                            item { SectionLabel(if (lang == "fi") "Loput tunnit" else "Rest of your day") }
                            item {
                                ScheduleStrip(
                                    lessons = upcoming.take(5),
                                    currentSubject = currentLesson?.subject,
                                    lang = lang,
                                    onOpenTimetable = onOpenTimetable,
                                )
                            }
                        }
                        HomeSection.TOMORROW_PREVIEW -> {
                            if (todayDone && tomorrowSchedule.isNotEmpty()) {
                                item { SectionLabel(if (lang == "fi") "Huomenna" else "Tomorrow") }
                                item {
                                    ScheduleStrip(
                                        lessons = tomorrowSchedule.take(5),
                                        currentSubject = null,
                                        lang = lang,
                                        onOpenTimetable = onOpenTimetable,
                                    )
                                }
                            } else if (todayDone && hasWilmaSetup) {
                                item {
                                    Card(
                                        Modifier.fillMaxWidth(),
                                        shape = RoundedCornerShape(16.dp),
                                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                                        elevation = CardDefaults.cardElevation(0.dp),
                                    ) {
                                        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                                            Icon(
                                                Icons.Outlined.WbSunny, null,
                                                tint = Color(0xFFF59E0B),
                                                modifier = Modifier.size(20.dp),
                                            )
                                            Spacer(Modifier.width(12.dp))
                                            Text(
                                                if (lang == "fi") "Ei tunteja huomenna" else "No lessons tomorrow",
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.Medium,
                                                color = MaterialTheme.colorScheme.onSurface,
                                            )
                                        }
                                    }
                                }
                            }
                        }
                        HomeSection.CAMPUS_STATS -> {
                            item { SectionLabel(if (lang == "fi") "Kampus" else "Campus") }
                            item {
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    StatPill(
                                        modifier = Modifier.weight(1f),
                                        icon = Icons.Outlined.MeetingRoom,
                                        value = rooms.toString(),
                                        label = if (lang == "fi") "Luokat" else "Rooms",
                                        accent = Color(0xFF3B82F6),
                                        onClick = onOpenRooms,
                                    )
                                    StatPill(
                                        modifier = Modifier.weight(1f),
                                        icon = Icons.Outlined.Business,
                                        value = buildings.toString(),
                                        label = if (lang == "fi") "Rakennukset" else "Buildings",
                                        accent = Color(0xFF10B981),
                                        onClick = onOpenBuildings,
                                    )
                                    StatPill(
                                        modifier = Modifier.weight(1f),
                                        icon = Icons.Outlined.Campaign,
                                        value = announcementCount.toString(),
                                        label = if (lang == "fi") "Uutiset" else "News",
                                        accent = Color(0xFFF59E0B),
                                        onClick = onOpenAnnouncements,
                                    )
                                }
                            }
                        }
                        HomeSection.ANNOUNCEMENTS -> if (recentAnnouncements.isNotEmpty()) {
                            item {
                                Row(
                                    Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    SectionLabel(
                                        if (lang == "fi") "Uusimmat uutiset" else "Latest news",
                                        modifier = Modifier.weight(1f),
                                    )
                                    TextButton(
                                        onClick = onOpenAnnouncements,
                                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                                    ) {
                                        Text(
                                            if (lang == "fi") "Näytä kaikki" else "See all",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Medium,
                                        )
                                    }
                                }
                            }
                            items(recentAnnouncements) { a -> AnnouncementPreview(a, onOpenAnnouncements) }
                        }
                    }
                }

                item { Spacer(Modifier.height(24.dp)) }
            }
        }
    }
}

// ── Composables ─────────────────────────────────────────────────────────────

@Composable
private fun GreetingHeader(
    now: LocalDateTime,
    apiOk: Boolean,
    lang: String,
    onReload: () -> Unit,
) {
    val ctx = LocalContext.current
    val locale = remember(lang) { if (lang == "fi") Locale("fi") else Locale.ENGLISH }
    val userName = remember { getUserName(ctx) }
    val greeting = remember(lang, now.hour) {
        val h = now.hour
        val base = if (lang == "fi") when {
            h < 5  -> "Hyvää yötä"
            h < 11 -> "Hyvää huomenta"
            h < 17 -> "Hei"
            h < 22 -> "Hyvää iltaa"
            else   -> "Hyvää yötä"
        } else when {
            h < 5  -> "Good night"
            h < 12 -> "Good morning"
            h < 17 -> "Hello"
            h < 22 -> "Good evening"
            else   -> "Good night"
        }
        if (userName.isNotBlank()) "$base, $userName" else base
    }
    val dateLine = remember(locale) {
        val day = now.dayOfWeek.getDisplayName(TextStyle.FULL, locale)
            .replaceFirstChar { it.uppercase(locale) }
        val dm = if (lang == "fi")
            "${now.dayOfMonth}. ${now.month.getDisplayName(TextStyle.FULL, locale).lowercase()}"
        else
            "${now.month.getDisplayName(TextStyle.FULL, locale)} ${now.dayOfMonth}"
        "$day · $dm"
    }
    Row(
        Modifier.fillMaxWidth().padding(top = 24.dp, bottom = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(
                greeting,
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                lineHeight = 32.sp,
            )
            Spacer(Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    dateLine,
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (!apiOk) {
                    Spacer(Modifier.width(8.dp))
                    Box(
                        Modifier
                            .size(6.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFF59E0B))
                    )
                    Spacer(Modifier.width(4.dp))
                    Text(
                        if (lang == "fi") "Ei yhteyttä" else "Offline",
                        fontSize = 12.sp,
                        color = Color(0xFFF59E0B),
                        fontWeight = FontWeight.Medium,
                    )
                }
            }
        }
        // Circle logo/reload — Google Maps has an account avatar here
        Box(
            Modifier
                .size(44.dp)
                .shadow(elevation = 2.dp, shape = CircleShape, clip = false)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.surfaceContainerHigh)
                .clickable { onReload() },
            contentAlignment = Alignment.Center,
        ) {
            Image(
                painter = painterResource(id = R.drawable.ksykmaps_logo),
                contentDescription = null,
                modifier = Modifier.size(26.dp),
            )
        }
    }
}

@Composable
private fun QuickChipRow(
    lang: String,
    onOpenRooms: () -> Unit,
    onOpenBuildings: () -> Unit,
    onOpenTimetable: () -> Unit,
    onOpenLunch: () -> Unit,
    onOpenAnnouncements: () -> Unit,
) {
    // Two-row 4x2 quick tile grid — Google Maps' explore chip row + shortcut grid combined
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            ShortcutTile(
                modifier = Modifier.weight(1f),
                icon = Icons.Outlined.Place,
                label = if (lang == "fi") "Kartta" else "Map",
                accent = MaterialTheme.colorScheme.primary,
                onClick = onOpenBuildings,
            )
            ShortcutTile(
                modifier = Modifier.weight(1f),
                icon = Icons.Outlined.CalendarMonth,
                label = if (lang == "fi") "Tunnit" else "Timetable",
                accent = Color(0xFF8B5CF6),
                onClick = onOpenTimetable,
            )
            ShortcutTile(
                modifier = Modifier.weight(1f),
                icon = Icons.Outlined.Restaurant,
                label = if (lang == "fi") "Lounas" else "Lunch",
                accent = Color(0xFFEA580C),
                onClick = onOpenLunch,
            )
            ShortcutTile(
                modifier = Modifier.weight(1f),
                icon = Icons.Outlined.Campaign,
                label = if (lang == "fi") "Uutiset" else "News",
                accent = Color(0xFF10B981),
                onClick = onOpenAnnouncements,
            )
        }
    }
}

@Composable
private fun ShortcutTile(
    modifier: Modifier,
    icon: ImageVector,
    label: String,
    accent: Color,
    onClick: () -> Unit,
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .clickable { onClick() }
            .padding(vertical = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box(
            Modifier
                .size(52.dp)
                .clip(CircleShape)
                .background(accent.copy(alpha = 0.12f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, null, tint = accent, modifier = Modifier.size(24.dp))
        }
        Text(
            label,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
private fun SectionLabel(text: String, modifier: Modifier = Modifier) {
    Text(
        text,
        modifier = modifier.padding(top = 8.dp, bottom = 2.dp, start = 2.dp),
        fontSize = 13.sp,
        fontWeight = FontWeight.SemiBold,
        color = MaterialTheme.colorScheme.onSurface,
    )
}

@Composable
private fun LessonStatusCard(
    current: HomeTimetableLesson?,
    next: HomeTimetableLesson?,
    hasWilmaSetup: Boolean,
    lang: String = "fi",
    onOpenTimetable: () -> Unit,
    onNavigate: (HomeTimetableLesson) -> Unit,
) {
    if (current == null && next == null) {
        if (!hasWilmaSetup) {
            Card(
                Modifier.fillMaxWidth().clickable { onOpenTimetable() },
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.35f)
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
            ) {
                Row(
                    Modifier.padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.18f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            Icons.Outlined.CalendarMonth, null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(22.dp),
                        )
                    }
                    Spacer(Modifier.width(14.dp))
                    Column(Modifier.weight(1f)) {
                        Text(
                            if (lang == "fi") "Tuo lukujärjestys" else "Import your timetable",
                            fontWeight = FontWeight.SemiBold, fontSize = 15.sp,
                        )
                        Text(
                            if (lang == "fi") "Yhdistä Wilma-kalenteriin"
                            else "Connect your Wilma calendar",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Icon(
                        Icons.Outlined.ChevronRight, null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp),
                    )
                }
            }
        } else {
            Card(
                Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
            ) {
                Row(Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF10B981).copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            Icons.Outlined.CheckCircle, null,
                            tint = Color(0xFF10B981),
                            modifier = Modifier.size(22.dp),
                        )
                    }
                    Spacer(Modifier.width(14.dp))
                    Column {
                        Text(
                            if (lang == "fi") "Ei tunteja juuri nyt" else "No lessons right now",
                            fontWeight = FontWeight.SemiBold, fontSize = 15.sp,
                        )
                        Text(
                            if (lang == "fi") "Nauti vapaa-ajastasi" else "Enjoy your free time",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
        return
    }

    val fmt = DateTimeFormatter.ofPattern("HH:mm")
    Card(
        Modifier.fillMaxWidth().clickable { onOpenTimetable() },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            if (current != null) {
                val subColor = homeSubjectColor(current.subject)
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
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
                                if (lang == "fi") "Nyt käynnissä" else "Now",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = subColor,
                            )
                        }
                        Spacer(Modifier.height(4.dp))
                        Text(
                            current.subject,
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                        Spacer(Modifier.height(2.dp))
                        Text(
                            buildString {
                                append("${current.startHhmm}–${current.endHhmm}")
                                if (current.roomNumber.isNotBlank()) {
                                    append("  ·  ${if (lang == "fi") "Luokka" else "Room"} ${current.roomNumber}")
                                }
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
                                Icons.Outlined.Navigation,
                                if (lang == "fi") "Navigoi" else "Navigate",
                                Modifier.size(20.dp),
                                tint = MaterialTheme.colorScheme.onPrimary,
                            )
                        }
                    }
                }
                // Progress bar
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
                    modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
                    color = subColor,
                    trackColor = subColor.copy(alpha = 0.12f),
                )
            }
            if (next != null) {
                if (current != null) {
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
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
                            if (lang == "fi") "Seuraavaksi" else "Up next",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            next.subject,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            next.startHhmm,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface,
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
private fun ScheduleStrip(
    lessons: List<HomeTimetableLesson>,
    currentSubject: String?,
    lang: String = "fi",
    onOpenTimetable: () -> Unit,
) {
    Card(
        Modifier.fillMaxWidth().clickable { onOpenTimetable() },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(Modifier.padding(vertical = 12.dp, horizontal = 8.dp)) {
            lessons.forEachIndexed { i, lesson ->
                val isCurrent = lesson.subject == currentSubject
                val subColor = homeSubjectColor(lesson.subject)
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(if (isCurrent) subColor.copy(alpha = 0.08f) else Color.Transparent)
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    // Time on the left, Apple-Calendar style
                    Text(
                        lesson.startHhmm,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.width(48.dp),
                    )
                    // Color rail
                    Box(
                        Modifier
                            .size(width = 3.dp, height = 32.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(subColor)
                    )
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(
                            lesson.subject,
                            fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Medium,
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                        if (lesson.roomNumber.isNotBlank()) {
                            Text(
                                "${if (lang == "fi") "Luokka" else "Room"} ${lesson.roomNumber}",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                    if (isCurrent) {
                        Box(
                            Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(subColor)
                        )
                    }
                }
                if (i < lessons.lastIndex) {
                    HorizontalDivider(
                        Modifier.padding(start = 72.dp),
                        color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.2f),
                    )
                }
            }
        }
    }
}

@Composable
private fun StatPill(
    modifier: Modifier,
    icon: ImageVector,
    value: String,
    label: String,
    accent: Color = MaterialTheme.colorScheme.primary,
    onClick: (() -> Unit)? = null,
) {
    Card(
        modifier = modifier
            .then(if (onClick != null) Modifier.clickable { onClick() } else Modifier),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(
            Modifier.fillMaxWidth().padding(vertical = 14.dp, horizontal = 12.dp),
            horizontalAlignment = Alignment.Start,
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Box(
                Modifier
                    .size(34.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(accent.copy(alpha = 0.13f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(icon, null, tint = accent, modifier = Modifier.size(18.dp))
            }
            Text(
                value,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                label,
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun AnnouncementPreview(a: JsonObject, onOpenAll: () -> Unit) {
    val ctx = LocalContext.current
    LanguageState.init(ctx); val lang = LanguageState.current ?: "fi"
    val title = (a["title"] as? JsonPrimitive)?.contentOrNull
        ?: (if (lang == "fi") "Ilmoitus" else "Announcement")
    val body = (a["content"] as? JsonPrimitive)?.contentOrNull
        ?: (a["body"] as? JsonPrimitive)?.contentOrNull ?: ""
    val type = (a["type"] as? JsonPrimitive)?.contentOrNull ?: "info"
    val accent = when (type.lowercase()) {
        "urgent"  -> Color(0xFFDC2626)
        "warning" -> Color(0xFFF59E0B)
        "event"   -> Color(0xFF8B5CF6)
        else      -> MaterialTheme.colorScheme.primary
    }
    Card(
        Modifier.fillMaxWidth().clickable { onOpenAll() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
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
                    .background(accent.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Outlined.Campaign, null,
                    tint = accent,
                    modifier = Modifier.size(20.dp),
                )
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    title,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                if (body.isNotBlank()) {
                    Spacer(Modifier.height(2.dp))
                    Text(
                        body.take(80) + if (body.length > 80) "…" else "",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                    )
                }
            }
            Icon(
                Icons.Outlined.ChevronRight, null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                modifier = Modifier.size(20.dp),
            )
        }
    }
}
