import { useEffect, useState } from 'react';

import { getSpeciesInfo } from '../api';
import type { SpeciesInfo } from '../types';

// Species metadata rarely changes; keep it for the app session.
const memo = new Map<string, Promise<SpeciesInfo>>();

function load(scientificName: string, commonName?: string): Promise<SpeciesInfo> {
  let promise = memo.get(scientificName);
  if (!promise) {
    promise = getSpeciesInfo(scientificName, commonName);
    memo.set(scientificName, promise);
    promise.catch(() => memo.delete(scientificName));
  }
  return promise;
}

export function useSpeciesInfo(scientificName: string, commonName?: string) {
  const [state, setState] = useState<{ name: string; info: SpeciesInfo | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    load(scientificName, commonName)
      .then((info) => !cancelled && setState({ name: scientificName, info }))
      .catch(() => !cancelled && setState({ name: scientificName, info: null }));
    return () => {
      cancelled = true;
    };
  }, [scientificName, commonName]);

  const current = state?.name === scientificName ? state : null;
  return { info: current?.info ?? null, loading: current === null };
}
