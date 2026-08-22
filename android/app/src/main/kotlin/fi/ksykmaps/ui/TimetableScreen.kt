package fi.ksykmaps.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
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
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import android.content.Context
import fi.ksykmaps.data.Api
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.*
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.*

// DataStore for persisting the user's personal timetable.
private val Context.scheduleStore: DataStore<Preferences> by preferencesDataStore(name = "ksyk_schedule")
private val SCHEDULE_KEY = stringPreferencesKey("entries")

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
)

private val kotlinJson = Json { ignoreUnknownKeys = true }

private suspend fun loadEntries(ctx: Context): List<ScheduleEntry> {
    val pref = ctx.scheduleStore.data.first()[SCHEDULE_KEY] ?: return emptyList()
    return try {
        kotlinJson.decodeFromString<List<ScheduleEntry>>(pref)
    } catch (_: Exception) { emptyList() }
}

private suspend fun saveEntries(ctx: Context, entries: List<ScheduleEntry>) {
    ctx.scheduleStore.edit { prefs ->
        prefs[SCHEDULE_KEY] = kotlinJson.encodeToString(entries)
    }
}

private fun todayDow(): Int = LocalDate.now().dayOfWeek.value // Mon=1, Sun=7

private fun nowHhmm(): String = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm"))

private fun hhmm(s: String): Int {
    val parts = s.split(":").mapNotNull { it.toIntOrNull() }
    return if (parts.size == 2) parts[0] * 60 + parts[1] else 0
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TimetableScreen(onNavigateToRoom: (roomId: String) -> Unit = {}) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()

    var entries by remember { mutableStateOf<List<ScheduleEntry>>(emptyList()) }
    var showAdd by remember { mutableStateOf(false) }
    var editEntry by remember { mutableStateOf<ScheduleEntry?>(null) }
    var rooms by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    val dow = todayDow()
    val nowMins = hhmm(nowHhmm())

    LaunchedEffect(Unit) {
        entries = loadEntries(ctx)
        try {
            val r = withContext(Dispatchers.IO) { Api.get("/rooms") }
            rooms = r.jsonArray.mapNotNull { it as? JsonObject }
        } catch (_: Exception) {
            rooms = (Api.getOffline("/rooms")?.jsonArray?.mapNotNull { it as? JsonObject }) ?: emptyList()
        }
    }

    val todayEntries = entries.filter { it.dayOfWeek == dow }
        .sortedBy { hhmm(it.startHhmm) }

    val currentEntry = todayEntries.firstOrNull { e ->
        hhmm(e.startHhmm) <= nowMins && nowMins < hhmm(e.endHhmm)
    }
    val nextEntry = todayEntries.firstOrNull { e ->
        hhmm(e.startHhmm) > nowMins
    }

    val todayName = DayOfWeek.of(if (dow in 1..7) dow else 1)
        .getDisplayName(TextStyle.FULL, Locale.ENGLISH)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Timetable", fontWeight = FontWeight.SemiBold) },
                actions = {
                    IconButton(onClick = { showAdd = true }) {
                        Icon(Icons.Outlined.Add, "Add lesson")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
    ) { pad ->
        LazyColumn(
            Modifier.fillMaxSize().padding(pad),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // Today header
            item {
                Text(
                    todayName,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    nowHhmm(),
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            // Current lesson card
            item {
                if (dow in 1..5) {
                    LessonCard(
                        label = "NOW",
                        entry = currentEntry,
                        emptyText = if (nowMins < hhmm("08:00")) "School hasn't started yet"
                                    else "No lesson right now",
                        accentColor = MaterialTheme.colorScheme.primary,
                        onNavigate = { entry ->
                            if (entry.roomId.isNotBlank()) onNavigateToRoom(entry.roomId)
                        },
                    )
                }
            }

            // Next lesson card
            item {
                if (dow in 1..5) {
                    LessonCard(
                        label = "NEXT",
                        entry = nextEntry,
                        emptyText = "No more lessons today",
                        accentColor = MaterialTheme.colorScheme.secondary,
                        onNavigate = { entry ->
                            if (entry.roomId.isNotBlank()) onNavigateToRoom(entry.roomId)
                        },
                    )
                }
            }

            // Today's full schedule
            if (todayEntries.isNotEmpty()) {
                item {
                    Text(
                        "Today",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
                items(todayEntries) { entry ->
                    EntryRow(
                        entry = entry,
                        isCurrent = entry == currentEntry,
                        onDelete = {
                            val updated = entries.filterNot { it.id == entry.id }
                            entries = updated
                            scope.launch { saveEntries(ctx, updated) }
                        },
                        onNavigate = {
                            if (entry.roomId.isNotBlank()) onNavigateToRoom(entry.roomId)
                        },
                    )
                }
            } else if (dow in 1..5) {
                item { EmptyState() }
            } else {
                item {
                    Card(
                        Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                    ) {
                        Box(Modifier.padding(20.dp)) {
                            Text("It's the weekend — enjoy!", fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }
    }

    if (showAdd || editEntry != null) {
        AddEditDialog(
            rooms = rooms,
            existing = editEntry,
            onSave = { e ->
                val updated = if (editEntry != null) {
                    entries.map { if (it.id == editEntry!!.id) e else it }
                } else {
                    entries + e
                }
                entries = updated
                scope.launch { saveEntries(ctx, updated) }
                showAdd = false; editEntry = null
            },
            onDismiss = { showAdd = false; editEntry = null },
        )
    }
}

@Composable
private fun LessonCard(
    label: String,
    entry: ScheduleEntry?,
    emptyText: String,
    accentColor: Color,
    onNavigate: (ScheduleEntry) -> Unit,
) {
    ElevatedCard(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.elevatedCardElevation(defaultElevation = 2.dp),
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(
                label,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.5.sp,
                color = accentColor,
            )
            Spacer(Modifier.height(6.dp))
            if (entry != null) {
                Text(entry.subject, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    if (entry.roomNumber.isNotBlank()) {
                        InfoChip(Icons.Outlined.MeetingRoom, "Room ${entry.roomNumber}")
                    }
                    InfoChip(Icons.Outlined.Schedule, "${entry.startHhmm}–${entry.endHhmm}")
                    if (entry.teacher.isNotBlank()) {
                        InfoChip(Icons.Outlined.Person, entry.teacher)
                    }
                }
                if (entry.roomId.isNotBlank()) {
                    Spacer(Modifier.height(10.dp))
                    FilledTonalButton(
                        onClick = { onNavigate(entry) },
                        modifier = Modifier.height(36.dp),
                    ) {
                        Icon(Icons.Outlined.Navigation, null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Navigate", fontSize = 13.sp)
                    }
                }
            } else {
                Text(emptyText, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun InfoChip(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, modifier = Modifier.size(13.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.width(3.dp))
        Text(text, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun EntryRow(
    entry: ScheduleEntry,
    isCurrent: Boolean,
    onDelete: () -> Unit,
    onNavigate: () -> Unit,
) {
    val dayName = DayOfWeek.of(entry.dayOfWeek).getDisplayName(TextStyle.SHORT, Locale.ENGLISH)
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (isCurrent) MaterialTheme.colorScheme.primaryContainer
                else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
            )
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(entry.subject, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            Text(
                "${entry.startHhmm}–${entry.endHhmm}" +
                    (if (entry.roomNumber.isNotBlank()) " · Room ${entry.roomNumber}" else "") +
                    (if (entry.teacher.isNotBlank()) " · ${entry.teacher}" else ""),
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        if (entry.roomId.isNotBlank()) {
            IconButton(onClick = onNavigate, modifier = Modifier.size(36.dp)) {
                Icon(Icons.Outlined.Navigation, "Navigate", modifier = Modifier.size(18.dp),
                     tint = MaterialTheme.colorScheme.primary)
            }
        }
        IconButton(onClick = onDelete, modifier = Modifier.size(36.dp)) {
            Icon(Icons.Outlined.Delete, "Delete", modifier = Modifier.size(18.dp),
                 tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun EmptyState() {
    Column(
        Modifier.fillMaxWidth().padding(vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(
            Icons.Outlined.CalendarToday,
            null,
            modifier = Modifier.size(40.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f),
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "No lessons added for today",
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontWeight = FontWeight.SemiBold,
        )
        Text(
            "Tap + to add your timetable",
            fontSize = 13.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddEditDialog(
    rooms: List<JsonObject>,
    existing: ScheduleEntry?,
    onSave: (ScheduleEntry) -> Unit,
    onDismiss: () -> Unit,
) {
    val DAYS = listOf("Mon", "Tue", "Wed", "Thu", "Fri")
    var day by remember { mutableStateOf(existing?.dayOfWeek ?: todayDow().coerceIn(1, 5)) }
    var start by remember { mutableStateOf(existing?.startHhmm ?: "08:15") }
    var end by remember { mutableStateOf(existing?.endHhmm ?: "09:45") }
    var subject by remember { mutableStateOf(existing?.subject ?: "") }
    var teacher by remember { mutableStateOf(existing?.teacher ?: "") }
    var selectedRoom by remember { mutableStateOf<JsonObject?>(
        existing?.roomId?.let { id -> rooms.firstOrNull { (it["id"] as? JsonPrimitive)?.contentOrNull == id } }
    ) }
    var roomSheet by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (existing != null) "Edit lesson" else "Add lesson") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                // Day picker
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    DAYS.forEachIndexed { idx, label ->
                        val d = idx + 1
                        FilterChip(
                            selected = day == d,
                            onClick = { day = d },
                            label = { Text(label, fontSize = 12.sp) },
                        )
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = start,
                        onValueChange = { start = it },
                        label = { Text("Start") },
                        placeholder = { Text("08:15") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                    )
                    OutlinedTextField(
                        value = end,
                        onValueChange = { end = it },
                        label = { Text("End") },
                        placeholder = { Text("09:45") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                    )
                }
                OutlinedTextField(
                    value = subject,
                    onValueChange = { subject = it },
                    label = { Text("Subject") },
                    placeholder = { Text("Mathematics") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )
                OutlinedTextField(
                    value = teacher,
                    onValueChange = { teacher = it },
                    label = { Text("Teacher (optional)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )
                // Room picker button
                OutlinedCard(
                    onClick = { roomSheet = true },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp),
                ) {
                    Row(
                        Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Outlined.MeetingRoom, null, tint = MaterialTheme.colorScheme.primary)
                        Spacer(Modifier.width(8.dp))
                        val roomLabel = selectedRoom?.let {
                            val num = (it["roomNumber"] as? JsonPrimitive)?.contentOrNull ?: ""
                            val name = (it["name"] as? JsonPrimitive)?.contentOrNull ?: ""
                            if (num.isNotBlank()) "Room $num${if (name.isNotBlank()) " – $name" else ""}" else name
                        } ?: "Pick a room (optional)"
                        Text(roomLabel, fontSize = 13.sp, color = if (selectedRoom == null)
                            MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface)
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = {
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
                    )
                )
            }) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
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
            Column(Modifier.padding(horizontal = 16.dp)) {
                Text("Pick a room", fontWeight = FontWeight.SemiBold, fontSize = 18.sp)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    placeholder = { Text("Search") },
                    leadingIcon = { Icon(Icons.Outlined.Search, null) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                )
                Spacer(Modifier.height(4.dp))
                LazyColumn(Modifier.heightIn(max = 420.dp)) {
                    item {
                        ListItem(
                            headlineContent = { Text("None") },
                            modifier = Modifier.clickable { selectedRoom = null; roomSheet = false },
                        )
                        HorizontalDivider()
                    }
                    items(filteredRooms) { r ->
                        val num = (r["roomNumber"] as? JsonPrimitive)?.contentOrNull ?: "—"
                        val name = (r["name"] as? JsonPrimitive)?.contentOrNull ?: ""
                        val floor = (r["floor"] as? JsonPrimitive)?.contentOrNull ?: "1"
                        ListItem(
                            headlineContent = { Text("Room $num") },
                            supportingContent = { if (name.isNotBlank()) Text(name, fontSize = 12.sp) },
                            trailingContent = { Text("F$floor", fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant) },
                            modifier = Modifier.clickable { selectedRoom = r; roomSheet = false },
                        )
                        HorizontalDivider()
                    }
                }
            }
        }
    }
}
