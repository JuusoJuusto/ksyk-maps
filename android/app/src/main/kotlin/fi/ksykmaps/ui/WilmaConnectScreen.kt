package fi.ksykmaps.ui

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import fi.ksykmaps.data.Api
import fi.ksykmaps.data.ApiException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*
import java.time.LocalDate
import java.util.UUID

private const val WILMA_PREFS = "ksyk_wilma"
private const val WILMA_URL_KEY = "ical_url"

private fun wilmaPrefs(ctx: Context): SharedPreferences =
    ctx.getSharedPreferences(WILMA_PREFS, Context.MODE_PRIVATE)

fun getStoredWilmaUrl(ctx: Context): String? =
    wilmaPrefs(ctx).getString(WILMA_URL_KEY, null)?.takeIf { it.isNotBlank() }

private fun saveWilmaUrl(ctx: Context, url: String) =
    wilmaPrefs(ctx).edit().putString(WILMA_URL_KEY, url.trim()).apply()

private fun clearWilmaUrl(ctx: Context) =
    wilmaPrefs(ctx).edit().remove(WILMA_URL_KEY).apply()

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WilmaConnectScreen(
    onBack: () -> Unit,
    onImported: () -> Unit = {},
) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    LanguageState.init(ctx); val lang = LanguageState.current ?: "fi"

    var storedUrl by remember { mutableStateOf(getStoredWilmaUrl(ctx) ?: "") }
    var url by remember { mutableStateOf(storedUrl) }
    var syncing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var successStats by remember { mutableStateOf<Pair<Int, Int>?>(null) } // total, matched
    var showInstructions by remember { mutableStateOf(storedUrl.isEmpty()) }

    val connected = storedUrl.isNotBlank()

    fun connect(targetUrl: String = url) {
        val trimmed = targetUrl.trim()
        if (trimmed.isBlank()) { error = if (lang == "fi") "Liitä Wilma iCalendar -URL alle." else "Please paste your Wilma iCalendar URL."; return }
        if (!trimmed.startsWith("http")) { error = if (lang == "fi") "URL:n täytyy alkaa https://" else "The URL must start with https://"; return }
        error = null
        syncing = true
        scope.launch(Dispatchers.IO) {
            try {
                val jaksot = loadJaksot(ctx)
                val body = buildJsonObject { put("url", trimmed) }
                val result = Api.post("/calendar/parse", body)
                val obj = result.jsonObject
                val eventsArr = obj["events"]?.jsonArray ?: JsonArray(emptyList())

                val imported = eventsArr.mapNotNull { el ->
                    try {
                        val ev = el.jsonObject
                        val dow = ev["dayOfWeek"]?.jsonPrimitive?.intOrNull ?: return@mapNotNull null
                        val start = ev["startHhmm"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null
                        val end = ev["endHhmm"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null
                        val summary = ev["summary"]?.jsonPrimitive?.contentOrNull ?: return@mapNotNull null
                        // Prefer server-provided localDate (YYYY-MM-DD, already
                        // in Europe/Helsinki). Fall back to date if server is
                        // an older version — but strip the time portion first
                        // because the JS Date field serialises to full ISO
                        // ("2026-10-06T00:00:00.000Z") which LocalDate.parse
                        // rejects. That silent parse failure was why every
                        // lesson used to end up with jaksoId="all" and show
                        // in every period.
                        val rawDate = (ev["localDate"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull
                            ?: (ev["date"] as? kotlinx.serialization.json.JsonPrimitive)?.contentOrNull
                        val dateStr = rawDate?.take(10)
                        val jaksoId = if (dateStr != null && dateStr.matches(Regex("\\d{4}-\\d{2}-\\d{2}"))) {
                            try {
                                jaksot.firstOrNull { j -> j.startDate <= dateStr && dateStr <= j.endDate }?.id ?: "all"
                            } catch (_: Exception) { "all" }
                        } else "all"
                        // Include jaksoId in the id so two templates from
                        // the same Wilma VEVENT (spanning multiple jaksos)
                        // don't collide on save/lookup.
                        val uidStr = ev["uid"]?.jsonPrimitive?.contentOrNull ?: UUID.randomUUID().toString()
                        ScheduleEntry(
                            id = "wilma_${uidStr}_${jaksoId}",
                            dayOfWeek = dow,
                            startHhmm = start,
                            endHhmm = end,
                            subject = summary,
                            roomId = ev["matchedRoomId"]?.jsonPrimitive?.contentOrNull ?: "",
                            roomNumber = ev["matchedRoomNumber"]?.jsonPrimitive?.contentOrNull ?: "",
                            teacher = ev["teacher"]?.jsonPrimitive?.contentOrNull ?: "",
                            jaksoId = jaksoId,
                        )
                    } catch (_: Exception) { null }
                }

                // Deduplicate by (dayOfWeek, start+end, subject, jaksoId) —
                // RRULE expansion produces one entry per occurrence, but for
                // the weekly timetable we only need one per unique pattern per jakso.
                val deduped = imported
                    .distinctBy { listOf(it.dayOfWeek, it.startHhmm, it.endHhmm, it.subject, it.jaksoId) }
                // Keep manually added entries, replace all wilma_ ones
                val existing = loadEntries(ctx)
                val manual = existing.filter { !it.id.startsWith("wilma_") }
                saveEntries(ctx, manual + deduped)
                saveWilmaUrl(ctx, trimmed)

                withContext(Dispatchers.Main) {
                    storedUrl = trimmed
                    url = trimmed
                    successStats = Pair(deduped.size, deduped.count { it.roomId.isNotBlank() })
                    syncing = false
                    onImported()
                }
            } catch (e: Exception) {
                val msg = if (lang == "fi") when {
                    e is ApiException && e.status == 0 -> "Verkkovirhe — tarkista yhteytesi."
                    e.message?.contains("FETCH_ERROR", ignoreCase = true) == true ->
                        "Kalenterin URL:iin ei saatu yhteyttä. Varmista, että se on oikein."
                    e.message?.contains("NOT_CALENDAR", ignoreCase = true) == true ->
                        "URL ei osoita kalenteritiedostoon."
                    e.message?.contains("TIMEOUT", ignoreCase = true) == true ->
                        "Kalenteripalvelin vastasi liian hitaasti."
                    else -> e.message ?: "Synkronointi epäonnistui"
                } else when {
                    e is ApiException && e.status == 0 -> "Network error — check your connection."
                    e.message?.contains("FETCH_ERROR", ignoreCase = true) == true ->
                        "Could not reach the calendar URL. Make sure it is correct and accessible."
                    e.message?.contains("NOT_CALENDAR", ignoreCase = true) == true ->
                        "The URL does not point to a calendar file."
                    e.message?.contains("TIMEOUT", ignoreCase = true) == true ->
                        "The calendar server took too long to respond."
                    else -> e.message ?: "Sync failed"
                }
                withContext(Dispatchers.Main) {
                    error = msg
                    syncing = false
                }
            }
        }
    }

    fun disconnect() {
        clearWilmaUrl(ctx)
        storedUrl = ""
        url = ""
        successStats = null
        error = null
        showInstructions = true
        scope.launch(Dispatchers.IO) {
            val existing = loadEntries(ctx)
            saveEntries(ctx, existing.filter { !it.id.startsWith("wilma_") })
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (lang == "fi") "Wilma-kalenteri" else "Wilma Calendar", fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Outlined.ArrowBack, "Back")
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
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Header
            item {
                ElevatedCard(Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
                    Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Outlined.CalendarMonth, null,
                            modifier = Modifier.size(36.dp),
                            tint = MaterialTheme.colorScheme.primary,
                        )
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text(if (lang == "fi") "Tuo Wilmasta" else "Import from Wilma", fontWeight = FontWeight.Bold)
                            Text(
                                if (lang == "fi") "Synkronoi lukujärjestys automaattisesti — ei salasanaa tarvita."
                                else "Sync your timetable automatically — no password needed.",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }

            // Connected status card
            if (connected) {
                item {
                    Card(
                        Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.primaryContainer,
                        ),
                    ) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    Icons.Outlined.CheckCircle, null,
                                    modifier = Modifier.size(18.dp),
                                    tint = MaterialTheme.colorScheme.primary,
                                )
                                Spacer(Modifier.width(8.dp))
                                Text(if (lang == "fi") "Kalenteri yhdistetty" else "Calendar connected", fontWeight = FontWeight.SemiBold)
                            }
                            successStats?.let { (total, matched) ->
                                Text(
                                    if (lang == "fi") "$total tuntia tuotu · $matched luokkaa tunnistettu"
                                    else "$total lessons imported · $matched rooms matched",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(
                                    onClick = { connect() },
                                    enabled = !syncing,
                                    modifier = Modifier.weight(1f),
                                ) {
                                    Text(if (syncing) (if (lang == "fi") "Synkronoidaan…" else "Syncing…") else (if (lang == "fi") "Synkronoi nyt" else "Sync now"), fontSize = 13.sp)
                                }
                                Button(
                                    onClick = ::disconnect,
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = MaterialTheme.colorScheme.error,
                                    ),
                                    modifier = Modifier.weight(1f),
                                ) {
                                    Text(if (lang == "fi") "Poista yhteys" else "Disconnect", fontSize = 13.sp)
                                }
                            }
                        }
                    }
                }
            }

            // Instructions
            if (showInstructions) {
                item {
                    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp)) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text(if (lang == "fi") "Kuinka löydät iCalendar-URL:n" else "How to find your iCalendar URL", fontWeight = FontWeight.SemiBold)

                            InstructionList(
                                label = "English",
                                steps = listOf(
                                    "Log in to Wilma (ksyk.inschool.fi)",
                                    "Click your name or profile icon (top-right corner)",
                                    "Go to Timetable",
                                    "Find Subscribe to calendar / iCal link",
                                    "Copy the URL starting with https://",
                                    "Paste it below",
                                ),
                            )

                            HorizontalDivider()

                            InstructionList(
                                label = "Suomi",
                                steps = listOf(
                                    "Kirjaudu Wilmaan (ksyk.inschool.fi)",
                                    "Klikkaa nimeäsi tai profiili-kuvaketta (oikeassa yläkulmassa)",
                                    "Siirry Lukujärjestys-osioon",
                                    "Etsi Tilaa kalenteri / iCal -linkki",
                                    "Kopioi URL, joka alkaa https://",
                                    "Liitä se alle",
                                ),
                            )

                            Card(
                                shape = RoundedCornerShape(8.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.secondaryContainer,
                                ),
                            ) {
                                Row(Modifier.padding(10.dp), verticalAlignment = Alignment.Top) {
                                    Icon(
                                        Icons.Outlined.Lock, null,
                                        modifier = Modifier.size(14.dp),
                                        tint = MaterialTheme.colorScheme.secondary,
                                    )
                                    Spacer(Modifier.width(6.dp))
                                    Text(
                                        if (lang == "fi") "Tämä URL on henkilökohtainen — käsittele sitä kuten salasanaa. " +
                                            "KSYK Maps tallentaa sen vain tälle laitteelle, ei koskaan palvelimelle."
                                        else "This URL is personal — treat it like a password. " +
                                            "KSYK Maps stores it only on this device, never on a server.",
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSecondaryContainer,
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // URL input
            item {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        "Wilma iCalendar URL",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    OutlinedTextField(
                        value = url,
                        onValueChange = { url = it; error = null },
                        placeholder = { Text("https://ksyk.inschool.fi/...?ical=...", fontSize = 12.sp) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        isError = error != null,
                        enabled = !syncing,
                        shape = RoundedCornerShape(12.dp),
                    )
                    if (!showInstructions) {
                        TextButton(
                            onClick = { showInstructions = true },
                            contentPadding = PaddingValues(0.dp),
                        ) {
                            Text(if (lang == "fi") "Mistä löydän tämän URL:n?" else "Where do I find this URL?", fontSize = 12.sp)
                        }
                    }
                }
            }

            // Error card
            if (error != null) {
                item {
                    Card(
                        Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer,
                        ),
                    ) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(
                                error!!, fontWeight = FontWeight.SemiBold, fontSize = 13.sp,
                                color = MaterialTheme.colorScheme.onErrorContainer,
                            )
                            Text(
                                if (lang == "fi") "Vianetsintä:" else "Troubleshooting:",
                                fontWeight = FontWeight.Medium, fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onErrorContainer,
                            )
                            val tips = if (lang == "fi") listOf(
                                "Varmista, että URL alkaa https://",
                                "URL on saattanut vanhentua — luo uusi Wilmassa",
                                "Kokeile avata URL selaimessa varmistaaksesi, että se toimii",
                                "Varmista, että kopioit koko URL:n (ei rivinvaihtoja)",
                            ) else listOf(
                                "Make sure the URL starts with https://",
                                "The URL may have expired — generate a new one in Wilma",
                                "Try opening the URL in a browser to confirm it works",
                                "Make sure you copied the full URL (no line breaks)",
                            )
                            tips.forEach { s ->
                                Row {
                                    Text("• ", fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onErrorContainer)
                                    Text(s, fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onErrorContainer)
                                }
                            }
                        }
                    }
                }
            }

            // Connect button
            if (!connected || error != null) {
                item {
                    Button(
                        onClick = { connect() },
                        enabled = !syncing && url.trim().isNotBlank(),
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        shape = RoundedCornerShape(14.dp),
                    ) {
                        if (syncing) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.onPrimary,
                            )
                            Spacer(Modifier.width(8.dp))
                        }
                        Text(
                            when {
                                syncing -> if (lang == "fi") "Yhdistetään…" else "Connecting…"
                                connected -> if (lang == "fi") "Yhdistä uudelleen" else "Reconnect"
                                else -> if (lang == "fi") "Yhdistä kalenteri" else "Connect calendar"
                            },
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
            }

            // Privacy footer
            item {
                Text(
                    if (lang == "fi") "Kalenteri-URL tallennetaan vain tälle laitteelle. Sitä ei jaeta eikä kirjata lokiin."
                    else "Your calendar URL is stored only on this device. It is never shared or logged.",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                )
            }
        }
    }
}

@Composable
private fun InstructionList(label: String, steps: List<String>) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            label, fontSize = 11.sp, fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        steps.forEachIndexed { i, s ->
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    "${i + 1}.", fontSize = 12.sp,
                    modifier = Modifier.width(18.dp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(s, fontSize = 12.sp)
            }
        }
    }
}
