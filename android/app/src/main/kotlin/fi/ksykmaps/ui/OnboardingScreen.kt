package fi.ksykmaps.ui

import android.content.Context
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.posthog.PostHog
import kotlinx.coroutines.launch

private const val PREFS_ONBOARD = "ksyk_onboarding"
private const val KEY_DONE = "done"
const val PREFS_APP = "ksyk_prefs"
const val KEY_USER_NAME = "user_name"

fun isOnboardingDone(ctx: Context): Boolean =
    ctx.getSharedPreferences(PREFS_ONBOARD, Context.MODE_PRIVATE).getBoolean(KEY_DONE, false)

fun getUserName(ctx: Context): String =
    ctx.getSharedPreferences(PREFS_APP, Context.MODE_PRIVATE).getString(KEY_USER_NAME, "") ?: ""

fun saveUserName(ctx: Context, name: String) {
    ctx.getSharedPreferences(PREFS_APP, Context.MODE_PRIVATE)
        .edit().putString(KEY_USER_NAME, name.trim()).apply()
}

private fun markOnboardingDone(ctx: Context) {
    ctx.getSharedPreferences(PREFS_ONBOARD, Context.MODE_PRIVATE)
        .edit().putBoolean(KEY_DONE, true).apply()
}

private val ONBOARD_BLUE   = Color(0xFF3B82F6)
private val ONBOARD_VIOLET = Color(0xFF8B5CF6)
private val ONBOARD_GREEN  = Color(0xFF10B981)

private sealed interface OnboardPage {
    data class Standard(
        val icon: ImageVector,
        val title: String,
        val subtitle: String,
        val accent: Color,
    ) : OnboardPage

    data class NameInput(val accent: Color = ONBOARD_VIOLET) : OnboardPage

    data class WilmaSetup(val accent: Color = ONBOARD_GREEN) : OnboardPage
}

private fun buildPages(lang: String): List<OnboardPage> {
    val fi = lang == "fi"
    // v1.71.0: collapsed the three near-identical intro pages into a single
    // Welcome page that shows all features as a benefit list. Total: 3 pages
    // (Welcome → Name → Wilma) instead of 5.
    return listOf(
        OnboardPage.Standard(
            icon = Icons.Outlined.Map,
            accent = ONBOARD_BLUE,
            title = if (fi) "Tervetuloa KSYK Mapsiin" else "Welcome to KSYK Maps",
            subtitle = if (fi) "Kaikki mitä tarvitset koulupäivääsi — yhdessä sovelluksessa."
                       else "Everything you need for your school day — in one app.",
        ),
        OnboardPage.NameInput(),
        OnboardPage.WilmaSetup(),
    )
}

