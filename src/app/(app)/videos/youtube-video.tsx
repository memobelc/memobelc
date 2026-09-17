import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import YoutubeIframe from 'react-native-youtube-iframe';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as ImagePicker from 'expo-image-picker';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AntDesign,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from '@expo/vector-icons';
import { colors } from '@/styles/colors';
import { Loading } from '@/components/Loading';
import { CardDisplaying } from '@/components/atoms/CardDisplaying';
import { Dialog, DialogContent, useDialog } from '@/components/Dialog';
import { OpenDialogInput } from '@/components/atoms/DialogInput';
import { Input } from '@/components/Input';
import { useToast } from '@/components/Toast';
import { useCollection } from '@/contexts/CollectionContext';
import { useSession } from '@/contexts/AuthContext';
import api from '@/services/api';
import { storage } from '../../../../FirebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { setImageUrl } from '@/utils/imgSource';

interface ICardProps {
  _id: string;
  back: string;
  created_at: string;
  front: string;
  media_type: any;
  updated_at: string;
  card_type?: string;
  options?: string[];
  image?: string | null;
  audio?: string;
}

const YouTubeVideo = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { setOpen } = useDialog();
  const { collections } = useCollection();
  const { userInfo } = useSession();
  const { toast } = useToast();
  const { videoId, deckId } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const VIDEO_HEIGHT = ((width - 48) / 16) * 9;

  const [selectedCollection, setSelectedCollection] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [nameCollection, setNameCollection] = useState('');
  const [loading, setLoading] = useState(true);
  const [userAlreadyHasDeck, setUserAlreadyHasDeck] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [openAddVideo, setOpenAddVideo] = useState(false);
  const [openCreateCollection, setOpenCreateCollection] = useState(false);
  const [cards, setCards] = useState<ICardProps[]>([]);

  const onFullScreenChange = useCallback((isFullScreen: boolean) => {
    ScreenOrientation.lockAsync(
      isFullScreen
        ? ScreenOrientation.OrientationLock.LANDSCAPE
        : ScreenOrientation.OrientationLock.PORTRAIT,
    );
  }, []);

  const fetchCardsData = async () => {
    try {
      const response = await api.get(`/card/get_cards_by_deck/${deckId}`);

      if (response.status === 200) {
        setCards(response.data.cards);
      }
    } catch (error) {
      console.error(error);
    } finally {
    }
  };

  const HandleOpenAddVideo = () => {
    setOpenAddVideo(true);
    setOpen(true);
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

  const HandleCreateCollection = async () => {
    if (!selectedImage) return;

    const response = await fetch(selectedImage);
    const blob = await response.blob();
    const storageRef = ref(storage, `images/decks/${Date.now()}`);

    try {
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      const collection_creation = await api.post('/collections/create', {
        name: nameCollection,
        image: url,
        user_id: userInfo?.user_id,
      });

      setSelectedCollection(collection_creation.data.collection_id);
      HandleSaveDeck(collection_creation.data.collection_id);

      toast({
        message: t('Collection of deck created successfully'),
        variant: 'success',
        showProgress: true,
      });
      HandleSaveDeck();
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
      setOpen(false);
      setOpenAddVideo(false);
      setNameCollection('');
      setSelectedImage(null);
    }
  };

  const HandleSaveDeck = async (collection_id?: string) => {
    if (collection_id) {
      setSelectedCollection(collection_id);
    }
    if ((!selectedCollection && !collection_id) || !deckId) return;

    try {
      await api.post('/deck/save_deck', {
        user_id: userInfo?.user_id,
        deck_id: deckId,
        collection_id: selectedCollection || collection_id,
      });

      setUserAlreadyHasDeck(true);

      toast({
        message: t('Deck saved successfully'),
        variant: 'success',
        showProgress: true,
      });
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
      setOpen(false);
      setNameCollection('');
      setSelectedImage(null);
    }
  };

  const check_if_the_user_has_the_deck = async () => {
    setLoading(true);
    const response = await api.post('/deck/check_if_the_user_has_the_deck', {
      user_id: userInfo?.user_id,
      deck_id: deckId,
    });

    if (response.status === 200) {
      const user_has_deck = JSON.parse(response.data.user_has_deck);
      setUserAlreadyHasDeck(user_has_deck);
    }

    setLoading(false);
  };

  useEffect(() => {
    check_if_the_user_has_the_deck();
    fetchCardsData();
  }, []);

  return (
    <View className="flex-1 p-6">
      <TouchableOpacity
        onPress={() => router.back()}
        className="flex-row items-center"
      >
        <Ionicons
          name="arrow-back-circle"
          size={24}
          color={colors.primary[500]}
        />
        <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
      </TouchableOpacity>
      <View className="w-full h-[180]">
        <YoutubeIframe
          videoId={videoId as string}
          width={width - 48}
          height={videoReady ? VIDEO_HEIGHT : 0}
          onReady={() => setVideoReady(true)}
          onFullScreenChange={onFullScreenChange}
        />
        {!videoReady && (
          <Loading
            color={colors.primary[500]}
            classname="flex-1 items-center justify-center"
          />
        )}
      </View>
      {!loading && cards.length > 0 ? (
        <TouchableOpacity
          style={{
            backgroundColor: !userAlreadyHasDeck
              ? colors.primary[500]
              : colors.success[500],
          }}
          disabled={userAlreadyHasDeck}
          className=" mt-10 flex flex-row items-center justify-center w-full  rounded-full p-2.5"
          onPress={HandleOpenAddVideo}
        >
          <Text className="text-white font-bold text-2xl">
            {!userAlreadyHasDeck ? 'Save Deck' : 'Deck is already saved'}
          </Text>
          <MaterialCommunityIcons
            name="cards-outline"
            size={24}
            color="white"
          />
        </TouchableOpacity>
      ) : (
        <Loading classname="flex-1 items-center justify-center" />
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 200, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
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
            />
          ))}
      </ScrollView>

      <LinearGradient
        colors={['transparent', `${colors.gray[100]}`]}
        className="absolute bottom-0 left-0 right-0 h-60"
        pointerEvents="none"
      />
      {openAddVideo && (
        <OpenDialogInput
          open={openAddVideo}
          onClose={() => {
            setOpenAddVideo(false);
            setOpen(false);
          }}
          title={t('Select the desired collection')}
        >
          <View className="w-full max-h-[80vh]">
            <ScrollView
              contentContainerStyle={{ paddingBottom: 200, paddingTop: 25 }}
              showsVerticalScrollIndicator={false}
            >
              {collections && collections.length >= 1 && (
                <>
                  {collections.map((item) => (
                    <TouchableOpacity
                      key={item._id}
                      onPress={() => {
                        HandleSaveDeck(item._id);
                      }}
                    >
                      <View className="w-full md:w-[50%] h-[100px] mx-auto bg-white rounded-[12px] overflow-hidden relative shadow-lg my-3">
                        <Image
                          style={{ width: '30%', height: '100%' }}
                          source={setImageUrl({ image: item.image })}
                          className="w-[30%] h-full absolute  top-0"
                        />

                        <View className="w-[70%] h-full justify-center items-center left-[30%]">
                          <Text className="font-[ComicSans] text-xl font-bold  text-start w-full pl-3">
                            {item.name}
                          </Text>
                          <View className="flex flex-row justify-between items-center  w-[80%]"></View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
              <TouchableOpacity onPress={() => setOpenCreateCollection(true)}>
                <View className="w-full h-[100px] bg-white rounded-[12px]  relative shadow-lg my-3 flex-col justify-center items-center">
                  <AntDesign name="plus-circle" size={24} color="black" />

                  <Text className="font-[ComicSans] text-xl font-bold pb-3  px-6">
                    Create a new Collection
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </OpenDialogInput>
      )}

      {openCreateCollection && (
        <Dialog>
          <DialogContent
            className="w-full px-4"
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: colors.overlay?.medium || 'rgba(0,0,0,0.5)',
            }}
          >
            <View
              className="bg-white rounded-3xl w-full md:max-w-2xl p-6 md:p-8"
              style={{
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.25,
                shadowRadius: 20,
                elevation: 10,
                maxHeight: '90%',
              }}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="flex flex-row justify-between items-center mb-6">
                  <View className="flex-row items-center gap-3">
                    <View
                      className="rounded-full p-2"
                      style={{ backgroundColor: colors.primary[100] }}
                    >
                      <MaterialCommunityIcons
                        name="folder-plus"
                        size={24}
                        color={colors.primary[500]}
                      />
                    </View>
                    <Text
                      className="font-bold text-2xl md:text-3xl"
                      style={{ color: colors.primary[700] }}
                    >
                      {t('New deck collection')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setOpen(false);
                      setOpenCreateCollection(false);
                    }}
                    className="rounded-full p-2 active:scale-95"
                    style={{ backgroundColor: colors.gray[100] }}
                  >
                    <MaterialIcons
                      name="close"
                      size={24}
                      color={colors.gray[700]}
                    />
                  </TouchableOpacity>
                </View>

                <View className="mb-6">
                  <Text
                    className="text-sm font-semibold mb-3"
                    style={{ color: colors.gray[700] }}
                  >
                    {t('Collection Image')}
                  </Text>
                  <TouchableOpacity
                    onPress={pickImage}
                    className="border-2 border-dashed rounded-2xl p-6 flex items-center justify-center"
                    style={{
                      borderColor: colors.primary[300],
                      backgroundColor: colors.primary[50],
                      minHeight: 160,
                    }}
                  >
                    {selectedImage ? (
                      <View className="relative">
                        <Image
                          source={{ uri: selectedImage }}
                          className="w-36 h-36 rounded-xl"
                        />
                        <TouchableOpacity
                          onPress={() => setSelectedImage(null)}
                          className="bg-red-500 absolute -top-2 -right-2 w-6 h-6 rounded-full items-center justify-center"
                        >
                          <MaterialIcons name="close" size={16} color="white" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View className="flex-col items-center justify-center ">
                        <MaterialIcons
                          name="add-photo-alternate"
                          size={40}
                          color={colors.primary[400]}
                        />
                        <Text
                          className="text-center mt-3 font-medium"
                          style={{ color: colors.primary[600] }}
                        >
                          {t('Tap to send an image')}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                <View className="mb-6">
                  <Text
                    className="text-sm font-semibold mb-3"
                    style={{ color: colors.gray[700] }}
                  >
                    {t('Collection Name')}
                  </Text>
                  <Input
                    placeholder={t('Enter name deck collection')}
                    className="w-full"
                    style={{
                      borderWidth: 2,
                      borderColor: colors.gray[300],
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      fontSize: 16,
                    }}
                    value={nameCollection}
                    onChangeText={(text) => setNameCollection(text)}
                  />
                </View>

                <View className="flex-col md:flex-row gap-3 mt-4">
                  <TouchableOpacity
                    onPress={() => {
                      setOpen(false);
                      setOpenCreateCollection(false);
                    }}
                    className="w-full md:flex-1 rounded-xl py-4 items-center order-2 md:order-1"
                    style={{ backgroundColor: colors.gray[200] }}
                  >
                    <Text
                      className="font-bold text-base"
                      style={{ color: colors.gray[700] }}
                    >
                      {t('Cancel')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.primary[500],
                      shadowColor: colors.primary[500],
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 5,
                    }}
                    className="w-full md:flex-[2] rounded-xl py-4 items-center active:scale-98 order-1 md:order-2"
                    onPress={HandleCreateCollection}
                  >
                    <View className="flex-row items-center gap-2">
                      <MaterialIcons
                        name="check"
                        size={20}
                        color={colors.white}
                      />
                      <Text className="text-white text-base font-bold">
                        {t('Create New deck collection')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </DialogContent>
        </Dialog>
      )}
    </View>
  );
};

export default YouTubeVideo;
