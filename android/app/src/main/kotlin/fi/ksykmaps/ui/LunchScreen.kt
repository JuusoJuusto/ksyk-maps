package fi.ksykmaps.ui

import android.util.Xml
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.xmlpull.v1.XmlPullParser
import java.io.StringReader
import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalDate

private const val MENU_URL =
    "https://www.compass-group.fi/menuapi/feed/rss/current-week?costNumber=3026&language=fi"

private data class LunchDay(
    val label: String,
    val date: LocalDate?,
    val dishes: List<String>,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LunchScreen() {
    val scope = rememberCoroutineScope()
    var days by remember { mutableStateOf<List<LunchDay>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val today = remember { LocalDate.now() }
    var selectedIdx by remember { mutableIntStateOf(0) }

    fun doFetch() {
        scope.launch {
            loading = true; error = null
            try {
                val result = withContext(Dispatchers.IO) { fetchMenu() }
                days = result
                val todayIdx = result.indexOfFirst { it.date == today }
                if (todayIdx >= 0) selectedIdx = todayIdx
            } catch (e: Exception) {
                error = e.localizedMessage ?: "Ruokalistaa ei voitu ladata"
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(Unit) { doFetch() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Lounas", fontWeight = FontWeight.SemiBold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
                actions = {
                    if (!loading) {
                        IconButton(onClick = { doFetch() }) {
                            Icon(Icons.Outlined.Refresh, contentDescription = "Päivitä")
                        }
                    }
                    TextButton(onClick = {}) {
                        Text("Compass Group", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
            )
        },
    ) { pad ->
        when {
            loading -> {
                Box(Modifier.fillMaxSize().padding(pad), contentAlignment = Alignment.Center) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        CircularProgressIndicator()
                        Text(
                            "Ladataan ruokalistaa…",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
            error != null -> {
                Box(Modifier.fillMaxSize().padding(pad), contentAlignment = Alignment.Center) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Icon(
                            Icons.Outlined.CloudOff, null,
                            Modifier.size(48.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f),
                        )
                        Text("Ruokalistaa ei voitu ladata", fontWeight = FontWeight.SemiBold)
                        Text(
                            error!!,
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        FilledTonalButton(onClick = { doFetch() }) {
                            Icon(Icons.Outlined.Refresh, null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Yritä uudelleen")
                        }
                    }
                }
            }
            days.isEmpty() -> {
                Box(Modifier.fillMaxSize().padding(pad), contentAlignment = Alignment.Center) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(
                            Icons.Outlined.RestaurantMenu, null,
                            Modifier.size(40.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f),
                        )
                        Text("Ei ruokalistaa tälle viikolle")
                    }
                }
            }
            else -> {
                LazyColumn(
                    Modifier.fillMaxSize().padding(pad),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    // Week info header
                    item {
                        val weekNum = days.firstOrNull()?.date?.let {
                            java.time.temporal.WeekFields.ISO.weekOfWeekBasedYear().getFrom(it).toInt()
                        }
                        Text(
                            if (weekNum != null) "Viikko $weekNum" else "Tällä viikolla",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }

                    // Day chips — show "Ma 24.8" style labels
                    item {
                        Row(
                            Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            days.forEachIndexed { i, day ->
                                val isToday = day.date == today
                                val abbrev = when (day.date?.dayOfWeek?.value) {
                                    1 -> "Ma"; 2 -> "Ti"; 3 -> "Ke"; 4 -> "To"; 5 -> "Pe"
                                    6 -> "La"; 7 -> "Su"; else -> day.label.take(2)
                                }
                                val chipLabel = buildString {
                                    append(abbrev)
                                    day.date?.let { d -> append(" ${d.dayOfMonth}.${d.monthValue}.") }
                                    if (isToday) append(" ·")
                                }
                                FilterChip(
                                    selected = selectedIdx == i,
                                    onClick = { selectedIdx = i },
                                    label = { Text(chipLabel, fontSize = 12.sp) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = if (isToday)
                                            MaterialTheme.colorScheme.primary
                                        else MaterialTheme.colorScheme.secondaryContainer,
                                        selectedLabelColor = if (isToday)
                                            MaterialTheme.colorScheme.onPrimary
                                        else MaterialTheme.colorScheme.onSecondaryContainer,
                                    ),
                                )
                            }
                        }
                    }

                    // Selected day header + dishes
                    val day = days.getOrNull(selectedIdx)
                    if (day != null) {
                        item {
                            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(
                                    day.label,
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.Bold,
                                )
                                if (day.date == today) {
                                    Text(
                                        "Tänään",
                                        fontSize = 13.sp,
                                        color = MaterialTheme.colorScheme.primary,
                                        fontWeight = FontWeight.Medium,
                                    )
                                } else if (day.date != null) {
                                    Text(
                                        "${day.date.dayOfMonth}.${day.date.monthValue}.${day.date.year}",
                                        fontSize = 13.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }

                        if (day.dishes.isEmpty()) {
                            item {
                                Box(
                                    Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f))
                                        .padding(20.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        "Ei ruokalistaa",
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        } else {
                            item {
                                Text(
                                    "${day.dishes.size} ruokalajia",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            items(day.dishes) { dish -> DishRow(dish) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DishRow(dish: String) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f))
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(6.dp)
                .clip(RoundedCornerShape(3.dp))
                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.6f)),
        )
        Spacer(Modifier.width(12.dp))
        Text(dish, fontSize = 14.sp, modifier = Modifier.weight(1f))
    }
}

private fun fetchMenu(): List<LunchDay> {
    val conn = URL(MENU_URL).openConnection() as HttpURLConnection
    conn.connectTimeout = 8_000
    conn.readTimeout = 8_000
    conn.setRequestProperty("User-Agent", "KSYK-Maps-Android/1.0")
    val xml = conn.inputStream.bufferedReader(Charsets.UTF_8).readText()
    conn.disconnect()
    return parseRss(xml)
}

private fun parseRss(xml: String): List<LunchDay> {
    val days = mutableListOf<LunchDay>()
    val parser = Xml.newPullParser()
    parser.setFeature(XmlPullParser.FEATURE_PROCESS_NAMESPACES, false)
    parser.setInput(StringReader(xml))

    var inItem = false
    var inTitle = false
    var inDesc = false
    val titleBuf = StringBuilder()
    val descBuf = StringBuilder()

    var type = parser.eventType
    while (type != XmlPullParser.END_DOCUMENT) {
        when (type) {
            XmlPullParser.START_TAG -> when (parser.name) {
                "item"        -> { inItem = true; titleBuf.clear(); descBuf.clear() }
                "title"       -> if (inItem) inTitle = true
                "description" -> if (inItem) inDesc = true
            }
            XmlPullParser.TEXT, XmlPullParser.CDSECT -> {
                val text = parser.text ?: ""
                if (inTitle) titleBuf.append(text)
                if (inDesc)  descBuf.append(text)
            }
            XmlPullParser.END_TAG -> when (parser.name) {
                "title"       -> inTitle = false
                "description" -> inDesc = false
                "item"        -> if (inItem) {
                    inItem = false
                    val label = titleBuf.toString().trim()
                    val dishes = extractDishes(descBuf.toString())
                    days += LunchDay(
                        label = label,
                        date = parseDate(label),
                        dishes = dishes,
                    )
                }
            }
        }
        type = parser.next()
    }
    return days
}

private fun extractDishes(html: String): List<String> {
    // Split on <p> tags, strip all other tags, decode entities
    val result = mutableListOf<String>()
    val pTagRegex = Regex("<p[^>]*>(.*?)</p>", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
    val matches = pTagRegex.findAll(html)
    if (matches.any()) {
        matches.forEach { m ->
            val text = m.groupValues[1]
                .replace(Regex("<[^>]+>"), "")
                .decodeHtmlEntities()
                .trim()
            if (text.isNotBlank() && text.length > 2) result += text
        }
    } else {
        // Fallback: no <p> tags — strip all tags and split by newline/semicolon
        html.replace(Regex("<br\\s*/?>", RegexOption.IGNORE_CASE), "\n")
            .replace(Regex("<[^>]+>"), "")
            .decodeHtmlEntities()
            .split("\n")
            .map { it.trim() }
            .filter { it.isNotBlank() && it.length > 2 }
            .forEach { result += it }
    }
    return result
}

private fun String.decodeHtmlEntities(): String = this
    .replace("&amp;", "&")
    .replace("&nbsp;", " ")
    .replace("&lt;", "<")
    .replace("&gt;", ">")
    .replace("&quot;", "\"")
    .replace("&#39;", "'")
    .replace(Regex("\\s{2,}"), " ")

private fun parseDate(label: String): LocalDate? {
    val yearPattern = Regex("(\\d{1,2})\\.(\\d{2})\\.(\\d{4})")
    val shortPattern = Regex("(\\d{1,2})\\.(\\d{2})\\.")
    return try {
        yearPattern.find(label)?.let { m ->
            LocalDate.of(m.groupValues[3].toInt(), m.groupValues[2].toInt(), m.groupValues[1].toInt())
        } ?: shortPattern.find(label)?.let { m ->
            LocalDate.of(LocalDate.now().year, m.groupValues[2].toInt(), m.groupValues[1].toInt())
        }
    } catch (_: Exception) { null }
}
