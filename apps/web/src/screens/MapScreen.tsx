import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useFilters } from '../state/FiltersContext';
import { useViewNav } from '../state/ViewContext';
import { useFavorites } from '../state/FavoritesContext';
import { useNearbyStations } from '../hooks/useNearbyStations';
import { useI18n } from '../i18n';
import { haversineKm, formatDistance } from '../lib/distance';
import { darkTiles } from '../lib/tiles';
import { timeAgo } from '../lib/data';
import { formatPrice } from '../lib/format';
import { getBrowserLocation, reverseGeocodeLabel } from '../lib/geocode';
import { getPriceBounds, getPriceColor } from '../lib/priceColor';
import { buildZoneShareUrl } from '../lib/shareUrl';
import { brandColor, brandLogoUrl, monogramLetter } from '../lib/brands';
import { fetchRoute, formatDuration, type RouteResult } from '../lib/routing';
import { ACCENT } from '../lib/theme';
import { SearchBar } from '../components/SearchBar';
import { FilterSheet } from '../components/FilterSheet';
import { StationPopover } from '../components/StationPopover';
import { StationListItem } from '../components/StationListItem';
import { InstallButton } from '../components/InstallButton';
import { Icon } from '../components/Icon';
import { FUEL_LABELS, FUEL_TYPES, type FuelType, type Station } from '../types';


interface PricedStation {
  station: Station;
  price: number;
  distance: number;
  color: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Circular brand pin (spec §3): white 38 px disc with the brand logo
 * (favicon at runtime, monogram fallback baked underneath so a failed image
 * simply reveals it), price badge pill below, tier-colored text.
 * Pure HTML — no React inside Leaflet divIcons.
 */
function makeBrandPin(opts: {
  brand?: string;
  price: number;
  tierColor: string;
  selected: boolean;
  cheapest: boolean;
}) {
  const { brand, price, tierColor, selected, cheapest } = opts;
  const logoUrl = brandLogoUrl(brand);
  const letter = escapeHtml(monogramLetter(brand));
  const monoBg = brandColor(brand);
  const circleBorder = selected ? 'var(--color-primary)' : '#ffffff';
  const circleShadow = selected
    ? '0 0 12px color-mix(in srgb, var(--color-primary) 45%, transparent), 0 4px 12px rgba(0,0,0,0.5)'
    : '0 4px 10px rgba(0,0,0,0.5)';
  const badgeBorder = cheapest ? 'var(--color-primary)' : 'var(--color-outline-variant)';
  const monoContent = letter
    ? letter
    : '<span class="material-symbols-outlined" style="font-size:18px;color:#fff;">local_gas_station</span>';
  // The white logo layer sits on top of the monogram; onerror removes it so
  // the monogram shows through when the favicon fails to load.
  const logoLayer = logoUrl
    ? `<div style="position:absolute;inset:0;background:#fff;display:flex;align-items:center;justify-content:center;"><img src="${logoUrl}" alt="" style="width:20px;height:20px;object-fit:contain;" onerror="this.parentElement.remove()"/></div>`
    : '';
  return L.divIcon({
    html: `
      <div class="${selected ? 'fuel-pin fuel-pin-selected' : 'fuel-pin'}" style="position:relative;display:flex;flex-direction:column;align-items:center;">
        ${selected ? '<div class="fuel-pin-pulse"></div>' : ''}
        <div class="fuel-pin-body" style="position:relative;width:38px;height:38px;border-radius:50%;background:${monoBg};border:2px solid ${circleBorder};box-shadow:${circleShadow};overflow:hidden;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:15px;transition:transform 200ms cubic-bezier(0.34,1.56,0.64,1),box-shadow 200ms ease;">
          ${monoContent}
          ${logoLayer}
        </div>
        <div style="margin-top:3px;background:var(--color-surface-container);border:1px solid ${badgeBorder};border-radius:8px;padding:2px 7px;font-weight:600;font-size:11px;line-height:1.2;color:${tierColor};white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5);font-variant-numeric:tabular-nums;">${formatPrice(price)} €</div>
      </div>
    `,
    className: '',
    iconSize: [64, 64],
    // Anchor at the disc center so the pin sits on the station point.
    iconAnchor: [32, 19],
  });
}

const userIcon = L.divIcon({
  html: `<div style="width:18px;height:18px;border-radius:50%;background:var(--color-primary);border:3px solid #fff;box-shadow:0 0 12px color-mix(in srgb, var(--color-primary) 45%, transparent),0 2px 6px rgba(0,0,0,0.5);"></div>`,
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function MapRecenter({
  lat,
  lng,
  trigger,
}: {
  lat: number;
  lng: number;
  trigger: number;
}) {
  const map = useMap();
  useEffect(() => {
    // `trigger` lets callers force a re-center even when lat/lng are
    // numerically identical to the previous render — e.g. tapping "Me
    // localiser" again after the user panned away.
    map.flyTo([lat, lng], Math.max(13, map.getZoom()), { duration: 0.6 });
  }, [lat, lng, trigger, map]);
  return null;
}

/** Pans/zooms the map to a station when its id changes. */
function PanToStation({
  station,
}: {
  station: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!station) return;
    map.flyTo([station.lat, station.lng], Math.max(15, map.getZoom()), {
      duration: 0.6,
    });
  }, [station, map]);
  return null;
}

function SearchRadiusCircle({ lat, lng, radiusKm }: { lat: number; lng: number; radiusKm: number }) {
  const map = useMap();
  const circleRef = useRef<L.Circle | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (circleRef.current) {
      map.removeLayer(circleRef.current);
      circleRef.current = null;
    }
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    const circle = L.circle([lat, lng], {
      radius: radiusKm * 1000,
      color: ACCENT,
      weight: 2,
      opacity: 0.45,
      fillColor: ACCENT,
      fillOpacity: 0.05,
      interactive: false,
    });
    circle.addTo(map);
    circleRef.current = circle;

    const marker = L.marker([lat, lng], { icon: userIcon, interactive: false });
    marker.addTo(map);
    markerRef.current = marker;

    return () => {
      if (circleRef.current) map.removeLayer(circleRef.current);
      if (markerRef.current) map.removeLayer(markerRef.current);
    };
  }, [map, lat, lng, radiusKm]);

  return null;
}

