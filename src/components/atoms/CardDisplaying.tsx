import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '@/styles/colors';

interface CardDisplayingProps {
  front: string;
  back: string;
}

export const CardDisplaying = ({ front, back }: CardDisplayingProps) => {
  return (
    <View className="w-full min-h-[140px] flex-col justify-center bg-white rounded-[12px] overflow-hidden relative shadow-lg my-3 p-5">
      <View className="flex flex-row items-center justify-start ">
        <View
          style={{ backgroundColor: colors.warning[100] }}
          className="w-10 h-10  flex items-center justify-center rounded-lg mr-5"
        >
          <Text style={{ color: colors.warning[600] }}>F</Text>
        </View>
        <Text
          style={{ color: colors.warning[600] }}
          className="w-['80%'] min-h-10 font-[ComicSans] flex items-center  text-2xs pb-5"
        >
          {front}
        </Text>
      </View>
      <View className="flex flex-row items-center justify-start ">
        <View
          style={{ backgroundColor: colors.info[100] }}
          className="w-10 h-10  flex items-center justify-center rounded-lg mr-5"
        >
          <Text style={{ color: colors.info[600] }}>B</Text>
        </View>
        <Text
          style={{ color: colors.info[600] }}
          className="w-['80%'] min-h-10 font-[ComicSans] flex items-center  text-2xs pb-5"
        >
          {back}
        </Text>
      </View>
    </View>
  );
};
