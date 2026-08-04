package fi.ksykmaps

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
        setContent {
            KsykTheme { AppShell() }
        }
    }
}

private data class Tab(val route: String, val label: String, val icon: ImageVector)

private val TABS = listOf(
    Tab("home",     "Home",     Icons.Outlined.Home),
    Tab("map",      "Map",      Icons.Outlined.Map),
    Tab("rooms",    "Rooms",    Icons.Outlined.MeetingRoom),
    Tab("news",     "News",     Icons.Outlined.Campaign),
    Tab("settings", "Settings", Icons.Outlined.Settings),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AppShell() {
    val ctx = LocalContext.current
    val nav = rememberNavController()
    var loggedIn by remember { mutableStateOf(Api.sessionEmail != null) }

    if (!loggedIn) {
        LoginScreen(onLoggedIn = { loggedIn = true })
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
                    SettingsScreen(onSignOut = {
                        Session.clear(ctx)
                        loggedIn = false
                    })
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
