package fr.fuelradar.ui.map

import android.Manifest
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.LocationDisabled
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Route
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
import androidx.compose.material.icons.filled.TripOrigin
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ElevatedFilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.tasks.CancellationTokenSource
import com.google.maps.android.compose.Circle
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapProperties
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.MapsComposeExperimentalApi
import com.google.maps.android.compose.MarkerComposable
import com.google.maps.android.compose.Polyline
import com.google.maps.android.compose.rememberCameraPositionState
import com.google.maps.android.compose.rememberMarkerState
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import fr.fuelradar.BuildConfig
import fr.fuelradar.R
import fr.fuelradar.data.ServiceLocator
import fr.fuelradar.data.geo.AddressResult
import fr.fuelradar.data.model.FuelType
import fr.fuelradar.data.prefs.SortMode
import fr.fuelradar.data.route.RouteState
import fr.fuelradar.domain.formatDistance
import fr.fuelradar.domain.formatPrice
import fr.fuelradar.domain.formatPriceEuro
import fr.fuelradar.domain.haversineKm
import fr.fuelradar.domain.priceColor
import fr.fuelradar.ui.common.AddressSearchBar
import fr.fuelradar.ui.common.BrandLogo
import fr.fuelradar.ui.common.hasFineLocation
import fr.fuelradar.ui.common.relativeTime
import fr.fuelradar.ui.common.rememberLocationGranted
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.first
import kotlin.math.abs

private const val MAX_PINS = 150

/** One row of the draggable station sheet (browse: distance from the search
 *  centre; route mode: progression along the trip). */
private data class SheetRow(
    val item: StationClusterItem,
    val distanceKm: Double,
)

