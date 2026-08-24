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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Business
import androidx.compose.material.icons.outlined.CloudOff
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.outlined.Layers
import androidx.compose.material.icons.automirrored.outlined.DirectionsWalk
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.MeetingRoom
import androidx.compose.material.icons.outlined.MyLocation
import androidx.compose.material.icons.outlined.Navigation
import androidx.compose.material.icons.outlined.Remove
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.ViewInAr
import androidx.compose.material.icons.outlined.Wifi
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import fi.ksykmaps.data.Api
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
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
import org.maplibre.android.style.layers.FillExtrusionLayer
import org.maplibre.android.style.layers.FillLayer
import org.maplibre.android.style.layers.LineLayer
import org.maplibre.android.style.layers.Property
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
// Extrusion — 3D block per building footprint. Height derives from
// `floors * METERS_PER_FLOOR` (3 m per floor, MazeMap-adjacent) so
// buildings read as real volumes once pitch > 0.
private const val LAYER_BUILDING_EXTRUSION = "campus-buildings-extrusion"

private const val SRC_ROOMS = "campus-rooms"
private const val LAYER_ROOM_FILL = "campus-rooms-fill"
private const val LAYER_ROOM_OUTLINE = "campus-rooms-outline"
private const val LAYER_ROOM_LABEL = "campus-rooms-label"
// Extrusion — raised room slab, per floor. Base = floor * 3 m, height
// = base + 0.35 m (ROOM_SLAB). Reads as MazeMap-style raised platforms.
private const val LAYER_ROOM_EXTRUSION = "campus-rooms-extrusion"

// v1.7.0 — doors + walls
private const val SRC_DOORS = "campus-doors"
private const val LAYER_DOORS_CHIP = "campus-doors-chip"
private const val SRC_WALLS = "campus-walls"
private const val LAYER_WALLS_LINE = "campus-walls-line"

private const val METERS_PER_FLOOR = 3.0
private const val ROOM_SLAB_METERS = 0.35

// Route line — a single blue LineString drawn from the origin centroid
// (or the current GPS puck) to the destination centroid. We refresh
// the source whenever origin/destination changes.
private const val SRC_ROUTE = "nav-route"
private const val LAYER_ROUTE_LINE = "nav-route-line"
private const val LAYER_ROUTE_CASING = "nav-route-casing"

// Wi-Fi position puck — a pulsing blue circle that shows the estimated
// indoor position. Separate from the GPS LocationComponent so it works
// even without GPS permission (Wi-Fi only).
private const val SRC_WIFI_POS = "wifi-position"
private const val LAYER_WIFI_POS_HALO = "wifi-position-halo"
private const val LAYER_WIFI_POS_DOT = "wifi-position-dot"
private const val WALKING_MPS = 1.35

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

