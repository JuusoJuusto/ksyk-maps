package fi.ksykmaps.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGesturesAfterLongPress
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.DragHandle
import androidx.compose.material.icons.outlined.RestartAlt
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.roundToInt

/**
 * v1.89.0 — home dashboard customization. Long-press a row to grab
 * it, drag up/down to reorder. Toggle the switch to hide a section.
 * Reset button restores the shipped defaults.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeSectionsScreen(onBack: () -> Unit) {
    val ctx = LocalContext.current
    val isFi = (LanguageState.current ?: "fi") == "fi"
    var layout by remember { mutableStateOf(HomeSectionPrefs.load(ctx)) }

    fun persist(next: HomeLayout) {
        layout = next
        HomeSectionPrefs.save(ctx, next)
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.surface,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        if (isFi) "Muokkaa etusivua" else "Customize home",
                        fontWeight = FontWeight.SemiBold,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Outlined.ArrowBack, null)
                    }
                },
                actions = {
                    TextButton(onClick = { persist(HomeLayout.DEFAULT) }) {
                        Icon(Icons.Outlined.RestartAlt, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(if (isFi) "Palauta" else "Reset")
                    }
                },
            )
        },
    ) { pad ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(pad)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            // Header explainer
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.35f),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(Modifier.padding(14.dp)) {
                    Text(
                        if (isFi) "Vedä järjestääksesi" else "Drag to reorder",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        if (isFi)
                            "Paina pitkään kortin oikeaa reunaa ja vedä ylös / alas. Vaihda kytkin piilottaaksesi osion."
                        else
                            "Long-press the drag handle on the right and drag up / down. Toggle the switch to hide a section.",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            ReorderableSectionList(
                layout = layout,
                onLayoutChange = ::persist,
                isFi = isFi,
            )
        }
    }
}

@Composable
private fun ReorderableSectionList(
    layout: HomeLayout,
    onLayoutChange: (HomeLayout) -> Unit,
    isFi: Boolean,
) {
    // Track pixel Y-positions of each row so we can figure out which
    // row the finger is currently over during a drag. Keyed by index.
    val rowTops = remember { mutableStateMapOf<Int, Float>() }
    val rowHeights = remember { mutableStateMapOf<Int, Float>() }

    var draggedFrom by remember { mutableStateOf<Int?>(null) }
    var dragDeltaY by remember { mutableStateOf(0f) }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        layout.sections.forEachIndexed { i, (section, visible) ->
            val isBeingDragged = draggedFrom == i
            SectionRow(
                index = i,
                section = section,
                visible = visible,
                isFi = isFi,
                isDragging = isBeingDragged,
                dragTranslationY = if (isBeingDragged) dragDeltaY else 0f,
                onToggle = {
                    val next = layout.sections.toMutableList()
                    next[i] = section to !visible
                    onLayoutChange(HomeLayout(next))
                },
                onRowMeasured = { top, height ->
                    rowTops[i] = top
                    rowHeights[i] = height
                },
                onDragStart = {
                    draggedFrom = i
                    dragDeltaY = 0f
                },
                onDrag = { deltaY ->
                    dragDeltaY += deltaY
                },
                onDragEnd = {
                    val from = draggedFrom ?: return@SectionRow
                    val fromTop = rowTops[from] ?: 0f
                    val fingerY = fromTop + dragDeltaY + ((rowHeights[from] ?: 0f) / 2f)
                    // Find target index: smallest j whose row-top ≤ fingerY < row-top+row-height.
                    var target = from
                    for ((idx, top) in rowTops) {
                        val h = rowHeights[idx] ?: 0f
                        if (fingerY in top..(top + h)) { target = idx; break }
                    }
                    if (target != from) {
                        val next = layout.sections.toMutableList()
                        val moved = next.removeAt(from)
                        next.add(target, moved)
                        onLayoutChange(HomeLayout(next))
                    }
                    draggedFrom = null
                    dragDeltaY = 0f
                },
                onDragCancel = {
                    draggedFrom = null
                    dragDeltaY = 0f
                },
            )
        }
    }
}

@Composable
private fun SectionRow(
    index: Int,
    section: HomeSection,
    visible: Boolean,
    isFi: Boolean,
    isDragging: Boolean,
    dragTranslationY: Float,
    onToggle: () -> Unit,
    onRowMeasured: (top: Float, height: Float) -> Unit,
    onDragStart: () -> Unit,
    onDrag: (deltaY: Float) -> Unit,
    onDragEnd: () -> Unit,
    onDragCancel: () -> Unit,
) {
    val density = LocalDensity.current
    val label = if (isFi) section.labelFi else section.labelEn
    val elevation = if (isDragging) 8.dp else 0.dp
    val translationY = with(density) { dragTranslationY.toDp() }

    Surface(
        shape = RoundedCornerShape(14.dp),
        color = if (isDragging)
            MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
        else
            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
        tonalElevation = elevation,
        shadowElevation = elevation,
        modifier = Modifier
            .fillMaxWidth()
            .offset(y = translationY)
            .onGloballyPositioned { c ->
                onRowMeasured(c.positionInRoot().y, c.size.height.toFloat())
            },
    ) {
        Row(
            Modifier.padding(vertical = 12.dp, horizontal = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Order badge
            Box(
                Modifier
                    .size(28.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.14f)),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    "${index + 1}",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
            Spacer(Modifier.width(12.dp))

            Column(Modifier.weight(1f)) {
                Text(
                    label,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (visible)
                        MaterialTheme.colorScheme.onSurface
                    else
                        MaterialTheme.colorScheme.onSurface.copy(alpha = 0.45f),
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    if (visible)
                        (if (isFi) "Näkyvissä" else "Visible")
                    else
                        (if (isFi) "Piilotettu" else "Hidden"),
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Switch(
                checked = visible,
                onCheckedChange = { onToggle() },
            )
            Spacer(Modifier.width(6.dp))

            // Drag handle — long-press anywhere on this Box to start dragging.
            Box(
                Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .pointerInput(index) {
                        detectDragGesturesAfterLongPress(
                            onDragStart = { onDragStart() },
                            onDrag = { _, drag -> onDrag(drag.y) },
                            onDragEnd = { onDragEnd() },
                            onDragCancel = { onDragCancel() },
                        )
                    },
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Outlined.DragHandle,
                    contentDescription = if (isFi) "Vedä järjestääksesi" else "Drag to reorder",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(20.dp),
                )
            }
        }
    }
}