@OptIn(MapsComposeExperimentalApi::class)
@Composable
fun MapScreen(
    onOpenStation: (Long) -> Unit,
    viewModel: MapViewModel = viewModel(),
) {
    if (BuildConfig.MAPS_API_KEY.isBlank()) {
        Column(
            modifier = Modifier.fillMaxSize().padding(32.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(stringResource(R.string.map_unavailable), style = MaterialTheme.typography.titleMedium)
            Text(
                stringResource(R.string.map_key_missing),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        return
    }

    val context = LocalContext.current
    val state by viewModel.state.collectAsStateWithLifecycle()
    val target by viewModel.target.collectAsStateWithLifecycle()
    val route by viewModel.routeState.collectAsStateWithLifecycle()
    val routeInput by viewModel.routeInput.collectAsStateWithLifecycle()
    val favorites by viewModel.favorites.collectAsStateWithLifecycle(emptySet())
    // Station flagged by "view on map": bounce its pin, then release after a moment.
    val focusId by ServiceLocator.filters.focusStationId.collectAsStateWithLifecycle(null)
    LaunchedEffect(focusId) {
        if (focusId != null) {
            delay(4500)
            ServiceLocator.filters.setFocusStation(null)
        }
    }
    var showFilters by remember { mutableStateOf(false) }
    // Station popover (spec §3): opened by tapping a pin; closed by the X, a tap
    // on the map, or back. Saveable so it survives a configuration change.
    var selectedStationId by rememberSaveable { mutableStateOf<Long?>(null) }
    BackHandler(enabled = selectedStationId != null) { selectedStationId = null }
    // Entering or leaving route mode changes the map context: dismiss the popover
    // on the TRANSITION only (drop(1) skips the initial emission, so a restored
    // popover isn't closed right away).
    LaunchedEffect(Unit) {
        snapshotFlow { route.active }.drop(1).collect { selectedStationId = null }
    }
    // Cold-start framing (no saved location yet): a wide Western-Europe view
    // covering France, Spain and Portugal. Once a location is known the camera
    // jumps to it (see the target effect below).
    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(LatLng(43.0, -3.0), 4.6f)
    }

    val fused = remember { LocationServices.getFusedLocationProviderClient(context) }
    val locationGranted = rememberLocationGranted()
    fun fetchLocation() {
        if (!hasFineLocation(context)) return
        runCatching {
            fused.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, CancellationTokenSource().token)
                .addOnSuccessListener { loc ->
                    if (loc != null) {
                        viewModel.onLocated(loc.latitude, loc.longitude)
                    } else {
                        fused.lastLocation.addOnSuccessListener { last ->
                            if (last != null) viewModel.onLocated(last.latitude, last.longitude)
                        }
                    }
                }
        }
    }
    val permLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        locationGranted.value = granted
        if (granted) fetchLocation()
    }
    val onLocateClick = {
        if (locationGranted.value) fetchLocation()
        else permLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
    }
    // On first launch with no saved location, ask for / use the device location.
    LaunchedEffect(Unit) {
        if (ServiceLocator.filters.filters.first().userLocation == null) {
            if (locationGranted.value) fetchLocation()
            else permLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
        }
    }

    if (showFilters) {
        FilterSheetHost(state, viewModel) { showFilters = false }
    }

    // Recenter the camera whenever a search / locate / "view on map" resolves.
    // Station loading is driven solely by the filters collector in the VM (the
    // station set is always anchored on userLocation), so there is deliberately
    // no camera-driven reload here — that previously raced with the filters
    // update and left stale pins from the previous location.
    // The first recenter (persisted location on launch) jumps instantly so the
    // map doesn't visibly fly from the default Paris position each start; later
    // recenters (search / locate) animate.
    var firstCenter by remember { mutableStateOf(true) }
    LaunchedEffect(target) {
        target?.let {
            val update = CameraUpdateFactory.newLatLngZoom(LatLng(it.lat, it.lng), 12f)
            if (firstCenter) {
                firstCenter = false
                cameraPositionState.move(update)
            } else {
                cameraPositionState.animate(update)
            }
            viewModel.consumeTarget()
        }
    }

    // In route mode, frame the WHOLE trip (start → end) so the user sees stations
    // across every country crossed, not just around the start.
    LaunchedEffect(route.routePoints) {
        if (route.routePoints.size >= 2) {
            val b = com.google.android.gms.maps.model.LatLngBounds.builder()
            route.routePoints.forEach { b.include(LatLng(it.lat, it.lng)) }
            runCatching {
                cameraPositionState.animate(CameraUpdateFactory.newLatLngBounds(b.build(), 120))
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraPositionState,
            onMapClick = { selectedStationId = null },
            properties = MapProperties(
                // Native blue "my location" dot so the user sees where they are (#7).
                isMyLocationEnabled = locationGranted.value,
                // Dark styling (spec §4) — null on failure = default style.
                mapStyleOptions = rememberDarkMapStyle(),
            ),
            uiSettings = MapUiSettings(
                zoomControlsEnabled = false,
                mapToolbarEnabled = false,
                myLocationButtonEnabled = false,
                compassEnabled = false,
                indoorLevelPickerEnabled = false,
                rotationGesturesEnabled = false,
                tiltGesturesEnabled = false,
            ),
        ) {
            if (route.active && route.hasRoute) {
                // Route mode: neon trip line (wide translucent glow + thin vivid
                // core, spec §3) + the stations selected along it.
                val tripPoints = route.routePoints.map { LatLng(it.lat, it.lng) }
                val accent = MaterialTheme.colorScheme.primary
                Polyline(points = tripPoints, color = accent.copy(alpha = 0.25f), width = 24f)
                Polyline(points = tripPoints, color = accent, width = 8f)
                // #6: a glowing segment traveling from start to end, looping — an
                // animated "comet" drawn on top of the route line.
                val pulse = rememberInfiniteTransition(label = "routePulse")
                val t by pulse.animateFloat(
                    initialValue = 0f,
                    targetValue = 1f,
                    animationSpec = infiniteRepeatable(
                        tween(2200, easing = LinearEasing),
                        RepeatMode.Restart,
                    ),
                    label = "t",
                )
                val pts = route.routePoints
                val n = pts.size
                val head = (t * (n - 1)).toInt().coerceIn(0, n - 1)
                val window = maxOf(2, n / 12)
                val from = (head - window).coerceAtLeast(0)
                val segment = pts.subList(from, head + 1).map { LatLng(it.lat, it.lng) }
                if (segment.size >= 2) {
                    Polyline(points = segment, color = accent, width = 18f)
                }
                route.stations.take(MAX_PINS).forEach { rs ->
                    key(rs.station.id) {
                        val ms = rememberMarkerState(
                            key = rs.station.id.toString(),
                            position = LatLng(rs.station.lat, rs.station.lng),
                        )
                        val lbl = rs.price?.let { "${formatPrice(it)} €" }
                        val c = rs.price?.let { priceColor(it, route.pMin, route.pMax) }
                            ?: MaterialTheme.colorScheme.onSurfaceVariant
                        if (rs.station.id == selectedStationId) {
                            // Selected while its popover is open: accent ring +
                            // bounce (quantized keys force re-rasterization).
                            val transition = rememberInfiniteTransition(label = "routeSel")
                            val scale by transition.animateFloat(
                                initialValue = 1f,
                                targetValue = 1.22f,
                                animationSpec = infiniteRepeatable(tween(500), RepeatMode.Reverse),
                                label = "scale",
                            )
                            MarkerComposable(
                                keys = arrayOf(rs.station.id, (scale * 12).toInt()),
                                state = ms,
                                onClick = { selectedStationId = rs.station.id; true },
                            ) {
                                Box(modifier = Modifier.padding(10.dp)) {
                                    StationPin(
                                        brand = rs.station.brand,
                                        priceLabel = lbl,
                                        priceColor = c,
                                        selected = true,
                                        cheapest = rs.station.id == route.cheapestId,
                                        scale = scale,
                                    )
                                }
                            }
                        } else {
                            MarkerComposable(
                                keys = arrayOf(rs.station.id),
                                state = ms,
                                onClick = { selectedStationId = rs.station.id; true },
                            ) {
                                StationPin(
                                    brand = rs.station.brand,
                                    priceLabel = lbl,
                                    priceColor = c,
                                    cheapest = rs.station.id == route.cheapestId,
                                )
                            }
                        }
                    }
                }
                // Start / end badges — clearly visible endpoints.
                val sp = route.routePoints.first()
                val ep = route.routePoints.last()
                key("route-start") {
                    val startState = rememberMarkerState(position = LatLng(sp.lat, sp.lng))
                    MarkerComposable(keys = arrayOf("start", sp.lat, sp.lng), state = startState) {
                        EndpointBadge(
                            color = MaterialTheme.colorScheme.primary,
                            contentColor = MaterialTheme.colorScheme.onPrimary,
                            icon = Icons.Filled.TripOrigin,
                        )
                    }
                }
                key("route-end") {
                    val endState = rememberMarkerState(position = LatLng(ep.lat, ep.lng))
                    MarkerComposable(keys = arrayOf("end", ep.lat, ep.lng), state = endState) {
                        EndpointBadge(
                            color = MaterialTheme.colorScheme.error,
                            contentColor = MaterialTheme.colorScheme.onError,
                            icon = Icons.Filled.Flag,
                        )
                    }
                }
            } else {
            // Search-radius circle around the current location.
            Circle(
                center = LatLng(state.center.lat, state.center.lng),
                radius = state.radiusKm * 1000.0,
                strokeColor = MaterialTheme.colorScheme.primary,
                strokeWidth = 3f,
                fillColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.06f),
            )
            // Individual logo pins (no clustering). The cheapest one bounces.
            // Each marker is wrapped in key(station.id) so Compose disposes the
            // markers that leave the set when the location/radius changes —
            // otherwise MarkerComposable leaves ghost pins from the old search.
            state.items.take(MAX_PINS).forEach { item ->
                key(item.station.id) {
                    val markerState = rememberMarkerState(
                        key = item.station.id.toString(),
                        position = LatLng(item.station.lat, item.station.lng),
                    )
                    val label = item.price?.let { "${formatPrice(it)} €" }
                    val color = item.price?.let { priceColor(it, state.pMin, state.pMax) }
                        ?: MaterialTheme.colorScheme.onSurfaceVariant
                    val cheapest = item.station.id == state.cheapestId
                    // Highlighted = flagged by "view on map" OR selected via the
                    // open popover: accent ring + bounce.
                    val highlighted = item.station.id == focusId ||
                        item.station.id == selectedStationId
                    if (cheapest || highlighted) {
                        val transition = rememberInfiniteTransition(label = "bounce")
                        val scale by transition.animateFloat(
                            initialValue = 1f,
                            targetValue = 1.22f,
                            animationSpec = infiniteRepeatable(tween(500), RepeatMode.Reverse),
                            label = "scale",
                        )
                        // Quantized scale in the marker keys forces re-rasterization
                        // each step, so the pin visibly bounces. The padding keeps the
                        // rasterized bounds large enough so the scaled pin isn't clipped.
                        MarkerComposable(
                            keys = arrayOf(item.station.id, (scale * 12).toInt()),
                            state = markerState,
                            onClick = { selectedStationId = item.station.id; true },
                        ) {
                            Box(modifier = Modifier.padding(10.dp)) {
                                StationPin(
                                    brand = item.station.brand,
                                    priceLabel = label,
                                    priceColor = color,
                                    selected = highlighted,
                                    cheapest = cheapest,
                                    scale = scale,
                                )
                            }
                        }
                    } else {
                        MarkerComposable(
                            keys = arrayOf(item.station.id),
                            state = markerState,
                            onClick = { selectedStationId = item.station.id; true },
                        ) {
                            StationPin(
                                brand = item.station.brand,
                                priceLabel = label,
                                priceColor = color,
                            )
                        }
                    }
                }
            }
            }
        }

        // Search + route panel overlay.
        Column(
            modifier = Modifier.fillMaxWidth().padding(12.dp).align(Alignment.TopCenter),
        ) {
            if (route.active) {
                RouteInputPanel(
                    route = route,
                    input = routeInput,
                    onStartQuery = viewModel::onRouteStartQueryChange,
                    onEndQuery = viewModel::onRouteEndQueryChange,
                    onSelectStart = viewModel::selectRouteStart,
                    onSelectEnd = viewModel::selectRouteEnd,
                    onToggleHighwayOnly = viewModel::setRouteHighwayOnly,
                    onExit = viewModel::exitRouteMode,
                )
            } else {
                Surface(
                    shape = MaterialTheme.shapes.extraLarge,
                    shadowElevation = 6.dp,
                    color = MaterialTheme.colorScheme.surfaceContainerHigh,
                ) {
                    AddressSearchBar(
                        query = state.query,
                        suggestions = state.suggestions,
                        onQueryChange = viewModel::onQueryChange,
                        onSelect = viewModel::selectSuggestion,
                        onSearch = viewModel::search,
                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp),
                        trailingIcon = {
                            Row {
                                IconButton(onClick = { viewModel.enterRouteMode() }) {
                                    Icon(Icons.Filled.Route, contentDescription = stringResource(R.string.route_title))
                                }
                                IconButton(onClick = onLocateClick) {
                                    Icon(
                                        if (locationGranted.value) Icons.Filled.MyLocation
                                        else Icons.Filled.LocationDisabled,
                                        contentDescription = stringResource(R.string.locate_me),
                                        tint = if (locationGranted.value) MaterialTheme.colorScheme.onSurfaceVariant
                                        else MaterialTheme.colorScheme.error,
                                    )
                                }
                                IconButton(onClick = { showFilters = true }) {
                                    Icon(Icons.Filled.Tune, contentDescription = stringResource(R.string.filters))
                                }
                            }
                        },
                    )
                }
            }
            // Fuel is chosen entirely in the filter sheet (the Tune icon) to keep
            // the map uncluttered.
        }

        val routeMode = route.active && route.hasRoute

        // Popover data for the tapped pin (browse: distance from the search
        // centre; route mode: progression along the trip).
        val selectedRow = remember(selectedStationId, state.items, state.center, routeMode, route.stations) {
            val id = selectedStationId
            when {
                id == null -> null
                routeMode -> route.stations.firstOrNull { it.station.id == id }
                    ?.let { SheetRow(StationClusterItem(it.station, it.price), it.progressKm) }
                else -> state.items.firstOrNull { it.station.id == id }
                    ?.let {
                        SheetRow(it, haversineKm(state.center.lat, state.center.lng, it.station.lat, it.station.lng))
                    }
            }
        }
        // The tapped station left the set (filters/radius/route changed): drop
        // the stale selection instead of keeping a ghost popover state.
        LaunchedEffect(selectedStationId, selectedRow) {
            if (selectedStationId != null && selectedRow == null) selectedStationId = null
        }

        if (selectedRow != null) {
            // Popover replaces the sheet at the bottom — cleanest with the
            // sheet's internal height state (nothing to coordinate; the sheet
            // reopens at its base detent once the popover closes).
            StationPopover(
                item = selectedRow.item,
                distanceKm = selectedRow.distanceKm,
                selectedFuel = state.filters.fuel,
                priceColor = selectedRow.item.price?.let {
                    priceColor(
                        it,
                        if (routeMode) route.pMin else state.pMin,
                        if (routeMode) route.pMax else state.pMax,
                    )
                } ?: MaterialTheme.colorScheme.onSurface,
                onClose = { selectedStationId = null },
                onDetails = { onOpenStation(selectedRow.item.station.id) },
                onRoute = {
                    viewModel.routeToStation(selectedRow.item.station)
                    selectedStationId = null
                },
                modifier = Modifier.align(Alignment.BottomCenter),
            )
        } else if (!route.active || routeMode) {
            // Draggable station sheet (map-first fusion of the old Stations tab):
            // same data as the pins, ordered by the active sort — or, in route
            // mode, the stations along the trip ordered by progression.
            val sheetRows = remember(state.items, state.filters.sort, state.center, routeMode, route.stations) {
                if (routeMode) {
                    route.stations.map { SheetRow(StationClusterItem(it.station, it.price), it.progressKm) }
                } else {
                    val rows = state.items.map {
                        SheetRow(it, haversineKm(state.center.lat, state.center.lng, it.station.lat, it.station.lng))
                    }
                    when (state.filters.sort) {
                        SortMode.PRICE -> rows.sortedBy { it.item.price ?: Double.MAX_VALUE }
                        SortMode.DISTANCE -> rows.sortedBy { it.distanceKm }
                    }
                }
            }
            StationSheet(
                rows = sheetRows,
                cheapestId = if (routeMode) route.cheapestId else state.cheapestId,
                pMin = if (routeMode) route.pMin else state.pMin,
                pMax = if (routeMode) route.pMax else state.pMax,
                focusId = focusId,
                favorites = favorites,
                loading = if (routeMode) route.loading else state.loading,
                onToggleFavorite = viewModel::toggleFavorite,
                onOpen = { onOpenStation(it.station.id) },
                modifier = Modifier.align(Alignment.BottomCenter),
            )
        }
    }
}

