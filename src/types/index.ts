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
  /** Fuel types currently in shortage (rupture) at this station */
  ruptures?: FuelType[];
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
