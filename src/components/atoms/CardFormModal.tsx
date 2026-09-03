import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
} from 'react-native';
import {
  MaterialCommunityIcons,
  FontAwesome,
} from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { Input } from '@/components/Input';
import FlipCard from '@/components/atoms/FlipCard';
import { MultipleChoiceCard } from '@/components/atoms/MultipleChoiceCard';
import { Loading } from '@/components/Loading';
import { useToast } from '@/components/Toast';
import {
  PublishStatus,
  PublishStatusFields,
  toDatetimeLocalValue,
} from '@/components/atoms/PublishStatusFields';

export type CardType = 'text' | 'multiple_choice' | 'image';

export interface ICardProps {
  _id: string;
  back: string;
  created_at?: string;
  front: string;
  audio?: string;
  media_type?: string;
  updated_at?: string;
  card_type?: CardType | string;
  options?: string[];
  correct_index?: number | null;
  image?: string | null;
  status?: 'draft' | 'published' | 'scheduled' | string;
  scheduled_at?: string | null;
}

export type CardFormPayload = {
  card_type: CardType;
  front: string;
  back: string;
  audioUri: string | null;
  imageUri: string | null;
  options: string[];
  correct_index: number;
  status: 'draft' | 'published' | 'scheduled';
  scheduledAt: string;
};

interface CardFormModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  loading: boolean;
  card?: ICardProps | null;
  onClose: () => void;
  onSubmit: (payload: CardFormPayload) => void;
  showStatus?: boolean;
}

const EMPTY_OPTIONS = ['', '', '', ''];

