package fi.ksykmaps.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Login
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import android.os.Build
import fi.ksykmaps.BuildConfig
import fi.ksykmaps.data.Analytics
import fi.ksykmaps.data.Api
import fi.ksykmaps.data.DiskCache
import fi.ksykmaps.data.Session
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

private const val KEY_LANGUAGE = "language"
private const val KEY_DARK_MODE = "dark_mode"  // "system" | "dark" | "light"
private const val KEY_EGGS_FOUND = "easter_eggs_found"
private const val TOTAL_EGGS = 3

/** Observable language state. Any composable reading LanguageState.current
 *  recomposes when the user switches language in Settings. Initialised
 *  lazily from SharedPreferences on first access. */
object LanguageState {
    var current by androidx.compose.runtime.mutableStateOf<String?>(null)

    fun init(ctx: android.content.Context) {
        if (current == null) {
            current = ctx.getSharedPreferences(PREFS_APP, android.content.Context.MODE_PRIVATE)
                .getString(KEY_LANGUAGE, "fi") ?: "fi"
        }
    }

    fun set(ctx: android.content.Context, lang: String) {
        current = lang
        ctx.getSharedPreferences(PREFS_APP, android.content.Context.MODE_PRIVATE)
            .edit().putString(KEY_LANGUAGE, lang).apply()
    }
}

fun getAppLanguage(ctx: android.content.Context): String {
    LanguageState.init(ctx)
    return LanguageState.current ?: "fi"
}

object ThemeState {
    var mode by androidx.compose.runtime.mutableStateOf("system") // "system" | "dark" | "light"
}

