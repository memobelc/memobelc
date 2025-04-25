import { View, Image, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/styles/colors';
import { Link } from 'expo-router';
import { imageSources, setImageUrl, setImageUrlDeck } from '@/utils/imgSource';

interface CardSecondaryProps {
  image?: string | null;
  type: 'collection' | 'deck';
  classroom?: string;
  name: string;
  pending_cards: number;
  total_cards: number;
  onPress?: () => void;
}

export const DeckCardSecondary = ({
  image,
  name,
  type,
  classroom,
  pending_cards,
  total_cards,
  onPress,
}: CardSecondaryProps) => {
  return (
    <Link
      href={{
        pathname: type === 'deck' ? '/(app)/deck' : '/collection',
        params: { name, classroom },
      }}
      asChild
    >
      <TouchableOpacity
        onPress={onPress}
        className="w-full flex flex-row items-center justify-center p-2"
      >
        <View className="w-full h-[100px] bg-white rounded-[12px] overflow-hidden relative shadow-lg m-3">
          <Image
            style={{ width: '30%', height: '100%' }}
            source={
              type == 'collection'
                ? setImageUrl({ image })
                : setImageUrlDeck({ image })
            }
            className="w-[30%] h-full absolute top-0"
          />

          <View className="w-[70%] h-full justify-center items-center left-[30%]">
            <Text className="font-[ComicSans] text-sm font-bold pb-3 text-start w-full px-6">
              {name}
            </Text>
            <View className="w-full px-4 flex flex-row justify-between items-center">
              <View className="flex bg-red-100 px-2 py-1 rounded-md items-center justify-between flex-row">
                <MaterialCommunityIcons
                  className="pr-2"
                  name="cards"
                  size={20}
                  color={colors.error[600]}
                />
                <Text className="font-[ComicSans] text-xs color-red-700">
                  {total_cards != 0
                    ? `${pending_cards} out of ${total_cards} to study`
                    : 'No cards added yet'}
                </Text>
              </View>

              {type === 'collection' && (
                <MaterialIcons name="language" size={20} color="#000" />
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  );
};
