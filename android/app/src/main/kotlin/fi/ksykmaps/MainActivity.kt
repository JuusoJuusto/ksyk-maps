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
import fi.ksykmaps.ui.LoginScreen
import fi.ksykmaps.ui.MapNavIntent
import fi.ksykmaps.ui.MapScreen
import fi.ksykmaps.ui.RoomFinderScreen
import fi.ksykmaps.ui.SettingsScreen
import fi.ksykmaps.ui.TimetableScreen
import fi.ksykmaps.ui.theme.KsykTheme

/**
 * Single-activity Compose host with a Material-3 bottom nav bar.
 *
 * Routes:
 *   home          · Landing dashboard with live stats
 *   map           · Native MapLibre campus map — primary screen
 *   rooms         · Searchable room finder (list view companion to Map)
 *   beacons       · WiFi + GPS survey (linked from Home quick-actions)
 *   buildings     · Campus buildings directory (linked from Home)
 *   news          · School announcements
 *   settings      · App preferences + about
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Must be BEFORE super.onCreate — installs the splash screen shim.
        installSplashScreen()
        super.onCreate(savedInstanceState)
        Session.load(this)
        handleDeepLink(intent)  // Cold-start deep link (app launched by URL)
        setContent {
            KsykTheme { AppShell() }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // Warm-start deep link — app is already running, user taps a
        // ksykmaps.fi/?room=<id> link somewhere. singleTop launchMode
        // means we get onNewIntent instead of a fresh activity.
        setIntent(intent)
        handleDeepLink(intent)
    }

    private fun handleDeepLink(intent: Intent?) {
        val data: Uri = intent?.data ?: return
        // We only recognise the room-focus query for now; other pages
        // fall back to opening the browser via the OS chooser.
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
    Tab("rooms",     "Rooms",     Icons.Outlined.MeetingRoom),
    Tab("settings",  "Settings",  Icons.Outlined.Settings),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AppShell() {
    val ctx = LocalContext.current
    val nav = rememberNavController()
    // v1.5.0 — no forced login. The app opens straight to the map like
    // the website. Sign-in is optional and lives in Settings; it's only
    // needed for admin features (Beacons survey, publishing changes).
    // Public campus data (buildings, rooms, announcements) is served
    // to anonymous callers by /api on the server side, matching the
    // web anon experience.
    var loggedIn by remember { mutableStateOf(Api.sessionEmail != null) }
    var showLogin by remember { mutableStateOf(false) }

    // Cold-start deep link — if MainActivity received a room URL and
    // pushed the id into MapNavIntent before we composed, jump to the
    // Map tab so MapScreen's own LaunchedEffect can consume the intent.
    LaunchedEffect(Unit) {
        if (MapNavIntent.pendingRoomId != null) navigate(nav, "map")
    }

    // Optional login sheet — surfaces only when the user explicitly
    // triggers it (Settings → Sign in, or a screen that requires auth
    // like the beacon survey). Doesn't block the rest of the app.
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
                        onOpenRooms         = { navigate(nav, "map") },
                        onOpenBeacons       = { navigate(nav, "beacons") },
                        onOpenAnnouncements = { navigate(nav, "news") },
                        onOpenAccount       = { navigate(nav, "settings") },
                        onOpenBuildings     = { navigate(nav, "map") },
                    )
                }
                composable("map")       { MapScreen() }
                composable("timetable") {
                    TimetableScreen(onNavigateToRoom = { roomId ->
                        MapNavIntent.pendingRoomId = roomId
                        navigate(nav, "map")
                    })
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
                        onNavigateToBeacons = { navigate(nav, "beacons") },
                    )
                }
            }
        }
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
