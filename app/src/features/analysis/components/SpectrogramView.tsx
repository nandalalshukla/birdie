import { Image } from 'expo-image';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Card, Text } from '@/components/ui';
import { radius } from '@/theme';

import { analysisSpectrogramUrl } from '../api';

const HEIGHT = 200;

/** Horizontally scrollable mel spectrogram rendered by the server. */
export function SpectrogramView({ jobId }: { jobId: string }) {
  const [aspect, setAspect] = useState(4);
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <Card>
      <Text variant="heading">Spectrogram</Text>
      <Text variant="caption" muted>
        Time runs left to right, pitch bottom to top, brightness is loudness. BirdNET looks at pictures like this, one
        3-second window (dashed lines) at a time. Bird songs show up as bright strokes, usually above 1 kHz.
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <Image
          source={{ uri: analysisSpectrogramUrl(jobId) }}
          style={[styles.image, { width: HEIGHT * aspect }]}
          contentFit="contain"
          onLoad={(e) => e.source.width && setAspect(e.source.width / e.source.height)}
          onError={() => setFailed(true)}
          accessibilityLabel="Spectrogram of your recording"
        />
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  image: { height: HEIGHT, borderRadius: radius.sm },
});
