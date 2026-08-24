package fi.ksykmaps.ui

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

private val SplashBlue = Color(0xFF2563EB)

@Composable
fun LoadingScreen(onFinished: () -> Unit) {
    var progress by remember { mutableStateOf(0f) }
    val animatedProgress by animateFloatAsState(
        targetValue = progress,
        animationSpec = tween(durationMillis = 300),
        label = "progress",
    )

    val screenAlpha by animateFloatAsState(
        targetValue = if (progress >= 1f) 0f else 1f,
        animationSpec = tween(durationMillis = 350, easing = FastOutSlowInEasing),
        label = "fade",
        finishedListener = { if (progress >= 1f) onFinished() },
    )

    val ringRotation by rememberInfiniteTransition(label = "ring").animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 950, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "spin",
    )

    LaunchedEffect(Unit) {
        val stages = listOf(0.20f, 0.45f, 0.65f, 0.82f, 0.95f, 1.0f)
        val pauses  = listOf(150L, 200L, 250L, 200L, 200L, 100L)
        for ((target, ms) in stages.zip(pauses)) {
            delay(ms)
            progress = target
        }
    }

    if (screenAlpha <= 0.001f) return

    Box(
        Modifier
            .fillMaxSize()
            .graphicsLayer { alpha = screenAlpha }
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(0.dp),
        ) {
            // Spinning ring + logo — matches the website SplashScreen SVG ring style
            Box(
                Modifier.size(80.dp),
                contentAlignment = Alignment.Center,
            ) {
                Canvas(Modifier.fillMaxSize()) {
                    val sw   = 3.dp.toPx()
                    val inset = sw / 2f
                    val arcSize = Size(size.width - sw, size.height - sw)
                    val topLeft  = Offset(inset, inset)
                    // Grey background track
                    drawArc(
                        color = Color(0xFFE5E7EB),
                        startAngle = 0f, sweepAngle = 360f, useCenter = false,
                        topLeft = topLeft, size = arcSize,
                        style = Stroke(sw, cap = StrokeCap.Round),
                    )
                    // Blue spinning arc (~230° dasharray, same proportion as website)
                    drawArc(
                        color = SplashBlue,
                        startAngle = ringRotation - 90f,
                        sweepAngle = 230f,
                        useCenter = false,
                        topLeft = topLeft, size = arcSize,
                        style = Stroke(sw, cap = StrokeCap.Round),
                    )
                }
                Box(
                    Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(SplashBlue.copy(alpha = 0.09f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Outlined.Map,
                        contentDescription = null,
                        modifier = Modifier.size(24.dp),
                        tint = SplashBlue,
                    )
                }
            }

            Spacer(Modifier.height(20.dp))

            Text(
                "KSYK Maps",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground,
                letterSpacing = (-0.2).sp,
            )
            Spacer(Modifier.height(3.dp))
            Text(
                "Campus navigation",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )

            Spacer(Modifier.height(28.dp))

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.width(200.dp),
            ) {
                LinearProgressIndicator(
                    progress = { animatedProgress },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(3.dp)
                        .clip(RoundedCornerShape(2.dp)),
                    color = SplashBlue,
                    trackColor = Color(0xFFE5E7EB),
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    "${(animatedProgress * 100).toInt()}%",
                    fontSize = 10.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.55f),
                )
            }
        }
    }
}
