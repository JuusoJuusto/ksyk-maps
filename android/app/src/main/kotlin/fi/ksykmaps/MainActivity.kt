package fi.ksykmaps

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AdminPanelSettings
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material.icons.outlined.Restaurant
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import fi.ksykmaps.data.Api
import fi.ksykmaps.data.Session
import fi.ksykmaps.ui.AdminPanelScreen
import fi.ksykmaps.ui.AnnouncementPollWorker
import fi.ksykmaps.ui.AnnouncementsScreen
import fi.ksykmaps.ui.BeaconScreen
import fi.ksykmaps.ui.HomeScreen
import fi.ksykmaps.ui.LessonReminderScheduler
import fi.ksykmaps.ui.LogsScreen
import fi.ksykmaps.ui.LoginScreen
import fi.ksykmaps.ui.LoadingScreen
import fi.ksykmaps.ui.LunchScreen
import fi.ksykmaps.ui.MapNavIntent
import fi.ksykmaps.ui.MapScreen
import fi.ksykmaps.ui.OnboardingScreen
import fi.ksykmaps.ui.RoomFinderScreen
import fi.ksykmaps.ui.BugReportScreen
import fi.ksykmaps.ui.FeedbackScreen
import fi.ksykmaps.ui.SettingsScreen
import fi.ksykmaps.ui.TimetableScreen
import fi.ksykmaps.ui.WilmaConnectScreen
import fi.ksykmaps.ui.LanguageState
import fi.ksykmaps.ui.DynamicColorState
import fi.ksykmaps.ui.ThemeState
import fi.ksykmaps.ui.getAppLanguage
import fi.ksykmaps.ui.activeJaksoId
import fi.ksykmaps.ui.isOnboardingDone
import fi.ksykmaps.ui.loadEntries
import fi.ksykmaps.ui.loadJaksot
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import androidx.compose.foundation.isSystemInDarkTheme
import fi.ksykmaps.ui.theme.KsykTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        try { Session.load(this) } catch (_: Throwable) {}
        try { fi.ksykmaps.data.Analytics.init(this) } catch (_: Throwable) {}
        try {
            val prefs = getSharedPreferences("ksyk_prefs", android.content.Context.MODE_PRIVATE)
            ThemeState.mode = prefs.getString("dark_mode", "system") ?: "system"
            DynamicColorState.enabled = prefs.getBoolean("dynamic_colour", true)
        } catch (_: Throwable) {}
        handleDeepLink(intent)
        // Start periodic announcement polling — replaces FCM. Idempotent
        // via KEEP policy, so calling this on every cold start is fine.
        try { AnnouncementPollWorker.enqueue(this) } catch (_: Throwable) {}
        // Preload MapLibre native init off the main thread so the first
        // Map tab open doesn't stall on getInstance(). Safe to call more
        // than once; MapLibre no-ops after the first init.
        CoroutineScope(Dispatchers.IO).launch {
            try {
                org.maplibre.android.MapLibre.getInstance(
                    applicationContext, "",
                    org.maplibre.android.WellKnownTileServer.MapLibre,
                )
            } catch (_: Throwable) {}
        }
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val entries = loadEntries(this@MainActivity)
                if (entries.isNotEmpty()) {
                    // Filter to the currently active jakso so we don't
                    // notify about lessons from a period that isn't
                    // running yet (or already ended). Mirrors the same
                    // filter LessonReminderReceiver applies on re-schedule.
                    val activeJakso = try {
                        activeJaksoId(loadJaksot(this@MainActivity))
                    } catch (_: Throwable) { null }
                    val filtered = if (activeJakso != null) {
                        entries.filter { e ->
                            val ej = e.jaksoId.ifBlank { "all" }
                            ej == "all" || ej == activeJakso
                        }
                    } else entries
                    fi.ksykmaps.data.AppLog.info(
                        "LessonReminder",
                        "scheduled ${filtered.size}/${entries.size} entries (jakso=$activeJakso)",
                    )
                    LessonReminderScheduler.schedule(this@MainActivity, filtered)
                }
            } catch (t: Throwable) {
                fi.ksykmaps.data.AppLog.error("LessonReminder", "schedule failed: ${t.message}")
            }
        }
        setContent {
            val systemDark = isSystemInDarkTheme()
            val darkMode = when (ThemeState.mode) {
                "dark"  -> true
                "light" -> false
                else    -> systemDark
            }
            val dynamicColor = DynamicColorState.enabled
            KsykTheme(darkTheme = darkMode, dynamicColor = dynamicColor) {
                LaunchedEffect(Unit) {
                    try {
                        com.posthog.PostHog.capture(
                            "app_ready",
                            properties = mapOf(
                                "platform"    to "android",
                                "app_version" to fi.ksykmaps.BuildConfig.VERSION_NAME,
                            ),
                        )
                    } catch (_: Throwable) {}
                }
                AppShell()
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleDeepLink(intent)
    }

    private fun handleDeepLink(intent: Intent?) {
        if (intent == null) return
        // Notification taps drop a target tab hint into intent extras.
        intent.getStringExtra("open_tab")?.let { NotifNavIntent.pendingTab = it }
        val data: Uri = intent.data ?: return
        val roomId = data.getQueryParameter("room") ?: return
        if (roomId.isNotBlank()) MapNavIntent.pendingRoomId = roomId
    }
}