// Singleton holder — keeps the MapView (and its GL context) alive across
// tab switches. NavHost destroys and recreates MapScreen on every visit,
// but destroying the MapView kills the GL thread and crashes MapLibre.
private object MapViewHolder {
    var view: MapView? = null
    var map: MapLibreMap? = null
}
// Delegating callbacks — updated by SideEffect on every recomposition so
// the singleton click/camera listeners always read current Compose state.
private var mapClickDelegate: ((LatLng) -> Boolean) = { _ -> false }
private var cameraIdleDelegate: (() -> Unit) = {}
private var cameraMovedDelegate: (() -> Unit) = {}

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
    var rooms by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var doors by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var hallways by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var selectedFloor by remember { mutableStateOf<Int?>(null) }
    var selected by remember { mutableStateOf<JsonObject?>(null) }
    var selectedRoom by remember { mutableStateOf<JsonObject?>(null) }
    var offlineMode by remember { mutableStateOf(false) }
    var mapRef by remember { mutableStateOf<MapLibreMap?>(null) }
    // Restore mapRef from singleton when returning to the map tab after a
    // tab switch. NavHost recreates MapScreen but MapViewHolder keeps the
    // live MapLibreMap object, so we just hand it back to local state and
    // let all LaunchedEffect(mapRef) blocks re-fire naturally.
    LaunchedEffect(Unit) {
        MapViewHolder.map?.let { if (mapRef == null) mapRef = it }
    }
    var followMe by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    var searchFocused by remember { mutableStateOf(false) }
    // v1.5.0 — 3D toggle. On → pitch tilts to ~50°, extrusion layers
    // become visible, buildings and room slabs read as real volumes.
    // Off → flat top-down, extrusions hidden, only fill layers show.
    var is3D by remember { mutableStateOf(false) }
    // v1.6.0 — first-run detection so we only auto-fit to buildings
    // on the very first data load per session. Otherwise the fit
    // would fight the restored persisted camera / user's pans.
    var hasAutoFitOnce by remember { mutableStateOf(loadPersistedCamera(ctx) != null) }
    // v1.8.0 — track current map bearing for the compass chip. Camera-
    // idle updates this so the compass arrow visibly rotates as the
    // user drags the map with two fingers.
    var currentBearing by remember { mutableStateOf(0.0) }
    // Directions state — MazeMap-adjacent "from → to" routing.
    //   destination = target room/building (set by "Suunnista tänne")
    //   origin      = start room (set by picker), null = use GPS
    //   originIsMyLocation = we should use the current puck instead of
    //                        a room centroid; forces the location
    //                        component on and refreshes the line as the
    //                        user walks.
    //   searchMode  = ORIGIN → next search pick becomes origin, not sheet
    //   showStartPicker = card asking "Lähtöpaikka?" is up
    var destination by remember { mutableStateOf<JsonObject?>(null) }
    var origin by remember { mutableStateOf<JsonObject?>(null) }
    var originIsMyLocation by remember { mutableStateOf(false) }
    var myLocation by remember { mutableStateOf<LatLng?>(null) }
    var searchMode by remember { mutableStateOf(SearchMode.NONE) }
    var showStartPicker by remember { mutableStateOf(false) }

    // Wi-Fi indoor positioning state.
    val wifiPosition by WifiPositioning.position.collectAsState()
    val wifiApCount  by WifiPositioning.scanCount.collectAsState()

    val locationPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            followMe = true
            mapRef?.let { enableLocation(ctx, it) }
        }
    }

    LaunchedEffect(Unit) {
        // Buildings first — they're usually smaller and the map should
        // frame the campus even if the rooms fetch is slow.
        try {
            val json = withContext(Dispatchers.IO) { Api.get("/buildings") }
            buildings = json.jsonArray.mapNotNull { it as? JsonObject }
            offlineMode = false
        } catch (_: Exception) {
            val cached = Api.getOffline("/buildings")
            if (cached != null) {
                buildings = cached.jsonArray.mapNotNull { it as? JsonObject }
                offlineMode = true
            }
        }
        try {
            val json = withContext(Dispatchers.IO) { Api.get("/rooms") }
            rooms = json.jsonArray.mapNotNull { it as? JsonObject }
        } catch (_: Exception) {
            val cached = Api.getOffline("/rooms")
            if (cached != null) {
                rooms = cached.jsonArray.mapNotNull { it as? JsonObject }
                offlineMode = true
            }
        }
        // v1.7.0 — doors + hallways/walls
        try {
            val json = withContext(Dispatchers.IO) { Api.get("/doors") }
            doors = json.jsonArray.mapNotNull { it as? JsonObject }
        } catch (_: Exception) {
            val cached = Api.getOffline("/doors")
            if (cached != null) doors = cached.jsonArray.mapNotNull { it as? JsonObject }
        }
        try {
            val json = withContext(Dispatchers.IO) { Api.get("/hallways") }
            hallways = json.jsonArray.mapNotNull { it as? JsonObject }
        } catch (_: Exception) {
            val cached = Api.getOffline("/hallways")
            if (cached != null) hallways = cached.jsonArray.mapNotNull { it as? JsonObject }
        }
    }

    // Route rendering — whenever origin or destination changes, redraw
    // (or clear) the blue navigation line. Straight great-circle from
    // origin centroid → destination centroid; the hallway A* comes in
    // a follow-up when we have /api/navigate wired on this platform.
    LaunchedEffect(destination, origin, originIsMyLocation, myLocation, mapRef) {
        val map = mapRef ?: return@LaunchedEffect
        val dest = destination
        val originPt: LatLng? = when {
            dest == null -> null
            originIsMyLocation -> myLocation
            origin != null -> centroidOf(origin!!)?.let { LatLng(it.first, it.second) }
            else -> null
        }
        val destPt: LatLng? = dest?.let { centroidOf(it)?.let { c -> LatLng(c.first, c.second) } }

        val routeJson: String = if (originPt != null && destPt != null) {
            """{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"LineString","coordinates":[[${originPt.longitude},${originPt.latitude}],[${destPt.longitude},${destPt.latitude}]]},"properties":{}}]}"""
        } else {
            """{"type":"FeatureCollection","features":[]}"""
        }

        map.getStyle { style ->
            val existing = style.getSourceAs<GeoJsonSource>(SRC_ROUTE)
            if (existing != null) {
                existing.setGeoJson(routeJson)
            } else {
                style.addSource(GeoJsonSource(SRC_ROUTE, routeJson))
                // Casing (thick white halo) drawn UNDER the coloured
                // line so the route reads on any basemap tint. Both
                // land on top of the room/building fill layers because
                // we're adding them after the initial layer install.
                style.addLayer(
                    LineLayer(LAYER_ROUTE_CASING, SRC_ROUTE).withProperties(
                        PropertyFactory.lineColor(AndroidColor.WHITE),
                        PropertyFactory.lineWidth(9f),
                        PropertyFactory.lineOpacity(0.9f),
                        PropertyFactory.lineCap("round"),
                        PropertyFactory.lineJoin("round"),
                    )
                )
                style.addLayer(
                    LineLayer(LAYER_ROUTE_LINE, SRC_ROUTE).withProperties(
                        PropertyFactory.lineColor(AndroidColor.parseColor("#2563EB")),
                        PropertyFactory.lineWidth(5f),
                        PropertyFactory.lineOpacity(0.95f),
                        PropertyFactory.lineCap("round"),
                        PropertyFactory.lineJoin("round"),
                    )
                )
            }
        }

        // Auto-fit the map to the newly drawn route so both endpoints
        // are visible without the user pinching to zoom out.
        if (originPt != null && destPt != null) {
            val bounds = LatLngBounds.Builder().include(originPt).include(destPt).build()
            map.animateCamera(CameraUpdateFactory.newLatLngBounds(bounds, 200), 700)
        }
    }

    // 3D toggle — flips extrusion layer visibility on/off and animates
    // the camera pitch to a MazeMap-friendly angle. Reading the layers
    // out of the current style is safer than tracking them in Compose
    // state because they only exist after the polygon LaunchedEffect
    // has run once.
    LaunchedEffect(is3D, mapRef) {
        val map = mapRef ?: return@LaunchedEffect
        map.getStyle { style ->
            style.getLayer(LAYER_BUILDING_EXTRUSION)?.setProperties(
                PropertyFactory.visibility(if (is3D) Property.VISIBLE else Property.NONE),
            )
            style.getLayer(LAYER_ROOM_EXTRUSION)?.setProperties(
                PropertyFactory.visibility(if (is3D) Property.VISIBLE else Property.NONE),
            )
        }
        val targetPitch = if (is3D) 50.0 else 0.0
        map.animateCamera(CameraUpdateFactory.tiltTo(targetPitch), 500)
    }

    // Live GPS refresh — while a route is anchored to "My location",
    // poll the LocationComponent's last-known fix every 3 s so the
    // route line + distance/ETA chip update as the user walks. Cheap:
    // no separate LocationEngine subscription; the component's own
    // engine is already ticking because followMe is on.
    LaunchedEffect(originIsMyLocation, mapRef) {
        if (!originIsMyLocation) return@LaunchedEffect
        val map = mapRef ?: return@LaunchedEffect
        while (originIsMyLocation) {
            val loc = try { map.locationComponent.lastKnownLocation } catch (_: Exception) { null }
            if (loc != null) myLocation = LatLng(loc.latitude, loc.longitude)
            kotlinx.coroutines.delay(3000)
        }
    }

    // Wi-Fi scanning loop — starts on composition, updates position puck.
    // Switches to Navigate mode (5 s interval) when a destination is set.
    LaunchedEffect(destination) {
        WifiPositioning.mode = if (destination != null) WifiPositioning.Mode.Navigate
                               else WifiPositioning.Mode.Idle
    }
    LaunchedEffect(Unit) {
        launch { WifiPositioning.startScanning(ctx) }
    }

    // Draw (or update) the Wi-Fi position puck on the map whenever
    // the estimate changes. Uses a separate GeoJSON source so it
    // never interferes with the room/building layers.
    LaunchedEffect(wifiPosition, mapRef) {
        val map = mapRef ?: return@LaunchedEffect
        val pos = wifiPosition
        val geoJson: String = if (pos?.lat != null && pos.lng != null) {
            """{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Point","coordinates":[${pos.lng},${pos.lat}]},"properties":{"confidence":"${pos.confidence.name}"}}]}"""
        } else {
            """{"type":"FeatureCollection","features":[]}"""
        }
        map.getStyle { style ->
            val existing = style.getSourceAs<GeoJsonSource>(SRC_WIFI_POS)
            if (existing != null) {
                existing.setGeoJson(geoJson)
            } else {
                style.addSource(GeoJsonSource(SRC_WIFI_POS, geoJson))
                // Outer halo — large, very translucent blue circle
                style.addLayer(
                    org.maplibre.android.style.layers.CircleLayer(LAYER_WIFI_POS_HALO, SRC_WIFI_POS).withProperties(
                        PropertyFactory.circleRadius(22f),
                        PropertyFactory.circleColor(AndroidColor.parseColor("#2563EB")),
                        PropertyFactory.circleOpacity(0.18f),
                        PropertyFactory.circleStrokeWidth(0f),
                    )
                )
                // Inner filled dot — matches GPS puck color
                style.addLayer(
                    org.maplibre.android.style.layers.CircleLayer(LAYER_WIFI_POS_DOT, SRC_WIFI_POS).withProperties(
                        PropertyFactory.circleRadius(8f),
                        PropertyFactory.circleColor(AndroidColor.parseColor("#2563EB")),
                        PropertyFactory.circleOpacity(0.9f),
                        PropertyFactory.circleStrokeColor(AndroidColor.WHITE),
                        PropertyFactory.circleStrokeWidth(2.5f),
                    )
                )
            }
        }
    }

    // Deep-link — if RoomFinder (or another screen) pushed a focus
    // intent before navigating here, fly the camera to the room and
    // pop its bottom sheet as soon as the room data is in and the map
    // is ready. Then clear the intent so it doesn't re-fire on a later
    // navigation back to this tab.
    LaunchedEffect(rooms, mapRef) {
        val map = mapRef ?: return@LaunchedEffect
        val pendingId = MapNavIntent.pendingRoomId ?: return@LaunchedEffect
        if (rooms.isEmpty()) return@LaunchedEffect
        val room = rooms.firstOrNull { (it["id"] as? JsonPrimitive)?.contentOrNull == pendingId }
        if (room != null) {
            val floor = (room["floor"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull()
            if (floor != null) selectedFloor = floor
            val centroid = centroidOf(room)
            if (centroid != null) {
                map.animateCamera(
                    CameraUpdateFactory.newLatLngZoom(
                        LatLng(centroid.first, centroid.second),
                        19.0
                    ),
                    500,
                )
            }
            selectedRoom = room
        }
        MapNavIntent.pendingRoomId = null
    }

    // Recompute polygons whenever the data or selected floor changes.
    // Buildings + rooms are separate MapLibre sources so we can toggle
    // the room layer's opacity/visibility per floor without touching
    // the building shells that stay put regardless of which level is
    // "active."
    LaunchedEffect(buildings, rooms, selectedFloor, mapRef) {
        val map = mapRef ?: return@LaunchedEffect
        val buildingsGeoJson = buildBuildingsFeatureCollection(buildings, selectedFloor)
        val roomsGeoJson = buildRoomsFeatureCollection(rooms, selectedFloor)

        map.getStyle { style ->
            // ── Buildings ──
            val existingB = style.getSourceAs<GeoJsonSource>(SRC_BUILDINGS)
            if (existingB != null) {
                existingB.setGeoJson(buildingsGeoJson)
            } else {
                style.addSource(GeoJsonSource(SRC_BUILDINGS, buildingsGeoJson))
                style.addLayer(
                    FillLayer(LAYER_FILL, SRC_BUILDINGS).withProperties(
                        PropertyFactory.fillColor(Expression.get("color")),
                        PropertyFactory.fillOpacity(0.24f),
                    )
                )
                // 3D extrusion — floors * METERS_PER_FLOOR high, tinted
                // by colorCode. Vertical gradient shading makes the
                // volume read as sunlit vs shadowed sides. Hidden by
                // default; the 3D toggle flips visibility.
                style.addLayer(
                    FillExtrusionLayer(LAYER_BUILDING_EXTRUSION, SRC_BUILDINGS).withProperties(
                        PropertyFactory.fillExtrusionColor(Expression.get("color")),
                        PropertyFactory.fillExtrusionHeight(Expression.get("height")),
                        PropertyFactory.fillExtrusionBase(0f),
                        PropertyFactory.fillExtrusionOpacity(0.72f),
                        PropertyFactory.fillExtrusionVerticalGradient(true),
                        PropertyFactory.visibility(Property.NONE),
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

            // ── Rooms — drawn ON TOP of building fill so they read as
            // interior slabs, MazeMap-style. Only visible when zoomed
            // in past 17.5 (below that they'd be sub-pixel noise). ──
            val existingR = style.getSourceAs<GeoJsonSource>(SRC_ROOMS)
            if (existingR != null) {
                existingR.setGeoJson(roomsGeoJson)
            } else {
                style.addSource(GeoJsonSource(SRC_ROOMS, roomsGeoJson))
                style.addLayer(
                    FillLayer(LAYER_ROOM_FILL, SRC_ROOMS).withProperties(
                        PropertyFactory.fillColor(Expression.get("color")),
                        PropertyFactory.fillOpacity(0.55f),
                    )
                )
                // Raised room slab in 3D — sits ON TOP of the building's
                // floor plate for the room's floor. Base = floor idx *
                // 3 m + 0.08 (floor slab thickness); height adds
                // ROOM_SLAB (0.35 m) so it reads as a raised platform
                // inside the building shell.
                style.addLayer(
                    FillExtrusionLayer(LAYER_ROOM_EXTRUSION, SRC_ROOMS).withProperties(
                        PropertyFactory.fillExtrusionColor(Expression.get("color")),
                        PropertyFactory.fillExtrusionBase(Expression.get("base")),
                        PropertyFactory.fillExtrusionHeight(Expression.get("top")),
                        PropertyFactory.fillExtrusionOpacity(0.92f),
                        PropertyFactory.fillExtrusionVerticalGradient(true),
                        PropertyFactory.visibility(Property.NONE),
                    )
                )
                style.addLayer(
                    LineLayer(LAYER_ROOM_OUTLINE, SRC_ROOMS).withProperties(
                        PropertyFactory.lineColor(AndroidColor.parseColor("#0F172A")),
                        PropertyFactory.lineWidth(0.8f),
                        PropertyFactory.lineOpacity(0.35f),
                    )
                )
                style.addLayer(
                    SymbolLayer(LAYER_ROOM_LABEL, SRC_ROOMS).withProperties(
                        PropertyFactory.textField(Expression.get("label")),
                        PropertyFactory.textSize(10f),
                        PropertyFactory.textColor(AndroidColor.parseColor("#111827")),
                        PropertyFactory.textHaloColor(AndroidColor.WHITE),
                        PropertyFactory.textHaloWidth(1.2f),
                        PropertyFactory.textAllowOverlap(false),
                        // Only paint labels once we're close enough to
                        // read them without a magnifying glass.
                        PropertyFactory.textOpacity(
                            Expression.interpolate(
                                Expression.linear(), Expression.zoom(),
                                Expression.stop(17f, 0f),
                                Expression.stop(18f, 1f),
                            )
                        ),
                    )
                )
            }
        }
        // v1.6.0 — only auto-fit on the very first data load per
        // session, and only when no persisted camera was restored.
        // Later data-refetch cycles must NOT snap the map back to
        // campus bounds — that would fight the user's pans.
        if (!hasAutoFitOnce && buildings.isNotEmpty()) {
            centerOnBuildings(map, buildings)
            hasAutoFitOnce = true
        }
    }

    // v1.7.0 — doors + walls sync. Doors render as colored circle
    // chips (green for entrances, grey for interior doors). Walls
    // render as dark short line segments. Both filter by selectedFloor
    // when it's set. Runs whenever data or the active floor changes.
    LaunchedEffect(doors, hallways, selectedFloor, mapRef) {
        val map = mapRef ?: return@LaunchedEffect
        val doorsGeoJson = buildDoorsFeatureCollection(doors, selectedFloor)
        val wallsGeoJson = buildWallsFeatureCollection(hallways, selectedFloor)
        map.getStyle { style ->
            // Walls first (below doors so doors chip on top)
            val existingW = style.getSourceAs<GeoJsonSource>(SRC_WALLS)
            if (existingW != null) {
                existingW.setGeoJson(wallsGeoJson)
            } else {
                style.addSource(GeoJsonSource(SRC_WALLS, wallsGeoJson))
                style.addLayer(
                    LineLayer(LAYER_WALLS_LINE, SRC_WALLS).withProperties(
                        PropertyFactory.lineColor(AndroidColor.parseColor("#374151")),
                        PropertyFactory.lineWidth(
                            Expression.interpolate(
                                Expression.linear(), Expression.zoom(),
                                Expression.stop(15f, 1f),
                                Expression.stop(18f, 2.5f),
                                Expression.stop(22f, 5f),
                            ),
                        ),
                        PropertyFactory.lineOpacity(0.85f),
                        PropertyFactory.lineCap("round"),
                        PropertyFactory.lineJoin("round"),
                    )
                )
            }
            // Doors
            val existingD = style.getSourceAs<GeoJsonSource>(SRC_DOORS)
            if (existingD != null) {
                existingD.setGeoJson(doorsGeoJson)
            } else {
                style.addSource(GeoJsonSource(SRC_DOORS, doorsGeoJson))
                style.addLayer(
                    org.maplibre.android.style.layers.CircleLayer(LAYER_DOORS_CHIP, SRC_DOORS).withProperties(
                        PropertyFactory.circleRadius(
                            Expression.interpolate(
                                Expression.linear(), Expression.zoom(),
                                Expression.stop(15f, 3f),
                                Expression.stop(18f, 6f),
                                Expression.stop(22f, 10f),
                            ),
                        ),
                        PropertyFactory.circleColor(
                            Expression.match(
                                Expression.get("kind"),
                                Expression.literal("#374151"),  // default (door)
                                Expression.stop("entrance", "#16a34a"),
                                Expression.stop("exit", "#dc2626"),
                            )
                        ),
                        PropertyFactory.circleStrokeColor(AndroidColor.WHITE),
                        PropertyFactory.circleStrokeWidth(1.5f),
                        PropertyFactory.circleOpacity(0.95f),
                    )
                )
            }
        }
    }

    // Keep singleton callbacks up-to-date on every recomposition so the
    // single MapLibre listener (registered once in factory) always reads
    // the current composition's state rather than stale first-composition
    // captures. SideEffect runs after every recomposition, after all
    // state reads are stable.
    SideEffect {
        mapClickDelegate = click@ { latLng ->
            val roomHit = pickRoomAt(rooms, latLng, selectedFloor)
            if (roomHit != null) { selectedRoom = roomHit; return@click true }
            val hit = pickBuildingAt(buildings, latLng)
            if (hit != null) selected = hit
            hit != null
        }
        cameraIdleDelegate = {
            MapViewHolder.map?.cameraPosition?.let { cp ->
                savePersistedCamera(ctx, cp.target?.latitude ?: 0.0, cp.target?.longitude ?: 0.0, cp.zoom, cp.bearing, cp.tilt)
                currentBearing = cp.bearing
            }
        }
        cameraMovedDelegate = {
            MapViewHolder.map?.cameraPosition?.bearing?.let { b -> currentBearing = b }
        }
    }
    val mapViewHolder = remember { mutableStateOf<MapView?>(null) }
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            val mv = mapViewHolder.value ?: return@LifecycleEventObserver
            when (event) {
                Lifecycle.Event.ON_START   -> mv.onStart()
                Lifecycle.Event.ON_RESUME  -> mv.onResume()
                Lifecycle.Event.ON_PAUSE   -> mv.onPause()
                Lifecycle.Event.ON_STOP    -> mv.onStop()
                Lifecycle.Event.ON_DESTROY -> {
                    mapRef = null
                    MapViewHolder.map = null
                    try { mv.onDestroy() } catch (_: Exception) {}
                    MapViewHolder.view = null
                }
                else -> {}
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            mapRef = null
            // Pause + stop only — do NOT destroy. Destroying kills the GL
            // context and crashes MapLibre when the user returns to this tab.
            // onDestroy is called only on actual Activity destruction (above).
            mapViewHolder.value?.let { mv ->
                try { mv.onPause() } catch (_: Exception) {}
                try { mv.onStop() } catch (_: Exception) {}
            }
            mapViewHolder.value = null
        }
    }

    Box(Modifier.fillMaxSize()) {
        AndroidView(
            factory = { c ->
                val existing = MapViewHolder.view
                if (existing != null) {
                    // Reuse the existing MapView so the GL context is never
                    // destroyed on tab switch. The DisposableEffect lifecycle
                    // observer will call onStart + onResume when it registers.
                    mapViewHolder.value = existing
                    existing
                } else {
                    MapView(c).also { mv ->
                        MapViewHolder.view = mv
                        mapViewHolder.value = mv
                        mv.getMapAsync { m ->
                            MapViewHolder.map = m
                            m.setStyle(Style.Builder().fromJson(STYLE_JSON_LIGHT)) {
                                val restored = loadPersistedCamera(c)
                                val cam = CameraPosition.Builder()
                                    .target(restored?.target ?: KSYK_CENTER)
                                    .zoom(restored?.zoom ?: KSYK_ZOOM)
                                    .bearing(restored?.bearing ?: 0.0)
                                    .tilt(restored?.tilt ?: 0.0)
                                    .build()
                                m.cameraPosition = cam
                                m.uiSettings.apply {
                                    isCompassEnabled = true
                                    isRotateGesturesEnabled = true
                                    isTiltGesturesEnabled = true
                                    isAttributionEnabled = true
                                    isLogoEnabled = false
                                    setAttributionMargins(16, 0, 0, 24)
                                }
                                // Delegate to file-level vars so re-entry recompositions
                                // update the handlers without re-registering listeners.
                                m.addOnMapClickListener { latLng -> mapClickDelegate(latLng) }
                                m.addOnCameraIdleListener { cameraIdleDelegate() }
                                m.addOnCameraMoveListener { cameraMovedDelegate() }
                                mapRef = m
                            }
                        }
                    }
                }
            },
            modifier = Modifier.fillMaxSize(),
        )

        // ── Search overlay (top) ───────────────────────────────────
        // A single field that filters rooms + buildings as the user
        // types. Behaviour depends on searchMode:
        //   NONE        → tap flies the camera and opens the sheet
        //   ORIGIN      → tap sets the pick as the route origin and
        //                 exits ORIGIN mode; MazeMap-style "from" pick
        //   DESTINATION → (reserved for a future "search destinations"
        //                 UI; currently unused because destination is
        //                 set by the room sheet button)
        SearchOverlay(
            query = searchQuery,
            onQueryChange = { searchQuery = it },
            focused = searchFocused,
            onFocusChange = { searchFocused = it },
            mode = searchMode,
            results = remember(searchQuery, rooms, buildings) {
                searchEntities(query = searchQuery, rooms = rooms, buildings = buildings)
            },
            onPickRoom = { r ->
                if (searchMode == SearchMode.ORIGIN) {
                    origin = r
                    originIsMyLocation = false
                    searchMode = SearchMode.NONE
                    searchQuery = ""
                    searchFocused = false
                    return@SearchOverlay
                }
                // v1.5.0 — MazeMap-style: tapping a search hit
                // immediately picks it as the DESTINATION and asks for
                // the starting point. The room's info sheet is still
                // reachable by tapping the room ON the map itself.
                val floor = (r["floor"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull()
                if (floor != null) selectedFloor = floor
                val centroid = centroidOf(r)
                if (centroid != null) {
                    mapRef?.animateCamera(
                        CameraUpdateFactory.newLatLngZoom(
                            LatLng(centroid.first, centroid.second),
                            19.0,
                        ),
                        500,
                    )
                }
                destination = r
                origin = null
                originIsMyLocation = false
                showStartPicker = true
                searchQuery = ""
                searchFocused = false
            },
            onPickBuilding = { b ->
                if (searchMode == SearchMode.ORIGIN) {
                    origin = b
                    originIsMyLocation = false
                    searchMode = SearchMode.NONE
                    searchQuery = ""
                    searchFocused = false
                    return@SearchOverlay
                }
                // Same destination-first flow for buildings — routing
                // targets the building centroid.
                val centroid = centroidOf(b)
                if (centroid != null) {
                    mapRef?.animateCamera(
                        CameraUpdateFactory.newLatLngZoom(
                            LatLng(centroid.first, centroid.second),
                            18.5,
                        ),
                        500,
                    )
                }
                destination = b
                origin = null
                originIsMyLocation = false
                showStartPicker = true
                searchQuery = ""
                searchFocused = false
            },
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(horizontal = 12.dp, vertical = 10.dp),
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
            // v1.8.0 — compass chip. Icon spins with current bearing
            // so users can see how far off north they are; tap resets
            // to 0°. Hidden when bearing is negligible (<1°) so the
            // chip doesn't clutter the rail when the map is already
            // pointing north.
            if (Math.abs(currentBearing) > 1) {
                CompassChip(bearingDeg = currentBearing) {
                    mapRef?.animateCamera(CameraUpdateFactory.bearingTo(0.0))
                }
            }
            MapChipButton(
                icon = Icons.Outlined.ViewInAr,
                label = if (is3D) "2D view" else "3D view",
                highlighted = is3D,
            ) {
                is3D = !is3D
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
        // Sits under the search bar so both remain visible simultaneously.
        if (offlineMode) {
            OfflineBanner(
                Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 74.dp),
            )
        }

        // ── Building/room count pill + Wi-Fi position (bottom-left) ──
        val visibleRoomCount = remember(rooms, selectedFloor) {
            if (selectedFloor == null) rooms.size
            else rooms.count { (it["floor"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() == selectedFloor }
        }
        Column(
            Modifier
                .align(Alignment.BottomStart)
                .padding(start = 12.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            // Wi-Fi position chip — only when we have an estimate.
            wifiPosition?.let { pos ->
                WifiPositionChip(
                    position = pos,
                    apCount = wifiApCount,
                    onTap = {
                        // Centre map on the WiFi estimated position.
                        val lat = pos.lat ?: return@WifiPositionChip
                        val lng = pos.lng ?: return@WifiPositionChip
                        mapRef?.animateCamera(
                            CameraUpdateFactory.newLatLngZoom(LatLng(lat, lng), 18.5),
                            500,
                        )
                    },
                )
            }
            Row(
                Modifier
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
                    "${buildings.size} · $visibleRoomCount rooms",
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

    selectedRoom?.let { r ->
        RoomSheet(
            room = r,
            onDismiss = { selectedRoom = null },
            onFocus = {
                val centroid = centroidOf(r)
                if (centroid != null) {
                    mapRef?.animateCamera(
                        CameraUpdateFactory.newLatLngZoom(
                            LatLng(centroid.first, centroid.second),
                            19.0
                        )
                    )
                }
                selectedRoom = null
            },
            onSwitchFloor = { floor ->
                selectedFloor = floor
            },
            onDirections = {
                destination = r
                origin = null
                originIsMyLocation = false
                selectedRoom = null
                showStartPicker = true
            },
        )
    }

    // Route info + clear button. Pinned to the top-left so it doesn't
    // fight the search bar (top-center) and stays visible even when
    // the user pans elsewhere.
    val curDest = destination
    val curOrigin = origin
    if (curDest != null && (curOrigin != null || originIsMyLocation)) {
        val destPt = centroidOf(curDest)?.let { LatLng(it.first, it.second) }
        val originPt: LatLng? = when {
            originIsMyLocation -> myLocation
            curOrigin != null -> centroidOf(curOrigin)?.let { LatLng(it.first, it.second) }
            else -> null
        }
        if (destPt != null && originPt != null) {
            val distMeters = haversineMeters(originPt, destPt)
            val walkSec = (distMeters / WALKING_MPS).toInt()
            Box(Modifier.fillMaxSize()) {
                RouteInfoChip(
                    distanceMeters = distMeters,
                    walkSeconds = walkSec,
                    destinationLabel = labelOf(curDest),
                    originLabel = if (originIsMyLocation) "Oma sijainti" else labelOf(curOrigin!!),
                    onClear = {
                        destination = null
                        origin = null
                        originIsMyLocation = false
                    },
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(start = 12.dp, top = 74.dp),
                )
            }
        }
    }

    // "Lähtöpaikka" picker — appears after the user hits "Suunnista
    // tänne" in a room sheet. Two quick actions + a cancel.
    if (showStartPicker) {
        Box(Modifier.fillMaxSize()) {
            StartPickerCard(
                destinationLabel = labelOf(destination),
                onMyLocation = {
                    originIsMyLocation = true
                    origin = null
                    showStartPicker = false
                    // Prompt for GPS if not granted yet.
                    val hasLocation = ContextCompat.checkSelfPermission(
                        ctx, Manifest.permission.ACCESS_FINE_LOCATION
                    ) == PackageManager.PERMISSION_GRANTED
                    if (hasLocation) {
                        followMe = true
                        mapRef?.let { enableLocation(ctx, it) }
                        // Seed myLocation from last-known so the line
                        // draws immediately without waiting for the first
                        // GPS fix; the LocationComponent will update it
                        // as the user walks.
                        mapRef?.locationComponent?.lastKnownLocation?.let { loc ->
                            myLocation = LatLng(loc.latitude, loc.longitude)
                        }
                    } else {
                        locationPermission.launch(Manifest.permission.ACCESS_FINE_LOCATION)
                    }
                },
                onSearchRoom = {
                    searchMode = SearchMode.ORIGIN
                    showStartPicker = false
                    searchFocused = true
                },
                onCancel = {
                    showStartPicker = false
                    destination = null
                },
            )
        }
    }
}

@SuppressLint("MissingPermission")
private fun enableLocation(ctx: android.content.Context, map: MapLibreMap) {
    map.getStyle { style ->
        try {
            val lc = map.locationComponent
            if (!lc.isLocationComponentActivated) {
                lc.activateLocationComponent(
                    LocationComponentActivationOptions.builder(ctx, style).build()
                )
            }
            lc.isLocationComponentEnabled = true
            lc.cameraMode = CameraMode.TRACKING
            lc.renderMode = RenderMode.COMPASS
        } catch (_: Exception) {
            // Location component may already be in the wrong state;
            // silently ignore — the user can retry by tapping My Location again.
        }
    }
}

/** Which endpoint the next search pick fills. */
enum class SearchMode { NONE, ORIGIN, DESTINATION }

// ── Search overlay ─────────────────────────────────────────────────

/**
 * Top-mounted search overlay. Collapsed = a pill-shaped Search field.
 * Focused = the pill grows a card of results underneath it (up to 8
 * hits) with icons distinguishing rooms from buildings. Escape / tap
 * "x" closes the results.
 */
sealed class SearchHit {
    data class RoomHit(val room: JsonObject) : SearchHit()
    data class BuildingHit(val building: JsonObject) : SearchHit()
}

private fun searchEntities(
    query: String,
    rooms: List<JsonObject>,
    buildings: List<JsonObject>,
    maxResults: Int = 8,
): List<SearchHit> {
    val q = query.trim().lowercase()
    if (q.length < 1) return emptyList()

    val hits = mutableListOf<SearchHit>()

    // Rooms first — usually what people search for. Match on number,
    // name and type; score exact-prefix higher than substring so a
    // query "203" prioritises room 203 over 203a-adjacent.
    val roomMatches = rooms.mapNotNull { r ->
        val num = (r["roomNumber"] as? JsonPrimitive)?.contentOrNull?.lowercase() ?: ""
        val name = (r["name"] as? JsonPrimitive)?.contentOrNull?.lowercase() ?: ""
        val type = (r["type"] as? JsonPrimitive)?.contentOrNull?.lowercase() ?: ""
        val score = when {
            num == q -> 100
            num.startsWith(q) -> 80
            name.startsWith(q) -> 60
            num.contains(q) -> 40
            name.contains(q) -> 30
            type.contains(q) -> 10
            else -> 0
        }
        if (score > 0) r to score else null
    }.sortedByDescending { it.second }.take(maxResults)
    for ((r, _) in roomMatches) hits.add(SearchHit.RoomHit(r))

    // Then a handful of buildings so the user can still jump to
    // "Main building" or similar names.
    if (hits.size < maxResults) {
        val buildingMatches = buildings.mapNotNull { b ->
            val name = (b["name"] as? JsonPrimitive)?.contentOrNull?.lowercase() ?: ""
            val score = when {
                name == q -> 100
                name.startsWith(q) -> 70
                name.contains(q) -> 40
                else -> 0
            }
            if (score > 0) b to score else null
        }.sortedByDescending { it.second }.take(maxResults - hits.size)
        for ((b, _) in buildingMatches) hits.add(SearchHit.BuildingHit(b))
    }
    return hits
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SearchOverlay(
    query: String,
    onQueryChange: (String) -> Unit,
    focused: Boolean,
    onFocusChange: (Boolean) -> Unit,
    mode: SearchMode,
    results: List<SearchHit>,
    onPickRoom: (JsonObject) -> Unit,
    onPickBuilding: (JsonObject) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.98f)),
    ) {
        // MazeMap-style "Choose starting point" hint when in ORIGIN
        // mode. Colored strip so users immediately notice they're
        // picking a `from`, not opening a room sheet.
        if (mode == SearchMode.ORIGIN) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF2563EB))
                    .padding(horizontal = 14.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Outlined.LocationOn, null, tint = Color.White,
                     modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(8.dp))
                Text(
                    "Valitse lähtöpaikka — Choose starting point",
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                Icons.Outlined.Search, null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(20.dp),
            )
            Spacer(Modifier.width(8.dp))
            OutlinedTextField(
                value = query,
                onValueChange = { onQueryChange(it); if (!focused && it.isNotBlank()) onFocusChange(true) },
                placeholder = { Text(
                    if (mode == SearchMode.ORIGIN) "Search a room to start from…"
                    else "Search rooms, buildings…",
                    fontSize = 14.sp,
                ) },
                singleLine = true,
                modifier = Modifier
                    .weight(1f)
                    .heightIn(min = 44.dp)
                    .onFocusChanged { onFocusChange(it.isFocused || query.isNotBlank()) },
                shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color.Transparent,
                    unfocusedBorderColor = Color.Transparent,
                ),
                keyboardOptions = KeyboardOptions.Default,
            )
            if (query.isNotEmpty()) {
                IconButton(onClick = { onQueryChange(""); onFocusChange(false) }) {
                    Icon(Icons.Outlined.Close, contentDescription = "Clear search",
                         modifier = Modifier.size(18.dp))
                }
            }
        }

        // Results list — only appears when there's an active query
        // AND at least one match. An empty query keeps the pill compact.
        if (query.isNotBlank() && results.isNotEmpty()) {
            Divider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
            LazyColumn(
                Modifier
                    .fillMaxWidth()
                    .heightIn(max = 320.dp),
            ) {
                items(results) { hit ->
                    when (hit) {
                        is SearchHit.RoomHit -> SearchRoomRow(hit.room) { onPickRoom(hit.room) }
                        is SearchHit.BuildingHit -> SearchBuildingRow(hit.building) { onPickBuilding(hit.building) }
                    }
                }
            }
        } else if (query.isNotBlank() && results.isEmpty()) {
            Text(
                "No matches",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
            )
        }
    }
}

@Composable
private fun SearchRoomRow(r: JsonObject, onClick: () -> Unit) {
    val num = (r["roomNumber"] as? JsonPrimitive)?.contentOrNull ?: "—"
    val name = (r["name"] as? JsonPrimitive)?.contentOrNull ?: ""
    val floor = (r["floor"] as? JsonPrimitive)?.contentOrNull ?: ""
    Row(
        Modifier.fillMaxWidth().clickable { onClick() }.padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(32.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.13f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Outlined.MeetingRoom, null,
                 tint = MaterialTheme.colorScheme.primary,
                 modifier = Modifier.size(18.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(num, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            if (name.isNotBlank()) {
                Text(name, fontSize = 11.sp,
                     color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        if (floor.isNotBlank()) {
            Box(
                Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant)
                    .padding(horizontal = 6.dp, vertical = 2.dp),
            ) {
                Text("F$floor", fontSize = 10.sp,
                     fontWeight = FontWeight.SemiBold,
                     color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun SearchBuildingRow(b: JsonObject, onClick: () -> Unit) {
    val name = (b["name"] as? JsonPrimitive)?.contentOrNull ?: "Building"
    val floors = (b["floors"] as? JsonPrimitive)?.contentOrNull ?: ""
    Row(
        Modifier.fillMaxWidth().clickable { onClick() }.padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(32.dp)
                .clip(CircleShape)
                .background(Color(0xFF8B5CF6).copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Outlined.Business, null,
                 tint = Color(0xFF8B5CF6),
                 modifier = Modifier.size(18.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(name, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            Text("Building", fontSize = 11.sp,
                 color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        if (floors.isNotBlank()) {
            Text("$floors floors", fontSize = 11.sp,
                 color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
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

/**
 * v1.8.0 — compass chip. Explore icon rotates to counter the map's
 * current bearing so the "N" points to true north on screen. Tap
 * resets bearing to 0 with a smooth animation. Only rendered when
 * map bearing is non-negligible so the chip doesn't clutter the
 * rail when north-aligned.
 */
@Composable
private fun CompassChip(bearingDeg: Double, onReset: () -> Unit) {
    Box(
        Modifier
            .size(46.dp)
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.94f))
            .clickable(onClick = onReset),
        contentAlignment = Alignment.Center,
    ) {
        // Rotate opposite the map bearing so the compass points to
        // world-north regardless of camera rotation.
        Icon(
            Icons.Outlined.Explore,
            contentDescription = "Reset bearing (currently ${bearingDeg.toInt()}°)",
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier
                .size(24.dp)
                .rotate((-bearingDeg).toFloat()),
        )
        // Tiny "N" label at top pointing to north.
        Text(
            "N",
            fontSize = 8.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFFDC2626),
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 3.dp)
                .rotate((-bearingDeg).toFloat()),
        )
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RoomSheet(
    room: JsonObject,
    onDismiss: () -> Unit,
    onFocus: () -> Unit,
    onSwitchFloor: (Int) -> Unit,
    onDirections: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val number = (room["roomNumber"] as? JsonPrimitive)?.contentOrNull ?: "—"
    val name = (room["name"] as? JsonPrimitive)?.contentOrNull ?: ""
    val type = (room["type"] as? JsonPrimitive)?.contentOrNull ?: ""
    val floor = (room["floor"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() ?: 1
    val capacity = (room["capacity"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull()
    val color = (room["colorCode"] as? JsonPrimitive)?.contentOrNull ?: "#059669"

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(Modifier.padding(horizontal = 24.dp, vertical = 4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(52.dp)
                        .clip(CircleShape)
                        .background(runCatching { Color(AndroidColor.parseColor(color)) }
                                     .getOrDefault(Color(0xFF059669)).copy(alpha = 0.18f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        number.take(3),
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = runCatching { Color(AndroidColor.parseColor(color)) }.getOrDefault(Color(0xFF059669)),
                    )
                }
                Spacer(Modifier.width(14.dp))
                Column {
                    Text("Room $number", fontWeight = FontWeight.Bold, fontSize = 22.sp)
                    if (name.isNotBlank()) {
                        Text(
                            name,
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
            Spacer(Modifier.height(18.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Chip("Floor $floor")
                if (type.isNotBlank()) Chip(type)
                if (capacity != null && capacity > 0) Chip("Seats $capacity")
            }
            Spacer(Modifier.height(20.dp))
            // Primary action — MazeMap always foregrounds Directions.
            // Big blue button spanning the row so it reads as "the
            // thing you probably came here to do."
            Button(
                onClick = onDirections,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF2563EB),
                    contentColor = Color.White,
                ),
            ) {
                Icon(Icons.AutoMirrored.Outlined.DirectionsWalk, null)
                Spacer(Modifier.width(8.dp))
                Text("Suunnista tänne", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(
                    onClick = onFocus,
                    modifier = Modifier.weight(1f).height(46.dp),
                    shape = RoundedCornerShape(10.dp),
                ) {
                    Icon(Icons.Outlined.MyLocation, null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Focus", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                }
                OutlinedButton(
                    onClick = { onSwitchFloor(floor); onDismiss() },
                    modifier = Modifier.weight(1f).height(46.dp),
                    shape = RoundedCornerShape(10.dp),
                ) {
                    Icon(Icons.Outlined.Layers, null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Isolate floor", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

/** Persistent route-info card — distance + walking time + endpoints. */
@Composable
private fun RouteInfoChip(
    distanceMeters: Double,
    walkSeconds: Int,
    destinationLabel: String,
    originLabel: String,
    onClear: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val distanceStr = when {
        distanceMeters < 1000 -> "${distanceMeters.toInt()} m"
        else -> "%.2f km".format(distanceMeters / 1000.0)
    }
    val walkStr = when {
        walkSeconds < 60 -> "< 1 min"
        walkSeconds < 3600 -> "${walkSeconds / 60} min"
        else -> "%dh %dmin".format(walkSeconds / 3600, (walkSeconds % 3600) / 60)
    }
    Column(
        modifier
            .clip(RoundedCornerShape(14.dp))
            .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.98f))
            .padding(horizontal = 14.dp, vertical = 10.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                Icons.AutoMirrored.Outlined.DirectionsWalk, null,
                tint = Color(0xFF2563EB),
                modifier = Modifier.size(18.dp),
            )
            Spacer(Modifier.width(6.dp))
            Text(distanceStr, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Spacer(Modifier.width(10.dp))
            Text("· $walkStr", fontSize = 13.sp,
                 color = MaterialTheme.colorScheme.onSurfaceVariant,
                 fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.width(8.dp))
            IconButton(onClick = onClear, modifier = Modifier.size(28.dp)) {
                Icon(Icons.Outlined.Close, "Clear route",
                     modifier = Modifier.size(16.dp),
                     tint = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.size(8.dp).clip(CircleShape).background(Color(0xFF10B981)),
            )
            Spacer(Modifier.width(6.dp))
            Text(originLabel, fontSize = 11.sp,
                 color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.size(8.dp).clip(CircleShape).background(Color(0xFFEF4444)),
            )
            Spacer(Modifier.width(6.dp))
            Text(destinationLabel, fontSize = 11.sp,
                 color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

/** "Choose starting point" bottom card — appears when destination is
 *  set but origin isn't. Two quick actions + cancel. */
@Composable
private fun BoxScope.StartPickerCard(
    destinationLabel: String,
    onMyLocation: () -> Unit,
    onSearchRoom: () -> Unit,
    onCancel: () -> Unit,
) {
    Column(
        Modifier
            .align(Alignment.BottomCenter)
            .padding(horizontal = 12.dp, vertical = 80.dp)
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Outlined.Navigation, null,
                 tint = Color(0xFF2563EB), modifier = Modifier.size(22.dp))
            Spacer(Modifier.width(8.dp))
            Column(Modifier.weight(1f)) {
                Text("Lähtöpaikka", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Text(
                    "→ $destinationLabel",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            IconButton(onClick = onCancel) {
                Icon(Icons.Outlined.Close, "Cancel",
                     tint = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Spacer(Modifier.height(12.dp))
        Button(
            onClick = onMyLocation,
            modifier = Modifier.fillMaxWidth().height(46.dp),
            shape = RoundedCornerShape(10.dp),
        ) {
            Icon(Icons.Outlined.MyLocation, null)
            Spacer(Modifier.width(8.dp))
            Text("Oma sijainti — My location", fontWeight = FontWeight.SemiBold)
        }
        Spacer(Modifier.height(8.dp))
        OutlinedButton(
            onClick = onSearchRoom,
            modifier = Modifier.fillMaxWidth().height(46.dp),
            shape = RoundedCornerShape(10.dp),
        ) {
            Icon(Icons.Outlined.Search, null)
            Spacer(Modifier.width(8.dp))
            Text("Etsi lähtöhuone — Search a room", fontWeight = FontWeight.SemiBold)
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

/** Compact chip showing the current Wi-Fi position estimate. */
@Composable
private fun WifiPositionChip(
    position: WifiPosition,
    apCount: Int,
    onTap: () -> Unit,
) {
    val floorSuffix = position.floor?.let { " · F$it" } ?: ""
    val (dotColor, label) = when (position.confidence) {
        WifiPosition.Confidence.HIGH   -> Color(0xFF16A34A) to "~${position.positionLabel}$floorSuffix"
        WifiPosition.Confidence.MEDIUM -> Color(0xFFF59E0B) to "~${position.positionLabel}$floorSuffix"
        else                           -> Color(0xFF94A3B8) to "Searching…"
    }
    Row(
        Modifier
            .clip(RoundedCornerShape(24.dp))
            .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.94f))
            .clickable { onTap() }
            .padding(horizontal = 12.dp, vertical = 7.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(8.dp)
                .clip(CircleShape)
                .background(dotColor)
        )
        Spacer(Modifier.width(6.dp))
        Icon(
            Icons.Outlined.Wifi, null,
            tint = dotColor,
            modifier = Modifier.size(13.dp),
        )
        Spacer(Modifier.width(4.dp))
        Text(
            label,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface,
        )
        if (position.confidenceScore > 0) {
            Spacer(Modifier.width(6.dp))
            Text(
                "${position.confidenceScore}%",
                fontSize = 10.sp,
                color = dotColor,
                fontWeight = FontWeight.Bold,
            )
        }
        if (apCount > 0) {
            Spacer(Modifier.width(6.dp))
            Text(
                "· ${apCount} AP",
                fontSize = 10.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
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

/** Build a GeoJSON FeatureCollection string of room polygons for the active floor. */
private fun buildRoomsFeatureCollection(rooms: List<JsonObject>, floor: Int?): String {
    val features = StringBuilder()
    var first = true
    for (r in rooms) {
        val roomFloor = (r["floor"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() ?: 1
        if (floor != null && roomFloor != floor) continue

        val ptsArr = (r["points"] as? JsonArray) ?: continue
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
        val firstPt = ptsArr[0] as? JsonObject
        if (firstPt != null) {
            val lat = (firstPt["lat"] as? JsonPrimitive)?.doubleOrNull
            val lng = (firstPt["lng"] as? JsonPrimitive)?.doubleOrNull
            if (lat != null && lng != null) coords.append(",[$lng,$lat]")
        }
        coords.append("]")

        val name = (r["name"] as? JsonPrimitive)?.contentOrNull?.escape() ?: ""
        val number = (r["roomNumber"] as? JsonPrimitive)?.contentOrNull?.escape() ?: ""
        val label = listOf(number, name).filter { it.isNotEmpty() }.joinToString(" ").ifBlank { "Room" }
        // v1.6.0 — category coloring by room type, mirroring the web
        // (see ROOM_TYPE_COLORS in CampusOverlay.tsx). Explicit
        // colorCode always wins; if unset, the room's type gets a
        // category tint (classroom green, lab orange, toilets pink,
        // etc.). Fallback stays KSYK green for unrecognised types.
        val explicitColor = (r["colorCode"] as? JsonPrimitive)?.contentOrNull
        val roomType = (r["type"] as? JsonPrimitive)?.contentOrNull
        val color = (explicitColor ?: colorForRoomType(roomType) ?: "#059669").escape()
        val id = (r["id"] as? JsonPrimitive)?.contentOrNull?.escape() ?: ""
        val floorIdx = maxOf(0, roomFloor - 1)
        val base = floorIdx * METERS_PER_FLOOR + 0.08
        val top = base + ROOM_SLAB_METERS

        if (!first) features.append(",")
        features.append(
            """{"type":"Feature","id":"$id","geometry":{"type":"Polygon","coordinates":[$coords]},"properties":{"label":"$label","name":"$name","number":"$number","color":"$color","floor":$roomFloor,"base":$base,"top":$top,"id":"$id"}}"""
        )
        first = false
    }
    return """{"type":"FeatureCollection","features":[$features]}"""
}

/**
 * v1.7.0 — Doors GeoJSON — one Point per door. `kind` = "entrance" |
 * "exit" | "door". Filtered by active floor when set.
 */
private fun buildDoorsFeatureCollection(doors: List<JsonObject>, floor: Int?): String {
    val features = StringBuilder()
    var first = true
    for (d in doors) {
        val f = (d["floor"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() ?: 1
        if (floor != null && f != floor) continue
        val lat = (d["mapPositionY"] as? JsonPrimitive)?.doubleOrNull
                ?: (d["lat"] as? JsonPrimitive)?.doubleOrNull ?: continue
        val lng = (d["mapPositionX"] as? JsonPrimitive)?.doubleOrNull
                ?: (d["lng"] as? JsonPrimitive)?.doubleOrNull ?: continue
        val isEntrance = (d["isEntrance"] as? JsonPrimitive)?.booleanOrNull ?: false
        val isExit = (d["isExit"] as? JsonPrimitive)?.booleanOrNull ?: false
        val kind = when {
            isEntrance -> "entrance"
            isExit -> "exit"
            else -> "door"
        }
        val id = (d["id"] as? JsonPrimitive)?.contentOrNull?.escape() ?: ""
        if (!first) features.append(",")
        features.append(
            """{"type":"Feature","id":"$id","geometry":{"type":"Point","coordinates":[$lng,$lat]},"properties":{"kind":"$kind","id":"$id","floor":$f}}"""
        )
        first = false
    }
    return """{"type":"FeatureCollection","features":[$features]}"""
}

/**
 * v1.7.0 — Walls GeoJSON — hallways with `surface == "wall"` become
 * LineStrings. Filtered by active floor when set. Multi-vertex
 * hallways emit the full path; simple ones emit just start→end.
 */
private fun buildWallsFeatureCollection(hallways: List<JsonObject>, floor: Int?): String {
    val features = StringBuilder()
    var first = true
    for (h in hallways) {
        val surface = (h["surface"] as? JsonPrimitive)?.contentOrNull ?: continue
        if (surface.lowercase() != "wall") continue
        val f = (h["floor"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() ?: 1
        if (floor != null && f != floor) continue

        // Prefer multi-vertex `points` array if present; otherwise
        // fall back to startX/Y + endX/Y two-point segment.
        val coordsBuf = StringBuilder("[")
        val pts = h["points"] as? JsonArray
        var haveAny = false
        if (pts != null && pts.size >= 2) {
            var isFirst = true
            for (p in pts) {
                val po = p as? JsonObject ?: continue
                val lat = (po["lat"] as? JsonPrimitive)?.doubleOrNull ?: continue
                val lng = (po["lng"] as? JsonPrimitive)?.doubleOrNull ?: continue
                if (!isFirst) coordsBuf.append(",")
                coordsBuf.append("[$lng,$lat]")
                isFirst = false; haveAny = true
            }
        } else {
            val sx = (h["startX"] as? JsonPrimitive)?.doubleOrNull
            val sy = (h["startY"] as? JsonPrimitive)?.doubleOrNull
            val ex = (h["endX"] as? JsonPrimitive)?.doubleOrNull
            val ey = (h["endY"] as? JsonPrimitive)?.doubleOrNull
            if (sx != null && sy != null && ex != null && ey != null) {
                coordsBuf.append("[$sx,$sy],[$ex,$ey]")
                haveAny = true
            }
        }
        coordsBuf.append("]")
        if (!haveAny) continue
        val id = (h["id"] as? JsonPrimitive)?.contentOrNull?.escape() ?: ""
        if (!first) features.append(",")
        features.append(
            """{"type":"Feature","id":"$id","geometry":{"type":"LineString","coordinates":$coordsBuf},"properties":{"id":"$id","floor":$f}}"""
        )
        first = false
    }
    return """{"type":"FeatureCollection","features":[$features]}"""
}

/**
 * v1.6.0 — MazeMap-style default color per room type. Mirrors the
 * ROOM_TYPE_COLORS table in web CampusOverlay.tsx so the same room
 * looks the same on both platforms even when no explicit colorCode
 * is set. Types are case-insensitive; whitespace trimmed.
 */
private val ROOM_TYPE_COLORS: Map<String, String> = mapOf(
    "classroom" to "#059669", "class" to "#059669", "luokka" to "#059669",
    "lecture" to "#0891b2",
    "lab" to "#ea580c", "laboratory" to "#ea580c",
    "workshop" to "#d97706",
    "gym" to "#e11d48", "sports" to "#e11d48",
    "cafeteria" to "#f59e0b", "cafe" to "#f59e0b", "canteen" to "#f59e0b",
    "kitchen" to "#f97316",
    "restroom" to "#ec4899", "restrooms" to "#ec4899",
    "toilets" to "#ec4899", "bathroom" to "#ec4899",
    "office" to "#6366f1", "admin" to "#6366f1", "staff" to "#6366f1",
    "meeting" to "#8b5cf6",
    "library" to "#7c3aed",
    "storage" to "#6b7280", "utility" to "#6b7280",
    "hallway" to "#94a3b8", "corridor" to "#94a3b8",
    "stairs" to "#f59e0b",
    "elevator" to "#2563eb",
    "auditorium" to "#a855f7",
    "music" to "#c084fc",
    "art" to "#f43f5e",
    // v1.7.0 — additional types requested
    "stage" to "#a21caf", "näyttämö" to "#a21caf",
    "theater" to "#a21caf", "theatre" to "#a21caf",
    "assembly" to "#a21caf",
    "chapel" to "#eab308",
    "reception" to "#0ea5e9",
)
private fun colorForRoomType(type: String?): String? {
    if (type.isNullOrBlank()) return null
    return ROOM_TYPE_COLORS[type.lowercase().trim()]
}

/** Hit-test — returns the room whose polygon contains the tap. */
private fun pickRoomAt(rooms: List<JsonObject>, at: LatLng, activeFloor: Int?): JsonObject? {
    for (r in rooms) {
        val roomFloor = (r["floor"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() ?: 1
        if (activeFloor != null && roomFloor != activeFloor) continue
        val ptsArr = (r["points"] as? JsonArray) ?: continue
        if (ptsArr.size < 3) continue
        val polygon = ptsArr.mapNotNull { p ->
            val po = p as? JsonObject ?: return@mapNotNull null
            val lat = (po["lat"] as? JsonPrimitive)?.doubleOrNull ?: return@mapNotNull null
            val lng = (po["lng"] as? JsonPrimitive)?.doubleOrNull ?: return@mapNotNull null
            LatLng(lat, lng)
        }
        if (polygon.size >= 3 && pointInPolygon(at, polygon)) return r
    }
    return null
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
        val floorsCount = (b["floors"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() ?: 1
        val height = maxOf(METERS_PER_FLOOR, floorsCount * METERS_PER_FLOOR)

        if (!first) features.append(",")
        features.append(
            """{"type":"Feature","id":"$id","geometry":{"type":"Polygon","coordinates":[$coords]},"properties":{"name":"$name","color":"$color","id":"$id","height":$height,"floors":$floorsCount}}"""
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

/** Best display name for a building or room. Falls back through
 *  name → roomNumber → id → "?". */
private fun labelOf(o: JsonObject?): String {
    if (o == null) return "?"
    val name = (o["name"] as? JsonPrimitive)?.contentOrNull
    val number = (o["roomNumber"] as? JsonPrimitive)?.contentOrNull
    return listOfNotNull(number, name).joinToString(" ").ifBlank { "?" }
}

/** Great-circle distance in metres between two LatLng points.
 *  Standard haversine — good to ~0.5% at building-scale distances. */
private fun haversineMeters(a: LatLng, b: LatLng): Double {
    val r = 6371000.0
    val lat1 = Math.toRadians(a.latitude); val lat2 = Math.toRadians(b.latitude)
    val dLat = Math.toRadians(b.latitude - a.latitude)
    val dLng = Math.toRadians(b.longitude - a.longitude)
    val s = Math.sin(dLat / 2)
    val t = Math.sin(dLng / 2)
    val h = s * s + Math.cos(lat1) * Math.cos(lat2) * t * t
    return 2 * r * Math.asin(Math.min(1.0, Math.sqrt(h)))
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

// ─── Camera persistence ────────────────────────────────────────────
// v1.6.0 — SharedPreferences-backed save + restore of the last map
// camera. Mirrors the web CampusMap camera storage so the app opens
// to whatever view the user was on last, not the KSYK default.

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
