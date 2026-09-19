import { Image, type ImageStyle, type StyleProp } from 'react-native';

import {
  BRAIN_BUILTIN_ASSETS,
  BRAIN_EXPRESSION_ALIASES,
} from '@/constants/brain';
import type { BrainAvatar, BrainExpression } from '@/services/tutorials';

type BrainAvatarProps = {
  expression?: BrainExpression | string;
  size?: number;
  uri?: string | null;
  catalog?: BrainAvatar[] | null;
  style?: StyleProp<ImageStyle>;
};

export function resolveBrainSource(
  expression?: string,
  uri?: string | null,
  catalog?: BrainAvatar[] | null,
) {
  if (uri) return { uri };
  const fromCatalog = catalog?.find((item) => item.key === expression && item.is_active !== false);
  if (fromCatalog?.image) return { uri: fromCatalog.image };
  if (fromCatalog?.builtin_asset) {
    const mapped =
      BRAIN_BUILTIN_ASSETS[fromCatalog.key] ||
      BRAIN_BUILTIN_ASSETS[BRAIN_EXPRESSION_ALIASES[fromCatalog.key as BrainExpression]];
    if (mapped) return mapped;
  }
  const key = (expression || 'happy') as BrainExpression;
  const alias = BRAIN_EXPRESSION_ALIASES[key] || 'happy';
  return BRAIN_BUILTIN_ASSETS[alias] || BRAIN_BUILTIN_ASSETS.happy;
}

export default function BrainAvatarView({
  expression = 'happy',
  size = 72,
  uri,
  catalog,
  style,
}: BrainAvatarProps) {
  return (
    <Image
      source={resolveBrainSource(expression, uri, catalog)}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}
