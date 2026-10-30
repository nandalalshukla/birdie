/** Recording length bounds, in seconds. BirdNET works on 3 s windows. */
export const RECORDING_MIN_SECONDS = 3;
export const RECORDING_DEFAULT_SECONDS = 12;
export const RECORDING_MAX_SECONDS = 15;

/** Species below this aggregated confidence are hidden from results. */
export const DEFAULT_MIN_CONFIDENCE = 0.5;

/** How often to poll an analysis job while it is queued/running. */
export const JOB_POLL_INTERVAL_MS = 1200;