/** Neon route: wide translucent glow + thin vivid accent line (spec §3). */
function RouteLayer({ route }: { route: RouteResult | null }) {
  const map = useMap();
  useEffect(() => {
    if (!route) return;
    const glow = L.polyline(route.coords, {
      color: ACCENT,
      weight: 12,
      opacity: 0.25,
      interactive: false,
    });
    const line = L.polyline(route.coords, {
      color: ACCENT,
      weight: 4,
      opacity: 0.95,
      interactive: false,
    });
    glow.addTo(map);
    line.addTo(map);
    map.fitBounds(line.getBounds(), { padding: [56, 56] });
    return () => {
      map.removeLayer(glow);
      map.removeLayer(line);
    };
  }, [map, route]);
  return null;
}

function BoundsTracker({ onChange }: { onChange: (b: L.LatLngBounds) => void }) {
  const map = useMap();
  const ref = useRef(onChange);
  useEffect(() => {
    ref.current = onChange;
  }, [onChange]);
  useEffect(() => {
    const handler = () => ref.current(map.getBounds());
    handler();
    map.on('moveend', handler);
    map.on('zoomend', handler);
    return () => {
      map.off('moveend', handler);
      map.off('zoomend', handler);
    };
  }, [map]);
  return null;
}

function StationsCluster({
  priced,
  cheapestId,
  selectedId,
  onSelect,
}: {
  priced: PricedStation[];
  cheapestId: number | null;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const dataRef = useRef<Map<number, { price: number; color: string; brand?: string }>>(new Map());
  // Declared before the cluster-build effect so it is up to date when the
  // build runs (same-component effects fire in declaration order).
  const cheapestRef = useRef<number | null>(null);
  useEffect(() => {
    cheapestRef.current = cheapestId;
  }, [cheapestId]);

  useEffect(() => {
    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
    }
    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      showCoverageOnHover: false,
      disableClusteringAtZoom: 15,
      iconCreateFunction(c) {
        const children = c.getAllChildMarkers();
        const datas = children.map((m) => m.options as Record<string, unknown>);
        const minPrice = Math.min(...datas.map((d) => d.fuelPrice as number));
        const minColor =
          (datas.find((d) => d.fuelPrice === minPrice)?.fuelColor as string) ??
          'var(--color-on-surface)';
        const count = c.getChildCount();
        // Same visual language as the single pins: circle on the point,
        // price badge below — the circle carries the station count.
        return L.divIcon({
          html: `
            <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
              <div style="width:40px;height:40px;border-radius:50%;background:var(--color-surface-container);border:2px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">
                <span style="font-weight:700;font-size:14px;color:var(--color-on-surface);font-variant-numeric:tabular-nums;">${count}</span>
              </div>
              <div style="margin-top:3px;background:var(--color-surface-container);border:1px solid var(--color-outline-variant);border-radius:8px;padding:2px 7px;font-weight:600;font-size:11px;line-height:1.2;color:${minColor};white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5);font-variant-numeric:tabular-nums;">${formatPrice(minPrice)} €</div>
            </div>`,
          className: '',
          iconSize: [64, 64],
          iconAnchor: [32, 22],
        });
      },
    });

    const newMarkers = new Map<number, L.Marker>();
    const newData = new Map<number, { price: number; color: string; brand?: string }>();
    for (const { station, price, color } of priced) {
      const icon = makeBrandPin({
        brand: station.brand,
        price,
        tierColor: color,
        selected: station.id === selectedId,
        cheapest: station.id === cheapestRef.current,
      });
      const marker = L.marker([station.lat, station.lng], {
        icon,
        fuelPrice: price,
        fuelColor: color,
      } as L.MarkerOptions);
      marker.on('click', () => onSelect(station.id));
      cluster.addLayer(marker);
      newMarkers.set(station.id, marker);
      newData.set(station.id, { price, color, brand: station.brand });
    }
    markersRef.current = newMarkers;
    dataRef.current = newData;

    clusterRef.current = cluster;
    map.addLayer(cluster);

    return () => {
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
      }
    };
    // We deliberately depend only on `priced` and `onSelect` — selection
    // changes are handled below without rebuilding the entire cluster.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, priced, onSelect]);

  // Update only the affected markers without rebuilding the cluster when
  // the selection or the cheapest-in-view changes.
  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      const data = dataRef.current.get(id);
      if (!data) continue;
      marker.setIcon(
        makeBrandPin({
          brand: data.brand,
          price: data.price,
          tierColor: data.color,
          selected: id === selectedId,
          cheapest: id === cheapestId,
        }),
      );
    }
  }, [selectedId, cheapestId]);

  return null;
}

