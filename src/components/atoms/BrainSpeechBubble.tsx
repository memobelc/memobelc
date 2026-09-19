import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { colors } from '@/styles/colors';
import BrainAvatarView from '@/components/atoms/BrainAvatar';
import type { BrainExpression } from '@/services/tutorials';

type BrainSpeechBubbleProps = {
  title: string;
  body: string;
  tip?: string | null;
  expression?: BrainExpression | string;
  icon?: string;
};

export default function BrainSpeechBubble({
  title,
  body,
  tip,
  expression = 'explaining',
  icon,
}: BrainSpeechBubbleProps) {
  return (
    <View className="flex-row items-end">
      <BrainAvatarView expression={expression} size={84} />
      <View
        className="flex-1 ml-2 bg-white rounded-2xl rounded-bl-sm p-4"
        style={{
          shadowColor: colors.shadow,
          shadowOpacity: 0.12,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        }}
      >
        <View className="flex-row items-center mb-1">
          {icon ? (
            <MaterialIcons
              name={icon as any}
              size={18}
              color={colors.primary[500]}
              style={{ marginRight: 6 }}
            />
          ) : null}
          <Text className="font-bold text-base flex-1" style={{ color: colors.primary[600] }}>
            {title}
          </Text>
        </View>
        <Text className="text-sm text-gray-600 leading-5">{body}</Text>
        {tip ? (
          <Text className="text-xs mt-2" style={{ color: colors.primary[500] }}>
            {tip}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
