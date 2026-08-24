package fi.ksykmaps

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Business
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Campaign
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material.icons.outlined.MeetingRoom
import androidx.compose.material.icons.outlined.Restaurant
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Wifi
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import fi.ksykmaps.data.Api
import fi.ksykmaps.data.Session
import fi.ksykmaps.ui.AnnouncementsScreen
import fi.ksykmaps.ui.BeaconScreen
import fi.ksykmaps.ui.BuildingsScreen
import fi.ksykmaps.ui.HomeScreen
import fi.ksykmaps.ui.LessonReminderScheduler
import fi.ksykmaps.ui.LoginScreen
import fi.ksykmaps.ui.LunchScreen
import fi.ksykmaps.ui.MapNavIntent
import fi.ksykmaps.ui.MapScreen
import fi.ksykmaps.ui.OnboardingScreen
import fi.ksykmaps.ui.RoomFinderScreen
import fi.ksykmaps.ui.SettingsScreen
import fi.ksykmaps.ui.TimetableScreen
import fi.ksykmaps.ui.WilmaConnectScreen
import fi.ksykmaps.ui.isOnboardingDone
import fi.ksykmaps.ui.loadEntries
import fi.ksykmaps.ui.ThemeState
import fi.ksykmaps.ui.LoadingScreen
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
        // Restore persisted theme preference so ThemeState is set before first frame
        val savedTheme = getSharedPreferences("ksyk_prefs", android.content.Context.MODE_PRIVATE)
            .getString("dark_mode", "system") ?: "system"
        ThemeState.mode = savedTheme
        handleDeepLink(intent)
        // Re-arm lesson reminders on every cold start. Alarms survive across
        // tab switches but are cleared on reboot — this ensures they're always
        // set without requiring the user to open the timetable screen first.
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
        if (roomId.isNotBlank()) {
            MapNavIntent.pendingRoomId = roomId
        }
    }
}

private data class Tab(val route: String, val label: String, val icon: ImageVector)

private val TABS = listOf(
    Tab("home",      "Home",      Icons.Outlined.Home),
    Tab("map",       "Map",       Icons.Outlined.Map),
    Tab("timetable", "Timetable", Icons.Outlined.CalendarMonth),
    Tab("lunch",     "Lunch",     Icons.Outlined.Restaurant),
    Tab("settings",  "Settings",  Icons.Outlined.Settings),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AppShell() {
    val ctx = LocalContext.current
    val nav = rememberNavController()
    var loggedIn by remember { mutableStateOf(Api.sessionEmail != null) }
    var showLogin by remember { mutableStateOf(false) }
    var onboardingDone by remember { mutableStateOf(isOnboardingDone(ctx)) }
    var showLoading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        if (MapNavIntent.pendingRoomId != null) navigate(nav, "map")
    }

    // Show onboarding for first-time users
    if (!onboardingDone) {
        OnboardingScreen(onDone = { onboardingDone = true })
        return
    }

    if (showLogin) {
        LoginScreen(onLoggedIn = {
            loggedIn = true
            showLogin = false
        })
        return
    }

    Scaffold(
        bottomBar = { BottomBar(nav) },
    ) { pad ->
        Box(Modifier.padding(pad)) {
            NavHost(
                navController = nav,
                startDestination = "home",
                enterTransition = { fadeIn(tween(200)) },
                exitTransition = { fadeOut(tween(150)) },
            ) {
                composable("home") {
                    HomeScreen(
                        onOpenRooms         = { navigate(nav, "rooms") },
                        onOpenBeacons       = { /* admin-only */ },
                        onOpenAnnouncements = { navigate(nav, "news") },
                        onOpenAccount       = { navigate(nav, "settings") },
                        onOpenTimetable     = { navigate(nav, "timetable") },
                        onOpenBuildings     = { navigate(nav, "map") },
                        onOpenLunch         = { navigate(nav, "lunch") },
                    )
                }
                composable("map")    { MapScreen() }
                composable("lunch")  { LunchScreen() }
                composable("timetable") {
                    TimetableScreen(
                        onNavigateToRoom = { roomId ->
                            MapNavIntent.pendingRoomId = roomId
                            navigate(nav, "map")
                        },
                        onOpenWilmaConnect = { navigate(nav, "wilmaConnect") },
                    )
                }
                composable("wilmaConnect") {
                    WilmaConnectScreen(
                        onBack = { nav.popBackStack() },
                        onImported = { nav.popBackStack() },
                    )
                }
                composable("rooms")     {
                    RoomFinderScreen(onOpenOnMap = { roomId ->
                        MapNavIntent.pendingRoomId = roomId
                        navigate(nav, "map")
                    })
                }
                composable("beacons")   { BeaconScreen() }
                composable("buildings") { BuildingsScreen() }
                composable("news")      { AnnouncementsScreen() }
                composable("settings")  {
                    SettingsScreen(
                        onSignOut = {
                            Session.clear(ctx)
                            loggedIn = false
                        },
                        onSignIn = { showLogin = true },
                    )
                }
            }
        }
    }

    // Loading screen overlay — shows once on first launch, fades out after ~1.5s
    if (showLoading) {
        LoadingScreen(onFinished = { showLoading = false })
    }
}

private fun navigate(nav: NavHostController, route: String) {
    nav.navigate(route) {
        launchSingleTop = true
        popUpTo("home")
    }
}

@Composable
private fun BottomBar(nav: NavHostController) {
    val current = nav.currentBackStackEntryAsState().value?.destination?.route
    NavigationBar {
        TABS.forEach { tab ->
            NavigationBarItem(
                selected = current == tab.route,
                onClick = { if (current != tab.route) navigate(nav, tab.route) },
                icon = { Icon(tab.icon, contentDescription = tab.label) },
                label = { Text(tab.label) },
            )
        }
    }
}
