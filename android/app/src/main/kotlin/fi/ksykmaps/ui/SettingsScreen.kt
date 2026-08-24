package fi.ksykmaps.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import fi.ksykmaps.BuildConfig
import fi.ksykmaps.data.Api
import fi.ksykmaps.data.DiskCache
import fi.ksykmaps.data.Session
import androidx.compose.foundation.clickable
import androidx.compose.runtime.collectAsState

private const val PREFS_APP = "ksyk_prefs"
private const val KEY_LANGUAGE = "language"
private const val KEY_DARK_MODE = "dark_mode"  // "system" | "dark" | "light"

fun getAppLanguage(ctx: android.content.Context): String =
    ctx.getSharedPreferences(PREFS_APP, android.content.Context.MODE_PRIVATE)
        .getString(KEY_LANGUAGE, "en") ?: "en"

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onSignOut: () -> Unit,
    onSignIn: () -> Unit = {},
    onNavigateToBeacons: () -> Unit = {},
) {
    val ctx = LocalContext.current
    val prefs = remember { ctx.getSharedPreferences(PREFS_APP, android.content.Context.MODE_PRIVATE) }

    var apiBase by remember { mutableStateOf(Api.base) }
    var editingApi by remember { mutableStateOf(false) }
    var notificationsEnabled by remember { mutableStateOf(false) }
    var dynamicColour by remember { mutableStateOf(true) }
    var cacheBytes by remember { mutableStateOf(DiskCache.sizeBytes()) }
    var clearing by remember { mutableStateOf(false) }
    var language by remember { mutableStateOf(prefs.getString(KEY_LANGUAGE, "en") ?: "en") }
    val wifiApCount by WifiPositioning.scanCount.collectAsState()
    val wifiPos by WifiPositioning.position.collectAsState()

    val isFi = language == "fi"

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (isFi) "Asetukset" else "Settings", fontWeight = FontWeight.SemiBold) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
    ) { pad ->
        LazyColumn(
            Modifier.fillMaxSize().padding(pad),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            item { SectionTitle(if (isFi) "Palvelin" else "Server") }
            item {
                SettingRow(
                    icon = Icons.Outlined.Public,
                    title = if (isFi) "API-osoite" else "API endpoint",
                    subtitle = apiBase,
                    trailing = {
                        TextButton(onClick = { editingApi = true }) {
                            Text(if (isFi) "Muuta" else "Change")
                        }
                    },
                )
            }

            item { SectionTitle(if (isFi) "Asetukset" else "Preferences") }
            item {
                ToggleRow(
                    icon = Icons.Outlined.Notifications,
                    title = if (isFi) "Ilmoitukset" else "Notifications",
                    subtitle = if (isFi) "Kuulutukset ja uudet tiedotteet"
                               else "Announcements + school news",
                    checked = notificationsEnabled,
                    onCheckedChange = { notificationsEnabled = it },
                )
            }
            item {
                ToggleRow(
                    icon = Icons.Outlined.ColorLens,
                    title = if (isFi) "Dynaaminen väri" else "Dynamic colour",
                    subtitle = if (isFi) "Tapetsista johdettu väripaletti (Android 12+)"
                               else "Match your wallpaper on Android 12+",
                    checked = dynamicColour,
                    onCheckedChange = { dynamicColour = it },
                )
            }

            item { SectionTitle(if (isFi) "Kieli" else "Language") }
            item {
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
                        Icon(Icons.Outlined.Language, null, tint = MaterialTheme.colorScheme.primary)
                        Column(Modifier.weight(1f)) {
                            Text(
                                if (isFi) "Kieli / Language" else "Language / Kieli",
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 14.sp,
                            )
                            Text(
                                if (isFi) "Tällä hetkellä: Suomi" else "Currently: English",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            LangChip(label = "EN", selected = !isFi, onClick = {
                                language = "en"
                                prefs.edit().putString(KEY_LANGUAGE, "en").apply()
                            })
                            LangChip(label = "FI", selected = isFi, onClick = {
                                language = "fi"
                                prefs.edit().putString(KEY_LANGUAGE, "fi").apply()
                            })
                        }
                    }
                }
            }

            item { SectionTitle(if (isFi) "KSYK Maps muualla" else "KSYK Maps everywhere") }
            item {
                LinkRow(
                    icon = Icons.Outlined.Public,
                    title = if (isFi) "Avaa verkkosivusto" else "Open the website",
                    subtitle = "ksykmaps.fi",
                    onClick = {
                        try {
                            ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://ksykmaps.fi")))
                        } catch (_: Exception) { }
                    },
                )
            }

            item { SectionTitle(if (isFi) "Offline-data" else "Offline data") }
            item {
                SettingRow(
                    icon = Icons.Outlined.CloudDone,
                    title = if (isFi) "Välimuistissa" else "Cached responses",
                    subtitle = formatBytes(cacheBytes) + if (isFi) " · rakennukset, luokat, tiedotteet"
                               else " · buildings, rooms, announcements",
                    trailing = {
                        TextButton(
                            onClick = {
                                clearing = true
                                DiskCache.clear()
                                cacheBytes = 0L
                                clearing = false
                            },
                            enabled = !clearing && cacheBytes > 0L,
                        ) {
                            Text(
                                when {
                                    clearing -> if (isFi) "Tyhjennetään…" else "Clearing…"
                                    else -> if (isFi) "Tyhjennä" else "Clear"
                                }
                            )
                        }
                    },
                )
            }

            item { SectionTitle(if (isFi) "Tili" else "Account") }
            item {
                if (Api.sessionEmail != null) {
                    LinkRow(
                        icon = Icons.Outlined.AccountCircle,
                        title = Api.sessionEmail!!,
                        subtitle = if (isFi) "Napauta kirjautuaksesi ulos" else "Tap to sign out",
                        onClick = onSignOut,
                    )
                } else {
                    LinkRow(
                        icon = Icons.Outlined.Login,
                        title = if (isFi) "Kirjaudu sisään" else "Sign in",
                        subtitle = if (isFi) "Valinnainen — tarvitaan vain hallintapaneeliin"
                                   else "Optional — required only for admin features",
                        onClick = onSignIn,
                    )
                }
            }

            item { SectionTitle(if (isFi) "Wi-Fi-paikannus" else "Wi-Fi Positioning") }
            item {
                SettingRow(
                    icon = Icons.Outlined.Wifi,
                    title = if (isFi) "Sisätilapaikannus" else "Indoor positioning",
                    subtitle = buildString {
                        append("$wifiApCount AP${if (wifiApCount == 1) "" else "s"} visible")
                        wifiPos?.let { pos ->
                            append(" · ${pos.confidence.name.lowercase()}")
                            pos.floor?.let { append(" · Floor $it") }
                        } ?: append(" · no estimate yet")
                    },
                )
            }
            item {
                LinkRow(
                    icon = Icons.Outlined.Sensors,
                    title = if (isFi) "Kalibroi sormenjäljet" else "Calibrate fingerprints",
                    subtitle = if (isFi) "Skannaa huoneita Wi-Fi-skannerilla"
                               else "Survey rooms with the native WiFi scanner",
                    onClick = onNavigateToBeacons,
                )
            }

            item { SectionTitle(if (isFi) "Tietoja" else "About") }
            item {
                SettingRow(
                    icon = Icons.Outlined.Info,
                    title = "KSYK Maps Mobile",
                    subtitle = "v${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE}) · © 2026 Nordbyte Studio",
                )
            }

            item { Spacer(Modifier.height(8.dp)) }
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
private fun LangChip(label: String, selected: Boolean, onClick: () -> Unit) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = { Text(label, fontSize = 12.sp, fontWeight = FontWeight.Medium) },
        modifier = Modifier.height(32.dp),
    )
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
                Text(subtitle, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                Text(subtitle, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Icon(Icons.Outlined.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

private fun formatBytes(bytes: Long): String {
    if (bytes < 1024) return "$bytes B"
    val kb = bytes / 1024.0
    if (kb < 1024) return "%.1f KB".format(kb)
    val mb = kb / 1024.0
    return "%.1f MB".format(mb)
}
