import { useEffect, useState } from 'react';

import { getSpeciesInfo } from '../api';
import type { SpeciesInfo } from '../types';

// Species metadata rarely changes; keep it for the app session.
const memo = new Map<string, Promise<SpeciesInfo>>();

export function useSpeciesInfo(scientificName: string, commonName?: string) {
  const [info, setInfo] = useState<SpeciesInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let promise = memo.get(scientificName);
    if (!promise) {
      promise = getSpeciesInfo(scientificName, commonName);
      memo.set(scientificName, promise);
      promise.catch(() => memo.delete(scientificName));
    }
    setLoading(true);
    promise
      .then((data) => !cancelled && setInfo(data))
      .catch(() => !cancelled && setInfo(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [scientificName, commonName]);

  return { info, loading };
}