@Composable
private fun StationSheet(
    rows: List<SheetRow>,
    cheapestId: Long?,
    pMin: Double,
    pMax: Double,
    focusId: Long?,
    favorites: Set<Long>,
    loading: Boolean,
    onToggleFavorite: (Long) -> Unit,
    onOpen: (StationClusterItem) -> Unit,
    modifier: Modifier = Modifier,
) {
    val density = LocalDensity.current
    val config = LocalConfiguration.current
    val scope = rememberCoroutineScope()
    val closedPx = with(density) { 72.dp.toPx() }
    val basePx = with(density) { 240.dp.toPx() }
    val openPx = with(density) { (config.screenHeightDp * 0.6f).dp.toPx() }
    val heightAnim = remember { Animatable(basePx) }

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .height(with(density) { heightAnim.value.toDp() }),
        shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
        shadowElevation = 8.dp,
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .pointerInput(Unit) {
                        detectVerticalDragGestures(
                            onVerticalDrag = { change, dy ->
                                change.consume()
                                scope.launch {
                                    heightAnim.snapTo(
                                        (heightAnim.value - dy).coerceIn(closedPx, openPx),
                                    )
                                }
                            },
                            onDragEnd = {
                                val target = listOf(closedPx, basePx, openPx)
                                    .minByOrNull { abs(it - heightAnim.value) } ?: basePx
                                scope.launch { heightAnim.animateTo(target) }
                            },
                        )
                    },
            ) {
                Box(
                    modifier = Modifier
                        .align(Alignment.CenterHorizontally)
                        .padding(top = 10.dp)
                        .size(width = 36.dp, height = 4.dp)
                        .background(MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(2.dp)),
                )
                Text(
                    stringResource(R.string.stations_count, rows.size),
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 8.dp),
                )
            }
            if (rows.isEmpty() && !loading) {
                Text(
                    stringResource(R.string.no_stations_area),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 8.dp),
                )
            }
            LazyColumn(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(rows, key = { it.item.station.id }) { row ->
                    MapStationRow(
                        item = row.item,
                        distanceKm = row.distanceKm,
                        cheapest = row.item.station.id == cheapestId,
                        selected = row.item.station.id == focusId,
                        favorite = favorites.contains(row.item.station.id),
                        priceColor = row.item.price?.let { priceColor(it, pMin, pMax) }
                            ?: MaterialTheme.colorScheme.onSurface,
                        onToggleFavorite = { onToggleFavorite(row.item.station.id) },
                        onClick = {
                            onOpen(row.item)
                            scope.launch { heightAnim.animateTo(basePx) }
                        },
                    )
                }
            }
        }
    }
}

