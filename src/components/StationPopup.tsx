import type { FuelType, Station } from '../types';
import { FuelBadge } from './FuelBadge';
import { ALL_FUELS, timeAgo } from '../utils/fuel';
import { formatDistance } from '../utils/geo';

interface Props {
  station: Station & { distance?: number };
  selectedFuel: FuelType;
}

export function StationPopup({ station, selectedFuel }: Props) {
  // Show selected fuel first, then others
  const orderedFuels = [
    selectedFuel,
    ...ALL_FUELS.filter((f) => f !== selectedFuel),
  ].filter((f) => station.fuels[f]);

  const latestDate = Object.values(station.fuels)
    .map((f) => f?.d)
    .filter(Boolean)
    .sort()
    .pop();

  return (
    <div className="min-w-[200px]">
      <div className="mb-1 font-semibold text-gray-800 text-sm leading-tight">
        {station.addr}
      </div>
      <div className="mb-2 text-xs text-gray-500">
        {station.city} · {station.cp}
        {station.distance !== undefined && (
          <> · {formatDistance(station.distance)}</>
        )}
      </div>
      <div className="space-y-1">
        {orderedFuels.map((fuel) => {
          const info = station.fuels[fuel];
          if (!info) return null;
          return <FuelBadge key={fuel} fuel={fuel} price={info.p} date={info.d} />;
        })}
      </div>
      {latestDate && (
        <div className="mt-2 text-[10px] text-gray-400">
          MAJ : {timeAgo(latestDate)}
        </div>
      )}
    </div>
  );
}
