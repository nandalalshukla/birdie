import { Stack, router, useLocalSearchParams } from 'expo-router';

import { Button, Card, Screen, Text } from '@/components/ui';
import { AnalysisResultView, JobProgress, useAnalysisJob } from '@/features/analysis';
import { useCurrentLocation } from '@/features/location/useCurrentLocation';
import { SaveSightingButton } from '@/features/sightings';
import { useThemeColors } from '@/theme';

export default function AnalysisScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { job, error, pending } = useAnalysisJob(id);
  const colors = useThemeColors();
  const hasLocation = job?.lat != null && job?.lon != null;
  // Only ask for location here if the recording itself had none.
  const fallback = useCurrentLocation(job != null && !pending && !hasLocation);

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: 'Identification' }} />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {pending ? (
        <JobProgress status={job?.status} />
      ) : job?.status === 'failed' ? (
        <Card>
          <Text variant="heading">Analysis failed</Text>
          <Text muted>{job.error}</Text>
          <Button title="Record again" variant="secondary" onPress={() => router.back()} />
        </Card>
      ) : job ? (
        <AnalysisResultView
          job={job}
          renderSpeciesFooter={(i) => {
            const s = job.result!.species[i];
            return (
              <SaveSightingButton
                jobId={job.id}
                scientificName={s.scientific_name}
                commonName={s.common_name}
                hasLocation={hasLocation}
                fallbackLocation={fallback.coords}
                primary={i === 0}
              />
            );
          }}
        />
      ) : null}
    </Screen>
  );
}
