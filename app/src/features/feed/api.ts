import { request } from '@/lib/api/client';
import type { Sighting } from '@/features/sightings';

export type FeedSighting = Sighting & { distance_km: number | null };
export type FeedPage = { items: FeedSighting[]; next_cursor: string | null };

export type TrendingSpecies = {
  scientific_name: string;
  common_name: string;
  sightings: number;
  last_seen: string;
};

export type FeedStats = {
  days: number;
  sightings: number;
  species: number;
  observers: number;
  trending: TrendingSpecies[];
};

export type FeedQuery = {
  near?: { lat: number; lon: number } | null;
  radiusKm?: number;
  species?: string | null;
};

function where(q: FeedQuery) {
  return {
    lat: q.near?.lat,
    lon: q.near?.lon,
    radius_km: q.near ? q.radiusKm ?? 50 : undefined,
    species: q.species ?? undefined,
  };
}

export function getFeed(q: FeedQuery, cursor?: string | null, limit = 20): Promise<FeedPage> {
  return request('/feed', { query: { ...where(q), cursor: cursor ?? undefined, limit } });
}

export function getFeedStats(q: FeedQuery, days = 7): Promise<FeedStats> {
  return request('/feed/stats', { query: { ...where(q), species: undefined, days } });
}