export const CardFormModal = ({
  visible,
  mode,
  loading,
  card,
  onClose,
  onSubmit,
  showStatus = false,
}: CardFormModalProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [cardType, setCardType] = useState<CardType>('text');
  const [frontSide, setFrontSide] = useState('');
  const [backSide, setBackSide] = useState('');
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>([...EMPTY_OPTIONS]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [viewCard, setViewCard] = useState(false);
  const [status, setStatus] = useState<PublishStatus>('published');
  const [scheduledAt, setScheduledAt] = useState('');

  useEffect(() => {
    if (!visible) {
      return;
    }
    setViewCard(false);
    if (mode === 'edit' && card) {
      const type = (card.card_type as CardType) || (card.image ? 'image' : 'text');
      setCardType(type);
      setFrontSide(card.front || '');
      setBackSide(card.back || '');
      setSelectedAudio(card.audio || null);
      setSelectedImage(card.image || null);
      const loadedOptions = [...EMPTY_OPTIONS];
      (card.options || []).slice(0, 4).forEach((option, index) => {
        loadedOptions[index] = option;
      });
      setOptions(loadedOptions);
      setCorrectIndex(typeof card.correct_index === 'number' ? card.correct_index : 0);
      setStatus((card.status as PublishStatus) || 'published');
      setScheduledAt(toDatetimeLocalValue(card.scheduled_at));
    } else {
      setCardType('text');
      setFrontSide('');
      setBackSide('');
      setSelectedAudio(null);
      setSelectedImage(null);
      setOptions([...EMPTY_OPTIONS]);
      setCorrectIndex(0);
      setStatus('published');
      setScheduledAt('');
    }
  }, [visible, mode, card]);

  const pickAndUploadAudio = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
    });

    if (result.assets) {
      setSelectedAudio(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert(t('Permission denied, You need to allow access to the gallery.'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    if (loading) {
      return;
    }

    if (cardType === 'text' && (!frontSide.trim() || !backSide.trim())) {
      toast({ message: t('Fill all fields'), variant: 'destructive' });
      return;
    }

    if (cardType === 'multiple_choice') {
      if (!frontSide.trim() || options.some((option) => !option.trim())) {
        toast({ message: t('Fill all fields'), variant: 'destructive' });
        return;
      }
    }

    if (cardType === 'image' && (!selectedImage || !backSide.trim())) {
      toast({ message: t('Fill all fields'), variant: 'destructive' });
      return;
    }

    onSubmit({
      card_type: cardType,
      front: frontSide,
      back: cardType === 'multiple_choice' ? options[correctIndex] : backSide,
      audioUri: selectedAudio,
      imageUri: cardType === 'image' ? selectedImage : null,
      options,
      correct_index: correctIndex,
      status,
      scheduledAt,
    });
  };

  const typeOptions: { value: CardType; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
    { value: 'text', label: t('Text question'), icon: 'format-text' },
    { value: 'multiple_choice', label: t('4 answers'), icon: 'format-list-bulleted' },
    { value: 'image', label: t('Image card'), icon: 'image-outline' },
  ];

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end items-center bg-black/75">
        <TouchableOpacity
          className="bg-white rounded-t-lg flex w-full h-full absolute items-center bottom-0 p-4"
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View className="flex flex-row justify-between items-center mb-2 w-full">
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color="black"
              />
            </TouchableOpacity>
            <View className="flex-row w-[60%] items-center justify-between">
              <Text className="font-semibold text-xl text-primary justify-center">
                {mode === 'create' ? t('New card') : t('Edit card')}
              </Text>
              <TouchableOpacity onPress={() => setViewCard(!viewCard)}>
                <MaterialCommunityIcons
                  name={!viewCard ? 'eye' : 'eye-off'}
                  size={24}
                  color="black"
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSubmit}
                style={{
                  backgroundColor: loading ? colors.gray[400] : colors.primary[500],
                }}
                className="rounded-2xl p-2.5"
                disabled={loading}
              >
                {loading ? (
                  <Loading />
                ) : (
                  <MaterialCommunityIcons
                    name="check"
                    size={24}
                    color="white"
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View className="border-b border-gray-300 mb-4 w-full" />
          {!viewCard ? (
            <ScrollView
              className="w-full"
              showsVerticalScrollIndicator={false}
            >
              <View className="flex-row gap-2 mb-4">
                {typeOptions.map((type) => {
                  const selected = cardType === type.value;
                  return (
                    <TouchableOpacity
                      key={type.value}
                      onPress={() => setCardType(type.value)}
                      className="flex-1 items-center rounded-xl py-3 px-1"
                      style={{
                        backgroundColor: selected ? colors.primary[50] : colors.gray[100],
                        borderWidth: 1.5,
                        borderColor: selected ? colors.primary[500] : colors.gray[200],
                      }}
                    >
                      <MaterialCommunityIcons
                        name={type.icon}
                        size={20}
                        color={selected ? colors.primary[500] : colors.gray[600]}
                      />
                      <Text
                        className="text-center text-xs mt-1 font-semibold"
                        style={{ color: selected ? colors.primary[500] : colors.gray[600] }}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {cardType === 'text' && (
                <>
                  <Input
                    label={t('Front Side')}
                    className="py-6 w-full"
                    inputClasses="h-40"
                    value={frontSide}
                    onChangeText={setFrontSide}
                    multiline
                  />
                  <Input
                    label={t('Back Side')}
                    className="py-6 w-full"
                    inputClasses="h-40"
                    value={backSide}
                    onChangeText={setBackSide}
                    multiline
                  />
                </>
              )}

              {cardType === 'multiple_choice' && (
                <>
                  <Input
                    label={t('Question')}
                    className="py-4 w-full"
                    inputClasses="h-24"
                    value={frontSide}
                    onChangeText={setFrontSide}
                    multiline
                  />
                  <Text className="text-base mb-2">{t('Select the correct answer')}</Text>
                  {options.map((option, index) => (
                    <View key={index} className="flex-row items-center mb-2">
                      <TouchableOpacity
                        onPress={() => setCorrectIndex(index)}
                        className="mr-2"
                      >
                        <MaterialCommunityIcons
                          name={correctIndex === index ? 'radiobox-marked' : 'radiobox-blank'}
                          size={24}
                          color={correctIndex === index ? colors.primary[500] : colors.gray[400]}
                        />
                      </TouchableOpacity>
                      <View className="flex-1">
                        <Input
                          label={t('Option {{number}}', { number: index + 1 })}
                          className="w-full"
                          value={option}
                          onChangeText={(text) => {
                            const next = [...options];
                            next[index] = text;
                            setOptions(next);
                          }}
                        />
                      </View>
                    </View>
                  ))}
                </>
              )}

              {cardType === 'image' && (
                <>
                  <TouchableOpacity
                    onPress={pickImage}
                    className="border border-dashed border-gray-400 rounded-lg p-6 flex items-center justify-center mb-4"
                  >
                    {selectedImage ? (
                      <Image
                        source={{ uri: selectedImage }}
                        className="w-full h-40 rounded-lg"
                        resizeMode="contain"
                      />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="image-outline" size={32} color="black" />
                        <Text className="text-gray-500 mt-2">
                          {t('Tap to add image')}
                        </Text>
                      </>
                    )}
                    {selectedImage ? (
                      <Text className="text-gray-500 mt-2">{t('Change image')}</Text>
                    ) : null}
                  </TouchableOpacity>
                  <Input
                    label={t('Caption (optional)')}
                    className="py-4 w-full"
                    value={frontSide}
                    onChangeText={setFrontSide}
                  />
                  <Input
                    label={t('Back Side')}
                    className="py-4 w-full"
                    inputClasses="h-28"
                    value={backSide}
                    onChangeText={setBackSide}
                    multiline
                  />
                </>
              )}

              {showStatus && (
                <PublishStatusFields
                  status={status}
                  scheduledAt={scheduledAt}
                  onStatusChange={setStatus}
                  onScheduledAtChange={setScheduledAt}
                />
              )}

              <TouchableOpacity
                onPress={pickAndUploadAudio}
                className="border border-dashed border-gray-400 rounded-lg p-10 flex items-center justify-center mt-2 mb-8"
              >
                <FontAwesome name="file-audio-o" size={24} color="black" />
                <Text className="text-gray-500 mt-2">
                  {selectedAudio ? t('Change audio') : t('Tap to attach audio')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          ) : cardType === 'multiple_choice' ? (
            <MultipleChoiceCard
              question={frontSide}
              options={options}
              correctIndex={correctIndex}
              showResult
              disabled
            />
          ) : (
            <FlipCard
              frontSide={frontSide}
              backSide={backSide}
              audio={selectedAudio}
              image={cardType === 'image' ? selectedImage : undefined}
            />
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
};
