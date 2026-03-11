import { useState, useCallback, useRef } from 'react';
import type { StationHistoryData } from '../types';
import { getDepartmentFromPostalCode } from '../utils/geo';

const BASE_URL = import.meta.env.BASE_URL;

/**
 * Lazy-loads per-station history for a department.
 * Only fetches when explicitly requested (when user opens station detail modal).
 * Caches loaded departments to avoid re-fetching.
 */
export function useStationHistory() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, StationHistoryData>>(new Map());

  const getStationHistory = useCallback(
    async (
      stationId: number,
      postalCode: string,
    ): Promise<Record<string, [number, number][]> | null> => {
      const dept = getDepartmentFromPostalCode(postalCode);

      // Check cache first
      if (cacheRef.current.has(dept)) {
        const deptData = cacheRef.current.get(dept)!;
        return deptData[String(stationId)] ?? null;
      }

      // Fetch department history
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${BASE_URL}data/history/${dept}.json`);
        if (!res.ok) {
          if (res.status === 404) {
            // No history available for this department yet
            cacheRef.current.set(dept, {});
            return null;
          }
          throw new Error(`HTTP ${res.status}`);
        }

        const data: StationHistoryData = await res.json();
        cacheRef.current.set(dept, data);
        return data[String(stationId)] ?? null;
      } catch {
        setError('Historique non disponible');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { getStationHistory, loading, error };
}
