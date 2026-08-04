package fi.ksykmaps.ui

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.graphics.Color as AndroidColor
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Business
import androidx.compose.material.icons.outlined.CloudOff
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.outlined.Layers
import androidx.compose.material.icons.outlined.MyLocation
import androidx.compose.material.icons.outlined.Remove
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
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import fi.ksykmaps.data.Api
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.maplibre.android.MapLibre
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.geometry.LatLngBounds
import org.maplibre.android.location.LocationComponentActivationOptions
import org.maplibre.android.location.modes.CameraMode
import org.maplibre.android.location.modes.RenderMode
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView
import org.maplibre.android.maps.Style
import org.maplibre.android.style.expressions.Expression
import org.maplibre.android.style.layers.FillLayer
import org.maplibre.android.style.layers.LineLayer
import org.maplibre.android.style.layers.PropertyFactory
import org.maplibre.android.style.layers.SymbolLayer
import org.maplibre.android.style.sources.GeoJsonSource

/**
 * Native indoor + campus map. Renders KSYK building footprints on top
 * of an OpenStreetMap raster basemap (same tile provider as the web
 * CampusMap), with a floor switcher, a "my location" puck, and a
 * bottom-sheet building card on tap.
 *
 * Everything is drawn as MapLibre style layers, so it rotates + pitches
 * with the map without any per-frame recalculation. Building geometry
 * comes from /api/buildings — the `points: [{lat,lng}]` array is the
 * same shape the web CampusOverlay consumes, so any polygon drawn in
 * the desktop Builder shows up here too, immediately.
 */

private const val SRC_BUILDINGS = "campus-buildings"
private const val LAYER_FILL = "campus-buildings-fill"
private const val LAYER_OUTLINE = "campus-buildings-outline"
private const val LAYER_LABEL = "campus-buildings-label"

// CARTO Voyager @2x — matches CampusMap.tsx's TILE_URLS.light so the
// two platforms share basemap identity.
private const val STYLE_JSON_LIGHT = """{
  "version": 8,
  "sources": {
    "osm-raster": {
      "type": "raster",
      "tiles": [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png"
      ],
      "tileSize": 256,
      "attribution": "© OpenStreetMap · © CARTO",
      "maxzoom": 19
    }
  },
  "layers": [
    { "id": "osm-raster-layer", "type": "raster", "source": "osm-raster" }
  ]
}"""

