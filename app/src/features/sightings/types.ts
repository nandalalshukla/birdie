export type Sighting = {
  id: string;
  job_id: string | null;
  scientific_name: string;
  common_name: string;
  confidence: number;
  lat: number;
  lon: number;
  observed_at: string;
  observer_name: string | null;
  note: string | null;
  is_public: boolean;
  is_mine: boolean;
  created_at: string;
};

/** [minLon, minLat, maxLon, maxLat] */
export type BBox = [number, number, number, number];

export type SightingFeature = {
  type: 'Feature';
  id: string;
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: Omit<Sighting, 'lat' | 'lon'>;
};

export type SightingCollection = { type: 'FeatureCollection'; features: SightingFeature[] };
