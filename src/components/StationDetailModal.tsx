import { useEffect, useState } from 'react';
import type { FuelType, Station } from '../types';
import { FUEL_COLORS, FUEL_LABELS, formatPrice, timeAgo } from '../utils/fuel';
import { formatDistance } from '../utils/geo';
import { getBrandDisplay } from '../utils/brands';

interface StationWithDistance extends Station {
  distance: number;
}

interface Props {
  station: StationWithDistance;
  selectedFuel: FuelType;
  onClose: () => void;
  getStationHistory: (
    stationId: number,
    postalCode: string,
  ) => Promise<Record<string, [number, number][]> | null>;
}

interface FuelVariation {
  fuel: FuelType;
  currentPrice: number;
  lastUpdate: string;
  startPrice: number | null;
  startDate: string | null;
  change: number | null; // absolute change in €
  changePercent: number | null;
  trend: 'up' | 'down' | 'stable' | null;
}

function computeVariations(
  station: Station,
  history: Record<string, [number, number][]> | null,
): FuelVariation[] {
  const variations: FuelVariation[] = [];

  for (const [fuel, info] of Object.entries(station.fuels)) {
    if (!info) continue;

    const fuelHistory = history?.[fuel];
    let startPrice: number | null = null;
    let startDate: string | null = null;
    let change: number | null = null;
    let changePercent: number | null = null;
    let trend: 'up' | 'down' | 'stable' | null = null;

    if (fuelHistory && fuelHistory.length >= 2) {
      // First data point = start of year (or earliest available)
      const [firstEpoch, firstPrice] = fuelHistory[0];
      startPrice = firstPrice;
      startDate = new Date(firstEpoch).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
      });

      change = Math.round((info.p - firstPrice) * 1000) / 1000;
      changePercent =
        Math.round(((info.p - firstPrice) / firstPrice) * 1000) / 10;

      if (Math.abs(change) < 0.003) {
        trend = 'stable';
      } else {
        trend = change > 0 ? 'up' : 'down';
      }
    }

    variations.push({
      fuel: fuel as FuelType,
      currentPrice: info.p,
      lastUpdate: info.d,
      startPrice,
      startDate,
      change,
      changePercent,
      trend,
    });
  }

  return variations;
}

function TrendIndicator({
  variation,
}: {
  variation: FuelVariation;
}) {
  const { trend, change, changePercent } = variation;

  if (!trend || change === null || changePercent === null) {
    return (
      <span className="text-[10px] text-gray-400">
        Pas d'historique
      </span>
    );
  }

  const trendConfig = {
    up: {
      icon: '↗',
      color: 'text-red-600',
      bg: 'bg-red-50',
      sign: '+',
    },
    down: {
      icon: '↘',
      color: 'text-green-600',
      bg: 'bg-green-50',
      sign: '',
    },
    stable: {
      icon: '→',
      color: 'text-gray-500',
      bg: 'bg-gray-50',
      sign: '',
    },
  };

  const config = trendConfig[trend];

  return (
    <div className={`flex items-center gap-1.5 rounded-lg px-2 py-1 ${config.bg}`}>
      <span className={`text-sm font-bold ${config.color}`}>
        {config.icon}
      </span>
      <span className={`text-xs font-semibold ${config.color}`}>
        {config.sign}{change > 0 ? '+' : ''}{change.toFixed(3).replace('.', ',')}€
      </span>
      <span className={`text-[10px] ${config.color} opacity-75`}>
        ({config.sign}{changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%)
      </span>
    </div>
  );
}

export function StationDetailModal({
  station,
  selectedFuel,
  onClose,
  getStationHistory,
}: Props) {
  const [history, setHistory] = useState<Record<
    string,
    [number, number][]
  > | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const data = await getStationHistory(station.id, station.cp);
      if (!cancelled) {
        setHistory(data);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [station.id, station.cp, getStationHistory]);

  const variations = computeVariations(station, history);

  // Sort: selected fuel first, then by price ascending
  const sortedVariations = [...variations].sort((a, b) => {
    if (a.fuel === selectedFuel) return -1;
    if (b.fuel === selectedFuel) return 1;
    return a.currentPrice - b.currentPrice;
  });

  // Navigation URL
  const destLabel = station.brand
    ? `${station.brand}, ${station.addr}, ${station.cp} ${station.city}`
    : `${station.addr}, ${station.cp} ${station.city}`;
  const destination = encodeURIComponent(destLabel);
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const navUrl =
    isAndroid || isIOS
      ? `geo:${station.lat},${station.lng}?q=${station.lat},${station.lng}(${destination})`
      : `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl md:max-w-md md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {station.brand && (() => {
              const { abbr, color } = getBrandDisplay(station.brand);
              return (
                <div className="mb-1.5 flex items-center gap-2">
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
                    style={{ backgroundColor: color }}
                  >
                    {abbr}
                  </span>
                  <span className="text-sm font-medium text-gray-500">
                    {station.brand}
                  </span>
                </div>
              );
            })()}
            <h2 className="text-base font-bold text-gray-800">
              {station.addr}
            </h2>
            <p className="mt-0.5 text-xs text-gray-400">
              {station.city} · {station.cp} · {formatDistance(station.distance)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Fuel prices with variations */}
        <div className="space-y-2">
          {sortedVariations.map((v) => (
            <div
              key={v.fuel}
              className={`rounded-xl border p-3 transition-colors ${
                v.fuel === selectedFuel
                  ? 'border-gray-200 bg-gray-50'
                  : 'border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: FUEL_COLORS[v.fuel] }}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {FUEL_LABELS[v.fuel]}
                  </span>
                </div>
                <span
                  className="text-base font-bold"
                  style={{ color: FUEL_COLORS[v.fuel] }}
                >
                  {formatPrice(v.currentPrice)}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between">
                {loading ? (
                  <span className="text-[10px] text-gray-400">
                    Chargement...
                  </span>
                ) : (
                  <TrendIndicator variation={v} />
                )}
                <span className="text-[10px] text-gray-400">
                  MAJ {timeAgo(v.lastUpdate)}
                </span>
              </div>

              {!loading && v.startPrice !== null && v.startDate && (
                <div className="mt-1 text-[10px] text-gray-400">
                  Depuis le {v.startDate} ({formatPrice(v.startPrice)})
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Navigation button */}
        <a
          href={navUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-blue-600"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
          Itinéraire
        </a>

        {/* Footer */}
        <p className="mt-3 text-center text-[10px] text-gray-400">
          Données prix-carburants.gouv.fr
        </p>
      </div>
    </div>
  );
}
