import { request } from '@/lib/api/client';
import { getDeviceId } from '@/lib/device';

import type { BBox, Sighting, SightingCollection } from './types';

export type SightingFilters = {
  bbox?: BBox;
  mine?: boolean;
  species?: string;
  since?: string;
  limit?: number;
};

function toQuery(f: SightingFilters) {
  return {
    bbox: f.bbox?.map((n) => n.toFixed(5)).join(','),
    mine: f.mine || undefined,
    species: f.species,
    since: f.since,
    limit: f.limit,
  };
}

export async function createSighting(params: {
  jobId: string;
  scientificName: string;
  isPublic: boolean;
  note?: string;
  observerName?: string | null;
  lat?: number | null;
  lon?: number | null;
}): Promise<Sighting> {
  return request('/sightings', {
    method: 'POST',
    body: {
      job_id: params.jobId,
      scientific_name: params.scientificName,
      device_id: await getDeviceId(),
      is_public: params.isPublic,
      note: params.note || null,
      observer_name: params.observerName || null,
      lat: params.lat ?? null,
      lon: params.lon ?? null,
    },
  });
}

export function listSightings(filters: SightingFilters = {}): Promise<Sighting[]> {
  return request('/sightings', { query: toQuery(filters) });
}

export function getSightingsGeoJSON(filters: SightingFilters = {}): Promise<SightingCollection> {
  return request('/sightings/geojson', { query: toQuery(filters) });
}

export function deleteSighting(id: string): Promise<void> {
  return request(`/sightings/${id}`, { method: 'DELETE' });
}
