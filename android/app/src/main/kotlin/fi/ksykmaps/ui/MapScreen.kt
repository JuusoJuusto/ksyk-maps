package fi.ksykmaps.ui

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Color as AndroidColor
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.DirectionsWalk
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.CloudOff
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.MyLocation
import androidx.compose.material.icons.outlined.Navigation
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Remove
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import fi.ksykmaps.data.Analytics
import fi.ksykmaps.data.Api
import fi.ksykmaps.data.AppLog
import fi.ksykmaps.data.ErrorReporter
import com.posthog.PostHog
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
import org.maplibre.android.style.layers.Property
import org.maplibre.android.style.layers.PropertyFactory
import org.maplibre.android.style.layers.SymbolLayer
import org.maplibre.android.style.sources.GeoJsonSource
import org.json.JSONArray
import org.json.JSONObject

/**
 * KSYK Maps — native campus map (v2, rewritten 2026-08-28 for v1.43.0).
 *
 * Previous versions had an unstable Compose ↔ MapLibre layer bridge:
 * data lived in Compose state and had to be pushed into GeoJsonSources via
 * LaunchedEffects that competed with basemap style swaps, producing "walls
 * only" and "empty map" symptoms on real devices. This rewrite fixes the
 * root cause by:
 *
 *   1. Loading the bundled snapshot SYNCHRONOUSLY on composition entry so
 *      the map has data before the GL surface exists.
 *   2. Building an initial Style JSON that already contains buildings +
 *      rooms as inline GeoJSON sources — so the very first frame shows
 *      polygons, no waiting.
 *   3. Installing all fill/line/symbol layers ONCE per style load inside
 *      onStyleLoaded — never in a LaunchedEffect.
 *   4. Live data updates only call `style.getSource(id).setGeoJson(fc)` —
 *      pure data swap, no layer surgery.
 *   5. Basemap swaps rebuild the whole style JSON with data pre-embedded
 *      then re-install layers in onStyleLoaded — atomic, no gap.
 *
 * Features preserved from v1.42.0: floor selector, satellite basemap,
 * my-location puck, search, building/room detail sheet, directions,
 * Wi-Fi indoor position (drawn as blue puck), room-deep-link.
 */

// ── Style constants ──────────────────────────────────────────────────
private const val SRC_BUILDINGS   = "src-buildings"
private const val SRC_ROOMS       = "src-rooms"
private const val SRC_HALLWAYS    = "src-hallways"
private const val SRC_ROUTE       = "src-route"
private const val SRC_WIFI_POS    = "src-wifi-pos"

private const val LYR_BUILDING_FILL    = "lyr-building-fill"
private const val LYR_BUILDING_OUTLINE = "lyr-building-outline"
private const val LYR_BUILDING_LABEL   = "lyr-building-label"
private const val LYR_ROOM_FILL        = "lyr-room-fill"
private const val LYR_ROOM_OUTLINE     = "lyr-room-outline"
private const val LYR_ROOM_LABEL       = "lyr-room-label"
private const val LYR_WALL_OUTER       = "lyr-wall-outer"
private const val LYR_WALL_INNER       = "lyr-wall-inner"
private const val LYR_ROUTE_CASING     = "lyr-route-casing"
private const val LYR_ROUTE_LINE       = "lyr-route-line"
private const val LYR_WIFI_HALO        = "lyr-wifi-halo"
private const val LYR_WIFI_DOT         = "lyr-wifi-dot"

// KSYK campus fallback camera — centre computed from actual building bounds.
private val KSYK_CENTER = LatLng(60.187057, 25.003514)
private const val KSYK_ZOOM = 18.5

// Empty FeatureCollection literal for placeholder sources.
private const val EMPTY_FC = """{"type":"FeatureCollection","features":[]}"""

private const val SRC_ROOM_SELECTED = "src-room-sel"
private const val LYR_ROOM_SELECTED = "lyr-room-sel"
private const val LYR_ROOM_SEL_LINE = "lyr-room-sel-line"

// Muted "Apple Maps standard" base — the raster tiles are OSM but the
// campus polygons render brightly on top, so we tone the base down with
// a partially-transparent white overlay layer that MapLibre supports
// via a `background` layer type painted before the raster. The stack is
// bottom-up: white bg → OSM tiles → white 45 % overlay → campus data.
// Result: OSM's road labels and pathways are still legible but way less
// visually loud than raw OSM, which is exactly the Apple/MazeMap feel.
private val STYLE_OSM = """{
  "version": 8,
  "glyphs": "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  "sources": {
    "osm": {
      "type": "raster",
      "tiles": [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
      ],
      "tileSize": 256,
      "attribution": "© OpenStreetMap contributors",
      "maxzoom": 19
    }
  },
  "layers": [
    { "id": "canvas", "type": "background", "paint": { "background-color": "#f3f4f6" } },
    { "id": "osm-base", "type": "raster", "source": "osm", "paint": { "raster-opacity": 0.55, "raster-saturation": -0.4, "raster-brightness-min": 0.2, "raster-brightness-max": 1.0, "raster-contrast": -0.1 } }
  ]
}"""

// Room fill colour as a CSS hex string per type.  Storing the colour in
// the GeoJSON feature properties and reading it via Expression.get("c")
// avoids Expression.match / Expression.stop entirely — those can fail
// silently in some MapLibre Android versions and produce invisible layers.
private fun roomColorHex(type: String?): String = when ((type ?: "").lowercase()) {
    "classroom", "class"                  -> "#bfdbfe"  // blue-200
    "lab", "laboratory"                   -> "#e9d5ff"  // purple-200
    "office"                              -> "#fde68a"  // amber-200
    "toilet", "restroom", "wc", "bathroom"-> "#a5f3fc"  // cyan-200
    "cafeteria", "canteen"                -> "#fbcfe8"  // pink-200
    "library", "library_room"             -> "#bfdbfe"  // blue-200
    "gym", "sports"                       -> "#fca5a5"  // red-200
    "music_room", "music"                 -> "#fed7aa"  // orange-200
    "storage"                             -> "#e5e7eb"  // grey-200
    "hallway", "corridor"                 -> "#f1f5f9"  // slate-100
    "emergency_exit", "exit"              -> "#fecaca"  // red-200 light
    "auditorium"                          -> "#fef08a"  // yellow-200
    "lobby", "entrance"                   -> "#d1fae5"  // green-100
    "stairs"                              -> "#e2e8f0"  // slate-200
    "outdoor"                             -> "#dcfce7"  // green-100
    else                                  -> "#dbeafe"  // blue-100 default
}

private object MapHolder {
    var view: MapView? = null
    var map: MapLibreMap? = null
    var autofitDone: Boolean = false
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapScreen() {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    LanguageState.init(ctx); val lang = LanguageState.current ?: "fi"

    // One-time MapLibre native init.
    var initFailed by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        try {
            MapLibre.getInstance(
                ctx.applicationContext, "not-needed",
                org.maplibre.android.WellKnownTileServer.MapLibre,
            )
        } catch (t: Throwable) {
            initFailed = true
            AppLog.error("MapScreen", "MapLibre init failed: ${t.message}")
            ErrorReporter.map("map_load_failed", t, mapOf("stage" to "maplibre_init"))
        }
    }

    if (initFailed) {
        MapInitFailedFallback(lang)
        return
    }

    // ── Data state ────────────────────────────────────────────────────
    // Loaded SYNCHRONOUSLY on first composition from the bundled snapshot
    // so the map's initial style already contains real polygons. Then
    // refreshed from the live API in a background coroutine.
    var buildings by remember { mutableStateOf<List<JsonObject>>(readBundled(ctx, "buildings")) }
    var rooms by remember { mutableStateOf<List<JsonObject>>(readBundled(ctx, "rooms")) }
    var hallways by remember { mutableStateOf<List<JsonObject>>(readBundled(ctx, "hallways")) }
    var offlineMode by remember { mutableStateOf(false) }
    var dataFetching by remember { mutableStateOf(true) }
    var dataRetry by remember { mutableStateOf(0) }

    LaunchedEffect(Unit) {
        AppLog.info(
            "MapScreen",
            "bundled loaded: buildings=${buildings.size} rooms=${rooms.size} hallways=${hallways.size}",
        )
    }