object DynamicColorState {
    var enabled by androidx.compose.runtime.mutableStateOf(true)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onSignOut: () -> Unit,
    onSignIn: () -> Unit = {},
    onOpenLogs: () -> Unit = {},
    onOpenAdmin: () -> Unit = {},
    onResetAll: () -> Unit = {},
    onOpenFeedback: () -> Unit = {},
    onOpenBugReport: () -> Unit = {},
    onOpenChangelog: () -> Unit = {},
    /** v1.89.0 — opens the Home tab section reorder screen. */
    onOpenHomeSections: () -> Unit = {},
) {
    val ctx = LocalContext.current
    LanguageState.init(ctx); val lang = LanguageState.current ?: "fi"
    val prefs = remember { ctx.getSharedPreferences(PREFS_APP, android.content.Context.MODE_PRIVATE) }
    val scope = rememberCoroutineScope()

    fun isNotifGranted() = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
        androidx.core.app.ActivityCompat.checkSelfPermission(
            ctx, android.Manifest.permission.POST_NOTIFICATIONS
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED
    } else true

    var notificationsEnabled by remember { mutableStateOf(isNotifGranted()) }
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) notificationsEnabled = isNotifGranted()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    fun openNotifSettings() {
        try {
            val intent = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                    .putExtra(Settings.EXTRA_APP_PACKAGE, ctx.packageName)
            } else {
                Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                    .setData(Uri.fromParts("package", ctx.packageName, null))
            }
            ctx.startActivity(intent)
        } catch (_: Exception) {}
    }

    var dynamicColour by remember { mutableStateOf(prefs.getBoolean("dynamic_colour", true)) }
    var eggTaps by remember { mutableIntStateOf(0) }
    var eggsFound by remember { mutableIntStateOf(prefs.getInt(KEY_EGGS_FOUND, 0)) }
    var activeEgg by remember { mutableStateOf<String?>(null) }
    var cacheBytes by remember { mutableStateOf(DiskCache.sizeBytes()) }
    var clearing by remember { mutableStateOf(false) }
    var showResetAllConfirm by remember { mutableStateOf(false) }
    var userName by remember { mutableStateOf(getUserName(ctx)) }
    var editingName by remember { mutableStateOf(false) }
    var themeMode by remember { mutableStateOf(ThemeState.mode) }
    val isFi = lang == "fi"

    Scaffold(
        containerColor = MaterialTheme.colorScheme.surface,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        if (isFi) "Asetukset" else "Settings",
                        fontWeight = FontWeight.SemiBold,
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
    ) { pad ->
        LazyColumn(
            Modifier.fillMaxSize().padding(pad),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            // ── Profile ────────────────────────────────────────────
            item {
                ProfileHeader(
                    userName = userName,
                    email = Api.sessionEmail,
                    isFi = isFi,
                    onEditName = { editingName = true },
                )
            }

            // ── Appearance ─────────────────────────────────────────
            item {
                SettingsGroup(title = if (isFi) "Ulkoasu" else "Appearance") {
                    ThemeRow(
                        themeMode = themeMode,
                        isFi = isFi,
                        onChange = {
                            themeMode = it
                            ThemeState.mode = it
                            prefs.edit().putString(KEY_DARK_MODE, it).apply()
                        },
                    )
                    RowDivider()
                    LanguageRow(
                        isFi = isFi,
                        onSelect = { newLang ->
                            LanguageState.set(ctx, newLang)
                        },
                    )
                    RowDivider()
                    ToggleGroupRow(
                        icon = Icons.Outlined.ColorLens,
                        iconTint = Color(0xFFEC4899),
                        title = if (isFi) "Dynaaminen väri" else "Dynamic colour",
                        subtitle = if (isFi) "Käytä tapetin väripalettia (Android 12+)"
                                   else "Match your wallpaper (Android 12+)",
                        checked = dynamicColour,
                        onCheckedChange = {
                            dynamicColour = it
                            DynamicColorState.enabled = it
                            prefs.edit().putBoolean("dynamic_colour", it).apply()
                        },
                    )
                    RowDivider()
                    LinkGroupRow(
                        icon = Icons.Outlined.Reorder,
                        iconTint = Color(0xFF003D82),
                        title = if (isFi) "Muokkaa etusivua" else "Customize home",
                        subtitle = if (isFi) "Piilota tai järjestä osiot uudelleen"
                                   else "Hide or reorder home sections",
                        onClick = onOpenHomeSections,
                    )
                }
            }

            // ── Notifications ──────────────────────────────────────
            item {
                SettingsGroup(title = if (isFi) "Ilmoitukset" else "Notifications") {
                    ToggleGroupRow(
                        icon = Icons.Outlined.Notifications,
                        iconTint = Color(0xFFF59E0B),
                        title = if (isFi) "Ilmoitukset" else "Notifications",
                        subtitle = if (isFi) "Kuulutukset ja koulun uutiset"
                                   else "Announcements and school news",
                        checked = notificationsEnabled,
                        onCheckedChange = { openNotifSettings() },
                    )
                    RowDivider()
                    // v1.83.0: reminder lead-time picker — how many minutes
                    // before class the reminder fires. Range 0-30. Slider is
                    // discrete (steps=6 = 0/5/10/15/20/25/30). Change
                    // triggers a full re-schedule so the next fire uses the
                    // new lead time immediately, not just future lessons.
                    var reminderLead by remember {
                        mutableIntStateOf(LessonReminderScheduler.leadMinutes(ctx).toInt())
                    }
                    Column(Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            IconBubble(icon = Icons.Outlined.Alarm, tint = Color(0xFFF59E0B))
                            Spacer(Modifier.width(14.dp))
                            Column(Modifier.weight(1f)) {
                                Text(
                                    if (isFi) "Muistutuksen aika ennen tuntia"
                                    else "Reminder lead time before class",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onSurface,
                                )
                                Text(
                                    if (reminderLead == 0)
                                        (if (isFi) "Tunnin alkaessa" else "At class start")
                                    else (if (isFi) "$reminderLead min ennen" else "$reminderLead min before"),
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Text(
                                "$reminderLead min",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = Color(0xFFF59E0B),
                            )
                        }
                        Slider(
                            value = reminderLead.toFloat(),
                            onValueChange = { reminderLead = it.toInt() },
                            onValueChangeFinished = {
                                LessonReminderScheduler.setLeadMinutes(ctx, reminderLead)
                                scope.launch {
                                    val entries = withContext(Dispatchers.IO) { loadEntries(ctx) }
                                    if (entries.isNotEmpty()) {
                                        val activeJakso = runCatching { activeJaksoId(loadJaksot(ctx)) }.getOrNull()
                                        val filtered = if (activeJakso != null) {
                                            entries.filter {
                                                val ej = it.jaksoId.ifBlank { "all" }
                                                ej == "all" || ej == activeJakso
                                            }
                                        } else entries
                                        LessonReminderScheduler.schedule(ctx, filtered)
                                    }
                                }
                            },
                            valueRange = 0f..30f,
                            steps = 5, // 0, 5, 10, 15, 20, 25, 30
                            modifier = Modifier.padding(top = 4.dp),
                            colors = SliderDefaults.colors(
                                thumbColor = Color(0xFFF59E0B),
                                activeTrackColor = Color(0xFFF59E0B),
                            ),
                        )
                    }
                    RowDivider()
                    // Android 12 exact-alarm prompt (API 31-32 only — API 33+ uses USE_EXACT_ALARM which is auto-granted)
                    if (android.os.Build.VERSION.SDK_INT == android.os.Build.VERSION_CODES.S ||
                        android.os.Build.VERSION.SDK_INT == android.os.Build.VERSION_CODES.S_V2) {
                        val am = remember { ctx.getSystemService(android.app.AlarmManager::class.java) }
                        val canExact = remember { mutableStateOf(am?.canScheduleExactAlarms() ?: true) }
                        val lifecycleOwner2 = LocalLifecycleOwner.current
                        DisposableEffect(lifecycleOwner2) {
                            val obs = LifecycleEventObserver { _, event ->
                                if (event == Lifecycle.Event.ON_RESUME) canExact.value = am?.canScheduleExactAlarms() ?: true
                            }
                            lifecycleOwner2.lifecycle.addObserver(obs)
                            onDispose { lifecycleOwner2.lifecycle.removeObserver(obs) }
                        }
                        if (!canExact.value) {
                            ActionGroupRow(
                                icon = Icons.Outlined.Alarm,
                                iconTint = Color(0xFFF59E0B),
                                title = if (isFi) "Tarkat tunti-ilmoitukset" else "Exact lesson reminders",
                                subtitle = if (isFi) "Salli tarkat hälytykset ajoissa saapumiseen"
                                           else "Allow exact alarms for on-time reminders",
                                actionLabel = if (isFi) "Salli" else "Allow",
                                onAction = {
                                    try {
                                        ctx.startActivity(
                                            android.content.Intent(
                                                android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                                                android.net.Uri.fromParts("package", ctx.packageName, null),
                                            )
                                        )
                                    } catch (_: Exception) {}
                                },
                            )
                            RowDivider()
                        }
                    }
                    ActionGroupRow(
                        icon = Icons.Outlined.NotificationsActive,
                        iconTint = MaterialTheme.colorScheme.primary,
                        title = if (isFi) "Testaa ilmoitus" else "Send test notification",
                        subtitle = if (isFi) "Varmista että ilmoitukset toimivat"
                                   else "Verify notifications work",
                        actionLabel = if (isFi) "Lähetä" else "Send",
                        onAction = { sendTestNotification(ctx, isFi) },
                    )
                }
            }

            // ── KSYK Maps everywhere ──────────────────────────────
            item {
                SettingsGroup(title = if (isFi) "KSYK Maps muualla" else "KSYK Maps everywhere") {
                    LinkGroupRow(
                        icon = Icons.Outlined.Public,
                        iconTint = Color(0xFF06B6D4),
                        title = if (isFi) "Avaa verkkosivusto" else "Open website",
                        subtitle = "ksykmaps.fi",
                        onClick = {
                            try { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://ksykmaps.fi"))) } catch (_: Exception) {}
                        },
                    )
                    RowDivider()
                    LinkGroupRow(
                        icon = Icons.Outlined.Feedback,
                        iconTint = Color(0xFF8B5CF6),
                        title = if (isFi) "Anna palautetta" else "Give feedback",
                        subtitle = if (isFi) "Kerro mitä mieltä olet" else "Tell us what you think",
                        onClick = onOpenFeedback,
                    )
                    RowDivider()
                    LinkGroupRow(
                        icon = Icons.Outlined.BugReport,
                        iconTint = Color(0xFFEF4444),
                        title = if (isFi) "Ilmoita viasta" else "Report a bug",
                        subtitle = if (isFi) "Kuvaa ongelma sovelluksessa" else "Describe a problem in the app",
                        onClick = onOpenBugReport,
                    )
                }
            }

            // ── Storage ────────────────────────────────────────────
            item {
                SettingsGroup(title = if (isFi) "Tallennustila" else "Storage") {
                    ActionGroupRow(
                        icon = Icons.Outlined.CloudDone,
                        iconTint = Color(0xFF10B981),
                        title = if (isFi) "Välimuisti" else "Cached data",
                        subtitle = formatBytes(cacheBytes) +
                                   if (isFi) " · rakennukset, luokat, uutiset"
                                   else " · buildings, rooms, news",
                        actionLabel = when {
                            clearing -> if (isFi) "Tyhjennetään" else "Clearing"
                            else -> if (isFi) "Tyhjennä" else "Clear"
                        },
                        actionEnabled = !clearing && cacheBytes > 0L,
                        onAction = {
                            clearing = true
                            DiskCache.clear()
                            cacheBytes = 0L
                            clearing = false
                        },
                    )
                    RowDivider()
                    ActionGroupRow(
                        icon = Icons.Outlined.DeleteForever,
                        iconTint = MaterialTheme.colorScheme.error,
                        title = if (isFi) "Poista kaikki tiedot" else "Delete all local data",
                        subtitle = if (isFi) "Palauttaa sovelluksen alkutilaan"
                                   else "Resets the app to its initial state",
                        actionLabel = if (isFi) "Poista" else "Delete",
                        actionEnabled = true,
                        onAction = { showResetAllConfirm = true },
                    )
                }
            }

            // ── Diagnostics ────────────────────────────────────────
            item {
                val logEntries by fi.ksykmaps.data.AppLog.entriesState
                val errorCount = logEntries.count {
                    it.level == fi.ksykmaps.data.AppLog.Level.ERROR ||
                    it.level == fi.ksykmaps.data.AppLog.Level.WARN
                }
                SettingsGroup(title = if (isFi) "Diagnostiikka" else "Diagnostics") {
                    LinkGroupRow(
                        icon = Icons.Outlined.NewReleases,
                        iconTint = MaterialTheme.colorScheme.primary,
                        title = if (isFi) "Muutosloki" else "Changelog",
                        subtitle = if (isFi) "Mitä uutta versiossa ${BuildConfig.VERSION_NAME}"
                                   else "What's new in ${BuildConfig.VERSION_NAME}",
                        onClick = onOpenChangelog,
                    )
                    RowDivider()
                    LinkGroupRow(
                        icon = Icons.Outlined.BugReport,
                        iconTint = if (errorCount > 0) Color(0xFFEF4444)
                                   else MaterialTheme.colorScheme.primary,
                        title = if (isFi) "Sovelluslokit" else "App logs",
                        subtitle = when {
                            errorCount > 0 -> if (isFi) "$errorCount virhettä tai varoitusta" else "$errorCount errors or warnings"
                            logEntries.isEmpty() -> if (isFi) "Ei lokimerkintöjä vielä" else "No log entries yet"
                            else -> if (isFi) "${logEntries.size} tapahtumaa · kaikki ok" else "${logEntries.size} events · all ok"
                        },
                        onClick = onOpenLogs,
                    )
                    RowDivider()
                    // v1.82.0: production-ready — dev-facing FCM buttons
                    // (Rekisteröi push-token, Kopioi FCM-token) removed.
                    // Registration happens automatically on app start and
                    // retries with exponential backoff on network failure.
                    ActionGroupRow(
                        icon = Icons.Outlined.CleaningServices,
                        iconTint = MaterialTheme.colorScheme.onSurfaceVariant,
                        title = if (isFi) "Tyhjennä lokit" else "Clear logs",
                        subtitle = if (isFi) "Poistaa kaikki laitteen lokit" else "Remove all local log entries",
                        actionLabel = if (isFi) "Tyhjennä" else "Clear",
                        actionEnabled = logEntries.isNotEmpty(),
                        onAction = { fi.ksykmaps.data.AppLog.clear() },
                    )
                }
            }

            // ── Account ────────────────────────────────────────────
            item {
                SettingsGroup(title = if (isFi) "Tili" else "Account") {
                    val isAdmin = Session.adminState.value
                    if (Api.sessionEmail != null) {
                        LinkGroupRow(
                            icon = if (isAdmin) Icons.Outlined.AdminPanelSettings
                                   else Icons.Outlined.AccountCircle,
                            iconTint = if (isAdmin) Color(0xFF10B981)
                                       else MaterialTheme.colorScheme.primary,
                            title = Api.sessionEmail!!,
                            subtitle = if (isAdmin)
                                (if (isFi) "Kirjautunut ylläpitäjänä"
                                 else "Signed in as admin")
                            else
                                (if (isFi) "Kirjautunut sisään"
                                 else "Signed in"),
                            onClick = { },
                        )
                        if (isAdmin) {
                            RowDivider()
                            LinkGroupRow(
                                icon = Icons.Outlined.AdminPanelSettings,
                                iconTint = MaterialTheme.colorScheme.primary,
                                title = if (isFi) "Hallintapaneeli" else "Admin Panel",
                                subtitle = if (isFi) "Avaa ylläpitonäkymä"
                                           else "Open the admin dashboard",
                                onClick = onOpenAdmin,
                            )
                        }
                        RowDivider()
                        LinkGroupRow(
                            icon = Icons.AutoMirrored.Outlined.Logout,
                            iconTint = MaterialTheme.colorScheme.error,
                            title = if (isFi) "Kirjaudu ulos" else "Sign out",
                            subtitle = if (isFi) "Poistu tililtä tältä laitteelta"
                                       else "Remove account from this device",
                            onClick = onSignOut,
                        )
                    } else {
                        LinkGroupRow(
                            icon = Icons.AutoMirrored.Outlined.Login,
                            iconTint = MaterialTheme.colorScheme.primary,
                            title = if (isFi) "Kirjaudu sisään" else "Sign in",
                            subtitle = if (isFi) "Valinnainen — vain hallintapaneeliin"
                                       else "Optional — for admin features only",
                            onClick = onSignIn,
                        )
                    }
                }
            }

            // ── Crash report ───────────────────────────────────────
            item {
                val crashFile = remember { java.io.File(ctx.filesDir, "last_crash.txt") }
                var uploadState by remember { mutableStateOf<String?>(null) }
                var uploading by remember { mutableStateOf(false) }
                var visible by remember { mutableStateOf(crashFile.exists()) }
                if (visible) {
                    CrashCard(
                        isFi = isFi,
                        uploading = uploading,
                        uploadState = uploadState,
                        onSend = {
                            if (uploading) return@CrashCard
                            uploading = true
                            uploadState = null
                            val text = try { crashFile.readText() } catch (_: Throwable) { "" }
                            val device = "${Build.MANUFACTURER} ${Build.MODEL} (API ${Build.VERSION.SDK_INT})"
                            scope.launch {
                                val ok = try {
                                    withContext(Dispatchers.IO) {
                                        Api.post("/crash-reports", buildJsonObject {
                                            put("logBody", text)
                                            put("appVersion", BuildConfig.VERSION_NAME)
                                            put("deviceInfo", device)
                                            put("platform", "android")
                                        })
                                    }
                                    true
                                } catch (_: Exception) { false }
                                uploading = false
                                if (ok) {
                                    uploadState = if (isFi) "Lähetetty ylläpidolle" else "Sent to admin"
                                    try { crashFile.delete() } catch (_: Throwable) {}
                                    visible = false
                                } else {
                                    uploadState = if (isFi) "Lähetys epäonnistui" else "Upload failed"
                                }
                            }
                        },
                        onDelete = {
                            try { crashFile.delete() } catch (_: Throwable) {}
                            visible = false
                        },
                    )
                }
            }

            // ── About ──────────────────────────────────────────────
            item {
                SettingsGroup(title = if (isFi) "Tietoja" else "About") {
                    AboutRow(
                        eggsFound = eggsFound,
                        isFi = isFi,
                        onTap = {
                            eggTaps++
                            if (eggTaps >= 7) {
                                eggTaps = 0
                                if (eggsFound < TOTAL_EGGS) {
                                    eggsFound++
                                    prefs.edit().putInt(KEY_EGGS_FOUND, eggsFound).apply()
                                }
                                Analytics.trackEasterEgg("version_tap_7")
                                activeEgg = "version_tap"
                            }
                        },
                    )
                }
            }

            item { Spacer(Modifier.height(16.dp)) }
        }
    }

    if (showResetAllConfirm) {
        AlertDialog(
            onDismissRequest = { showResetAllConfirm = false },
            shape = RoundedCornerShape(20.dp),
            icon = {
                Icon(Icons.Outlined.DeleteForever, null, tint = MaterialTheme.colorScheme.error)
            },
            title = {
                Text(
                    if (isFi) "Poistetaanko kaikki tiedot?" else "Delete all local data?",
                    fontWeight = FontWeight.SemiBold,
                )
            },
            text = {
                Text(
                    if (isFi) "Tämä poistaa kaikki asetukset, välimuistin, lukujärjestyksen ja kirjautumistiedot. Toimintoa ei voi peruuttaa."
                    else "This removes all settings, cache, timetable entries, and account data. This cannot be undone.",
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showResetAllConfirm = false
                        listOf(
                            "ksyk_prefs", "ksyk_onboarding", "ksyk_server_map",
                            "ksyk_cam", "ksyk_widget", "ksyk_wilma", "ksyk_session",
                        ).forEach { name ->
                            ctx.getSharedPreferences(name, Context.MODE_PRIVATE)
                                .edit().clear().apply()
                        }
                        Session.clear(ctx)
                        DiskCache.clear()
                        runCatching {
                            ctx.filesDir.parentFile
                                ?.resolve("datastore/ksyk_schedule.preferences_pb")
                                ?.delete()
                        }
                        runCatching { java.io.File(ctx.filesDir, "last_crash.txt").delete() }
                        onResetAll()
                    },
                ) {
                    Text(
                        if (isFi) "Poista kaikki" else "Delete all",
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = { showResetAllConfirm = false }) {
                    Text(if (isFi) "Peruuta" else "Cancel")
                }
            },
        )
    }

    if (activeEgg != null) {
        AlertDialog(
            onDismissRequest = { activeEgg = null },
            shape = RoundedCornerShape(24.dp),
            title = { Text(if (isFi) "Salainen paikkio!" else "Secret unlocked!", fontWeight = FontWeight.SemiBold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        if (isFi) "Loysit Paalpoyto-tilan. Kehittajan viesti: Hei, olet loydat piilomoodin!"
                        else "You found the Developer Mode. Hi there, explorer — you found a hidden egg!",
                    )
                    Text(
                        if (isFi) "$eggsFound / $TOTAL_EGGS salaisuutta loydetty"
                        else "$eggsFound / $TOTAL_EGGS secrets found",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Medium,
                    )
                }
            },
            confirmButton = {
                TextButton(onClick = { activeEgg = null }) {
                    Text(if (isFi) "Siisti!" else "Nice!")
                }
            },
        )
    }

    if (editingName) {
        var nameDraft by remember { mutableStateOf(userName) }
        AlertDialog(
            onDismissRequest = { editingName = false },
            shape = RoundedCornerShape(24.dp),
            title = { Text(if (isFi) "Muuta nimi" else "Change name", fontWeight = FontWeight.SemiBold) },
            text = {
                OutlinedTextField(
                    value = nameDraft,
                    onValueChange = { nameDraft = it },
                    label = { Text(if (isFi) "Etunimesi" else "Your first name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = {
                        saveUserName(ctx, nameDraft)
                        userName = nameDraft.trim()
                        editingName = false
                    }),
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    saveUserName(ctx, nameDraft)
                    userName = nameDraft.trim()
                    editingName = false
                }) { Text(if (isFi) "Tallenna" else "Save") }
            },
            dismissButton = {
                TextButton(onClick = { editingName = false }) {
                    Text(if (isFi) "Peruuta" else "Cancel")
                }
            },
        )
    }
}

