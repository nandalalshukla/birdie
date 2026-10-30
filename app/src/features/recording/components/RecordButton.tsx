import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/theme';

type Props = {
  recording: boolean;
  progress: number; // 0..1
  disabled?: boolean;
  onPress: () => void;
};

const SIZE = 168;

/** Big circular button with a progress ring made of dots (no SVG dependency). */
export function RecordButton({ recording, progress, disabled, onPress }: Props) {
  const colors = useThemeColors();
  const dots = 48;
  const filled = Math.round(progress * dots);

  return (
    <View style={styles.wrap}>
      {Array.from({ length: dots }, (_, i) => {
        const angle = (i / dots) * 2 * Math.PI - Math.PI / 2;
        const r = SIZE / 2 + 14;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i < filled ? colors.primary : colors.border,
                transform: [{ translateX: Math.cos(angle) * r }, { translateY: Math.sin(angle) * r }],
              },
            ]}
          />
        );
      })}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={recording ? 'Stop recording' : 'Start recording'}
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: recording ? colors.danger : colors.primary,
            opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          },
        ]}
      >
        <Ionicons name={recording ? 'stop' : 'mic'} size={64} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE + 48, height: SIZE + 48, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', width: 6, height: 6, borderRadius: 3 },
  button: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, alignItems: 'center', justifyContent: 'center' },
});
