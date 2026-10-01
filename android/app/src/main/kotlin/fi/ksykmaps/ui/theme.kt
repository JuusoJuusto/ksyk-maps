package fi.ksykmaps.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat

/* ─────────────────────────────────────────────────────────────────────
 * KSYK Maps — Wilma visual pass (v4.7.57).
 *
 * The Compose theme now matches the web's Wilma design layer:
 *   - navy #003d82 (not iOS blue) as the sole brand accent
 *   - hairline #d5dae0 outlines over Material-elevation surfaces
 *   - compact 6/8 dp corner radius (not Material's 12/16/28)
 *   - uppercase 10sp labels, 14-16sp body, 20-26sp titles with -0.015 em
 *   - no dynamic-color scheme — the whole point is brand consistency
 *     with the web, so we ignore wallpaper tint
 *
 * The previous iOS-blue Material-You theme is preserved in git history
 * (tag `rollback-before-4-7-56` → `android/.../theme.kt@v4.7.38`).
 * ───────────────────────────────────────────────────────────────────── */

// Light palette — Wilma navy brand.
private val WilmaNavy      = Color(0xFF003D82)
private val WilmaNavyDark  = Color(0xFF002D5F)
private val WilmaNavyTint  = Color(0xFFE6ECF3)
private val WilmaInk       = Color(0xFF1A1A1A)
private val WilmaBody      = Color(0xFF333333)
private val WilmaMuted     = Color(0xFF6B7280)
private val WilmaHair      = Color(0xFFD5DAE0)
private val WilmaHairStrong = Color(0xFFB7BDC6)
private val WilmaSurface   = Color.White
private val WilmaSurfaceAlt = Color(0xFFF5F6F8)
private val WilmaDanger    = Color(0xFFB91C1C)

private val LightColors = lightColorScheme(
    primary             = WilmaNavy,
    onPrimary           = Color.White,
    primaryContainer    = WilmaNavyTint,
    onPrimaryContainer  = WilmaNavy,
    secondary           = WilmaNavyDark,
    onSecondary         = Color.White,
    secondaryContainer  = WilmaNavyTint,
    onSecondaryContainer = WilmaNavyDark,
    tertiary            = WilmaInk,
    onTertiary          = Color.White,
    background          = WilmaSurfaceAlt,
    onBackground        = WilmaInk,
    surface             = WilmaSurface,
    onSurface           = WilmaInk,
    surfaceVariant      = WilmaSurfaceAlt,
    onSurfaceVariant    = WilmaMuted,
    error               = WilmaDanger,
    onError             = Color.White,
    errorContainer      = Color(0xFFFEE2E2),
    onErrorContainer    = Color(0xFF7F1D1D),
    outline             = WilmaHairStrong,
    outlineVariant      = WilmaHair,
)

// Dark palette — same aesthetic, inverted luminance.
private val WilmaNavyDarkMode     = Color(0xFF4A90D9)
private val WilmaNavyDarkModeHover = Color(0xFF6BA6E2)
private val WilmaInkDarkMode      = Color(0xFFF3F4F6)
private val WilmaBodyDarkMode     = Color(0xFFE5E7EB)
private val WilmaMutedDarkMode    = Color(0xFF9CA3AF)
private val WilmaHairDarkMode     = Color(0xFF2A3040)
private val WilmaHairStrongDarkMode = Color(0xFF3A4152)
private val WilmaSurfaceDarkMode  = Color(0xFF12161F)
private val WilmaSurfaceAltDarkMode = Color(0xFF1A1F2A)

private val DarkColors = darkColorScheme(
    primary             = WilmaNavyDarkMode,
    onPrimary           = Color(0xFF001F42),
    primaryContainer    = Color(0xFF003D82),
    onPrimaryContainer  = WilmaNavyTint,
    secondary           = WilmaNavyDarkModeHover,
    onSecondary         = Color(0xFF001F42),
    tertiary            = WilmaInkDarkMode,
    onTertiary          = Color(0xFF0F172A),
    background          = Color(0xFF0D1017),
    onBackground        = WilmaInkDarkMode,
    surface             = WilmaSurfaceDarkMode,
    onSurface           = WilmaBodyDarkMode,
    surfaceVariant      = WilmaSurfaceAltDarkMode,
    onSurfaceVariant    = WilmaMutedDarkMode,
    error               = Color(0xFFF87171),
    onError             = Color(0xFF7F1D1D),
    errorContainer      = Color(0xFF991B1B),
    onErrorContainer    = Color(0xFFFEE2E2),
    outline             = WilmaHairStrongDarkMode,
    outlineVariant      = WilmaHairDarkMode,
)

// Wilma shape scale — tighter than Material defaults (12/16/28 → 4/6/10).
private val WilmaShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),
    small      = RoundedCornerShape(6.dp),
    medium     = RoundedCornerShape(8.dp),
    large      = RoundedCornerShape(10.dp),
    extraLarge = RoundedCornerShape(12.dp),
)

// Wilma typography — Inter-like, tight tracking, compact scale.
private val WilmaTypography = Typography(
    displayLarge   = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Bold,     fontSize = 32.sp, lineHeight = 36.sp, letterSpacing = (-0.5).sp),
    displayMedium  = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Bold,     fontSize = 28.sp, lineHeight = 32.sp, letterSpacing = (-0.4).sp),
    displaySmall   = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Bold,     fontSize = 24.sp, lineHeight = 28.sp, letterSpacing = (-0.3).sp),
    headlineLarge  = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Bold,     fontSize = 22.sp, lineHeight = 26.sp, letterSpacing = (-0.3).sp),
    headlineMedium = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Bold,     fontSize = 20.sp, lineHeight = 24.sp, letterSpacing = (-0.2).sp),
    headlineSmall  = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Bold,     fontSize = 17.sp, lineHeight = 22.sp, letterSpacing = (-0.2).sp),
    titleLarge     = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Bold,     fontSize = 16.sp, lineHeight = 22.sp, letterSpacing = (-0.1).sp),
    titleMedium    = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, lineHeight = 20.sp, letterSpacing = (-0.1).sp),
    titleSmall     = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, lineHeight = 18.sp, letterSpacing =   0.0 .sp),
    bodyLarge      = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Normal,   fontSize = 15.sp, lineHeight = 22.sp),
    bodyMedium     = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Normal,   fontSize = 14.sp, lineHeight = 20.sp),
    bodySmall      = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Normal,   fontSize = 12.sp, lineHeight = 16.sp),
    labelLarge     = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Bold,     fontSize = 13.sp, lineHeight = 16.sp, letterSpacing = 0.1.sp),
    labelMedium    = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Bold,     fontSize = 11.sp, lineHeight = 14.sp, letterSpacing = 0.6.sp),
    // labelSmall is the uppercase 10sp Wilma masthead label.  Pair with
    // text-transform: uppercase at the call site.
    labelSmall     = TextStyle(fontFamily = FontFamily.Default, fontWeight = FontWeight.Bold,     fontSize = 10.sp, lineHeight = 12.sp, letterSpacing = 0.8.sp),
)

/**
 * KSYK Maps theme — Wilma visual language.
 *
 * [dynamicColor] is kept for API compatibility with the previous theme
 * but is now a no-op: Wilma's whole point is a consistent brand palette
 * across every surface, so we ignore wallpaper tint.
 */
@Composable
fun KsykTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    @Suppress("UNUSED_PARAMETER") dynamicColor: Boolean = false,
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColors else LightColors

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

    MaterialTheme(
        colorScheme = colorScheme,
        shapes      = WilmaShapes,
        typography  = WilmaTypography,
        content     = content,
    )
}
