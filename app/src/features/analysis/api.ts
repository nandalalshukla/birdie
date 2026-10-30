import { Platform } from 'react-native';

import { request } from '@/lib/api/client';
import { getDeviceId } from '@/lib/device';

import type { AnalysisJob, JobStatus } from './types';

export type UploadParams = {
  uri: string;
  lat?: number | null;
  lon?: number | null;
  recordedAt?: Date;
  minConfidence?: number;
};

function guessFile(uri: string): { name: string; type: string } {
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'wav':
      return { name: 'recording.wav', type: 'audio/wav' };
    case 'webm':
      return { name: 'recording.webm', type: 'audio/webm' };
    case 'caf':
      return { name: 'recording.caf', type: 'audio/x-caf' };
    default:
      return { name: 'recording.m4a', type: 'audio/mp4' };
  }
}

export async function uploadRecording(params: UploadParams): Promise<{ id: string; status: JobStatus }> {
  const form = new FormData();

  if (Platform.OS === 'web') {
    // On web the recorder hands back a blob: URL.
    const blob = await (await fetch(params.uri)).blob();
    const ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'm4a' : 'webm';
    form.append('audio', blob, `recording.${ext}`);
  } else {
    const { name, type } = guessFile(params.uri);
    // React Native's FormData accepts a { uri, name, type } file descriptor.
    form.append('audio', { uri: params.uri, name, type } as unknown as Blob);
  }

  if (params.lat != null && params.lon != null) {
    form.append('lat', String(params.lat));
    form.append('lon', String(params.lon));
  }
  form.append('recorded_at', (params.recordedAt ?? new Date()).toISOString());
  if (params.minConfidence != null) form.append('min_confidence', String(params.minConfidence));
  form.append('device_id', await getDeviceId());

  return request('/analyses', { method: 'POST', body: form });
}

export function getAnalysis(id: string): Promise<AnalysisJob> {
  return request(`/analyses/${id}`);
}
