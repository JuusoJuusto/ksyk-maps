package fi.ksykmaps.ui

import android.content.Intent
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
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import fi.ksykmaps.data.AppLog
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * Diagnostic log viewer. Reads from AppLog (reactive), lets the user
 * filter by level, share via intent, and clear. Purpose: give the user
 * something to attach when they report "the map doesn't work" — without
 * them, I'm guessing at the failure point.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LogsScreen(onBack: () -> Unit) {
    val ctx = LocalContext.current
    LanguageState.init(ctx); val lang = LanguageState.current ?: "fi"
    val isFi = lang == "fi"
    val entries by AppLog.entriesState
    var levelFilter by remember { mutableStateOf<AppLog.Level?>(null) }
    var tagFilter by remember { mutableStateOf("") }

    val displayed = remember(entries, levelFilter, tagFilter) {
        entries.filter { e ->
            (levelFilter == null || e.level == levelFilter) &&
                (tagFilter.isBlank() || e.tag.contains(tagFilter, ignoreCase = true))
        }
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.surface,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            if (isFi) "Lokit" else "Logs",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 18.sp,
                        )
                        Text(
                            "${entries.size} " + (if (isFi) "merkintää" else "entries"),
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Outlined.ArrowBack, null)
                    }
                },
                actions = {
                    IconButton(onClick = {
                        try {
                            val text = buildLogExport(entries)
                            val i = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(Intent.EXTRA_SUBJECT, "KSYK Maps app log")
                                putExtra(Intent.EXTRA_TEXT, text)
                            }
                            ctx.startActivity(Intent.createChooser(i,
                                if (isFi) "Jaa loki" else "Share log"))
                        } catch (_: Exception) {}
                    }) {
                        Icon(Icons.Outlined.Share, contentDescription = if (isFi) "Jaa" else "Share")
                    }
                    IconButton(onClick = { AppLog.clear() }) {
                        Icon(Icons.Outlined.Delete, contentDescription = if (isFi) "Tyhjennä" else "Clear")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
    ) { pad ->
        Column(Modifier.fillMaxSize().padding(pad)) {
            // Filter row — level pills + tag search
            val scroll = rememberScrollState()
            Row(
                Modifier
                    .fillMaxWidth()
                    .horizontalScroll(scroll)
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                LevelChip(label = if (isFi) "Kaikki" else "All", color = MaterialTheme.colorScheme.primary,
                          selected = levelFilter == null) { levelFilter = null }
                LevelChip(label = "INFO", color = Color(0xFF3B82F6),
                          selected = levelFilter == AppLog.Level.INFO) { levelFilter = AppLog.Level.INFO }
                LevelChip(label = "WARN", color = Color(0xFFF59E0B),
                          selected = levelFilter == AppLog.Level.WARN) { levelFilter = AppLog.Level.WARN }
                LevelChip(label = "ERROR", color = Color(0xFFEF4444),
                          selected = levelFilter == AppLog.Level.ERROR) { levelFilter = AppLog.Level.ERROR }
                LevelChip(label = "DEBUG", color = Color(0xFF64748B),
                          selected = levelFilter == AppLog.Level.DEBUG) { levelFilter = AppLog.Level.DEBUG }
            }
            OutlinedTextField(
                value = tagFilter,
                onValueChange = { tagFilter = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                singleLine = true,
                placeholder = { Text(
                    if (isFi) "Suodata tagin mukaan (Api, MapScreen, …)"
                    else "Filter by tag (Api, MapScreen, …)",
                    fontSize = 12.sp,
                ) },
                shape = RoundedCornerShape(10.dp),
                leadingIcon = { Icon(Icons.Outlined.Search, null, Modifier.size(18.dp)) },
                trailingIcon = if (tagFilter.isNotBlank()) {
                    {
                        IconButton(onClick = { tagFilter = "" }) {
                            Icon(Icons.Outlined.Close, null, Modifier.size(16.dp))
                        }
                    }
                } else null,
            )
            if (displayed.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        if (entries.isEmpty())
                            (if (isFi) "Ei vielä lokimerkintöjä." else "No log entries yet.")
                        else
                            (if (isFi) "Ei osumia suodattimelle." else "No matches for the filter."),
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            } else {
                LazyColumn(
                    Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    items(displayed) { e -> LogRow(e) }
                    item { Spacer(Modifier.height(16.dp)) }
                }
            }
        }
    }
}

@Composable
private fun LevelChip(label: String, color: Color, selected: Boolean, onClick: () -> Unit) {
    Box(
        Modifier
            .clip(RoundedCornerShape(18.dp))
            .background(if (selected) color else color.copy(alpha = 0.15f))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 6.dp),
    ) {
        Text(
            label,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (selected) Color.White else color,
        )
    }
}

@Composable
private fun LogRow(e: AppLog.Entry) {
    val color = when (e.level) {
        AppLog.Level.ERROR -> Color(0xFFEF4444)
        AppLog.Level.WARN -> Color(0xFFF59E0B)
        AppLog.Level.INFO -> Color(0xFF3B82F6)
        AppLog.Level.DEBUG -> Color(0xFF64748B)
    }
    val time = try {
        DateTimeFormatter.ofPattern("HH:mm:ss.SSS")
            .withZone(ZoneId.systemDefault())
            .format(Instant.ofEpochMilli(e.timestampMs))
    } catch (_: Exception) { "" }
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(color.copy(alpha = 0.05f))
            .padding(horizontal = 12.dp, vertical = 8.dp),
    ) {
        Box(
            Modifier
                .size(width = 3.dp, height = 40.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(color)
        )
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    e.level.name,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    color = color,
                    letterSpacing = 0.5.sp,
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    e.tag,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Spacer(Modifier.weight(1f))
                Text(
                    time,
                    fontSize = 9.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontFamily = FontFamily.Monospace,
                )
            }
            Spacer(Modifier.height(2.dp))
            Text(
                e.message,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurface,
                lineHeight = 15.sp,
            )
        }
    }
}

private fun buildLogExport(entries: List<AppLog.Entry>): String {
    val sb = StringBuilder()
    sb.append("KSYK Maps app log\n")
    sb.append("Exported: ${Instant.now()}\n")
    sb.append("Entries: ${entries.size}\n")
    sb.append("---\n")
    for (e in entries) {
        sb.append("${e.isoTime}\t${e.level.name}\t${e.tag}\t${e.message}\n")
    }
    // Include historical file contents too
    val fileText = AppLog.readFile()
    if (fileText.isNotBlank()) {
        sb.append("--- File contents (persistent) ---\n")
        sb.append(fileText)
    }
    return sb.toString()
}
