package fi.ksykmaps.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val ksykBlue = Color(0xFF2563EB)
private val ksykBlueDark = Color(0xFF1D4ED8)

private val lightColors = lightColorScheme(
    primary = ksykBlue,
    onPrimary = Color.White,
    secondary = ksykBlueDark,
    background = Color(0xFFF5F7FB),
    surface = Color.White,
)

private val darkColors = darkColorScheme(
    primary = ksykBlue,
    onPrimary = Color.White,
    secondary = ksykBlueDark,
    background = Color(0xFF0B1320),
    surface = Color(0xFF111B2E),
)

@Composable
fun KsykTheme(content: @Composable () -> Unit) {
    val colors = if (isSystemInDarkTheme()) darkColors else lightColors
    MaterialTheme(colorScheme = colors, content = content)
}
