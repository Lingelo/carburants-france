import { useState, useCallback, useRef, useEffect } from 'react';
import type { Station, MetaData } from '../types';

const BASE = import.meta.env.BASE_URL;

export function useStations() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<MetaData | null>(null);
  const loadedDeptsRef = useRef<Set<string>>(new Set());
  const loadKeyRef = useRef(0);

  // Load meta eagerly so lastUpdate is available on the welcome screen
  useEffect(() => {
    fetch(`${BASE}data/meta.json`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setMeta(data); })
      .catch(() => {});
  }, []);

  const loadDepartments = useCallback(async (deptCodes: string[]) => {
    const key = ++loadKeyRef.current;

    // Find which departments we haven't loaded yet
    const toLoad = deptCodes.filter((d) => !loadedDeptsRef.current.has(d));

    if (toLoad.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const fetches = toLoad.map(async (dept) => {
        const res = await fetch(`${BASE}data/departments/${dept}.json`);
        if (!res.ok) return [];
        return (await res.json()) as Station[];
      });

      const metaFetch = fetch(`${BASE}data/meta.json`);

      const results = await Promise.all(fetches);

      // Abort if a newer load was triggered
      if (key !== loadKeyRef.current) return;

      const newStations = results.flat();
      for (const dept of toLoad) {
        loadedDeptsRef.current.add(dept);
      }

      setStations((prev) => [...prev, ...newStations]);

      try {
        const metaRes = await metaFetch;
        if (metaRes.ok) {
          setMeta(await metaRes.json());
        }
      } catch {
        // meta is non-critical
      }
    } catch (err) {
      if (key === loadKeyRef.current) {
        setError((err as Error).message);
      }
    } finally {
      if (key === loadKeyRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const resetStations = useCallback(() => {
    setStations([]);
    loadedDeptsRef.current.clear();
    loadKeyRef.current++;
  }, []);

  return { stations, loading, error, meta, loadDepartments, resetStations };
}