/** Compact dropdown chip (Fuel ▾ / Sort ▾) for the sidebar controls row. */
function DropdownChip<T extends string>({
  label,
  value,
  options,
  open,
  onToggle,
  onSelect,
}: {
  label: string;
  value: string;
  options: { id: T; label: string }[];
  open: boolean;
  onToggle: () => void;
  onSelect: (id: T) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onToggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onToggle]);

  return (
    <div className="relative min-w-0">
      <button
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        title={label}
        className={[
          'w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors active:scale-95',
          open
            ? 'bg-surface-container-high text-on-surface border border-outline-strong'
            : 'bg-surface-container text-on-surface border border-outline-variant hover:border-outline-strong',
        ].join(' ')}
      >
        <span className="truncate">{value}</span>
        <Icon name="expand_more" size={14} className="shrink-0 text-on-surface-variant" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[590]" onClick={onToggle} aria-hidden="true" />
          <ul
            role="listbox"
            aria-label={label}
            className="absolute z-[600] top-full mt-1 left-0 min-w-[150px] bg-surface-container-high border border-outline-variant rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.45)] overflow-hidden py-1"
          >
            {options.map((o) => {
              const active = o.label === value;
              return (
                <li key={o.id}>
                  <button
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onSelect(o.id);
                      onToggle();
                    }}
                    className={[
                      'w-full text-left px-3 py-2 text-body-sm flex items-center justify-between gap-2',
                      active
                        ? 'text-primary font-semibold'
                        : 'text-on-surface hover:bg-surface-container',
                    ].join(' ')}
                  >
                    {o.label}
                    {active && <Icon name="check" size={16} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

export function MapScreen() {
  const f = useFilters();
  const { t } = useI18n();
  const nav = useViewNav();
  const fav = useFavorites();
  const { stations, loading } = useNearbyStations();
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [popupId, setPopupId] = useState<number | null>(null);
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);
  const [panTarget, setPanTarget] = useState<{ lat: number; lng: number; key: number } | null>(null);
  const [openMenu, setOpenMenu] = useState<'fuel' | 'sort' | null>(null);
  /** 'hidden' = sheet is fully tucked away (default; small pill to reopen).
   *  'collapsed' = ~200 px peek with horizontal carousel.
   *  'expanded'  = ~60vh full vertical scrollable list. */
  const [sheetState, setSheetState] = useState<'hidden' | 'collapsed' | 'expanded'>('hidden');
  const sheetExpanded = sheetState === 'expanded';
  const sheetHidden = sheetState === 'hidden';
  const [pendingFocusId, setPendingFocusId] = useState<number | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [locating, setLocating] = useState(false);
  // Bumped to force a fly-to on the user's position even when coords didn't
  // change (e.g. tapping "Me localiser" after panning away, or returning to
  // the map after refreshing the location from Settings).
  const [recenterKey, setRecenterKey] = useState(0);
  const sidePanelRef = useRef<HTMLDivElement>(null);

  // OSRM route state (spec §4). `routeSeq` guards against a stale response
  // overwriting a newer request or a request cancelled by the user.
  // `origin` pins the route to the user position it was computed from: when
  // the position object changes, the route silently expires (no effect needed).
  const [route, setRoute] = useState<
    (RouteResult & { stationId: number; origin: typeof f.userLocation }) | null
  >(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const routeSeqRef = useRef(0);
  const activeRoute = route && route.origin === f.userLocation ? route : null;

  // On mount, pick up any focus-station id passed by the previous screen.
  useEffect(() => {
    const id = nav.consumeFocusStation();
    if (id !== null) setPendingFocusId(id);
    // Run once when MapScreen mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once stations finish loading, fly to the requested focus station.
  useEffect(() => {
    if (pendingFocusId === null) return;
    const match = stations.find((s) => s.id === pendingFocusId);
    if (!match) return;
    setSelectedId(match.id);
    setPanTarget({ lat: match.lat, lng: match.lng, key: Date.now() });
    setPendingFocusId(null);
  }, [pendingFocusId, stations]);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Stations with selected fuel + brand filter, with color tier by price.
  // Always price-sorted: this is the reference order for pins & "cheapest".
  const priced: PricedStation[] = useMemo(() => {
    if (!f.userLocation) return [];
    const filtered = stations
      .filter((s) => s.fuels[f.selectedFuel])
      .filter((s) => f.selectedBrands.size === 0 || (s.brand && f.selectedBrands.has(s.brand)))
      .filter((s) => !f.openH24Only || s.h24 === true);
    const prices = filtered.map((s) => s.fuels[f.selectedFuel]!.p);
    const { pMin, pMax } = getPriceBounds(prices);
    return filtered
      .map((s) => {
        const price = s.fuels[f.selectedFuel]!.p;
        return {
          station: s,
          price,
          color: getPriceColor(price, pMin, pMax),
          distance: haversineKm(f.userLocation!.lat, f.userLocation!.lng, s.lat, s.lng),
        };
      })
      .sort((a, b) => a.price - b.price);
  }, [stations, f.selectedFuel, f.selectedBrands, f.openH24Only, f.userLocation]);

  // Stations in the visible map viewport, ordered by the active sort.
  // Distance stays anchored to the user's position — pan/zoom only filters
  // which stations show in the list, it never alters their distance.
  const visible = useMemo(() => {
    const inView = bounds
      ? priced.filter((p) => bounds.contains([p.station.lat, p.station.lng] as L.LatLngTuple))
      : priced;
    if (f.sortBy === 'distance') {
      return [...inView].sort((a, b) => a.distance - b.distance);
    }
    return inView; // already price-sorted
  }, [priced, bounds, f.sortBy]);

  /** Cheapest station currently in view (accent badge on pin + list). */
  const cheapestId = useMemo(() => {
    let best: PricedStation | null = null;
    for (const p of visible) {
      if (!best || p.price < best.price) best = p;
    }
    return best?.station.id ?? null;
  }, [visible]);

  useEffect(() => {
    if (visible.length > 0 && (selectedId === null || !visible.some((p) => p.station.id === selectedId))) {
      setSelectedId(visible[0].station.id);
    }
  }, [visible, selectedId]);

  // When the user-driven inputs change OR the visible viewport changes
  // (zoom/pan — `bounds` only updates on moveend/zoomend, never mid-drag),
  // reset both scroll containers to the start so the first station in the
  // current view is always the first card the user sees.
  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
    }
    if (sidePanelRef.current) {
      sidePanelRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [f.selectedFuel, f.selectedBrands, f.radiusKm, f.openH24Only, f.userLocation, f.sortBy, bounds]);

  const [shareToast, setShareToast] = useState<string | null>(null);
  useEffect(() => {
    if (!shareToast) return;
    const t = setTimeout(() => setShareToast(null), 2500);
    return () => clearTimeout(t);
  }, [shareToast]);

  // Route error toast auto-dismiss.
  useEffect(() => {
    if (!routeError) return;
    const t = setTimeout(() => setRouteError(null), 3500);
    return () => clearTimeout(t);
  }, [routeError]);

  const onShareZone = async () => {
    if (!f.userLocation) return;
    const url = buildZoneShareUrl({
      coords: f.userLocation,
      fuel: f.selectedFuel,
      radiusKm: f.radiusKm,
      brands: [...f.selectedBrands],
      openH24Only: f.openH24Only,
    });
    const zoneLabel = f.searchLabel ?? `${f.userLocation.lat.toFixed(3)}, ${f.userLocation.lng.toFixed(3)}`;
    const payload = {
      title: t('map.shareZoneTitle'),
      text: t('map.shareZoneText', { fuel: FUEL_LABELS[f.selectedFuel], radius: f.radiusKm, label: zoneLabel }),
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        // user cancelled → fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareToast(t('common.linkCopied'));
    } catch {
      window.prompt(t('common.copyLink'), url);
    }
  };

  const onLocateMe = async () => {
    setLocating(true);
    try {
      const { coords, denied } = await getBrowserLocation();
      if (coords) {
        f.setUserLocation(coords);
        f.setSearchLabel(await reverseGeocodeLabel(coords));
        setLocationDenied(false);
        setRecenterKey((k) => k + 1);
      } else {
        setLocationDenied(denied);
      }
    } finally {
      setLocating(false);
    }
  };

  const onRoute = async (station: Station) => {
    const origin = f.userLocation;
    if (!origin) {
      setRouteError(t('route.needLocation'));
      return;
    }
    const seq = ++routeSeqRef.current;
    setRouteLoading(true);
    try {
      const r = await fetchRoute(origin, { lat: station.lat, lng: station.lng });
      if (routeSeqRef.current !== seq) return;
      setRoute({ ...r, stationId: station.id, origin });
      // Clear the overlays so the neon route is actually visible.
      setPopupId(null);
      setSheetState('hidden');
    } catch {
      if (routeSeqRef.current === seq) setRouteError(t('route.error'));
    } finally {
      if (routeSeqRef.current === seq) setRouteLoading(false);
    }
  };

  const selectStation = (p: PricedStation) => {
    setSelectedId(p.station.id);
    setPanTarget({ lat: p.station.lat, lng: p.station.lng, key: Date.now() });
    setPopupId(p.station.id);
  };

  const popupStation = popupId !== null ? priced.find((p) => p.station.id === popupId) : null;
  const hasLocation = f.userLocation !== null;
  // Default view: rough center of metropolitan France, zoomed out to a country-level view.
  const center: [number, number] = hasLocation
    ? [f.userLocation!.lat, f.userLocation!.lng]
    : [46.6, 2.5];
  const zoom = hasLocation ? 13 : 6;

  const sortOptions = [
    { id: 'price' as const, label: t('stations.sortPrice') },
    { id: 'distance' as const, label: t('stations.sortDistance') },
  ];
  const fuelOptions = FUEL_TYPES.map((fuel) => ({ id: fuel as FuelType, label: FUEL_LABELS[fuel] }));

  const renderListItem = (p: PricedStation) => (
    <StationListItem
      key={p.station.id}
      station={p.station}
      price={p.price}
      distanceKm={p.distance}
      priceColor={p.color}
      selected={selectedId === p.station.id}
      cheapest={cheapestId === p.station.id}
      isFavorite={fav.isFavorite(p.station.id)}
      freshness={p.station.fuels[f.selectedFuel] ? timeAgo(p.station.fuels[f.selectedFuel]!.d) : '—'}
      onSelect={() => selectStation(p)}
      onToggleFavorite={() => fav.toggle(p.station.id)}
      onLocate={() => {
        setSelectedId(p.station.id);
        setPanTarget({ lat: p.station.lat, lng: p.station.lng, key: Date.now() });
      }}
    />
  );

  return (
    <div className="h-full flex">
      {/* ============ Desktop sidebar (spec §4 web) ============ */}
      <aside className="hidden md:flex w-[340px] shrink-0 flex-col bg-surface-container-low border-r border-outline-variant z-[500] h-full">
        {/* Header: logo + title + info→settings */}
        <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 shrink-0">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="w-8 h-8 shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="text-headline-md font-bold text-on-surface tracking-tight leading-6">
              FuelRadar
            </h1>
            <p className="text-[11px] text-on-surface-variant truncate">{t('app.subtitle')}</p>
          </div>
          <button
            onClick={nav.goSettings}
            className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container active:scale-95 transition-transform shrink-0"
            aria-label={t('nav.settings')}
            title={t('nav.settings')}
          >
            <Icon name="info" size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3 shrink-0">
          <SearchBar
            initialLabel={f.searchLabel}
            onResult={(r) => {
              f.setUserLocation({ lat: r.lat, lng: r.lng });
              f.setSearchLabel([r.postcode, r.city].filter(Boolean).join(' '));
              setSelectedId(null);
            }}
          />
        </div>

        {/* Controls: fuel ▾ / sort ▾ / filters */}
        <div className="px-4 pb-3 grid grid-cols-3 gap-2 shrink-0">
          <DropdownChip
            label={t('chips.fuel')}
            value={FUEL_LABELS[f.selectedFuel]}
            options={fuelOptions}
            open={openMenu === 'fuel'}
            onToggle={() => setOpenMenu((m) => (m === 'fuel' ? null : 'fuel'))}
            onSelect={(fuel) => f.setSelectedFuel(fuel)}
          />
          <DropdownChip
            label={t('chips.sort')}
            value={sortOptions.find((o) => o.id === f.sortBy)?.label ?? ''}
            options={sortOptions}
            open={openMenu === 'sort'}
            onToggle={() => setOpenMenu((m) => (m === 'sort' ? null : 'sort'))}
            onSelect={(s) => f.setSortBy(s)}
          />
          <button
            onClick={() => setFilterOpen(true)}
            className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold bg-surface-container text-on-surface border border-outline-variant hover:border-outline-strong transition-colors active:scale-95 whitespace-nowrap"
          >
            <Icon name="tune" size={14} className="text-on-surface-variant" />
            {t('common.filters')}
          </button>
        </div>

        {/* List header */}
        <div className="px-4 pb-2 flex items-center justify-between gap-2 shrink-0">
          <span className="text-body-sm text-on-surface-variant truncate">
            {t('common.stationsCount', { n: visible.length })} · {f.radiusKm} km
          </span>
          {hasLocation && (
            <button
              onClick={onShareZone}
              className="p-1.5 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container active:scale-95 transition-transform shrink-0"
              aria-label={t('map.shareZone')}
              title={t('map.shareZone')}
            >
              <Icon name="share" size={16} />
            </button>
          )}
        </div>

        {/* Scrollable station list */}
        <div
          ref={sidePanelRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pb-3 flex flex-col gap-2"
        >
          {!hasLocation && (
            <p className="text-center text-body-sm text-on-surface-variant py-lg px-2">
              {t('map.welcome')}
            </p>
          )}
          {hasLocation && loading && visible.length === 0 && (
            <p className="text-center text-body-sm text-on-surface-variant py-lg">
              {t('map.loadingStations')}
            </p>
          )}
          {hasLocation && !loading && visible.length === 0 && (
            <p className="text-center text-body-sm text-on-surface-variant py-lg px-2">
              {t('map.noVisibleHint')}
            </p>
          )}
          {visible.slice(0, 50).map(renderListItem)}
        </div>

        {/* Footer nav: Favorites · Trends · Settings */}
        <footer className="border-t border-outline-variant px-2 py-2 flex items-center justify-around shrink-0">
          <button
            onClick={nav.goFavorites}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            aria-label={t('nav.favorites')}
          >
            <Icon name="star" size={20} />
            <span className="text-[10px] font-medium">{t('nav.favorites')}</span>
          </button>
          <button
            onClick={nav.goTrends}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            aria-label={t('nav.trends')}
          >
            <Icon name="insights" size={20} />
            <span className="text-[10px] font-medium">{t('nav.trends')}</span>
          </button>
          <button
            onClick={nav.goSettings}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            aria-label={t('nav.settings')}
          >
            <Icon name="settings" size={20} />
            <span className="text-[10px] font-medium">{t('nav.settings')}</span>
          </button>
          <InstallButton />
        </footer>
      </aside>

      {/* ============ Map area ============ */}
      <div className="flex-1 relative min-w-0 h-full">
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom
          zoomControl={false}
          className="absolute inset-0 z-0"
        >
          <TileLayer
            attribution={darkTiles.attribution}
            url={darkTiles.url}
            tileSize={darkTiles.tileSize}
            zoomOffset={darkTiles.zoomOffset}
          />
          {hasLocation && (
            <>
              <MapRecenter
                lat={f.userLocation!.lat}
                lng={f.userLocation!.lng}
                trigger={recenterKey}
              />
              <SearchRadiusCircle
                lat={f.userLocation!.lat}
                lng={f.userLocation!.lng}
                radiusKm={f.radiusKm}
              />
            </>
          )}
          <BoundsTracker onChange={setBounds} />
          <PanToStation station={panTarget} />
          <RouteLayer route={activeRoute} />
          <StationsCluster
            priced={priced}
            cheapestId={cheapestId}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setPopupId(id);
              const el = carouselRef.current?.querySelector(`[data-station="${id}"]`);
              if (el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }}
          />
        </MapContainer>

        {/* Mobile: floating search + quick chips over the map */}
        <div className="md:hidden absolute top-3 left-3 right-3 z-[400] flex flex-col gap-2">
          <SearchBar
            initialLabel={f.searchLabel}
            onResult={(r) => {
              f.setUserLocation({ lat: r.lat, lng: r.lng });
              f.setSearchLabel([r.postcode, r.city].filter(Boolean).join(' '));
              setSelectedId(null);
            }}
            onOpenFilters={() => setFilterOpen(true)}
          />
          {(() => {
            const QUICK: typeof FUEL_TYPES = ['Gazole', 'SP95', 'E10', 'SP98'];
            const quickList = QUICK.includes(f.selectedFuel)
              ? QUICK
              : [f.selectedFuel, ...QUICK];
            return (
              // One scrollable row so the chips never pile up over the map.
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {quickList.map((fuel) => {
                  const active = f.selectedFuel === fuel;
                  return (
                    <button
                      key={fuel}
                      onClick={() => f.setSelectedFuel(fuel)}
                      className={[
                        'shrink-0 px-3 py-1 rounded-full text-label-caps font-bold tracking-wider whitespace-nowrap transition-colors active:scale-95 shadow-[0_2px_8px_rgba(0,0,0,0.35)]',
                        active
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container text-on-surface border border-outline-variant',
                      ].join(' ')}
                    >
                      {FUEL_LABELS[fuel]}
                    </button>
                  );
                })}
                <span className="shrink-0 bg-surface-container text-on-surface border border-outline-variant px-3 py-1 rounded-full text-label-caps font-bold tracking-wider whitespace-nowrap">
                  {f.radiusKm} km
                </span>
                {f.selectedBrands.size > 0 && (
                  <span className="shrink-0 bg-surface-container text-on-surface border border-outline-variant px-3 py-1 rounded-full text-label-caps font-bold tracking-wider whitespace-nowrap">
                    {t('map.brandsCount', { n: f.selectedBrands.size })}
                  </span>
                )}
                {f.openH24Only && (
                  <span className="shrink-0 bg-tertiary-container text-on-tertiary-container border border-primary/30 px-3 py-1 rounded-full text-label-caps font-bold tracking-wider whitespace-nowrap flex items-center gap-1">
                    <Icon name="schedule" size={12} filled /> 24/7
                  </span>
                )}
                {hasLocation && (
                  <button
                    type="button"
                    onClick={onShareZone}
                    className="shrink-0 bg-surface-container text-primary border border-outline-variant px-3 py-1 rounded-full text-label-caps font-bold tracking-wider whitespace-nowrap flex items-center gap-1 active:scale-95 transition-transform"
                    aria-label={t('map.shareZone')}
                    title={t('map.shareZone')}
                  >
                    <Icon name="share" size={12} /> {t('common.share')}
                  </button>
                )}
              </div>
            );
          })()}
        </div>

        {loading && (
          <div className="absolute top-32 md:top-6 left-1/2 -translate-x-1/2 z-[400] bg-surface-container text-on-surface px-4 py-1 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.45)] text-body-sm border border-outline-variant whitespace-nowrap">
            {t('map.loadingStations')}
          </div>
        )}

        {!loading && stations.length > 0 && priced.length === 0 && hasLocation && (
          <div className="absolute top-32 md:top-6 left-1/2 -translate-x-1/2 z-[400] bg-surface-container text-on-surface px-4 py-2 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.45)] text-body-sm border border-outline-variant max-w-[90%] text-center">
            {f.openH24Only
              ? t('map.noStationsH24', { fuel: FUEL_LABELS[f.selectedFuel] })
              : t('map.noStationsFuel', { fuel: FUEL_LABELS[f.selectedFuel] })}
          </div>
        )}

        {!hasLocation && (
          <div className="absolute top-32 md:top-6 left-1/2 -translate-x-1/2 z-[400] bg-surface-container text-on-surface px-4 py-2 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.45)] text-body-sm border border-outline-variant flex items-center gap-2 max-w-[90%]">
            <Icon name="location_searching" size={16} className="text-primary shrink-0" />
            <span className="truncate">{t('map.welcome')}</span>
          </div>
        )}

        {/* Route summary chip */}
        {activeRoute && (
          <div className="absolute top-32 md:top-6 left-1/2 -translate-x-1/2 z-[450] bg-surface-container border border-primary/40 rounded-full pl-4 pr-2 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)] flex items-center gap-2 whitespace-nowrap">
            <Icon name="directions" size={18} className="text-primary" />
            <span className="text-body-sm font-semibold text-on-surface tabular-nums">
              {formatDistance(activeRoute.distanceM / 1000)} • {formatDuration(activeRoute.durationS)}
            </span>
            <button
              onClick={() => setRoute(null)}
              className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container-high active:scale-95 transition-transform"
              aria-label={t('route.clear')}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        )}

        <button
          onClick={onLocateMe}
          disabled={locating}
          className={[
            'absolute right-4 md:bottom-6 p-md rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.45)] active:scale-95 transition-all z-[400] flex items-center justify-center border',
            locationDenied
              ? 'bg-error-container text-on-error-container border-error'
              : 'bg-surface-container text-primary border-outline-variant',
            sheetExpanded ? 'bottom-[60vh]' : sheetHidden ? 'bottom-24' : 'bottom-48',
          ].join(' ')}
          aria-label={
            locationDenied ? t('map.locateDenied') : locating ? t('map.locating') : t('map.locate')
          }
          title={locationDenied ? t('map.locateDeniedTitle') : t('map.locate')}
        >
          <Icon
            name={locating ? 'sync' : locationDenied ? 'location_disabled' : 'my_location'}
            filled
          />
          {locationDenied && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-error border-2 border-surface-container" />
          )}
        </button>
        {locationDenied && (
          <div
            role="status"
            aria-live="polite"
            className={[
              'absolute right-4 z-[400] max-w-[280px] bg-error-container text-on-error-container px-3 py-2 rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.45)] border border-error text-body-sm flex items-start gap-2',
              sheetExpanded
                ? 'bottom-[calc(60vh+72px)]'
                : sheetHidden
                  ? 'bottom-[140px]'
                  : 'bottom-[260px]',
              'md:bottom-24',
            ].join(' ')}
          >
            <Icon name="info" size={16} />
            <span>{t('map.locateDeniedToast')}</span>
          </div>
        )}

        {/* Route error toast */}
        {routeError && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[1200] bg-error-container text-on-error-container border border-error px-4 py-2.5 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.45)] flex items-center gap-2 text-body-sm font-medium animate-[slideUp_220ms_ease-out] max-w-[92vw]"
          >
            <Icon name="warning" size={18} />
            {routeError}
          </div>
        )}

        {/* Mobile: floating pill to re-open the sheet when fully hidden */}
        {sheetHidden && (
          <button
            onClick={() => setSheetState('collapsed')}
            className="md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-[450] bg-primary text-on-primary rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.45)] px-4 py-2.5 flex items-center gap-2 text-body-sm font-semibold active:scale-95 transition-transform"
            aria-label={t('map.showList')}
          >
            <Icon name="expand_less" size={18} />
            {t('map.seeStations', { n: visible.length })}
          </button>
        )}

        {/* Mobile: bottom sheet with drag handle, collapsible */}
        <div
          className={[
            'md:hidden fixed left-0 right-0 bottom-16 z-[450] bg-surface-container-low rounded-t-2xl shadow-[0_-8px_24px_rgba(0,0,0,0.45)] border-t border-outline-variant transition-[height] duration-300 ease-out flex flex-col overflow-hidden',
            sheetHidden ? 'h-0 border-t-0 shadow-none' : sheetExpanded ? 'h-[60vh]' : 'h-[210px]',
          ].join(' ')}
          aria-hidden={sheetHidden}
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2 shrink-0 border-b border-outline-variant">
            <button
              onClick={() => setSheetState((s) => (s === 'expanded' ? 'collapsed' : 'expanded'))}
              className="flex-1 min-w-0 flex items-center gap-1.5 text-left active:scale-[0.98] transition-transform"
              aria-label={sheetExpanded ? t('map.collapseList') : t('map.expandList')}
            >
              <Icon name={sheetExpanded ? 'expand_more' : 'expand_less'} size={20} className="text-primary shrink-0" />
              <span className="text-body-lg font-semibold text-on-surface truncate">
                {t('common.stationsCount', { n: visible.length })}
              </span>
              <span className="text-body-sm text-primary truncate">
                {sheetExpanded ? t('map.collapse') : t('map.expandAll')}
              </span>
            </button>
            <button
              onClick={() => setSheetState('hidden')}
              className="text-body-sm font-semibold text-on-surface-variant px-2.5 py-1 rounded-lg hover:bg-surface-container active:scale-95 transition-transform shrink-0 flex items-center gap-1"
              aria-label={t('map.hideList')}
            >
              <Icon name="close" size={16} />
              {t('map.hide')}
            </button>
          </div>
          <div
            ref={carouselRef}
            className={[
              'flex-1 px-md pb-3 pt-2 gap-gutter overscroll-contain',
              sheetExpanded
                ? 'overflow-y-auto flex flex-col touch-pan-y'
                : 'overflow-x-auto snap-x snap-mandatory flex no-scrollbar touch-pan-x',
            ].join(' ')}
          >
            {visible.length === 0 && (
              <p className="text-center text-body-sm text-on-surface-variant py-lg w-full">
                {t('map.noVisible')}
              </p>
            )}
            {visible.slice(0, sheetExpanded ? 50 : 20).map((p) =>
              sheetExpanded ? (
                renderListItem(p)
              ) : (
                <div key={p.station.id} className="snap-center shrink-0 w-[85%] max-w-[340px] flex">
                  {renderListItem(p)}
                </div>
              ),
            )}
          </div>
        </div>

        {/* Station popover — floating card bottom-left on desktop, bottom card on mobile */}
        {popupStation && (
          <div className="max-md:fixed max-md:left-3 max-md:right-3 max-md:bottom-[calc(4rem+env(safe-area-inset-bottom)+16px)] md:absolute md:left-6 md:bottom-6 md:w-[380px] md:max-w-[calc(100%-3rem)] z-[1000] md:z-[600]">
            <StationPopover
              station={popupStation.station}
              distanceKm={popupStation.distance}
              selectedFuel={f.selectedFuel}
              referencePrices={priced.map((p) => p.price)}
              isFavorite={fav.isFavorite(popupStation.station.id)}
              routeLoading={routeLoading}
              onToggleFavorite={() => fav.toggle(popupStation.station.id)}
              onOpenDetails={() => {
                setPopupId(null);
                nav.goDetails(popupStation.station.id);
              }}
              onRoute={() => onRoute(popupStation.station)}
              onClose={() => setPopupId(null)}
            />
          </div>
        )}

        {shareToast && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[1200] bg-inverse-surface text-inverse-on-surface px-4 py-2.5 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.45)] flex items-center gap-2 text-body-sm font-medium animate-[slideUp_220ms_ease-out]"
          >
            <Icon name="check_circle" filled size={18} />
            {shareToast}
          </div>
        )}
      </div>

      <FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} />
    </div>
  );
}
