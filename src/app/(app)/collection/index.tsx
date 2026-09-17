import { useEffect, useState } from 'react';
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
import {
  MaterialIcons,
  MaterialCommunityIcons,
  Feather,
} from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useTranslation } from 'react-i18next';

// Dialog removido, agora usando Modal diretamente
import { DeckCardSecondary } from '@/components/atoms/DeckCardSecondary';
import { Input } from '@/components/Input';
import { OpenStudy } from '@/components/atoms/openStudy';
import { useToast } from '@/components/Toast';
import api from '@/services/api';
import { useCollection } from '@/contexts/CollectionContext';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { colors } from '@/styles/colors';

import { storage } from '../../../../FirebaseConfig';
import { imageSourcesDeck, setImageUrl } from '@/utils/imgSource';
import { Loading } from '@/components/Loading';
import * as yup from 'yup';

export default function Collection() {
  const {
    collections,
    setCollections,
    currentCollection,
    setCurrentDeck,
    setCurrentCollection,
  } = useCollection();
  const { userInfo } = useSession();
  const { hasRole } = useHasRole();
  const { toast } = useToast();
  const { t } = useTranslation();
  const router = useRouter();

  const validationSchema = yup.object().shape({
    name: yup.string().required(t('Name is required')),
  });

  const [formData, setFormData] = useState<Record<string, string>>({
    name: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Removido useDialog, agora usando Modal diretamente
  const [openAddDeck, setOpenAddDeck] = useState(false);
  const [openStudy, setOpenStudy] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageFromGallery, setSelectedImageFromGallery] = useState<
    string | null
  >(null);
  // const [nameDeck, setNameDeck] = useState('');
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [loading, setLoading] = useState(false);
  const { name } = useLocalSearchParams();
  const [modalVisible, setModalVisible] = useState(false);
  const [characterCounter, setCharacterCounter] = useState(0);

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

  const HandleOpenAddDeck = () => {
    setOpenAddDeck(true);
    setOpenStudy(false);
  };

  const HandleOpenStudy = () => {
    setOpenStudy(true);
    setOpenAddDeck(false);
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
        const updatedCollections = response.data.collections;
        setCollections(updatedCollections);

        const updated = updatedCollections.find(
          (e: any) => e._id === currentCollection?._id,
        );

        if (updated) {
          setCurrentCollection(updated);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingCollection(false);
    }
  };

  const HandleCreateDeck = async () => {
    setErrors({});
    let url = '';

    const validateForm = async () => {
      await validationSchema.validate(formData, { abortEarly: false });
    };

    const uploadImageIfNeeded = async (): Promise<string> => {
      if (selectedImage && !selectedImageFromGallery) {
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        const storageRef = ref(storage, `images/decks/${Date.now()}`);

        await uploadBytes(storageRef, blob);
        return await getDownloadURL(storageRef);
      }

      return selectedImageFromGallery!;
    };

    const createDeck = async (imageUrl: string) => {
      await api.post('/deck/create', {
        name: formData.name,
        image: imageUrl,
        collection_id: currentCollection?._id,
      });

      toast({
        message: t('Deck created successfully'),
        variant: 'success',
        showProgress: true,
      });
    };

    try {
      setLoading(true);
      await validateForm();
      url = await uploadImageIfNeeded();
      await createDeck(url);
      setSelectedImage(null);
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        const newErrors: Record<string, string> = {};
        error.inner.forEach((err) => {
          if (err.path) newErrors[err.path] = err.message;
        });
        setErrors(newErrors);
      } else if (error instanceof Error) {
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
      fetchData();
      setLoading(false);
      setOpenAddDeck(false);
    }
  };
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));

    setCharacterCounter(value.length);
  };

  const closeAddDeck = async () => {
    handleInputChange('name', '');
    setOpenAddDeck(false);
    setSelectedImage(null);
  };

  // Modal agora é controlado diretamente por openAddDeck, não precisa do useEffect

  useEffect(() => {
    // Se não há currentCollection mas há name nos params, busca a collection
    if (!currentCollection && name && collections) {
      const foundCollection = collections.find(
        (c: any) => c.name === name || c._id === name,
      );
      if (foundCollection) {
        setCurrentCollection(foundCollection);
      }
    }
  }, [name, collections, currentCollection]);

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
            <MaterialIcons name="language" size={24} color={colors.text} />
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
            <Loading
              color={colors.primary[500]}
              classname="flex-1 items-center justify-center"
            />
          ) : currentCollection?.decks.length !== 0 ? (
            <>
              <TouchableOpacity
                style={{
                  backgroundColor:
                    currentCollection?.pending_cards == 0
                      ? colors.warning[100]
                      : colors.warning[500],
                }}
                className="flex flex-row items-center justify-center w-full rounded-full p-2.5"
                onPress={HandleOpenStudy}
                disabled={currentCollection?.pending_cards == 0}
              >
                <Text className="text-white font-bold text-2xl">
                  {t('Study Now')}
                </Text>
                <Feather name="arrow-right" size={40} color="white" />
              </TouchableOpacity>
              {/* <View className="mt-8 flex-col w-full items-start justify-between z-10 bg-gray-100 mb-4">
                <TextInput
                  placeholder={t('Search decks...')}
                  placeholderTextColor="#888"
                  className="h-14 w-full border border-gray-300 rounded-lg pl-2 text-sm"
                />
              </View> */}
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

      {(hasRole('admin') ||
        (!currentCollection?.classroom &&
          !currentCollection?.is_book_collection)) && (
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
          onPress={HandleOpenAddDeck}
        >
          <MaterialIcons name="add" size={24} color={colors.white} />
          <Text className="text-white font-bold text-lg">{t('Add deck')}</Text>
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
        visible={openAddDeck}
        onRequestClose={closeAddDeck}
      >
        <View
          className="flex-1 justify-center md:justify-center items-center px-4"
          style={{ backgroundColor: colors.overlay.medium }}
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
              {/* Header */}
              <View className="flex flex-row justify-between items-center mb-6">
                <View className="flex-row items-center gap-3">
                  <View
                    className="rounded-full p-2"
                    style={{ backgroundColor: colors.primary[500] }}
                  >
                    <MaterialCommunityIcons
                      name="cards"
                      size={24}
                      color={colors.primary[500]}
                    />
                  </View>
                  <Text
                    className="font-bold text-2xl md:text-3xl"
                    style={{ color: colors.primary[700] }}
                  >
                    {t('New deck')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={closeAddDeck}
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

              {/* Image Selection */}
              <View className="mb-6">
                <Text
                  className="text-sm font-semibold mb-3"
                  style={{ color: colors.gray[700] }}
                >
                  {t('Deck Image')}
                </Text>
                <View className="flex flex-row items-stretch gap-3">
                  <TouchableOpacity
                    onPress={pickImage}
                    className="flex-1 border-2 border-dashed rounded-2xl p-6 flex items-center justify-center"
                    style={{
                      borderColor: colors.primary[600],
                      minHeight: 160,
                    }}
                  >
                    {selectedImage ? (
                      <View className="relative w-full h-full items-center justify-center">
                        <Image
                          style={{
                            width: 140,
                            height: 140,
                            borderRadius: 12,
                          }}
                          source={
                            typeof selectedImage === 'string'
                              ? { uri: selectedImage }
                              : selectedImage
                          }
                        />
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedImage(null);
                            setSelectedImageFromGallery(null);
                          }}
                          className="absolute -top-2 -right-2 rounded-full p-1"
                          style={{ backgroundColor: colors.error[500] }}
                        >
                          <MaterialIcons
                            name="close"
                            size={20}
                            color={colors.white}
                          />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View className="flex-col items-center justify-center">
                        <MaterialIcons
                          name="add-photo-alternate"
                          size={48}
                          color={colors.primary[500]}
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

                  <TouchableOpacity
                    onPress={() => setModalVisible(true)}
                    className="rounded-2xl p-4 items-center justify-center"
                    style={{
                      backgroundColor: colors.primary[500],
                      minWidth: 80,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="folder-multiple-image"
                      size={32}
                      color={colors.white}
                    />
                    <Text className="text-white text-xs font-semibold mt-2">
                      {t('Gallery')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Gallery Modal */}
              <Modal visible={modalVisible} animationType="slide" transparent>
                <View
                  className="flex-1 justify-end"
                  style={{ backgroundColor: colors.overlay.light }}
                >
                  <View
                    className="bg-white rounded-t-3xl p-6"
                    style={{ maxHeight: '80%' }}
                  >
                    <View className="flex-row justify-between items-center mb-4">
                      <Text
                        className="text-2xl font-bold"
                        style={{ color: colors.primary[600] }}
                      >
                        {t('Select an image')}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setModalVisible(false)}
                        className="rounded-full p-2"
                        style={{ backgroundColor: colors.gray[100] }}
                      >
                        <MaterialIcons
                          name="close"
                          size={24}
                          color={colors.gray[700]}
                        />
                      </TouchableOpacity>
                    </View>
                    <ScrollView
                      contentContainerStyle={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 12,
                        paddingBottom: 20,
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
                          className="rounded-xl overflow-hidden active:scale-95"
                          style={{
                            borderWidth: 2,
                            borderColor: colors.primary[500],
                          }}
                        >
                          <Image
                            style={{ width: 100, height: 100 }}
                            source={item.uri}
                          />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </Modal>

              {/* Name Input */}
              <View className="mb-6">
                <Text
                  className="text-sm font-semibold mb-3"
                  style={{ color: colors.gray[700] }}
                >
                  {t('Deck Name')}
                </Text>
                <View className="relative">
                  <Input
                    placeholder={t('Enter name deck')}
                    maxLength={25}
                    style={{
                      borderWidth: 2,
                      borderColor: errors['name']
                        ? colors.error[500]
                        : colors.gray[300],
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      fontSize: 16,
                    }}
                    value={formData.name}
                    onChangeText={(value) => handleInputChange('name', value)}
                  />
                  <Text
                    className="absolute right-4 top-4 text-xs"
                    style={{ color: colors.gray[400] }}
                  >
                    {characterCounter}/25
                  </Text>
                </View>
                {errors['name'] && (
                  <Text
                    className="mt-2 text-sm font-medium"
                    style={{ color: colors.error[500] }}
                  >
                    {errors['name']}
                  </Text>
                )}
              </View>

              {/* Action Buttons */}
              <View className="flex-col md:flex-row gap-3 mt-4">
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
                  onPress={HandleCreateDeck}
                  disabled={loading}
                >
                  {loading ? (
                    <Loading />
                  ) : (
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
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={closeAddDeck}
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
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
