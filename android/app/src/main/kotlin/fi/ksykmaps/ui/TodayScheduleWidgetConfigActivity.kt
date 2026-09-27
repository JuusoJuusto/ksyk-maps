package fi.ksykmaps.ui

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Widgets
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import fi.ksykmaps.ui.theme.KsykTheme

/**
 * v1.79.0 — configure activity for TodaySchedule widget.
 *
 * Launched by Android automatically when the user drops the widget onto
 * their home screen (via `android:configure` attribute in the
 * appwidget-provider XML). Users can:
 *   - Toggle "Hide past classes" (default: show them dimmed)
 *   - Toggle "Auto-roll to next day when today ends" (default: on)
 *   - Toggle "Show week/day chip in header" (default: on)
 *
 * Preferences are stored per-widget-id in SharedPreferences so multiple
 * TodaySchedule widgets can have independent configuration.
 */
class TodayScheduleWidgetConfigActivity : ComponentActivity() {

    companion object {
        private const val PREFS = "ksyk_widget_config"
        private fun keyPrefix(id: Int) = "widget_${id}_"

        fun hidePast(ctx: Context, id: Int): Boolean =
            ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getBoolean("${keyPrefix(id)}hide_past", false)

        fun autoRoll(ctx: Context, id: Int): Boolean =
            ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getBoolean("${keyPrefix(id)}auto_roll", true)

        fun showChip(ctx: Context, id: Int): Boolean =
            ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getBoolean("${keyPrefix(id)}show_chip", true)

        /** v1.88.0 — per-widget "default day" preference. 0 = today (auto-roll
         *  can still push forward). Set to e.g. 1 to always land on tomorrow
         *  the first time the widget opens each session. Only applied when
         *  the offset hasn't been manually adjusted via the arrows. */
        fun defaultDayOffset(ctx: Context, id: Int): Int =
            ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getInt("${keyPrefix(id)}default_offset", 0)

        private fun set(ctx: Context, id: Int, key: String, value: Boolean) {
            ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putBoolean("${keyPrefix(id)}$key", value).apply()
        }
    }

    private var widgetId: Int = AppWidgetManager.INVALID_APPWIDGET_ID

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        widgetId = intent?.extras?.getInt(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID,
        ) ?: AppWidgetManager.INVALID_APPWIDGET_ID

        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()
            return
        }

        // Default the result to CANCELED so if the user backs out without
        // saving, Android removes the widget rather than adding a broken one.
        setResult(Activity.RESULT_CANCELED)

        setContent {
            KsykTheme(darkTheme = true, dynamicColor = false) {
                ConfigScreen(widgetId) {
                    // Trigger an immediate widget update so the config
                    // takes effect without waiting for the 30-minute poll.
                    val mgr = AppWidgetManager.getInstance(this)
                    TodayScheduleWidget.updateAllWidgets(this)
                    val result = Intent().apply {
                        putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
                    }
                    setResult(Activity.RESULT_OK, result)
                    finish()
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ConfigScreen(widgetId: Int, onSave: () -> Unit) {
    val ctx = LocalContext.current
    LanguageState.init(ctx)
    val isFi = (LanguageState.current ?: "fi") == "fi"

    var hidePast by remember { mutableStateOf(TodayScheduleWidgetConfigActivity.hidePast(ctx, widgetId)) }
    var autoRoll by remember { mutableStateOf(TodayScheduleWidgetConfigActivity.autoRoll(ctx, widgetId)) }
    var showChip by remember { mutableStateOf(TodayScheduleWidgetConfigActivity.showChip(ctx, widgetId)) }
    var defaultOffset by remember { mutableStateOf(TodayScheduleWidgetConfigActivity.defaultDayOffset(ctx, widgetId)) }

    fun save(key: String, value: Boolean) {
        val prefs = ctx.getSharedPreferences("ksyk_widget_config", Context.MODE_PRIVATE)
        prefs.edit().putBoolean("widget_${widgetId}_$key", value).apply()
    }
    fun saveInt(key: String, value: Int) {
        val prefs = ctx.getSharedPreferences("ksyk_widget_config", Context.MODE_PRIVATE)
        prefs.edit().putInt("widget_${widgetId}_$key", value).apply()
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.surface,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            if (isFi) "Widget-asetukset" else "Widget settings",
                            fontWeight = FontWeight.SemiBold,
                        )
                        Text(
                            if (isFi) "Päivän lukujärjestys" else "Today's schedule",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
            )
        },
        bottomBar = {
            Surface(shadowElevation = 8.dp) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Button(
                        onClick = onSave,
                        modifier = Modifier.weight(1f).height(56.dp),
                        shape = RoundedCornerShape(14.dp),
                    ) {
                        Icon(Icons.Outlined.CheckCircle, null, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(
                            if (isFi) "Tallenna ja lisää widget" else "Save and add widget",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 15.sp,
                        )
                    }
                }
            }
        },
    ) { pad ->
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(pad)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // Header with live mini-preview
            Box(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .background(MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.55f)),
            ) {
                Column(Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            Modifier
                                .size(44.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                Icons.Outlined.Widgets,
                                null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(26.dp),
                            )
                        }
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text(
                                if (isFi) "Räätälöi widget" else "Customize your widget",
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 16.sp,
                                color = MaterialTheme.colorScheme.onSurface,
                            )
                            Text(
                                if (isFi) "Muutokset astuvat voimaan heti"
                                else "Changes apply immediately",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                    Spacer(Modifier.height(14.dp))
                    // Mini widget preview — reacts to hidePast toggle
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = Color(0xFF18284F),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(Modifier.padding(horizontal = 14.dp, vertical = 12.dp)) {
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text(
                                    if (isFi) "TÄNÄÄN" else "TODAY",
                                    fontSize = 9.sp,
                                    color = Color(0x88FFFFFF),
                                    fontWeight = FontWeight.Medium,
                                )
                                Text("MA · 15", fontSize = 9.sp, color = Color(0x55FFFFFF))
                            }
                            Spacer(Modifier.height(8.dp))
                            PreviewRow("08:15", if (isFi) "Matematiikka" else "Mathematics", "A1.4", dimmed = hidePast)
                            Spacer(Modifier.height(4.dp))
                            PreviewRow("10:00", if (isFi) "Fysiikka" else "Physics", "B2.1")
                            Spacer(Modifier.height(4.dp))
                            PreviewRow("13:00", if (isFi) "Historia" else "History", "A0.3")
                        }
                    }
                }
            }

            SectionLabel(if (isFi) "NÄYTTÖ" else "DISPLAY")
            ConfigRow(
                title = if (isFi) "Piilota menneet tunnit" else "Hide past classes",
                subtitle = if (isFi) "Oletus: näytä menneet himmennettyinä ✓"
                           else "Default: show past classes dimmed with ✓",
                checked = hidePast,
                onChange = { hidePast = it; save("hide_past", it) },
            )
            ConfigRow(
                title = if (isFi) "Rullaa seuraavaan päivään automaattisesti" else "Auto-roll to next day",
                subtitle = if (isFi) "Kun tämän päivän tunnit ovat päättyneet, näytä huomisen aikataulu"
                           else "When today's classes end, show tomorrow's schedule",
                checked = autoRoll,
                onChange = { autoRoll = it; save("auto_roll", it) },
            )
            ConfigRow(
                title = if (isFi) "Näytä päivämerkki (TÄNÄÄN / HUOMENNA)" else "Show day chip (TODAY / TOMORROW)",
                subtitle = if (isFi) "Kertoo mitä päivää selaat"
                           else "Tells you which day you are browsing",
                checked = showChip,
                onChange = { showChip = it; save("show_chip", it) },
            )

            SectionLabel(if (isFi) "NAVIGOINTI" else "NAVIGATION")
            // v1.88.0 — default day picker. Segmented row (Yesterday / Today
            // / Tomorrow / +2d / +3d) so users can pin the widget to a day
            // that suits their workflow (e.g. always show tomorrow in the
            // evening after school).
            DefaultDayRow(
                isFi = isFi,
                value = defaultOffset,
                onChange = { defaultOffset = it; saveInt("default_offset", it) },
            )
        }
    }
}

