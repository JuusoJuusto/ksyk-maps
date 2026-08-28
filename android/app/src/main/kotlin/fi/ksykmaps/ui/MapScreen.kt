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
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material.icons.automirrored.outlined.DirectionsWalk
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.MeetingRoom
import androidx.compose.material.icons.outlined.MyLocation
import androidx.compose.material.icons.outlined.Navigation
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Remove
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.ViewInAr
import androidx.compose.material.icons.outlined.Wifi
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
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import fi.ksykmaps.data.Analytics
import fi.ksykmaps.data.Api
import kotlinx.coroutines.async
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
private const val LAYER_BUILDING_EXTRUSION = "campus-buildings-extrusion"
// Fallback pins — shown for buildings that have no drawn polygon points.
// Uses the building's `coordinates` center lat/lng so SOMETHING is always
// visible even before any polygon has been painted in the builder.
private const val SRC_BUILDING_PINS = "campus-building-pins"
private const val LAYER_BUILDING_PIN = "campus-building-pin"
private const val LAYER_BUILDING_PIN_LABEL = "campus-building-pin-label"

private const val SRC_ROOMS = "campus-rooms"
private const val LAYER_ROOM_FILL = "campus-rooms-fill"
private const val LAYER_ROOM_OUTLINE = "campus-rooms-outline"
private const val LAYER_ROOM_LABEL = "campus-rooms-label"
// Fallback pins for rooms without polygon points.
private const val SRC_ROOM_PINS = "campus-room-pins"
private const val LAYER_ROOM_PIN = "campus-room-pin"
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

// OpenStreetMap standard tiles — free, no API key, no paid CDN.
// Rate-limited by tile.openstreetmap.org so acceptable for a
// school-scoped audience. Attribution is mandatory:
// https://www.openstreetmap.org/copyright
private const val STYLE_JSON_LIGHT = """{
  "version": 8,
  "sources": {
    "osm-raster": {
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
    { "id": "osm-raster-layer", "type": "raster", "source": "osm-raster" }
  ]
}"""

// Satellite basemap — Esri World Imagery. Free to use with attribution,
// no API key. Higher zoom than OSM (up to 20). MazeMap has this option
// too for outdoor navigation.
private const val STYLE_JSON_SATELLITE = """{
  "version": 8,
  "sources": {
    "esri-sat": {
      "type": "raster",
      "tiles": [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      ],
      "tileSize": 256,
      "attribution": "Tiles © Esri",
      "maxzoom": 20
    }
  },
  "layers": [
    { "id": "esri-sat-layer", "type": "raster", "source": "esri-sat" }
  ]
}"""

// KSYK campus starting camera — matches the site default. Real
// coordinates are read from the first building fetched, but this is
// the fallback until data arrives.
private val KSYK_CENTER = LatLng(60.18717, 25.00358)
private const val KSYK_ZOOM = 17.5