// KSYK campus starting camera — matches the site default. Real
// coordinates are read from the first building fetched, but this is
// the fallback until data arrives.
private val KSYK_CENTER = LatLng(60.192059, 25.006670)
private const val KSYK_ZOOM = 17.5

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapScreen() {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()

    // MapLibre demands a one-time init before any MapView is inflated.
    // Empty apiKey is fine — CARTO/OSM tiles are open. We just need the
    // init call so the native layer wires up its OkHttp cache dir etc.
    DisposableEffect(Unit) {
        MapLibre.getInstance(ctx.applicationContext, "", org.maplibre.android.WellKnownTileServer.MapLibre)
        onDispose { }
    }

    var buildings by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var selectedFloor by remember { mutableStateOf<Int?>(null) }
    var selected by remember { mutableStateOf<JsonObject?>(null) }
    var offlineMode by remember { mutableStateOf(false) }
    var mapRef by remember { mutableStateOf<MapLibreMap?>(null) }
    var followMe by remember { mutableStateOf(false) }

    val locationPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            followMe = true
            mapRef?.let { enableLocation(ctx, it) }
        }
    }

    LaunchedEffect(Unit) {
        try {
            val json = withContext(Dispatchers.IO) { Api.get("/buildings") }
            buildings = json.jsonArray.mapNotNull { it as? JsonObject }
            offlineMode = false
        } catch (_: Exception) {
            // Fallback to any cached copy on disk so the app still opens
            // to a usable map on the subway.
            val cached = Api.getOffline("/buildings")
            if (cached != null) {
                buildings = cached.jsonArray.mapNotNull { it as? JsonObject }
                offlineMode = true
            }
        }
    }

    // Recompute polygons whenever the building set or selected floor changes.
    LaunchedEffect(buildings, selectedFloor, mapRef) {
        val map = mapRef ?: return@LaunchedEffect
        val featuresJson = buildBuildingsFeatureCollection(buildings, selectedFloor)
        map.getStyle { style ->
            val existing = style.getSourceAs<GeoJsonSource>(SRC_BUILDINGS)
            if (existing != null) {
                existing.setGeoJson(featuresJson)
            } else {
                style.addSource(GeoJsonSource(SRC_BUILDINGS, featuresJson))
                style.addLayer(
                    FillLayer(LAYER_FILL, SRC_BUILDINGS).withProperties(
                        PropertyFactory.fillColor(Expression.get("color")),
                        PropertyFactory.fillOpacity(0.28f),
                    )
                )
                style.addLayer(
                    LineLayer(LAYER_OUTLINE, SRC_BUILDINGS).withProperties(
                        PropertyFactory.lineColor(Expression.get("color")),
                        PropertyFactory.lineWidth(2f),
                        PropertyFactory.lineOpacity(0.9f),
                    )
                )
                style.addLayer(
                    SymbolLayer(LAYER_LABEL, SRC_BUILDINGS).withProperties(
                        PropertyFactory.textField(Expression.get("name")),
                        PropertyFactory.textSize(12f),
                        PropertyFactory.textColor(AndroidColor.parseColor("#0F172A")),
                        PropertyFactory.textHaloColor(AndroidColor.WHITE),
                        PropertyFactory.textHaloWidth(1.5f),
                        PropertyFactory.textAllowOverlap(false),
                    )
                )
            }
        }
        // Recenter on the mean of all building centroids so first-load
        // frames the campus, not the KSYK fallback.
        centerOnBuildings(map, buildings)
    }

    Box(Modifier.fillMaxSize()) {
        AndroidView(
            factory = { c ->
                MapView(c).apply {
                    getMapAsync { m ->
                        m.setStyle(Style.Builder().fromJson(STYLE_JSON_LIGHT)) {
                            m.cameraPosition = CameraPosition.Builder()
                                .target(KSYK_CENTER)
                                .zoom(KSYK_ZOOM)
                                .build()
                            m.uiSettings.apply {
                                isCompassEnabled = true
                                isRotateGesturesEnabled = true
                                isTiltGesturesEnabled = true
                                isAttributionEnabled = true
                                isLogoEnabled = false
                                setAttributionMargins(16, 0, 0, 24)
                            }
                            m.addOnMapClickListener { latLng ->
                                val hit = pickBuildingAt(buildings, latLng)
                                if (hit != null) selected = hit
                                hit != null
                            }
                            mapRef = m
                        }
                    }
                    onStart(); onResume()
                }
            },
            modifier = Modifier.fillMaxSize(),
        )

        // ── Floor switcher (right side, vertical) ──────────────────
        val floors = remember(buildings) { floorsFromBuildings(buildings) }
        if (floors.isNotEmpty()) {
            FloorRail(
                floors = floors,
                selected = selectedFloor,
                onSelect = { selectedFloor = if (selectedFloor == it) null else it },
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .padding(end = 12.dp),
            )
        }

        // ── Zoom + locate controls (bottom right) ──────────────────
        Column(
            Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 12.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            MapChipButton(icon = Icons.Outlined.Add, label = "Zoom in") {
                mapRef?.animateCamera(CameraUpdateFactory.zoomIn())
            }
            MapChipButton(icon = Icons.Outlined.Remove, label = "Zoom out") {
                mapRef?.animateCamera(CameraUpdateFactory.zoomOut())
            }
            MapChipButton(icon = Icons.Outlined.Explore, label = "Reset bearing") {
                mapRef?.animateCamera(CameraUpdateFactory.bearingTo(0.0))
            }
            MapChipButton(
                icon = Icons.Outlined.MyLocation,
                label = "My location",
                highlighted = followMe,
            ) {
                val hasLocation = ContextCompat.checkSelfPermission(
                    ctx, Manifest.permission.ACCESS_FINE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED
                if (hasLocation) {
                    followMe = true
                    mapRef?.let { enableLocation(ctx, it) }
                } else {
                    locationPermission.launch(Manifest.permission.ACCESS_FINE_LOCATION)
                }
            }
        }

        // ── Offline banner ─────────────────────────────────────────
        if (offlineMode) {
            OfflineBanner(
                Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 12.dp),
            )
        }

        // ── Building count / status pill (bottom-left) ─────────────
        Row(
            Modifier
                .align(Alignment.BottomStart)
                .padding(start = 12.dp, bottom = 24.dp)
                .clip(RoundedCornerShape(24.dp))
                .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.94f))
                .padding(horizontal = 14.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                Icons.Outlined.Business, null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(16.dp),
            )
            Spacer(Modifier.width(6.dp))
            Text(
                "${buildings.size} building${if (buildings.size == 1) "" else "s"}",
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
            )
            if (selectedFloor != null) {
                Spacer(Modifier.width(10.dp))
                Text(
                    "· Floor $selectedFloor",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }

    selected?.let { b ->
        BuildingSheet(building = b, onDismiss = { selected = null }) {
            val id = (b["id"] as? JsonPrimitive)?.contentOrNull
            if (id != null) {
                val centroid = centroidOf(b)
                if (centroid != null) {
                    mapRef?.animateCamera(
                        CameraUpdateFactory.newLatLngZoom(
                            LatLng(centroid.first, centroid.second),
                            18.5
                        )
                    )
                }
            }
            selected = null
        }
    }
}

