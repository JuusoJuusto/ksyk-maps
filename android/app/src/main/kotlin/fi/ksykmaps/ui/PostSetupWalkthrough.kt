package fi.ksykmaps.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.Widgets
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import android.content.Context

/**
 * v1.90.0 — 3-screen walkthrough shown ONCE after the user's first
 * successful Wilma import. Explains the three most-used surfaces
 * (Home dashboard · Timetable · Widgets) so new users don't miss the
 * value in-app.
 *
 * Not the same as OnboardingScreen — that's the wizard for first
 * launch (language / dark-mode / Wilma). This is the post-connect
 * "here's what you can do now" tour.
 */

private object WalkthroughPrefs {
    private const val PREFS = "ksyk_walkthrough"
    private const val KEY_SEEN = "walkthrough_seen_v1"
    private const val KEY_PENDING = "walkthrough_pending"

    fun hasSeen(ctx: Context): Boolean =
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_SEEN, false)

    fun markSeen(ctx: Context) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean(KEY_SEEN, true).putBoolean(KEY_PENDING, false).apply()
    }

    fun schedule(ctx: Context) {
        // Only queue if the user hasn't seen it. Idempotent.
        val p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (p.getBoolean(KEY_SEEN, false)) return
        p.edit().putBoolean(KEY_PENDING, true).apply()
    }

    fun isPending(ctx: Context): Boolean =
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean(KEY_PENDING, false) && !hasSeen(ctx)
}

/** Public entry points other files use — no direct WalkthroughPrefs access. */
fun schedulePostSetupWalkthrough(ctx: Context) = WalkthroughPrefs.schedule(ctx)
fun isPostSetupWalkthroughPending(ctx: Context): Boolean = WalkthroughPrefs.isPending(ctx)
fun markPostSetupWalkthroughSeen(ctx: Context) = WalkthroughPrefs.markSeen(ctx)

private data class Page(
    val icon: ImageVector,
    val accent: Color,
    val titleFi: String,
    val titleEn: String,
    val bodyFi: String,
    val bodyEn: String,
    val bulletsFi: List<String>,
    val bulletsEn: List<String>,
)

