package fr.fuelradar.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

// Single dark scheme (product decision: dark only — see the redesign plan §2/§4).
// Tokens are grouped in Color.kt so a light scheme can be reintroduced later.
private val DarkColors = darkColorScheme(
    primary = Accent,
    onPrimary = OnAccent,
    primaryContainer = AccentContainer,
    onPrimaryContainer = OnAccentContainer,
    inversePrimary = OnAccent,
    secondary = Accent,
    onSecondary = OnAccent,
    secondaryContainer = AccentContainer,
    onSecondaryContainer = OnAccentContainer,
    tertiary = Accent,
    onTertiary = OnAccent,
    tertiaryContainer = AccentContainer,
    onTertiaryContainer = OnAccentContainer,
    error = ErrorRed,
    onError = OnErrorRed,
    errorContainer = ErrorContainer,
    onErrorContainer = OnErrorContainer,
    background = Bg,
    onBackground = TextPrimary,
    surface = Bg,
    onSurface = TextPrimary,
    surfaceVariant = Surface3,
    onSurfaceVariant = TextSecondary,
    surfaceContainerLowest = Bg,
    surfaceContainerLow = Surface1,
    surfaceContainer = Surface2Low,
    surfaceContainerHigh = Surface2,
    surfaceContainerHighest = Surface3,
    surfaceDim = Bg,
    surfaceBright = Surface3,
    // Neutral (white) tint: tonal elevation lightens surfaces toward grey
    // instead of tinting them green.
    surfaceTint = TextPrimary,
    outline = TextTertiary,
    outlineVariant = BorderStrong,
    inverseSurface = TextPrimary,
    inverseOnSurface = Bg,
)

@Composable
fun FuelRadarTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColors,
        typography = AppTypography,
        content = content,
    )
}