/** Cross-composition signal from a notification tap. Cleared once read. */
object NotifNavIntent {
    var pendingTab: String? = null
}

private data class Tab(val route: String, val label: String, val icon: ImageVector)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AppShell() {
    val ctx = LocalContext.current
    val signedIn by Session.signedInState
    val isAdmin by Session.adminState
    var showLogin by remember { mutableStateOf(false) }
    var onboardingDone by remember { mutableStateOf(isOnboardingDone(ctx)) }
    var showLoading by remember { mutableStateOf(true) }

    var selectedTab by rememberSaveable { mutableStateOf("home") }
    var subScreen by rememberSaveable { mutableStateOf<String?>(null) }

    // Ask for POST_NOTIFICATIONS on Android 13+ once per install. Without
    // this the lesson-reminder and announcement notifications are dropped
    // silently by the OS — which is what caused "notifications don't work".
    // Wait until onboarding is complete so the dialog doesn't appear mid-onboarding.
    val notifPermLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { /* result ignored — retried automatically next launch if declined */ }
    LaunchedEffect(onboardingDone) {
        if (!onboardingDone) return@LaunchedEffect
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            val granted = androidx.core.app.ActivityCompat.checkSelfPermission(
                ctx, android.Manifest.permission.POST_NOTIFICATIONS
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED
            if (!granted) notifPermLauncher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
        }
    }
    // Only mount MapScreen once the user has actually opened the map tab.
    // Keeps app startup cheap and prevents the map's OpenGL initialisation
    // from blocking the very first launch. Once mounted, the composable
    // stays in the tree (hidden with graphicsLayer alpha) so the GL context
    // is never torn down by subsequent tab switches.
    var mapMounted by rememberSaveable { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        if (MapNavIntent.pendingRoomId != null) {
            selectedTab = "map"
            mapMounted = true
        }
        NotifNavIntent.pendingTab?.let { tab ->
            NotifNavIntent.pendingTab = null
            when (tab) {
                "news"      -> subScreen = "news"
                "timetable" -> { selectedTab = "timetable"; subScreen = null }
                "map"       -> { selectedTab = "map"; subScreen = null; mapMounted = true }
                "home"      -> { selectedTab = "home"; subScreen = null }
            }
        }
    }
    LaunchedEffect(selectedTab) {
        if (selectedTab == "map") mapMounted = true
        try { fi.ksykmaps.data.Analytics.pageView(selectedTab) } catch (_: Throwable) {}
    }
    LaunchedEffect(subScreen) {
        subScreen?.let {
            try { fi.ksykmaps.data.Analytics.pageView(it) } catch (_: Throwable) {}
        }
    }

    if (!onboardingDone) {
        OnboardingScreen(onDone = { onboardingDone = true })
        return
    }
    if (showLogin) {
        LoginScreen(onLoggedIn = {
            showLogin = false
            // Session already flipped signedInState + adminState in
            // saveToDataStore; auto-jump admins straight to the panel.
            if (Session.isAdmin) selectedTab = "admin"
        })
        return
    }

    // Read from LanguageState (reactive) so the nav bar recomposes when
    // the user switches language in Settings. getAppLanguage() call is
    // still needed to seed LanguageState.current from SharedPreferences.
    LanguageState.init(ctx)
    val lang = LanguageState.current ?: "fi"

    BackHandler(enabled = subScreen != null) { subScreen = null }

    val showingMap = selectedTab == "map" && subScreen == null

    // If the user signed out while on the admin tab, kick back to home.
    LaunchedEffect(isAdmin, selectedTab) {
        if (!isAdmin && selectedTab == "admin") selectedTab = "home"
    }

