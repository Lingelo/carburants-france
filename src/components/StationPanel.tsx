import type { FuelType, Station } from '../types';
import { formatDistance } from '../utils/geo';
import { getFuelPrice, sortByFuelPrice, formatPrice, getPriceColor } from '../utils/fuel';
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
}

export function StationPanel({ stations, totalStations, selectedFuel, onStationClick, selectedStationId, priceBounds }: Props) {
  const sorted = sortByFuelPrice(stations, selectedFuel) as StationWithDistance[];
  const withFuel = sorted.filter((s) => getFuelPrice(s, selectedFuel) !== null);
  const { pMin: minPrice, pMax: maxPrice } = priceBounds;

  if (stations.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-gray-400">
        Recherchez une ville pour voir les stations
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-100 px-3 py-2">
        <span className="text-xs font-semibold text-gray-700">
          {stations.length} station{stations.length > 1 ? 's' : ''} visible{stations.length > 1 ? 's' : ''}
        </span>
        <span className="text-[11px] text-gray-400">
          {' '}· {totalStations} au total
        </span>
      </div>
      <div className="flex-1 overflow-y-auto panel-scroll">
        {withFuel.map((station) => {
          const price = getFuelPrice(station, selectedFuel);
          const isSelected = station.id === selectedStationId;
          return (
            <button
              key={station.id}
              onClick={() => onStationClick(station)}
              className={`flex w-full items-center justify-between gap-1.5 border-b border-gray-50 px-3 py-2 text-left transition-colors hover:bg-gray-50 ${
                isSelected ? 'bg-blue-50' : ''
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
              {price !== null && (
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
                  style={{ backgroundColor: getPriceColor(price, minPrice, maxPrice) }}
                >
                  {formatPrice(price)}
                </span>
              )}
            </button>
          );
        })}

      </div>
    </div>
  );
}