    // Auto-pick the busiest floor once real data lands. If we already
    // have bundled data, this fires immediately on first composition.
    var selectedFloor by rememberSaveable { mutableStateOf(1) }
    var floorAutoPicked by remember { mutableStateOf(false) }
    LaunchedEffect(rooms) {
        if (!floorAutoPicked && rooms.isNotEmpty()) {
            val counts = rooms
                .filter { (it["points"] as? JsonArray)?.let { p -> p.size >= 3 } == true }
                .mapNotNull { (it["floor"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() }
                .groupingBy { it }.eachCount()
            counts.maxByOrNull { it.value }?.key?.let { selectedFloor = it }
            floorAutoPicked = true
            AppLog.info("MapScreen", "auto-floor=$selectedFloor")
        }
    }

    // ── UI state ──────────────────────────────────────────────────────
    var selectedBuilding by remember { mutableStateOf<JsonObject?>(null) }
    var selectedRoom by remember { mutableStateOf<JsonObject?>(null) }
    var searchQuery by remember { mutableStateOf("") }
    var searchFocused by remember { mutableStateOf(false) }
    var followMe by remember { mutableStateOf(false) }
    var mapRef by remember { mutableStateOf<MapLibreMap?>(null) }
    var styleReady by remember { mutableStateOf(false) }
    var mapBearing by remember { mutableStateOf(0.0) }

    // Directions: destination room/building + optional origin.
    var destination by remember { mutableStateOf<JsonObject?>(null) }
    var origin by remember { mutableStateOf<JsonObject?>(null) }
    var originIsMyLoc by remember { mutableStateOf(false) }
    var myLocation by remember { mutableStateOf<LatLng?>(null) }

    // Wi-Fi indoor position — flows from the shared WifiPositioning state.
    val wifiPos by WifiPositioning.position.collectAsState()

    val locationPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            followMe = true
            mapRef?.let { m -> enableLocation(ctx, m) }
        }
    }

    // ── Live data refresh ─────────────────────────────────────────────
    LaunchedEffect(dataRetry) {
        dataFetching = true
        AppLog.info("MapScreen", "live-fetch start (retry=$dataRetry)")
        // Refresh server map defaults (bearing/rotation) in parallel with data.
        withContext(Dispatchers.IO) { runCatching { refreshServerMapDefaults(ctx) } }
        // On first launch apply the now-fresh server bearing to the live map.
        // The map camera initialises before this fetch completes, so without
        // this correction the map always starts at 0° (north) regardless of
        // the admin-configured bearing.
        if (dataRetry == 0) {
            val fresh = loadServerMapDefaults(ctx)
            val m = mapRef
            if (fresh != null && m != null) {
                val cam = m.cameraPosition
                if (Math.abs((cam?.bearing ?: 0.0) - fresh.bearing) > 0.5) {
                    m.animateCamera(
                        CameraUpdateFactory.newCameraPosition(
                            CameraPosition.Builder()
                                .target(cam?.target ?: KSYK_CENTER)
                                .zoom(cam?.zoom ?: KSYK_ZOOM)
                                .bearing(fresh.bearing)
                                .tilt(cam?.tilt ?: 0.0)
                                .build()
                        ), 600
                    )
                }
            }
        }
        val bDef = withContext(Dispatchers.IO) { runCatching { Api.get("/buildings") } }
        val rDef = withContext(Dispatchers.IO) { runCatching { Api.get("/rooms") } }
        val hDef = withContext(Dispatchers.IO) { runCatching { Api.get("/hallways") } }

        bDef.onSuccess { j ->
            val fresh = j.jsonArray.mapNotNull { it as? JsonObject }
            if (fresh.isNotEmpty() && fresh != buildings) {
                buildings = fresh; offlineMode = false
                AppLog.info("MapScreen", "live buildings=${fresh.size}")
            }
        }.onFailure {
            offlineMode = buildings.isEmpty()
            AppLog.warn("MapScreen", "buildings live failed: ${it.message?.take(60)}")
            ErrorReporter.api("api_request_failed", it, "/buildings")
        }
        rDef.onSuccess { j ->
            val fresh = j.jsonArray.mapNotNull { it as? JsonObject }
            if (fresh.isNotEmpty() && fresh != rooms) {
                rooms = fresh
                AppLog.info("MapScreen", "live rooms=${fresh.size}")
            }
        }
        hDef.onSuccess { j ->
            val fresh = j.jsonArray.mapNotNull { it as? JsonObject }
            if (fresh.isNotEmpty() && fresh != hallways) hallways = fresh
        }
        if (dataRetry == 0 && bDef.isSuccess && rDef.isSuccess) {
            runCatching {
                PostHog.capture("map_loaded", properties = mapOf(
                    "buildings" to buildings.size,
                    "rooms" to rooms.size,
                ))
            }
        }
        dataFetching = false
    }

    // ── Data → GeoJSON sync ───────────────────────────────────────────
    // Every time data OR selected floor OR style-ready changes, push the
    // filtered FeatureCollection into the source. This does NOT touch
    // layers, so it cannot fail silently after a basemap swap.
    LaunchedEffect(buildings, rooms, hallways, selectedFloor, styleReady, mapRef) {
        val m = mapRef ?: return@LaunchedEffect
        if (!styleReady) return@LaunchedEffect
        val style = m.style ?: return@LaunchedEffect
        val bFC = buildingsFC(buildings)
        val rFC = roomsFC(rooms, selectedFloor)
        val hFC = hallwaysFC(hallways, selectedFloor)
        style.getSourceAs<GeoJsonSource>(SRC_BUILDINGS)?.setGeoJson(bFC)
        style.getSourceAs<GeoJsonSource>(SRC_ROOMS)?.setGeoJson(rFC)
        style.getSourceAs<GeoJsonSource>(SRC_HALLWAYS)?.setGeoJson(hFC)
        AppLog.info(
            "MapScreen",
            "sources updated: buildings=${buildings.size} rooms(floor $selectedFloor)=${countPolyRoomsOnFloor(rooms, selectedFloor)}",
        )
    }

    // First-time auto-fit — once buildings arrive and the map is ready.
    LaunchedEffect(buildings, mapRef) {
        val m = mapRef ?: return@LaunchedEffect
        if (MapHolder.autofitDone) return@LaunchedEffect
        if (buildings.isEmpty()) return@LaunchedEffect
        val bounds = boundsOf(buildings)
        if (bounds != null) {
            m.animateCamera(CameraUpdateFactory.newLatLngBounds(bounds, 80), 700)
            MapHolder.autofitDone = true
            AppLog.info("MapScreen", "initial auto-fit done")
        }
    }

    // Route rendering — straight line origin → dest (upgrade to A* later).
    LaunchedEffect(destination, origin, originIsMyLoc, myLocation, styleReady) {
        val m = mapRef ?: return@LaunchedEffect
        if (!styleReady) return@LaunchedEffect
        val style = m.style ?: return@LaunchedEffect
        val src = style.getSourceAs<GeoJsonSource>(SRC_ROUTE) ?: return@LaunchedEffect
        val dest = destination
        val from = when {
            dest == null -> null
            originIsMyLoc -> myLocation
            origin != null -> centroidOf(origin!!)?.let { LatLng(it.first, it.second) }
            else -> null
        }
        val to = dest?.let { centroidOf(it) }?.let { LatLng(it.first, it.second) }
        if (from != null && to != null) {
            src.setGeoJson(routeFC(from, to))
        } else {
            src.setGeoJson(EMPTY_FC)
        }
    }

    // Selected-room highlight — updates whenever a room is tapped or dismissed.
    LaunchedEffect(selectedRoom, styleReady, mapRef) {
        val m = mapRef ?: return@LaunchedEffect
        if (!styleReady) return@LaunchedEffect
        val style = m.style ?: return@LaunchedEffect
        style.getSourceAs<GeoJsonSource>(SRC_ROOM_SELECTED)
            ?.setGeoJson(selectedRoom?.let { selectedRoomFC(it) } ?: EMPTY_FC)
    }

    // Wi-Fi puck rendering.
    LaunchedEffect(wifiPos, styleReady) {
        val m = mapRef ?: return@LaunchedEffect
        if (!styleReady) return@LaunchedEffect
        val style = m.style ?: return@LaunchedEffect
        val src = style.getSourceAs<GeoJsonSource>(SRC_WIFI_POS) ?: return@LaunchedEffect
        val p = wifiPos
        val lat = p?.lat; val lng = p?.lng
        if (lat != null && lng != null) src.setGeoJson(wifiPuckFC(lat, lng)) else src.setGeoJson(EMPTY_FC)
    }

