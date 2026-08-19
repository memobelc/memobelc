import { View, Text, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '@/styles/colors';
import AudioPlayer from '@/components/atoms/AudioPlayer';

export type CardType = 'text' | 'multiple_choice' | 'image';

interface CardDisplayingProps {
  front: string;
  back: string;
  audio?: string | null;
  cardType?: CardType | string;
  options?: string[];
  image?: string | null;
  editMode?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const CardDisplaying = ({
  front,
  back,
  audio,
  cardType = 'text',
  options,
  image,
  editMode = false,
  onEdit,
  onDelete,
}: CardDisplayingProps) => {
  const isMultipleChoice = cardType === 'multiple_choice';
  const isImage = cardType === 'image' || !!image;

  return (
    <View className="w-full min-h-[140px] flex-col justify-center bg-white rounded-[12px] overflow-hidden relative shadow-lg my-3 p-5">
      {editMode && (
        <View className="absolute top-2 right-2 flex-row gap-2 z-10">
          {onEdit && (
            <TouchableOpacity
              onPress={onEdit}
              style={{ backgroundColor: colors.primary[500] }}
              className="w-8 h-8 rounded-full flex items-center justify-center"
            >
              <MaterialIcons name="edit" size={16} color="white" />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              onPress={onDelete}
              style={{ backgroundColor: colors.error[500] }}
              className="w-8 h-8 rounded-full flex items-center justify-center"
            >
              <MaterialIcons name="delete" size={16} color="white" />
            </TouchableOpacity>
          )}
        </View>
      )}
      {isImage && image ? (
        <View className="flex-row items-center mb-3">
          <Image
            source={{ uri: image }}
            className="w-16 h-16 rounded-lg mr-4"
            resizeMode="cover"
          />
          <View className="flex-1">
            {!!front && (
              <Text
                style={{ color: colors.warning[600] }}
                className="font-[ComicSans] text-2xs pb-1"
              >
                {front}
              </Text>
            )}
            <Text
              style={{ color: colors.info[600] }}
              className="font-[ComicSans] text-2xs"
            >
              {back}
            </Text>
          </View>
        </View>
      ) : isMultipleChoice ? (
        <View>
          <Text
            style={{ color: colors.warning[600] }}
            className="font-[ComicSans] text-base pb-3 pr-16"
          >
            {front}
          </Text>
          {(options || []).map((option, index) => (
            <Text
              key={`${option}-${index}`}
              style={{ color: colors.info[600] }}
              className="font-[ComicSans] text-2xs pb-1"
            >
              {index + 1}. {option}
            </Text>
          ))}
        </View>
      ) : (
        <>
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
        </>
      )}
      {audio && (
        <View className="absolute right-5 bottom-5">
          <AudioPlayer audioUri={audio} autoPlay={false} />
        </View>
      )}
    </View>
  );
};
