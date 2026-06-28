package fi.ksykmaps

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.Megaphone
import androidx.compose.material.icons.outlined.Restaurant
import androidx.compose.material.icons.outlined.Wifi
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import fi.ksykmaps.data.Api
import fi.ksykmaps.ui.BeaconScreen
import fi.ksykmaps.ui.LoginScreen
import fi.ksykmaps.ui.RoomFinderScreen
import fi.ksykmaps.ui.theme.KsykTheme

/**
 * Single-activity Compose host. Four tabs reachable via the bottom bar:
 *   Rooms · Beacons · Announcements · Account
 *
 * Login is the first destination unless we already have a stored email
 * in DataStore (TODO — for now sessionEmail is in-memory).
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            KsykTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    AppShell()
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AppShell() {
    val nav = rememberNavController()
    var loggedIn by remember { mutableStateOf(Api.sessionEmail != null) }

    if (!loggedIn) {
        LoginScreen(onLoggedIn = { loggedIn = true })
        return
    }

    val tabs = listOf(
        Triple("rooms",         "Rooms",        Icons.Outlined.AccountCircle),
        Triple("beacons",       "Beacons",      Icons.Outlined.Wifi),
        Triple("announcements", "Announcements", Icons.Outlined.Megaphone),
        Triple("account",       "Account",      Icons.Outlined.AccountCircle),
    )

    Scaffold(
        bottomBar = {
            val current = nav.currentBackStackEntryAsState().value?.destination?.route
            NavigationBar {
                tabs.forEach { (route, label, icon) ->
                    NavigationBarItem(
                        selected = current == route,
                        onClick = { nav.navigate(route) { launchSingleTop = true } },
                        icon = { Icon(icon, contentDescription = label) },
                        label = { Text(label) },
                    )
                }
            }
        }
    ) { pad ->
        Box(Modifier.padding(pad)) {
            NavHost(navController = nav, startDestination = "rooms") {
                composable("rooms")         { RoomFinderScreen() }
                composable("beacons")       { BeaconScreen() }
                composable("announcements") { Text("Announcements (TODO)") }
                composable("account")       {
                    TextButton(onClick = { Api.sessionEmail = null; loggedIn = false }) {
                        Text("Sign out (${Api.sessionEmail})")
                    }
                }
            }
        }
    }
}
