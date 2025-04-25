import React, { useEffect, useState } from 'react';
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  FlatList,
  TextInput,
} from 'react-native';
import { Menu } from 'lucide-react-native';
import {
  MaterialIcons,
  MaterialCommunityIcons,
  Feather,
} from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useTranslation } from 'react-i18next';
import Tooltip from 'react-native-walkthrough-tooltip';

import { storage } from '../../../../../FirebaseConfig';
import { colors } from '@/styles/colors';
import { DialogContent, useDialog } from '@/components/Dialog';
import { Input } from '@/components/Input';
import { OpenStudy } from '@/components/atoms/openStudy';
import { IClassroom, useCollection } from '@/contexts/CollectionContext';
import api from '@/services/api';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { imageSourcesDeck, setImageUrl } from '@/utils/imgSource';
import { Loading } from '@/components/Loading';
import { DeckCardSecondary } from '@/components/atoms/DeckCardSecondary';

type Student = {
  name?: string;
  email: string;
};

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

  const [loadingCollection, setLoadingCollection] = useState(false);
  const [openStudy, setOpenStudy] = useState(false);
  const [openAddDeck, setOpenAddDeck] = useState(false);
  const [nameDeck, setNameDeck] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageFromGallery, setSelectedImageFromGallery] = useState<
    string | null
  >(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [tab, setTab] = useState<'content' | 'people'>('content');
  const [showTooltip, setShowTooltip] = useState(false);

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

  const [email, setEmail] = useState('');

  const handleAddUser = async () => {
    try {
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
          message: 'Invitation sent successfully',
          variant: 'success',
          showProgress: true,
        });
        fetchData();
        fetchCollectionData();
      }
    } catch (error) {}
  };

  useEffect(() => {
    console.log(currentClassroom);
  }, []);

  return (
    <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8 relative">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 200, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex flex-row justify-center items-center mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center mr-5"
          >
            <Ionicons
              name="arrow-back-circle"
              size={24}
              color={colors.primary[500]}
            />
            <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
          </TouchableOpacity>
          <Text className="w-full text-center text-gray-800 text-2xl font-bold">
            {name}
          </Text>
        </View>
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
              {t('people')}
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

              {loadingCollection && <Loading color={colors.primary[500]} />}

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

            {openStudy && <OpenStudy open={openStudy} />}

            {openAddDeck && (
              <DialogContent className="bg-white rounded-t-lg w-full absolute flex items-center bottom-0 h-3/4 p-4">
                <View className="flex flex-row justify-between items-center mb-2 w-full">
                  <Text className="font-semibold text-xl text-primary justify-center">
                    {t('New deck')}
                  </Text>
                  <TouchableOpacity onPress={() => setOpen(false)}>
                    <MaterialIcons
                      name="close"
                      size={24}
                      color={colors.gray[950]}
                    />
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
                          <MaterialIcons
                            name="cloud-upload"
                            size={40}
                            color="gray"
                          />
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

                  <Modal
                    visible={modalVisible}
                    animationType="slide"
                    transparent
                  >
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
                        <Text className="text-white text-center">
                          {t('Cancel')}
                        </Text>
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
        ) : (
          <View className="flex-1 p-5 bg-white">
            <Text className="text-2xl font-bold mb-5">Add New User</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-2 mb-3"
              placeholder="Enter user email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <Pressable
              onPress={handleAddUser}
              className="bg-blue-500 px-4 py-2 rounded-lg mb-5 self-start"
            >
              <Text className="text-white font-medium">Add User</Text>
            </Pressable>

            {currentClassroom && currentClassroom?.guests.length > 0 && (
              <>
                <View className="flex-row items-center mb-2">
                  <Text className="text-xl font-semibold mr-2">Guests</Text>
                  <Tooltip
                    isVisible={showTooltip}
                    content={
                      <Text className="text-sm">
                        Users not registered on the platform yet.
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
                <FlatList
                  data={currentClassroom.guests}
                  keyExtractor={(item) => item}
                  renderItem={({ item }: any) => (
                    <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
                      <View>
                        <Text className="text-sm text-gray-600">{item}</Text>
                      </View>
                      <Pressable className="p-2 rounded-full hover:bg-gray-100">
                        <Menu size={20} color="#6b7280" />
                      </Pressable>
                    </View>
                  )}
                  contentContainerStyle={{ paddingBottom: 20 }}
                />
              </>
            )}

            <Text className="text-xl font-semibold mb-2">Users</Text>
            <FlatList
              data={currentClassroom!.students}
              keyExtractor={(item) => item.email}
              renderItem={({ item }: any) => (
                <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
                  <View>
                    <Text className="text-base font-semibold">{item.name}</Text>

                    <Text className="text-sm text-gray-600">{item.email}</Text>
                  </View>
                  <Pressable className="p-2 rounded-full hover:bg-gray-100">
                    <Menu size={20} color="#6b7280" />
                  </Pressable>
                </View>
              )}
              ListEmptyComponent={
                <View className="items-center justify-center p-5">
                  <Text className="text-gray-500">
                    {t('No people added yet.')}
                  </Text>
                </View>
              }
              contentContainerStyle={{ paddingBottom: 20 }}
            />
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