// ── Groups & rows ──────────────────────────────────────────────────

/** iOS-Settings-style grouped card: rounded corners, dividers inside. */
@Composable
private fun SettingsGroup(
    title: String? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column {
        if (title != null) {
            Text(
                title,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 4.dp, bottom = 8.dp),
            )
        }
        Card(
            Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainerLow
            ),
            elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        ) {
            Column(content = content)
        }
    }
}

@Composable
private fun RowDivider() {
    HorizontalDivider(
        modifier = Modifier.padding(start = 60.dp),
        color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.25f),
    )
}

@Composable
private fun ProfileHeader(
    userName: String,
    email: String?,
    isFi: Boolean,
    onEditName: () -> Unit,
) {
    Card(
        Modifier.fillMaxWidth().clickable { onEditName() },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.35f)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Row(
            Modifier.padding(20.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary),
                contentAlignment = Alignment.Center,
            ) {
                val initial = userName.trim().firstOrNull()?.uppercase()
                    ?: email?.trim()?.firstOrNull()?.uppercase()
                    ?: "?"
                Text(
                    initial,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
            }
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    if (userName.isNotBlank()) userName
                    else if (isFi) "Aseta nimesi" else "Set your name",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    email ?: if (isFi) "Napauta muokataksesi" else "Tap to edit",
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Icon(
                Icons.Outlined.ChevronRight, null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(20.dp),
            )
        }
    }
}

