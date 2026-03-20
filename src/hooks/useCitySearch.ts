import { useState, useEffect, useRef, useCallback } from 'react';
import type { CityResult } from '../types';

const API_URL = 'https://api-adresse.data.gouv.fr/search/';

export function useCitySearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = useCallback((q: string) => {
    setQuery(q);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const trimmed = q.trim();

        // Run both queries in parallel:
        // 1. municipality filter — best for standard city names
        // 2. unfiltered — catches merged communes (communes nouvelles)
        //    whose old names only appear as oldcity in street results
        const [municipalityRes, unfilteredRes] = await Promise.all([
          fetch(
            `${API_URL}?${new URLSearchParams({ q: trimmed, type: 'municipality', limit: '7' })}`,
            { signal: controller.signal },
          ),
          fetch(
            `${API_URL}?${new URLSearchParams({ q: trimmed, limit: '15' })}`,
            { signal: controller.signal },
          ),
        ]);

        const [municipalityData, unfilteredData] = await Promise.all([
          municipalityRes.json(),
          unfilteredRes.json(),
        ]);

        // Start with municipality results
        const seen = new Set<string>();
        const cities: CityResult[] = [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const f of municipalityData.features as any[]) {
          const citycode = f.properties.citycode;
          seen.add(citycode);
          cities.push({
            name: f.properties.city || f.properties.name,
            postcode: f.properties.postcode,
            departmentCode:
              f.properties.context?.split(',')[0]?.trim() ||
              f.properties.postcode.substring(0, 2),
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
          });
        }

        // Supplement with unfiltered results (deduplicated)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const f of unfilteredData.features as any[]) {
          if (cities.length >= 7) break;
          const citycode = f.properties.citycode;
          if (seen.has(citycode)) continue;
          seen.add(citycode);
          cities.push({
            name:
              f.properties.oldcity ||
              f.properties.city ||
              f.properties.name,
            postcode: f.properties.postcode,
            departmentCode:
              f.properties.context?.split(',')[0]?.trim() ||
              f.properties.postcode.substring(0, 2),
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
          });
        }

        setResults(cities);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const setQuery_ = useCallback((q: string) => {
    setQuery(q);
    setResults([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
  }, []);

  return { query, search, results, loading, setResults, setQuery: setQuery_ };
}
