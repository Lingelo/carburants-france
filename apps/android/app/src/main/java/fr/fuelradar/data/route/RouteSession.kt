package fr.fuelradar.data.route

import fr.fuelradar.data.model.Station
import fr.fuelradar.data.prefs.FiltersStore
import fr.fuelradar.data.routing.CorridorStation
import fr.fuelradar.data.routing.RoutingRepository
import fr.fuelradar.domain.Coords
import fr.fuelradar.domain.priceBounds
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch

/**
 * Which corridor stations end up on the trip: optionally only the motorway service
 * areas, then thinned to [max].
 *
 * Thinning samples uniformly ALONG the route rather than cropping, so the density
 * stays even from start to end — a driver needs options near the destination as
 * much as near home. [corridor] must already be in driving order.
 */
internal fun selectAlongRoute(
    corridor: List<CorridorStation>,
    highwayOnly: Boolean,
    max: Int,
): List<CorridorStation> {
    val kept = if (highwayOnly) corridor.filter { it.station.hw == true } else corridor
    if (kept.size <= max) return kept
    val stride = kept.size.toDouble() / max
    return (0 until max).map { kept[(it * stride).toInt()] }
}

/** A station selected along a route, with its price and its place on the trip. */
data class RouteStation(
    val station: Station,
    val price: Double?,
    /** Distance driven from the start of the route to reach it. */
    val progressKm: Double,
    /** How far it sits off the trace — 0 km means "on the road you are driving". */
    val detourKm: Double,
)

/**
 * Shared route state. The route is a MODE of the map (not a separate screen): the
 * map and the stations list both observe this session so they stay in sync. Lives
 * in [fr.fuelradar.data.ServiceLocator] for the app session (not persisted).
 */
data class RouteState(
    /** True once the user enters route mode (inputs shown even before a full route). */
    val active: Boolean = false,
    val start: Coords? = null,
    val startLabel: String = "",
    val end: Coords? = null,
    val endLabel: String = "",
    val routePoints: List<Coords> = emptyList(),
    /** Stations along the route, sorted by progression from the start (nearest first). */
    val stations: List<RouteStation> = emptyList(),
    /** Keep only motorway service areas ("aires d'autoroute") along the trip. */
    val highwayOnly: Boolean = false,
    /** Motorway service areas in the corridor, counted before [highwayOnly] applies. */
    val highwayCount: Int = 0,
    val corridorKm: Int = 5,
    val distanceKm: Double = 0.0,
    val durationMin: Int = 0,
    val pMin: Double = 0.0,
    val pMax: Double = 1.0,
    val cheapestId: Long? = null,
    val loading: Boolean = false,
    val error: Boolean = false,
) {
    val hasRoute: Boolean get() = routePoints.size >= 2
}

class RouteSession(
    private val routing: RoutingRepository,
    private val filters: FiltersStore,
    private val scope: CoroutineScope,
) {
    private val _state = MutableStateFlow(RouteState())
    val state: StateFlow<RouteState> = _state.asStateFlow()

    private var computeJob: Job? = null

    init {
        // Recompute the station selection when the shared fuel changes (the fuel
        // pills write to the same FiltersStore).
        scope.launch {
            filters.filters.map { it.fuel }.distinctUntilChanged().collect {
                if (_state.value.hasRoute) recomputeStations()
            }
        }
    }

    /** Enter route mode (show the start/end inputs) without a route yet. */
    fun activate() {
        _state.value = _state.value.copy(active = true)
    }

    /** Leave route mode and return the map to "around me". Keeps typed endpoints. */
    fun deactivate() {
        _state.value = _state.value.copy(active = false)
    }

    /** Clear everything (exit + forget the route). */
    fun clear() {
        computeJob?.cancel()
        _state.value = RouteState()
    }

    fun setStart(coords: Coords, label: String) {
        _state.value = _state.value.copy(start = coords, startLabel = label, active = true)
        maybeCompute()
    }

    fun setEnd(coords: Coords, label: String) {
        _state.value = _state.value.copy(end = coords, endLabel = label, active = true)
        maybeCompute()
    }

    fun setCorridor(km: Int) {
        _state.value = _state.value.copy(corridorKm = km)
        if (_state.value.hasRoute) recomputeStations()
    }

    /**
     * Restrict the trip to motorway service areas — the stations you reach
     * without leaving the motorway. Re-filters the current corridor, no re-route.
     */
    fun setHighwayOnly(only: Boolean) {
        if (_state.value.highwayOnly == only) return
        _state.value = _state.value.copy(highwayOnly = only)
        if (_state.value.hasRoute) recomputeStations()
    }

    private fun maybeCompute() {
        val s = _state.value.start ?: return
        val e = _state.value.end ?: return
        computeJob?.cancel()
        computeJob = scope.launch {
            _state.value = _state.value.copy(loading = true, error = false)
            val rr = routing.route(s, e)
            if (rr == null) {
                _state.value = _state.value.copy(
                    loading = false, error = true,
                    routePoints = emptyList(), stations = emptyList(),
                )
                return@launch
            }
            val sel = computeStations(rr.points)
            _state.value = _state.value.copy(
                loading = false,
                routePoints = rr.points,
                distanceKm = rr.distanceKm,
                durationMin = rr.durationMin,
                stations = sel.rows,
                highwayCount = sel.highwayCount,
                pMin = sel.pMin,
                pMax = sel.pMax,
                cheapestId = sel.cheapestId,
            )
        }
    }

    /** Re-filter for the current route when corridor/fuel change (no re-route). */
    private fun recomputeStations() {
        val pts = _state.value.routePoints
        if (pts.size < 2) return
        computeJob?.cancel()
        computeJob = scope.launch {
            _state.value = _state.value.copy(loading = true)
            val sel = computeStations(pts)
            _state.value = _state.value.copy(
                loading = false,
                stations = sel.rows,
                highwayCount = sel.highwayCount,
                pMin = sel.pMin,
                pMax = sel.pMax,
                cheapestId = sel.cheapestId,
            )
        }
    }

    private data class Selected(
        val rows: List<RouteStation>,
        val highwayCount: Int,
        val pMin: Double,
        val pMax: Double,
        val cheapestId: Long?,
    )

    private suspend fun computeStations(points: List<Coords>): Selected {
        val fuel = filters.filters.first().fuel
        val corridor = routing.alongRoute(points, _state.value.corridorKm.toDouble(), fuel)
        // Counted on the whole corridor, before filtering: the chip has to say how
        // many service areas the trip offers even while it is hiding everything else.
        val highwayCount = corridor.count { it.station.hw == true }
        val rows = selectAlongRoute(corridor, _state.value.highwayOnly, MAX_STATIONS).map { cs ->
            RouteStation(
                station = cs.station,
                price = fuel.priceIn(cs.station.fuels),
                progressKm = cs.progressKm,
                detourKm = cs.detourKm,
            )
        }
        val (pMin, pMax) = priceBounds(rows.mapNotNull { it.price })
        val cheapest = rows.minByOrNull { it.price ?: Double.MAX_VALUE }?.station?.id
        return Selected(rows, highwayCount, pMin, pMax, cheapest)
    }

    private companion object {
        // High cap: show every station along the trip (sampled evenly only past
        // this many). Matches the map's MAX_PINS so the map shows them all.
        const val MAX_STATIONS = 150
    }
}
