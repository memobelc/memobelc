import { View, Image, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/styles/colors';
import { Link } from 'expo-router';

interface MainDeckCardProps {
  name: string;
  image?: string;
  pending_cards: number;
  total_cards: number;
  onPress?: () => void;
}

export const MainDeckCard = ({
  name,
  image,
  pending_cards,
  total_cards,
  onPress,
}: MainDeckCardProps) => {
  return (
    <Link
      href={{
        pathname: './collection',
        params: { name },
      }}
      asChild
    >
      <TouchableOpacity
        onPress={onPress}
        className="w-full flex flex-row items-center justify-end"
      >
        <View className="w-[300px] h-[300px] bg-white rounded-[12px] overflow-hidden shadow-lg">
          <Image source={{ uri: image }} className="w-full h-[65%]  top-0" />

          <View className="flex-1 justify-end p-3">
            <Text className="font-[ComicSans] text-xl font-bold pb-3">
              {name}
            </Text>
            <View className="flex flex-row justify-between items-center">
              <View className="flex bg-red-100 px-2 py-1 rounded-md items-center justify-center flex-row">
                <MaterialCommunityIcons
                  className="pr-2"
                  name="cards"
                  size={24}
                  color={colors.error[600]}
                />
                <Text className="font-[ComicSans] text-xs  color-red-700">
                  {total_cards != 0
                    ? `${pending_cards} out of ${total_cards} to study`
                    : 'No cards added yet'}
                </Text>
              </View>
              <MaterialIcons name="language" size={24} color="#000" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  );
};