@Composable
private fun DefaultDayRow(isFi: Boolean, value: Int, onChange: (Int) -> Unit) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(
                if (isFi) "Oletuspäivä" else "Default day",
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Spacer(Modifier.height(2.dp))
            Text(
                if (isFi) "Mille päivälle widget avautuu kun avaat sen ensimmäistä kertaa"
                else "Which day the widget opens on when first shown",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(12.dp))
            val options = listOf(
                -1 to (if (isFi) "Eilen" else "Yesterday"),
                0  to (if (isFi) "Tänään" else "Today"),
                1  to (if (isFi) "Huomenna" else "Tomorrow"),
                2  to "+2d",
                3  to "+3d",
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                options.forEach { (offset, label) ->
                    val selected = offset == value
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = if (selected)
                            MaterialTheme.colorScheme.primary
                        else
                            MaterialTheme.colorScheme.surface,
                        modifier = Modifier.weight(1f),
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(40.dp)
                                .clickable { onChange(offset) },
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                label,
                                fontSize = 12.sp,
                                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                                color = if (selected)
                                    MaterialTheme.colorScheme.onPrimary
                                else
                                    MaterialTheme.colorScheme.onSurface,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PreviewRow(time: String, subject: String, room: String, dimmed: Boolean = false) {
    val alpha = if (dimmed) 0.3f else 1f
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(time, fontSize = 10.sp, color = Color(0x88FFFFFF).copy(alpha = alpha), modifier = Modifier.width(40.dp))
        Text(subject, fontSize = 12.sp, color = Color.White.copy(alpha = alpha), fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
        Text(room, fontSize = 10.sp, color = Color(0x55FFFFFF).copy(alpha = alpha))
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text,
        fontSize = 11.sp,
        fontWeight = FontWeight.SemiBold,
        color = MaterialTheme.colorScheme.primary,
        letterSpacing = 0.08.sp,
        modifier = Modifier.padding(start = 4.dp, top = 2.dp),
    )
}

@Composable
private fun ConfigRow(
    title: String,
    subtitle: String,
    checked: Boolean,
    onChange: (Boolean) -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    title,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    subtitle,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Switch(
                checked = checked,
                onCheckedChange = onChange,
            )
        }
    }
}
