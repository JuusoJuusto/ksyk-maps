package fi.ksykmaps.ui

import android.Manifest
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessaging
import fi.ksykmaps.data.AdminAlerts
import fi.ksykmaps.data.Api
import fi.ksykmaps.data.ApiException
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*
import java.time.Instant
import java.util.Locale
import java.util.TreeMap
import kotlin.math.roundToInt

/**
 * Admin "Insights" (overview, grouped errors, raw logs) and "Alerts" (Slack +
 * this phone) sections. Same data as the web Analytics tab; the server does the
 * comparing and grouping, this file only renders it.
 */

/** Index of the Alerts pill in the admin panel; push taps open it. */
const val ADMIN_SECTION_ALERTS = 2

/** Set by a notification tap; the admin panel reads it and jumps to that section. */
object AdminPanelNav {
    var pending by mutableStateOf<Int?>(null)
}

// ── small helpers ────────────────────────────────────────────────────────

private fun JsonObject.jInt(k: String) = (this[k] as? JsonPrimitive)?.intOrNull ?: 0
private fun JsonObject.jStr(k: String) = (this[k] as? JsonPrimitive)?.contentOrNull
private fun JsonObject.jBool(k: String) = (this[k] as? JsonPrimitive)?.booleanOrNull ?: false
private fun JsonObject.jObj(k: String) = this[k] as? JsonObject
private fun JsonObject.jArr(k: String) = this[k] as? JsonArray ?: JsonArray(emptyList())

private val GOOD = Color(0xFF12B76A)

private fun fmt(n: Int): String = when {
    n >= 10_000 -> "${n / 1000}k"
    n >= 1_000 -> String.format(Locale.US, "%.1fk", n / 1000.0)
    else -> n.toString()
}

private fun agoLabel(iso: String?): String {
    if (iso == null) return "–"
    return try {
        val s = (System.currentTimeMillis() - Instant.parse(iso).toEpochMilli()) / 1000
        when {
            s < 60 -> "${s.coerceAtLeast(0)}s"
            s < 3600 -> "${s / 60}m"
            s < 86_400 -> "${s / 3600}h"
            else -> "${s / 86_400}d"
        }
    } catch (_: Throwable) { iso.take(16) }
}

private class Remote<T> {
    var data by mutableStateOf<T?>(null)
    var error by mutableStateOf<Throwable?>(null)
    var loading by mutableStateOf(true)
    var tick by mutableIntStateOf(0)
    fun reload() { tick++ }
}

/** Loads on the IO dispatcher, reloads when [keys] change, optionally polls. Keeps the last data while refreshing. */
@Composable
private fun <T> rememberRemote(vararg keys: Any?, refreshMs: Long = 0, fetch: () -> T): Remote<T> {
    val remote = remember { Remote<T>() }
    val latest by rememberUpdatedState(fetch)
    LaunchedEffect(*keys, remote.tick) {
        while (true) {
            remote.loading = true
            val res = withContext(Dispatchers.IO) {
                try { Result.success(latest()) }
                catch (e: CancellationException) { throw e }
                catch (e: Throwable) { Result.failure(e) }
            }
            res.onSuccess { remote.data = it; remote.error = null }
                .onFailure { remote.error = it }
            remote.loading = false
            if (refreshMs <= 0) break
            delay(refreshMs)
        }
    }
    return remote
}

