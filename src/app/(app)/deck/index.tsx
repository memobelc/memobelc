import React, { useEffect, useState } from 'react';
import { View, Image, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import {
  MaterialIcons,
  MaterialCommunityIcons,
  Feather,
} from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/colors';
import { CardDisplaying } from '@/components/atoms/CardDisplaying';
import {
  CardFormModal,
  CardFormPayload,
  ICardProps,
} from '@/components/atoms/CardFormModal';
import { OpenStudy } from '@/components/atoms/openStudy';
import { useCollection } from '@/contexts/CollectionContext';
import api from '@/services/api';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { useToast } from '@/components/Toast';
import { useTranslation } from 'react-i18next';
import { setImageUrlDeck } from '@/utils/imgSource';
import { Loading } from '@/components/Loading';

import { storage } from '../../../../FirebaseConfig';

export default function Deck() {
  const { t } = useTranslation();
  const router = useRouter();

  const { currentDeck, setCollections, currentCollection } = useCollection();

  const [cards, setCards] = useState<ICardProps[] | []>([]);

  const { userInfo } = useSession();
  const { hasRole } = useHasRole();
  const { toast } = useToast();

  const [loadingCollection, setLoadingCollection] = useState(false);
  const [loadingCreateCard, setLoadingCreateCard] = useState(false);
  const [editModeEnabled, setEditModeEnabled] = useState(false);
  const [canEditCards, setCanEditCards] = useState(false);
  const [showEditTooltip, setShowEditTooltip] = useState(false);

  // Removido useDialog, agora usando Modal diretamente
  const [openAddCard, setOpenAddCard] = useState(false);
  const [openEditCard, setOpenEditCard] = useState(false);
  const [openStudy, setOpenStudy] = useState(false);
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const { name } = useLocalSearchParams();

  const [currentEditingCard, setCurrentEditingCard] = useState<ICardProps | null>(null);
  const [cardToDelete, setCardToDelete] = useState<ICardProps | null>(null);

  const handleLongPressEdit = () => {
    setShowEditTooltip(true);
    setTimeout(() => {
      setShowEditTooltip(false);
    }, 2000); // Fecha após 2 segundos
  };

  const uploadIfLocal = async (uri: string | null, folder: string) => {
    if (!uri) {
      return '';
    }
    if (uri.startsWith('http')) {
      return uri;
    }
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, `${folder}/${Date.now()}`);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
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
    setOpenEditCard(false);
    setCurrentEditingCard(null);
  };

  const HandleOpenEditCard = (card: ICardProps) => {
    setCurrentEditingCard(card);
    setOpenEditCard(true);
  };

  const HandleOpenDeleteConfirm = (card: ICardProps) => {
    setCardToDelete(card);
    setOpenDeleteConfirm(true);
  };

  const checkEditPermission = async () => {
    try {
      // Verifica permissões baseado no tipo de collection
      const isBookCollection = currentCollection?.is_book_collection;
      const isClassroom = !!currentCollection?.classroom;
      const isAdmin = hasRole('admin');

      if (isAdmin) {
        setCanEditCards(true);
        return;
      }

      if (isBookCollection) {
        // Apenas admin pode editar collections de livros
        setCanEditCards(false);
        return;
      }

      if (isClassroom) {
        // Verifica se o usuário é professor da turma
        const response = await api.get(
          `/classroom/${currentCollection.classroom}`,
          {
            headers: {
              Authorization: `Bearer ${userInfo?.token}`,
            },
          }
        );
        
        if (response.status === 200) {
          const classroom = response.data;
          setCanEditCards(classroom.teacher === userInfo?.user_id);
        }
      } else {
        // Collection pessoal - sempre pode editar
        setCanEditCards(true);
      }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      setCanEditCards(false);
    }
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

  const HandleCreateCard = async (payload: CardFormPayload) => {
    if (loadingCreateCard) {
      return;
    }

    setLoadingCreateCard(true);

    try {
      const urlAudio = await uploadIfLocal(payload.audioUri, 'audios/cards');
      const urlImage = await uploadIfLocal(payload.imageUri, 'images/cards');

      await api.post('/card/create', {
        front: payload.front,
        back: payload.back,
        deck_id: currentDeck?._id,
        user_id: userInfo?.user_id,
        audio: urlAudio || undefined,
        card_type: payload.card_type,
        options: payload.card_type === 'multiple_choice' ? payload.options : undefined,
        correct_index: payload.card_type === 'multiple_choice' ? payload.correct_index : undefined,
        image: payload.card_type === 'image' ? urlImage : undefined,
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

  const HandleUpdateCard = async (payload: CardFormPayload) => {
    if (loadingCreateCard || !currentEditingCard) {
      return;
    }

    setLoadingCreateCard(true);

    try {
      const urlAudio = await uploadIfLocal(
        payload.audioUri,
        'audios/cards',
      );
      const urlImage = await uploadIfLocal(
        payload.imageUri,
        'images/cards',
      );

      await api.put(`/card/${currentEditingCard._id}`, {
        front: payload.front,
        back: payload.back,
        audio: urlAudio || undefined,
        card_type: payload.card_type,
        options: payload.card_type === 'multiple_choice' ? payload.options : undefined,
        correct_index: payload.card_type === 'multiple_choice' ? payload.correct_index : undefined,
        image: payload.card_type === 'image' ? urlImage : undefined,
      }, {
        headers: {
          Authorization: `Bearer ${userInfo?.token}`,
        },
      });

      toast({
        message: t('Card updated successfully'),
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

  const HandleDeleteCard = async () => {
    if (!cardToDelete) return;

    try {
      await api.delete(`/card/${cardToDelete._id}`, {
        headers: {
          Authorization: `Bearer ${userInfo?.token}`,
        },
      });

      toast({
        message: t('Card deleted successfully'),
        variant: 'success',
        showProgress: true,
      });

      fetchCardsData();
      setOpenDeleteConfirm(false);
      setCardToDelete(null);
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
    }
  };

  useEffect(() => {
    fetchCardsData();
    checkEditPermission();
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
          <View className="flex-row items-center gap-2">
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
            {canEditCards && cards.length > 0 && (
              <View style={{ position: 'relative' }}>
                <TouchableOpacity
                  style={{ 
                    backgroundColor: editModeEnabled ? colors.error[500] : colors.gray[300] 
                  }}
                  className="px-3 py-1 rounded-md flex-row items-center"
                  onPress={() => setEditModeEnabled(!editModeEnabled)}
                  onLongPress={handleLongPressEdit}
                  delayLongPress={300}
                >
                  <MaterialIcons 
                    name={editModeEnabled ? "close" : "edit"} 
                    size={16} 
                    color={editModeEnabled ? "white" : colors.gray[700]} 
                  />
                </TouchableOpacity>
                
                {showEditTooltip && (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 40,
                      right: -20,
                      backgroundColor: colors.gray[800],
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 6,
                      minWidth: 150,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 3.84,
                      elevation: 5,
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 12, textAlign: 'center' }}>
                      {editModeEnabled ? t('Disable Edit Mode') : t('Enable Edit Mode')}
                    </Text>
                    <View 
                      style={{ 
                        position: 'absolute',
                        bottom: -5,
                        right: 25,
                        width: 0,
                        height: 0,
                        backgroundColor: 'transparent',
                        borderStyle: 'solid',
                        borderLeftWidth: 5,
                        borderRightWidth: 5,
                        borderTopWidth: 5,
                        borderLeftColor: 'transparent',
                        borderRightColor: 'transparent',
                        borderTopColor: colors.gray[800],
                      }}
                    />
                  </View>
                )}
              </View>
            )}
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
                cardType={item.card_type}
                options={item.options}
                image={item.image}
                editMode={editModeEnabled}
                onEdit={canEditCards ? () => HandleOpenEditCard(item) : undefined}
                onDelete={canEditCards ? () => HandleOpenDeleteConfirm(item) : undefined}
              />
            ))}
        </View>
      </ScrollView>
      <LinearGradient
        colors={['transparent', `${colors.gray[100]}`]}
        className="absolute bottom-0 left-0 right-0 h-60"
        pointerEvents="none"
      />

      {canEditCards && (
        <TouchableOpacity
          style={{ 
            backgroundColor: colors.primary[500],
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
          className="flex flex-row items-center justify-center gap-2 w-full md:w-auto md:px-6 absolute bottom-7 rounded-full py-3 active:scale-95"
          onPress={HandleOpenAddCard}
        >
          <MaterialIcons name="add" size={24} color={colors.white} />
          <Text className="text-white font-bold text-lg">{t('Add cards')}</Text>
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

      <CardFormModal
        visible={openAddCard || openEditCard}
        mode={openEditCard ? 'edit' : 'create'}
        loading={loadingCreateCard}
        card={openEditCard ? currentEditingCard : null}
        onClose={HandleClose}
        onSubmit={openEditCard ? HandleUpdateCard : HandleCreateCard}
      />

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        transparent
        animationType="fade"
        visible={openDeleteConfirm}
        onRequestClose={() => setOpenDeleteConfirm(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/75">
          <View className="bg-white rounded-lg p-6 w-4/5 max-w-md">
            <Text className="text-xl font-bold text-center mb-4">
              {t('Delete Card')}
            </Text>
            <Text className="text-center text-gray-600 mb-6">
              {t('Are you sure you want to delete this card? This action cannot be undone.')}
            </Text>
            <View className="flex-row justify-between gap-4">
              <TouchableOpacity
                onPress={() => setOpenDeleteConfirm(false)}
                style={{ backgroundColor: colors.gray[300] }}
                className="flex-1 p-3 rounded-lg"
              >
                <Text className="text-center font-semibold text-gray-700">
                  {t('Cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={HandleDeleteCard}
                style={{ backgroundColor: colors.error[500] }}
                className="flex-1 p-3 rounded-lg"
              >
                <Text className="text-center font-semibold text-white">
                  {t('Delete')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