// Singleton holder — keeps the MapView (and its GL context) alive across
// tab switches. NavHost destroys and recreates MapScreen on every visit,
// but destroying the MapView kills the GL thread and crashes MapLibre.
private object MapViewHolder {
    var view: MapView? = null
    var map: MapLibreMap? = null
    var sessionAutoFitDone: Boolean = false
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
    // Wrapped so a native-init failure (missing .so on this ABI, GL init
    // error, etc.) never propagates up and kills the whole app.
    var initFailed by remember { mutableStateOf(false) }
    DisposableEffect(Unit) {
        try {
            // Empty string triggers an API-key warning in the MapLibre SDK
            // even when using open tile sources. Any non-empty string silences it.
            MapLibre.getInstance(ctx.applicationContext, "not-needed", org.maplibre.android.WellKnownTileServer.MapLibre)
        } catch (e: Throwable) {
            initFailed = true
            try { Analytics.trackError("MapScreen", "MapLibre.getInstance: ${e.message}") } catch (_: Throwable) {}
        }
        onDispose { }
    }
    LanguageState.init(ctx); val lang = LanguageState.current ?: "fi"
    if (initFailed) {
        Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Outlined.LocationOn, null, tint = MaterialTheme.colorScheme.onSurfaceVariant,
                     modifier = Modifier.size(48.dp))
                Spacer(Modifier.height(12.dp))
                Text(
                    if (lang == "fi") "Karttaa ei voitu ladata tällä laitteella."
                    else "The map could not be loaded on this device.",
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    if (lang == "fi") "Käynnistä sovellus uudelleen tai päivitä laitteesi käyttöjärjestelmä."
                    else "Restart the app or update your device operating system.",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(16.dp))
                FilledTonalButton(onClick = { initFailed = false }) {
                    Text(if (lang == "fi") "Yritä uudelleen" else "Try again")
                }
            }
        }
        return
    }
    var buildings by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var rooms by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var doors by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    var hallways by remember { mutableStateOf<List<JsonObject>>(emptyList()) }
    // Default to floor 1 initially; auto-switch to whichever floor has
    // the most drawn rooms once /api/rooms comes back. If NO room has
    // a drawn polygon (empty campus), we drop to null which shows every
    // floor's rooms rather than leaving the map visually empty.
    var selectedFloor by remember { mutableStateOf<Int?>(1) }
    var floorAutoPicked by remember { mutableStateOf(false) }
    LaunchedEffect(rooms) {
        if (!floorAutoPicked && rooms.isNotEmpty()) {
            // Only count rooms that actually have a drawn polygon.
            val roomsWithPolys = rooms.filter { r ->
                val pts = r["points"] as? JsonArray
                pts != null && pts.size >= 3
            }
            if (roomsWithPolys.isEmpty()) {
                // No polygons drawn anywhere — leave floor 1 selected so
                // the "empty campus" is at least consistent, and mark the
                // pick as done so we don't retry.
                floorAutoPicked = true
                return@LaunchedEffect
            }
            val counts = roomsWithPolys
                .mapNotNull { (it["floor"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() }
                .groupingBy { it }.eachCount()
            val bestFloor = counts.maxByOrNull { it.value }?.key
            if (bestFloor != null) selectedFloor = bestFloor
            floorAutoPicked = true
        }
    }
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
    // Basemap toggle — "standard" (OSM) vs "satellite" (Esri imagery).
    // Mirrors Apple Maps / MazeMap; setting rerenders the entire style so
    // building/room layers reinstall on the next data pass.
    var basemap by rememberSaveable { mutableStateOf("standard") }
    // Incremented to retry the map data fetch (e.g., user taps "Retry").
    var mapDataRetryTrigger by remember { mutableIntStateOf(0) }
    // True while the initial data fetch is in progress.
    var dataFetching by remember { mutableStateOf(true) }
    // v1.6.0 — first-run detection so we only auto-fit to buildings
    // on the very first data load per session. Stored in MapViewHolder so
    // it survives tab switches (Composable recreated) but resets on app restart.
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

    // Apply admin-set default rotation/pitch on every cold open of the
    // map. Previously we only did this when there was no persisted
    // camera, but cameraIdleDelegate saves bearing=0 on every idle
    // event, so the persisted bearing always won and the admin's
    // configured rotation never took effect. We keep the user's last
    // target+zoom (feels natural to reopen where you were) but ALWAYS
    // reset bearing + tilt to the admin defaults.
    var appliedServerDefaults by remember { mutableStateOf(false) }
    LaunchedEffect(mapRef) {
        val m = mapRef ?: return@LaunchedEffect
        if (appliedServerDefaults) return@LaunchedEffect
        withContext(Dispatchers.IO) { refreshServerMapDefaults(ctx) }
        val serverDefaults = loadServerMapDefaults(ctx)
        val persisted = loadPersistedCamera(ctx)
        if (serverDefaults != null) {
            m.animateCamera(
                CameraUpdateFactory.newCameraPosition(
                    CameraPosition.Builder()
                        .target(persisted?.target ?: serverDefaults.target)
                        .zoom(persisted?.zoom ?: serverDefaults.zoom)
                        .bearing(serverDefaults.bearing)  // ALWAYS admin default
                        .tilt(serverDefaults.tilt)        // ALWAYS admin default
                        .build()
                ),
                600,
            )
        }
        appliedServerDefaults = true
    }

    // Basemap swap — reload the style JSON only when the user TOGGLES.
    // The factory already loads STYLE_JSON_LIGHT on first mount, so
    // there's nothing to do until basemap actually differs from what
    // the map currently has. Tracking the last-loaded basemap prevents
    // an extra setStyle on the initial mapRef assignment which used to
    // wipe polygon layers the render LaunchedEffect had just added.
    var lastLoadedBasemap by remember { mutableStateOf<String?>(null) }
    var styleReloadTrigger by remember { mutableIntStateOf(0) }
    LaunchedEffect(basemap, mapRef) {
        val m = mapRef ?: return@LaunchedEffect
        // First-time mount: factory already installed STYLE_JSON_LIGHT.
        // If default basemap matches, just record it and exit — no wipe.
        if (lastLoadedBasemap == null) {
            lastLoadedBasemap = basemap
            fi.ksykmaps.data.AppLog.info(
                "MapScreen",
                "basemap initial=$basemap (skip setStyle — factory already installed it)",
            )
            return@LaunchedEffect
        }
        if (lastLoadedBasemap == basemap) return@LaunchedEffect
        fi.ksykmaps.data.AppLog.info(
            "MapScreen",
            "basemap swap $lastLoadedBasemap → $basemap",
        )
        val styleJson = when (basemap) {
            "satellite" -> STYLE_JSON_SATELLITE
            else -> STYLE_JSON_LIGHT
        }
        m.setStyle(Style.Builder().fromJson(styleJson)) {
            lastLoadedBasemap = basemap
            fi.ksykmaps.data.AppLog.info("MapScreen", "basemap style loaded: $basemap")
            // Force polygon-render LaunchedEffect to re-run so it re-adds
            // sources/layers to the fresh style.
            styleReloadTrigger++
        }
    }

    LaunchedEffect(mapDataRetryTrigger) {
        dataFetching = true
        fi.ksykmaps.data.AppLog.info("MapScreen", "data-load start (retry=$mapDataRetryTrigger)")

        // STEP 1: Paint from bundled/disk snapshot IMMEDIATELY so the map
        // is never empty. This runs in ~10 ms — no network required.
        val bundledB = withContext(Dispatchers.IO) { Api.getOffline("/buildings") }
        val bundledR = withContext(Dispatchers.IO) { Api.getOffline("/rooms") }
        val bundledD = withContext(Dispatchers.IO) { Api.getOffline("/doors") }
        val bundledH = withContext(Dispatchers.IO) { Api.getOffline("/hallways") }
        bundledB?.let { buildings = it.jsonArray.mapNotNull { e -> e as? JsonObject } }
        bundledR?.let { rooms = it.jsonArray.mapNotNull { e -> e as? JsonObject } }
        bundledD?.let { doors = it.jsonArray.mapNotNull { e -> e as? JsonObject } }
        bundledH?.let { hallways = it.jsonArray.mapNotNull { e -> e as? JsonObject } }
        fi.ksykmaps.data.AppLog.info(
            "MapScreen",
            "STEP1 bundled: buildings=${buildings.size} rooms=${rooms.size} doors=${doors.size} hallways=${hallways.size}",
        )

        // STEP 2: Try to refresh from the live API in parallel. Api.get()
        // itself falls back to GitHub Raw snapshots if the live API 429s,
        // so this either gets fresh data or same-day data — never empty.
        val bldDeferred  = async(Dispatchers.IO) { runCatching { Api.get("/buildings") } }
        val roomsDeferred = async(Dispatchers.IO) { runCatching { Api.get("/rooms") } }
        val doorsDeferred = async(Dispatchers.IO) { runCatching { Api.get("/doors") } }
        val hwDeferred   = async(Dispatchers.IO) { runCatching { Api.get("/hallways") } }

        bldDeferred.await().onSuccess { json ->
            val fresh = json.jsonArray.mapNotNull { it as? JsonObject }
            if (fresh.isNotEmpty() && fresh != buildings) {
                buildings = fresh; offlineMode = false
                fi.ksykmaps.data.AppLog.info("MapScreen", "STEP2 live buildings=${fresh.size}")
            }
        }.onFailure { e ->
            Analytics.trackError("MapScreen", "buildings: ${e.message ?: "unknown"}")
            offlineMode = buildings.isEmpty()
        }

        roomsDeferred.await().onSuccess { json ->
            val fresh = json.jsonArray.mapNotNull { it as? JsonObject }
            if (fresh.isNotEmpty() && fresh != rooms) {
                rooms = fresh
                fi.ksykmaps.data.AppLog.info("MapScreen", "STEP2 live rooms=${fresh.size}")
            }
        }

        doorsDeferred.await().onSuccess { json ->
            val fresh = json.jsonArray.mapNotNull { it as? JsonObject }
            if (fresh.isNotEmpty() && fresh != doors) doors = fresh
        }

        hwDeferred.await().onSuccess { json ->
            val fresh = json.jsonArray.mapNotNull { it as? JsonObject }
            if (fresh.isNotEmpty() && fresh != hallways) hallways = fresh
        }
        dataFetching = false
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
    LaunchedEffect(buildings, rooms, selectedFloor, mapRef, styleReloadTrigger) {
        val map = mapRef ?: run {
            fi.ksykmaps.data.AppLog.warn("MapScreen", "render skipped: mapRef=null")
            return@LaunchedEffect
        }
        val buildingsGeoJson = buildBuildingsFeatureCollection(buildings, selectedFloor)
        val buildingPinsGeoJson = buildBuildingPinsFeatureCollection(buildings)
        val roomsGeoJson = buildRoomsFeatureCollection(rooms, selectedFloor)
        val roomPinsGeoJson = buildRoomPinsFeatureCollection(rooms, selectedFloor)
        fi.ksykmaps.data.AppLog.info(
            "MapScreen",
            "render polygons: buildingsJson=${buildingsGeoJson.length}chars roomsJson=${roomsGeoJson.length}chars floor=$selectedFloor",
        )

        map.getStyle { style ->
            // ── Buildings (polygon layer) ──
            val existingB = style.getSourceAs<GeoJsonSource>(SRC_BUILDINGS)
            if (existingB != null) {
                existingB.setGeoJson(buildingsGeoJson)
            } else {
                style.addSource(GeoJsonSource(SRC_BUILDINGS, buildingsGeoJson))
                // Hardcoded fill/outline colors — MapLibre-Android's
                // data-driven color expressions (Expression.toColor(get("color")))
                // silently drop features on some devices. Per-feature tinting
                // was cosmetic anyway; the visual hierarchy is fine with a
                // uniform building palette.
                style.addLayer(
                    FillLayer(LAYER_FILL, SRC_BUILDINGS).withProperties(
                        PropertyFactory.fillColor(AndroidColor.parseColor("#2563EB")),
                        PropertyFactory.fillOpacity(0.42f),
                    )
                )
                style.addLayer(
                    FillExtrusionLayer(LAYER_BUILDING_EXTRUSION, SRC_BUILDINGS).withProperties(
                        PropertyFactory.fillExtrusionColor(AndroidColor.parseColor("#2563EB")),
                        PropertyFactory.fillExtrusionHeight(Expression.get("height")),
                        PropertyFactory.fillExtrusionBase(0f),
                        PropertyFactory.fillExtrusionOpacity(0.80f),
                        PropertyFactory.fillExtrusionVerticalGradient(true),
                        PropertyFactory.visibility(Property.NONE),
                    )
                )
                style.addLayer(
                    LineLayer(LAYER_OUTLINE, SRC_BUILDINGS).withProperties(
                        PropertyFactory.lineColor(AndroidColor.parseColor("#1E40AF")),
                        PropertyFactory.lineWidth(2.5f),
                        PropertyFactory.lineOpacity(0.9f),
                    )
                )
                style.addLayer(
                    SymbolLayer(LAYER_LABEL, SRC_BUILDINGS).withProperties(
                        PropertyFactory.textField(Expression.get("name")),
                        PropertyFactory.textSize(13f),
                        PropertyFactory.textColor(AndroidColor.parseColor("#0F172A")),
                        PropertyFactory.textHaloColor(AndroidColor.WHITE),
                        PropertyFactory.textHaloWidth(2.5f),
                        PropertyFactory.textAllowOverlap(false),
                        PropertyFactory.textIgnorePlacement(false),
                    )
                )
            }

            // ── Building pins — fallback markers for buildings that have
            // a `coordinates` center but no drawn polygon. Shows SOMETHING
            // on screen even when no polygon has been painted in the builder. ──
            val existingBP = style.getSourceAs<GeoJsonSource>(SRC_BUILDING_PINS)
            if (existingBP != null) {
                existingBP.setGeoJson(buildingPinsGeoJson)
            } else {
                style.addSource(GeoJsonSource(SRC_BUILDING_PINS, buildingPinsGeoJson))
                style.addLayer(
                    org.maplibre.android.style.layers.CircleLayer(LAYER_BUILDING_PIN, SRC_BUILDING_PINS).withProperties(
                        PropertyFactory.circleRadius(
                            Expression.interpolate(
                                Expression.linear(), Expression.zoom(),
                                Expression.stop(13f, 8f),
                                Expression.stop(17f, 22f),
                                Expression.stop(20f, 36f),
                            )
                        ),
                        PropertyFactory.circleColor(AndroidColor.parseColor("#2563EB")),
                        PropertyFactory.circleOpacity(0.85f),
                        PropertyFactory.circleStrokeColor(AndroidColor.WHITE),
                        PropertyFactory.circleStrokeWidth(2.5f),
                    )
                )
                style.addLayer(
                    SymbolLayer(LAYER_BUILDING_PIN_LABEL, SRC_BUILDING_PINS).withProperties(
                        PropertyFactory.textField(Expression.get("name")),
                        PropertyFactory.textSize(12f),
                        PropertyFactory.textColor(AndroidColor.parseColor("#0F172A")),
                        PropertyFactory.textHaloColor(AndroidColor.WHITE),
                        PropertyFactory.textHaloWidth(2f),
                        PropertyFactory.textOffset(arrayOf(0f, 2f)),
                        PropertyFactory.textAnchor("top"),
                        PropertyFactory.textAllowOverlap(false),
                    )
                )
            }

            // ── Rooms (polygon layer) ──
            val existingR = style.getSourceAs<GeoJsonSource>(SRC_ROOMS)
            if (existingR != null) {
                existingR.setGeoJson(roomsGeoJson)
            } else {
                style.addSource(GeoJsonSource(SRC_ROOMS, roomsGeoJson))
                // Rooms: type-based coloring via Expression.match on the
                // `type` property (well-supported in MapLibre-Android),
                // with a green fallback for anything unrecognized.
                val roomColorExpr = Expression.match(
                    Expression.get("type"),
                    Expression.color(AndroidColor.parseColor("#059669")),  // default
                    Expression.stop("classroom", Expression.color(AndroidColor.parseColor("#10B981"))),
                    Expression.stop("lab",       Expression.color(AndroidColor.parseColor("#F59E0B"))),
                    Expression.stop("toilet",    Expression.color(AndroidColor.parseColor("#EC4899"))),
                    Expression.stop("wc",        Expression.color(AndroidColor.parseColor("#EC4899"))),
                    Expression.stop("office",    Expression.color(AndroidColor.parseColor("#8B5CF6"))),
                    Expression.stop("staff",     Expression.color(AndroidColor.parseColor("#8B5CF6"))),
                    Expression.stop("hallway",   Expression.color(AndroidColor.parseColor("#94A3B8"))),
                    Expression.stop("stairs",    Expression.color(AndroidColor.parseColor("#64748B"))),
                    Expression.stop("elevator",  Expression.color(AndroidColor.parseColor("#64748B"))),
                    Expression.stop("cafeteria", Expression.color(AndroidColor.parseColor("#F97316"))),
                    Expression.stop("gym",       Expression.color(AndroidColor.parseColor("#06B6D4"))),
                    Expression.stop("library",   Expression.color(AndroidColor.parseColor("#6366F1"))),
                    Expression.stop("music",     Expression.color(AndroidColor.parseColor("#EF4444"))),
                )
                style.addLayer(
                    FillLayer(LAYER_ROOM_FILL, SRC_ROOMS).withProperties(
                        PropertyFactory.fillColor(roomColorExpr),
                        PropertyFactory.fillOpacity(0.72f),
                    )
                )
                style.addLayer(
                    FillExtrusionLayer(LAYER_ROOM_EXTRUSION, SRC_ROOMS).withProperties(
                        PropertyFactory.fillExtrusionColor(AndroidColor.parseColor("#059669")),
                        PropertyFactory.fillExtrusionBase(Expression.get("base")),
                        PropertyFactory.fillExtrusionHeight(Expression.get("top")),
                        PropertyFactory.fillExtrusionOpacity(0.95f),
                        PropertyFactory.fillExtrusionVerticalGradient(true),
                        PropertyFactory.visibility(Property.NONE),
                    )
                )
                style.addLayer(
                    LineLayer(LAYER_ROOM_OUTLINE, SRC_ROOMS).withProperties(
                        PropertyFactory.lineColor(AndroidColor.parseColor("#0F172A")),
                        PropertyFactory.lineWidth(1.2f),
                        PropertyFactory.lineOpacity(0.65f),
                    )
                )
                style.addLayer(
                    SymbolLayer(LAYER_ROOM_LABEL, SRC_ROOMS).withProperties(
                        PropertyFactory.textField(Expression.get("label")),
                        PropertyFactory.textSize(11f),
                        PropertyFactory.textColor(AndroidColor.parseColor("#111827")),
                        PropertyFactory.textHaloColor(AndroidColor.WHITE),
                        PropertyFactory.textHaloWidth(1.8f),
                        PropertyFactory.textAllowOverlap(false),
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

            // ── Room pins — fallback dots for rooms without polygon data ──
            val existingRP = style.getSourceAs<GeoJsonSource>(SRC_ROOM_PINS)
            if (existingRP != null) {
                existingRP.setGeoJson(roomPinsGeoJson)
            } else {
                style.addSource(GeoJsonSource(SRC_ROOM_PINS, roomPinsGeoJson))
                style.addLayer(
                    org.maplibre.android.style.layers.CircleLayer(LAYER_ROOM_PIN, SRC_ROOM_PINS).withProperties(
                        PropertyFactory.circleRadius(
                            Expression.interpolate(
                                Expression.linear(), Expression.zoom(),
                                Expression.stop(16f, 4f),
                                Expression.stop(18f, 8f),
                                Expression.stop(20f, 14f),
                            )
                        ),
                        PropertyFactory.circleColor(AndroidColor.parseColor("#059669")),
                        PropertyFactory.circleOpacity(0.9f),
                        PropertyFactory.circleStrokeColor(AndroidColor.WHITE),
                        PropertyFactory.circleStrokeWidth(1.5f),
                    )
                )
            }
        }
        if (!MapViewHolder.sessionAutoFitDone && buildings.isNotEmpty()) {
            centerOnBuildings(map, buildings)
            MapViewHolder.sessionAutoFitDone = true
            fi.ksykmaps.data.AppLog.info("MapScreen", "auto-fit to ${buildings.size} buildings")
        } else if (buildings.isNotEmpty()) {
            // Safety net: if the persisted camera is more than 500 m from
            // ANY building (i.e. the user was viewing another part of the
            // world last session), snap back to the campus. Prevents the
            // "map opens on empty ocean" bug.
            val cam = map.cameraPosition
            val target = cam.target
            if (target != null) {
                val nearest = buildings.mapNotNull { b -> centroidOf(b) }
                    .minOfOrNull { (lat, lng) ->
                        haversineMeters(LatLng(target.latitude, target.longitude), LatLng(lat, lng))
                    } ?: Double.MAX_VALUE
                fi.ksykmaps.data.AppLog.info(
                    "MapScreen",
                    "camera at (%.5f, %.5f) zoom=%.1f, nearest building %.0fm".format(
                        target.latitude, target.longitude, cam.zoom, nearest,
                    ),
                )
                if (nearest > 500.0) {
                    fi.ksykmaps.data.AppLog.warn(
                        "MapScreen",
                        "camera too far (${nearest.toInt()} m) — force-fit to buildings",
                    )
                    centerOnBuildings(map, buildings)
                }
            }
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
            // mapViewHolder.value may not be set yet when the observer first
            // fires (Lifecycle dispatches pending events synchronously on
            // addObserver, which can race with AndroidView's factory). Fall
            // back to MapViewHolder.view so the reused map is always resumed.
            val mv = mapViewHolder.value ?: MapViewHolder.view ?: return@LifecycleEventObserver
            when (event) {
                Lifecycle.Event.ON_START   -> try { mv.onStart()  } catch (_: Exception) {}
                Lifecycle.Event.ON_RESUME  -> try { mv.onResume() } catch (_: Exception) {}
                Lifecycle.Event.ON_PAUSE   -> try { mv.onPause()  } catch (_: Exception) {}
                Lifecycle.Event.ON_STOP    -> try { mv.onStop()   } catch (_: Exception) {}
                Lifecycle.Event.ON_DESTROY -> {
                    // LocalLifecycleOwner inside NavHost is the NavBackStackEntry's
                    // lifecycle — ON_DESTROY fires on every tab switch (popUpTo pops
                    // the entry), NOT only when the Activity itself exits. Destroying
                    // the MapView here kills the GL thread and causes a native crash
                    // when the user returns to the Map tab. Only clean up when the
                    // Activity is truly going away (user back-pressed or rotation).
                    val act = ctx as? android.app.Activity
                    val reallyGone = act?.isFinishing == true ||
                                     act?.isChangingConfigurations == true
                    if (reallyGone) {
                        mapRef = null
                        MapViewHolder.map = null
                        MapViewHolder.sessionAutoFitDone = false
                        try { mv.onDestroy() } catch (e: Exception) {
                            Analytics.trackError("MapScreen", "onDestroy: ${e.message}")
                        }
                        MapViewHolder.view = null
                    }
                    // Tab navigation: skip destroy — GL context stays alive.
                }
                else -> {}
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            // Composable leaving (tab switch): pause + stop so the GL thread
            // quiesces cleanly. Do NOT destroy — that kills the GL context and
            // crashes MapLibre when the user switches back to the Map tab.
            mapViewHolder.value?.let { mv ->
                try { mv.onPause() } catch (_: Exception) {}
                try { mv.onStop()  } catch (_: Exception) {}
            }
            mapViewHolder.value = null
        }
    }

    Box(Modifier.fillMaxSize()) {
        AndroidView(
            factory = { c ->
                val existing = MapViewHolder.view
                if (existing != null) {
                    // Reuse existing MapView so the GL context survives tab
                    // switches. Call onStart+onResume here as a guarantee —
                    // the lifecycle observer may race with this factory and
                    // fire before mapViewHolder.value is set, missing the
                    // resume call. Double-calling is safe (MapLibre no-ops).
                    mapViewHolder.value = existing
                    try { existing.onStart() } catch (_: Exception) {}
                    try { existing.onResume() } catch (_: Exception) {}
                    existing
                } else {
                    try {
                        MapView(c).also { mv ->
                            MapViewHolder.view = mv
                            mapViewHolder.value = mv
                            try { mv.onCreate(null) } catch (_: Exception) {}
                            try { mv.onStart() } catch (_: Exception) {}
                            try { mv.onResume() } catch (_: Exception) {}
                            mv.getMapAsync { m ->
                                MapViewHolder.map = m
                                fi.ksykmaps.data.AppLog.info("MapScreen", "MapView getMapAsync fired")
                                try {
                                    m.setStyle(Style.Builder().fromJson(STYLE_JSON_LIGHT)) {
                                        fi.ksykmaps.data.AppLog.info("MapScreen", "initial style loaded")
                                        val restored = loadPersistedCamera(c)
                                        val serverDefaults = loadServerMapDefaults(c)
                                        val cam = CameraPosition.Builder()
                                            .target(restored?.target
                                                ?: serverDefaults?.target
                                                ?: KSYK_CENTER)
                                            .zoom(restored?.zoom
                                                ?: serverDefaults?.zoom
                                                ?: KSYK_ZOOM)
                                            .bearing(restored?.bearing
                                                ?: serverDefaults?.bearing
                                                ?: 0.0)
                                            .tilt(restored?.tilt
                                                ?: serverDefaults?.tilt
                                                ?: 0.0)
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
                                        m.addOnMapClickListener { latLng -> mapClickDelegate(latLng) }
                                        m.addOnCameraIdleListener { cameraIdleDelegate() }
                                        m.addOnCameraMoveListener { cameraMovedDelegate() }
                                        mapRef = m
                                    }
                                } catch (e: Throwable) {
                                    try { Analytics.trackError("MapScreen", "setStyle: ${e.message}") } catch (_: Throwable) {}
                                }
                            }
                        }
                    } catch (e: Throwable) {
                        try { Analytics.trackError("MapScreen", "MapView init: ${e.message}") } catch (_: Throwable) {}
                        // Return an empty placeholder View so AndroidView has
                        // something to attach; avoids a subsequent NPE crash.
                        android.view.View(c)
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
                val rNum = (r["roomNumber"] as? JsonPrimitive)?.contentOrNull ?: ""
                val rId  = (r["id"] as? JsonPrimitive)?.contentOrNull ?: ""
                Analytics.trackRoomView(rId, rNum)
                Analytics.trackBuildingSearch(searchQuery, 1)
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
                val bName = (b["name"] as? JsonPrimitive)?.contentOrNull ?: ""
                val bId   = (b["id"] as? JsonPrimitive)?.contentOrNull ?: ""
                Analytics.trackBuildingOpen(bId, bName)
                Analytics.trackBuildingSearch(searchQuery, 1)
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
            lang = lang,
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(horizontal = 12.dp, vertical = 10.dp),
        )

        // ── Floor switcher (right side, vertical) ──────────────────
        val floors = remember(buildings) { floorsFromBuildings(buildings) }
        // Room count per floor, computed once when rooms load. Shown as
        // a small badge on each floor chip so it's obvious which floors
        // actually have drawn rooms — helps diagnose "no rooms showing"
        // (empty campus) vs "wrong floor picked" (data on other level).
        val roomCountByFloor = remember(rooms) {
            rooms.filter { r ->
                val pts = r["points"] as? JsonArray
                pts != null && pts.size >= 3
            }.mapNotNull { (it["floor"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() }
                .groupingBy { it }.eachCount()
        }
        if (floors.isNotEmpty()) {
            FloorRail(
                floors = floors,
                selected = selectedFloor,
                roomCountByFloor = roomCountByFloor,
                onSelect = { selectedFloor = if (selectedFloor == it) null else it },
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .padding(end = 12.dp),
            )
        }

        // ── Map controls (Apple-Maps-style grouped pills, bottom right) ─────
        // Zoom and 3D live in one grouped rounded card (like Apple Maps'
        // right-edge control stack). "My location", refit, and compass
        // are separate pills below because they're conceptually distinct
        // actions rather than view options.
        Column(
            Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 12.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            horizontalAlignment = Alignment.End,
        ) {
            // Compass — only when off-north. Small circular pill.
            if (Math.abs(currentBearing) > 1) {
                CompassChip(bearingDeg = currentBearing) {
                    mapRef?.animateCamera(CameraUpdateFactory.bearingTo(0.0))
                }
            }
            // Grouped zoom + 3D pill (Apple Maps signature)
            GroupedMapControls(
                onZoomIn = { mapRef?.animateCamera(CameraUpdateFactory.zoomIn()) },
                onZoomOut = { mapRef?.animateCamera(CameraUpdateFactory.zoomOut()) },
                is3D = is3D,
                onToggle3D = { is3D = !is3D },
            )
            // Basemap toggle — Apple/Google Maps style. One tap swaps
            // between standard OSM and satellite imagery.
            MapChipButton(
                icon = if (basemap == "satellite") Icons.Outlined.Map else Icons.Outlined.Layers,
                label = if (basemap == "satellite") "Standard" else "Satellite",
                highlighted = basemap == "satellite",
            ) {
                basemap = if (basemap == "satellite") "standard" else "satellite"
            }
            // Refit to campus — one-tap to jump back to the buildings
            // when a user has wandered off. MazeMap has this as their
            // "reset view" corner button.
            MapChipButton(icon = Icons.Outlined.Home, label = "Fit campus") {
                mapRef?.let { m -> centerOnBuildings(m, buildings) }
            }
            // Locate me — the primary action, so it stays a standalone chip
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
        // ── Loading / retry pill ───────────────────────────────────
        // While data is fetching → animated spinner pill.
        // If fetch finished with zero buildings AND zero rooms → offer
        // an explicit "Retry" button (typical when the CDN cache is cold
        // and OkHttp got a bot-check 429 on first launch).
        val showRetry = !dataFetching && buildings.isEmpty() && rooms.isEmpty() && !offlineMode
        if (dataFetching || showRetry) {
            Row(
                Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = if (offlineMode) 120.dp else 74.dp)
                    .shadow(elevation = 4.dp, shape = RoundedCornerShape(24.dp), clip = false)
                    .clip(RoundedCornerShape(24.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(horizontal = 16.dp, vertical = 10.dp)
                    .clickable(enabled = showRetry) { mapDataRetryTrigger++ },
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (dataFetching) {
                    CircularProgressIndicator(
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(14.dp),
                        color = MaterialTheme.colorScheme.primary,
                    )
                    Spacer(Modifier.width(10.dp))
                    Text(
                        if (lang == "fi") "Ladataan karttaa…" else "Loading map…",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                } else {
                    Icon(
                        Icons.Outlined.Refresh, null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(16.dp),
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        if (lang == "fi") "Yritä uudelleen" else "Retry loading",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }
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
                    lang = lang,
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
            // Diagnostic pill: opaque, prominent, tells the user
            // exactly what data is loaded and which floor is active.
            // If the current floor has 0 rooms but other floors have
            // some, we suggest switching floors instead of just
            // showing a silent empty state.
            val totalRoomsWithPolys = remember(rooms) {
                rooms.count { r ->
                    val pts = r["points"] as? JsonArray
                    pts != null && pts.size >= 3
                }
            }
            val roomWord = if (lang == "fi") "huonetta" else "rooms"
            val floorWord = if (lang == "fi") "Kerros" else "Floor"
            Row(
                Modifier
                    .shadow(elevation = 4.dp, shape = RoundedCornerShape(24.dp), clip = false)
                    .clip(RoundedCornerShape(24.dp))
                    .background(MaterialTheme.colorScheme.surface)
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
                    "${buildings.size} · $visibleRoomCount $roomWord",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                if (selectedFloor != null) {
                    Spacer(Modifier.width(10.dp))
                    Text(
                        "· $floorWord $selectedFloor",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
            // "No rooms on this floor" hint. Only shown when we
            // actually have room data (total > 0) but the current
            // floor has none — so the user knows a different floor
            // will fix it.
            if (selectedFloor != null && visibleRoomCount == 0 && totalRoomsWithPolys > 0) {
                Row(
                    Modifier
                        .shadow(elevation = 4.dp, shape = RoundedCornerShape(20.dp), clip = false)
                        .clip(RoundedCornerShape(20.dp))
                        .background(MaterialTheme.colorScheme.errorContainer)
                        .clickable { selectedFloor = null }
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Outlined.Layers, null,
                        tint = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.size(14.dp),
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(
                        if (lang == "fi") "Ei huoneita tällä kerroksella — näytä kaikki"
                        else "No rooms on this floor — show all",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }
    }

    selected?.let { b ->
        BuildingSheet(building = b, lang = lang, onDismiss = { selected = null }) {
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
            lang = lang,
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
                    originLabel = if (originIsMyLocation)
                        (if (lang == "fi") "Oma sijainti" else "My location")
                    else labelOf(curOrigin!!),
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
                lang = lang,
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
    lang: String = "fi",
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
                    if (lang == "fi") "Valitse lähtöpaikka"
                    else "Choose starting point",
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
                    if (mode == SearchMode.ORIGIN)
                        (if (lang == "fi") "Etsi lähtöhuone…" else "Search a room to start from…")
                    else
                        (if (lang == "fi") "Etsi huoneita, rakennuksia…" else "Search rooms, buildings…"),
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
                        is SearchHit.RoomHit -> SearchRoomRow(hit.room, lang) { onPickRoom(hit.room) }
                        is SearchHit.BuildingHit -> SearchBuildingRow(hit.building, lang) { onPickBuilding(hit.building) }
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
private fun SearchRoomRow(r: JsonObject, lang: String = "fi", onClick: () -> Unit) {
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
                Text(
                    "${if (lang == "fi") "K" else "F"}$floor",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun SearchBuildingRow(b: JsonObject, lang: String = "fi", onClick: () -> Unit) {
    val name = (b["name"] as? JsonPrimitive)?.contentOrNull
        ?: (if (lang == "fi") "Rakennus" else "Building")
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
            Text(
                if (lang == "fi") "Rakennus" else "Building",
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        if (floors.isNotBlank()) {
            Text(
                if (lang == "fi") "$floors kerrosta" else "$floors floors",
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
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
    // Apple Maps-style circular control: opaque white, soft drop shadow,
    // primary-blue fill when active. 44dp is the iOS-standard tap target.
    val bg = if (highlighted) MaterialTheme.colorScheme.primary
             else MaterialTheme.colorScheme.surface
    val fg = if (highlighted) Color.White else MaterialTheme.colorScheme.onSurface
    Box(
        Modifier
            .size(44.dp)
            .shadow(elevation = 4.dp, shape = CircleShape, clip = false)
            .clip(CircleShape)
            .background(bg)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = label, tint = fg, modifier = Modifier.size(20.dp))
    }
}

/**
 * Apple-Maps-style grouped controls — three stacked buttons inside a single
 * rounded card, separated by hairline dividers. Feels like a real physical
 * segment control instead of loose chips.
 */
@Composable
private fun GroupedMapControls(
    onZoomIn: () -> Unit,
    onZoomOut: () -> Unit,
    is3D: Boolean,
    onToggle3D: () -> Unit,
) {
    Column(
        Modifier
            .width(44.dp)
            .shadow(elevation = 6.dp, shape = RoundedCornerShape(22.dp), clip = false)
            .clip(RoundedCornerShape(22.dp))
            .background(MaterialTheme.colorScheme.surface),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            Modifier.size(44.dp).clickable(onClick = onZoomIn),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Outlined.Add, contentDescription = "Zoom in",
                 tint = MaterialTheme.colorScheme.onSurface, modifier = Modifier.size(20.dp))
        }
        HorizontalDivider(
            Modifier.padding(horizontal = 10.dp),
            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f),
        )
        Box(
            Modifier.size(44.dp).clickable(onClick = onZoomOut),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Outlined.Remove, contentDescription = "Zoom out",
                 tint = MaterialTheme.colorScheme.onSurface, modifier = Modifier.size(20.dp))
        }
        HorizontalDivider(
            Modifier.padding(horizontal = 10.dp),
            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f),
        )
        val fg3d = if (is3D) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
        Box(
            Modifier.size(44.dp).clickable(onClick = onToggle3D),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Outlined.ViewInAr, contentDescription = if (is3D) "2D view" else "3D view",
                 tint = fg3d, modifier = Modifier.size(20.dp))
        }
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
    roomCountByFloor: Map<Int, Int> = emptyMap(),
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    // MazeMap-style pill floor selector: opaque white card with soft
    // shadow, highest floor at the top, each floor a squircle chip.
    // Floors with zero drawn rooms show a dimmed number so the user
    // can see there's no data on that level (rather than assuming
    // the app is broken).
    Column(
        modifier
            .shadow(elevation = 6.dp, shape = RoundedCornerShape(28.dp), clip = false)
            .clip(RoundedCornerShape(28.dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(vertical = 8.dp, horizontal = 6.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        floors.reversed().forEach { f ->
            val isSel = selected == f
            val count = roomCountByFloor[f] ?: 0
            val hasData = count > 0
            Box(
                Modifier
                    .size(width = 40.dp, height = 34.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(
                        if (isSel) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.surface
                    )
                    .clickable { onSelect(f) },
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    f.toString(),
                    fontSize = 14.sp,
                    fontWeight = if (isSel) FontWeight.Bold else FontWeight.SemiBold,
                    color = when {
                        isSel -> Color.White
                        hasData -> MaterialTheme.colorScheme.onSurface
                        else -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.35f)
                    },
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
private fun BuildingSheet(
    building: JsonObject,
    lang: String = "fi",
    onDismiss: () -> Unit,
    onFocus: () -> Unit,
) {
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
                Chip(
                    if (lang == "fi") "$floors kerros${if (floors == 1) "" else "ta"}"
                    else "$floors floor${if (floors == 1) "" else "s"}"
                )
            }
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = onFocus,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(10.dp),
            ) {
                Icon(Icons.Outlined.MyLocation, null)
                Spacer(Modifier.width(6.dp))
                Text(
                    if (lang == "fi") "Keskitä karttaan" else "Focus on map",
                    fontWeight = FontWeight.SemiBold,
                )
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RoomSheet(
    room: JsonObject,
    lang: String = "fi",
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
                    Text(
                        "${if (lang == "fi") "Luokka" else "Room"} $number",
                        fontWeight = FontWeight.Bold,
                        fontSize = 22.sp,
                    )
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
                Chip("${if (lang == "fi") "Kerros" else "Floor"} $floor")
                if (type.isNotBlank()) Chip(type)
                if (capacity != null && capacity > 0)
                    Chip("${if (lang == "fi") "Paikkoja" else "Seats"} $capacity")
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
                Text(
                    if (lang == "fi") "Suunnista tänne" else "Directions here",
                    fontWeight = FontWeight.Bold, fontSize = 15.sp,
                )
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
                    Text(
                        if (lang == "fi") "Keskitä" else "Focus",
                        fontWeight = FontWeight.SemiBold, fontSize = 13.sp,
                    )
                }
                OutlinedButton(
                    onClick = { onSwitchFloor(floor); onDismiss() },
                    modifier = Modifier.weight(1f).height(46.dp),
                    shape = RoundedCornerShape(10.dp),
                ) {
                    Icon(Icons.Outlined.Layers, null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(
                        if (lang == "fi") "Rajaa kerros" else "Isolate floor",
                        fontWeight = FontWeight.SemiBold, fontSize = 13.sp,
                    )
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
                Icon(
                    Icons.Outlined.Close,
                    null,
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
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
    lang: String = "fi",
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
                Text(
                    if (lang == "fi") "Lähtöpaikka" else "Start from",
                    fontWeight = FontWeight.Bold, fontSize = 15.sp,
                )
                Text(
                    "→ $destinationLabel",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            IconButton(onClick = onCancel) {
                Icon(
                    Icons.Outlined.Close,
                    if (lang == "fi") "Peruuta" else "Cancel",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
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
            Text(
                if (lang == "fi") "Oma sijainti" else "My location",
                fontWeight = FontWeight.SemiBold,
            )
        }
        Spacer(Modifier.height(8.dp))
        OutlinedButton(
            onClick = onSearchRoom,
            modifier = Modifier.fillMaxWidth().height(46.dp),
            shape = RoundedCornerShape(10.dp),
        ) {
            Icon(Icons.Outlined.Search, null)
            Spacer(Modifier.width(8.dp))
            Text(
                if (lang == "fi") "Etsi lähtöhuone" else "Search a room",
                fontWeight = FontWeight.SemiBold,
            )
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
    lang: String = "fi",
    onTap: () -> Unit,
) {
    val floorSuffix = position.floor?.let {
        if (lang == "fi") " · K$it" else " · F$it"
    } ?: ""
    val (dotColor, label) = when (position.confidence) {
        WifiPosition.Confidence.HIGH   -> Color(0xFF16A34A) to "~${position.positionLabel}$floorSuffix"
        WifiPosition.Confidence.MEDIUM -> Color(0xFFF59E0B) to "~${position.positionLabel}$floorSuffix"
        else                           -> Color(0xFF94A3B8) to
            (if (lang == "fi") "Etsitään…" else "Searching…")
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
    // Prefer explicit floorMax when the admin has set it — a building may
    // have floors=3 but floorMax=4 if there's a mezzanine/rooftop level
    // that isn't counted in the standard floor count. Falling back to
    // `floors` matches the older schema.
    val maxCandidates = buildings.mapNotNull {
        (it["floorMax"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull()
            ?: (it["floors"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull()
    }
    val max = maxCandidates.maxOrNull() ?: 0
    val min = buildings.mapNotNull {
        (it["floorMin"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull()
    }.minOrNull() ?: 1
    if (max <= 0) return emptyList()
    return (min..max).toList()
}

/**
 * Fallback Point markers for buildings that have no drawn polygon.
 * Uses `coordinates.lat`/`coordinates.lng` from the server response.
 * Shows a colored circle on screen even when nothing has been drawn
 * in the campus builder yet.
 */
private fun buildBuildingPinsFeatureCollection(buildings: List<JsonObject>): String {
    val features = StringBuilder()
    var first = true
    for (b in buildings) {
        // Skip if already has a polygon — polygon rendering takes priority.
        val pts = b["points"] as? JsonArray
        if (pts != null && pts.size >= 3) continue
        // Prefer `coordinates` field, fall back to mapPositionY/X (canvas integers, not geo).
        val coordObj = b["coordinates"] as? JsonObject
        val lat = (coordObj?.get("lat") as? JsonPrimitive)?.doubleOrNull ?: continue
        val lng = (coordObj?.get("lng") as? JsonPrimitive)?.doubleOrNull ?: continue
        val name = (b["name"] as? JsonPrimitive)?.contentOrNull?.escape() ?: "Building"
        val color = (b["colorCode"] as? JsonPrimitive)?.contentOrNull?.escape() ?: "#2563eb"
        val id = (b["id"] as? JsonPrimitive)?.contentOrNull?.escape() ?: ""
        if (!first) features.append(",")
        features.append(
            """{"type":"Feature","id":"$id","geometry":{"type":"Point","coordinates":[$lng,$lat]},"properties":{"name":"$name","color":"$color","id":"$id"}}"""
        )
        first = false
    }
    return """{"type":"FeatureCollection","features":[$features]}"""
}

/**
 * Fallback Point markers for rooms that have no drawn polygon on the active floor.
 */
private fun buildRoomPinsFeatureCollection(rooms: List<JsonObject>, floor: Int?): String {
    val features = StringBuilder()
    var first = true
    for (r in rooms) {
        val roomFloor = (r["floor"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() ?: 1
        if (floor != null && roomFloor != floor) continue
        val pts = r["points"] as? JsonArray
        if (pts != null && pts.size >= 3) continue
        val coordObj = r["coordinates"] as? JsonObject
        val lat = (coordObj?.get("lat") as? JsonPrimitive)?.doubleOrNull ?: continue
        val lng = (coordObj?.get("lng") as? JsonPrimitive)?.doubleOrNull ?: continue
        val explicitColor = (r["colorCode"] as? JsonPrimitive)?.contentOrNull
        val roomType = (r["type"] as? JsonPrimitive)?.contentOrNull
        val color = (explicitColor ?: colorForRoomType(roomType) ?: "#059669").escape()
        val id = (r["id"] as? JsonPrimitive)?.contentOrNull?.escape() ?: ""
        if (!first) features.append(",")
        features.append(
            """{"type":"Feature","id":"$id","geometry":{"type":"Point","coordinates":[$lng,$lat]},"properties":{"color":"$color","id":"$id","floor":$roomFloor}}"""
        )
        first = false
    }
    return """{"type":"FeatureCollection","features":[$features]}"""
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

/** Build a GeoJSON FeatureCollection string of building polygons.
 *  We intentionally do NOT filter buildings by floor — a building's
 *  outline is the same shape on every level. The previous filter
 *  hid buildings whose `floors` was set to 1 (the schema default)
 *  whenever the user picked floor 2/3/4, which is why "only floor 1
 *  shows building outlines". Rooms remain floor-filtered elsewhere. */
private fun buildBuildingsFeatureCollection(buildings: List<JsonObject>, @Suppress("UNUSED_PARAMETER") floor: Int?): String {
    val features = StringBuilder()
    var first = true
    for (b in buildings) {
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
    val ptsArr = b["points"] as? JsonArray
    if (ptsArr != null && ptsArr.size >= 3) {
        var lat = 0.0; var lng = 0.0; var n = 0
        for (p in ptsArr) {
            val po = p as? JsonObject ?: continue
            val la = (po["lat"] as? JsonPrimitive)?.doubleOrNull ?: continue
            val ln = (po["lng"] as? JsonPrimitive)?.doubleOrNull ?: continue
            lat += la; lng += ln; n++
        }
        if (n > 0) return lat / n to lng / n
    }
    val coordObj = b["coordinates"] as? JsonObject
    val lat = (coordObj?.get("lat") as? JsonPrimitive)?.doubleOrNull
    val lng = (coordObj?.get("lng") as? JsonPrimitive)?.doubleOrNull
    if (lat != null && lng != null) return lat to lng
    return null
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
        val pts = (b["points"] as? JsonArray)?.mapNotNull { p ->
            val po = p as? JsonObject ?: return@mapNotNull null
            val lat = (po["lat"] as? JsonPrimitive)?.doubleOrNull ?: return@mapNotNull null
            val lng = (po["lng"] as? JsonPrimitive)?.doubleOrNull ?: return@mapNotNull null
            LatLng(lat, lng)
        } ?: emptyList()
        if (pts.isNotEmpty()) pts
        else {
            val c = b["coordinates"] as? JsonObject
            val lat = (c?.get("lat") as? JsonPrimitive)?.doubleOrNull
            val lng = (c?.get("lng") as? JsonPrimitive)?.doubleOrNull
            if (lat != null && lng != null) listOf(LatLng(lat, lng)) else emptyList()
        }
    }
    if (allPoints.isEmpty()) return
    if (allPoints.size == 1) {
        map.animateCamera(CameraUpdateFactory.newLatLngZoom(allPoints[0], KSYK_ZOOM), 600)
        return
    }
    val bounds = LatLngBounds.Builder().apply { allPoints.forEach { include(it) } }.build()
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

/**
 * Admin-set mobile camera defaults, cached locally.
 *
 * The admin panel exposes mobileCenterLat/Lng/Zoom/RotationDeg/PitchDeg
 * on /api/settings so the web + native map agree on "where should this
 * campus open." We cache the last successful fetch under CAM_PREFS with
 * a "server_" prefix so the very first cold open still gets sensible
 * values, and refresh in the background on each map open.
 */
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
        val json = fi.ksykmaps.data.Api.get("/settings")
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
    } catch (_: Throwable) { /* offline / API error — keep cached values */ }
}
