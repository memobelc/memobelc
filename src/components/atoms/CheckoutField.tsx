import { type ReactNode } from 'react';
import { View, Text, TextInput, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/styles/colors';

type CheckoutFieldProps = TextInputProps & {
  label?: string;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  right?: ReactNode;
};

export function CheckoutField({
  label,
  icon,
  error,
  right,
  ...props
}: CheckoutFieldProps) {
  return (
    <View className="w-full mb-3">
      {label ? (
        <Text className="text-sm font-bold mb-1.5" style={{ color: colors.gray[800] }}>
          {label}
        </Text>
      ) : null}
      <View
        className="flex-row items-center rounded-xl px-3"
        style={{
          borderWidth: 1,
          borderColor: error ? colors.error[500] : colors.gray[300],
          backgroundColor: '#fff',
          minHeight: 48,
        }}
      >
        <Ionicons name={icon} size={20} color={colors.gray[500]} />
        <TextInput
          className="flex-1 h-12 ml-2"
          placeholderTextColor={colors.placeholder}
          {...props}
        />
        {right}
      </View>
      {error ? (
        <Text className="text-xs mt-1" style={{ color: colors.error[500] }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
