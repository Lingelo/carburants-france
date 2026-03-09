import { useState, useMemo } from 'react';
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

function computeRealCost(
  pricePerLiter: number,
  distanceKm: number,
  tankSize: number,
  consumption: number,
  hourlyRate: number,
  avgSpeed: number,
): number {
  const roundTripKm = distanceKm * 2;
  const fuelForTrip = (roundTripKm / 100) * consumption;
  const fillUp = tankSize * 0.8; // assume tank is 20% full
  const fuelCost = pricePerLiter * (fillUp + fuelForTrip);
  const timeCostEur = (roundTripKm / avgSpeed) * hourlyRate;
  return fuelCost + timeCostEur;
}

export function StationPanel({ stations, totalStations, selectedFuel, onStationClick, selectedStationId, priceBounds, onStationHover }: Props) {
  const [realCostMode, setRealCostMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tankSize, setTankSize] = useState(40);
  const [consumption, setConsumption] = useState(7);
  const [hourlyRate, setHourlyRate] = useState(15);
  const [avgSpeed, setAvgSpeed] = useState(50);

  const { pMin: minPrice, pMax: maxPrice } = priceBounds;

  const withFuel = useMemo(() => {
    const filtered = stations.filter((s) => getFuelPrice(s, selectedFuel) !== null);

    if (realCostMode) {
      return [...filtered].sort((a, b) => {
        const costA = computeRealCost(getFuelPrice(a, selectedFuel)!, a.distance, tankSize, consumption, hourlyRate, avgSpeed);
        const costB = computeRealCost(getFuelPrice(b, selectedFuel)!, b.distance, tankSize, consumption, hourlyRate, avgSpeed);
        return costA - costB;
      });
    }

    return [...filtered].sort((a, b) => {
      const pa = getFuelPrice(a, selectedFuel)!;
      const pb = getFuelPrice(b, selectedFuel)!;
      return pa - pb;
    });
  }, [stations, selectedFuel, realCostMode, tankSize, consumption, hourlyRate, avgSpeed]);

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
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-700">
              {stations.length} station{stations.length > 1 ? 's' : ''} visible{stations.length > 1 ? 's' : ''}
            </span>
            <span className="text-[11px] text-gray-400">
              {' '}· {totalStations} au total
            </span>
          </div>
          <button
            onClick={() => { setShowSettings(!showSettings); if (!realCostMode) setRealCostMode(true); }}
            className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
              realCostMode
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
            }`}
            title="Coût réel (trajet inclus)"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.6A2 2 0 0013.7 5H6.3a2 2 0 00-1.6.9L2 9.5 1.5 11C.7 11.3 0 12.1 0 13v3c0 .6.4 1 1 1h2" />
              <circle cx="7" cy="17" r="2" />
              <circle cx="17" cy="17" r="2" />
            </svg>
            Coût réel
          </button>
        </div>

        {/* Car settings - collapsible */}
        {showSettings && (
          <div className="mt-2 rounded-lg bg-gray-50 p-2">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              <label className="flex items-center gap-1">
                <span className="text-[10px] text-gray-500 shrink-0">Réservoir</span>
                <input
                  type="number"
                  value={tankSize}
                  onChange={(e) => setTankSize(Math.max(1, Number(e.target.value)))}
                  className="w-10 rounded border border-gray-200 px-1 py-0.5 text-center text-[11px] font-medium text-gray-700"
                  min={1}
                  max={120}
                />
                <span className="text-[10px] text-gray-400">L</span>
              </label>
              <label className="flex items-center gap-1">
                <span className="text-[10px] text-gray-500 shrink-0">Conso</span>
                <input
                  type="number"
                  value={consumption}
                  onChange={(e) => setConsumption(Math.max(0.1, Number(e.target.value)))}
                  className="w-10 rounded border border-gray-200 px-1 py-0.5 text-center text-[11px] font-medium text-gray-700"
                  min={0.1}
                  max={30}
                  step={0.1}
                />
                <span className="text-[10px] text-gray-400">L/100</span>
              </label>
              <label className="flex items-center gap-1">
                <span className="text-[10px] text-gray-500 shrink-0">Vitesse</span>
                <input
                  type="number"
                  value={avgSpeed}
                  onChange={(e) => setAvgSpeed(Math.max(10, Number(e.target.value)))}
                  className="w-10 rounded border border-gray-200 px-1 py-0.5 text-center text-[11px] font-medium text-gray-700"
                  min={10}
                  max={130}
                />
                <span className="text-[10px] text-gray-400">km/h</span>
              </label>
              <label className="flex items-center gap-1">
                <span className="text-[10px] text-gray-500 shrink-0">Temps</span>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Math.max(0, Number(e.target.value)))}
                  className="w-10 rounded border border-gray-200 px-1 py-0.5 text-center text-[11px] font-medium text-gray-700"
                  min={0}
                  max={100}
                />
                <span className="text-[10px] text-gray-400">€/h</span>
              </label>
            </div>
            <div className="mt-1.5 flex justify-end">
              <button
                onClick={() => { setRealCostMode(false); setShowSettings(false); }}
                className="rounded px-1.5 py-0.5 text-[10px] text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              >
                Désactiver
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Station list */}
      <div className="flex-1 overflow-y-auto panel-scroll">
        {withFuel.map((station) => {
          const price = getFuelPrice(station, selectedFuel);
          if (price === null) return null;
          const isSelected = station.id === selectedStationId;
          const realCost = realCostMode
            ? computeRealCost(price, station.distance, tankSize, consumption, hourlyRate, avgSpeed)
            : null;

          return (
            <button
              key={station.id}
              onClick={() => onStationClick(station)}
              onMouseEnter={() => onStationHover(station.id)}
              onMouseLeave={() => onStationHover(null)}
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
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
                  style={{ backgroundColor: getPriceColor(price, minPrice, maxPrice) }}
                >
                  {formatPrice(price)}
                </span>
                {realCost !== null && (
                  <span className="text-[10px] font-semibold text-gray-500">
                    {realCost.toFixed(2).replace('.', ',')} € plein
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