    Scaffold(
        bottomBar = {
            if (subScreen == null) {
                BottomBar(selectedTab, lang) { tab ->
                    selectedTab = tab
                    subScreen = null
                }
            }
        }
    ) { pad ->
        Box(Modifier.padding(pad).fillMaxSize()) {
            if (mapMounted) {
                Box(
                    Modifier
                        .fillMaxSize()
                        // graphicsLayer alpha uses a hardware layer, so it
                        // correctly hides MapLibre's underlying SurfaceView.
                        // Modifier.alpha alone would not affect the surface.
                        .graphicsLayer { alpha = if (showingMap) 1f else 0f }
                ) {
                    MapScreen()
                }
            }

            if (!showingMap) {
                // Opaque background layer above the (possibly mounted) map
                // so the hidden map surface never bleeds through even if the
                // hardware layer alpha is delayed a frame on some devices.
                Box(
                    Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.background)
                ) {
                    when {
                        subScreen == "rooms" -> RoomFinderScreen(onOpenOnMap = { roomId ->
                            MapNavIntent.pendingRoomId = roomId
                            subScreen = null
                            selectedTab = "map"
                            mapMounted = true
                        })
                        subScreen == "news" -> AnnouncementsScreen()
                        subScreen == "wilmaConnect" -> WilmaConnectScreen(
                            onBack     = { subScreen = null },
                            onImported = { subScreen = null },
                        )
                        subScreen == "beaconCapture" -> BeaconScreen()
                        subScreen == "logs" -> LogsScreen(onBack = { subScreen = null })
                        subScreen == "feedback" -> FeedbackScreen(onBack = { subScreen = null })
                        subScreen == "bugreport" -> BugReportScreen(onBack = { subScreen = null })
                        selectedTab == "home" -> HomeScreen(
                            onOpenRooms         = { subScreen = "rooms" },
                            onOpenBeacons       = {},
                            onOpenAnnouncements = { subScreen = "news" },
                            onOpenAccount       = { selectedTab = "settings"; subScreen = null },
                            onOpenTimetable     = { selectedTab = "timetable"; subScreen = null },
                            onOpenBuildings     = { selectedTab = "map"; subScreen = null; mapMounted = true },
                            onOpenLunch         = { selectedTab = "lunch"; subScreen = null },
                        )
                        selectedTab == "timetable" -> TimetableScreen(
                            onNavigateToRoom   = { roomId ->
                                MapNavIntent.pendingRoomId = roomId
                                selectedTab = "map"
                                subScreen = null
                                mapMounted = true
                            },
                            onOpenWilmaConnect = { subScreen = "wilmaConnect" },
                        )
                        selectedTab == "lunch" -> LunchScreen()
                        selectedTab == "admin" && isAdmin -> AdminPanelScreen(
                            onSignOut = { Session.clear(ctx); selectedTab = "home" },
                            onOpenBeaconCapture = { subScreen = "beaconCapture" },
                        )
                        selectedTab == "settings" -> SettingsScreen(
                            onSignOut      = { Session.clear(ctx) },
                            onSignIn       = { showLogin = true },
                            onOpenLogs     = { subScreen = "logs" },
                            onOpenAdmin    = { selectedTab = "admin"; subScreen = null },
                            onResetAll     = { onboardingDone = false },
                            onOpenFeedback  = { subScreen = "feedback" },
                            onOpenBugReport = { subScreen = "bugreport" },
                        )
                    }
                }
            }
        }
    }

    if (showLoading) LoadingScreen(onFinished = { showLoading = false })
}

@Composable
private fun BottomBar(
    selectedTab: String,
    lang: String,
    onTabSelected: (String) -> Unit,
) {
    val tabs = if (lang == "fi") listOf(
        Tab("home",      "Koti",      Icons.Outlined.Home),
        Tab("map",       "Kartta",    Icons.Outlined.Map),
        Tab("timetable", "Tunnit",    Icons.Outlined.CalendarMonth),
        Tab("lunch",     "Lounas",    Icons.Outlined.Restaurant),
        Tab("settings",  "Asetukset", Icons.Outlined.Settings),
    ) else listOf(
        Tab("home",      "Home",      Icons.Outlined.Home),
        Tab("map",       "Map",       Icons.Outlined.Map),
        Tab("timetable", "Timetable", Icons.Outlined.CalendarMonth),
        Tab("lunch",     "Lunch",     Icons.Outlined.Restaurant),
        Tab("settings",  "Settings",  Icons.Outlined.Settings),
    )
    NavigationBar(
        containerColor = MaterialTheme.colorScheme.surface,
        tonalElevation = 0.dp,
        modifier = Modifier.height(72.dp),
    ) {
        tabs.forEach { tab ->
            NavigationBarItem(
                selected  = selectedTab == tab.route,
                onClick   = { onTabSelected(tab.route) },
                icon      = {
                    Icon(
                        tab.icon,
                        contentDescription = tab.label,
                        modifier = Modifier.size(22.dp),
                    )
                },
                label     = {
                    androidx.compose.material3.Text(
                        tab.label,
                        fontSize = 11.sp,
                        fontWeight = if (selectedTab == tab.route)
                            androidx.compose.ui.text.font.FontWeight.SemiBold
                        else androidx.compose.ui.text.font.FontWeight.Medium,
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = MaterialTheme.colorScheme.onSecondaryContainer,
                    selectedTextColor = MaterialTheme.colorScheme.onSurface,
                    indicatorColor = MaterialTheme.colorScheme.secondaryContainer,
                    unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                ),
            )
        }
    }
}
