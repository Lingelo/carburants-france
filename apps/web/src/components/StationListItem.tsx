import type { Station } from '../types';
import { formatDistance } from '../lib/distance';
import { formatPrice } from '../lib/format';
import { useI18n } from '../i18n';
import { BrandAvatar } from './BrandAvatar';
import { Icon } from './Icon';

interface Props {
  station: Station;
  price: number;
  distanceKm: number;
  /** Tier color for the price text (priceColor gradient). */
  priceColor: string;
  selected: boolean;
  /** Cheapest of the current list → accent badge. */
  cheapest: boolean;
  isFavorite: boolean;
  freshness: string;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onLocate: () => void;
}

/**
 * Compact station row (spec §3): 44 px brand avatar, brand name,
 * `distance • price` subline, 24/7 mini-chip, favorite + locate actions.
 * Used by the desktop sidebar list and the mobile bottom sheet.
 */
export function StationListItem({
  station,
  price,
  distanceKm,
  priceColor,
  selected,
  cheapest,
  isFavorite,
  freshness,
  onSelect,
  onToggleFavorite,
  onLocate,
}: Props) {
  const { t } = useI18n();
  const name = station.brand ?? station.city;

  return (
    <div
      data-station={station.id}
      className={[
        'relative flex items-center gap-3 p-3 rounded-[14px] transition-colors w-full',
        selected
          ? 'bg-primary/8 border-[1.5px] border-primary'
          : 'bg-surface-container border border-outline-variant hover:border-outline-strong',
      ].join(' ')}
    >
      {/* Whole-row click target (keeps the action buttons on top). */}
      <button
        onClick={onSelect}
        className="absolute inset-0 rounded-[14px] z-0"
        aria-label={name}
      />
      <BrandAvatar brand={station.brand} size={44} className="relative z-10 pointer-events-none" />
      <div className="min-w-0 flex-1 relative z-10 pointer-events-none">
        <div className="flex items-center gap-1.5 min-w-0">
          <h3 className="text-body-sm font-semibold text-on-surface truncate">{name}</h3>
          {cheapest && (
            <span className="shrink-0 text-[10px] font-bold tracking-wider text-primary bg-primary/12 px-1.5 py-0.5 rounded-full">
              {t('station.cheapest')}
            </span>
          )}
        </div>
        <p className="text-body-sm text-on-surface-variant flex items-center gap-1.5 truncate">
          <span className="shrink-0">{formatDistance(distanceKm)}</span>
          <span aria-hidden="true">•</span>
          <span className="font-semibold tabular-nums shrink-0" style={{ color: priceColor }}>
            {formatPrice(price)} €
          </span>
          {station.h24 && (
            <span className="shrink-0 text-[10px] font-bold tracking-wider text-on-surface-variant border border-outline-variant px-1.5 py-px rounded-full">
              {t('common.h24')}
            </span>
          )}
        </p>
        <p className="text-[11px] text-outline truncate">{freshness}</p>
      </div>
      {/* Stacked vertically like the reference design — frees ~34 px of
          text width so `distance • price • 24h/24` fits without clipping. */}
      <div className="flex flex-col items-center shrink-0 relative z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="p-1.5 rounded-full hover:bg-surface-container-high active:scale-90 transition-transform"
          aria-label={isFavorite ? t('station.removeFav') : t('station.addFav')}
        >
          <Icon
            name="star"
            filled={isFavorite}
            size={18}
            className={isFavorite ? 'text-primary' : 'text-on-surface-variant'}
          />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLocate();
          }}
          className="p-1.5 rounded-full hover:bg-surface-container-high active:scale-90 transition-transform"
          aria-label={t('map.center')}
        >
          <Icon name="my_location" size={18} className="text-on-surface-variant" />
        </button>
      </div>
    </div>
  );
}
