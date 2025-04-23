import { DeckCardSecondary } from '@/components/atoms/DeckCardSecondary';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Image,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  AntDesign,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/colors';
import { useCollection } from '@/contexts/CollectionContext';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { OpenDialogInput } from '@/components/atoms/DialogInput';
import { Loading } from '@/components/Loading';
import { MainDeckCard } from '@/components/atoms/MainDeckCard';
import { useSession } from '@/contexts/AuthContext';
import api from '@/services/api';
import { DialogContent, useDialog } from '@/components/Dialog';
import { imageSources, setImageUrl } from '@/utils/imgSource';

import { storage } from '../../../../FirebaseConfig';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Input } from '@/components/Input';
import { useToast } from '@/components/Toast';

interface IClassroomProps {
  _id: string;
  name: string;
  image: string;
  students: string[];
}

export default function Classrooms() {
  const { userInfo } = useSession();
  const { collections, setCollections, setCurrentCollection } = useCollection();
  const { setOpen } = useDialog();
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();

  const [openStudy, setOpenStudy] = useState(true);
  const [loadingClassroom, setLoadingClassroom] = useState(false);
  const [classrooms, setClassrooms] = useState<IClassroomProps[] | []>([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageFromGallery, setSelectedImageFromGallery] = useState<
    string | null
  >(null);
  const [nameCollection, setNameCollection] = useState('');
  const [openCreateCollection, setOpenCreateCollection] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const pickImage = async () => {
    setSelectedImageFromGallery(null);
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

  const fetchData = async () => {
    setLoadingClassroom(true);
    try {
      const response = await api.get('/classroom/get_classrooms', {
        headers: {
          Authorization: `Bearer ${userInfo?.token}`,
        },
      });

      if (response.status === 200) {
        setClassrooms(response.data.classrooms);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingClassroom(false);
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

  const handleOpenStudy = () => {
    setOpenStudy(true);
    setOpenCreateCollection(false);
    setOpen(true);
  };

  const setOpenCreateClassroom = () => {
    setOpenCreateCollection(true);
    setOpenStudy(false);
    setOpen(true);
  };

  const handleCreateClassroom = async (collection_id?: string) => {
    if (collection_id) {
      setSelectedCollection(collection_id);

      try {
        await api.post(
          '/classroom/create',
          {
            collection_id,
          },
          {
            headers: {
              Authorization: `Bearer ${userInfo?.token}`,
            },
          },
        );
        toast({
          message: 'Classroom  created successfully',
          variant: 'success',
          showProgress: true,
        });
      } catch (error) {
        toast({
          message: `An unexpected error has occurred`,
          variant: 'destructive',
        });
      } finally {
        setOpenCreateCollection(false);
        setOpenStudy(false);
        setOpen(false);
        fetchCollectionData();
        fetchData();
      }
    } else {
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
        const response = await api.post('/collections/create', {
          name: nameCollection,
          image: url,
          user_id: userInfo?.user_id,
        });

        await api.post(
          '/classroom/create',
          {
            collection_id: response.data.collection_id,
          },
          {
            headers: {
              Authorization: `Bearer ${userInfo?.token}`,
            },
          },
        );
        toast({
          message: 'Classroom  created successfully',
          variant: 'success',
          showProgress: true,
        });
      } catch (error) {
        if (error instanceof Error) {
          console.error(error.message);
        }
      } finally {
        setOpenCreateCollection(false);
        setOpenStudy(false);
        setOpen(false);
        fetchCollectionData();
        fetchData();
      }
    }
  };

  const handleSetClassroom = (classroom_id: string) => {
    const collection = collections?.find((e) => e.classroom === classroom_id);
    setCurrentCollection(collection ?? null);
  };
  useEffect(() => {
    fetchData();
  }, []);

  return loadingClassroom ? (
    <Loading />
  ) : (
    <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8 relative">
      <View
        className="absolute top-0 left-0 right-0 flex-row w-full items-center
           justify-between z-10 bg-gray-100 -mt-2"
      >
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

        <Text>{t('My classrooms')}</Text>

        <TouchableOpacity onPress={() => handleOpenStudy()}>
          <View className=" bg-white p-2 rounded-[12px] shadow-lg flex-row justify-center items-center">
            <AntDesign name="pluscircleo" size={24} color="black" />
          </View>
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 200, paddingTop: 50 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row flex-wrap justify-center gap-4 px-4">
          {classrooms.map((deck, index) => (
            <View key={index} className="w-[47%] md:w-[30%]">
              <MainDeckCard
                name={deck.name}
                image={deck.image}
                type="class"
                students={deck.students.length}
                onPress={() => handleSetClassroom(deck._id)}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      {openStudy && (
        <OpenDialogInput open={openStudy} title="Select the desired collection">
          <View className="w-full">
            <ScrollView
              contentContainerStyle={{ paddingBottom: 200, paddingTop: 100 }}
              showsVerticalScrollIndicator={false}
            >
              {collections && collections.length >= 1 && (
                <>
                  {collections.map(
                    (item) =>
                      !item.classroom && (
                        <TouchableOpacity
                          key={item._id}
                          onPress={() => handleCreateClassroom(item._id)}
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
                      ),
                  )}
                </>
              )}
              <TouchableOpacity onPress={() => setOpenCreateClassroom()}>
                <View className="w-full md:w-[50%] h-[100px] mx-auto bg-white rounded-[12px]  relative shadow-lg my-3 flex-col justify-center items-center">
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
        <DialogContent className="bg-white rounded-t-lg w-full absolute flex items-center bottom-0 h-3/4 p-4">
          <View className="flex flex-row justify-between items-center mb-2 w-full">
            <Text className="font-semibold text-xl text-primary justify-center">
              {t('New deck collection')}
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
                  {imageSources.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => {
                        setSelectedImage(item.uri);
                        setSelectedImageFromGallery(`ct_${item.id}`);
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
            value={nameCollection}
            onChangeText={(text) => setNameCollection(text)}
          />
          <TouchableOpacity
            style={{ backgroundColor: colors.primary[500] }}
            className="w-full max-w-[500px] py-4 rounded-3xl items-center mb-5"
            onPress={() => handleCreateClassroom()}
          >
            <Text className="text-white text-base font-bold">
              {t('Create New deck collection')}
            </Text>
          </TouchableOpacity>
        </DialogContent>
      )}
    </View>
  );
}
