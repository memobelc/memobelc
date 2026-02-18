import React, { useRef, useState } from 'react';
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
  Animated,
} from 'react-native';
import { Menu } from 'lucide-react-native';
import {
  MaterialIcons,
  MaterialCommunityIcons,
  Feather,
  Ionicons,
} from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useTranslation } from 'react-i18next';
import Tooltip from 'react-native-walkthrough-tooltip';
import * as ImagePicker from 'expo-image-picker';
import * as yup from 'yup';

import api from '@/services/api';
import { colors } from '@/styles/colors';
import { IClassroom, useCollection } from '@/contexts/CollectionContext';
import { useSession } from '@/contexts/AuthContext';
import { imageSourcesDeck, setImageUrl } from '@/utils/imgSource';

import { Dialog, DialogContent, useDialog } from '@/components/Dialog';
import { Input } from '@/components/Input';
import { useToast } from '@/components/Toast';
import { Loading } from '@/components/Loading';
import { DeckCardSecondary } from '@/components/atoms/DeckCardSecondary';
import { ModalGenerateCards } from '@/components/atoms/ModalGenerateCards';

import { storage } from '../../../../../FirebaseConfig';

interface ICardProps {
  _id: number;
  front: string;
  back: string;
}

export default function Classroom() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    setCollections,
    currentCollection,
    setCurrentDeck,
    currentClassroom,
    setCurrentClassroom,
  } = useCollection();

  const { userInfo } = useSession();
  const { toast } = useToast();
  const { name } = useLocalSearchParams();
  const { setOpen } = useDialog();

  const validationSchema = yup.object().shape({
    name: yup.string().required(t('Name is required')),
  });

  const [formData, setFormData] = useState<Record<string, string>>({
    name: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [generatedCards, setGeneratedCards] = useState<ICardProps[] | []>([]);
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openAddDeck, setOpenAddDeck] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageFromGallery, setSelectedImageFromGallery] = useState<
    string | null
  >(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [tab, setTab] = useState<'content' | 'people'>('content');
  const [showTooltip, setShowTooltip] = useState(false);
  const [openCardGenerator, setOpenCardGenerator] = useState(false);
  const [characterCounter, setCharacterCounter] = useState(0);

  const [contentHeight, setContentHeight] = useState(0);
  const animation = useRef(new Animated.Value(0)).current;

  const fetchData = async () => {
    try {
      const response = await api.get('/classroom/get_classrooms', {
        headers: {
          Authorization: `Bearer ${userInfo?.token}`,
        },
      });

      if (response.status === 200) {
        setCurrentClassroom(
          response.data.classrooms.find(
            (item: IClassroom) => item._id == currentClassroom!._id,
          ),
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchCollectionData = async () => {
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

  const HandleOpenAddDeck = () => {
    setOpenAddDeck(true);
    setOpen(true);
  };

  const HandleCreateDeck = async () => {
    setErrors({});
    let url = '';

    const validateForm = async () => {
      await validationSchema.validate(formData, { abortEarly: false });
    };

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
      setLoading(true);
      await validateForm();
      await api.post('/deck/create', {
        name: formData.name,
        image: url,
        collection_id: currentCollection?._id,
        cards: generatedCards.map(({ _id, ...rest }) => rest),
      });

      toast({
        message: t('Deck created successfully'),
        variant: 'success',
        showProgress: true,
      });
      setOpen(false);
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
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));

    setCharacterCounter(value.length);
  };

  const [email, setEmail] = useState('');

  const handleAddUser = async () => {
    try {
      setLoading(true);
      const response = await api.post(
        '/classroom/add_user_in_classroom',
        {
          classroom_id: currentClassroom?._id,
          email_user: email,
        },
        {
          headers: {
            Authorization: `Bearer ${userInfo?.token}`,
          },
        },
      );
      setEmail('');

      if (response.status == 200) {
        toast({
          message: t('Invitation sent successfully'),
          variant: 'success',
          showProgress: true,
        });
        fetchData();
        fetchCollectionData();
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const closeAddDeck = async () => {
    handleInputChange('name', '');
    setOpen(false);
    setSelectedImage(null);
  };

  const [showGuests, setShowGuests] = useState(true);
  const [showStudents, setShowStudents] = useState(true);

  const toggleGuests = () => {
    setShowGuests((prev) => !prev);
  };

  const toggleStudents = () => {
    setShowStudents((prev) => !prev);
  };

  return (
    <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8 relative">
      <View className="flex-row w-full justify-between  items-center mb-4">
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
        <Text className="w-[70%] text-center text-gray-800 text-lg font-bold">
          {name}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 200, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row mb-4 border-b border-gray-300">
          <TouchableOpacity
            onPress={() => setTab('content')}
            className={`px-6 py-2 ${
              tab === 'content' ? 'border-b-2 border-primary-500' : ''
            }`}
          >
            <Text
              className={`text-lg font-bold ${tab === 'content' ? 'text-primary-500' : 'text-gray-500'}`}
            >
              {t('Content')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab('people')}
            className={`px-6 py-2 ${
              tab === 'people' ? 'border-b-2 border-primary-500' : ''
            }`}
          >
            <Text
              className={`text-lg font-bold ${tab === 'people' ? 'text-primary-500' : 'text-gray-500'}`}
            >
              {t('People')}
            </Text>
          </TouchableOpacity>
        </View>

        {tab === 'content' ? (
          <View>
            <View className="">
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

              {loadingCollection && (
                <Loading
                  color={colors.primary[500]}
                  classname="flex-1 items-center justify-center"
                />
              )}

              <View>
                {currentCollection && currentCollection.decks.length > 0 ? (
                  <>
                    {currentCollection.decks.map((item) => (
                      <DeckCardSecondary
                        key={item._id}
                        name={item.name}
                        image={item.image}
                        type="deck"
                        classroom={item._id}
                        pending_cards={item.pending_cards}
                        total_cards={item.total_cards}
                        onPress={() => setCurrentDeck(item)}
                      />
                    ))}
                  </>
                ) : (
                  <View className="flex  items-center justify-center py-10">
                    <Text className="font-[ComicSans] text-lg md:text-2xl text-gray-500 text-center font-semibold">
                      {t(
                        'Your collection is empty, add a deck to your collection',
                      )}
                    </Text>
                    <Image
                      style={{ width: 200, height: 200 }}
                      className="w-60 h-60"
                      source={require('@/assets/empty.png')}
                      resizeMode="cover"
                    />
                  </View>
                )}
              </View>
            </View>

            {openAddDeck && (
              <Dialog>
                <DialogContent
                  className="w-full px-4"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor:
                      colors.overlay?.medium || 'rgba(0,0,0,0.5)',
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
                              borderColor: colors.primary[300],
                              backgroundColor: colors.primary[50],
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

                      <Modal
                        visible={modalVisible}
                        animationType="slide"
                        transparent
                      >
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
                                style={{ color: colors.primary[700] }}
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
                                    setSelectedImageFromGallery(
                                      `dt_${item.id}`,
                                    );
                                    setModalVisible(false);
                                  }}
                                  className="rounded-xl overflow-hidden active:scale-95"
                                  style={{
                                    borderWidth: 2,
                                    borderColor: colors.primary[200],
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
                            onChangeText={(value) =>
                              handleInputChange('name', value)
                            }
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

                      <TouchableOpacity
                        style={{
                          borderColor:
                            generatedCards.length > 0
                              ? colors.primary[500]
                              : 'gray',
                        }}
                        className="border border-dashed rounded-2xl flex items-center justify-center w-full mb-4"
                        onPress={() => setOpenCardGenerator(true)}
                      >
                        <View className="flex-row items-center justify-center px-4 py-3">
                          <MaterialCommunityIcons
                            name={
                              generatedCards.length > 0
                                ? 'cards'
                                : 'star-check-outline'
                            }
                            size={24}
                            color={
                              generatedCards.length > 0
                                ? colors.primary[500]
                                : 'gray'
                            }
                            className="mr-2"
                          />
                          <Text
                            style={{
                              color:
                                generatedCards.length > 0
                                  ? colors.primary[500]
                                  : 'gray',
                            }}
                          >
                            {generatedCards.length > 0
                              ? t(`${generatedCards.length} cards generated`)
                              : t('Generate cards with AI')}
                          </Text>
                        </View>
                      </TouchableOpacity>

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
                                {t('Create New deck')}
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

                      <ModalGenerateCards
                        open={openCardGenerator}
                        setOpen={setOpenCardGenerator}
                        setGeneratedCards={setGeneratedCards}
                      />
                    </ScrollView>
                  </View>
                </DialogContent>
              </Dialog>
            )}
          </View>
        ) : (
          <View className="flex-1 p-5 bg-white">
            <Text className="text-2xl font-bold mb-5">{t('Add New User')}</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-2 mb-3"
              placeholder={t('Enter user email')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <Pressable
              onPress={handleAddUser}
              className="bg-blue-500 px-4 py-2 rounded-lg mb-5 self-start"
              disabled={loading}
            >
              {loading ? (
                <Loading />
              ) : (
                <Text className="text-white font-medium">{t('Add User')}</Text>
              )}
            </Pressable>

            {currentClassroom && currentClassroom?.guests.length > 0 && (
              <>
                <Pressable onPress={toggleGuests}>
                  <View className="flex-row items-center mb-2">
                    <Text className="text-xl font-semibold mr-2">
                      {t('Guests')}
                    </Text>
                    <Tooltip
                      isVisible={showTooltip}
                      content={
                        <Text className="text-sm">
                          {t('Users not registered on the platform yet.')}
                        </Text>
                      }
                      placement="top"
                      onClose={() => setShowTooltip(false)}
                    >
                      <Pressable onPress={() => setShowTooltip(true)}>
                        <View
                          // @ts-ignore
                          onMouseEnter={() => setShowTooltip(true)}
                          onMouseLeave={() => setShowTooltip(false)}
                        >
                          <Feather
                            name="info"
                            size={16}
                            color={colors.primary[500]}
                          />
                        </View>
                      </Pressable>
                    </Tooltip>
                  </View>
                </Pressable>

                {showGuests &&
                  currentClassroom.guests.map((item: string, index: number) => (
                    <View
                      key={item + index}
                      className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200"
                    >
                      <Text className="text-sm text-gray-600">{item}</Text>
                      <Pressable className="p-2 rounded-full hover:bg-gray-100">
                        <Menu size={20} color="#6b7280" />
                      </Pressable>
                    </View>
                  ))}
              </>
            )}

            <Pressable onPress={toggleStudents}>
              <Text className="text-xl font-semibold mb-2">{t('Users')}</Text>
            </Pressable>

            {showStudents &&
              currentClassroom &&
              currentClassroom.students.map((item: any, index: number) => (
                <View
                  key={item.email + index}
                  className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200"
                >
                  <View>
                    <Text className="text-base font-semibold">{item.name}</Text>
                    <Text className="text-sm text-gray-600">{item.email}</Text>
                  </View>
                  <Pressable className="p-2 rounded-full hover:bg-gray-100">
                    <Menu size={20} color="#6b7280" />
                  </Pressable>
                </View>
              ))}
          </View>
        )}
        <LinearGradient
          colors={['transparent', `${colors.gray[100]}`]}
          className="absolute bottom-0 left-0 right-0 h-60"
          pointerEvents="none"
        />
      </ScrollView>

      {tab === 'content' && (
        <TouchableOpacity
          className="absolute bottom-7 right-7 bg-[#007AFF] rounded-full p-2.5"
          onPress={HandleOpenAddDeck}
        >
          <MaterialIcons name="add" size={40} color={colors.gray[100]} />
        </TouchableOpacity>
      )}
    </View>
  );
}
