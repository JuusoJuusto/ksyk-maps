package fi.ksykmaps.ui

import android.util.Xml
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material.icons.rounded.BakeryDining
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.Cake
import androidx.compose.material.icons.rounded.Grass
import androidx.compose.material.icons.rounded.LocalDining
import androidx.compose.material.icons.rounded.LocalFireDepartment
import androidx.compose.material.icons.rounded.LunchDining
import androidx.compose.material.icons.rounded.RestaurantMenu
import androidx.compose.material.icons.rounded.SetMeal
import androidx.compose.material.icons.rounded.SoupKitchen
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import fi.ksykmaps.data.Analytics
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.xmlpull.v1.XmlPullParser
import java.io.StringReader
import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

private const val MENU_URL =
    "https://www.compass-group.fi/menuapi/feed/rss/current-week?costNumber=3026&language=fi"

private data class Dish(val text: String, val isCategory: Boolean)
private data class LunchDay(
    val label: String,
    val date: LocalDate?,
    val dishes: List<Dish>,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LunchScreen() {
    val ctx = androidx.compose.ui.platform.LocalContext.current
    LanguageState.init(ctx); val lang = LanguageState.current ?: "fi"
    val scope = rememberCoroutineScope()
    var days by remember { mutableStateOf<List<LunchDay>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val today = remember { LocalDate.now() }
    var selectedIdx by remember { mutableIntStateOf(0) }
    var refreshTaps by remember { mutableIntStateOf(0) }
    var showFoodEgg by remember { mutableStateOf(false) }

    fun doFetch() {
        scope.launch {
            loading = true; error = null
            try {
                val result = withContext(Dispatchers.IO) { fetchMenu() }
                days = result
                // Pick today's row. Three-layer fallback so we always land
                // on the right day even when the RSS title lacks a date:
                //   1. exact date match (most reliable)
                //   2. day-of-week match against the label text
                //      (label often reads "Maanantai" / "Tiistai" etc.)
                //   3. closest upcoming date (weekend → next Monday)
                val todayIdx = result.indexOfFirst { it.date == today }
                val dowIdx = if (todayIdx < 0) matchByDayOfWeek(result, today, lang) else -1
                val bestIdx = when {
                    todayIdx >= 0 -> todayIdx
                    dowIdx >= 0 -> dowIdx
                    else -> result.indexOfFirst { it.date != null && it.date >= today }
                        .takeIf { it >= 0 } ?: 0
                }
                selectedIdx = bestIdx
                Analytics.trackLunchView(result.getOrNull(bestIdx)?.label ?: "today")
            } catch (e: Exception) {
                error = if (lang == "fi") "Ruokalistaa ei voitu ladata" else "Couldn't load the menu"
                Analytics.trackError("LunchScreen", "fetch_failed")
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(Unit) { doFetch() }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.surface,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        if (lang == "fi") "Lounas" else "Lunch",
                        fontWeight = FontWeight.SemiBold,
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
                actions = {
                    if (!loading) {
                        IconButton(onClick = { doFetch() }) {
                            Icon(
                                Icons.Outlined.Refresh,
                                contentDescription = if (lang == "fi") "Päivitä" else "Reload",
                            )
                        }
                    }
                },
            )
        },
    ) { pad ->
        when {
            loading -> LoadingBox(pad, lang)
            error != null -> ErrorBox(pad, error!!, lang) { doFetch() }
            days.isEmpty() -> EmptyMenuBox(pad, lang)
            else -> {
                val loc = remember(lang) { if (lang == "fi") Locale("fi") else Locale.ENGLISH }
                LazyColumn(
                    Modifier.fillMaxSize().padding(pad),
                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    // Selected day header — big + subtle
                    val day = days.getOrNull(selectedIdx)
                    if (day != null) {
                        item {
                            val isToday = day.date == today
                            Column(Modifier.padding(top = 8.dp)) {
                                val weekdayText = day.date?.dayOfWeek?.getDisplayName(TextStyle.FULL, loc)
                                    ?.let {
                                        // Finnish weekdays lowercase per orthography.
                                        if (lang == "fi") it.lowercase(loc)
                                        else it.replaceFirstChar { c -> c.titlecase(loc) }
                                    }
                                    ?: day.label
                                Text(
                                    weekdayText,
                                    style = MaterialTheme.typography.headlineMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    letterSpacing = (-0.4).sp,
                                )
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        day.date?.format(
                                            DateTimeFormatter.ofPattern(
                                                if (lang == "fi") "d. MMMM" else "MMMM d",
                                                loc,
                                            )
                                        ) ?: day.label,
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Medium,
                                        color = if (isToday) MaterialTheme.colorScheme.primary
                                                else MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                    if (isToday) {
                                        Spacer(Modifier.width(6.dp))
                                        Box(
                                            Modifier
                                                .clip(RoundedCornerShape(6.dp))
                                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f))
                                                .padding(horizontal = 6.dp, vertical = 2.dp),
                                        ) {
                                            Text(
                                                if (lang == "fi") "Tänään" else "Today",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                color = MaterialTheme.colorScheme.primary,
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Day selector — one row of day pills like a mini-calendar
                    item {
                        DayPillRow(
                            days = days,
                            selectedIdx = selectedIdx,
                            today = today,
                            onSelect = { selectedIdx = it },
                            lang = lang,
                        )
                    }

                    if (day != null) {
                        if (day.dishes.isEmpty()) {
                            item {
                                Box(
                                    Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(20.dp))
                                        .background(MaterialTheme.colorScheme.surfaceContainerLow)
                                        .padding(32.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        verticalArrangement = Arrangement.spacedBy(10.dp),
                                    ) {
                                        Icon(
                                            Icons.Outlined.RestaurantMenu, null,
                                            modifier = Modifier.size(32.dp),
                                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                        Text(
                                            if (lang == "fi") "Ei ruokalistaa"
                                            else "No menu",
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            fontWeight = FontWeight.Medium,
                                        )
                                    }
                                }
                            }
                        } else {
                            val dishCount = day.dishes.count { !it.isCategory }
                            item {
                                Row(
                                    Modifier.padding(start = 2.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(
                                        if (lang == "fi") "$dishCount ruokalajia" else "$dishCount dishes",
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = MaterialTheme.colorScheme.onSurface,
                                    )
                                    val weekNum = days.firstOrNull()?.date?.let {
                                        java.time.temporal.WeekFields.ISO.weekOfWeekBasedYear().getFrom(it).toInt()
                                    }
                                    if (weekNum != null) {
                                        Text(
                                            if (lang == "fi") "  ·  Viikko $weekNum" else "  ·  Week $weekNum",
                                            fontSize = 12.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }
                            // Group dishes under their categories so the visual
                            // structure is a card per category, dish rows inside.
                            val groups = groupByCategory(day.dishes)
                            items(groups) { group ->
                                DishGroup(group, lang, onEasterTap = {
                                    refreshTaps++
                                    if (refreshTaps >= 5) {
                                        refreshTaps = 0
                                        Analytics.trackEasterEgg("compass_group_tap")
                                        showFoodEgg = true
                                    }
                                })
                            }
                            item {
                                Text(
                                    "Compass Group",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            refreshTaps++
                                            if (refreshTaps >= 5) {
                                                refreshTaps = 0
                                                Analytics.trackEasterEgg("compass_group_tap")
                                                showFoodEgg = true
                                            }
                                        }
                                        .padding(top = 12.dp, bottom = 4.dp),
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                )
                            }
                        }
                    }

                    item { Spacer(Modifier.height(16.dp)) }
                }
            }
        }
    }

    if (showFoodEgg) {
        AlertDialog(
            onDismissRequest = { showFoodEgg = false },
            shape = RoundedCornerShape(24.dp),
            title = { Text("Salainen resepti", fontWeight = FontWeight.SemiBold) },
            text = { Text("Huhu! Löydät piiloreseptin: yksi ruokalusikka motivaatiota, kaksi kupillista koodia ja sopiva määrä kokkausaikaa. Hyvää ruokahalua!") },
            confirmButton = {
                TextButton(onClick = { showFoodEgg = false }) { Text("Herkullista!") }
            },
        )
    }
}

@Composable
private fun LoadingBox(pad: PaddingValues, lang: String) {
    Box(Modifier.fillMaxSize().padding(pad), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            CircularProgressIndicator(strokeWidth = 3.dp)
            Text(
                if (lang == "fi") "Ladataan ruokalistaa" else "Loading menu",
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun ErrorBox(pad: PaddingValues, msg: String, lang: String, onRetry: () -> Unit) {
    Box(Modifier.fillMaxSize().padding(pad).padding(24.dp), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Box(
                Modifier
                    .size(72.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.4f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Outlined.CloudOff, null,
                    modifier = Modifier.size(32.dp),
                    tint = MaterialTheme.colorScheme.error,
                )
            }
            Text(
                if (lang == "fi") "Ruokalistaa ei voitu ladata" else "Could not load the menu",
                fontWeight = FontWeight.SemiBold,
                fontSize = 15.sp,
            )
            Text(
                msg,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
            FilledTonalButton(
                onClick = onRetry,
                shape = RoundedCornerShape(24.dp),
            ) {
                Icon(Icons.Outlined.Refresh, null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(8.dp))
                Text(if (lang == "fi") "Yritä uudelleen" else "Try again")
            }
        }
    }
}

@Composable
private fun EmptyMenuBox(pad: PaddingValues, lang: String) {
    Box(Modifier.fillMaxSize().padding(pad), contentAlignment = Alignment.Center) {
        Column(
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
                    Icons.Outlined.RestaurantMenu, null,
                    modifier = Modifier.size(28.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Text(
                if (lang == "fi") "Ei ruokalistaa tälle viikolle"
                else "No menu available for this week",
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun DayPillRow(
    days: List<LunchDay>,
    selectedIdx: Int,
    today: LocalDate,
    onSelect: (Int) -> Unit,
    lang: String,
) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        days.forEachIndexed { i, day ->
            val isSelected = selectedIdx == i
            val isToday = day.date == today
            val abbrev = when (day.date?.dayOfWeek?.value) {
                1 -> if (lang == "fi") "Ma" else "Mon"
                2 -> if (lang == "fi") "Ti" else "Tue"
                3 -> if (lang == "fi") "Ke" else "Wed"
                4 -> if (lang == "fi") "To" else "Thu"
                5 -> if (lang == "fi") "Pe" else "Fri"
                6 -> if (lang == "fi") "La" else "Sat"
                7 -> if (lang == "fi") "Su" else "Sun"
                else -> day.label.take(2)
            }
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
                    .clickable { onSelect(i) }
                    .padding(vertical = 8.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(
                    abbrev,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = when {
                        isSelected -> MaterialTheme.colorScheme.onPrimary
                        isToday -> MaterialTheme.colorScheme.primary
                        else -> MaterialTheme.colorScheme.onSurfaceVariant
                    },
                )
                Text(
                    day.date?.dayOfMonth?.toString() ?: "·",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = when {
                        isSelected -> MaterialTheme.colorScheme.onPrimary
                        isToday -> MaterialTheme.colorScheme.primary
                        else -> MaterialTheme.colorScheme.onSurface
                    },
                )
            }
        }
    }
}

private data class DishGroup(val category: String?, val dishes: List<String>)

private fun groupByCategory(dishes: List<Dish>): List<DishGroup> {
    if (dishes.isEmpty()) return emptyList()
    val groups = mutableListOf<DishGroup>()
    var currentCat: String? = null
    var currentDishes = mutableListOf<String>()
    dishes.forEach { d ->
        if (d.isCategory) {
            if (currentDishes.isNotEmpty()) {
                groups += DishGroup(currentCat, currentDishes.toList())
                currentDishes.clear()
            }
            currentCat = d.text
        } else {
            currentDishes += d.text
        }
    }
    if (currentDishes.isNotEmpty()) groups += DishGroup(currentCat, currentDishes.toList())
    return groups
}

@Composable
private fun DishGroup(group: DishGroup, lang: String, onEasterTap: () -> Unit) {
    // v4.7.37: per-category rounded Material icon + tint. Replaces the
    // previous emoji glyphs so category chips match the rest of the app's
    // monochrome-icon aesthetic (Apple/M3 rounded).
    val (icon, tint) = categoryLook(group.category)

    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            if (!group.category.isNullOrBlank()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(tint.copy(alpha = 0.14f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            icon,
                            contentDescription = null,
                            tint = tint,
                            modifier = Modifier.size(16.dp),
                        )
                    }
                    Spacer(Modifier.width(10.dp))
                    Text(
                        group.category,
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = tint,
                        letterSpacing = 0.4.sp,
                    )
                }
            }
            group.dishes.forEachIndexed { i, text ->
                if (i > 0) {
                    HorizontalDivider(
                        color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.25f),
                    )
                }
                Text(
                    text,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }
        }
    }
}

/**
 * Deterministic (Material icon, tint color) for a menu category based on
 * Finnish keywords. Falls back to a neutral utensil icon and the primary
 * colour.
 */
@Composable
private fun categoryLook(category: String?): Pair<ImageVector, Color> {
    val text = (category ?: "").lowercase()
    return when {
        text.contains("kasvis") || text.contains("vegaani") || text.contains("vege") ->
            Icons.Rounded.Grass to Color(0xFF10B981)          // green
        text.contains("kala") || text.contains("lohi") ->
            Icons.Rounded.SetMeal to Color(0xFF06B6D4)         // cyan
        text.contains("kana") || text.contains("kalkkuna") || text.contains("broiler") ->
            Icons.Rounded.LunchDining to Color(0xFFF59E0B)     // amber
        text.contains("nauda") || text.contains("liha") || text.contains("pihvi") || text.contains("jauhe") ->
            Icons.Rounded.LocalFireDepartment to Color(0xFFEF4444) // red
        text.contains("keitto") || text.contains("soppa") ->
            Icons.Rounded.SoupKitchen to Color(0xFFEA580C)     // orange
        text.contains("keto") || text.contains("nopea") ->
            Icons.Rounded.Bolt to Color(0xFF8B5CF6)            // violet
        text.contains("jälki") || text.contains("makea") ->
            Icons.Rounded.Cake to Color(0xFFEC4899)            // pink
        text.contains("salaat") ->
            Icons.Rounded.LocalDining to Color(0xFF22C55E)     // grass
        text.contains("leipä") || text.contains("piira") ->
            Icons.Rounded.BakeryDining to Color(0xFFCA8A04)    // gold
        else -> Icons.Rounded.RestaurantMenu to MaterialTheme.colorScheme.primary
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

private fun extractDishes(html: String): List<Dish> {
    val result = mutableListOf<Dish>()
    val pTagRegex = Regex("<p[^>]*>(.*?)</p>", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
    val matches = pTagRegex.findAll(html)
    if (matches.any()) {
        matches.forEach { m ->
            val inner = m.groupValues[1]
            val isCategory = inner.contains("<strong>", ignoreCase = true) || inner.contains("<b>", ignoreCase = true)
            val text = inner.replace(Regex("<[^>]+>"), "").decodeHtmlEntities().trim()
            if (text.isNotBlank() && text.length > 2) result += Dish(text, isCategory)
        }
    } else {
        html.replace(Regex("<br\\s*/?>", RegexOption.IGNORE_CASE), "\n")
            .replace(Regex("<[^>]+>"), "")
            .decodeHtmlEntities()
            .split("\n")
            .map { it.trim() }
            .filter { it.isNotBlank() && it.length > 2 }
            .forEach { text ->
                val letters = text.filter { it.isLetter() }
                val isCategory = letters.isNotEmpty() && letters.all { it.isUpperCase() } && !text.contains('(')
                result += Dish(text, isCategory)
            }
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

/**
 * Fallback matcher when the RSS date can't be parsed — check whether the
 * label contains today's weekday name in Finnish or English. Compass
 * Group's feed titles read like "Maanantai 25.8." or just "Maanantai".
 */
private fun matchByDayOfWeek(days: List<LunchDay>, today: LocalDate, lang: String): Int {
    val dow = today.dayOfWeek.value
    val fiNames = listOf("maanantai", "tiistai", "keskiviikko", "torstai", "perjantai", "lauantai", "sunnuntai")
    val enNames = listOf("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")
    val target = if (lang == "fi") fiNames[dow - 1] else enNames[dow - 1]
    // Match either the localized day name or (as a safety net) the other language's name.
    val otherTarget = if (lang == "fi") enNames[dow - 1] else fiNames[dow - 1]
    return days.indexOfFirst { d ->
        val lbl = d.label.lowercase()
        lbl.contains(target) || lbl.contains(otherTarget)
    }
}

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
