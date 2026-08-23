package fi.ksykmaps.admin.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkScheme = darkColorScheme(
    primary          = Color(0xFF60A5FA),
    onPrimary        = Color(0xFF0F172A),
    primaryContainer = Color(0xFF1E3A5F),
    onPrimaryContainer = Color(0xFFBFDBFE),
    secondary        = Color(0xFF34D399),
    onSecondary      = Color(0xFF0F172A),
    tertiary         = Color(0xFFFBBF24),
    onTertiary       = Color(0xFF0F172A),
    background       = Color(0xFF0F172A),
    onBackground     = Color(0xFFE2E8F0),
    surface          = Color(0xFF1E293B),
    onSurface        = Color(0xFFE2E8F0),
    surfaceVariant   = Color(0xFF334155),
    onSurfaceVariant = Color(0xFF94A3B8),
    error            = Color(0xFFF87171),
    onError          = Color(0xFF0F172A),
    errorContainer   = Color(0xFF7F1D1D),
    onErrorContainer = Color(0xFFFCA5A5),
)

private val LightScheme = lightColorScheme(
    primary          = Color(0xFF2563EB),
    onPrimary        = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFFDBEAFE),
    onPrimaryContainer = Color(0xFF1E3A5F),
    secondary        = Color(0xFF059669),
    onSecondary      = Color(0xFFFFFFFF),
    tertiary         = Color(0xFFD97706),
    onTertiary       = Color(0xFFFFFFFF),
    background       = Color(0xFFF8FAFC),
    onBackground     = Color(0xFF0F172A),
    surface          = Color(0xFFFFFFFF),
    onSurface        = Color(0xFF0F172A),
    surfaceVariant   = Color(0xFFF1F5F9),
    onSurfaceVariant = Color(0xFF64748B),
    error            = Color(0xFFDC2626),
    onError          = Color(0xFFFFFFFF),
    errorContainer   = Color(0xFFFEE2E2),
    onErrorContainer = Color(0xFF991B1B),
)

@Composable
fun AdminTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkScheme else LightScheme,
        typography = Typography(),
        content = content,
    )
}
