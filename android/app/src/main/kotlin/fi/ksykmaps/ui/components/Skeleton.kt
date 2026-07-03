package fi.ksykmaps.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Shimmer loading placeholders — used instead of a spinner while lists
 * load. Runs a horizontal linear-gradient sweep at ~1.4 s to fake the
 * classic "content is coming" feel.
 */
@Composable
fun ShimmerBrush(): Brush {
    val transition = rememberInfiniteTransition(label = "shimmer")
    val shift by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(1400, easing = LinearEasing),
        ),
        label = "shimmer-shift",
    )
    val surface = MaterialTheme.colorScheme.surfaceVariant
    val highlight = MaterialTheme.colorScheme.surface
    return Brush.linearGradient(
        colors = listOf(surface, highlight, surface),
        start = Offset(shift - 400f, 0f),
        end = Offset(shift, 0f),
    )
}

@Composable
fun SkeletonBox(
    width: Dp,
    height: Dp,
    modifier: Modifier = Modifier,
    rounded: Dp = 8.dp,
) {
    Box(
        modifier
            .size(width, height)
            .clip(RoundedCornerShape(rounded))
            .background(ShimmerBrush())
    )
}

@Composable
fun SkeletonLine(
    heightDp: Dp = 12.dp,
    fraction: Float = 1f,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier
            .fillMaxWidth(fraction)
            .height(heightDp)
            .clip(RoundedCornerShape(6.dp))
            .background(ShimmerBrush())
    )
}

@Composable
fun SkeletonRoomCard(modifier: Modifier = Modifier) {
    Row(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            Modifier
                .size(46.dp)
                .clip(CircleShape)
                .background(ShimmerBrush())
        )
        Column(
            Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            SkeletonLine(fraction = 0.4f)
            SkeletonLine(fraction = 0.7f, heightDp = 10.dp)
        }
    }
}

