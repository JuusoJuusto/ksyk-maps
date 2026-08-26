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
import fi.ksykmaps.data.Api
import fi.ksykmaps.data.Session
import fi.ksykmaps.ui.AnnouncementPollWorker
import fi.ksykmaps.ui.AnnouncementsScreen
import fi.ksykmaps.ui.HomeScreen
import fi.ksykmaps.ui.LessonReminderScheduler
import fi.ksykmaps.ui.LoginScreen
import fi.ksykmaps.ui.LoadingScreen
import fi.ksykmaps.ui.LunchScreen
import fi.ksykmaps.ui.MapNavIntent
import fi.ksykmaps.ui.MapScreen
import fi.ksykmaps.ui.OnboardingScreen
import fi.ksykmaps.ui.RoomFinderScreen
import fi.ksykmaps.ui.SettingsScreen
import fi.ksykmaps.ui.TimetableScreen
import fi.ksykmaps.ui.WilmaConnectScreen
import fi.ksykmaps.ui.LanguageState
import fi.ksykmaps.ui.ThemeState
import fi.ksykmaps.ui.getAppLanguage
import fi.ksykmaps.ui.isOnboardingDone
import fi.ksykmaps.ui.loadEntries
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
        try {
            val savedTheme = getSharedPreferences("ksyk_prefs", android.content.Context.MODE_PRIVATE)
                .getString("dark_mode", "system") ?: "system"
            ThemeState.mode = savedTheme
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
                if (entries.isNotEmpty()) LessonReminderScheduler.schedule(this@MainActivity, entries)
            } catch (_: Throwable) {}
        }
        setContent {
            val systemDark = isSystemInDarkTheme()
            val darkMode = when (ThemeState.mode) {
                "dark"  -> true
                "light" -> false
                else    -> systemDark
            }
            KsykTheme(darkTheme = darkMode) { AppShell() }
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
    var loggedIn by remember { mutableStateOf(Api.sessionEmail != null) }
    var showLogin by remember { mutableStateOf(false) }
    var onboardingDone by remember { mutableStateOf(isOnboardingDone(ctx)) }
    var showLoading by remember { mutableStateOf(true) }

    var selectedTab by rememberSaveable { mutableStateOf("home") }
    var subScreen by rememberSaveable { mutableStateOf<String?>(null) }

    // Ask for POST_NOTIFICATIONS on Android 13+ once per install. Without
    // this the lesson-reminder and announcement notifications are dropped
    // silently by the OS — which is what caused "notifications don't work".
    val notifPermLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { /* result ignored — retried automatically next launch if declined */ }
    LaunchedEffect(Unit) {
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
    }

    if (!onboardingDone) {
        OnboardingScreen(onDone = { onboardingDone = true })
        return
    }
    if (showLogin) {
        LoginScreen(onLoggedIn = { loggedIn = true; showLogin = false })
        return
    }

    // Read from LanguageState (reactive) so the nav bar recomposes when
    // the user switches language in Settings. getAppLanguage() call is
    // still needed to seed LanguageState.current from SharedPreferences.
    LanguageState.init(ctx)
    val lang = LanguageState.current ?: "fi"

    BackHandler(enabled = subScreen != null) { subScreen = null }

    val showingMap = selectedTab == "map" && subScreen == null

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
                        selectedTab == "settings" -> SettingsScreen(
                            onSignOut = { Session.clear(ctx); loggedIn = false },
                            onSignIn  = { showLogin = true },
                        )
                    }
                }
            }
        }
    }

    if (showLoading) LoadingScreen(onFinished = { showLoading = false })
}

@Composable
private fun BottomBar(selectedTab: String, lang: String, onTabSelected: (String) -> Unit) {
    val tabs = if (lang == "fi") listOf(
        Tab("home",      "Koti",          Icons.Outlined.Home),
        Tab("map",       "Kartta",        Icons.Outlined.Map),
        Tab("timetable", "Lukujärjestys", Icons.Outlined.CalendarMonth),
        Tab("lunch",     "Lounas",        Icons.Outlined.Restaurant),
        Tab("settings",  "Asetukset",     Icons.Outlined.Settings),
    ) else listOf(
        Tab("home",      "Home",      Icons.Outlined.Home),
        Tab("map",       "Map",       Icons.Outlined.Map),
        Tab("timetable", "Timetable", Icons.Outlined.CalendarMonth),
        Tab("lunch",     "Lunch",     Icons.Outlined.Restaurant),
        Tab("settings",  "Settings",  Icons.Outlined.Settings),
    )
    NavigationBar {
        tabs.forEach { tab ->
            NavigationBarItem(
                selected  = selectedTab == tab.route,
                onClick   = { onTabSelected(tab.route) },
                icon      = { Icon(tab.icon, contentDescription = tab.label) },
                label     = { Text(tab.label) },
            )
        }
    }
}
