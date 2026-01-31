import React, { useEffect, useState } from 'react';
import { View, Image, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import {
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome,
  Feather,
} from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import * as DocumentPicker from 'expo-document-picker';

import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/colors';
// Dialog removido, agora usando Modal diretamente
import { CardDisplaying } from '@/components/atoms/CardDisplaying';
import { Input } from '@/components/Input';
import FlipCard from '@/components/atoms/FlipCard';
import { OpenStudy } from '@/components/atoms/openStudy';
import { useCollection } from '@/contexts/CollectionContext';
import api from '@/services/api';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { useTranslation } from 'react-i18next';
import { setImageUrlDeck } from '@/utils/imgSource';
import { Loading } from '@/components/Loading';

import { storage } from '../../../../FirebaseConfig';

interface IcardProps {
  _id: string;
  back: string;
  created_at: string;
  front: string;
  audio?: string;
  media_type: any;
  updated_at: string;
}

export default function Deck() {
  const { t } = useTranslation();
  const router = useRouter();

  const { currentDeck, setCollections, currentCollection } = useCollection();

  const [cards, setCards] = useState<IcardProps[] | []>([]);

  const { userInfo } = useSession();
  const { toast } = useToast();

  const [loadingCollection, setLoadingCollection] = useState(false);
  const [loadingCreateCard, setLoadingCreateCard] = useState(false);

  // Removido useDialog, agora usando Modal diretamente
  const [openAddCard, setOpenAddCard] = useState(false);
  const [openStudy, setOpenStudy] = useState(false);
  const { name } = useLocalSearchParams();

  const [frontSide, setFrontSide] = useState('');
  const [backSide, setBackSide] = useState('');
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);

  const [viewCArd, setViewCArd] = useState(false);

  const pickAndUploadAudio = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
    });

    if (result.assets) {
      setSelectedAudio(result.assets[0].uri);
    }
  };

  const HandleOpenAddCard = () => {
    setOpenAddCard(true);
    setOpenStudy(false);
  };

  const HandleOpenStudy = () => {
    setOpenStudy(true);
    setOpenAddCard(false);
  };

  const HandleClose = () => {
    setOpenAddCard(false);
    setFrontSide('');
    setBackSide('');
    setViewCArd(false);
  };

  const fetchData = async () => {
    setLoadingCollection(true);
    try {
      const response = await api.get('/collections/get_by_user', {
        headers: {
          Authorization: `Bearer ${userInfo?.token}`,
        },
      });

      if (response.status === 200) {
        setCollections(response.data.collections);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingCollection(false);
    }
  };

  const fetchCardsData = async () => {
    setLoadingCollection(true);
    try {
      const response = await api.get(
        `/card/get_cards_by_deck/${currentDeck?._id}`,
        {
          headers: {
            Authorization: `Bearer ${userInfo?.token}`,
          },
        },
      );

      if (response.status === 200) {
        setCards(response.data.cards);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingCollection(false);
    }
  };

  const HandleCreateCard = async () => {
    // Previne múltiplos cliques
    if (loadingCreateCard) {
      return;
    }

    setLoadingCreateCard(true);
    let urlAudio = '';
    
    try {
      if (selectedAudio) {
        const response = await fetch(selectedAudio);
        const blob = await response.blob();
        const storageRef = ref(storage, `audios/cards/${Date.now()}`);

        await uploadBytes(storageRef, blob);
        urlAudio = await getDownloadURL(storageRef);
      }

      await api.post('/card/create', {
        front: frontSide,
        back: backSide,
        deck_id: currentDeck?._id,
        user_id: userInfo?.user_id,
        audio: urlAudio,
      });

      toast({
        message: t('Card created successfully'),
        variant: 'success',
        showProgress: true,
      });

      fetchCardsData();
      HandleClose();
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message);
        toast({
          message: error.message,
          variant: 'destructive',
          showProgress: true,
        });
      } else {
        toast({
          message: t('An unexpected error has occurred'),
          variant: 'destructive',
        });
      }
    } finally {
      setLoadingCreateCard(false);
    }
  };

  useEffect(() => {
    fetchCardsData();
  }, []);

  return (
    <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8 relative">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 200, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center mb-3 mr-5"
        >
          <Ionicons
            name="arrow-back-circle"
            size={24}
            color={colors.primary[500]}
          />
          <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
        </TouchableOpacity>

        <View className="flex flex-row justify-between items-center mb-4">
          <MaterialIcons name="language" size={24} color="#000" />
          <View className="flex bg-red-100 px-2 py-1 rounded-md items-center justify-center flex-row">
            <MaterialCommunityIcons
              className="pr-2"
              name="cards"
              size={24}
              color={colors.error[600]}
            />
            <Text className="text-xs color-red-700">
              {currentDeck?.total_cards != 0
                ? `${currentDeck?.pending_cards} out of ${currentDeck?.total_cards} to study`
                : 'No cards added yet'}
            </Text>
          </View>
        </View>

        <Text className="w-full text-gray-800 text-2xl font-bold">{name}</Text>

        <View className="my-6 w-full h-48 md:h-[756px] rounded-[12px] overflow-hidden relative">
          <Image
            source={setImageUrlDeck({ image: currentDeck?.image })}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              resizeMode: 'cover',
              opacity: 0.3,
            }}
            className="w-full h-full"
            blurRadius={10}
          />

          <Image
            source={setImageUrlDeck({ image: currentDeck?.image })}
            style={{
              width: '100%',
              height: '100%',
              resizeMode: 'contain',
            }}
            className="w-full h-full"
          />
        </View>

        {loadingCollection ? (
          <Loading
            color={colors.primary[500]}
            classname="flex-1 items-center justify-center"
          />
        ) : cards.length !== 0 ? (
          <TouchableOpacity
            style={{
              backgroundColor:
                currentDeck?.pending_cards == 0
                  ? colors.warning[100]
                  : colors.warning[500],
            }}
            className="flex flex-row items-center justify-center w-full rounded-full p-2.5"
            onPress={HandleOpenStudy}
            disabled={currentDeck?.pending_cards == 0}
          >
            <Text className="text-white font-bold text-2xl">
              {t('Study Now')}
            </Text>
            <Feather name="arrow-right" size={40} color="white" />
          </TouchableOpacity>
        ) : (
          <View className="flex  items-center justify-center py-10">
            <Text className="font-[ComicSans] text-lg md:text-2xl text-gray-500 text-center font-semibold">
              {t('Your deck is empty, add a cards to your deck')}
            </Text>
            <Image
              style={{ width: 200, height: 200 }}
              className="w-60 h-60"
              source={require('@/assets/empty.png')}
              resizeMode="cover"
            />
          </View>
        )}
        <View>
          {cards &&
            cards.map((item) => (
              <CardDisplaying
                key={item._id}
                front={item.front}
                back={item.back}
                audio={item.audio}
              />
            ))}
        </View>
      </ScrollView>
      <LinearGradient
        colors={['transparent', `${colors.gray[100]}`]}
        className="absolute bottom-0 left-0 right-0 h-60"
        pointerEvents="none"
      />

      {(!currentCollection?.classroom || userInfo?.role === 'teacher') && (
        <TouchableOpacity
          style={{ backgroundColor: colors.primary[500] }}
          className="flex flex-row items-center justify-center w-full absolute bottom-7 rounded-full p-2"
          onPress={HandleOpenAddCard}
        >
          <Text className="text-white font-bold text-2xl">{t('Add cards')}</Text>
        </TouchableOpacity>
      )}

      {openStudy && (
        <OpenStudy
          open={openStudy}
          onClose={() => {
            setOpenStudy(false);
          }}
        />
      )}

      <Modal
        transparent
        animationType="slide"
        visible={openAddCard}
        onRequestClose={HandleClose}
      >
        <View className="flex-1 justify-end items-center bg-black/75">
          <TouchableOpacity
            className="bg-white rounded-t-lg flex w-full h-full absolute items-center bottom-0 p-4"
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex flex-row justify-between items-center mb-2 w-full">
              <TouchableOpacity onPress={HandleClose}>
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={24}
                  color="black"
                />
              </TouchableOpacity>
              <View className="flex-row w-[60%] items-center justify-between">
                <Text className="font-semibold text-xl text-primary justify-center">
                  {t('New card')}
                </Text>
                <TouchableOpacity onPress={() => setViewCArd(!viewCArd)}>
                  <MaterialCommunityIcons
                    name={!viewCArd ? 'eye' : 'eye-off'}
                    size={24}
                    color="black"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={HandleCreateCard}
                  style={{ 
                    backgroundColor: loadingCreateCard ? colors.gray[400] : colors.primary[500] 
                  }}
                  className="rounded-2xl p-2.5"
                  disabled={loadingCreateCard}
                >
                  {loadingCreateCard ? (
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
            {!viewCArd ? (
              <ScrollView
                className="w-full"
                showsVerticalScrollIndicator={false}
              >
                <Input
                  label={t('Front Side')}
                  className="py-6 w-full"
                  inputClasses="h-40"
                  value={frontSide}
                  onChangeText={(text) => setFrontSide(text)}
                />
                <Input
                  label={t('Back Side')}
                  className="py-6 w-full"
                  inputClasses="h-40"
                  value={backSide}
                  onChangeText={(text) => setBackSide(text)}
                />
                <TouchableOpacity
                  onPress={pickAndUploadAudio}
                  className="border border-dashed border-gray-400 rounded-lg p-10 flex items-center justify-center"
                >
                  <FontAwesome name="file-audio-o" size={24} color="black" />
                  <Text className="text-gray-500 mt-2">
                    {t('Tap to attach audio')}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <FlipCard
                frontSide={frontSide}
                backSide={backSide}
                audio={selectedAudio}
              />
            )}
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
