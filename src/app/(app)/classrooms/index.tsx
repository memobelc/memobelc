import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
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
import { useTranslation } from 'react-i18next';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import * as yup from 'yup';

import api from '@/services/api';
import { colors } from '@/styles/colors';
import { IClassroom, useCollection } from '@/contexts/CollectionContext';
import { useSession } from '@/contexts/AuthContext';
import { imageSources, setImageUrl } from '@/utils/imgSource';

import { Input } from '@/components/Input';
import { useToast } from '@/components/Toast';
import { DialogContent, useDialog } from '@/components/Dialog';
import { Loading } from '@/components/Loading';
import { OpenDialogInput } from '@/components/atoms/DialogInput';
import { MainDeckCard } from '@/components/atoms/MainDeckCard';

import { storage } from '../../../../FirebaseConfig';

export default function Classrooms() {
  const { userInfo } = useSession();
  const {
    collections,
    setCollections,
    setCurrentCollection,
    setCurrentClassroom,
  } = useCollection();
  const { setOpen } = useDialog();
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();

  const validationSchema = yup.object().shape({
    name: yup.string().required(t('Name is required')),
  });

  const [formData, setFormData] = useState<Record<string, string>>({
    name: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [addNewClass, setAddNewClass] = useState(false);
  const [loadingClassroom, setLoadingClassroom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [classrooms, setClassrooms] = useState<IClassroom[] | []>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageFromGallery, setSelectedImageFromGallery] = useState<
    string | null
  >(null);
  const [openCreateCollection, setOpenCreateCollection] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [characterCounter, setCharacterCounter] = useState(0);

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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));

    setCharacterCounter(value.length);
  };

  const handleAddNewClass = () => {
    setAddNewClass(true);
    setOpenCreateCollection(false);
    setOpen(true);
  };

  const setOpenCreateClassroom = () => {
    setOpenCreateCollection(true);
    setAddNewClass(false);
    setOpen(true);
  };

  const handleCreateClassroom = async (collection_id?: string) => {
    setErrors({});

    const validateForm = async () => {
      await validationSchema.validate(formData, { abortEarly: false });
    };

    if (collection_id) {
      try {
        setLoading(true);
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

        setOpenCreateCollection(false);
        setAddNewClass(false);
        setOpen(false);
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
            message: `An unexpected error has occurred`,
            variant: 'destructive',
          });
        }
      } finally {
        fetchCollectionData();
        fetchData();
        setLoading(false);
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
        await validateForm();
        const response = await api.post('/collections/create', {
          name: formData.name,
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

        setOpenCreateCollection(false);
        setAddNewClass(false);
        setOpen(false);
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
            message: `An unexpected error has occurred`,
            variant: 'destructive',
          });
        }
      } finally {
        fetchCollectionData();
        fetchData();
      }
    }
  };

  const close = async () => {
    handleInputChange('name', '');
    setOpen(false);
    setSelectedImage(null);
  };

  const handleSetClassroom = (classroom_id: string) => {
    const collection = collections?.find((e) => e.classroom === classroom_id);
    setCurrentCollection(collection ?? null);
  };
  useEffect(() => {
    fetchData();
  }, []);

  return (
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

        <TouchableOpacity onPress={() => handleAddNewClass()}>
          <View className=" bg-white p-2 rounded-[12px] shadow-lg flex-row justify-center items-center">
            <AntDesign name="pluscircleo" size={24} color="black" />
          </View>
        </TouchableOpacity>
      </View>
      {loadingClassroom ? (
        <Loading />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 200, paddingTop: 50 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row flex-wrap justify-center gap-4 px-2">
            {classrooms.map((classroom, index) => (
              <View key={index}>
                <MainDeckCard
                  name={classroom.name}
                  image={classroom.image}
                  type="class"
                  students={classroom.students.length}
                  onPress={() => {
                    handleSetClassroom(classroom._id);
                    setCurrentClassroom(classroom);
                  }}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {addNewClass && (
        <OpenDialogInput
          open={addNewClass}
          title={t('Select the desired collection')}
        >
          <View className="w-full max-h-[80vh]">
            <ScrollView
              contentContainerStyle={{ paddingBottom: 200, paddingTop: 25 }}
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
                    {t('Create a new Collection')}
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
            <TouchableOpacity onPress={close}>
              <MaterialIcons name="close" size={24} color={colors.gray[950]} />
            </TouchableOpacity>
          </View>

          <View className="border-b border-gray-300 mb-4 w-full" />

          <View>
            <View className="flex flex-row items-center justify-between">
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
                    justifyContent: 'center',
                    alignItems: 'center',
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

          <View className="flex-row relative">
            <Input
              placeholder={t('Enter name deck collection')}
              maxLength={25}
              style={[
                {
                  borderWidth: 1,
                  borderColor: errors['name'] ? 'red' : '#ccc',
                  borderRadius: 8,
                },
              ]}
              className={`my-6 w-full`}
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
            />
            <Text className="absolute top-9 right-1 text-xs text-gray-400">
              {characterCounter}/25
            </Text>
          </View>

          <Text
            className="-mt-6 mb-2 text-xs"
            style={{ color: colors.error[500] }}
          >
            {errors['name']}
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: colors.primary[500] }}
            className="w-full max-w-[500px] py-2 rounded-3xl items-center mb-5"
            onPress={() => handleCreateClassroom()}
          >
            {loading ? (
              <Loading />
            ) : (
              <Text className="text-white text-base font-bold my-2">
                {t('Create New deck collection')}
              </Text>
            )}
          </TouchableOpacity>
        </DialogContent>
      )}
    </View>
  );
}