private val OnboardPage.accent: Color
    get() = when (this) {
        is OnboardPage.Standard   -> this.accent
        is OnboardPage.NameInput  -> this.accent
        is OnboardPage.WilmaSetup -> this.accent
    }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OnboardingScreen(onDone: () -> Unit) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    LanguageState.init(ctx)
    val lang = LanguageState.current ?: "fi"
    val fi = lang == "fi"
    val pages = remember(lang) { buildPages(lang) }
    val pagerState = rememberPagerState(pageCount = { pages.size })
    val isLast = pagerState.currentPage == pages.lastIndex
    var nameInput by remember { mutableStateOf(getUserName(ctx)) }
    val keyboard = LocalSoftwareKeyboardController.current

    var showWilmaConnect by remember { mutableStateOf(false) }

    BackHandler(enabled = pagerState.currentPage > 0) {
        scope.launch { pagerState.animateScrollToPage(pagerState.currentPage - 1) }
    }

    if (showWilmaConnect) {
        WilmaConnectScreen(
            onBack = { showWilmaConnect = false },
            onImported = {
                showWilmaConnect = false
                if (nameInput.isNotBlank()) saveUserName(ctx, nameInput)
                markOnboardingDone(ctx)
                runCatching {
                    PostHog.capture(
                        "onboarding_completed",
                        properties = mapOf("completion_method" to "wilma_connected"),
                    )
                }
                onDone()
            },
        )
        return
    }

    val currentAccent = pages.getOrNull(pagerState.currentPage)?.accent ?: ONBOARD_BLUE

    Scaffold(containerColor = MaterialTheme.colorScheme.background) { pad ->
        Column(Modifier.fillMaxSize().padding(pad)) {

            // Skip — hidden on the Wilma page (which has its own skip in the bottom)
            Box(Modifier.fillMaxWidth().padding(end = 12.dp, top = 8.dp)) {
                if (!isLast) {
                    TextButton(
                        onClick = {
                            if (nameInput.isNotBlank()) saveUserName(ctx, nameInput)
                            markOnboardingDone(ctx)
                            runCatching {
                                PostHog.capture(
                                    "onboarding_completed",
                                    properties = mapOf("completion_method" to "skipped"),
                                )
                            }
                            onDone()
                        },
                        modifier = Modifier.align(Alignment.CenterEnd),
                    ) {
                        Text(
                            if (fi) "Ohita" else "Skip",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 14.sp,
                        )
                    }
                }
            }

            HorizontalPager(
                state = pagerState,
                modifier = Modifier.weight(1f),
            ) { page ->
                when (val p = pages[page]) {
                    is OnboardPage.Standard   -> WelcomePage(page = p, lang = lang)
                    is OnboardPage.NameInput  -> NamePage(
                        name = nameInput,
                        onNameChange = { nameInput = it },
                        lang = lang,
                        onNext = {
                            scope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) }
                        },
                    )
                    is OnboardPage.WilmaSetup -> WilmaPage(lang = lang)
                }
            }

            // Bottom action area
            Column(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp)
                    .padding(bottom = 48.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                PageDots(
                    total = pages.size,
                    current = pagerState.currentPage,
                    accent = currentAccent,
                )

                if (isLast) {
                    // Wilma page: two clear choices
                    Button(
                        onClick = { showWilmaConnect = true },
                        modifier = Modifier.fillMaxWidth().height(54.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = ONBOARD_GREEN),
                    ) {
                        Icon(
                            Icons.Outlined.CalendarMonth,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                            tint = Color.White,
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            if (fi) "Yhdistä Wilma-kalenteri" else "Connect Wilma calendar",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 16.sp,
                            color = Color.White,
                        )
                    }
                    TextButton(
                        onClick = {
                            if (nameInput.isNotBlank()) saveUserName(ctx, nameInput)
                            keyboard?.hide()
                            markOnboardingDone(ctx)
                            runCatching {
                                PostHog.capture(
                                    "onboarding_completed",
                                    properties = mapOf("completion_method" to "wilma_skipped"),
                                )
                            }
                            onDone()
                        },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            if (fi) "Aloita ilman Wilmaa" else "Start without Wilma",
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                } else {
                    Button(
                        onClick = {
                            if (nameInput.isNotBlank()) saveUserName(ctx, nameInput)
                            keyboard?.hide()
                            scope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) }
                        },
                        modifier = Modifier.fillMaxWidth().height(54.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = currentAccent),
                    ) {
                        Text(
                            if (fi) "Seuraava" else "Next",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 16.sp,
                            color = Color.White,
                        )
                    }
                }
            }
        }
    }
}

// ── Pages ──────────────────────────────────────────────────────────────

@Composable
private fun WelcomePage(page: OnboardPage.Standard, lang: String) {
    val fi = lang == "fi"
    Column(
        Modifier.fillMaxSize().padding(horizontal = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            Modifier
                .size(96.dp)
                .clip(RoundedCornerShape(26.dp))
                .background(ONBOARD_BLUE.copy(alpha = 0.12f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Outlined.Map,
                contentDescription = null,
                modifier = Modifier.size(50.dp),
                tint = ONBOARD_BLUE,
            )
        }

        Spacer(Modifier.height(28.dp))

        Text(
            "KSYK Maps",
            fontSize = 32.sp,
            fontWeight = FontWeight.ExtraBold,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onBackground,
            letterSpacing = (-0.5).sp,
        )

        Spacer(Modifier.height(8.dp))

        Text(
            page.subtitle,
            fontSize = 15.sp,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            lineHeight = 22.sp,
        )

        Spacer(Modifier.height(32.dp))

        // Three benefits shown as icon rows — replaces the 3 near-identical
        // intro pages that used to walk through each feature separately.
        Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
            BenefitRow(
                icon = Icons.Outlined.Map,
                text = if (fi) "Löydä kaikki luokat kampukselta" else "Find every classroom on campus",
                color = ONBOARD_BLUE,
            )
            BenefitRow(
                icon = Icons.Outlined.CalendarMonth,
                text = if (fi) "Lukujärjestys ja lounas taskussasi" else "Timetable and lunch in your pocket",
                color = ONBOARD_VIOLET,
            )
            BenefitRow(
                icon = Icons.Outlined.NotificationsActive,
                text = if (fi) "Muistutukset ennen jokaista tuntia" else "Reminders before every lesson",
                color = ONBOARD_GREEN,
            )
        }
    }
}

