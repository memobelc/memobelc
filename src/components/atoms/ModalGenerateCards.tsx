import { Dispatch, SetStateAction, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Modal,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Input } from '@/components/Input';
import {
  Feather,
  MaterialCommunityIcons,
  MaterialIcons,
  Octicons,
} from '@expo/vector-icons';
import { colors } from '@/styles/colors';
import * as DocumentPicker from 'expo-document-picker';
import { PickerSelect } from '@/components/atoms/PickerSelect';
import { languages } from '@/utils/languages';
import api from '@/services/api';
import { Card } from 'react-native-paper';
import FlipCard from './FlipCard';
import { Loading } from '../Loading';

interface IModalProps {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  setGeneratedCards: Dispatch<SetStateAction<ICardProps[]>>;
}

interface ICardProps {
  _id: number;
  front: string;
  back: string;
}

export const ModalGenerateCards = ({
  open,
  setOpen,
  setGeneratedCards,
}: IModalProps) => {
  const { t } = useTranslation();
  const [cards, setCards] = useState<ICardProps[]>([]);

  const [topic, setTopic] = useState('');
  const [numberCards, setNumberCards] = useState('');
  const [format, setFormat] = useState('');
  const [languageFront, setLanguageFront] = useState('');
  const [languageBack, setLanguageBack] = useState('');
  const [showForm, setShowForm] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [viewCArd, setViewCArd] = useState<ICardProps | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);

  const pickAudio = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
    if (result.assets) setSelectedAudio(result.assets[0].uri);
  };

  const deleteCard = (id: number) => {
    setCards((prev) => prev.filter((card) => card._id !== id));
  };

  const editCard = (id: number) => {
    const card = cards.find((c) => c._id === id);
    if (card) {
      setEditId(id);
      setEditFront(card.front);
      setEditBack(card.back);
    }
  };

  const saveEdit = () => {
    if (editId === null) return;
    setCards((prev) =>
      prev.map((card) =>
        card._id === editId
          ? { ...card, front: editFront, back: editBack }
          : card,
      ),
    );
    setEditId(null);
  };

  const generatedCards = async () => {
    try {
      setIsLoading(true);
      const response = await api.post('/classroom/generate_cards_by_subject', {
        subject: topic,
        amount: numberCards || 20,
        language_front: languageFront || 'English',
        language_back: languageBack || 'Portuguese',
        format: format,
      });

      const cards_list = response.data.flashcards.cards;

      setCards(
        cards_list.map((item: any, index: any) => ({
          _id: index,
          front: item.front,
          back: item.back,
        })),
      );

      setShowForm(false);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCardItem = (card: ICardProps) => (
    <View
      key={card._id}
      className="bg-white rounded-[12px] overflow-hidden relative shadow-lg pt-7 px-4 pb-4 w-[95%]  m-4"
    >
      <Text className="font-bold mb-2">{card.front}</Text>
      <Text className="text-gray-600">{card.back}</Text>

      <Pressable
        className="absolute top-0 right-20 p-2"
        onPress={() =>
          setViewCArd({ _id: card._id, front: card.front, back: card.back })
        }
      >
        <MaterialCommunityIcons name="eye" size={18} color="black" />
      </Pressable>

      <Pressable
        onPress={() => editCard(card._id)}
        className="absolute top-0 right-10 p-2"
      >
        <Octicons name="pencil" size={18} color="black" />
      </Pressable>

      <Pressable
        onPress={() => deleteCard(card._id)}
        className="absolute top-0 right-0 p-2"
      >
        <Octicons name="trash" size={18} color={colors.error[500]} />
      </Pressable>
    </View>
  );

  return (
    <Modal visible={open} animationType="slide" transparent>
      <View className="flex-1 bg-white p-5">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-lg font-bold">{t('Card Generator')}</Text>
          <TouchableOpacity onPress={() => setOpen(false)}>
            <MaterialIcons name="close" size={24} color={colors.gray[950]} />
          </TouchableOpacity>
        </View>

        {showForm ? (
          <View>
            <Input
              label="Topic"
              value={topic}
              onChangeText={setTopic}
              className="mb-4"
              inputClasses="h-14"
            />

            <View className="flex-row justify-between mb-4">
              <PickerSelect
                label="Format"
                selectedValue={format}
                onValueChange={setFormat}
                options={[
                  { label: 'Questions/Answers', value: 'Questions/Answers' },
                  { label: 'Phrase/Translation', value: 'Phrase/Translation' },
                ]}
                className="w-[48%]"
              />
              <View className="w-[48%]">
                <Text className="font-bold text-primary mb-1">
                  {t('Number of cards')}
                </Text>
                <TextInput
                  keyboardType="numeric"
                  value={numberCards || '20'}
                  onChangeText={(text) =>
                    setNumberCards(text.replace(/[^0-9]/g, ''))
                  }
                  className="border border-gray-200 rounded-lg px-3 py-2 h-14"
                />
              </View>
            </View>

            <View className="flex-row justify-between mb-4">
              <PickerSelect
                label="Language Front"
                selectedValue={languageFront || 'English'}
                onValueChange={setLanguageFront}
                options={languages}
                className="w-[48%]"
              />
              <PickerSelect
                label="Language Back"
                selectedValue={languageBack || 'Portuguese'}
                onValueChange={setLanguageBack}
                options={languages}
                className="w-[48%]"
              />
            </View>

            <TouchableOpacity
              onPress={generatedCards}
              className="border border-dashed border-gray-400 rounded-lg py-4 flex items-center justify-center"
            >
              <MaterialCommunityIcons
                name="star-check-outline"
                size={24}
                color={colors.primary[500]}
              />
              <Text className="text-primary font-bold">
                {t('Generate cards with AI')}
              </Text>
            </TouchableOpacity>

            {cards.length > 0 && !isLoading && (
              <TouchableOpacity
                onPress={() => setShowForm(false)}
                className="flex-row items-center justify-center m-4"
              >
                <Feather name="chevrons-up" size={18} color="black" />
                <Text>{t('Show less')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setShowForm(true)}
            className="flex-row items-center justify-center m-4"
          >
            <Feather name="chevrons-down" size={18} color="black" />
            <Text>{t('Show commands')}</Text>
          </TouchableOpacity>
        )}

        {isLoading && <Loading color={colors.primary[500]} />}

        {cards.length > 0 && !isLoading && (
          <Text
            className="text-2xl font-bold m-2"
            style={{ color: colors.primary[500] }}
          >
            {t('Cards generated')}
          </Text>
        )}
        {cards.length > 0 && !isLoading && (
          <ScrollView
            contentContainerStyle={{
              gap: 15,
              paddingBottom: 200,
            }}
          >
            {cards.map(renderCardItem)}
          </ScrollView>
        )}

        <Modal visible={editId !== null} animationType="slide">
          <View className="p-4">
            <View className="flex-row justify-between items-center mb-4">
              <TouchableOpacity onPress={() => setEditId(null)}>
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={24}
                  color="black"
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveEdit}
                style={{ backgroundColor: colors.primary[500] }}
                className="rounded-2xl p-2.5"
              >
                <MaterialCommunityIcons name="check" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <Input
              label="Front Side"
              value={editFront}
              onChangeText={setEditFront}
              inputClasses="h-40"
              className="mb-4"
            />
            <Input
              label="Back Side"
              value={editBack}
              onChangeText={setEditBack}
              inputClasses="h-40"
            />
          </View>
        </Modal>
      </View>

      <LinearGradient
        colors={['transparent', `${colors.gray[100]}`]}
        className="absolute bottom-0 left-0 right-0 h-28"
        pointerEvents="none"
      />
      {cards.length > 0 && !isLoading && (
        <View className="w-full bg-red-300 flex items-center justify-center">
          <TouchableOpacity
            style={{ backgroundColor: colors.primary[500] }}
            className="flex items-center justify-center w-[80%] m-auto absolute bottom-7 rounded-full p-2"
            onPress={() => {
              setOpen(false);
              setGeneratedCards(cards);
            }}
          >
            <Text className="text-white font-bold text-2xl">Salvar</Text>
          </TouchableOpacity>
        </View>
      )}

      {viewCArd && (
        <Modal>
          <View className="flex-row justify-between items-center m-4">
            <Text className="text-lg font-bold">{t('Card Preview')}</Text>
            <TouchableOpacity onPress={() => setViewCArd(null)}>
              <MaterialIcons name="close" size={24} color={colors.gray[950]} />
            </TouchableOpacity>
          </View>
          <FlipCard frontSide={viewCArd.front} backSide={viewCArd.back} />{' '}
        </Modal>
      )}
    </Modal>
  );
};
