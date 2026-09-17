import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '@/styles/colors';

type StarRatingProps = {
  value: number | null;
  onChange?: (stars: number) => void;
  size?: number;
  readonly?: boolean;
  color?: string;
  emptyColor?: string;
};

export function StarRating({
  value,
  onChange,
  size = 28,
  readonly = false,
  color = colors.warning[500],
  emptyColor = colors.gray[300],
}: StarRatingProps) {
  const filled = value ?? 0;
  const interactive = !readonly && !!onChange;

  return (
    <View className="flex-row items-center">
      {[1, 2, 3, 4, 5].map((stars) => (
        <TouchableOpacity
          key={stars}
          disabled={!interactive}
          onPress={() => onChange?.(stars)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          accessibilityRole={interactive ? 'button' : 'text'}
          accessibilityLabel={`${stars}`}
        >
          <MaterialIcons
            name={stars <= filled ? 'star' : 'star-border'}
            size={size}
            color={stars <= filled ? color : emptyColor}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}
