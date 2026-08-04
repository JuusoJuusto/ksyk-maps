package fi.ksykmaps.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import fi.ksykmaps.data.Api
import fi.ksykmaps.data.DiskCache
import fi.ksykmaps.data.Session

/**
 * App-level settings for the mobile client.
 *
 * - API endpoint override (dev / staging)
 * - Notifications toggle (placeholder — FCM wiring is a separate task)
 * - Dynamic colour toggle (Android 12+ Material You)
 * - Diagnostic actions (clear cache, sign out, about)
 * - Links to the desktop / website counterparts
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(onSignOut: () -> Unit, onSignIn: () -> Unit = {}) {
    val ctx = LocalContext.current
    var apiBase by remember { mutableStateOf(Api.base) }
    var editingApi by remember { mutableStateOf(false) }
    var notificationsEnabled by remember { mutableStateOf(false) }
    var dynamicColour by remember { mutableStateOf(true) }
    var cacheBytes by remember { mutableStateOf(DiskCache.sizeBytes()) }
    var clearing by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings", fontWeight = FontWeight.SemiBold) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
    ) { pad ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(pad)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            SectionTitle("Server")
            SettingRow(
                icon = Icons.Outlined.Public,
                title = "API endpoint",
                subtitle = apiBase,
                trailing = {
                    TextButton(onClick = { editingApi = true }) { Text("Change") }
                },
            )

            SectionTitle("Preferences")
            ToggleRow(
                icon = Icons.Outlined.Notifications,
                title = "Notifications",
                subtitle = "Announcements + your beacon captures",
                checked = notificationsEnabled,
                onCheckedChange = { notificationsEnabled = it },
            )
            ToggleRow(
                icon = Icons.Outlined.ColorLens,
                title = "Dynamic colour",
                subtitle = "Match your wallpaper on Android 12+",
                checked = dynamicColour,
                onCheckedChange = { dynamicColour = it },
            )

            SectionTitle("KSYK Maps everywhere")
            LinkRow(
                icon = Icons.Outlined.Public,
                title = "Open the website",
                subtitle = "ksykmaps.fi",
                onClick = {
                    try {
                        ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://ksykmaps.fi")))
                    } catch (_: Exception) { }
                },
            )
            LinkRow(
                icon = Icons.Outlined.DesktopWindows,
                title = "Desktop admin",
                subtitle = "Download the Windows app from the admin panel",
                onClick = {
                    try {
                        ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://ksykmaps.fi/admin")))
                    } catch (_: Exception) { }
                },
            )

            SectionTitle("Offline data")
            SettingRow(
                icon = Icons.Outlined.CloudDone,
                title = "Cached responses",
                subtitle = formatBytes(cacheBytes) + " · buildings, rooms, announcements",
                trailing = {
                    TextButton(
                        onClick = {
                            clearing = true
                            DiskCache.clear()
                            cacheBytes = 0L
                            clearing = false
                        },
                        enabled = !clearing && cacheBytes > 0L,
                    ) { Text(if (clearing) "Clearing…" else "Clear") }
                },
            )

            SectionTitle("Account")
            if (Api.sessionEmail != null) {
                LinkRow(
                    icon = Icons.Outlined.AccountCircle,
                    title = Api.sessionEmail!!,
                    subtitle = "Tap to sign out",
                    onClick = onSignOut,
                )
            } else {
                // v1.5.0 — guest mode. Sign-in is optional and only
                // needed for admin-only screens (beacon survey +
                // publishing). The rest of the app (map, rooms, news)
                // works anonymously against the public API.
                LinkRow(
                    icon = Icons.Outlined.Login,
                    title = "Sign in",
                    subtitle = "Optional — required only for beacon survey + admin",
                    onClick = onSignIn,
                )
            }

            SectionTitle("About")
            SettingRow(
                icon = Icons.Outlined.Info,
                title = "KSYK Maps Mobile",
                subtitle = "Version 1.2.0 · © 2026 Nordbyte Studio",
            )
        }
    }

    if (editingApi) {
        var draft by remember { mutableStateOf(apiBase) }
        AlertDialog(
            onDismissRequest = { editingApi = false },
            title = { Text("API endpoint") },
            text = {
                Column {
                    Text(
                        "Override the base URL the app talks to. Useful for pointing " +
                        "at a staging environment while testing.",
                        fontSize = 13.sp,
                    )
                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        value = draft,
                        onValueChange = { draft = it },
                        label = { Text("Base URL") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    Api.base = draft.trim().trimEnd('/')
                    apiBase = Api.base
                    editingApi = false
                }) { Text("Save") }
            },
            dismissButton = {
                TextButton(onClick = {
                    draft = "https://ksykmaps.fi/api"
                    Api.base = draft; apiBase = draft
                    editingApi = false
                }) { Text("Reset") }
            },
        )
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(
        text.uppercase(),
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(top = 8.dp, start = 4.dp),
    )
}

@Composable
private fun SettingRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    trailing: @Composable () -> Unit = {},
) {
    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Row(
            Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Icon(icon, null, tint = MaterialTheme.colorScheme.primary)
            Column(Modifier.weight(1f)) {
                Text(title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                Text(
                    subtitle,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            trailing()
        }
    }
}

@Composable
private fun ToggleRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    SettingRow(
        icon = icon,
        title = title,
        subtitle = subtitle,
        trailing = { Switch(checked = checked, onCheckedChange = onCheckedChange) },
    )
}

@Composable
private fun LinkRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
) {
    Card(
        Modifier.fillMaxWidth().clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Row(
            Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Icon(icon, null, tint = MaterialTheme.colorScheme.primary)
            Column(Modifier.weight(1f)) {
                Text(title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                Text(
                    subtitle,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Icon(
                Icons.Outlined.ChevronRight, null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

/** Human-friendly byte count — 342 B, 12.3 KB, 4.8 MB. */
private fun formatBytes(bytes: Long): String {
    if (bytes < 1024) return "$bytes B"
    val kb = bytes / 1024.0
    if (kb < 1024) return "%.1f KB".format(kb)
    val mb = kb / 1024.0
    return "%.1f MB".format(mb)
}
