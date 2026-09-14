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
        version = "1.82.0",
        date = "September 2026",
        titleFi = "Production-ready siivous",
        titleEn = "Production-ready cleanup",
        highlightsFi = listOf(
            "Dev-testinapit poistettu Diagnostiikasta ('Rekisteröi push-token', 'Kopioi FCM-token') — rekisteröinti tapahtuu automaattisesti käynnistyksessä uudelleenyrityksellä.",
            "Karttatiilet OSM-standardiin — CartoDB lisäsi 'API KEY REQUIRED' -vesileiman syyskuussa 2026 tunnistamattomille käyttäjille.",
            "Web-admin: viestimallit poistettu Notifications-kortista.",
            "Web-admin: uusi 'Danger zone' Asetuksissa — kolme nappia analytiikan ja lokien nollaukseen.",
        ),
        highlightsEn = listOf(
            "Dev-facing FCM test buttons removed from Diagnostics — registration is automatic with retry backoff.",
            "Map tiles switched back to OSM standard — CartoDB started requiring an API key in Sep 2026.",
            "Web admin: message templates removed from Notifications card.",
            "Web admin: new 'Danger zone' in Settings — three buttons to reset analytics events / app logs / everything.",
        ),
    ),
    ChangelogEntry(
        version = "1.81.0",
        date = "September 2026",
        titleFi = "FCM upload retry + reset tokens + viestimallit",
        titleEn = "FCM upload retry + reset tokens + message templates",
        highlightsFi = listOf(
            "FCM-tokenin lähetys yrittää nyt uudelleen 2 s → 5 s → 15 s → 30 s → 60 s välein jos DNS pettää — WiFi-vaihdot ja lukitusruudun herätykset eivät enää tiputa rekisteröintiä.",
            "Uusi admin-nappi 'Reset all tokens' Notifications-välilehdellä — tyhjentää koko push_tokens-taulun (käyttäjät rekisteröityvät uudelleen sovelluksen avatessa).",
            "Web-admin: 6 valmista viestimallia (Peruttu / Luokka vaihtui / Lounas myöhässä / Ei koulua / Kokous / Juhla) — täyttää lomakkeen yhdellä napsautuksella.",
            "Otsikko- ja viestikentät näyttävät nyt merkkilaskurit (65 / 240) — pitkiä viestejä Android ei näytä täydellisenä lukitusruudulla.",
        ),
        highlightsEn = listOf(
            "FCM token upload retries with backoff (2s → 5s → 15s → 30s → 60s) if DNS fails — Wi-Fi handoffs no longer drop registrations.",
            "New 'Reset all tokens' button in admin Notifications tab — purges the entire push_tokens table.",
            "Web admin: 6 message templates (Cancelled / Room changed / Lunch delayed / No school / Meeting / Event) — one-tap form fill.",
            "Title + body fields show character counters (65 / 240) — long messages get truncated on Android lock screen.",
        ),
    ),
    ChangelogEntry(
        version = "1.80.0",
        date = "September 2026",
        titleFi = "FCM oikeasti toimii · widgetin XXXXL-koko · broadcast-historia",
        titleEn = "FCM actually works · widget XXXXL size · broadcast history",
        highlightsFi = listOf(
            "KRIITTINEN: Firebase Admin -SDK käyttää nyt modulaarista firebase-admin/app + firebase-admin/messaging API:a — aiempi 'Cannot read properties of undefined (reading length)' -virhe korjattu.",
            "Widget: XXXXL-taso (leveys > 1000dp): aine 40sp / 56sp, luokka 24sp.",
            "Asetukset → Diagnostiikka: uusi 'Kopioi FCM-token' -nappi — voit liittää tokenin Firebase Consolen 'Send test message' -kohtaan ja testata ilman meidän backendia.",
            "Hallintapaneeli: uusi 'Broadcast history' -kortti — viimeiset 50 push-lähetystä tilastoineen (kuinka monelle mennyt / kuinka monelle onnistui / prosentti).",
        ),
        highlightsEn = listOf(
            "CRITICAL: Firebase Admin SDK now uses the modular firebase-admin/app + firebase-admin/messaging API — fixes the 'Cannot read properties of undefined (reading length)' error.",
            "Widget XXXXL bucket (width > 1000dp): subject 40sp / 56sp, room 24sp.",
            "Settings → Diagnostics: 'Copy FCM token' button — paste into Firebase Console 'Send test message' to bypass our backend entirely.",
            "Admin: 'Broadcast history' card — last 50 pushes with delivery stats (sent/total, success rate).",
        ),
    ),
    ChangelogEntry(
        version = "1.79.0",
        date = "September 2026",
        titleFi = "Widget-asetukset + isommat napit + selainkohtainen istuntoreplay",
        titleEn = "Widget configure activity + bigger buttons + in-app session replay",
        highlightsFi = listOf(
            "Widgetissä on nyt asetusnäyttö — kun lisäät sen, näet valintoja: piilota menneet, rullaa seuraavaan päivään, näytä päivämerkki.",
            "Widgetin nuolinapit vielä isommat (56×48dp) ja fonttikoko 34sp — helppo napata sormella.",
            "Widget-rivit korkeampia (paddingTop/Bottom 8dp) — luettavuus paranee kun venytät widgetin suureksi.",
            "Web admin: sessioiden 'Watch replay' -näkymä on nyt sisäänrakennettu — aikajana + play/pause/scrub + hyppy virheeseen ilman että tarvitsee mennä PostHogiin.",
            "Web admin: 'Watch replay in PostHog' -linkki on yhä session-otsikossa jos haluat täyden video-replayn.",
        ),
        highlightsEn = listOf(
            "Widget: new configure screen when adding a TodaySchedule — options for hide-past, auto-roll-forward, day-chip visibility.",
            "Widget arrow buttons even bigger (56×48dp) with 34sp glyph — easier to tap.",
            "Widget rows taller (paddingTop/Bottom 8dp) — better readability when stretched large.",
            "Web admin: session drill dialog gained an inline scrubbable replay timeline — play/pause/scrub events + jump-to-first-error, no need to leave for PostHog for the basic case.",
            "Web admin: 'Watch replay in PostHog' still available in the header for the full video replay.",
        ),
    ),
    ChangelogEntry(
        version = "1.78.0",
        date = "September 2026",
        titleFi = "FCM require-bug korjattu · isommat widgetit · admin-diagnostiikka",
        titleEn = "FCM require bug fixed · bigger widgets · admin diagnostics",
        highlightsFi = listOf(
            "KRIITTINEN KORJAUS: FCM Firebase Admin ei käynnistynyt Vercelillä koska serveri käytti require(), joka on ESM-projektissa määrittelemätön. Nyt dynamic import — FCM lähetykset toimivat vihdoin.",
            "Web admin: Firebase Admin -käynnistysvirhe näkyy suurella punaisella laatikolla jos konfiguraatio on rikki.",
            "Web admin: viimeisimmät 5 rekisteröityä laitetta näkyvät listana + auto-refresh 15 sekunnin välein.",
            "Web admin: kaatumislokien 'Copy' -nappi kopioi koko lokin leikepöydälle.",
            "Widgetit skaalautuvat XXXL-tilaan (>800dp): aineen fonttikoko 44sp, TodaySchedule 32sp.",
            "Widget maxResize nostettu 2000dp:hen — voit venyttää widgetin lähes koko näytön kokoiseksi.",
        ),
        highlightsEn = listOf(
            "CRITICAL FIX: FCM Firebase Admin failed to init on Vercel because the server used require(), which is undefined in ESM modules. Switched to dynamic import — FCM broadcasts finally work.",
            "Web admin: Firebase Admin init error shown in a big red banner if config is broken.",
            "Web admin: last 5 registered devices listed + auto-refresh every 15 seconds.",
            "Web admin: 'Copy' button on crash log entries copies the whole log to clipboard.",
            "Widgets scale to XXXL (>800dp): subject font 44sp, TodaySchedule 32sp.",
            "Widget maxResize bumped to 2000dp — you can stretch to near full screen.",
        ),
    ),
    ChangelogEntry(
        version = "1.77.0",
        date = "September 2026",
        titleFi = "Manuaalinen push-tokenin rekisteröinti + mobiiliadminin FCM-testi",
        titleEn = "Manual push token registration + mobile admin FCM test",
        highlightsFi = listOf(
            "Asetukset → Diagnostiikka: uusi 'Rekisteröi push-token' -nappi näyttää tarkalleen mitä tapahtuu (OK/FAIL + virheviesti).",
            "Mobiili-admin → Toiminnot → Ilmoitukset: uusi 'Lähetä testi-push kaikille' hakee /notifications/test ja näyttää lähetettyjen laitteiden määrän.",
            "Mobiili-admin: FCM-tilakortti näyttää konfiguraation, laskun rekisteröidyistä laitteista ja virhesyyn jos jokin ei toimi.",
            "Mobiili-admin: 'Testaa paikallisesti' -painike näyttää ilmoituksen ilman FCM:ää (tarkista POST_NOTIFICATIONS ja kanava).",
            "Widgetit skaalautuvat vieläkin isommiksi — maxResize 1080dp, fontit XXL-tilassa jopa 32sp.",
            "Widget-napit isommat (44×40dp, oli 36×32dp).",
        ),
        highlightsEn = listOf(
            "Settings → Diagnostics: new 'Register push token' button shows exactly what happens (OK/FAIL + error message).",
            "Mobile admin → Actions → Notifications: new 'Send test push to all' calls /notifications/test and shows the number of devices reached.",
            "Mobile admin: FCM status card shows configuration, registered device count, and the error reason if anything fails.",
            "Mobile admin: 'Local test' button shows a notification without FCM (verifies POST_NOTIFICATIONS + channel).",
            "Widgets scale even bigger — maxResize 1080dp, XXL fonts up to 32sp.",
            "Widget arrow buttons bigger (44×40dp, was 36×32dp).",
        ),
    ),
    ChangelogEntry(
        version = "1.76.0",
        date = "September 2026",
        titleFi = "FCM data-only + widgetin väriaksentit ja yliviivaus",
        titleEn = "FCM data-only + widget subject colors and strikethrough",
        highlightsFi = listOf(
            "FCM lähetetään nyt data-only -viestinä — takaa että onMessageReceived kutsutaan sekä etu- että taustatilassa (aiemmin taustaviestit ohittivat käsittelyn ja etutilassa ei näytetty mitään).",
            "FCM-käsittelijä lokittaa 6 vaihetta jokaiselle viestille (vaihe 1: vastaanotettu, vaihe 2: data, vaihe 3: otsikko/teksti, vaihe 4: kanava, vaihe 5: notifikaatio rakennettu, vaihe 6: näytetty). Voit tarkistaa mikä vaihe epäonnistui Asetukset → Sovelluslokit.",
            "Ilmoituskanava luodaan uudestaan lennossa jos se puuttuu — kestää yksittäiset onCreate-häiriöt.",
            "POST_NOTIFICATIONS-lupa tarkistetaan eksplisiittisesti + selkeä varoitus lokissa jos evätty.",
            "Widget: menneet tunnit YLIVIIVATTUINA (ei vain himmennettyinä).",
            "Widget: väripallo aineen edessä — sama aine saa aina saman värin.",
            "Widget: skaalautuu suuremmaksi kuin ennen (minResize 140-180dp, maxResize 640dp), aineen fonttikoko yltää 24sp:hen laajimmilla widgeteillä.",
        ),
        highlightsEn = listOf(
            "FCM sent as data-only — guarantees onMessageReceived fires in both foreground and background (previously background messages skipped it and foreground messages showed nothing).",
            "FCM handler logs 6 steps per message (received → data → title/body → channel → built → notified). Check Settings → App logs to see where it stops.",
            "Notification channel is auto-recreated on-the-fly if missing.",
            "POST_NOTIFICATIONS permission checked explicitly with a clear warning in the log if denied.",
            "Widget: past classes STRIKETHROUGH (not just dimmed).",
            "Widget: per-subject color dot — same subject always gets the same color.",
            "Widget: scales larger than before, subject font up to 24sp on the widest widgets.",
        ),
    ),
    ChangelogEntry(
        version = "1.75.0",
        date = "September 2026",
        titleFi = "Widgetit: menneet tunnit himmennettyinä, päivät rullaavat eteenpäin",
        titleEn = "Widgets: past classes dimmed, days roll forward",
        highlightsFi = listOf(
            "Päivän lukujärjestys näyttää nyt KAIKKI päivän tunnit — menneet tunnit renderöidään himmeinä (✓-merkki), käynnissä oleva korostettuna.",
            "Widget rullaa automaattisesti seuraavaan koulupäivään kun kaikki tämän päivän tunnit ovat päättyneet — enää ei näy tyhjää klo 14:50 vaikka huomenna on tunteja.",
            "Seuraava tunti -widget hakee eteenpäin jopa 14 päivää — 'Huomenna · 08:15 · Luokka K27'.",
            "Widgetin päivänvaihtonapit isommat (36×32dp, oli 24×24dp) — helpompi napata.",
            "Widget-nimet ja -kuvaukset uusittu suomeksi ja lisätty targetCellWidth/-Height Android 12+ mittakaavaan.",
            "Uusi 'Errors (Sentry)' -välilehti hallintapaneelin Analytics & Logs -osiossa.",
        ),
        highlightsEn = listOf(
            "Today's schedule widget now shows ALL classes of the day — past ones are dimmed with a ✓ mark, current one highlighted.",
            "Widget auto-rolls to the next school day when today's classes are over — no more empty widget at 14:50 when tomorrow has classes.",
            "Next lesson widget looks 14 days forward — 'Tomorrow · 08:15 · Room K27'.",
            "Widget day-nav arrows bigger (36×32dp, was 24×24dp) — easier to tap.",
            "Widget names + descriptions rewritten in Finnish, plus Android 12+ targetCellWidth/Height sizing.",
            "New 'Errors (Sentry)' tab in the admin Analytics & Logs section.",
        ),
    ),
    ChangelogEntry(
        version = "1.74.0",
        date = "September 2026",
        titleFi = "FCM-diagnostiikka + widgetin nykyisen tunnin merkintä",
        titleEn = "FCM diagnostics + widget current-lesson highlight",
        highlightsFi = listOf(
            "TodaySchedule-widget: nykyinen tunti korostettu translusentilla laatalla + jäljellä oleva aika näkyvillä ('Matematiikka · 12 min').",
            "Widget-tausta uudistettu — pehmeämpi 3-vaiheinen gradientti navy → indigo, 24dp kulmat.",
            "Viikonloppuna tyhjä widget näyttää 'Viikonloppu 🌤️' -viestin.",
            "FCM-endpoint palauttaa nyt tarkat Firebase Admin -käynnistysvirheet ja per-token virhekoodit ≤20 laitteelle.",
            "PostHog-tapahtumat sisältävät nyt ksyk_session_id super-propertyn — hallintapaneelista voi klikata suoraan session replayhin.",
        ),
        highlightsEn = listOf(
            "TodaySchedule widget: current lesson highlighted with a translucent tile + remaining minutes shown inline.",
            "Widget background: softer 3-stop navy→indigo gradient, 24dp corners.",
            "Empty widget on weekends: 'Weekend 🌤️' contextual message.",
            "FCM endpoint returns exact Firebase Admin init error + per-token error codes for ≤20 targets.",
            "PostHog events now include ksyk_session_id super-property — admin panel deep-links to the actual replay.",
        ),
    ),
    ChangelogEntry(
        version = "1.73.0",
        date = "September 2026",
        titleFi = "Kartan tietokortti · FCM-diagnostiikka",
        titleEn = "Map place cards · FCM diagnostics",
        highlightsFi = listOf(
            "Kartan huone-/rakennuskortti (Apple Maps -tyylinen) — vetokahva ylhäällä, kategoriakuvake väreittäin, prominenttinen 'Suunnista tänne' -nappi.",
            "Huoneet erotellaan kategoriakuvakkeilla: WC (💧), labra (🧪), liikuntasali, kirjasto, ruokala, kanslia, luokka.",
            "FCM-lähetykset kertovat nyt selkeästi jos ei ole rekisteröityjä laitteita.",
            "Hallintapaneeli näyttää FCM:n konfiguraatiotilan + aktiiviset laitteet 7d/30d.",
        ),
        highlightsEn = listOf(
            "Map room/building card (Apple Maps style) — drag handle up top, colored category icon bubble, prominent 'Directions' button.",
            "Rooms separated by category icons: WC, lab, gym, library, cafeteria, office, classroom.",
            "FCM broadcasts now clearly report when no devices are registered.",
            "Admin panel shows FCM config + active devices 7d/30d.",
        ),
    ),
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
