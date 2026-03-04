import type { FuelType } from '../types';
import { ALL_FUELS, FUEL_COLORS, FUEL_LABELS } from '../utils/fuel';

interface Props {
  selected: FuelType;
  onChange: (fuel: FuelType) => void;
}

export function FuelFilter({ selected, onChange }: Props) {
  return (
    <div className="flex gap-1 overflow-x-auto">
      {ALL_FUELS.map((fuel) => {
        const isActive = fuel === selected;
        return (
          <button
            key={fuel}
            onClick={() => onChange(fuel)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              isActive
                ? 'text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={isActive ? { backgroundColor: FUEL_COLORS[fuel] } : undefined}
          >
            {FUEL_LABELS[fuel]}
          </button>
        );
      })}
    </div>
  );
}
