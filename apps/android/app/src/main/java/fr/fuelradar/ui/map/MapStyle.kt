package fr.fuelradar.ui.map

import android.content.Context
import android.util.Log
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import com.google.android.gms.maps.model.MapStyleOptions
import fr.fuelradar.R

private const val TAG = "MapStyle"

/**
 * Dark JSON style (res/raw/map_style_dark.json) applied to every GoogleMap —
 * the only styling path without a Cloud Map ID. Returns null on failure so the
 * map degrades to the default style instead of crashing.
 */
fun darkMapStyle(context: Context): MapStyleOptions? =
    runCatching { MapStyleOptions.loadRawResourceStyle(context, R.raw.map_style_dark) }
        .onFailure { Log.w(TAG, "Dark map style failed to load; using default style", it) }
        .getOrNull()

@Composable
fun rememberDarkMapStyle(): MapStyleOptions? {
    val context = LocalContext.current
    return remember { darkMapStyle(context) }
}