@Composable
private fun WilmaPage(lang: String) {
    val fi = lang == "fi"
    Column(
        Modifier.fillMaxSize().padding(horizontal = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            Modifier
                .size(100.dp)
                .clip(RoundedCornerShape(28.dp))
                .background(ONBOARD_GREEN.copy(alpha = 0.12f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Outlined.CalendarMonth,
                contentDescription = null,
                modifier = Modifier.size(52.dp),
                tint = ONBOARD_GREEN,
            )
        }

        Spacer(Modifier.height(36.dp))

        Text(
            if (fi) "Täytä lukujärjestyksesi automaattisesti"
            else "Fill your timetable automatically",
            fontSize = 26.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onBackground,
            lineHeight = 32.sp,
        )

        Spacer(Modifier.height(12.dp))

        Text(
            if (fi) "Yhdistä Wilma-kalenteri niin lukujärjestyksesi synkronoituu automaattisesti. Voit myös lisätä tunnit itse."
            else "Connect your Wilma calendar and your timetable syncs automatically. You can also add lessons manually.",
            fontSize = 15.sp,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            lineHeight = 22.sp,
        )

        Spacer(Modifier.height(32.dp))

        // What you get — three benefit rows
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            BenefitRow(
                icon = Icons.Outlined.Sync,
                text = if (fi) "Automaattinen synkronointi" else "Automatic sync",
                color = ONBOARD_GREEN,
            )
            BenefitRow(
                icon = Icons.Outlined.NotificationsActive,
                text = if (fi) "Muistutukset ennen tunteja" else "Reminders before lessons",
                color = ONBOARD_GREEN,
            )
            BenefitRow(
                icon = Icons.Outlined.Navigation,
                text = if (fi) "Navigoi suoraan luokkaan" else "Navigate straight to the room",
                color = ONBOARD_GREEN,
            )
        }
    }
}

@Composable
private fun NamePage(name: String, onNameChange: (String) -> Unit, lang: String, onNext: () -> Unit = {}) {
    val fi = lang == "fi"
    val keyboard = LocalSoftwareKeyboardController.current
    Column(
        Modifier
            .fillMaxWidth()
            .fillMaxHeight()
            .verticalScroll(rememberScrollState())
            .imePadding()
            .padding(horizontal = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(0.dp, Alignment.CenterVertically),
    ) {
        Box(
            Modifier
                .size(100.dp)
                .clip(RoundedCornerShape(28.dp))
                .background(ONBOARD_VIOLET.copy(alpha = 0.12f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Outlined.Person,
                contentDescription = null,
                modifier = Modifier.size(52.dp),
                tint = ONBOARD_VIOLET,
            )
        }

        Spacer(Modifier.height(36.dp))

        Text(
            if (fi) "Mikä sinun nimesi on?" else "What's your name?",
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onBackground,
            lineHeight = 34.sp,
        )

        Spacer(Modifier.height(10.dp))

        Text(
            if (fi) "Käytämme nimeäsi tervehdyksiin. Voit muuttaa sen asetuksissa."
            else "We'll use your name for greetings. You can change it in Settings.",
            fontSize = 15.sp,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            lineHeight = 22.sp,
        )

        Spacer(Modifier.height(32.dp))

        OutlinedTextField(
            value = name,
            onValueChange = onNameChange,
            label = { Text(if (fi) "Etunimesi" else "Your first name") },
            placeholder = { Text(if (fi) "esim. Juuso" else "e.g. Juuso") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
            keyboardActions = KeyboardActions(onNext = { keyboard?.hide(); onNext() }),
            leadingIcon = { Icon(Icons.Outlined.Person, null) },
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = ONBOARD_VIOLET,
                focusedLabelColor = ONBOARD_VIOLET,
                cursorColor = ONBOARD_VIOLET,
            ),
        )
    }
}

// ── Small components ───────────────────────────────────────────────────

@Composable
private fun BenefitRow(icon: ImageVector, text: String, color: Color) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(color.copy(alpha = 0.07f))
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Icon(icon, null, modifier = Modifier.size(16.dp), tint = color)
        Text(text, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurface)
    }
}

@Composable
private fun PageDots(total: Int, current: Int, accent: Color = ONBOARD_BLUE) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        repeat(total) { i ->
            val isSelected = i == current
            val width by animateDpAsState(targetValue = if (isSelected) 28.dp else 8.dp, label = "dot")
            Box(
                Modifier
                    .height(8.dp)
                    .width(width)
                    .clip(RoundedCornerShape(4.dp))
                    .background(
                        if (isSelected) accent
                        else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.15f)
                    )
            )
        }
    }
}
