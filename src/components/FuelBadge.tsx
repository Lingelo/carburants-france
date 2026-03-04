import type { FuelType } from '../types';
import { FUEL_COLORS, FUEL_LABELS, formatPrice } from '../utils/fuel';

interface Props {
  fuel: FuelType;
  price: number;
  date?: string;
  compact?: boolean;
}

export function FuelBadge({ fuel, price, compact }: Props) {
  const color = FUEL_COLORS[fuel];

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
        style={{ backgroundColor: color }}
      >
        {FUEL_LABELS[fuel]} {formatPrice(price)}
      </span>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm font-medium text-gray-700">
          {FUEL_LABELS[fuel]}
        </span>
      </div>
      <span className="text-sm font-semibold text-gray-900">
        {formatPrice(price)}
      </span>
    </div>
  );
}
