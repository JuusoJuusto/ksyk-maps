package fi.ksykmaps.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
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
import fi.ksykmaps.BuildConfig

/**
 * In-app changelog. The list lives in code so users on stale bundles
 * still see something meaningful — the alternative was fetching from
 * /api/changelog and hitting a blank screen while offline.
 */

private data class ChangelogEntry(
    val version: String,
    val date: String,
    val titleFi: String,
    val titleEn: String,
    val highlightsFi: List<String>,
    val highlightsEn: List<String>,
)

private val CHANGELOG = listOf(
    ChangelogEntry(
        version = "1.72.0",
        date = "September 2026",
        titleFi = "Kartan tiilikaavu vaihdettu · admin-analytiikka korjattu",
        titleEn = "Map tile CDN swapped · admin analytics fixed",
        highlightsFi = listOf(
            "Web-kartta käyttää nyt CartoDB Voyager -tiiliä OSM-tiilien sijaan — merkittävästi luotettavampi latautuminen ja parempi zoomaustuki.",
            "Ylläpitäjän analytiikan 401-virheet korjattu — Overview-välilehti ja Analytics & Logs → External toimivat taas.",
            "Sentry-tunnelin 403-virhe korjattu.",
            "Lukujärjestyswidget: 'Tänään/Huomenna/Tällä viikolla' -merkintä päivävalitsimessa.",
        ),
        highlightsEn = listOf(
            "Web map uses CartoDB Voyager tiles instead of OSM standard tiles — significantly more reliable loading and better high-zoom support.",
            "Admin analytics 401 errors fixed — Overview tab and Analytics & Logs → External work again.",
            "Sentry tunnel 403 fixed.",
            "TodaySchedule widget: 'Today/Tomorrow/This week' badge in the day nav.",
        ),
    ),
    ChangelogEntry(
        version = "1.71.0",
        date = "September 2026",
        titleFi = "Kartan kaatuminen korjattu, kaatumislokit ylläpitäjälle",
        titleEn = "Map crash fixed, crash logs go to admin",
        highlightsFi = listOf(
            "Korjattu: kartta kaatoi koko sovelluksen avattaessa. Firebase Analyticsin automaattinen käynnistys latasi Play Services -riippuvuuksia jotka törmäsivät MapLibren kanssa.",
            "Kaatumislokit menevät nyt suoraan hallintapaneeliin — ei enää sähköpostin jakoa.",
            "Uusi Muutosloki-näyttö asetuksissa.",
            "Perehdytys lyhennetty 5 sivusta 3 sivuun.",
            "Vikailmoituksilla nyt tilat: avoin, käsittelyssä, suljettu.",
        ),
        highlightsEn = listOf(
            "Fixed: map crashed the whole app on open. Firebase Analytics auto-init pulled transitive deps that clashed with MapLibre.",
            "Crash logs now upload straight to the admin panel — no more share sheet email.",
            "New Changelog screen in Settings.",
            "Onboarding shortened from 5 to 3 screens.",
            "Bug reports now have workflow states: open, in progress, closed.",
        ),
    ),
    ChangelogEntry(
        version = "1.70.0",
        date = "September 2026",
        titleFi = "Widget-tekstien skaalaus + 6 riviä",
        titleEn = "Adaptive widget text + 6-row schedule",
        highlightsFi = listOf(
            "Kaikki widgetit skaalautuvat nyt leveyden mukaan.",
            "Päivän lukujärjestys -widget tukee jopa 6 riviä korkeuden mukaan.",
        ),
        highlightsEn = listOf(
            "All widgets now scale text by width.",
            "Today's Schedule widget supports up to 6 rows depending on height.",
        ),
    ),
    ChangelogEntry(
        version = "1.69.0",
        date = "September 2026",
        titleFi = "FCM-ilmoitukset",
        titleEn = "FCM push notifications",
        highlightsFi = listOf(
            "Push-ilmoitukset koulun kuulutuksista.",
            "Ylläpito voi lähettää ilmoituksia kaikille laitteille hallintapaneelista.",
        ),
        highlightsEn = listOf(
            "Push notifications for school announcements.",
            "Admins can broadcast notifications to all devices from the admin panel.",
        ),
    ),
    ChangelogEntry(
        version = "1.68.0",
        date = "September 2026",
        titleFi = "Palaute + vikailmoitukset",
        titleEn = "Feedback + bug reports",
        highlightsFi = listOf(
            "Anna palautetta ja ilmoita vioista suoraan sovelluksesta.",
            "Merkin määrä rajoitettu 1000 merkkiin.",
            "Rakennuksien reitityssolmujen apuvälineet Builderissa.",
        ),
        highlightsEn = listOf(
            "Send feedback and bug reports straight from the app.",
            "Message limit enforced at 1000 characters.",
            "Nav-node helper tools in the Builder.",
        ),
    ),
    ChangelogEntry(
        version = "1.60.0",
        date = "September 2026",
        titleFi = "Käyttöliittymän uudistus",
        titleEn = "UX rehaul",
        highlightsFi = listOf(
            "Alanavigaatiopalkki: aina 5 välilehteä.",
            "Admin siirretty Asetukset → Tili -osioon.",
        ),
        highlightsEn = listOf(
            "Bottom bar: always 5 tabs.",
            "Admin moved to Settings → Account.",
        ),
    ),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChangelogScreen(onBack: () -> Unit) {
    val ctx = LocalContext.current
    val isFi = getAppLanguage(ctx) == "fi"

    Scaffold(
        containerColor = MaterialTheme.colorScheme.surface,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            if (isFi) "Muutosloki" else "Changelog",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 18.sp,
                        )
                        Text(
                            "v${BuildConfig.VERSION_NAME}",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Outlined.ArrowBack,
                            contentDescription = if (isFi) "Takaisin" else "Back",
                        )
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
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(CHANGELOG) { entry ->
                EntryCard(entry, isFi, isCurrent = entry.version == BuildConfig.VERSION_NAME)
            }
            item { Spacer(Modifier.height(24.dp)) }
        }
    }
}

@Composable
private fun EntryCard(entry: ChangelogEntry, isFi: Boolean, isCurrent: Boolean) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isCurrent)
                MaterialTheme.colorScheme.primaryContainer
            else
                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
        ),
        elevation = CardDefaults.cardElevation(0.dp),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "v${entry.version}",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isCurrent)
                        MaterialTheme.colorScheme.onPrimaryContainer
                    else
                        MaterialTheme.colorScheme.onSurface,
                )
                if (isCurrent) {
                    Spacer(Modifier.width(8.dp))
                    Box(
                        Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(MaterialTheme.colorScheme.primary)
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            if (isFi) "NYT" else "NOW",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimary,
                        )
                    }
                }
                Spacer(Modifier.weight(1f))
                Text(
                    entry.date,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.height(4.dp))
            Text(
                if (isFi) entry.titleFi else entry.titleEn,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = if (isCurrent)
                    MaterialTheme.colorScheme.onPrimaryContainer
                else
                    MaterialTheme.colorScheme.onSurface,
            )
            Spacer(Modifier.height(10.dp))
            (if (isFi) entry.highlightsFi else entry.highlightsEn).forEach { line ->
                Row(Modifier.padding(vertical = 3.dp)) {
                    Text("•", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.width(8.dp))
                    Text(
                        line,
                        fontSize = 13.sp,
                        lineHeight = 18.sp,
                        color = if (isCurrent)
                            MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.9f)
                        else
                            MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}
