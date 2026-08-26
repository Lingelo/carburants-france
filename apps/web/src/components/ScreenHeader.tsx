import type { ReactNode } from 'react';
import { useViewNav } from '../state/ViewContext';
import { useI18n } from '../i18n';
import { Icon } from './Icon';

interface Props {
  title: string;
  /** Optional right-aligned actions (buttons, counters…). */
  actions?: ReactNode;
}

/**
 * Simple sticky header for the secondary screens (Favorites, Trends,
 * Settings). Replaces the removed global TopAppBar: back arrow → map.
 */
export function ScreenHeader({ title, actions }: Props) {
  const nav = useViewNav();
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 px-3 h-14 bg-surface-container-low/95 backdrop-blur border-b border-outline-variant">
      <button
        onClick={() => nav.goBack()}
        className="p-2 rounded-full text-on-surface hover:bg-surface-container active:scale-95 transition-transform"
        aria-label={t('common.back')}
      >
        <Icon name="arrow_back" size={22} />
      </button>
      <h1 className="text-headline-md font-semibold text-on-surface truncate flex-1 min-w-0">
        {title}
      </h1>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}
