import { useMemo } from 'react';
import type { FuelType, Station } from '../types';
import { formatDistance } from '../utils/geo';
import { getFuelPrice, formatPrice, getPriceColor } from '../utils/fuel';
import { getBrandDisplay } from '../utils/brands';

interface StationWithDistance extends Station {
  distance: number;
}

interface Props {
  stations: StationWithDistance[];
  totalStations: number;
  selectedFuel: FuelType;
  onStationClick: (station: StationWithDistance) => void;
  selectedStationId: number | null;
  priceBounds: { pMin: number; pMax: number };
  onStationHover: (id: number | null) => void;
}

export function StationPanel({ stations, totalStations, selectedFuel, onStationClick, selectedStationId, priceBounds, onStationHover }: Props) {
  const { pMin: minPrice, pMax: maxPrice } = priceBounds;

  const withFuel = useMemo(() => {
    return stations
      .filter((s) => getFuelPrice(s, selectedFuel) !== null)
      .sort((a, b) => {
        const pa = getFuelPrice(a, selectedFuel)!;
        const pb = getFuelPrice(b, selectedFuel)!;
        return pa - pb;
      });
  }, [stations, selectedFuel]);

  if (stations.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-gray-400">
        Recherchez une ville pour voir les stations
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-100 px-3 py-2">
        <span className="text-xs font-semibold text-gray-700">
          {stations.length} station{stations.length > 1 ? 's' : ''} visible{stations.length > 1 ? 's' : ''}
        </span>
        <span className="text-[11px] text-gray-400">
          {' '}· {totalStations} au total
        </span>
      </div>

      {/* Station list */}
      <div className="flex-1 overflow-y-auto panel-scroll">
        {withFuel.map((station) => {
          const price = getFuelPrice(station, selectedFuel);
          if (price === null) return null;
          const isSelected = station.id === selectedStationId;

          return (
            <button
              key={station.id}
              onClick={() => onStationClick(station)}
              onMouseEnter={() => onStationHover(station.id)}
              onMouseLeave={() => onStationHover(null)}
              className={`flex w-full items-center justify-between gap-1.5 border-b border-gray-50 px-3 py-2 text-left transition-colors hover:bg-gray-50 ${
                isSelected ? 'bg-primary/10' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  {station.brand && (() => {
                    const { abbr, color } = getBrandDisplay(station.brand);
                    return (
                      <span
                        className="shrink-0 rounded px-1 py-px text-[9px] font-bold leading-none text-white"
                        style={{ backgroundColor: color }}
                        title={station.brand}
                      >
                        {abbr}
                      </span>
                    );
                  })()}
                  <span className="truncate text-xs font-medium text-gray-800">
                    {station.addr}
                  </span>
                  <span className="shrink-0 text-[10px] text-gray-400">
                    {formatDistance(station.distance)}
                  </span>
                </div>
                <div className="text-[11px] text-gray-400">{station.city}</div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums text-white"
                  style={{ backgroundColor: getPriceColor(price, minPrice, maxPrice) }}
                >
                  {formatPrice(price)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