/**
 * Station popover (spec §3), opened by tapping a pin: bottom card `surface-2`,
 * header (avatar + name + `distance • price` + 24/7 mini-chip), outline chips
 * (selected fuel price / distance / freshness), other-fuel price chips, then
 * "More details" (white 10 % pill) and "Itinéraire" (accent) CTAs.
 */
@Composable
private fun StationPopover(
    item: StationClusterItem,
    distanceKm: Double,
    selectedFuel: FuelType,
    priceColor: Color,
    onClose: () -> Unit,
    onDetails: () -> Unit,
    onRoute: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val st = item.station
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
        color = MaterialTheme.colorScheme.surfaceContainerHigh,
        shadowElevation = 16.dp,
    ) {
        // 20.dp en bas : même règle que le popover web (padding >= radius + 4)
        // pour que les CTA ne paraissent pas collés au bord.
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 20.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                BrandLogo(st.brand, size = 44.dp)
                Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
                    Text(
                        st.brand ?: stringResource(R.string.station_fallback),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            formatDistance(distanceKm),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                        )
                        item.price?.let {
                            Text(
                                " • ",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Text(
                                formatPriceEuro(it),
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.SemiBold,
                                color = priceColor,
                                maxLines = 1,
                            )
                        }
                        if (st.h24 == true) {
                            Spacer(Modifier.width(6.dp))
                            Surface(
                                shape = RoundedCornerShape(50),
                                color = Color.Transparent,
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                            ) {
                                Text(
                                    stringResource(R.string.h24_chip),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 1.dp),
                                )
                            }
                        }
                    }
                }
                IconButton(onClick = onClose) {
                    Icon(Icons.Filled.Close, contentDescription = stringResource(R.string.close))
                }
            }

            // Outline chips: selected fuel price / distance / data freshness.
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp)
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                item.price?.let {
                    OutlineChip("${selectedFuel.label} ${formatPrice(it)} €", priceColor)
                }
                OutlineChip(formatDistance(distanceKm))
                selectedFuel.dateIn(st.fuels)?.let { OutlineChip(relativeTime(it)) }
            }

            // Other fuels sold at this station (same policy as StationCard).
            val others = FuelType.entries
                .filter { it != selectedFuel && it.availableIn(st.fuels) }
                .take(3)
            if (others.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp)
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    others.forEach { ft ->
                        Surface(
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            shape = RoundedCornerShape(6.dp),
                        ) {
                            Text(
                                "${ft.label} ${formatPrice(ft.priceIn(st.fuels)!!)} €",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                            )
                        }
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                // "More details" — white 10 % pill, primary text (spec §3).
                Button(
                    onClick = onDetails,
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.White.copy(alpha = 0.10f),
                        contentColor = MaterialTheme.colorScheme.onSurface,
                    ),
                ) {
                    Text(stringResource(R.string.more_details), fontWeight = FontWeight.SemiBold)
                }
                // "Itinéraire" — accent CTA (theme default = primary/onPrimary).
                Button(onClick = onRoute, modifier = Modifier.weight(1f)) {
                    Icon(
                        Icons.Filled.Route,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp),
                    )
                    Text("  " + stringResource(R.string.directions), fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

/** Pill chip with a subtle outline (popover metadata row). */
@Composable
private fun OutlineChip(text: String, textColor: Color = MaterialTheme.colorScheme.onSurface) {
    Surface(
        shape = RoundedCornerShape(50),
        color = Color.Transparent,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Text(
            text,
            style = MaterialTheme.typography.labelMedium,
            color = textColor,
            maxLines = 1,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
        )
    }
}

/** Sheet list item (spec §3): 44dp circular avatar, brand name, `distance • price`
 *  (price tier-colored), optional 24/7 mini-chip, favorite star + chevron. */
@Composable
private fun MapStationRow(
    item: StationClusterItem,
    distanceKm: Double,
    cheapest: Boolean,
    selected: Boolean,
    favorite: Boolean,
    priceColor: Color,
    onToggleFavorite: () -> Unit,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        color = if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.08f)
        else MaterialTheme.colorScheme.surfaceContainerHigh,
        border = if (selected) BorderStroke(1.5.dp, MaterialTheme.colorScheme.primary)
        else BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            BrandLogo(item.station.brand, size = 44.dp)
            Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
                Text(
                    item.station.brand ?: item.station.city,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        formatDistance(distanceKm),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                    )
                    item.price?.let {
                        Text(
                            " • ",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            formatPriceEuro(it),
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.SemiBold,
                            color = priceColor,
                            maxLines = 1,
                        )
                    }
                    if (item.station.h24 == true) {
                        Spacer(Modifier.width(6.dp))
                        Surface(
                            shape = RoundedCornerShape(50),
                            color = Color.Transparent,
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                        ) {
                            Text(
                                stringResource(R.string.h24_chip),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 1.dp),
                            )
                        }
                    }
                }
                if (cheapest) {
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(top = 3.dp),
                    ) {
                        Text(
                            stringResource(R.string.cheapest),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onPrimary,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        )
                    }
                }
            }
            IconButton(onClick = onToggleFavorite) {
                Icon(
                    if (favorite) Icons.Filled.Star else Icons.Filled.StarBorder,
                    contentDescription = stringResource(R.string.favorite),
                    tint = if (favorite) MaterialTheme.colorScheme.primary
                    else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Icon(
                Icons.Filled.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

/**
 * Map pin (spec §3): white circle with the brand logo (monogram fallback),
 * white 2dp border — accent when [selected] — soft shadow, and a price badge
 * pill below (surface-2, subtle border — accent when [cheapest] — tier-colored
 * price text).
 */
@Composable
private fun StationPin(
    brand: String?,
    priceLabel: String?,
    priceColor: Color,
    selected: Boolean = false,
    cheapest: Boolean = false,
    scale: Float = 1f,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.scale(scale),
    ) {
        Surface(
            shape = CircleShape,
            color = Color.White,
            border = BorderStroke(
                2.dp,
                if (selected) MaterialTheme.colorScheme.primary else Color.White,
            ),
            shadowElevation = 4.dp,
            modifier = Modifier.size(40.dp),
        ) {
            Box(contentAlignment = Alignment.Center) {
                BrandLogo(brand, size = 34.dp)
            }
        }
        if (priceLabel != null) {
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = MaterialTheme.colorScheme.surfaceContainerHigh,
                border = BorderStroke(
                    1.dp,
                    if (cheapest) MaterialTheme.colorScheme.primary
                    else MaterialTheme.colorScheme.outlineVariant,
                ),
                shadowElevation = 2.dp,
                modifier = Modifier.padding(top = 3.dp),
            ) {
                Text(
                    text = priceLabel,
                    color = priceColor,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 11.sp,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                )
            }
        }
    }
}

/** Circular start/end badge shown at the route endpoints. */
@Composable
private fun EndpointBadge(color: Color, contentColor: Color, icon: ImageVector) {
    Surface(
        color = color,
        shape = CircleShape,
        border = BorderStroke(3.dp, Color.White),
        shadowElevation = 3.dp,
        modifier = Modifier.size(34.dp),
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = contentColor,
            modifier = Modifier.padding(6.dp),
        )
    }
}