    // Deep-link — Timetable / notification / RoomFinder navigate to a room.
    LaunchedEffect(rooms, mapRef, styleReady) {
        val m = mapRef ?: return@LaunchedEffect
        if (!styleReady) return@LaunchedEffect
        val pendingId = MapNavIntent.pendingRoomId ?: return@LaunchedEffect
        val room = rooms.firstOrNull { (it["id"] as? JsonPrimitive)?.contentOrNull == pendingId }
            ?: return@LaunchedEffect
        MapNavIntent.pendingRoomId = null
        selectedRoom = room
        (room["floor"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull()?.let { selectedFloor = it }
        centroidOf(room)?.let { (lat, lng) ->
            m.animateCamera(
                CameraUpdateFactory.newLatLngZoom(LatLng(lat, lng), 19.0), 700,
            )
        }
    }

    // ── The compose tree ──────────────────────────────────────────────
    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        MapCanvas(
            initialBuildings = buildings,
            initialRooms = rooms,
            initialHallways = hallways,
            initialFloor = selectedFloor,
            onMapReady = { m ->
                mapRef = m
                MapHolder.map = m
            },
            onStyleLoaded = { styleReady = true; AppLog.info("MapScreen", "style ready") },
            onBuildingTap = { b -> selectedBuilding = b; selectedRoom = null },
            onRoomTap = { r -> selectedRoom = r; selectedBuilding = null },
            onCameraIdle = { follow -> if (!follow && followMe) followMe = false },
            onBearingChanged = { mapBearing = it },
            currentBuildings = buildings,
            currentRooms = rooms,
        )

        // NOTE: basemap swap removed in v1.44.0 — satellite tile toggle
        // was the last remaining source of layer-wipe races and the user
        // asked to remove it entirely. Single OSM base only.

        // ── Top search bar + status row ─────────────────────────────
        Column(Modifier.align(Alignment.TopCenter).fillMaxWidth().padding(top = 14.dp)) {
            SearchBar(
                query = searchQuery,
                onQueryChange = { searchQuery = it },
                focused = searchFocused,
                onFocusChange = { searchFocused = it },
                lang = lang,
                onCancel = { searchQuery = ""; searchFocused = false },
            )
            if (searchFocused && searchQuery.isNotBlank()) {
                SearchResults(
                    query = searchQuery,
                    buildings = buildings,
                    rooms = rooms,
                    lang = lang,
                    onBuildingPick = { b ->
                        runCatching { PostHog.capture("map_search_result_selected", properties = mapOf("result_type" to "building")) }
                        selectedBuilding = b; selectedRoom = null
                        searchQuery = ""; searchFocused = false
                        (b["coordinates"] as? JsonObject)?.let { c ->
                            val lat = (c["lat"] as? JsonPrimitive)?.doubleOrNull
                            val lng = (c["lng"] as? JsonPrimitive)?.doubleOrNull
                            if (lat != null && lng != null) mapRef?.animateCamera(
                                CameraUpdateFactory.newLatLngZoom(LatLng(lat, lng), 18.5), 500)
                        }
                    },
                    onRoomPick = { r ->
                        runCatching { PostHog.capture("map_search_result_selected", properties = mapOf("result_type" to "room")) }
                        selectedRoom = r; selectedBuilding = null
                        searchQuery = ""; searchFocused = false
                        (r["floor"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull()
                            ?.let { selectedFloor = it }
                        centroidOf(r)?.let { (lat, lng) ->
                            mapRef?.animateCamera(
                                CameraUpdateFactory.newLatLngZoom(LatLng(lat, lng), 19.0), 500)
                        }
                    },
                )
            }
        }

        // ── Right-side control stack (Apple/MazeMap style) ──────────
        // Two grouped stacks with a small gap: zoom pair on top, then
        // location + refresh below. Each button is a soft pill with a
        // tight drop shadow — matches Apple Maps' iPad control cluster.
        Column(
            Modifier
                .align(Alignment.CenterEnd)
                .padding(end = 12.dp)
                .widthIn(max = 46.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Zoom pair rendered as a single rounded rect with a divider.
            GroupedPill(
                items = listOf(
                    Icons.Outlined.Add to {
                        mapRef?.let { m ->
                            m.animateCamera(
                                CameraUpdateFactory.zoomTo(
                                    (m.cameraPosition.zoom + 1.0).coerceAtMost(21.0),
                                ),
                                220,
                            )
                        }
                    },
                    Icons.Outlined.Remove to {
                        mapRef?.let { m ->
                            m.animateCamera(
                                CameraUpdateFactory.zoomTo(
                                    (m.cameraPosition.zoom - 1.0).coerceAtLeast(12.0),
                                ),
                                220,
                            )
                        }
                    },
                ),
            )
            PillButton(
                icon = Icons.Outlined.MyLocation,
                selected = followMe,
                onClick = {
                    val perm = ContextCompat.checkSelfPermission(
                        ctx, Manifest.permission.ACCESS_FINE_LOCATION,
                    )
                    if (perm == PackageManager.PERMISSION_GRANTED) {
                        followMe = true
                        mapRef?.let { m -> enableLocation(ctx, m) }
                    } else {
                        locationPermission.launch(Manifest.permission.ACCESS_FINE_LOCATION)
                    }
                },
            )
            PillButton(
                icon = Icons.Outlined.Refresh,
                onClick = {
                    dataRetry++
                    MapHolder.autofitDone = false
                    mapRef?.let { m ->
                        boundsOf(buildings)?.let { b ->
                            m.animateCamera(CameraUpdateFactory.newLatLngBounds(b, 80), 500)
                        }
                    }
                },
            )
        }

        // ── Compass — visible only when the map is rotated off north ──
        if (kotlin.math.abs(mapBearing) > 2.0) {
            CompassChip(
                bearing = mapBearing,
                modifier = Modifier.align(Alignment.TopEnd).padding(end = 12.dp, top = 112.dp),
                onClick = {
                    mapRef?.let { m ->
                        val cam = m.cameraPosition
                        m.animateCamera(
                            CameraUpdateFactory.newCameraPosition(
                                CameraPosition.Builder()
                                    .target(cam.target)
                                    .zoom(cam.zoom)
                                    .bearing(0.0)
                                    .tilt(cam.tilt)
                                    .build()
                            ), 400,
                        )
                    }
                },
            )
        }

        // ── Floor selector (left) ───────────────────────────────────
        FloorSelector(
            floors = floorsPresent(rooms, buildings),
            selected = selectedFloor,
            onSelect = { floor ->
                selectedFloor = floor
                runCatching { PostHog.capture("map_floor_selected", properties = mapOf("floor" to floor)) }
            },
            modifier = Modifier.align(Alignment.CenterStart).padding(start = 14.dp),
        )

        // ── Offline chip ────────────────────────────────────────────
        AnimatedVisibility(
            visible = offlineMode,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier.align(Alignment.TopStart).padding(start = 14.dp, top = 84.dp),
        ) {
            OfflineChip(lang = lang, onRetry = { dataRetry++ })
        }

        // ── Current lesson chip (jakso-filtered) ────────────────────
        CurrentLessonChip(
            modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 24.dp),
            onOpen = { roomId ->
                MapNavIntent.pendingRoomId = roomId
            },
            lang = lang,
        )

        // ── Detail sheet (building or room) ─────────────────────────
        val visibleBuilding = selectedBuilding
        val visibleRoom = selectedRoom
        AnimatedVisibility(
            visible = visibleBuilding != null || visibleRoom != null,
            enter = slideInVertically { it } + fadeIn(),
            exit = slideOutVertically { it } + fadeOut(),
            modifier = Modifier.align(Alignment.BottomCenter),
        ) {
            DetailSheet(
                building = visibleBuilding,
                room = visibleRoom,
                lang = lang,
                onDismiss = { selectedBuilding = null; selectedRoom = null },
                onNavigate = { target ->
                    runCatching { PostHog.capture("directions_opened", properties = mapOf("destination_type" to if (visibleRoom != null) "room" else "building")) }
                    destination = target
                    origin = null
                    originIsMyLoc = true
                    selectedBuilding = null
                    selectedRoom = null
                    AppLog.info("MapScreen", "route → ${nameOf(target, lang)}")
                },
            )
        }
    }
}

// ── MapCanvas — pure MapLibre bridge. ───────────────────────────────
@Composable
private fun MapCanvas(
    initialBuildings: List<JsonObject>,
    initialRooms: List<JsonObject>,
    initialHallways: List<JsonObject>,
    initialFloor: Int,
    onMapReady: (MapLibreMap) -> Unit,
    onStyleLoaded: () -> Unit,
    onBuildingTap: (JsonObject) -> Unit,
    onRoomTap: (JsonObject) -> Unit,
    onCameraIdle: (Boolean) -> Unit,
    onBearingChanged: (Double) -> Unit,
    currentBuildings: List<JsonObject>,
    currentRooms: List<JsonObject>,
) {
    val ctx = LocalContext.current
    val bRef by rememberUpdatedState(currentBuildings)
    val rRef by rememberUpdatedState(currentRooms)

    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { context ->
            val holderView = MapHolder.view
            if (holderView != null) return@AndroidView holderView

            val mv = MapView(context)
            MapHolder.view = mv
            mv.onCreate(null)
            mv.getMapAsync { map ->
                MapHolder.map = map
                onMapReady(map)

                // Camera: prefer persisted, then admin server-defaults,
                // then KSYK fallback.
                val persisted = loadPersistedCamera(context)
                val server = loadServerMapDefaults(context)
                val start = CameraPosition.Builder()
                    .target(persisted?.target ?: server?.target ?: KSYK_CENTER)
                    .zoom(persisted?.zoom ?: server?.zoom ?: KSYK_ZOOM)
                    .bearing(server?.bearing ?: 0.0)
                    .tilt(server?.tilt ?: 0.0)
                    .build()
                map.cameraPosition = start

                map.uiSettings.apply {
                    isCompassEnabled = false
                    isLogoEnabled = false
                    isAttributionEnabled = false
                    isRotateGesturesEnabled = true
                    isTiltGesturesEnabled = true
                }

                map.setStyle(Style.Builder().fromJson(STYLE_OSM)) { style ->
                    installCampusLayers(style, initialBuildings, initialRooms, initialHallways, initialFloor)
                    onStyleLoaded()
                }

                map.addOnMapClickListener { latLng ->
                    val proj = map.projection
                    val screen = proj.toScreenLocation(latLng)
                    val padding = 24
                    val roomBox = android.graphics.RectF(
                        screen.x - padding, screen.y - padding,
                        screen.x + padding, screen.y + padding,
                    )
                    val roomHit = map.queryRenderedFeatures(roomBox, LYR_ROOM_FILL)
                        .firstOrNull()?.getStringProperty("id")
                    if (roomHit != null) {
                        rRef.firstOrNull { (it["id"] as? JsonPrimitive)?.contentOrNull == roomHit }
                            ?.let(onRoomTap)
                        return@addOnMapClickListener true
                    }
                    val buildingHit = map.queryRenderedFeatures(roomBox, LYR_BUILDING_FILL)
                        .firstOrNull()?.getStringProperty("id")
                    if (buildingHit != null) {
                        bRef.firstOrNull { (it["id"] as? JsonPrimitive)?.contentOrNull == buildingHit }
                            ?.let(onBuildingTap)
                        return@addOnMapClickListener true
                    }
                    false
                }

                map.addOnCameraIdleListener {
                    val cam = map.cameraPosition
                    savePersistedCamera(
                        context,
                        cam.target?.latitude ?: 0.0,
                        cam.target?.longitude ?: 0.0,
                        cam.zoom, cam.bearing, cam.tilt,
                    )
                    onCameraIdle(false)
                    onBearingChanged(cam.bearing)
                }
                map.addOnCameraMoveListener {
                    onBearingChanged(map.cameraPosition.bearing)
                }
            }
            mv.onStart(); mv.onResume()
            mv
        },
        update = { /* MapView is a singleton — nothing to update. */ },
    )
}

// ── Style installation — all campus layers in one atomic call. ──────
private fun installCampusLayers(
    style: Style,
    buildings: List<JsonObject>,
    rooms: List<JsonObject>,
    hallways: List<JsonObject>,
    floor: Int,
) {
    // Sources.
    listOf(
        SRC_BUILDINGS to buildingsFC(buildings),
        SRC_ROOMS to roomsFC(rooms, floor),
        SRC_HALLWAYS to hallwaysFC(hallways, floor),
        SRC_ROUTE to EMPTY_FC,
        SRC_WIFI_POS to EMPTY_FC,
        SRC_ROOM_SELECTED to EMPTY_FC,
    ).forEach { (id, geo) ->
        if (style.getSource(id) == null) {
            style.addSource(GeoJsonSource(id, geo))
        } else {
            style.getSourceAs<GeoJsonSource>(id)?.setGeoJson(geo)
        }
    }

    // Building fill — warm off-white MazeMap-style (like Apple's "beige
    // building"). Very low saturation so the room categorical colours
    // pop on top without competing.
    if (style.getLayer(LYR_BUILDING_FILL) == null) {
        style.addLayer(
            FillLayer(LYR_BUILDING_FILL, SRC_BUILDINGS).withProperties(
                PropertyFactory.fillColor(AndroidColor.parseColor("#e8ecf2")),
                PropertyFactory.fillOpacity(0.95f),
            )
        )
    }
    if (style.getLayer(LYR_BUILDING_OUTLINE) == null) {
        style.addLayer(
            LineLayer(LYR_BUILDING_OUTLINE, SRC_BUILDINGS).withProperties(
                PropertyFactory.lineColor(AndroidColor.parseColor("#9ca3af")),
                PropertyFactory.lineWidth(1.4f),
                PropertyFactory.lineOpacity(0.85f),
            )
        )
    }
    if (style.getLayer(LYR_BUILDING_LABEL) == null) {
        style.addLayer(
            SymbolLayer(LYR_BUILDING_LABEL, SRC_BUILDINGS).withProperties(
                PropertyFactory.textField(Expression.get("label")),
                PropertyFactory.textFont(arrayOf("Open Sans Regular")),
                PropertyFactory.textSize(13f),
                PropertyFactory.textColor(AndroidColor.parseColor("#1f2937")),
                PropertyFactory.textHaloColor(AndroidColor.parseColor("#ffffff")),
                PropertyFactory.textHaloWidth(1.6f),
                PropertyFactory.textAllowOverlap(false),
                PropertyFactory.textIgnorePlacement(false),
                PropertyFactory.textAnchor(Property.TEXT_ANCHOR_CENTER),
            )
        )
    }

    // Wall lines — drawn under rooms. hallways.json is LineString geometry
    // (actual structural walls), not corridor polygons. Two layers: outer
    // walls (surface="wall", darker, thicker) and inner walls (thinner).
    if (style.getLayer(LYR_WALL_OUTER) == null) {
        style.addLayer(
            LineLayer(LYR_WALL_OUTER, SRC_HALLWAYS).withProperties(
                PropertyFactory.lineColor(AndroidColor.parseColor("#9ca3af")),
                PropertyFactory.lineWidth(2.0f),
                PropertyFactory.lineOpacity(0.90f),
                PropertyFactory.lineCap(Property.LINE_CAP_ROUND),
                PropertyFactory.lineJoin(Property.LINE_JOIN_ROUND),
            ).also {
                it.setFilter(Expression.eq(Expression.get("surface"), Expression.literal("wall")))
            }
        )
    }
    if (style.getLayer(LYR_WALL_INNER) == null) {
        style.addLayer(
            LineLayer(LYR_WALL_INNER, SRC_HALLWAYS).withProperties(
                PropertyFactory.lineColor(AndroidColor.parseColor("#c8cdd6")),
                PropertyFactory.lineWidth(1.2f),
                PropertyFactory.lineOpacity(0.75f),
                PropertyFactory.lineCap(Property.LINE_CAP_ROUND),
                PropertyFactory.lineJoin(Property.LINE_JOIN_ROUND),
            ).also {
                it.setFilter(Expression.eq(Expression.get("surface"), Expression.literal("inner-wall")))
            }
        )
    }

    // Rooms — per-feature colour from the "c" property embedded in the GeoJSON.
    // Using Expression.get("c") instead of Expression.match avoids the
    // Expression.stop issue that caused rooms to render invisibly.
    if (style.getLayer(LYR_ROOM_FILL) == null) {
        style.addLayer(
            FillLayer(LYR_ROOM_FILL, SRC_ROOMS).withProperties(
                PropertyFactory.fillColor(Expression.get("c")),
                PropertyFactory.fillOpacity(0.94f),
            ).also { it.setMinZoom(16.0f) }
        )
    }
    if (style.getLayer(LYR_ROOM_OUTLINE) == null) {
        style.addLayer(
            LineLayer(LYR_ROOM_OUTLINE, SRC_ROOMS).withProperties(
                PropertyFactory.lineColor(AndroidColor.parseColor("#64748b")),
                PropertyFactory.lineWidth(1.0f),
                PropertyFactory.lineOpacity(0.7f),
            ).also { it.setMinZoom(16.0f) }
        )
    }
    // Selected room highlight — semi-transparent fill + solid accent border above rooms.
    if (style.getLayer(LYR_ROOM_SELECTED) == null) {
        style.addLayer(
            FillLayer(LYR_ROOM_SELECTED, SRC_ROOM_SELECTED).withProperties(
                PropertyFactory.fillColor(AndroidColor.parseColor("#2563EB")),
                PropertyFactory.fillOpacity(0.22f),
            ).also { it.setMinZoom(16.0f) }
        )
    }
    if (style.getLayer(LYR_ROOM_SEL_LINE) == null) {
        style.addLayer(
            LineLayer(LYR_ROOM_SEL_LINE, SRC_ROOM_SELECTED).withProperties(
                PropertyFactory.lineColor(AndroidColor.parseColor("#1d4ed8")),
                PropertyFactory.lineWidth(2.5f),
                PropertyFactory.lineOpacity(1.0f),
            ).also { it.setMinZoom(16.0f) }
        )
    }

    if (style.getLayer(LYR_ROOM_LABEL) == null) {
        style.addLayer(
            SymbolLayer(LYR_ROOM_LABEL, SRC_ROOMS).withProperties(
                PropertyFactory.textField(Expression.get("label")),
                PropertyFactory.textFont(arrayOf("Open Sans Regular")),
                PropertyFactory.textSize(11f),
                PropertyFactory.textColor(AndroidColor.parseColor("#1e293b")),
                PropertyFactory.textHaloColor(AndroidColor.parseColor("#ffffff")),
                PropertyFactory.textHaloWidth(1.5f),
                PropertyFactory.textAllowOverlap(false),
                PropertyFactory.textIgnorePlacement(false),
                PropertyFactory.textAnchor(Property.TEXT_ANCHOR_CENTER),
            ).also { it.setMinZoom(17.5f) }
        )
    }

    // Route.
    if (style.getLayer(LYR_ROUTE_CASING) == null) {
        style.addLayer(
            LineLayer(LYR_ROUTE_CASING, SRC_ROUTE).withProperties(
                PropertyFactory.lineColor(AndroidColor.parseColor("#FFFFFF")),
                PropertyFactory.lineWidth(9f),
                PropertyFactory.lineOpacity(0.9f),
                PropertyFactory.lineCap(Property.LINE_CAP_ROUND),
                PropertyFactory.lineJoin(Property.LINE_JOIN_ROUND),
            )
        )
    }
    if (style.getLayer(LYR_ROUTE_LINE) == null) {
        style.addLayer(
            LineLayer(LYR_ROUTE_LINE, SRC_ROUTE).withProperties(
                PropertyFactory.lineColor(AndroidColor.parseColor("#2563EB")),
                PropertyFactory.lineWidth(5f),
                PropertyFactory.lineOpacity(0.95f),
                PropertyFactory.lineCap(Property.LINE_CAP_ROUND),
                PropertyFactory.lineJoin(Property.LINE_JOIN_ROUND),
            )
        )
    }

    // Wi-Fi puck — halo + dot.
    // (Circle layer would be nicer but requires source-is-point.
    //  Symbol is fine and doesn't require an image if we omit iconImage.)
    // Skipping halo/dot layers here since circle layer needs point features;
    // wifiPuckFC returns point features so we add a CircleLayer explicitly.
    if (style.getLayer(LYR_WIFI_HALO) == null) {
        style.addLayer(
            org.maplibre.android.style.layers.CircleLayer(LYR_WIFI_HALO, SRC_WIFI_POS).withProperties(
                PropertyFactory.circleRadius(20f),
                PropertyFactory.circleColor(AndroidColor.parseColor("#2563EB")),
                PropertyFactory.circleOpacity(0.15f),
            )
        )
    }
    if (style.getLayer(LYR_WIFI_DOT) == null) {
        style.addLayer(
            org.maplibre.android.style.layers.CircleLayer(LYR_WIFI_DOT, SRC_WIFI_POS).withProperties(
                PropertyFactory.circleRadius(7f),
                PropertyFactory.circleColor(AndroidColor.parseColor("#2563EB")),
                PropertyFactory.circleStrokeColor(AndroidColor.parseColor("#FFFFFF")),
                PropertyFactory.circleStrokeWidth(2.5f),
            )
        )
    }
}

// ── FeatureCollection builders (raw JSON — no external dependencies). ─
private fun buildingsFC(buildings: List<JsonObject>): String {
    val features = JSONArray()
    for (b in buildings) {
        val id = (b["id"] as? JsonPrimitive)?.contentOrNull ?: continue
        val label = shortName(b)
        val pts = (b["points"] as? JsonArray)?.mapNotNull { p ->
            val po = p as? JsonObject ?: return@mapNotNull null
            val lat = (po["lat"] as? JsonPrimitive)?.doubleOrNull ?: return@mapNotNull null
            val lng = (po["lng"] as? JsonPrimitive)?.doubleOrNull ?: return@mapNotNull null
            doubleArrayOf(lng, lat)
        } ?: emptyList()
        if (pts.size < 3) continue
        // Auto-close ring.
        val ring = JSONArray()
        pts.forEach { ring.put(JSONArray().put(it[0]).put(it[1])) }
        if (pts[0] !== pts.last()) ring.put(JSONArray().put(pts[0][0]).put(pts[0][1]))
        val poly = JSONArray().put(ring)
        val geom = JSONObject().put("type", "Polygon").put("coordinates", poly)
        val props = JSONObject().put("id", id).put("label", label)
        features.put(JSONObject().put("type", "Feature").put("geometry", geom).put("properties", props))
    }
    return JSONObject().put("type", "FeatureCollection").put("features", features).toString()
}

private fun roomsFC(rooms: List<JsonObject>, floor: Int): String {
    val features = JSONArray()
    for (r in rooms) {
        val f = (r["floor"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() ?: 1
        if (f != floor) continue
        val id = (r["id"] as? JsonPrimitive)?.contentOrNull ?: continue
        val label = roomLabel(r)
        val type = (r["type"] as? JsonPrimitive)?.contentOrNull ?: ""
        val colorHex = roomColorHex(type)
        val pts = (r["points"] as? JsonArray)?.mapNotNull { p ->
            val po = p as? JsonObject ?: return@mapNotNull null
            val lat = (po["lat"] as? JsonPrimitive)?.doubleOrNull ?: return@mapNotNull null
            val lng = (po["lng"] as? JsonPrimitive)?.doubleOrNull ?: return@mapNotNull null
            doubleArrayOf(lng, lat)
        } ?: emptyList()
        if (pts.size < 3) continue
        val ring = JSONArray()
        pts.forEach { ring.put(JSONArray().put(it[0]).put(it[1])) }
        if (pts[0] !== pts.last()) ring.put(JSONArray().put(pts[0][0]).put(pts[0][1]))
        val poly = JSONArray().put(ring)
        val geom = JSONObject().put("type", "Polygon").put("coordinates", poly)
        // Embed the fill colour in the feature so Expression.get("c") can
        // drive PropertyFactory.fillColor — avoids Expression.match/stop which
        // can silently produce invisible layers in some MapLibre Android builds.
        val props = JSONObject().put("id", id).put("label", label).put("type", type).put("c", colorHex)
        features.put(JSONObject().put("type", "Feature").put("geometry", geom).put("properties", props))
    }
    return JSONObject().put("type", "FeatureCollection").put("features", features).toString()
}

private fun hallwaysFC(hallways: List<JsonObject>, floor: Int): String {
    val features = JSONArray()
    for (h in hallways) {
        // null floor = structural wall visible on every floor
        val wallFloor = (h["floor"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull()
        if (wallFloor != null && wallFloor != floor) continue
        val surface = (h["surface"] as? JsonPrimitive)?.contentOrNull ?: "wall"
        val pts = (h["points"] as? JsonArray)?.mapNotNull { p ->
            val po = p as? JsonObject ?: return@mapNotNull null
            val lat = (po["lat"] as? JsonPrimitive)?.doubleOrNull ?: return@mapNotNull null
            val lng = (po["lng"] as? JsonPrimitive)?.doubleOrNull ?: return@mapNotNull null
            doubleArrayOf(lng, lat)
        } ?: emptyList()
        if (pts.size < 2) continue
        val coords = JSONArray()
        pts.forEach { coords.put(JSONArray().put(it[0]).put(it[1])) }
        val geom = JSONObject().put("type", "LineString").put("coordinates", coords)
        val props = JSONObject().put("surface", surface)
        features.put(JSONObject().put("type", "Feature").put("geometry", geom).put("properties", props))
    }
    return JSONObject().put("type", "FeatureCollection").put("features", features).toString()
}

private fun routeFC(from: LatLng, to: LatLng): String {
    val coords = JSONArray()
        .put(JSONArray().put(from.longitude).put(from.latitude))
        .put(JSONArray().put(to.longitude).put(to.latitude))
    val geom = JSONObject().put("type", "LineString").put("coordinates", coords)
    val feat = JSONObject().put("type", "Feature").put("geometry", geom).put("properties", JSONObject())
    return JSONObject().put("type", "FeatureCollection")
        .put("features", JSONArray().put(feat)).toString()
}

private fun wifiPuckFC(lat: Double, lng: Double): String {
    val geom = JSONObject().put("type", "Point")
        .put("coordinates", JSONArray().put(lng).put(lat))
    val feat = JSONObject().put("type", "Feature").put("geometry", geom).put("properties", JSONObject())
    return JSONObject().put("type", "FeatureCollection")
        .put("features", JSONArray().put(feat)).toString()
}

private fun selectedRoomFC(room: JsonObject): String {
    val pts = (room["points"] as? JsonArray)?.mapNotNull { p ->
        val po = p as? JsonObject ?: return@mapNotNull null
        val lat = (po["lat"] as? JsonPrimitive)?.doubleOrNull ?: return@mapNotNull null
        val lng = (po["lng"] as? JsonPrimitive)?.doubleOrNull ?: return@mapNotNull null
        doubleArrayOf(lng, lat)
    } ?: emptyList()
    if (pts.size < 3) return EMPTY_FC
    val ring = JSONArray()
    pts.forEach { ring.put(JSONArray().put(it[0]).put(it[1])) }
    ring.put(JSONArray().put(pts[0][0]).put(pts[0][1]))
    val poly = JSONArray().put(ring)
    val geom = JSONObject().put("type", "Polygon").put("coordinates", poly)
    val feat = JSONObject().put("type", "Feature").put("geometry", geom).put("properties", JSONObject())
    return JSONObject().put("type", "FeatureCollection").put("features", JSONArray().put(feat)).toString()
}

// ── Small helpers ────────────────────────────────────────────────────
private fun readBundled(ctx: android.content.Context, name: String): List<JsonObject> {
    return try {
        val text = ctx.assets.open("snapshot/$name.json").bufferedReader().use { it.readText() }
        val json = kotlinx.serialization.json.Json.parseToJsonElement(text)
        json.jsonArray.mapNotNull { it as? JsonObject }
    } catch (t: Throwable) {
        AppLog.warn("MapScreen", "bundled read $name failed: ${t.message?.take(60)}")
        emptyList()
    }
}

private fun countPolyRoomsOnFloor(rooms: List<JsonObject>, floor: Int): Int =
    rooms.count { r ->
        val f = (r["floor"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() ?: 1
        val pts = r["points"] as? JsonArray
        f == floor && pts != null && pts.size >= 3
    }

private fun floorsPresent(rooms: List<JsonObject>, buildings: List<JsonObject>): List<Int> {
    val fromRooms = rooms.mapNotNull { (it["floor"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() }.toSet()
    if (fromRooms.isNotEmpty()) return fromRooms.sorted()
    // Fall back to building floor ranges.
    val out = mutableSetOf<Int>()
    for (b in buildings) {
        val min = (b["floorMin"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() ?: 1
        val max = (b["floorMax"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull()
            ?: (b["floors"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() ?: 1
        for (i in min..max) out.add(i)
    }
    return if (out.isEmpty()) listOf(1) else out.sorted()
}

private fun boundsOf(buildings: List<JsonObject>): LatLngBounds? {
    val pts = buildings.flatMap { b ->
        (b["points"] as? JsonArray)?.mapNotNull { p ->
            val po = p as? JsonObject ?: return@mapNotNull null
            val lat = (po["lat"] as? JsonPrimitive)?.doubleOrNull ?: return@mapNotNull null
            val lng = (po["lng"] as? JsonPrimitive)?.doubleOrNull ?: return@mapNotNull null
            LatLng(lat, lng)
        } ?: emptyList()
    }
    if (pts.size < 2) return null
    return LatLngBounds.Builder().apply { pts.forEach { include(it) } }.build()
}

private fun centroidOf(obj: JsonObject): Pair<Double, Double>? {
    val pts = (obj["points"] as? JsonArray)?.mapNotNull { p ->
        val po = p as? JsonObject ?: return@mapNotNull null
        val lat = (po["lat"] as? JsonPrimitive)?.doubleOrNull ?: return@mapNotNull null
        val lng = (po["lng"] as? JsonPrimitive)?.doubleOrNull ?: return@mapNotNull null
        lat to lng
    }
    if (!pts.isNullOrEmpty()) {
        val lat = pts.sumOf { it.first } / pts.size
        val lng = pts.sumOf { it.second } / pts.size
        return lat to lng
    }
    val c = obj["coordinates"] as? JsonObject
    val lat = (c?.get("lat") as? JsonPrimitive)?.doubleOrNull
    val lng = (c?.get("lng") as? JsonPrimitive)?.doubleOrNull
    return if (lat != null && lng != null) lat to lng else null
}

private fun shortName(b: JsonObject): String {
    val name = (b["name"] as? JsonPrimitive)?.contentOrNull.orEmpty()
    return name.take(8)
}

private fun nameOf(obj: JsonObject, lang: String): String {
    val key = if (lang == "fi") "nameFi" else "nameEn"
    val localised = (obj[key] as? JsonPrimitive)?.contentOrNull
    if (!localised.isNullOrBlank()) return localised
    return (obj["name"] as? JsonPrimitive)?.contentOrNull.orEmpty()
}

private fun roomLabel(r: JsonObject): String {
    val number = (r["roomNumber"] as? JsonPrimitive)?.contentOrNull
    val name = (r["name"] as? JsonPrimitive)?.contentOrNull
    return listOfNotNull(number, name).joinToString(" ").ifBlank { "?" }
}

private fun enableLocation(ctx: android.content.Context, map: MapLibreMap) {
    val perm = ContextCompat.checkSelfPermission(ctx, Manifest.permission.ACCESS_FINE_LOCATION)
    if (perm != PackageManager.PERMISSION_GRANTED) return
    val style = map.style ?: return
    try {
        val comp = map.locationComponent
        comp.activateLocationComponent(
            LocationComponentActivationOptions.builder(ctx, style).build()
        )
        @Suppress("MissingPermission")
        comp.isLocationComponentEnabled = true
        comp.cameraMode = CameraMode.TRACKING
        comp.renderMode = RenderMode.COMPASS
    } catch (t: Throwable) {
        AppLog.warn("MapScreen", "location init failed: ${t.message?.take(60)}")
    }
}

// ── UI atoms — Apple/MazeMap-flavoured ────────────────────────────
// Soft off-white surface + tight drop shadow + rounded 12 dp square is
// how iPadOS Maps renders its floating buttons. We match that so the
// whole map surface reads as a native iOS panel, not a Material chip.
@Composable
private fun PillButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    selected: Boolean = false,
    onClick: () -> Unit,
) {
    val shape = RoundedCornerShape(12.dp)
    val bg = if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f)
    else MaterialTheme.colorScheme.surface
    val fg = if (selected) MaterialTheme.colorScheme.primary
    else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.85f)
    Box(
        modifier = Modifier
            .size(44.dp)
            .shadow(6.dp, shape, spotColor = Color(0x40000000))
            .clip(shape)
            .background(bg)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = fg, modifier = Modifier.size(20.dp))
    }
}

/**
 * Two-item vertical stack rendered as one rounded rectangle with a hair
 * divider — Apple Maps uses this for the +/- zoom pair. Keeps the
 * cluster visually tight without collapsing the tap targets.
 */
@Composable
private fun GroupedPill(
    items: List<Pair<androidx.compose.ui.graphics.vector.ImageVector, () -> Unit>>,
) {
    val shape = RoundedCornerShape(12.dp)
    Column(
        Modifier
            .width(44.dp)
            .shadow(6.dp, shape, spotColor = Color(0x40000000))
            .clip(shape)
            .background(MaterialTheme.colorScheme.surface),
    ) {
        items.forEachIndexed { i, (icon, action) ->
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(42.dp)
                    .clickable(onClick = action),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    icon, null,
                    tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.85f),
                    modifier = Modifier.size(20.dp),
                )
            }
            if (i < items.size - 1) {
                androidx.compose.foundation.layout.Box(
                    Modifier
                        .fillMaxWidth()
                        .height(1.dp)
                        .background(MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                )
            }
        }
    }
}

@Composable
private fun CompassChip(
    bearing: Double,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val shape = RoundedCornerShape(12.dp)
    Box(
        modifier = modifier
            .size(44.dp)
            .shadow(6.dp, shape, spotColor = Color(0x40000000))
            .clip(shape)
            .background(MaterialTheme.colorScheme.surface)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            Icons.Outlined.Navigation,
            contentDescription = "Reset north",
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(22.dp).rotate((-bearing).toFloat()),
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SearchBar(
    query: String,
    onQueryChange: (String) -> Unit,
    focused: Boolean,
    onFocusChange: (Boolean) -> Unit,
    lang: String,
    onCancel: () -> Unit,
) {
    // Apple-Maps-style capsule: 22 dp corner radius, subtle border, a
    // shadow just faint enough to lift it off the map. Padding is tuned
    // so the text field's own vertical inset lines up with the icons.
    Row(
        Modifier
            .padding(horizontal = 12.dp)
            .fillMaxWidth()
            .shadow(8.dp, RoundedCornerShape(22.dp), spotColor = Color(0x33000000))
            .clip(RoundedCornerShape(22.dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(horizontal = 12.dp, vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            Icons.Outlined.Search, null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(20.dp),
        )
        Spacer(Modifier.width(8.dp))
        TextField(
            value = query,
            onValueChange = { onQueryChange(it); onFocusChange(true) },
            placeholder = {
                Text(
                    if (lang == "fi") "Etsi luokka tai rakennus" else "Search room or building",
                    fontSize = 14.sp,
                )
            },
            singleLine = true,
            modifier = Modifier.weight(1f).onFocusChanged { onFocusChange(it.isFocused) },
            textStyle = androidx.compose.ui.text.TextStyle(
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurface,
            ),
            colors = TextFieldDefaults.colors(
                focusedContainerColor = Color.Transparent,
                unfocusedContainerColor = Color.Transparent,
                focusedIndicatorColor = Color.Transparent,
                unfocusedIndicatorColor = Color.Transparent,
                disabledIndicatorColor = Color.Transparent,
            ),
        )
        if (focused || query.isNotBlank()) {
            Box(
                Modifier
                    .size(28.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.surfaceVariant)
                    .clickable(onClick = onCancel),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Outlined.Close, null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(16.dp),
                )
            }
        }
    }
}

@Composable
private fun SearchResults(
    query: String,
    buildings: List<JsonObject>,
    rooms: List<JsonObject>,
    lang: String,
    onBuildingPick: (JsonObject) -> Unit,
    onRoomPick: (JsonObject) -> Unit,
) {
    val q = query.trim().lowercase()
    val roomHits = rooms.filter { r ->
        val label = roomLabel(r).lowercase()
        val name = (r["name"] as? JsonPrimitive)?.contentOrNull?.lowercase().orEmpty()
        val num = (r["roomNumber"] as? JsonPrimitive)?.contentOrNull?.lowercase().orEmpty()
        label.contains(q) || name.contains(q) || num.contains(q)
    }.take(15)
    val buildingHits = buildings.filter { b ->
        val name = nameOf(b, lang).lowercase()
        val short = shortName(b).lowercase()
        name.contains(q) || short.contains(q)
    }.take(8)

    Box(
        Modifier
            .padding(horizontal = 14.dp)
            .padding(top = 8.dp)
            .fillMaxWidth()
            .heightIn(max = 320.dp)
            .shadow(4.dp, RoundedCornerShape(16.dp))
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surface),
    ) {
        LazyColumn(Modifier.padding(vertical = 6.dp)) {
            if (roomHits.isNotEmpty()) {
                item { SectionHead(if (lang == "fi") "Luokat" else "Rooms") }
                items(roomHits, key = { (it["id"] as JsonPrimitive).content }) { r ->
                    SearchRow(
                        primary = roomLabel(r),
                        secondary = (r["type"] as? JsonPrimitive)?.contentOrNull ?: "",
                        onClick = { onRoomPick(r) },
                    )
                }
            }
            if (buildingHits.isNotEmpty()) {
                item { SectionHead(if (lang == "fi") "Rakennukset" else "Buildings") }
                items(buildingHits, key = { (it["id"] as JsonPrimitive).content }) { b ->
                    SearchRow(
                        primary = nameOf(b, lang).ifBlank { shortName(b) },
                        secondary = shortName(b),
                        onClick = { onBuildingPick(b) },
                    )
                }
            }
            if (roomHits.isEmpty() && buildingHits.isEmpty()) {
                item {
                    Text(
                        text = if (lang == "fi") "Ei osumia" else "No matches",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(16.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun SectionHead(text: String) {
    Text(
        text.uppercase(),
        fontSize = 11.sp,
        fontWeight = FontWeight.SemiBold,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp),
    )
}

@Composable
private fun SearchRow(primary: String, secondary: String, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Outlined.LocationOn, null, tint = MaterialTheme.colorScheme.primary)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(primary, fontWeight = FontWeight.Medium)
            if (secondary.isNotBlank()) {
                Text(secondary, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun FloorSelector(
    floors: List<Int>,
    selected: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (floors.size <= 1) return
    Column(
        modifier
            .shadow(4.dp, RoundedCornerShape(14.dp))
            .clip(RoundedCornerShape(14.dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(vertical = 4.dp, horizontal = 4.dp),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        floors.asReversed().forEach { f ->
            val isSel = f == selected
            Box(
                Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(
                        if (isSel) MaterialTheme.colorScheme.primaryContainer else Color.Transparent
                    )
                    .clickable { onSelect(f) },
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    "$f",
                    fontWeight = if (isSel) FontWeight.Bold else FontWeight.Medium,
                    color = if (isSel) MaterialTheme.colorScheme.onPrimaryContainer
                    else MaterialTheme.colorScheme.onSurface,
                )
            }
        }
    }
}

@Composable
private fun OfflineChip(lang: String, onRetry: () -> Unit) {
    Row(
        Modifier
            .shadow(3.dp, RoundedCornerShape(20.dp))
            .clip(RoundedCornerShape(20.dp))
            .background(MaterialTheme.colorScheme.errorContainer)
            .clickable(onClick = onRetry)
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            Icons.Outlined.CloudOff, null,
            tint = MaterialTheme.colorScheme.onErrorContainer,
            modifier = Modifier.size(16.dp),
        )
        Spacer(Modifier.width(6.dp))
        Text(
            if (lang == "fi") "Offline — napauta yrittääksesi" else "Offline — tap to retry",
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onErrorContainer,
        )
    }
}

@Composable
private fun DetailSheet(
    building: JsonObject?,
    room: JsonObject?,
    lang: String,
    onDismiss: () -> Unit,
    onNavigate: (JsonObject) -> Unit,
) {
    val target = room ?: building ?: return
    Column(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 14.dp)
            .shadow(10.dp, RoundedCornerShape(20.dp))
            .clip(RoundedCornerShape(20.dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(18.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    text = if (room != null) roomLabel(target)
                    else nameOf(target, lang).ifBlank { shortName(target) },
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(Modifier.height(2.dp))
                val subtitle = if (room != null) {
                    val type = (room["type"] as? JsonPrimitive)?.contentOrNull ?: ""
                    val floor = (room["floor"] as? JsonPrimitive)?.contentOrNull ?: ""
                    listOf(type, if (floor.isNotBlank()) "kerros $floor" else "")
                        .filter { it.isNotBlank() }.joinToString(" · ")
                } else {
                    (building?.get("nameFi") as? JsonPrimitive)?.contentOrNull ?: ""
                }
                if (subtitle.isNotBlank()) {
                    Text(subtitle, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            IconButton(onClick = onDismiss) {
                Icon(Icons.Outlined.Close, contentDescription = if (lang == "fi") "Sulje" else "Close")
            }
        }
        Spacer(Modifier.height(14.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilledTonalButton(onClick = { onNavigate(target) }, modifier = Modifier.weight(1f)) {
                Icon(
                    Icons.AutoMirrored.Outlined.DirectionsWalk, null, modifier = Modifier.size(18.dp),
                )
                Spacer(Modifier.width(6.dp))
                Text(if (lang == "fi") "Suunnista tänne" else "Directions")
            }
        }
    }
}

@Composable
private fun MapInitFailedFallback(lang: String) {
    Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                Icons.Outlined.LocationOn, null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(48.dp),
            )
            Spacer(Modifier.height(12.dp))
            Text(
                if (lang == "fi") "Karttaa ei voitu ladata tällä laitteella."
                else "The map could not be loaded on this device.",
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                if (lang == "fi") "Käynnistä sovellus uudelleen tai päivitä laitteen käyttöjärjestelmä."
                else "Restart the app or update your device OS.",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

// ── Current lesson chip — shows the CURRENT lesson for THIS jakso. ───
@Composable
private fun CurrentLessonChip(
    modifier: Modifier = Modifier,
    onOpen: (roomId: String) -> Unit,
    lang: String,
) {
    val ctx = LocalContext.current
    var chipText by remember { mutableStateOf<String?>(null) }
    var chipRoom by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) {
        try {
            val entries = withContext(Dispatchers.IO) { loadEntries(ctx) }
            val active = withContext(Dispatchers.IO) { activeJaksoId(loadJaksot(ctx)) }
            val now = java.time.LocalTime.now()
            val dow = java.time.LocalDate.now().dayOfWeek.value
            val current = entries.firstOrNull { e ->
                val ej = e.jaksoId.ifBlank { "all" }
                val inJakso = active == null || ej == "all" || ej == active
                val start = parseHhmm(e.startHhmm)
                val end = parseHhmm(e.endHhmm)
                inJakso && e.dayOfWeek == dow && start != null && end != null &&
                    !now.isBefore(start) && now.isBefore(end)
            }
            if (current != null) {
                val where = current.roomNumber.ifBlank { current.teacher }
                chipText = if (where.isBlank()) current.subject
                    else "${current.subject} — $where"
                chipRoom = current.roomId
            }
        } catch (t: Throwable) {
            AppLog.warn("MapScreen", "lessonChip failed: ${t.message?.take(60)}")
        }
    }
    if (chipText == null) return
    Row(
        modifier
            .shadow(6.dp, RoundedCornerShape(18.dp))
            .clip(RoundedCornerShape(18.dp))
            .background(MaterialTheme.colorScheme.primary)
            .clickable { chipRoom?.let(onOpen) }
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            Icons.Outlined.Navigation, null,
            tint = MaterialTheme.colorScheme.onPrimary,
            modifier = Modifier.size(18.dp),
        )
        Spacer(Modifier.width(8.dp))
        Text(
            chipText!!,
            color = MaterialTheme.colorScheme.onPrimary,
            fontWeight = FontWeight.Medium,
            fontSize = 13.sp,
        )
    }
}

private fun parseHhmm(s: String): java.time.LocalTime? = try {
    val (h, m) = s.split(":").map { it.toInt() }
    java.time.LocalTime.of(h, m)
} catch (_: Throwable) { null }

// ── Camera persistence — copied unchanged from the previous version. ──
private const val CAM_PREFS = "ksyk_map_camera"

data class PersistedCamera(
    val target: LatLng,
    val zoom: Double,
    val bearing: Double,
    val tilt: Double,
)

private fun loadPersistedCamera(ctx: android.content.Context): PersistedCamera? {
    val sp = ctx.getSharedPreferences(CAM_PREFS, android.content.Context.MODE_PRIVATE)
    if (!sp.contains("lat")) return null
    val lat = sp.getFloat("lat", Float.NaN).toDouble()
    val lng = sp.getFloat("lng", Float.NaN).toDouble()
    val zoom = sp.getFloat("zoom", Float.NaN).toDouble()
    val bearing = sp.getFloat("bearing", 0f).toDouble()
    val tilt = sp.getFloat("tilt", 0f).toDouble()
    if (lat.isNaN() || lng.isNaN() || zoom.isNaN()) return null
    if (Math.abs(lat) > 85 || Math.abs(lng) > 180) return null
    if (zoom < 0 || zoom > 24) return null
    return PersistedCamera(LatLng(lat, lng), zoom, bearing, tilt)
}

private fun savePersistedCamera(
    ctx: android.content.Context,
    lat: Double, lng: Double, zoom: Double, bearing: Double, tilt: Double,
) {
    if (Math.abs(lat) > 85 || Math.abs(lng) > 180) return
    val sp = ctx.getSharedPreferences(CAM_PREFS, android.content.Context.MODE_PRIVATE)
    sp.edit()
        .putFloat("lat", lat.toFloat())
        .putFloat("lng", lng.toFloat())
        .putFloat("zoom", zoom.toFloat())
        .putFloat("bearing", bearing.toFloat())
        .putFloat("tilt", tilt.toFloat())
        .apply()
}

private const val SERVER_CAM_PREFS = "ksyk_server_map"

fun loadServerMapDefaults(ctx: android.content.Context): PersistedCamera? {
    val sp = ctx.getSharedPreferences(SERVER_CAM_PREFS, android.content.Context.MODE_PRIVATE)
    if (!sp.contains("lat")) return null
    val lat = sp.getFloat("lat", Float.NaN).toDouble()
    val lng = sp.getFloat("lng", Float.NaN).toDouble()
    val zoom = sp.getFloat("zoom", Float.NaN).toDouble()
    val bearing = sp.getFloat("bearing", 0f).toDouble()
    val tilt = sp.getFloat("tilt", 0f).toDouble()
    if (lat.isNaN() || lng.isNaN() || zoom.isNaN()) return null
    if (Math.abs(lat) > 85 || Math.abs(lng) > 180) return null
    if (zoom < 0 || zoom > 24) return null
    return PersistedCamera(LatLng(lat, lng), zoom, bearing, tilt)
}

suspend fun refreshServerMapDefaults(ctx: android.content.Context) {
    try {
        val json = Api.get("/settings")
        val obj = json.jsonObject
        fun n(k: String): Double? = (obj[k] as? JsonPrimitive)?.doubleOrNull
            ?: (obj[k] as? JsonPrimitive)?.contentOrNull?.toDoubleOrNull()
        val lat = n("mobileCenterLat") ?: n("osmCenterLat") ?: return
        val lng = n("mobileCenterLng") ?: n("osmCenterLng") ?: return
        val zoom = n("mobileDefaultZoom") ?: n("osmDefaultZoom") ?: 17.5
        val bearing = n("mobileRotationDeg") ?: n("osmRotationDeg") ?: 0.0
        val tilt = n("mobilePitchDeg") ?: n("osmPitchDeg") ?: 0.0
        if (Math.abs(lat) > 85 || Math.abs(lng) > 180) return
        ctx.getSharedPreferences(SERVER_CAM_PREFS, android.content.Context.MODE_PRIVATE)
            .edit()
            .putFloat("lat", lat.toFloat())
            .putFloat("lng", lng.toFloat())
            .putFloat("zoom", zoom.toFloat())
            .putFloat("bearing", bearing.toFloat())
            .putFloat("tilt", tilt.toFloat())
            .apply()
    } catch (_: Throwable) { }
}
