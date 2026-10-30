import { request } from '@/lib/api/client';

import type { SpeciesInfo } from './types';

export function getSpeciesInfo(scientificName: string, commonName?: string): Promise<SpeciesInfo> {
  return request(`/species/${encodeURIComponent(scientificName)}`, { query: { common_name: commonName } });
}
