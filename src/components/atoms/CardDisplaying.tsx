import { View, Text } from 'react-native';

interface CardDisplayingProps {
  front: string;
  back: string;
}

export const CardDisplaying = ({ front, back }: CardDisplayingProps) => {
  return (
    <View className="w-full h-[140px] flex-col bg-white rounded-[12px] overflow-hidden relative shadow-lg my-3 p-5">
      <Text className="font-[ComicSans] text-gray-500 text-2xs pb-5">
        {front}
      </Text>
      <Text className="font-[ComicSans] text-gray-800 text-xl font-bold">
        {back}
      </Text>
    </View>
  );
};