private val PAGES = listOf(
    Page(
        icon = Icons.Outlined.Dashboard,
        accent = Color(0xFF3B82F6),
        titleFi = "Etusivu",
        titleEn = "Home",
        bodyFi = "Yhdellä silmäyksellä koko koulupäivä.",
        bodyEn = "Your whole school day at a glance.",
        bulletsFi = listOf(
            "Nyt meneillään oleva tunti ja seuraava tunti",
            "Loput päivän tunnit + huomisen ennakko",
            "Kampus-tilastot ja tuoreimmat uutiset",
            "Muokkaa järjestystä: Asetukset → Muokkaa etusivua",
        ),
        bulletsEn = listOf(
            "Current lesson + next lesson at the top",
            "Rest of today + tomorrow preview",
            "Campus stats and latest announcements",
            "Reorder any section: Settings → Customize home",
        ),
    ),
    Page(
        icon = Icons.Outlined.CalendarMonth,
        accent = Color(0xFF10B981),
        titleFi = "Lukujärjestys",
        titleEn = "Timetable",
        bodyFi = "Wilmasta tuotu aikataulu jaksoineen.",
        bodyEn = "Your Wilma schedule with periods.",
        bulletsFi = listOf(
            "Selaa viikkoa ja päivää nuolilla",
            "Napauta tuntia — luokka näkyy kartalla",
            "Muistutus 5 min ennen tuntia (säädettävissä)",
            "Jaksovaihdot päivittyvät automaattisesti",
        ),
        bulletsEn = listOf(
            "Swipe between weeks and days",
            "Tap any lesson — the room highlights on the map",
            "5-minute reminder before class (adjustable)",
            "Period transitions auto-sync",
        ),
    ),
    Page(
        icon = Icons.Outlined.Widgets,
        accent = Color(0xFFEC4899),
        titleFi = "Widgetit",
        titleEn = "Widgets",
        bodyFi = "Kotinäytön widgetit — päivä yhdellä katseella.",
        bodyEn = "Home-screen widgets — a glance at your day.",
        bulletsFi = listOf(
            "Nyt tunnilla · Seuraava tunti · Päivän aikataulu",
            "Skaalautuvat mihin tahansa kokoon",
            "Paina pitkään säätääksesi: piilota menneet, valitse oletuspäivä",
            "Lisää: kotinäytön pitkäpainallus → Widgetit → KSYK Maps",
        ),
        bulletsEn = listOf(
            "Now in class · Next lesson · Today's schedule",
            "Scale to any size, tablet-friendly",
            "Long-press to configure: hide past, pick a default day",
            "Add: home-screen long-press → Widgets → KSYK Maps",
        ),
    ),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PostSetupWalkthrough(onDone: () -> Unit) {
    val isFi = (LanguageState.current ?: "fi") == "fi"
    val pagerState = rememberPagerState(pageCount = { PAGES.size })
    val scope = rememberCoroutineScope()

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.surface,
    ) {
        Column(Modifier.fillMaxSize()) {
            // Skip button top-right — gives users an out even at page 1.
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.End,
            ) {
                TextButton(onClick = onDone) {
                    Text(if (isFi) "Ohita" else "Skip")
                }
            }

            // Pager fills the middle. Weight makes it flex-grow.
            HorizontalPager(
                state = pagerState,
                modifier = Modifier.weight(1f).fillMaxWidth(),
            ) { pageIndex ->
                WalkthroughPage(PAGES[pageIndex], isFi)
            }

            // Dot indicator.
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(vertical = 16.dp),
                horizontalArrangement = Arrangement.Center,
            ) {
                repeat(PAGES.size) { i ->
                    val selected = pagerState.currentPage == i
                    val color by animateColorAsState(
                        if (selected)
                            MaterialTheme.colorScheme.primary
                        else
                            MaterialTheme.colorScheme.onSurface.copy(alpha = 0.2f),
                        label = "dot",
                    )
                    Box(
                        Modifier
                            .padding(horizontal = 4.dp)
                            .size(if (selected) 10.dp else 8.dp)
                            .clip(CircleShape)
                            .background(color),
                    )
                }
            }

            // Bottom CTA — advances or dismisses.
            Box(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 16.dp)
                    .navigationBarsPadding(),
            ) {
                val onLastPage = pagerState.currentPage == PAGES.size - 1
                Button(
                    onClick = {
                        if (onLastPage) onDone()
                        else scope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) }
                    },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                ) {
                    Icon(
                        if (onLastPage) Icons.Outlined.CheckCircle else Icons.AutoMirrored.Outlined.ArrowForward,
                        null,
                        modifier = Modifier.size(20.dp),
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        if (onLastPage) (if (isFi) "Aloita" else "Get started")
                        else (if (isFi) "Seuraava" else "Next"),
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 15.sp,
                    )
                }
            }
        }
    }
}

@Composable
private fun WalkthroughPage(page: Page, isFi: Boolean) {
    Column(
        Modifier
            .fillMaxSize()
            .padding(horizontal = 28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.weight(0.5f))
        Box(
            Modifier
                .size(120.dp)
                .clip(RoundedCornerShape(28.dp))
                .background(page.accent.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                page.icon, null,
                tint = page.accent,
                modifier = Modifier.size(64.dp),
            )
        }
        Spacer(Modifier.height(24.dp))
        Text(
            if (isFi) page.titleFi else page.titleEn,
            fontSize = 26.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            if (isFi) page.bodyFi else page.bodyEn,
            fontSize = 15.sp,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(24.dp))
        Column(
            horizontalAlignment = Alignment.Start,
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            val bullets = if (isFi) page.bulletsFi else page.bulletsEn
            for (b in bullets) {
                Row(verticalAlignment = Alignment.Top) {
                    Box(
                        Modifier
                            .padding(top = 8.dp)
                            .size(6.dp)
                            .clip(CircleShape)
                            .background(page.accent),
                    )
                    Spacer(Modifier.width(12.dp))
                    Text(
                        b,
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                }
            }
        }
        Spacer(Modifier.weight(1f))
    }
}
