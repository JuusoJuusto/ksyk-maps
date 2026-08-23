package fi.ksykmaps.admin

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.dp
import fi.ksykmaps.admin.data.AdminSession
import fi.ksykmaps.admin.ui.dashboard.DashboardScreen
import fi.ksykmaps.admin.ui.login.AdminLoginScreen
import fi.ksykmaps.admin.ui.logs.LogsScreen
import fi.ksykmaps.admin.ui.rooms.RoomsScreen
import fi.ksykmaps.admin.ui.settings.AdminSettingsScreen
import fi.ksykmaps.admin.ui.theme.AdminTheme
import fi.ksykmaps.admin.ui.wifi.WifiPositioningScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        AdminSession.load(this)
        setContent {
            AdminTheme(darkTheme = isSystemInDarkTheme()) {
                AdminShell()
            }
        }
    }
}

private data class NavDest(val id: String, val label: String, val icon: ImageVector)

private val DESTS = listOf(
    NavDest("dashboard", "Dashboard", Icons.Outlined.Dashboard),
    NavDest("wifi",      "Wi-Fi",     Icons.Outlined.Wifi),
    NavDest("rooms",     "Rooms",     Icons.Outlined.MeetingRoom),
    NavDest("logs",      "Logs",      Icons.Outlined.Description),
    NavDest("settings",  "Settings",  Icons.Outlined.Settings),
)

@Composable
private fun AdminShell() {
    var loggedIn by remember { mutableStateOf(AdminSession.isLoggedIn) }

    if (!loggedIn) {
        AdminLoginScreen(onLoggedIn = { loggedIn = true })
        return
    }

    var currentId by remember { mutableStateOf("dashboard") }
    val wide = LocalConfiguration.current.screenWidthDp >= 600

    if (wide) {
        Row(Modifier.fillMaxSize()) {
            NavigationRail {
                Spacer(Modifier.height(8.dp))
                DESTS.forEach { dest ->
                    NavigationRailItem(
                        selected = currentId == dest.id,
                        onClick = { currentId = dest.id },
                        icon = { Icon(dest.icon, contentDescription = dest.label) },
                        label = { Text(dest.label) },
                    )
                }
            }
            VerticalDivider()
            Box(Modifier.weight(1f).fillMaxHeight()) {
                AdminContent(currentId, onSignOut = { loggedIn = false })
            }
        }
    } else {
        Scaffold(
            bottomBar = {
                NavigationBar {
                    DESTS.forEach { dest ->
                        NavigationBarItem(
                            selected = currentId == dest.id,
                            onClick = { currentId = dest.id },
                            icon = { Icon(dest.icon, contentDescription = dest.label) },
                            label = { Text(dest.label) },
                        )
                    }
                }
            },
        ) { pad ->
            Box(Modifier.padding(pad)) {
                AdminContent(currentId, onSignOut = { loggedIn = false })
            }
        }
    }
}

@Composable
private fun AdminContent(currentId: String, onSignOut: () -> Unit) {
    when (currentId) {
        "dashboard" -> DashboardScreen()
        "wifi"      -> WifiPositioningScreen()
        "rooms"     -> RoomsScreen()
        "logs"      -> LogsScreen()
        "settings"  -> AdminSettingsScreen(onSignOut = onSignOut)
    }
}
