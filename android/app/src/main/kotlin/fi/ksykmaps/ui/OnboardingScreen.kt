package fi.ksykmaps.ui

import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
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

// mpassId OAuth endpoint — needs a registered client_id from Opetushallitus.
// When properly configured, opens in Chrome Custom Tab and redirects back
// to fi.ksykmaps://auth/callback?code=... which MainActivity handles.
private const val MPASSID_AUTH_URL =
    "https://mpass-proxy.csc.fi/idp/profile/oidc/authorize" +
    "?client_id=ksykmaps-placeholder" +
    "&redirect_uri=fi.ksykmaps%3A%2F%2Fauth%2Fcallback" +
    "&response_type=code" +
    "&scope=openid+profile+email"

private data class OnboardPage(
    val icon: ImageVector,
    val title: String,
    val subtitle: String,
    val isNamePage: Boolean = false,
    val isLoginPage: Boolean = false,
)

private val PAGES = listOf(
    OnboardPage(
        icon = Icons.Outlined.Person,
        title = "What's your name?",
        subtitle = "We'll use it to personalise your experience. You can change it later in Settings.",
        isNamePage = true,
    ),
    OnboardPage(
        icon = Icons.Outlined.Map,
        title = "Welcome to KSYK Maps",
        subtitle = "Navigate your campus, find classrooms, and track your timetable — all in one place.",
    ),
    OnboardPage(
        icon = Icons.Outlined.MeetingRoom,
        title = "Find any room",
        subtitle = "Search by room number or name and get directions. The live map shows you exactly where to go.",
    ),
    OnboardPage(
        icon = Icons.Outlined.CalendarMonth,
        title = "Your timetable, always ready",
        subtitle = "Import your Wilma calendar to see your schedule automatically. Add lessons manually too.",
        isLoginPage = true,
    ),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OnboardingScreen(onDone: () -> Unit) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val pagerState = rememberPagerState(pageCount = { PAGES.size })
    val isLast = pagerState.currentPage == PAGES.lastIndex
    var nameInput by remember { mutableStateOf(getUserName(ctx)) }
    val keyboard = LocalSoftwareKeyboardController.current

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
    ) { pad ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(pad),
        ) {
            // Skip button (top-right)
            Box(Modifier.fillMaxWidth().padding(end = 12.dp, top = 8.dp)) {
                TextButton(
                    onClick = {
                        if (nameInput.isNotBlank()) saveUserName(ctx, nameInput)
                        markOnboardingDone(ctx)
                        runCatching { PostHog.capture("onboarding_completed", mapOf("completion_method" to "skipped")) }
                        onDone()
                    },
                    modifier = Modifier.align(Alignment.CenterEnd),
                ) {
                    Text("Skip", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)
                }
            }

            // Pages
            HorizontalPager(
                state = pagerState,
                modifier = Modifier.weight(1f),
            ) { page ->
                val p = PAGES[page]
                if (p.isNamePage) {
                    NamePage(name = nameInput, onNameChange = { nameInput = it })
                } else {
                    OnboardPageContent(p)
                }
            }

            // Dots + buttons
            Column(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp)
                    .padding(bottom = 48.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                PageDots(total = PAGES.size, current = pagerState.currentPage)

                Button(
                    onClick = {
                        if (nameInput.isNotBlank()) saveUserName(ctx, nameInput)
                        keyboard?.hide()
                        if (isLast) {
                            markOnboardingDone(ctx)
                            runCatching { PostHog.capture("onboarding_completed", mapOf("completion_method" to "get_started")) }
                            onDone()
                        } else {
                            scope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) }
                        }
                    },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                ) {
                    Text(
                        if (isLast) "Get started" else "Next",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp,
                    )
                }

                // Last page: Wilma connect + mpassId login options
                AnimatedVisibility(visible = isLast) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedButton(
                            onClick = {
                                if (nameInput.isNotBlank()) saveUserName(ctx, nameInput)
                                markOnboardingDone(ctx)
                                runCatching { PostHog.capture("onboarding_completed", mapOf("completion_method" to "wilma_connect")) }
                                onDone()
                            },
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                            shape = RoundedCornerShape(14.dp),
                        ) {
                            Icon(Icons.Outlined.CalendarMonth, null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Connect Wilma calendar", fontSize = 14.sp)
                        }

                        OutlinedButton(
                            onClick = {
                                if (nameInput.isNotBlank()) saveUserName(ctx, nameInput)
                                try {
                                    CustomTabsIntent.Builder()
                                        .setShowTitle(true)
                                        .build()
                                        .launchUrl(ctx, Uri.parse(MPASSID_AUTH_URL))
                                } catch (_: Exception) {}
                            },
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                            shape = RoundedCornerShape(14.dp),
                        ) {
                            Icon(Icons.Outlined.School, null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Sign in with mpassId", fontSize = 14.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun NamePage(name: String, onNameChange: (String) -> Unit) {
    val keyboard = LocalSoftwareKeyboardController.current
    Column(
        Modifier
            .fillMaxSize()
            .padding(horizontal = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            Modifier
                .size(100.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Outlined.Person,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = MaterialTheme.colorScheme.primary,
            )
        }

        Spacer(Modifier.height(32.dp))

        Text(
            "What's your name?",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onBackground,
        )

        Spacer(Modifier.height(12.dp))

        Text(
            "We'll personalise your experience. You can change this later in Settings.",
            fontSize = 15.sp,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            lineHeight = 22.sp,
        )

        Spacer(Modifier.height(32.dp))

        OutlinedTextField(
            value = name,
            onValueChange = onNameChange,
            label = { Text("Your first name") },
            placeholder = { Text("e.g. Juuso") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { keyboard?.hide() }),
            leadingIcon = { Icon(Icons.Outlined.Person, null) },
        )
    }
}

@Composable
private fun OnboardPageContent(page: OnboardPage) {
    Column(
        Modifier
            .fillMaxSize()
            .padding(horizontal = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            Modifier
                .size(100.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                page.icon,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = MaterialTheme.colorScheme.primary,
            )
        }

        Spacer(Modifier.height(32.dp))

        Text(
            page.title,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onBackground,
        )

        Spacer(Modifier.height(12.dp))

        Text(
            page.subtitle,
            fontSize = 15.sp,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            lineHeight = 22.sp,
        )
    }
}

@Composable
private fun PageDots(total: Int, current: Int) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        repeat(total) { i ->
            val isSelected = i == current
            val width by animateDpAsState(targetValue = if (isSelected) 24.dp else 8.dp, label = "dot")
            Box(
                Modifier
                    .height(8.dp)
                    .width(width)
                    .clip(CircleShape)
                    .background(
                        if (isSelected) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.2f)
                    )
            )
        }
    }
}
