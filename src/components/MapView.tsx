import { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import type { FuelType, Station } from '../types';
import { FUEL_COLORS, getFuelPrice } from '../utils/fuel';

// Fix default marker icons in bundled environments
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface StationWithDistance extends Station {
  distance: number;
}

interface Props {
  center: [number, number];
  zoom: number;
  bounds: L.LatLngBoundsExpression | null;
  stations: StationWithDistance[];
  selectedFuel: FuelType;
  selectedStationId: number | null;
  onStationSelect: (id: number | null) => void;
  onVisibleBoundsChange: (bounds: L.LatLngBounds) => void;
  searchCenter: [number, number] | null;
  searchRadius: number;
  onGeolocate?: () => void;
  geolocating?: boolean;
  hasPanel?: boolean;
  panelOpen?: boolean;
}

function createPriceIcon(fuel: FuelType, price: number): L.DivIcon {
  const color = FUEL_COLORS[fuel];
  const label = price.toFixed(3).replace('.', ',').slice(0, -1); // "1,72" (2 decimals)
  return L.divIcon({
    html: `<div style="
      background: ${color};
      color: white;
      font-size: 11px;
      font-weight: 700;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 3px 6px;
      border-radius: 10px;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      white-space: nowrap;
      line-height: 1;
      text-align: center;
    ">${label}</div>`,
    className: '',
    iconSize: [46, 22],
    iconAnchor: [23, 11],
    popupAnchor: [0, -13],
  });
}

function MapUpdater({
  center,
  zoom,
  bounds,
}: {
  center: [number, number];
  zoom: number;
  bounds: L.LatLngBoundsExpression | null;
}) {
  const map = useMap();
  const prevBounds = useRef(bounds);
  const prevCenter = useRef(center);

  useEffect(() => {
    if (bounds && bounds !== prevBounds.current) {
      // Desktop: pad right for panel (288px = w-72). Mobile: pad top for header/search, bottom for sheet.
      const isDesktop = window.innerWidth >= 768;
      map.flyToBounds(bounds, {
        duration: 1.2,
        paddingTopLeft: isDesktop ? [0, 0] : [20, 180],
        paddingBottomRight: isDesktop ? [288, 0] : [20, 80],
      });
      prevBounds.current = bounds;
      prevCenter.current = center;
    } else if (
      prevCenter.current[0] !== center[0] ||
      prevCenter.current[1] !== center[1]
    ) {
      map.flyTo(center, zoom, { duration: 1.2 });
      prevCenter.current = center;
    }
  }, [map, center, zoom, bounds]);

  return null;
}

function MarkerClusterGroup({
  stations,
  selectedFuel,
  selectedStationId,
  onStationSelect,
}: {
  stations: StationWithDistance[];
  selectedFuel: FuelType;
  selectedStationId: number | null;
  onStationSelect: (id: number | null) => void;
}) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());

  const stationData = useMemo(
    () => stations.filter((s) => getFuelPrice(s, selectedFuel) !== null),
    [stations, selectedFuel],
  );

  useEffect(() => {
    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
    }

    const fuelColor = FUEL_COLORS[selectedFuel];
    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      disableClusteringAtZoom: 16,
      iconCreateFunction(c) {
        const count = c.getChildCount();
        const size = count < 10 ? 36 : count < 30 ? 42 : 50;
        return L.divIcon({
          html: `<div style="
            background: ${fuelColor};
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: ${size < 42 ? 13 : 14}px;
            font-family: system-ui, sans-serif;
          ">${count}</div>`,
          className: '',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    });

    const newMarkers = new Map<number, L.Marker>();

    for (const s of stationData) {
      const price = getFuelPrice(s, selectedFuel)!;
      const icon = createPriceIcon(selectedFuel, price);
      const marker = L.marker([s.lat, s.lng], { icon });

      const popupContent = document.createElement('div');
      popupContent.innerHTML = renderPopupHTML(s, selectedFuel);
      marker.bindPopup(popupContent, { maxWidth: 280 });

      marker.on('click', () => {
        onStationSelect(s.id);
      });

      newMarkers.set(s.id, marker);
      cluster.addLayer(marker);
    }

    markersRef.current = newMarkers;
    clusterRef.current = cluster;
    map.addLayer(cluster);

    return () => {
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
      }
    };
  }, [map, stationData, selectedFuel, onStationSelect]);

  // Open popup when station selected from panel
  useEffect(() => {
    if (selectedStationId && markersRef.current.has(selectedStationId)) {
      const marker = markersRef.current.get(selectedStationId)!;
      const cluster = clusterRef.current;
      if (cluster) {
        cluster.zoomToShowLayer(marker, () => {
          marker.openPopup();
        });
      }
    }
  }, [selectedStationId]);

  return null;
}

