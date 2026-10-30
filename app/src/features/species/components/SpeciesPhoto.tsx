import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { radius, useThemeColors } from '@/theme';

export function SpeciesPhoto({ uri, size = 88 }: { uri: string | null | undefined; size?: number }) {
  const colors = useThemeColors();
  const box = { width: size, height: size, borderRadius: radius.md, backgroundColor: colors.primaryMuted };
  if (!uri) {
    return (
      <View style={[styles.placeholder, box]}>
        <Ionicons name="musical-notes" size={size / 2.5} color={colors.primary} />
      </View>
    );
  }
  return <Image source={{ uri }} style={box} contentFit="cover" transition={200} />;
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
