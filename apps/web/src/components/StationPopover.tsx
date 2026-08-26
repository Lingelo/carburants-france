import type { FuelType, Station } from '../types';
import { FUEL_LABELS, FUEL_TYPES } from '../types';
import { formatDistance } from '../lib/distance';
import { isStale, timeAgo } from '../lib/data';
import { formatPrice } from '../lib/format';
import { getPriceBounds, getPriceColor } from '../lib/priceColor';
import { useSettings } from '../state/SettingsContext';
import { useI18n } from '../i18n';
import { BrandAvatar } from './BrandAvatar';
import { Icon } from './Icon';

interface Props {
  station: Station;
  distanceKm: number;
  selectedFuel: FuelType;
  isFavorite: boolean;
  /** Reference prices (selected fuel, visible zone) so tiers match the map pins. */
  referencePrices?: number[];
  routeLoading?: boolean;
  onToggleFavorite: () => void;
  onOpenDetails: () => void;
  onRoute: () => void;
  onClose: () => void;
}

/**
 * Floating station card (spec §3) shown when a pin is selected.
 * Positioning is owned by the caller: bottom-left of the map area on
 * desktop, bottom card above the sheet on mobile.
 */
export function StationPopover({
  station,
  distanceKm,
  selectedFuel,
  isFavorite,
  referencePrices,
  routeLoading = false,
  onToggleFavorite,
  onOpenDetails,
  onRoute,
  onClose,
}: Props) {
  const settings = useSettings();
  const { t } = useI18n();

  const fuels = FUEL_TYPES.filter((f) => station.fuels[f]);
  const otherFuels = fuels.filter((f) => f !== selectedFuel);
  const main = station.fuels[selectedFuel];

  const selectedBounds =
    referencePrices && referencePrices.length > 0 ? getPriceBounds(referencePrices) : null;
  const ownBounds = getPriceBounds(fuels.map((f) => station.fuels[f]!.p));
  const mainColor = main
    ? getPriceColor(main.p, (selectedBounds ?? ownBounds).pMin, (selectedBounds ?? ownBounds).pMax)
    : undefined;
  const stale = settings.showStaleWarning && main ? isStale(main.d) : false;

  const chipClass =
    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-outline-variant text-[12px] font-semibold text-on-surface-variant whitespace-nowrap';

  return (
    <div
      role="dialog"
      aria-label={station.brand ?? t('station.fallbackNameId', { id: station.id })}
      className="bg-surface-container rounded-2xl border border-outline-variant shadow-[0_8px_24px_rgba(0,0,0,0.45)] px-4 pt-4 pb-5 w-full animate-[slideUp_220ms_ease-out]"
    >
      <div className="flex items-start gap-3">
        <BrandAvatar brand={station.brand} size={44} />
        <div className="min-w-0 flex-1">
          <h2 className="text-body-lg font-semibold text-on-surface truncate">
            {station.brand ?? t('station.fallbackNameId', { id: station.id })}
          </h2>
          <p className="text-body-sm text-on-surface-variant truncate">
            {station.addr ? `${station.addr}, ` : ''}
            {station.cp} {station.city}
          </p>
        </div>
        <div className="flex shrink-0 -mr-1 -mt-1">
          <button
            onClick={onToggleFavorite}
            className="p-2 rounded-full hover:bg-surface-container-high active:scale-95 transition-transform"
            aria-label={isFavorite ? t('station.removeFav') : t('station.addFav')}
          >
            <Icon
              name="star"
              filled={isFavorite}
              size={20}
              className={isFavorite ? 'text-primary' : 'text-on-surface-variant'}
            />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-container-high active:scale-95 transition-transform"
            aria-label={t('common.close')}
          >
            <Icon name="close" size={20} className="text-on-surface-variant" />
          </button>
        </div>
      </div>

      {/* Meta chips: selected price / distance / freshness / 24-7 */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {main && (
          <span className={chipClass}>
            <span className="text-on-surface-variant">{FUEL_LABELS[selectedFuel]}</span>
            <span className="font-bold tabular-nums" style={{ color: mainColor }}>
              {formatPrice(main.p)} €
            </span>
          </span>
        )}
        <span className={chipClass}>
          <Icon name="near_me" size={13} />
          {formatDistance(distanceKm)}
        </span>
        {main && (
          <span
            className={`${chipClass} ${stale ? 'text-error border-error/40' : ''}`}
            title={stale ? t('station.staleTitle') : undefined}
          >
            <Icon name={stale ? 'warning' : 'schedule'} size={13} />
            {timeAgo(main.d)}
          </span>
        )}
        {station.h24 && (
          <span className={`${chipClass} text-primary border-primary/40`}>
            <Icon name="schedule" size={13} filled />
            {t('common.h24')}
          </span>
        )}
      </div>

      {/* Other fuels */}
      {otherFuels.length > 0 && (
        <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar">
          {otherFuels.map((fuel) => {
            const fp = station.fuels[fuel]!;
            return (
              <span
                key={fuel}
                className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container-high text-[11px] font-semibold text-on-surface-variant"
              >
                {FUEL_LABELS[fuel]}
                <span className="tabular-nums text-on-surface">{formatPrice(fp.p)} €</span>
              </span>
            );
          })}
        </div>
      )}

      {/* CTA row */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={onOpenDetails}
          className="flex-1 bg-secondary-container text-on-secondary-container py-2.5 rounded-full text-body-sm font-semibold flex items-center justify-center gap-1 active:scale-[0.97] transition-transform"
        >
          {t('station.moreDetails')}
        </button>
        <button
          onClick={onRoute}
          disabled={routeLoading}
          className="flex-1 bg-primary text-on-primary py-2.5 rounded-full text-body-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-70"
        >
          <Icon name={routeLoading ? 'progress_activity' : 'directions'} size={18} />
          {routeLoading ? t('route.loading') : t('common.directions')}
        </button>
      </div>
    </div>
  );
}