@Composable
private fun ThemeRow(themeMode: String, isFi: Boolean, onChange: (String) -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconBubble(icon = Icons.Outlined.Palette, tint = Color(0xFF8B5CF6))
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(
                if (isFi) "Väriteema" else "Colour theme",
                fontWeight = FontWeight.SemiBold,
                fontSize = 15.sp,
                color = MaterialTheme.colorScheme.onSurface,
            )
        }
        SegmentedThemePicker(
            selected = themeMode,
            isFi = isFi,
            onSelect = onChange,
        )
    }
}

@Composable
private fun SegmentedThemePicker(selected: String, isFi: Boolean, onSelect: (String) -> Unit) {
    val options = listOf(
        "system" to if (isFi) "Auto" else "Auto",
        "light"  to if (isFi) "Vaalea" else "Light",
        "dark"   to if (isFi) "Tumma" else "Dark",
    )
    Row(
        Modifier
            .clip(RoundedCornerShape(24.dp))
            .background(MaterialTheme.colorScheme.surfaceContainerHigh)
            .padding(3.dp),
        horizontalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        options.forEach { (mode, label) ->
            val isSelected = selected == mode
            Box(
                Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(
                        if (isSelected) MaterialTheme.colorScheme.surface
                        else Color.Transparent
                    )
                    .clickable { onSelect(mode) }
                    .padding(horizontal = 12.dp, vertical = 6.dp),
            ) {
                Text(
                    label,
                    fontSize = 12.sp,
                    fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Medium,
                    color = if (isSelected) MaterialTheme.colorScheme.onSurface
                            else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun LanguageRow(isFi: Boolean, onSelect: (String) -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconBubble(icon = Icons.Outlined.Language, tint = Color(0xFF003D82))
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(
                if (isFi) "Kieli" else "Language",
                fontWeight = FontWeight.SemiBold,
                fontSize = 15.sp,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                if (isFi) "Suomi" else "English",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Row(
            Modifier
                .clip(RoundedCornerShape(24.dp))
                .background(MaterialTheme.colorScheme.surfaceContainerHigh)
                .padding(3.dp),
            horizontalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            listOf("FI" to true, "EN" to false).forEach { (label, wantsFi) ->
                val isSelected = wantsFi == isFi
                Box(
                    Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(
                            if (isSelected) MaterialTheme.colorScheme.surface
                            else Color.Transparent
                        )
                        .clickable { onSelect(if (wantsFi) "fi" else "en") }
                        .padding(horizontal = 14.dp, vertical = 6.dp),
                ) {
                    Text(
                        label,
                        fontSize = 12.sp,
                        fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Medium,
                        color = if (isSelected) MaterialTheme.colorScheme.onSurface
                                else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

@Composable
private fun IconBubble(icon: ImageVector, tint: Color) {
    Box(
        Modifier
            .size(32.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(tint.copy(alpha = 0.15f)),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, null, tint = tint, modifier = Modifier.size(18.dp))
    }
}

@Composable
private fun ToggleGroupRow(
    icon: ImageVector,
    iconTint: Color,
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clickable { onCheckedChange(!checked) }
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconBubble(icon = icon, tint = iconTint)
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(
                title,
                fontWeight = FontWeight.SemiBold,
                fontSize = 15.sp,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                subtitle,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}

@Composable
private fun ActionGroupRow(
    icon: ImageVector,
    iconTint: Color,
    title: String,
    subtitle: String,
    actionLabel: String,
    actionEnabled: Boolean = true,
    onAction: () -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconBubble(icon = icon, tint = iconTint)
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(
                title,
                fontWeight = FontWeight.SemiBold,
                fontSize = 15.sp,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                subtitle,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        TextButton(onClick = onAction, enabled = actionEnabled) {
            Text(actionLabel, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
        }
    }
}

@Composable
private fun LinkGroupRow(
    icon: ImageVector,
    iconTint: Color,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconBubble(icon = icon, tint = iconTint)
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(
                title,
                fontWeight = FontWeight.SemiBold,
                fontSize = 15.sp,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                subtitle,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Icon(
            Icons.Outlined.ChevronRight, null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(20.dp),
        )
    }
}

@Composable
private fun CrashCard(
    isFi: Boolean,
    uploading: Boolean,
    uploadState: String?,
    onSend: () -> Unit,
    onDelete: () -> Unit,
) {
    Card(
        Modifier.fillMaxWidth().clickable(enabled = !uploading) { onSend() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
    ) {
        Row(
            Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconBubble(icon = Icons.Outlined.BugReport, tint = MaterialTheme.colorScheme.error)
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    if (isFi) "Sovellus kaatui viimeksi" else "The app crashed last time",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onErrorContainer,
                )
                Text(
                    uploadState ?: when {
                        uploading -> if (isFi) "Lähetetään ylläpidolle..." else "Sending to admin..."
                        else      -> if (isFi) "Napauta lähettääksesi ylläpidolle" else "Tap to send to admin"
                    },
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onErrorContainer.copy(alpha = 0.8f),
                )
            }
            if (uploading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(18.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onErrorContainer,
                )
            } else {
                TextButton(onClick = onDelete) {
                    Text(
                        if (isFi) "Poista" else "Delete",
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }
    }
}

@Composable
private fun AboutRow(eggsFound: Int, isFi: Boolean, onTap: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clickable { onTap() }
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconBubble(icon = Icons.Outlined.Info, tint = MaterialTheme.colorScheme.primary)
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(
                "KSYK Maps",
                fontWeight = FontWeight.SemiBold,
                fontSize = 15.sp,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                "v${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE}) · © 2026 Nordbyte Studio",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (eggsFound > 0) {
                Text(
                    if (isFi) "$eggsFound/$TOTAL_EGGS salaisuutta löydetty"
                    else "$eggsFound/$TOTAL_EGGS secrets found",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.7f),
                )
            }
        }
    }
}

internal fun sendTestNotification(ctx: android.content.Context, isFi: Boolean) {
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
        val granted = androidx.core.app.ActivityCompat.checkSelfPermission(
            ctx, android.Manifest.permission.POST_NOTIFICATIONS
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED
        if (!granted) return
    }
    val notif = androidx.core.app.NotificationCompat.Builder(ctx, fi.ksykmaps.KsykApp.CHANNEL_GENERAL)
        .setSmallIcon(android.R.drawable.ic_dialog_info)
        .setContentTitle(if (isFi) "Testi-ilmoitus" else "Test notification")
        .setContentText(
            if (isFi) "Ilmoitukset toimivat! Näet tunnit ja tiedotteet tästä eteenpäin."
            else "Notifications are working! You'll see lessons and announcements from now on."
        )
        .setPriority(androidx.core.app.NotificationCompat.PRIORITY_DEFAULT)
        .setAutoCancel(true)
        .build()
    androidx.core.app.NotificationManagerCompat.from(ctx).notify(9999, notif)
}

private fun formatBytes(bytes: Long): String {
    if (bytes < 1024) return "$bytes B"
    val kb = bytes / 1024.0
    if (kb < 1024) return "%.1f KB".format(kb)
    val mb = kb / 1024.0
    return "%.1f MB".format(mb)
}
