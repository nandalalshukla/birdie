import { Stack, useLocalSearchParams } from 'expo-router';

import { Card, Screen, Text } from '@/components/ui';
import { JobProgress, useAnalysisJob } from '@/features/analysis';
import { useThemeColors } from '@/theme';

export default function AnalysisScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { job, error, pending } = useAnalysisJob(id);
  const colors = useThemeColors();

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
        </Card>
      ) : (
        <Card>
          <Text variant="heading">Done</Text>
          <Text muted>{job?.result?.species.length ?? 0} species found.</Text>
        </Card>
      )}
    </Screen>
  );
}
