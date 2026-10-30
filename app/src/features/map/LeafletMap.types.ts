import type { MapInbound, MapOutbound } from './leafletHtml';

export type LeafletMapHandle = {
  post: (msg: MapInbound) => void;
};

export type LeafletMapProps = {
  initialCenter: { lat: number; lon: number };
  initialZoom?: number;
  onMessage: (msg: MapOutbound) => void;
};
