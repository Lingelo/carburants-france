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
