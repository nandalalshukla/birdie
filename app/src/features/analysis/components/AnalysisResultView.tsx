import { StyleSheet, View } from 'react-native';

import { PlayButton } from '@/components/media/PlayButton';
import { Card, EmptyState, Text } from '@/components/ui';
import { SpeciesCard } from '@/features/species';
import { formatSeconds } from '@/lib/format';
import { spacing } from '@/theme';

import { analysisAudioUrl } from '../api';
import type { AnalysisJob } from '../types';
import { WindowTimeline } from './WindowTimeline';

type Props = {
  job: AnalysisJob;
  /** Rendered under each species card (e.g. a "Save sighting" button). */
  renderSpeciesFooter?: (index: number) => React.ReactNode;
  children?: React.ReactNode;
};

function describeWindows(windows: number, first: number, last: number, size: number) {
  if (windows === 1) return `Heard at ${formatSeconds(first)}`;
  return `Heard in ${windows} windows (${formatSeconds(first)}–${formatSeconds(last + size)})`;
}

export function AnalysisResultView({ job, renderSpeciesFooter, children }: Props) {
  const result = job.result;
  if (!result) return null;
  const [top, ...others] = result.species;

  return (
    <View style={styles.wrap}>
      {top ? (
        <>
          <Text variant="caption" muted>
            BEST MATCH
          </Text>
          <SpeciesCard
            expanded
            scientificName={top.scientific_name}
            commonName={top.common_name}
            confidence={top.confidence}
            subtitle={describeWindows(top.windows, top.first_seen, top.last_seen, result.window_seconds)}
            footer={renderSpeciesFooter?.(0)}
          />
        </>
      ) : (
        <Card>
          <EmptyState
            icon="help-circle-outline"
            title="No bird recognised"
            message={
              result.noise.length
                ? `BirdNET mostly heard: ${result.noise.join(', ')}. Try again somewhere quieter, closer to the bird.`
                : 'Nothing scored above the confidence threshold. Try again closer to the bird, with less background noise.'
            }
          />
        </Card>
      )}

      {children}

      {others.length ? (
        <>
          <Text variant="caption" muted>
            ALSO HEARD
          </Text>
          {others.map((s, i) => (
            <SpeciesCard
              key={s.scientific_name}
              scientificName={s.scientific_name}
              commonName={s.common_name}
              confidence={s.confidence}
              subtitle={describeWindows(s.windows, s.first_seen, s.last_seen, result.window_seconds)}
              footer={renderSpeciesFooter?.(i + 1)}
            />
          ))}
        </>
      ) : null}

      <Text variant="caption" muted>
        WHAT BIRDNET HEARD, WINDOW BY WINDOW
      </Text>
      <Card>
        <WindowTimeline
          windows={result.windows}
          windowCount={result.window_count}
          windowSeconds={result.window_seconds}
        />
        <PlayButton uri={analysisAudioUrl(job.id)} label="Your recording" />
        <Text variant="caption" muted>
          {result.model} · {job.duration_seconds?.toFixed(1)} s ·{' '}
          {result.location_filtered
            ? `limited to ${result.candidate_species} species expected here this week`
            : 'no location filter'}{' '}
          · threshold {Math.round(result.min_confidence * 100)}%
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
});
