import { View, Image, Text, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@/styles/colors';
import { Link } from 'expo-router';
import { imageSources } from '@/utils/imgSource';
import { useTranslation } from 'react-i18next';

interface MainDeckCardProps {
  name: string;
  image?: string | null;
  type: 'collection' | 'class';
  pending_cards?: number;
  total_cards?: number;
  students?: number;
  onPress?: () => void;
}

const { width } = Dimensions.get('window');

export const MainDeckCard = ({
  name,
  image,
  type,
  pending_cards,
  total_cards,
  students,
  onPress,
}: MainDeckCardProps) => {
  let imgSource;
  const { t } = useTranslation();

  if (image && image.startsWith('ct_')) {
    const id = Number(image.split('_')[1]);
    imgSource =
      imageSources.find((img) => img.id === id)?.uri || imageSources[0].uri;
  } else if (image) {
    imgSource = { uri: image };
  } else {
    imgSource = imageSources[0].uri;
  }

  return (
    <Link
      className="flex items-center justify-center md:justify-end p-3"
      style={{
        padding: 12,
      }}
      href={{
        pathname: type == 'class' ? './classrooms/class' : './collection',
        params: { name },
      }}
      asChild
    >
      <TouchableOpacity
        onPress={onPress}
        className="w-full flex flex-row items-center justify-end"
      >
        <View className="bg-white m-3 w-64 h-64 lg:w-80 lg:h-80  rounded-[12px] overflow-hidden shadow-lg">
          <Image
            style={{ width: '100%', height: '65%' }}
            source={imgSource}
            className="w-full h-[65%]  top-0"
          />

          <View className="flex-1 justify-end p-3">
            <Text className="font-[ComicSans] text-base font-bold mb-3">
              {name}
            </Text>
            <View className="flex flex-row justify-between items-center">
              {pending_cards && total_cards && (
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
              )}

              {/* <MaterialIcons name="language" size={24} color="#000" /> */}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  );
};