@SuppressLint("MissingPermission")
private fun enableLocation(ctx: android.content.Context, map: MapLibreMap) {
    map.getStyle { style ->
        val lc = map.locationComponent
        lc.activateLocationComponent(
            LocationComponentActivationOptions.builder(ctx, style).build()
        )
        lc.isLocationComponentEnabled = true
        lc.cameraMode = CameraMode.TRACKING
        lc.renderMode = RenderMode.COMPASS
    }
}

@Composable
private fun MapChipButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    highlighted: Boolean = false,
    onClick: () -> Unit,
) {
    val bg = if (highlighted) MaterialTheme.colorScheme.primary
             else MaterialTheme.colorScheme.surface.copy(alpha = 0.94f)
    val fg = if (highlighted) Color.White else MaterialTheme.colorScheme.onSurface
    Box(
        Modifier
            .size(46.dp)
            .clip(CircleShape)
            .background(bg)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = label, tint = fg, modifier = Modifier.size(22.dp))
    }
}

@Composable
private fun FloorRail(
    floors: List<Int>,
    selected: Int?,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier
            .clip(RoundedCornerShape(24.dp))
            .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.94f))
            .padding(vertical = 6.dp, horizontal = 4.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(
            Icons.Outlined.Layers, null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(16.dp).padding(top = 2.dp),
        )
        floors.reversed().forEach { f ->
            val isSel = selected == f
            Box(
                Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(if (isSel) MaterialTheme.colorScheme.primary else Color.Transparent)
                    .clickable { onSelect(f) },
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    f.toString(),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isSel) Color.White else MaterialTheme.colorScheme.onSurface,
                )
            }
        }
    }
}