@Composable
private fun Masthead(text: String) {
    Text(
        text.uppercase(),
        fontSize = 10.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 1.sp,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

private val CardShape = RoundedCornerShape(10.dp)

@Composable
private fun Card(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier
            .fillMaxWidth()
            .clip(CardShape)
            .background(MaterialTheme.colorScheme.surfaceContainerLow)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        content = content,
    )
}

@Composable
private fun Chip(selected: Boolean, label: String, onClick: () -> Unit) {
    Box(
        Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(
                if (selected) MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.surfaceContainerHigh,
            )
            .clickable(onClick = onClick)
            .heightIn(min = 36.dp)
            .padding(horizontal = 14.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
private fun ChipRow(options: List<Pair<String, String>>, selected: String, onSelect: (String) -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        options.forEach { (key, label) -> Chip(selected == key, label) { onSelect(key) } }
    }
}

@Composable
private fun LoadFailure(isFi: Boolean, error: Throwable, onSessionExpired: () -> Unit, onRetry: () -> Unit) {
    val status = (error as? ApiException)?.status
    when (status) {
        401 -> SessionExpiredCard(isFi = isFi, onReLogin = onSessionExpired)
        403 -> Card {
            Text(
                if (isFi) "Vain omistaja voi hallita hälytyksiä." else "Only the owner can manage alerts.",
                fontSize = 13.sp, fontWeight = FontWeight.SemiBold,
            )
        }
        else -> Card {
            Text(
                (if (isFi) "Lataus epäonnistui: " else "Couldn't load: ") + Api.friendly(error),
                fontSize = 12.sp, color = MaterialTheme.colorScheme.error,
            )
            TextButton(onClick = onRetry) { Text(if (isFi) "Yritä uudelleen" else "Retry") }
        }
    }
}

@Composable
private fun MiniBars(values: List<Int>, color: Color) {
    val empty = MaterialTheme.colorScheme.outlineVariant
    Canvas(Modifier.fillMaxWidth().height(56.dp)) {
        if (values.isEmpty()) return@Canvas
        val max = (values.maxOrNull() ?: 1).coerceAtLeast(1)
        val gap = 1.5.dp.toPx()
        val w = ((size.width - gap * (values.size - 1)) / values.size).coerceAtLeast(1f)
        values.forEachIndexed { i, v ->
            val h = if (v == 0) 1.5.dp.toPx() else (v.toFloat() / max) * size.height
            drawRoundRect(
                color = if (v == 0) empty else color,
                topLeft = Offset(i * (w + gap), size.height - h),
                size = Size(w, h),
                cornerRadius = CornerRadius(1.5.dp.toPx()),
            )
        }
    }
}

// ── Insights (container) ─────────────────────────────────────────────────

@Composable
internal fun AdminInsightsSection(isFi: Boolean, onSessionExpired: () -> Unit) {
    var sub by rememberSaveable { mutableStateOf("overview") }
    Column(Modifier.fillMaxSize()) {
        Box(Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
            ChipRow(
                listOf(
                    "overview" to (if (isFi) "Yleiskatsaus" else "Overview"),
                    "errors" to (if (isFi) "Virheet" else "Errors"),
                    "logs" to (if (isFi) "Lokit" else "Logs"),
                ),
                sub,
            ) { sub = it }
        }
        Box(Modifier.weight(1f)) {
            when (sub) {
                "overview" -> InsightsOverview(isFi, onSessionExpired)
                "errors" -> InsightsErrors(isFi, onSessionExpired)
                else -> AdminActivitySection(isFi, onSessionExpired)
            }
        }
    }
}

// ── Insights: overview ───────────────────────────────────────────────────

private data class Metric(val current: Int, val previous: Int)
private data class SummaryData(
    val metrics: Map<String, Metric>,
    val liveNow: Int,
    val livePlatforms: String,
    val bySource: List<Pair<String, Int>>,
)

private fun parseSummary(o: JsonObject): SummaryData {
    val m = o.jObj("metrics") ?: JsonObject(emptyMap())
    val metrics = m.mapValues { (_, v) ->
        val mo = v as? JsonObject
        Metric(mo?.jInt("current") ?: 0, mo?.jInt("previous") ?: 0)
    }
    val live = o.jObj("live")
    val platforms = live?.jObj("byPlatform")?.entries
        ?.joinToString(" · ") { "${(it.value as? JsonPrimitive)?.intOrNull ?: 0} ${it.key}" } ?: ""
    val src = o.jObj("bySource")?.entries
        ?.map { it.key to ((it.value as? JsonPrimitive)?.intOrNull ?: 0) }
        ?.sortedByDescending { it.second } ?: emptyList()
    return SummaryData(metrics, live?.jInt("now") ?: 0, platforms, src)
}

/** Zero-filled per-bucket totals matching the server's bucket size (hourly up to 7d, daily beyond). */
private fun series(rows: JsonArray, range: String): List<Int> {
    val hours = when (range) { "7d" -> 168; "30d" -> 720; "90d" -> 2160; else -> 24 }
    val step = if (hours <= 168) 3_600_000L else 86_400_000L
    val now = System.currentTimeMillis()
    val buckets = TreeMap<Long, Int>()
    var t = (now - hours * 3_600_000L) / step * step
    val end = now / step * step
    while (t <= end) { buckets[t] = 0; t += step }
    for (el in rows) {
        val o = el as? JsonObject ?: continue
        val ts = o.jStr("ts") ?: continue
        val ms = try { Instant.parse(ts).toEpochMilli() } catch (_: Throwable) { continue }
        val k = ms / step * step
        if (buckets.containsKey(k)) buckets[k] = (buckets[k] ?: 0) + o.jInt("n")
    }
    return buckets.values.toList()
}

@Composable
private fun Kpi(modifier: Modifier, label: String, m: Metric?, badWhenUp: Boolean = false, isFi: Boolean) {
    Column(
        modifier
            .clip(CardShape)
            .background(MaterialTheme.colorScheme.surfaceContainerLow)
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Masthead(label)
        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(m?.let { fmt(it.current) } ?: "…", fontSize = 24.sp, fontWeight = FontWeight.Bold)
            if (m != null) {
                val text = when {
                    m.previous == 0 && m.current == 0 -> "–"
                    m.previous == 0 -> if (isFi) "uusi" else "new"
                    else -> {
                        val pct = ((m.current - m.previous) * 100.0 / m.previous).roundToInt()
                        (if (pct > 0) "+" else "") + "$pct%"
                    }
                }
                val good = if (badWhenUp) m.current <= m.previous else m.current >= m.previous
                Text(
                    text,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (m.current == m.previous) MaterialTheme.colorScheme.onSurfaceVariant
                            else if (good) GOOD else MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(bottom = 3.dp),
                )
            }
        }
    }
}

private val RANGES = listOf("24h" to "24h", "7d" to "7d", "30d" to "30d", "90d" to "90d")

@Composable
private fun InsightsOverview(isFi: Boolean, onSessionExpired: () -> Unit) {
    var range by rememberSaveable { mutableStateOf("24h") }
    val summary = rememberRemote(range, refreshMs = 30_000) {
        parseSummary(Api.get("/admin/insights/summary?range=$range").jsonObject)
    }
    val ts = rememberRemote(range, refreshMs = 60_000) {
        Api.get("/admin/analytics/timeseries?range=$range").jsonObject
    }
    val s = summary.data
    val pageviews = remember(ts.data, range) { ts.data?.let { series(it.jArr("pageviews"), range) } ?: emptyList() }
    val errors = remember(ts.data, range) { ts.data?.let { series(it.jArr("errors"), range) } ?: emptyList() }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item { ChipRow(RANGES, range) { range = it } }
        summary.error?.takeIf { s == null }?.let { e ->
            item { LoadFailure(isFi, e, onSessionExpired) { summary.reload() } }
        }
        item {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(
                    Modifier.size(8.dp).clip(CircleShape)
                        .background(if ((s?.liveNow ?: 0) > 0) GOOD else MaterialTheme.colorScheme.outline),
                )
                Text(
                    if (s == null) "…" else "${s.liveNow} " + (if (isFi) "paikalla nyt" else "online now") +
                        (if (s.livePlatforms.isNotEmpty()) " · ${s.livePlatforms}" else ""),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                )
            }
        }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Kpi(Modifier.weight(1f), if (isFi) "Kävijät" else "Visitors", s?.metrics?.get("visitors"), isFi = isFi)
                    Kpi(Modifier.weight(1f), if (isFi) "Istunnot" else "Sessions", s?.metrics?.get("sessions"), isFi = isFi)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Kpi(Modifier.weight(1f), if (isFi) "Sivunäytöt" else "Pageviews", s?.metrics?.get("pageviews"), isFi = isFi)
                    Kpi(Modifier.weight(1f), if (isFi) "Haut" else "Searches", s?.metrics?.get("searches"), isFi = isFi)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Kpi(Modifier.weight(1f), if (isFi) "Toiminnot" else "Feature uses", s?.metrics?.get("features"), isFi = isFi)
                    Kpi(Modifier.weight(1f), if (isFi) "Virheet" else "Errors", s?.metrics?.get("errors"), badWhenUp = true, isFi = isFi)
                }
            }
        }
        item {
            Text(
                if (isFi) "Muutos edelliseen $range jaksoon verrattuna." else "Change vs the previous $range period.",
                fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        item {
            Card {
                Masthead(if (isFi) "Sivunäytöt" else "Pageviews")
                MiniBars(pageviews, MaterialTheme.colorScheme.primary)
            }
        }
        item {
            Card {
                Masthead(if (isFi) "Virheet" else "Errors")
                MiniBars(errors, MaterialTheme.colorScheme.error)
            }
        }
        s?.bySource?.takeIf { it.isNotEmpty() }?.let { sources ->
            item {
                Card {
                    Masthead(if (isFi) "Istunnot alustoittain" else "Sessions by platform")
                    val total = sources.sumOf { it.second }.coerceAtLeast(1)
                    sources.forEach { (name, n) ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(name, fontSize = 13.sp)
                            Text("$n · ${(n * 100.0 / total).roundToInt()}%", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
        item { Spacer(Modifier.height(8.dp)) }
    }
}

// ── Insights: grouped errors ─────────────────────────────────────────────

private data class ErrorGroup(
    val id: String,
    val message: String,
    val count: Int,
    val firstSeen: String?,
    val lastSeen: String?,
    val sources: String,
    val version: String?,
    val stack: String?,
    val url: String?,
    val isNew: Boolean,
)

private fun parseErrors(o: JsonObject): List<ErrorGroup> = o.jArr("groups").mapNotNull { el ->
    val g = el as? JsonObject ?: return@mapNotNull null
    ErrorGroup(
        id = g.jStr("id") ?: return@mapNotNull null,
        message = g.jStr("message") ?: "",
        count = g.jInt("count"),
        firstSeen = g.jStr("firstSeen"),
        lastSeen = g.jStr("lastSeen"),
        sources = g.jObj("sources")?.entries?.joinToString(" · ") { "${it.key} ${(it.value as? JsonPrimitive)?.intOrNull ?: 0}" } ?: "",
        version = (g.jArr("versions").firstOrNull() as? JsonArray)?.firstOrNull()?.let { (it as? JsonPrimitive)?.contentOrNull },
        stack = g.jStr("sampleStack"),
        url = g.jStr("sampleUrl"),
        isNew = g.jBool("isNew"),
    )
}

@Composable
private fun InsightsErrors(isFi: Boolean, onSessionExpired: () -> Unit) {
    val ctx = LocalContext.current
    var range by rememberSaveable { mutableStateOf("24h") }
    var open by rememberSaveable { mutableStateOf<String?>(null) }
    val remote = rememberRemote(range, refreshMs = 60_000) {
        parseErrors(Api.get("/admin/insights/errors?range=$range").jsonObject)
    }
    val groups = remote.data

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item { ChipRow(RANGES, range) { range = it } }
        remote.error?.takeIf { groups == null }?.let { e ->
            item { LoadFailure(isFi, e, onSessionExpired) { remote.reload() } }
        }
        if (groups != null) {
            item {
                Text(
                    "${groups.sumOf { it.count }} " + (if (isFi) "tapahtumaa" else "events") + " · ${groups.size} " +
                        (if (isFi) "ongelmaa" else "issues") + " · ${groups.count { it.isNew }} " +
                        (if (isFi) "uutta" else "new"),
                    fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (groups.isEmpty()) {
                item {
                    Card {
                        Text(
                            if (isFi) "Ei virheitä tällä aikavälillä." else "No errors in this range.",
                            fontSize = 13.sp, fontWeight = FontWeight.Medium,
                        )
                    }
                }
            }
            items(groups, key = { it.id }) { g ->
                val expanded = open == g.id
                Column(
                    Modifier
                        .fillMaxWidth()
                        .clip(CardShape)
                        .background(MaterialTheme.colorScheme.surfaceContainerLow)
                        .clickable { open = if (expanded) null else g.id }
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.Top) {
                        Box(
                            Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(MaterialTheme.colorScheme.errorContainer)
                                .padding(horizontal = 8.dp, vertical = 3.dp),
                        ) {
                            Text(fmt(g.count), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onErrorContainer)
                        }
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text(
                                g.message, fontSize = 13.sp, fontWeight = FontWeight.Medium,
                                maxLines = if (expanded) Int.MAX_VALUE else 3, overflow = TextOverflow.Ellipsis,
                            )
                            Text(
                                (if (g.isNew) (if (isFi) "UUSI · " else "NEW · ") else "") +
                                    g.sources + (g.version?.let { " · v$it" } ?: "") + " · " + agoLabel(g.lastSeen),
                                fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                    if (expanded) {
                        g.url?.let { Text(it, fontSize = 11.sp, fontFamily = FontFamily.Monospace, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                        Text(
                            (if (isFi) "Ensimmäinen: " else "First seen: ") + agoLabel(g.firstSeen) + (if (isFi) " sitten" else " ago"),
                            fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        if (g.stack != null) {
                            Text(
                                g.stack, fontSize = 10.sp, fontFamily = FontFamily.Monospace, lineHeight = 14.sp,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(MaterialTheme.colorScheme.surfaceContainerHigh)
                                    .padding(8.dp),
                            )
                        } else {
                            Text(
                                if (isFi) "Ei stack tracea." else "No stack trace was sent.",
                                fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        TextButton(onClick = {
                            val text = listOfNotNull(g.message, "Events: ${g.count}", g.sources, g.url, g.stack).joinToString("\n")
                            (ctx.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager)
                                ?.setPrimaryClip(ClipData.newPlainText("error", text))
                            Toast.makeText(ctx, if (isFi) "Kopioitu" else "Copied", Toast.LENGTH_SHORT).show()
                        }) {
                            Icon(Icons.Outlined.ContentCopy, null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text(if (isFi) "Kopioi virheraporttiin" else "Copy for bug report")
                        }
                    }
                }
            }
        }
        item { Spacer(Modifier.height(8.dp)) }
    }
}

// ── Alerts ───────────────────────────────────────────────────────────────

private data class RuleDef(val key: String, val fi: String, val en: String, val descFi: String, val descEn: String)

private val RULE_DEFS = listOf(
    RuleDef("crash", "Kaatuminen", "App crash", "Sovellus tai sivusto kaatuu", "The app or website crashes"),
    RuleDef("newError", "Uusi virhe", "New error", "Virhe, jota ei ole nähty 30 päivään", "An error not seen in 30 days"),
    RuleDef("errorSpike", "Virhepiikki", "Error spike", "Liikaa virheitä lyhyessä ajassa", "Too many errors in a short window"),
    RuleDef("loginFailures", "Epäonnistuneet kirjautumiset", "Failed sign-ins", "Joku saattaa arvailla salasanaa", "Someone may be guessing a password"),
    RuleDef("adminLogin", "Jokainen admin-kirjautuminen", "Every admin sign-in", "Kirjautuminen uudesta osoitteesta", "Sign-in from a new address"),
    RuleDef("ticket", "Uusi tukipyyntö", "New support ticket", "Joku lähettää tukipyynnön", "Someone files a ticket"),
    RuleDef("dailyDigest", "Päiväyhteenveto", "Daily digest", "Eilinen luvuiksi ja yleisimmät virheet", "Yesterday in numbers plus top errors"),
)

private data class AlertsData(
    val slackConfigured: Boolean,
    val slackHint: String?,
    val fcmConfigured: Boolean,
    val rules: Map<String, Boolean>,
    val deviceIds: List<String>,
    val history: List<JsonObject>,
)

private fun parseAlerts(o: JsonObject): AlertsData {
    val s = o.jObj("settings") ?: JsonObject(emptyMap())
    val rules = s.jObj("rules")?.mapValues { (_, v) -> (v as? JsonObject)?.jBool("enabled") ?: false } ?: emptyMap()
    return AlertsData(
        slackConfigured = s.jBool("slackConfigured"),
        slackHint = s.jStr("slackHint"),
        fcmConfigured = s.jBool("fcmConfigured"),
        rules = rules,
        deviceIds = o.jArr("devices").mapNotNull { (it as? JsonObject)?.jStr("id") },
        history = o.jArr("history").mapNotNull { it as? JsonObject }.take(10),
    )
}

@Composable
internal fun AdminAlertsSection(isFi: Boolean, onSessionExpired: () -> Unit) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val remote = rememberRemote(refreshMs = 30_000) { parseAlerts(Api.get("/admin/alerts").jsonObject) }
    val data = remote.data
    var message by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val optimistic = remember { mutableStateMapOf<String, Boolean>() }

    // The last 8 characters identify this phone in the server's device list.
    var phoneTail by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) {
        phoneTail = withContext(Dispatchers.IO) {
            try { FirebaseMessaging.getInstance().token.await().takeLast(8) }
            catch (e: CancellationException) { throw e }
            catch (_: Throwable) { null }
        }
    }
    val phoneOn = phoneTail != null && data?.deviceIds?.contains(phoneTail) == true

    fun setPhone(on: Boolean) {
        scope.launch {
            busy = true
            try {
                withContext(Dispatchers.IO) {
                    val token = FirebaseMessaging.getInstance().token.await()
                    if (on) AdminAlerts.register(token) else AdminAlerts.unregister(token)
                }
                AdminAlerts.setEnabled(ctx, on)
                remote.reload()
                message = null
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                message = (e as? ApiException)?.takeIf { it.status == 403 }
                    ?.let { if (isFi) "Vain omistaja voi rekisteröidä laitteen." else "Only the owner can register a device." }
                    ?: Api.friendly(e)
            } finally {
                busy = false
            }
        }
    }

    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) setPhone(true)
        else message = if (isFi) "Ilmoitukset on estetty. Salli ne Androidin asetuksista." else "Notifications are blocked. Allow them in Android settings."
    }

    fun toggleRule(key: String, on: Boolean) {
        optimistic[key] = on
        scope.launch {
            try {
                withContext(Dispatchers.IO) {
                    Api.put("/admin/alerts/settings", buildJsonObject {
                        put("rules", buildJsonObject { put(key, buildJsonObject { put("enabled", on) }) })
                    })
                }
                remote.reload()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                message = Api.friendly(e)
            } finally {
                optimistic.remove(key)
            }
        }
    }

    fun sendTest() {
        scope.launch {
            busy = true
            try {
                val res = withContext(Dispatchers.IO) { Api.post("/admin/alerts/test", JsonObject(emptyMap())).jsonObject }
                val parts = mutableListOf<String>()
                res.jStr("slack")?.let { parts += "Slack: $it" }
                res.jObj("push")?.let { parts += (if (isFi) "Puhelimet: " else "Phones: ") + it.jInt("sent") + (if (isFi) " toimitettu" else " delivered") }
                message = when (res.jStr("status")) {
                    "sent" -> parts.joinToString(" · ").ifEmpty { "OK" }
                    "no_channel" -> if (isFi) "Ei kanavaa: yhdistä Slack tai rekisteröi puhelin." else "No channel: connect Slack or register a phone first."
                    else -> res.jStr("error") ?: (if (isFi) "Ei lähetetty." else "Not sent.")
                }
                remote.reload()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                message = Api.friendly(e)
            } finally {
                busy = false
            }
        }
    }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        remote.error?.takeIf { data == null }?.let { e ->
            item { LoadFailure(isFi, e, onSessionExpired) { remote.reload() } }
        }
        message?.let { m ->
            item {
                Text(
                    m,
                    fontSize = 12.sp,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(CardShape)
                        .background(MaterialTheme.colorScheme.secondaryContainer)
                        .padding(12.dp),
                    color = MaterialTheme.colorScheme.onSecondaryContainer,
                )
            }
        }
        if (data != null) {
            item {
                Card {
                    Masthead(if (isFi) "Tämä puhelin" else "This phone")
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(if (isFi) "Ilmoita tälle puhelimelle" else "Notify this phone", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                            Text(
                                if (isFi) "Hälytykset tulevat push-ilmoituksina." else "Alerts arrive as push notifications.",
                                fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Switch(
                            checked = phoneOn,
                            enabled = !busy && phoneTail != null,
                            onCheckedChange = { on ->
                                if (on && Build.VERSION.SDK_INT >= 33 &&
                                    ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
                                ) permission.launch(Manifest.permission.POST_NOTIFICATIONS)
                                else setPhone(on)
                            },
                        )
                    }
                    if (!data.fcmConfigured) {
                        Text(
                            if (isFi) "Palvelimella ei ole FIREBASE-asetuksia, joten push ei toimi vielä."
                            else "The server has no FIREBASE settings yet, so push can't be delivered.",
                            fontSize = 12.sp, color = MaterialTheme.colorScheme.error,
                        )
                    }
                }
            }
            item {
                Card {
                    Masthead("Slack")
                    Text(
                        if (data.slackConfigured) (if (isFi) "Yhdistetty" else "Connected") + (data.slackHint?.let { " ($it)" } ?: "")
                        else (if (isFi) "Ei yhdistetty. Lisää webhook verkon hallinnassa: Analytiikka → Alerts." else "Not connected. Add the webhook on the web admin: Analytics → Alerts."),
                        fontSize = 13.sp,
                    )
                    OutlinedButton(onClick = { sendTest() }, enabled = !busy, shape = RoundedCornerShape(8.dp)) {
                        Text(if (isFi) "Lähetä testihälytys" else "Send test alert")
                    }
                }
            }
            item {
                Card {
                    Masthead(if (isFi) "Hälytä kun" else "Alert when")
                    RULE_DEFS.forEach { r ->
                        val on = optimistic[r.key] ?: data.rules[r.key] ?: false
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(if (isFi) r.fi else r.en, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                Text(if (isFi) r.descFi else r.descEn, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Switch(checked = on, onCheckedChange = { toggleRule(r.key, it) })
                        }
                    }
                    Text(
                        if (isFi) "Kynnysarvot muutetaan verkon hallinnassa." else "Thresholds are changed on the web admin.",
                        fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            item {
                Card {
                    Masthead(if (isFi) "Historia" else "History")
                    if (data.history.isEmpty()) {
                        Text(if (isFi) "Ei lähetettyjä hälytyksiä." else "No alerts sent yet.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    data.history.forEach { h ->
                        Column(verticalArrangement = Arrangement.spacedBy(1.dp)) {
                            Text(h.jStr("title") ?: "", fontSize = 13.sp, fontWeight = FontWeight.Medium)
                            Text(
                                agoLabel(h.jStr("createdAt")) +
                                    (h.jStr("slack")?.let { " · Slack $it" } ?: "") +
                                    (if (h.jInt("pushSent") + h.jInt("pushFailed") > 0) " · ${h.jInt("pushSent")}/${h.jInt("pushSent") + h.jInt("pushFailed")} ${if (isFi) "puhelinta" else "phones"}" else ""),
                                fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        } else if (remote.loading && remote.error == null) {
            item { Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 2.dp) } }
        }
        item { Spacer(Modifier.height(8.dp)) }
    }
}
