import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '@/styles/colors';

type StarRatingProps = {
  value: number | null;
  onChange?: (stars: number) => void;
  size?: number;
  readonly?: boolean;
  allowZero?: boolean;
  color?: string;
  emptyColor?: string;
};

export function StarRating({
  value,
  onChange,
  size = 28,
  readonly = false,
  allowZero = false,
  color = colors.warning[500],
  emptyColor = colors.gray[300],
}: StarRatingProps) {
  const filled = value ?? 0;
  const interactive = !readonly && !!onChange;
  const options = allowZero ? [0, 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5];

  return (
    <View className="flex-row items-center">
      {options.map((stars) => (
        <TouchableOpacity
          key={stars}
          disabled={!interactive}
          onPress={() => onChange?.(stars)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          accessibilityRole={interactive ? 'button' : 'text'}
          accessibilityLabel={`${stars}`}
          className={stars === 0 ? 'mr-1 items-center justify-center' : undefined}
        >
          {stars === 0 ? (
            <View
              className="items-center justify-center rounded-full"
              style={{
                width: size,
                height: size,
                borderWidth: 1.5,
                borderColor: value === 0 ? color : emptyColor,
                backgroundColor: value === 0 ? color : 'transparent',
              }}
            >
              <Text
                style={{
                  fontSize: Math.max(10, size * 0.42),
                  fontWeight: 'bold',
                  color: value === 0 ? colors.white : emptyColor,
                }}
              >
                0
              </Text>
            </View>
          ) : (
            <MaterialIcons
              name={value !== null && stars <= filled ? 'star' : 'star-border'}
              size={size}
              color={value !== null && stars <= filled ? color : emptyColor}
            />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}
