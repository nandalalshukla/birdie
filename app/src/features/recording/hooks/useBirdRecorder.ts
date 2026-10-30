import { requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

import { RECORDING_MIN_SECONDS } from '@/config/constants';

import { BIRD_RECORDING_OPTIONS } from '../recordingOptions';

export type RecordingResult = { uri: string; durationSeconds: number };

type Phase = 'idle' | 'recording' | 'stopping' | 'finished' | 'error';

const TICK_MS = 100;
const LEVEL_HISTORY = 32;

/** dBFS (-60..0) → 0..1 */
function normalizeLevel(metering: number | undefined): number {
  return metering == null ? 0 : Math.min(1, Math.max(0, (metering + 60) / 60));
}

/**
 * Records a fixed-length clip and stops automatically when `maxSeconds` is
 * reached. The user can also stop early (after the minimum length).
 */
export function useBirdRecorder(maxSeconds: number) {
  const recorder = useAudioRecorder(BIRD_RECORDING_OPTIONS);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecordingResult | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(LEVEL_HISTORY).fill(0));
  const stoppingRef = useRef(false);

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
      setElapsed(durationSeconds);
      setPhase('finished');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    } finally {
      stoppingRef.current = false;
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    }
  }, [recorder]);

  // Poll the recorder while recording: elapsed time, level meter, auto-stop.
  useEffect(() => {
    if (phase !== 'recording') return;
    const id = setInterval(() => {
      const status = recorder.getStatus();
      const seconds = status.durationMillis / 1000;
      setElapsed(seconds);
      setLevels((prev) => [...prev.slice(1), normalizeLevel(status.metering)]);
      if (seconds >= maxSeconds) void stop();
    }, TICK_MS);
    return () => clearInterval(id);
  }, [phase, recorder, maxSeconds, stop]);

  const start = useCallback(async () => {
    setError(null);
    setResult(null);
    setElapsed(0);
    setLevels(Array(LEVEL_HISTORY).fill(0));
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
    setElapsed(0);
    setPhase('idle');
  }, []);

  return {
    phase,
    error,
    result,
    elapsedSeconds: elapsed,
    /** Recent input levels, 0..1, oldest first. */
    levels,
    canStop: phase === 'recording' && elapsed >= RECORDING_MIN_SECONDS,
    start,
    stop,
    reset,
  };
}