function renderPopupHTML(
  station: StationWithDistance,
  selectedFuel: FuelType,
): string {
  const fuels = Object.entries(station.fuels)
    .sort(([a], [b]) => {
      if (a === selectedFuel) return -1;
      if (b === selectedFuel) return 1;
      return 0;
    })
    .map(([fuel, info]) => {
      const color = FUEL_COLORS[fuel as FuelType];
      const price = info!.p.toFixed(3).replace('.', ',');
      return `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 0;">
        <span style="display:flex;align-items:center;gap:6px;">
          <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block;"></span>
          <span style="font-size:13px;color:#374151;">${fuel}</span>
        </span>
        <span style="font-size:13px;font-weight:600;color:#111827;">${price} \u20AC</span>
      </div>`;
    })
    .join('');

  const distStr =
    station.distance < 1
      ? `${Math.round(station.distance * 1000)} m`
      : `${station.distance.toFixed(1)} km`;

  const destination = encodeURIComponent(`${station.addr}, ${station.cp} ${station.city}`);
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

  return `
    <div style="min-width:180px;font-family:Inter,system-ui,sans-serif;">
      <div style="font-weight:600;font-size:13px;color:#1f2937;margin-bottom:2px;">${station.addr}</div>
      <div style="font-size:11px;color:#9ca3af;margin-bottom:8px;">${station.city} \u00b7 ${station.cp} \u00b7 ${distStr}</div>
      ${fuels}
      <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer"
         style="display:flex;align-items:center;justify-content:center;gap:6px;margin-top:10px;padding:7px 0;background:#3b82f6;color:white;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;cursor:pointer;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
        </svg>
        Itin\u00e9raire
      </a>
    </div>
  `;
}

function SearchRadiusCircle({
  center,
  radiusKm,
}: {
  center: [number, number] | null;
  radiusKm: number;
}) {
  const map = useMap();
  const circleRef = useRef<L.Circle | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    // Clean previous
    if (circleRef.current) {
      map.removeLayer(circleRef.current);
      circleRef.current = null;
    }
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    if (!center) return;

    // Radius circle
    const circle = L.circle(center, {
      radius: radiusKm * 1000,
      color: '#3b82f6',
      weight: 2,
      opacity: 0.4,
      fillColor: '#3b82f6',
      fillOpacity: 0.06,
      interactive: false,
    });
    circle.addTo(map);
    circleRef.current = circle;

    // Center dot
    const dot = L.circleMarker(center, {
      radius: 7,
      color: '#3b82f6',
      weight: 3,
      opacity: 0.9,
      fillColor: '#ffffff',
      fillOpacity: 1,
      interactive: false,
    });
    dot.addTo(map);
    markerRef.current = dot;

    return () => {
      if (circleRef.current) map.removeLayer(circleRef.current);
      if (markerRef.current) map.removeLayer(markerRef.current);
    };
  }, [map, center, radiusKm]);

  return null;
}

function BoundsTracker({ onChange }: { onChange: (bounds: L.LatLngBounds) => void }) {
  const map = useMap();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const handler = () => {
      onChangeRef.current(map.getBounds());
    };
    // Emit initial bounds
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

export function MapView({
  center,
  zoom,
  bounds,
  stations,
  selectedFuel,
  selectedStationId,
  onStationSelect,
  onVisibleBoundsChange,
  searchCenter,
  searchRadius,
  onGeolocate,
  geolocating,
  hasPanel,
  panelOpen,
}: Props) {
  return (
    <>
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
        zoomControl={false}
        minZoom={5}
        maxBounds={[
          [41.2, -5.5],
          [51.5, 10],
        ]}
        maxBoundsViscosity={1.0}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <MapUpdater center={center} zoom={zoom} bounds={bounds} />
        <BoundsTracker onChange={onVisibleBoundsChange} />
        <SearchRadiusCircle center={searchCenter} radiusKm={searchRadius} />
        <MarkerClusterGroup
          stations={stations}
          selectedFuel={selectedFuel}
          selectedStationId={selectedStationId}
          onStationSelect={onStationSelect}
        />
      </MapContainer>

      {/* Geolocate button — bottom-right, Leaflet-style */}
      {onGeolocate && (
        <button
          onClick={onGeolocate}
          disabled={geolocating}
          className={`absolute right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-gray-200 transition-all hover:bg-gray-50 disabled:opacity-60 md:bottom-6 ${hasPanel ? `${panelOpen ? 'bottom-[340px]' : 'bottom-16'} md:right-[300px]` : 'bottom-20'}`}
          title="Me localiser"
        >
          {geolocating ? (
            <svg className="h-5 w-5 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
          )}
        </button>
      )}
    </>
  );
}
