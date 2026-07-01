package fi.ksykmaps

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Campaign
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material.icons.outlined.Person
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
import fi.ksykmaps.ui.AccountScreen
import fi.ksykmaps.ui.AnnouncementsScreen
import fi.ksykmaps.ui.BeaconScreen
import fi.ksykmaps.ui.HomeScreen
import fi.ksykmaps.ui.LoginScreen
import fi.ksykmaps.ui.RoomFinderScreen
import fi.ksykmaps.ui.theme.KsykTheme

/**
 * Single-activity Compose host.
 *
 * Routes:
 *   home          · Landing dashboard
 *   rooms         · Room finder
 *   beacons       · WiFi survey + GPS capture
 *   announcements · Latest school notices
 *   account       · Sign-in info + sign out
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Session.load(this)
        setContent {
            KsykTheme { AppShell() }
        }
    }
}

private data class Tab(val route: String, val label: String, val icon: ImageVector)

private val TABS = listOf(
    Tab("home",          "Home",     Icons.Outlined.Home),
    Tab("rooms",         "Rooms",    Icons.Outlined.Map),
    Tab("beacons",       "Beacons",  Icons.Outlined.Wifi),
    Tab("announcements", "News",     Icons.Outlined.Campaign),
    Tab("account",       "Account",  Icons.Outlined.Person),
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
                        onOpenRooms         = { navigate(nav, "rooms") },
                        onOpenBeacons       = { navigate(nav, "beacons") },
                        onOpenAnnouncements = { navigate(nav, "announcements") },
                        onOpenAccount       = { navigate(nav, "account") },
                    )
                }
                composable("rooms")         { RoomFinderScreen() }
                composable("beacons")       { BeaconScreen() }
                composable("announcements") { AnnouncementsScreen() }
                composable("account") {
                    AccountScreen(onSignOut = {
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
                onClick = {
                    if (current != tab.route) navigate(nav, tab.route)
                },
                icon = { Icon(tab.icon, contentDescription = tab.label) },
                label = { Text(tab.label) },
            )
        }
    }
}
