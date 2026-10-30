export type JobStatus = 'queued' | 'processing' | 'done' | 'failed';

export type WindowDetection = {
  start: number;
  end: number;
  scientific_name: string;
  common_name: string;
  confidence: number;
};

export type SpeciesResult = {
  scientific_name: string;
  common_name: string;
  confidence: number; // aggregated
  max_confidence: number;
  mean_confidence: number;
  windows: number; // windows the species was detected in
  first_seen: number;
  last_seen: number;
};

export type AnalysisResult = {
  species: SpeciesResult[];
  windows: WindowDetection[];
  window_count: number;
  window_seconds: number;
  min_confidence: number;
  location_filtered: boolean;
  candidate_species: number | null;
  noise: string[];
  model: string;
};

export type AnalysisJob = {
  id: string;
  status: JobStatus;
  lat: number | null;
  lon: number | null;
  recorded_at: string;
  min_confidence: number;
  duration_seconds: number | null;
  result: AnalysisResult | null;
  has_spectrogram: boolean;
  error: string | null;
  created_at: string;
  finished_at: string | null;
};
