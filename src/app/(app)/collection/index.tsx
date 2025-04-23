import { useState } from 'react';
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useTranslation } from 'react-i18next';

import { DialogContent, useDialog } from '@/components/Dialog';
import { DeckCardSecondary } from '@/components/atoms/DeckCardSecondary';
import { Input } from '@/components/Input';
import { OpenStudy } from '@/components/atoms/openStudy';
import { useToast } from '@/components/Toast';
import api from '@/services/api';
import { useCollection } from '@/contexts/CollectionContext';
import { useSession } from '@/contexts/AuthContext';
import { colors } from '@/styles/colors';

import { storage } from '../../../../FirebaseConfig';
import { imageSourcesDeck, setImageUrl } from '@/utils/imgSource';
import { Loading } from '@/components/Loading';

export default function Collection() {
  const {
    setCollections,
    currentCollection,
    setCurrentDeck,
    setCurrentCollection,
  } = useCollection();
  const { userInfo } = useSession();
  const { toast } = useToast();
  const { t } = useTranslation();
  const router = useRouter();
  const { setOpen } = useDialog();
  const [openAddDeck, setOpenAddDeck] = useState(false);
  const [openStudy, setOpenStudy] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageFromGallery, setSelectedImageFromGallery] = useState<
    string | null
  >(null);
  const [nameDeck, setNameDeck] = useState('');
  const [loadingCollection, setLoadingCollection] = useState(false);
  const { name } = useLocalSearchParams();
  const [modalVisible, setModalVisible] = useState(false);

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

  const HandleOpenAddDeck = () => {
    setOpenAddDeck(true);
    setOpenStudy(false);
    setOpen(true);
  };

  const HandleOpenStudy = () => {
    setOpenStudy(true);
    setOpenAddDeck(false);
    setOpen(true);
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

  const HandleCreateDeck = async () => {
    let url = '';
    if (selectedImage && !selectedImageFromGallery) {
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      const storageRef = ref(storage, `images/decks/${Date.now()}`);

      await uploadBytes(storageRef, blob);
      url = await getDownloadURL(storageRef);
    } else {
      url = selectedImageFromGallery!;
    }

    try {
      await api.post('/deck/create', {
        name: nameDeck,
        image: url,
        collection_id: currentCollection?._id,
      });

      toast({
        message: 'Deck  created successfully',
        variant: 'success',
        showProgress: true,
      });
      fetchData();
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
      setNameDeck('');
      setSelectedImage(null);
      fetchData();
    }
  };

  return (
    <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8 relative">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 200, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="">
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
                {currentCollection?.total_cards !== 0
                  ? `${currentCollection?.pending_cards} out of ${currentCollection?.total_cards} to study`
                  : 'No cards added yet'}
              </Text>
            </View>
          </View>

          <Text className="w-full text-gray-800 text-2xl font-bold">
            {name}
          </Text>

          <View className="my-6 w-full h-48 md:h-[756px] rounded-[12px] overflow-hidden relative">
            <Image
              source={setImageUrl({ image: currentCollection?.image })}
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
              source={setImageUrl({ image: currentCollection?.image })}
              style={{
                width: '100%',
                height: '100%',
                resizeMode: 'contain',
              }}
              className="w-full h-full"
            />
          </View>

          {loadingCollection ? (
            <Loading color={colors.primary[500]} />
          ) : currentCollection?.decks.length !== 0 ? (
            <>
              <TouchableOpacity
                style={{ backgroundColor: colors.warning[500] }}
                className="flex flex-row items-center justify-center w-full rounded-full p-2.5"
                onPress={HandleOpenStudy}
              >
                <Text className="text-white font-bold text-2xl">
                  {t('Study Now')}
                </Text>
                <MaterialIcons name="arrow-right-alt" size={40} color="white" />
              </TouchableOpacity>
              <View className="mt-8 flex-col w-full items-start justify-between z-10 bg-gray-100 mb-4">
                <TextInput
                  placeholder={t('Search decks...')}
                  placeholderTextColor="#888"
                  className="h-14 w-full border border-gray-300 rounded-lg pl-2 text-sm"
                />
              </View>
            </>
          ) : (
            <View className="flex  items-center justify-center py-10">
              <Text className="font-[ComicSans] text-lg md:text-2xl text-gray-500 text-center font-semibold">
                {t('Your collection is empty, add a deck to your collection')}
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
            {currentCollection && (
              <>
                {currentCollection.decks.map((item) => (
                  <DeckCardSecondary
                    key={item._id}
                    name={item.name}
                    image={item.image}
                    type="deck"
                    pending_cards={item.pending_cards}
                    total_cards={item.total_cards}
                    onPress={() => setCurrentDeck(item)}
                  />
                ))}
              </>
            )}
          </View>
        </View>
      </ScrollView>
      <LinearGradient
        colors={['transparent', `${colors.gray[100]}`]}
        className="absolute bottom-0 left-0 right-0 h-60"
        pointerEvents="none"
      />

      <TouchableOpacity
        style={{ backgroundColor: colors.primary[500] }}
        className="flex flex-row items-center justify-center w-full md:w-40 absolute bottom-7 rounded-full p-2"
        onPress={HandleOpenAddDeck}
      >
        <Text className="text-white font-bold text-2xl">{t('Add deck')}</Text>
      </TouchableOpacity>

      {openStudy && <OpenStudy open={openStudy} />}

      {openAddDeck && (
        <DialogContent className="bg-white rounded-t-lg w-full absolute flex items-center bottom-0 h-3/4 p-4">
          <View className="flex flex-row justify-between items-center mb-2 w-full">
            <Text className="font-semibold text-xl text-primary justify-center">
              {t('New deck')}
            </Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <MaterialIcons name="close" size={24} color={colors.gray[950]} />
            </TouchableOpacity>
          </View>

          <View className="border-b border-gray-300 mb-4 w-full" />

          <View>
            <View className="flex flex-row items-center justify-betweenS">
              <TouchableOpacity
                onPress={pickImage}
                className="border border-dashed border-gray-400 rounded-lg p-10 flex items-center justify-center w-[80%]"
              >
                {selectedImage ? (
                  <View className="relative">
                    <Image
                      style={{ width: 128, height: 128 }}
                      source={
                        typeof selectedImage === 'string'
                          ? { uri: selectedImage }
                          : selectedImage
                      }
                      className="w-32 h-32 rounded-lg"
                    />
                    <View className="bg-slate-100 absolute -top-2 -right-2 w-6 rounded-md">
                      <MaterialIcons
                        onPress={() => {
                          setSelectedImage(null);
                          setSelectedImageFromGallery(null);
                        }}
                        name="close"
                        size={24}
                        color="red"
                      />
                    </View>
                  </View>
                ) : (
                  <View className="flex-col items-center justify-center">
                    <MaterialIcons name="cloud-upload" size={40} color="gray" />
                    <Text className="text-gray-500 mt-2">
                      {t('Tap to send an image')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                className=" rounded-lg  flex-col items-start justify-start p-5  w-[20%]"
              >
                <View className="flex-col items-center justify-center">
                  <MaterialCommunityIcons
                    name="folder-multiple-image"
                    size={40}
                    color="black"
                  />
                  <Text className="text-xs">{t('Gallery')}</Text>
                </View>
              </TouchableOpacity>
            </View>

            <Modal visible={modalVisible} animationType="slide" transparent>
              <View className="flex-1 bg-white p-5">
                <Text className="text-lg font-bold mb-3">
                  {t('Select an image')}
                </Text>
                <ScrollView
                  contentContainerStyle={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  {imageSourcesDeck.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => {
                        setSelectedImage(item.uri);
                        setSelectedImageFromGallery(`dt_${item.id}`);
                        setModalVisible(false);
                      }}
                      className="border rounded-lg overflow-hidden"
                    >
                      <Image
                        style={{ width: 100, height: 100 }}
                        source={item.uri}
                        className="w-24 h-24"
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  className="bg-red-500 p-3 mt-4 rounded-lg"
                >
                  <Text className="text-white text-center">{t('Cancel')}</Text>
                </TouchableOpacity>
              </View>
            </Modal>
          </View>
          <Input
            placeholder={t('Enter name deck collection')}
            className="py-6 w-full"
            value={nameDeck}
            onChangeText={(text) => setNameDeck(text)}
          />
          <TouchableOpacity
            style={{ backgroundColor: colors.primary[500] }}
            className="w-full max-w-[500px] py-4 rounded-3xl items-center mb-5"
            onPress={HandleCreateDeck}
          >
            <Text className="text-white text-base font-bold">
              {t('Create New deck')}
            </Text>
          </TouchableOpacity>
        </DialogContent>
      )}
    </View>
  );
}
