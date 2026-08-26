package fr.fuelradar.ui.theme

import androidx.compose.ui.graphics.Color

// Dark map-first redesign — single dark scheme, neon-green accent.
// Mirror of the shared design tokens (docs/plans/2026-08-26-005 §2).
// Tokens are kept in one flat list so a light scheme can be reintroduced later.

// Backgrounds & surfaces
val Bg = Color(0xFF121212) // bg / surface / border of the map
val Surface1 = Color(0xFF191919) // sidebar, bottom sheet, bottom nav
val Surface2Low = Color(0xFF1E1E1E) // surfaceContainer
val Surface2 = Color(0xFF222222) // cards, inputs, chips, popover
val Surface3 = Color(0xFF2A2A2A) // hover, elevated elements

// Borders (white alpha, per spec: subtle 8 %, strong 16 %)
val BorderSubtle = Color(0x14FFFFFF)
val BorderStrong = Color(0x29FFFFFF)

// Text
val TextPrimary = Color(0xFFF5F6F4)
val TextSecondary = Color(0xFFA3A9A6)
val TextTertiary = Color(0xFF6E7573)

// Accent (neon green)
val Accent = Color(0xFF4ADE80)
val OnAccent = Color(0xFF0B2916)
val AccentContainer = Color(0xFF1E3A2A) // dark derived container
val OnAccentContainer = Color(0xFFA7F3C4)

// Status
val ErrorRed = Color(0xFFF87171)
val OnErrorRed = Color(0xFF2D0B0B)
val ErrorContainer = Color(0xFF4A1D1D)
val OnErrorContainer = Color(0xFFFECACA)

// Price tiers (semantic, brand-independent — mirror priceColor.ts)
val TierCheap = Color(0xFF4ADE80)
val TierMid = Color(0xFFFBBF24)
val TierExpensive = Color(0xFFF87171)
