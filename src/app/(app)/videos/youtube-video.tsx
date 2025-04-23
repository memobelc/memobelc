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
import { DialogContent, useDialog } from '@/components/Dialog';
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
  const [openStudy, setOpenStudy] = useState(false);
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

  const HandleOpenStudy = () => {
    setOpenStudy(true);
    setOpen(true);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission denied, You need to allow access to the gallery.');
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
        message: 'Collection of deck  created successfully',
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
          message: `An unexpected error has occurred`,
          variant: 'destructive',
        });
      }
    } finally {
      setOpen(false);
      setOpenStudy(false);
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
        message: 'Deck saved successfully',
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
          message: `An unexpected error has occurred`,
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
        {!videoReady && <Loading color={colors.primary[500]} />}
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
          onPress={HandleOpenStudy}
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
        <Loading />
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
            />
          ))}
      </ScrollView>

      <LinearGradient
        colors={['transparent', `${colors.gray[100]}`]}
        className="absolute bottom-0 left-0 right-0 h-60"
        pointerEvents="none"
      />
      {openStudy && (
        <OpenDialogInput open={openStudy} title="Select the desired collection">
          <View className="w-full">
            <ScrollView
              contentContainerStyle={{ paddingBottom: 200, paddingTop: 100 }}
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
                  <AntDesign name="pluscircleo" size={24} color="black" />
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
        <DialogContent className="bg-white rounded-t-lg w-full absolute flex items-center bottom-0 h-1/2 p-4">
          <View className="flex flex-row justify-between items-center mb-2 w-full">
            <Text className="font-semibold text-xl text-primary justify-center">
              New deck collection
            </Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <MaterialIcons name="close" size={24} color={colors.gray[950]} />
            </TouchableOpacity>
          </View>

          <View className="border-b border-gray-300 mb-4 w-full" />

          <TouchableOpacity
            onPress={pickImage}
            className="border border-dashed border-gray-400 rounded-lg p-10 flex items-center justify-center w-full"
          >
            {selectedImage ? (
              <View className="relative">
                <Image
                  source={{ uri: selectedImage }}
                  className="w-32 h-32 rounded-lg"
                />
                <View className="bg-slate-100 absolute -top-2 -right-2 w-6 rounded-md">
                  <MaterialIcons
                    onPress={() => setSelectedImage(null)}
                    name="close"
                    size={24}
                    color="red"
                    className=""
                  />
                </View>
              </View>
            ) : (
              <View className="flex-col items-center justify-center ">
                <MaterialIcons name="cloud-upload" size={40} color="gray" />
                <Text className="text-gray-500 mt-2 ">
                  Tap to send an image
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <Input
            placeholder="Enter your name deck collection"
            className="py-6 w-full"
            value={nameCollection}
            onChangeText={(text) => setNameCollection(text)}
          />
          <TouchableOpacity
            style={{ backgroundColor: colors.primary[500] }}
            className="w-full max-w-[500px] py-4 rounded-3xl items-center mb-5"
            onPress={HandleCreateCollection}
          >
            <Text className="text-white text-base font-bold">
              Create New deck collection
            </Text>
          </TouchableOpacity>
        </DialogContent>
      )}
    </View>
  );
};

export default YouTubeVideo;
