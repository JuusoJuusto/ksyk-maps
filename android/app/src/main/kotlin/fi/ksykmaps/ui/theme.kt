package fi.ksykmaps.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val KsykBlue     = Color(0xFF2563EB)
private val KsykBlueDark = Color(0xFF1D4ED8)

private val LightColors = lightColorScheme(
    primary             = KsykBlue,
    onPrimary           = Color.White,
    primaryContainer    = Color(0xFFDBEAFE),
    onPrimaryContainer  = Color(0xFF1E3A8A),
    secondary           = KsykBlueDark,
    onSecondary         = Color.White,
    tertiary            = Color(0xFF0F172A),
    onTertiary          = Color.White,
    background          = Color(0xFFF5F7FB),
    onBackground        = Color(0xFF0F172A),
    surface             = Color.White,
    onSurface           = Color(0xFF0F172A),
    surfaceVariant      = Color(0xFFEEF2F8),
    onSurfaceVariant    = Color(0xFF475569),
    error               = Color(0xFFDC2626),
    onError             = Color.White,
    errorContainer      = Color(0xFFFEE2E2),
    onErrorContainer    = Color(0xFF7F1D1D),
    outline             = Color(0xFFCBD5E1),
    outlineVariant      = Color(0xFFE2E8F0),
)

private val DarkColors = darkColorScheme(
    primary             = Color(0xFF60A5FA),   // blue-400
    onPrimary           = Color(0xFF1E3A8A),
    primaryContainer    = Color(0xFF1D4ED8),
    onPrimaryContainer  = Color(0xFFDBEAFE),
    secondary           = Color(0xFF93C5FD),   // blue-300
    onSecondary         = Color(0xFF1E3A8A),
    tertiary            = Color(0xFFCBD5E1),
    onTertiary          = Color(0xFF0F172A),
    background          = Color(0xFF0F172A),   // slate-900
    onBackground        = Color(0xFFF1F5F9),
    surface             = Color(0xFF1E293B),   // slate-800
    onSurface           = Color(0xFFF1F5F9),
    surfaceVariant      = Color(0xFF334155),   // slate-700
    onSurfaceVariant    = Color(0xFF94A3B8),
    error               = Color(0xFFF87171),
    onError             = Color(0xFF7F1D1D),
    errorContainer      = Color(0xFF991B1B),
    onErrorContainer    = Color(0xFFFEE2E2),
    outline             = Color(0xFF475569),
    outlineVariant      = Color(0xFF334155),
)

/**
 * KSYK Maps theme with full dark-mode support.
 *
 * On Android 12+ (S) and when the user hasn't overridden the colour, we
 * use Material You dynamic colours that pull from the wallpaper palette.
 * On older devices or when dynamic colours are disabled we fall back to
 * the KSYK blue brand palette in the appropriate light/dark variant.
 *
 * [dynamicColor] is exposed so callers can toggle Material You from
 * Settings (the SettingsScreen "Dynamic colour" switch).
 */
@Composable
fun KsykTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit,
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val ctx = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(ctx) else dynamicLightColorScheme(ctx)
        }
        darkTheme -> DarkColors
        else      -> LightColors
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window
            if (window != null) {
                WindowCompat.getInsetsController(window, view)
                    .isAppearanceLightStatusBars = !darkTheme
            }
        }
    }

    MaterialTheme(colorScheme = colorScheme, content = content)
}
