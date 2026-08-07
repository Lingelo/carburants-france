package fr.fuelradar.data.routing

import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.PolyUtil
import fr.fuelradar.data.DeptIndex
import fr.fuelradar.data.StationRepository
import fr.fuelradar.data.model.FuelType
import fr.fuelradar.data.model.Station
import fr.fuelradar.data.net.RoutingApi
import fr.fuelradar.domain.Coords
import fr.fuelradar.domain.haversineKm
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.math.roundToInt

/** A computed driving route between two points. */
data class RouteResult(
    val points: List<Coords>,
    val distanceKm: Double,
    val durationMin: Int,
)

/** A station inside the route corridor, placed relative to the trace. */
data class CorridorStation(
    val station: Station,
    /** How far off the trace it sits — the detour, straight-line. */
    val detourKm: Double,
    /** How far along the trip it is, measured from the start. */
    val progressKm: Double,
)

/**
 * Driving routes via OSRM + selection of stations along the route. Network errors
 * degrade to null/empty (same policy as StationRepository) so the UI never crashes.
 */
class RoutingRepository(
    private val api: RoutingApi,
    private val stations: StationRepository,
) {

    suspend fun route(start: Coords, end: Coords): RouteResult? = withContext(Dispatchers.IO) {
        runCatching {
            val url = buildString {
                append("https://router.project-osrm.org/route/v1/driving/")
                append("${start.lng},${start.lat};${end.lng},${end.lat}")
                append("?overview=full&geometries=geojson")
            }
            val r = api.route(url).routes.firstOrNull() ?: return@runCatching null
            val pts = r.geometry.coordinates.mapNotNull {
                if (it.size >= 2) Coords(it[1], it[0]) else null
            }
            if (pts.size < 2) null
            else RouteResult(pts, r.distance / 1000.0, (r.duration / 60.0).roundToInt())
        }.getOrNull()
    }

    /**
     * Every station within [corridorKm] of the route [polyline] that sells [fuel],
     * ordered by progression from the start of the trip. Uncapped and unfiltered
     * beyond the corridor itself: the caller decides what to keep (see
     * [fr.fuelradar.data.route.RouteSession]), which is what lets it count the
     * motorway stations it is about to filter out.
     */
    suspend fun alongRoute(
        polyline: List<Coords>,
        corridorKm: Double,
        fuel: FuelType,
    ): List<CorridorStation> = withContext(Dispatchers.IO) {
        if (polyline.size < 2) return@withContext emptyList()
        val index = stations.deptBbox() ?: return@withContext emptyList()

        // Union of departments overlapping the corridor along the whole route.
        val depts = LinkedHashSet<String>()
        val step = maxOf(1, polyline.size / 120)
        var i = 0
        while (i < polyline.size) {
            val p = polyline[i]
            depts += DeptIndex.deptsAround(index, p.lat, p.lng, corridorKm + 2.0)
            i += step
        }
        polyline.last().let { depts += DeptIndex.deptsAround(index, it.lat, it.lng, corridorKm + 2.0) }

        // Decimate the polyline for the point-on-path test to bound cost on long routes.
        val full = polyline.map { LatLng(it.lat, it.lng) }
        val testRoute = if (full.size > 400) {
            val k = full.size / 400 + 1
            full.filterIndexed { idx, _ -> idx % k == 0 || idx == full.lastIndex }
        } else {
            full
        }
        val corridorM = corridorKm * 1000.0

        // Distance travelled to reach each point of the decimated route, so a
        // station's position on the trip can be read off its nearest point.
        val travelledKm = DoubleArray(testRoute.size)
        for (idx in 1 until testRoute.size) {
            val a = testRoute[idx - 1]
            val b = testRoute[idx]
            travelledKm[idx] = travelledKm[idx - 1] +
                haversineKm(a.latitude, a.longitude, b.latitude, b.longitude)
        }

        // Keep ALL stations in the corridor (not just the cheapest per segment):
        // the user wants to see every station near the trip, especially the ones
        // close to home at the start.
        stations.stationsForDepts(depts.toList())
            .asSequence()
            .filter { fuel.availableIn(it.fuels) }
            .filter { PolyUtil.isLocationOnPath(LatLng(it.lat, it.lng), testRoute, false, corridorM) }
            .map { st ->
                var nearest = 0
                var nearestKm = Double.MAX_VALUE
                for (idx in testRoute.indices) {
                    val d = haversineKm(st.lat, st.lng, testRoute[idx].latitude, testRoute[idx].longitude)
                    if (d < nearestKm) { nearestKm = d; nearest = idx }
                }
                CorridorStation(station = st, detourKm = nearestKm, progressKm = travelledKm[nearest])
            }
            // Order by progression along the trip, not by straight-line distance
            // from the start: on a route that curves back (a bay, a mountain
            // pass) the two disagree and only the first matches driving order.
            .sortedBy { it.progressKm }
            .toList()
    }
}
