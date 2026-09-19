import { View, Text } from 'react-native';

import BrainAvatarView from '@/components/atoms/BrainAvatar';
import type { BrainExpression } from '@/services/tutorials';

type BrainEmptyStateProps = {
  title: string;
  message?: string;
  expression?: BrainExpression | string;
};

export default function BrainEmptyState({
  title,
  message,
  expression = 'sad',
}: BrainEmptyStateProps) {
  return (
    <View className="items-center justify-center py-10 px-4">
      <BrainAvatarView expression={expression} size={180} />
      <Text className="font-[ComicSans] text-lg md:text-2xl text-gray-500 text-center font-semibold mt-3">
        {title}
      </Text>
      {message ? (
        <Text className="text-sm text-gray-400 text-center mt-2">{message}</Text>
      ) : null}
    </View>
  );
}
