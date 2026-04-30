export type FuelType = 'Gazole' | 'SP95' | 'SP98' | 'E10' | 'E85' | 'GPLc';

export interface FuelPrice {
  /** Price in euros */
  p: number;
  /** Last update date ISO string */
  d: string;
}

export interface Station {
  id: number;
  lat: number;
  lng: number;
  addr: string;
  city: string;
  cp: string;
  brand?: string;
  fuels: Partial<Record<FuelType, FuelPrice>>;
}

export interface CityResult {
  name: string;
  postcode: string;
  departmentCode: string;
  lat: number;
  lng: number;
}

export interface MetaData {
  lastUpdate: string;
}

/** Per-station price history: stationId → fuel → [epoch, price][] */
export type StationHistoryData = Record<string, Record<string, [number, number][]>>;

/** Runtime install affordance available to the user. */
export type InstallContext =
  | 'native-prompt'    // beforeinstallprompt event captured, can call prompt() directly
  | 'ios-safari'       // iOS Safari (no beforeinstallprompt) — show Share + Add to Home Screen
  | 'in-app-webview'   // Facebook/Instagram/Gmail/etc WebView — instruct to reopen in real browser
  | 'generic';         // Firefox / desktop without prompt / unknown — point at browser menu

/** Subset of the BeforeInstallPromptEvent we use. Native browser type. */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}
