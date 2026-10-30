import { useEffect, useState } from 'react';

import { JOB_POLL_INTERVAL_MS } from '@/config/constants';

import { getAnalysis } from '../api';
import type { AnalysisJob } from '../types';

/** Polls an analysis job until it is done or failed. */
export function useAnalysisJob(id: string | undefined) {
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const next = await getAnalysis(id);
        if (cancelled) return;
        setJob(next);
        setError(null);
        if (next.status === 'queued' || next.status === 'processing') {
          timer = setTimeout(tick, JOB_POLL_INTERVAL_MS);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        timer = setTimeout(tick, JOB_POLL_INTERVAL_MS * 3);
      }
    };
    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  const pending = !job || job.status === 'queued' || job.status === 'processing';
  return { job, error, pending };
}
