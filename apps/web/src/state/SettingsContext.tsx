import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const KEY = 'fuel-radar-settings-v1';
// Pre-rename key — same origin (lingelo.github.io), so existing users still
// have their settings under it. Read it as a fallback and clean it up.
const LEGACY_KEY = 'carburants-france-settings-v1';

interface Settings {
  showStaleWarning: boolean;
}

interface State extends Settings {
  setShowStaleWarning: (b: boolean) => void;
}

const DEFAULTS: Settings = {
  showStaleWarning: true,
};

const Ctx = createContext<State | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
      if (!raw) return DEFAULTS;
      const parsed = JSON.parse(raw) as Partial<Settings> & { defaultStart?: string };
      // Migration (dark map-first redesign): the "start screen" preference is
      // gone — the Stations list merged into the map. Drop the stored value;
      // the persistence effect below rewrites the entry without it.
      delete parsed.defaultStart;
      return { ...DEFAULTS, ...parsed };
    } catch {
      return DEFAULTS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      // ignore
    }
  }, [settings]);

  const value = useMemo<State>(
    () => ({
      ...settings,
      setShowStaleWarning: (showStaleWarning) => setSettings((s) => ({ ...s, showStaleWarning })),
    }),
    [settings],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): State {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
