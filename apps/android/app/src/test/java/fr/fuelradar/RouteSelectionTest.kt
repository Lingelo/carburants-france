package fr.fuelradar

import fr.fuelradar.data.model.Station
import fr.fuelradar.data.route.selectAlongRoute
import fr.fuelradar.data.routing.CorridorStation
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class RouteSelectionTest {

    /** Corridor entry at [progressKm] along the trip, motorway service area or not. */
    private fun at(progressKm: Double, motorway: Boolean = false) = CorridorStation(
        station = Station(
            id = progressKm.toLong(),
            lat = 45.0,
            lng = 5.0,
            hw = if (motorway) true else null,
        ),
        detourKm = if (motorway) 0.1 else 3.0,
        progressKm = progressKm,
    )

    @Test
    fun keeps_every_station_when_the_corridor_fits() {
        val corridor = listOf(at(0.0), at(50.0, motorway = true), at(120.0))

        val kept = selectAlongRoute(corridor, highwayOnly = false, max = 150)

        assertEquals(corridor, kept)
    }

    @Test
    fun motorway_filter_keeps_only_service_areas() {
        val corridor = listOf(
            at(0.0),
            at(40.0, motorway = true),
            at(80.0),
            at(190.0, motorway = true),
        )

        val kept = selectAlongRoute(corridor, highwayOnly = true, max = 150)

        assertEquals(listOf(40.0, 190.0), kept.map { it.progressKm })
    }

    @Test
    fun motorway_filter_on_a_route_without_one_yields_nothing_rather_than_a_fallback() {
        // The UI relies on the empty result to offer turning the filter off; silently
        // falling back to every station would contradict what the chip says.
        val corridor = listOf(at(0.0), at(30.0), at(60.0))

        assertTrue(selectAlongRoute(corridor, highwayOnly = true, max = 150).isEmpty())
    }

    @Test
    fun thinning_spans_the_whole_trip_instead_of_cropping_one_end() {
        val corridor = (0 until 600).map { at(it.toDouble()) }

        val kept = selectAlongRoute(corridor, highwayOnly = false, max = 150)

        assertEquals(150, kept.size)
        assertEquals(0.0, kept.first().progressKm, 1e-9)
        // Last sample sits within one stride of the destination, not at a third of it.
        assertTrue("last=${kept.last().progressKm}", kept.last().progressKm >= 595.0)
        // Still in driving order.
        assertEquals(kept.map { it.progressKm }.sorted(), kept.map { it.progressKm })
    }
}
