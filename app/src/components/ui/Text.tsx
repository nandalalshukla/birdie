import { Text as RNText, type TextProps } from 'react-native';

import { typography, useThemeColors } from '@/theme';

type Variant = keyof typeof typography;

type Props = TextProps & {
  variant?: Variant;
  muted?: boolean;
};

export function Text({ variant = 'body', muted = false, style, ...rest }: Props) {
  const colors = useThemeColors();
  return (
    <RNText
      style={[typography[variant], { color: muted ? colors.textMuted : colors.text }, style]}
      {...rest}
    />
  );
}
