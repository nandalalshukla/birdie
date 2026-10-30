import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

import { RECORDING_MIN_SECONDS } from '@/config/constants';

import { BIRD_RECORDING_OPTIONS } from '../recordingOptions';

export type RecordingResult = { uri: string; durationSeconds: number };

type Phase = 'idle' | 'recording' | 'stopping' | 'finished' | 'error';

/**
 * Records a fixed-length clip and stops automatically when `maxSeconds` is
 * reached. The user can also stop early (after the minimum length).
 */
export function useBirdRecorder(maxSeconds: number) {
  const recorder = useAudioRecorder(BIRD_RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 100);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecordingResult | null>(null);
  const stoppingRef = useRef(false);

  const elapsedSeconds = recorderState.durationMillis / 1000;

  const stop = useCallback(async () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    setPhase('stopping');
    try {
      const durationSeconds = recorder.getStatus().durationMillis / 1000;
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('Recording file is missing');
      setResult({ uri, durationSeconds });
      setPhase('finished');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    } finally {
      stoppingRef.current = false;
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    }
  }, [recorder]);

  const start = useCallback(async () => {
    setError(null);
    setResult(null);
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setError('Microphone permission is needed to listen for birds.');
      setPhase('error');
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPhase('recording');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  }, [recorder]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setPhase('idle');
  }, []);

  // Auto-stop at the configured length.
  useEffect(() => {
    if (phase === 'recording' && elapsedSeconds >= maxSeconds) void stop();
  }, [phase, elapsedSeconds, maxSeconds, stop]);

  return {
    phase,
    error,
    result,
    elapsedSeconds: phase === 'recording' ? elapsedSeconds : result?.durationSeconds ?? 0,
    metering: recorderState.metering ?? null,
    canStop: phase === 'recording' && elapsedSeconds >= RECORDING_MIN_SECONDS,
    start,
    stop,
    reset,
  };
}
