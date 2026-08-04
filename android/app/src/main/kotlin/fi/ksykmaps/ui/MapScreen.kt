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
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
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

private const val SRC_ROOMS = "campus-rooms"
private const val LAYER_ROOM_FILL = "campus-rooms-fill"
private const val LAYER_ROOM_OUTLINE = "campus-rooms-outline"
private const val LAYER_ROOM_LABEL = "campus-rooms-label"

// Route line — a single blue LineString drawn from the origin centroid
// (or the current GPS puck) to the destination centroid. We refresh
// the source whenever origin/destination changes.
private const val SRC_ROUTE = "nav-route"
private const val LAYER_ROUTE_LINE = "nav-route-line"
private const val LAYER_ROUTE_CASING = "nav-route-casing"
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
    var selectedFloor by remember { mutableStateOf<Int?>(null) }
    var selected by remember { mutableStateOf<JsonObject?>(null) }
    var selectedRoom by remember { mutableStateOf<JsonObject?>(null) }
    var offlineMode by remember { mutableStateOf(false) }
    var mapRef by remember { mutableStateOf<MapLibreMap?>(null) }
    var followMe by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    var searchFocused by remember { mutableStateOf(false) }
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
                                // Rooms first — they're smaller and drawn on
                                // top so a tap that lands inside a room
                                // should select the room, not the
                                // surrounding building.
                                val roomHit = pickRoomAt(rooms, latLng, selectedFloor)
                                if (roomHit != null) {
                                    selectedRoom = roomHit
                                    return@addOnMapClickListener true
                                }
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
                selectedRoom = r
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
                selected = b
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
        // Sits under the search bar so both remain visible simultaneously.
        if (offlineMode) {
            OfflineBanner(
                Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 74.dp),
            )
        }

        // ── Building/room count pill (bottom-left) ─────────────────
        val visibleRoomCount = remember(rooms, selectedFloor) {
            if (selectedFloor == null) rooms.size
            else rooms.count { (it["floor"] as? JsonPrimitive)?.contentOrNull?.toIntOrNull() == selectedFloor }
        }
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

    // "Lähtöpaikka" picker — appears after the user hits "Suunnista
    // tänne" in a room sheet. Two quick actions + a cancel.
    if (showStartPicker) {
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
        val color = (r["colorCode"] as? JsonPrimitive)?.contentOrNull?.escape() ?: "#059669"
        val id = (r["id"] as? JsonPrimitive)?.contentOrNull?.escape() ?: ""

        if (!first) features.append(",")
        features.append(
            """{"type":"Feature","id":"$id","geometry":{"type":"Polygon","coordinates":[$coords]},"properties":{"label":"$label","name":"$name","number":"$number","color":"$color","floor":$roomFloor,"id":"$id"}}"""
        )
        first = false
    }
    return """{"type":"FeatureCollection","features":[$features]}"""
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
