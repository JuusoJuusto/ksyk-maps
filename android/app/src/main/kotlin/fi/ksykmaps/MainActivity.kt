package fi.ksykmaps

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import fi.ksykmaps.data.Api
import fi.ksykmaps.data.Session
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
        Session.load(this)
        val savedTheme = getSharedPreferences("ksyk_prefs", android.content.Context.MODE_PRIVATE)
            .getString("dark_mode", "system") ?: "system"
        ThemeState.mode = savedTheme
        handleDeepLink(intent)
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val entries = loadEntries(this@MainActivity)
                if (entries.isNotEmpty()) LessonReminderScheduler.schedule(this@MainActivity, entries)
            } catch (_: Exception) {}
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
        val data: Uri = intent?.data ?: return
        val roomId = data.getQueryParameter("room") ?: return
        if (roomId.isNotBlank()) MapNavIntent.pendingRoomId = roomId
    }
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

    // Tab state — replaces NavHost for the main 5 tabs so MapScreen is
    // never removed from composition, keeping the GL context alive.
    var selectedTab by rememberSaveable { mutableStateOf("home") }
    // Sub-screen pushed on top of the tab (rooms / news / wilmaConnect).
    var subScreen by rememberSaveable { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        if (MapNavIntent.pendingRoomId != null) selectedTab = "map"
    }

    if (!onboardingDone) {
        OnboardingScreen(onDone = { onboardingDone = true })
        return
    }
    if (showLogin) {
        LoginScreen(onLoggedIn = { loggedIn = true; showLogin = false })
        return
    }

    val lang = remember { getAppLanguage(ctx) }

    BackHandler(enabled = subScreen != null) { subScreen = null }

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
            // MapScreen is ALWAYS in the composition tree so the MapLibre
            // GL context (and its native render thread) is never destroyed
            // by tab switching. alpha(0f) makes it invisible but keeps
            // the view attached and the GL surface alive.
            Box(
                Modifier
                    .fillMaxSize()
                    .alpha(if (selectedTab == "map" && subScreen == null) 1f else 0f)
            ) {
                MapScreen()
            }

            val showingMap = selectedTab == "map" && subScreen == null
            if (!showingMap) {
                when {
                    subScreen == "rooms" -> RoomFinderScreen(onOpenOnMap = { roomId ->
                        MapNavIntent.pendingRoomId = roomId
                        subScreen = null
                        selectedTab = "map"
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
                        onOpenBuildings     = { selectedTab = "map"; subScreen = null },
                        onOpenLunch         = { selectedTab = "lunch"; subScreen = null },
                    )
                    selectedTab == "timetable" -> TimetableScreen(
                        onNavigateToRoom   = { roomId ->
                            MapNavIntent.pendingRoomId = roomId
                            selectedTab = "map"
                            subScreen = null
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
