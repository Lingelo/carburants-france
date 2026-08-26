import { useViewNav } from '../state/ViewContext';
import { useI18n } from '../i18n';
import { Icon } from './Icon';

/** Mobile bottom nav — 4 tabs (Stations list merged into the map view). */
export function BottomNavBar() {
  const { view, goMap, goFavorites, goTrends, goSettings } = useViewNav();
  const { t } = useI18n();

  const tabClass = (active: boolean) =>
    [
      'flex flex-col items-center justify-center px-1 py-1 active:scale-90 transition-transform flex-1 min-w-0 max-w-[88px] h-14 rounded-xl',
      active ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:text-on-surface',
    ].join(' ');

  const isMap = view.kind === 'map';
  const isFav = view.kind === 'favorites';
  const isTrends = view.kind === 'trends';
  const isSettings = view.kind === 'settings';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center gap-1 px-1 pb-safe h-[calc(4rem+env(safe-area-inset-bottom))] bg-surface-container-low z-[500] border-t border-outline-variant">
      <button onClick={() => goMap()} className={tabClass(isMap)} aria-label={t('nav.map')}>
        <Icon name="map" filled={isMap} />
        <span className="text-[10px] font-medium mt-1 max-w-full truncate">{t('nav.map')}</span>
      </button>
      <button onClick={goFavorites} className={tabClass(isFav)} aria-label={t('nav.favorites')}>
        <Icon name="star" filled={isFav} />
        <span className="text-[10px] font-medium mt-1 max-w-full truncate">{t('nav.favorites')}</span>
      </button>
      <button onClick={goTrends} className={tabClass(isTrends)} aria-label={t('nav.trends')}>
        <Icon name="insights" filled={isTrends} />
        <span className="text-[10px] font-medium mt-1 max-w-full truncate">{t('nav.trends')}</span>
      </button>
      <button onClick={goSettings} className={tabClass(isSettings)} aria-label={t('nav.settings')}>
        <Icon name="settings" filled={isSettings} />
        <span className="text-[10px] font-medium mt-1 max-w-full truncate">{t('nav.settings')}</span>
      </button>
    </nav>
  );
}
