import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { listSightings, type SightingFilters } from '../api';
import type { Sighting } from '../types';

/** Loads sightings and refreshes whenever the screen regains focus. */
export function useSightings(filters: SightingFilters) {
  const [items, setItems] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(filters);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listSightings(JSON.parse(key) as SightingFilters));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [key]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return { items, setItems, loading, error, reload: load };
}