@Composable
private fun FilterSheetHost(
    state: MapUiState,
    viewModel: MapViewModel,
    onDismiss: () -> Unit,
) {
    fr.fuelradar.ui.common.FilterSheet(
        current = state.filters,
        onDismiss = onDismiss,
        onApply = { viewModel.applyFilters(it); onDismiss() },
    )
}

/** Route-mode overlay: start/end address inputs + trip summary, on the map. */
@Composable
private fun RouteInputPanel(
    route: RouteState,
    input: RouteInputState,
    onStartQuery: (String) -> Unit,
    onEndQuery: (String) -> Unit,
    onSelectStart: (AddressResult) -> Unit,
    onSelectEnd: (AddressResult) -> Unit,
    onToggleHighwayOnly: (Boolean) -> Unit,
    onExit: () -> Unit,
) {
    // Collapse the inputs once a route is computed so the map gets full height;
    // the header chevron re-opens them (mirror of the old route screen).
    var expanded by remember { mutableStateOf(true) }
    val focus = LocalFocusManager.current
    LaunchedEffect(route.hasRoute) {
        if (route.hasRoute) {
            expanded = false
            focus.clearFocus()
        }
    }

    Surface(
        shape = MaterialTheme.shapes.extraLarge,
        shadowElevation = 6.dp,
        color = MaterialTheme.colorScheme.surfaceContainerHigh,
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 6.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Filled.Route,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                )
                Text(
                    stringResource(R.string.route_title),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f).padding(start = 8.dp),
                )
                if (route.hasRoute) {
                    IconButton(onClick = { expanded = !expanded }) {
                        Icon(
                            if (expanded) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                            contentDescription = null,
                        )
                    }
                }
                IconButton(onClick = onExit) {
                    Icon(Icons.Filled.Close, contentDescription = stringResource(R.string.close))
                }
            }
            if (expanded) {
                Text(
                    stringResource(R.string.route_start),
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(start = 4.dp),
                )
                AddressSearchBar(
                    query = input.startQuery,
                    suggestions = input.startSuggestions,
                    onQueryChange = onStartQuery,
                    onSelect = onSelectStart,
                    onSearch = {},
                )
                Text(
                    stringResource(R.string.route_end),
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(start = 4.dp, top = 6.dp),
                )
                AddressSearchBar(
                    query = input.endQuery,
                    suggestions = input.endSuggestions,
                    onQueryChange = onEndQuery,
                    onSelect = onSelectEnd,
                    onSearch = {},
                )
            }
            if (route.error) {
                Text(
                    stringResource(R.string.route_error),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
                )
            } else if (route.hasRoute) {
                Text(
                    stringResource(
                        R.string.route_summary,
                        formatDistance(route.distanceKm),
                        route.durationMin,
                        route.stations.size,
                    ),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp, bottom = 2.dp),
                )
                // Motorway-only: on a long trip the service areas are the stations
                // you can actually use — no exit, no detour. Deliberately stays
                // clickable at a count of 0, otherwise a motorway-free route would
                // trap the filter in the "on" state with nothing left to show.
                Row(
                    modifier = Modifier.fillMaxWidth().padding(bottom = 2.dp),
                    horizontalArrangement = Arrangement.Center,
                ) {
                    ElevatedFilterChip(
                        selected = route.highwayOnly,
                        onClick = { onToggleHighwayOnly(!route.highwayOnly) },
                        label = {
                            Text(stringResource(R.string.route_motorway_only, route.highwayCount))
                        },
                    )
                }
                if (route.highwayOnly && route.stations.isEmpty()) {
                    Text(
                        stringResource(R.string.route_no_motorway),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
                    )
                }
            }
        }
    }
}
