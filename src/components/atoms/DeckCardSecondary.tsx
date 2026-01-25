import { View, Image, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

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
  onEdit?: () => void;
  onDelete?: () => void;
}

export const DeckCardSecondary = ({
  image,
  name,
  type,
  classroom,
  pending_cards,
  total_cards,
  onPress,
  onEdit,
  onDelete,
}: CardSecondaryProps) => {
  const router = useRouter();
  const hasActions = type === 'collection' && (onEdit || onDelete);

  const handleCardPress = () => {
    // Chama o onPress se fornecido (para setar currentCollection/currentDeck)
    if (onPress) {
      onPress();
    }
    
    // Navega para a página
    router.push({
      pathname: type === 'deck' ? '/(app)/deck' : '/(app)/collection',
      params: { name, classroom },
    });
  };

  const cardContent = (
    <TouchableOpacity
      onPress={handleCardPress}
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
          <View className="flex flex-row justify-between items-center w-full px-6 pb-2">
            <View className="flex-1">
              <Text className="font-[ComicSans] text-sm font-bold text-start">
                {name}
              </Text>
            </View>
            {type === 'collection' && classroom && (
              <View className="mt-1 self-start bg-blue-100 px-2 py-0.5 rounded-full">
                <Text className="text-[10px] font-semibold text-blue-700">
                  Classroom
                </Text>
              </View>
            )}
            {hasActions && (
              <View className="flex flex-row gap-2 ml-2">
                {onEdit && (
                  <TouchableOpacity
                    onPress={() => {
                      onEdit();
                    }}
                    className="p-1"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onStartShouldSetResponder={() => true}
                    onResponderTerminationRequest={() => false}
                  >
                    <MaterialIcons
                      name="edit"
                      size={20}
                      color={colors.primary[500]}
                    />
                  </TouchableOpacity>
                )}
                {onDelete && (
                  <TouchableOpacity
                    onPress={() => {
                      onDelete();
                    }}
                    className="p-1"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onStartShouldSetResponder={() => true}
                    onResponderTerminationRequest={() => false}
                  >
                    <MaterialIcons
                      name="delete"
                      size={20}
                      color={colors.error[500]}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
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
  );

  if (hasActions) {
    return cardContent;
  }

  return (
    <Link
      href={{
        pathname: type === 'deck' ? '/(app)/deck' : '/collection',
        params: { name, classroom },
      }}
      asChild
    >
      {cardContent}
    </Link>
  );
};
