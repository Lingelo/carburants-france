import { FUEL_LABELS, type FuelType, type Station } from '../types';
import { formatDistance } from '../lib/distance';
import { isStale, timeAgo } from '../lib/data';
import { formatPrice } from '../lib/format';
import { useSettings } from '../state/SettingsContext';
import { useI18n } from '../i18n';
import { BrandAvatar } from './BrandAvatar';
import { Icon } from './Icon';

interface Props {
  station: Station;
  selectedFuel: FuelType;
  distanceKm: number;
  isCheapest?: boolean;
  savings?: number;
  priceColor?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onViewMap?: () => void;
  onClick?: () => void;
}

export function StationCard({
  station,
  selectedFuel,
  distanceKm,
  isCheapest,
  savings,
  priceColor,
  isFavorite,
  onToggleFavorite,
  onViewMap,
  onClick,
}: Props) {
  const settings = useSettings();
  const { t } = useI18n();
  const main = station.fuels[selectedFuel];
  const stale = settings.showStaleWarning && main ? isStale(main.d) : false;
  const otherFuels = (Object.keys(station.fuels) as FuelType[]).filter((f) => f !== selectedFuel);
  const display = station.brand ?? t('station.fallbackName');

  return (
    <article
      onClick={onClick}
      className={[
        'bg-surface-container rounded-xl p-md text-left w-full',
        isCheapest
          ? 'border border-primary/40 relative overflow-hidden'
          : 'border border-outline-variant',
        onClick ? 'cursor-pointer hover:border-outline-strong transition-colors' : '',
      ].join(' ')}
    >
      {isCheapest && (
        <div className="absolute top-0 right-0 bg-tertiary-container text-on-tertiary-container text-label-caps font-bold tracking-wider px-3 py-1 rounded-bl-lg">
          {t('station.cheapest')}
        </div>
      )}
      <div className="flex justify-between items-start gap-md">
        <div className="flex flex-col gap-xs flex-1 min-w-0">
          <div className="flex items-center gap-sm">
            <BrandAvatar brand={station.brand} size={44} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-headline-md font-semibold text-on-surface truncate">{display}</h3>
                {station.hw && (
                  <span className="shrink-0 text-label-caps font-bold tracking-wider bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded">
                    {t('station.motorway')}
                  </span>
                )}
              </div>
              <p className="text-body-sm text-on-surface-variant flex items-center gap-1">
                <Icon name="location_on" size={16} />
                <span className="truncate">
                  {formatDistance(distanceKm)} • {station.addr || station.city}
                </span>
              </p>
            </div>
          </div>
          {otherFuels.length > 0 && (
            <div className="mt-sm flex gap-2 flex-wrap">
              {otherFuels.slice(0, 3).map((f) => (
                <span
                  key={f}
                  className="px-2 py-1 rounded-lg bg-surface-container-high text-on-surface-variant text-label-caps font-bold tracking-wider"
                >
                  {FUEL_LABELS[f]}: {formatPrice(station.fuels[f]!.p)} €
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-right flex flex-col items-end shrink-0">
          {savings !== undefined && savings < 0 && (
            <span className="bg-tertiary-fixed text-on-tertiary-fixed px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider">
              {formatPrice(savings, 2)} €
            </span>
          )}
          {main ? (
            <div
              className="text-display-price font-bold tracking-tight mt-1 tabular-nums"
              style={{ color: priceColor ?? (isCheapest ? 'var(--color-primary)' : 'var(--color-on-surface)') }}
            >
              {formatPrice(main.p)}
              <span className="text-headline-md font-semibold ml-0.5">€</span>
            </div>
          ) : (
            <div className="text-body-sm text-on-surface-variant mt-1">
              {t('station.noFuel', { fuel: FUEL_LABELS[selectedFuel] })}
            </div>
          )}
        </div>
      </div>
      <div className="mt-md pt-sm border-t border-outline-variant flex justify-between items-center">
        <p className={`text-body-sm flex items-center gap-1 ${stale ? 'text-error' : 'text-on-surface-variant'}`}>
          {stale && <Icon name="warning" size={14} />}
          {main ? t('time.updated', { time: timeAgo(main.d) }) : '—'}
        </p>
        <div className="flex items-center gap-1">
          {onToggleFavorite && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className="p-1 rounded-full hover:bg-surface-container-high active:scale-90 transition-transform"
              aria-label={isFavorite ? t('station.removeFav') : t('station.addFav')}
            >
              <Icon
                name="star"
                filled={isFavorite}
                size={18}
                className={isFavorite ? 'text-primary' : 'text-on-surface-variant'}
              />
            </button>
          )}
          {onViewMap && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewMap();
            }}
            className="text-primary text-label-caps font-bold tracking-wider flex items-center gap-1 hover:bg-surface-container-high px-2 py-1 rounded transition-colors"
          >
              {t('station.viewOnMap')} <Icon name="map" size={16} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