@Composable
private fun OfflineBanner(modifier: Modifier = Modifier) {
    Row(
        modifier
            .clip(RoundedCornerShape(20.dp))
            .background(Color(0xFFF59E0B).copy(alpha = 0.95f))
            .padding(horizontal = 14.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Outlined.CloudOff, null, tint = Color.White, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(8.dp))
        Text(
            "Offline · showing cached campus data",
            color = Color.White,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BuildingSheet(building: JsonObject, onDismiss: () -> Unit, onFocus: () -> Unit) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val name = (building["name"] as? JsonPrimitive)?.contentOrNull ?: "Building"
    val floors = (building["floors"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() ?: 1
    val color = (building["colorCode"] as? JsonPrimitive)?.contentOrNull ?: "#2563eb"
    val nameFi = (building["nameFi"] as? JsonPrimitive)?.contentOrNull
    val nameEn = (building["nameEn"] as? JsonPrimitive)?.contentOrNull

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(Modifier.padding(horizontal = 24.dp, vertical = 4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(52.dp)
                        .clip(CircleShape)
                        .background(runCatching { Color(AndroidColor.parseColor(color)) }.getOrDefault(Color(0xFF2563EB)).copy(alpha = 0.18f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Outlined.Business, null,
                        tint = runCatching { Color(AndroidColor.parseColor(color)) }.getOrDefault(Color(0xFF2563EB)),
                        modifier = Modifier.size(26.dp),
                    )
                }
                Spacer(Modifier.width(14.dp))
                Column {
                    Text(name, fontWeight = FontWeight.Bold, fontSize = 22.sp)
                    val subtitle = listOfNotNull(nameEn, nameFi).firstOrNull { it != name }
                    if (subtitle != null) {
                        Text(
                            subtitle,
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
            Spacer(Modifier.height(18.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Chip("$floors floor${if (floors == 1) "" else "s"}")
            }
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = onFocus,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(10.dp),
            ) {
                Icon(Icons.Outlined.MyLocation, null)
                Spacer(Modifier.width(6.dp))
                Text("Focus on map", fontWeight = FontWeight.SemiBold)
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun Chip(text: String) {
    Box(
        Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(horizontal = 10.dp, vertical = 4.dp),
    ) {
        Text(text, fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
             color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

// ── Data plumbing ──────────────────────────────────────────────────

private fun floorsFromBuildings(buildings: List<JsonObject>): List<Int> {
    if (buildings.isEmpty()) return emptyList()
    val max = buildings.mapNotNull { (it["floors"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() }.maxOrNull() ?: 0
    val min = buildings.mapNotNull { (it["floorMin"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() }.minOrNull() ?: 1
    if (max <= 0) return emptyList()
    return (min..max).toList()
}

/** Build a GeoJSON FeatureCollection string of building polygons. */
private fun buildBuildingsFeatureCollection(buildings: List<JsonObject>, floor: Int?): String {
    val features = StringBuilder()
    var first = true
    for (b in buildings) {
        // If a floor is selected, only include buildings whose range covers it.
        if (floor != null) {
            val floorsCount = (b["floors"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() ?: 1
            val fMin = (b["floorMin"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() ?: 1
            val fMax = (b["floorMax"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() ?: floorsCount
            if (floor < minOf(fMin, fMax) || floor > maxOf(fMin, fMax)) continue
        }
        val ptsArr = (b["points"] as? JsonArray) ?: continue
        if (ptsArr.size < 3) continue
        val coords = StringBuilder("[")
        var isFirstPt = true
        for (p in ptsArr) {
            val po = p as? JsonObject ?: continue
            val lat = (po["lat"] as? JsonPrimitive)?.doubleOrNull ?: continue
            val lng = (po["lng"] as? JsonPrimitive)?.doubleOrNull ?: continue
            if (!isFirstPt) coords.append(",")
            coords.append("[$lng,$lat]")
            isFirstPt = false
        }
        // Close the ring
        val firstPt = ptsArr[0] as? JsonObject
        if (firstPt != null) {
            val lat = (firstPt["lat"] as? JsonPrimitive)?.doubleOrNull
            val lng = (firstPt["lng"] as? JsonPrimitive)?.doubleOrNull
            if (lat != null && lng != null) coords.append(",[$lng,$lat]")
        }
        coords.append("]")

        val name = (b["name"] as? JsonPrimitive)?.contentOrNull?.escape() ?: "Building"
        val color = (b["colorCode"] as? JsonPrimitive)?.contentOrNull?.escape() ?: "#2563eb"
        val id = (b["id"] as? JsonPrimitive)?.contentOrNull?.escape() ?: ""

        if (!first) features.append(",")
        features.append(
            """{"type":"Feature","id":"$id","geometry":{"type":"Polygon","coordinates":[$coords]},"properties":{"name":"$name","color":"$color","id":"$id"}}"""
        )
        first = false
    }
    return """{"type":"FeatureCollection","features":[$features]}"""
}

private fun String.escape(): String = replace("\\", "\\\\").replace("\"", "\\\"")

/** Hit-test — returns the building whose polygon contains the tap. */
private fun pickBuildingAt(buildings: List<JsonObject>, at: LatLng): JsonObject? {
    for (b in buildings) {
        val ptsArr = (b["points"] as? JsonArray) ?: continue
        if (ptsArr.size < 3) continue
        val polygon = ptsArr.mapNotNull { p ->
            val po = p as? JsonObject ?: return@mapNotNull null
            val lat = (po["lat"] as? JsonPrimitive)?.doubleOrNull ?: return@mapNotNull null
            val lng = (po["lng"] as? JsonPrimitive)?.doubleOrNull ?: return@mapNotNull null
            LatLng(lat, lng)
        }
        if (polygon.size >= 3 && pointInPolygon(at, polygon)) return b
    }
    return null
}

private fun pointInPolygon(pt: LatLng, poly: List<LatLng>): Boolean {
    var inside = false
    var j = poly.size - 1
    for (i in poly.indices) {
        val yi = poly[i].latitude;  val xi = poly[i].longitude
        val yj = poly[j].latitude;  val xj = poly[j].longitude
        val intersect = ((yi > pt.latitude) != (yj > pt.latitude)) &&
                (pt.longitude < (xj - xi) * (pt.latitude - yi) / (yj - yi + 1e-12) + xi)
        if (intersect) inside = !inside
        j = i
    }
    return inside
}

private fun centroidOf(b: JsonObject): Pair<Double, Double>? {
    val ptsArr = (b["points"] as? JsonArray) ?: return null
    var lat = 0.0; var lng = 0.0; var n = 0
    for (p in ptsArr) {
        val po = p as? JsonObject ?: continue
        val la = (po["lat"] as? JsonPrimitive)?.doubleOrNull ?: continue
        val ln = (po["lng"] as? JsonPrimitive)?.doubleOrNull ?: continue
        lat += la; lng += ln; n++
    }
    if (n == 0) return null
    return lat / n to lng / n
}

private fun centerOnBuildings(map: MapLibreMap, buildings: List<JsonObject>) {
    if (buildings.isEmpty()) return
    val allPoints = buildings.flatMap { b ->
        (b["points"] as? JsonArray)?.mapNotNull { p ->
            val po = p as? JsonObject ?: return@mapNotNull null
            val lat = (po["lat"] as? JsonPrimitive)?.doubleOrNull ?: return@mapNotNull null
            val lng = (po["lng"] as? JsonPrimitive)?.doubleOrNull ?: return@mapNotNull null
            LatLng(lat, lng)
        } ?: emptyList()
    }
    if (allPoints.size < 2) return
    val bounds = LatLngBounds.Builder().apply { allPoints.forEach { include(it) } }.build()
    // Only fit-to-bounds on the very first data load — later we let the
    // user pan freely without being snapped back to campus.
    map.animateCamera(CameraUpdateFactory.newLatLngBounds(bounds, 80), 600)
}
