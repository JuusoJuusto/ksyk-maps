package fi.ksykmaps.ui

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

private val BlueDark   = Color(0xFF1E3A8A)
private val BlueMain   = Color(0xFF2563EB)
private val BlueLight  = Color(0xFF3B82F6)

@Composable
fun LoadingScreen(onFinished: () -> Unit) {
    var phase by remember { mutableIntStateOf(0) } // 0=in, 1=hold, 2=out

    // Logo pulse animation
    val logoScale by animateFloatAsState(
        targetValue = when (phase) { 0 -> 1f; else -> 1.08f },
        animationSpec = spring(dampingRatio = 0.5f, stiffness = 180f),
        label = "logo-scale",
    )

    // Fade-out the whole screen
    val screenAlpha by animateFloatAsState(
        targetValue = if (phase == 2) 0f else 1f,
        animationSpec = tween(durationMillis = 400, easing = FastOutSlowInEasing),
        label = "screen-alpha",
        finishedListener = { if (phase == 2) onFinished() },
    )

    LaunchedEffect(Unit) {
        delay(300)
        phase = 1          // logo bounce
        delay(1000)
        phase = 2          // fade out
    }

    if (screenAlpha <= 0.001f) return

    Box(
        Modifier
            .fillMaxSize()
            .graphicsLayer { alpha = screenAlpha }
            .background(
                Brush.radialGradient(
                    listOf(BlueLight, BlueMain, BlueDark),
                    radius = 1400f,
                )
            ),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(0.dp),
            modifier = Modifier.scale(logoScale),
        ) {
            // Logo circle
            Box(
                Modifier
                    .size(110.dp)
                    .scale(logoScale)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Outlined.Map,
                    contentDescription = null,
                    modifier = Modifier.size(60.dp),
                    tint = Color.White,
                )
            }

            Spacer(Modifier.height(28.dp))

            Text(
                "KSYK Maps",
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                letterSpacing = 0.5.sp,
            )

            Spacer(Modifier.height(6.dp))

            Text(
                "Campus navigation",
                fontSize = 14.sp,
                color = Color.White.copy(alpha = 0.7f),
                textAlign = TextAlign.Center,
            )

            Spacer(Modifier.height(40.dp))

            LoadingDots()
        }
    }
}

@Composable
private fun LoadingDots() {
    val infiniteTransition = rememberInfiniteTransition(label = "dots")

    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        repeat(3) { i ->
            val offsetY by infiniteTransition.animateFloat(
                initialValue = 0f,
                targetValue = -8f,
                animationSpec = infiniteRepeatable(
                    animation = tween(400, easing = FastOutSlowInEasing),
                    repeatMode = RepeatMode.Reverse,
                    initialStartOffset = StartOffset(i * 120),
                ),
                label = "dot-$i",
            )
            Box(
                Modifier
                    .size(7.dp)
                    .offset(y = offsetY.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.8f))
            )
        }
    }
}
