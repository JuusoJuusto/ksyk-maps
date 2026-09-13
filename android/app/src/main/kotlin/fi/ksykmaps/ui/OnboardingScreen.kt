package fi.ksykmaps.ui

import android.content.Context
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
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

private data class OnboardPage(
    val icon: ImageVector,
    val title: String,
    val subtitle: String,
    val accent: Color = ONBOARD_BLUE,
    val isNamePage: Boolean = false,
)

private fun buildPages(lang: String): List<OnboardPage> {
    val fi = lang == "fi"
    return listOf(
        OnboardPage(
            icon = Icons.Outlined.Map,
            accent = ONBOARD_BLUE,
            title = if (fi) "Tervetuloa KSYK Mapsiin" else "Welcome to KSYK Maps",
            subtitle = if (fi) "Navigoi kampuksella, löydä luokat ja seuraa lukujärjestystäsi — kaikki yhdessä paikassa."
                       else "Navigate your campus, find classrooms, and track your timetable — all in one place.",
        ),
        OnboardPage(
            icon = Icons.Outlined.Person,
            accent = ONBOARD_VIOLET,
            title = if (fi) "Mikä sinun nimesi on?" else "What's your name?",
            subtitle = if (fi) "Personalisoimme kokemuksesi sen perusteella. Voit muuttaa sen myöhemmin asetuksissa."
                       else "We'll personalise your experience. You can change this later in Settings.",
            isNamePage = true,
        ),
    )
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

    // When the user taps "Connect Wilma calendar" on the last page, we show
    // WilmaConnectScreen inline before marking onboarding complete.
    var showWilmaConnect by remember { mutableStateOf(false) }

    // Back swipe / button: go to previous page, or do nothing on first page.
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

    Scaffold(containerColor = MaterialTheme.colorScheme.background) { pad ->
        Column(
            Modifier.fillMaxSize().padding(pad),
        ) {
            // Skip — hidden on the last page so the primary CTA is the only exit.
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

            val currentAccent = pages.getOrNull(pagerState.currentPage)?.accent ?: ONBOARD_BLUE

            HorizontalPager(
                state = pagerState,
                modifier = Modifier.weight(1f),
            ) { page ->
                val p = pages[page]
                if (p.isNamePage) {
                    NamePage(
                        name = nameInput,
                        onNameChange = { nameInput = it },
                        lang = lang,
                        onNext = { scope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) } },
                    )
                } else {
                    OnboardPageContent(p)
                }
            }

            Column(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp)
                    .padding(bottom = 48.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                PageDots(total = pages.size, current = pagerState.currentPage, accent = currentAccent)

                Button(
                    onClick = {
                        if (nameInput.isNotBlank()) saveUserName(ctx, nameInput)
                        keyboard?.hide()
                        if (isLast) {
                            markOnboardingDone(ctx)
                            runCatching {
                                PostHog.capture(
                                    "onboarding_completed",
                                    properties = mapOf("completion_method" to "get_started"),
                                )
                            }
                            onDone()
                        } else {
                            scope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) }
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(54.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = currentAccent),
                ) {
                    Text(
                        if (isLast) (if (fi) "Aloita" else "Get started")
                        else (if (fi) "Seuraava" else "Next"),
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp,
                        color = Color.White,
                    )
                }

                // Last page: Wilma connect option
                AnimatedVisibility(visible = isLast) {
                    OutlinedButton(
                        onClick = { showWilmaConnect = true },
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        shape = RoundedCornerShape(14.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, currentAccent.copy(alpha = 0.5f)),
                    ) {
                        Icon(Icons.Outlined.CalendarMonth, null, modifier = Modifier.size(18.dp), tint = currentAccent)
                        Spacer(Modifier.width(8.dp))
                        Text(
                            if (fi) "Yhdistä Wilma-kalenteri" else "Connect Wilma calendar",
                            fontSize = 14.sp,
                            color = currentAccent,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun NamePage(name: String, onNameChange: (String) -> Unit, lang: String, onNext: () -> Unit = {}) {
    val fi = lang == "fi"
    val keyboard = LocalSoftwareKeyboardController.current
    Column(
        Modifier.fillMaxSize().padding(horizontal = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
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

@Composable
private fun OnboardPageContent(page: OnboardPage) {
    Column(
        Modifier.fillMaxSize().padding(horizontal = 36.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            Modifier
                .size(80.dp)
                .clip(RoundedCornerShape(22.dp))
                .background(page.accent.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                page.icon,
                contentDescription = null,
                modifier = Modifier.size(40.dp),
                tint = page.accent,
            )
        }

        Spacer(Modifier.height(36.dp))

        Text(
            page.title,
            fontSize = 26.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onBackground,
            lineHeight = 32.sp,
        )

        Spacer(Modifier.height(14.dp))

        Text(
            page.subtitle,
            fontSize = 15.sp,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            lineHeight = 23.sp,
        )
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
