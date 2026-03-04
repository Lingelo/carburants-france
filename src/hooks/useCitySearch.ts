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
        const params = new URLSearchParams({
          q: q.trim(),
          type: 'municipality',
          limit: '7',
        });
        const res = await fetch(`${API_URL}?${params}`, {
          signal: controller.signal,
        });
        const data = await res.json();

        const cities: CityResult[] = data.features.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (f: any) => ({
            name: f.properties.city || f.properties.name,
            postcode: f.properties.postcode,
            departmentCode:
              f.properties.context?.split(',')[0]?.trim() ||
              f.properties.postcode.substring(0, 2),
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
          }),
        );

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
