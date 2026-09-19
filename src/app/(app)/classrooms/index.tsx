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
import { useHasRole } from '@/hooks/useHasRole';
import { imageSources, setImageUrl } from '@/utils/imgSource';

import { Input } from '@/components/Input';
import { useToast } from '@/components/Toast';
import { useDialog } from '@/components/Dialog';
import { Loading } from '@/components/Loading';
import TourTarget from '@/components/atoms/TourTarget';
import { OpenDialogInput } from '@/components/atoms/DialogInput';
import { MainDeckCard } from '@/components/atoms/MainDeckCard';

import { storage } from '../../../../FirebaseConfig';

export default function Classrooms() {
  const { userInfo } = useSession();
  const { hasRole } = useHasRole();
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
          message: t('Classroom created successfully'),
          variant: 'success',
          showProgress: true,
        });

        setOpenCreateCollection(false);
        setAddNewClass(false);
        setOpen(false);
      } catch (error: any) {
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
        fetchCollectionData();
        fetchData();
        setLoading(false);
      }
    } else {
      let url = '';
      try {
        setLoading(true);
        if (selectedImage && !selectedImageFromGallery) {
          const response = await fetch(selectedImage);
          const blob = await response.blob();
          const storageRef = ref(storage, `images/decks/${Date.now()}`);

          await uploadBytes(storageRef, blob);
          url = await getDownloadURL(storageRef);
        } else {
          url = selectedImageFromGallery!;
        }

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
          message: t('Classroom created successfully'),
          variant: 'success',
          showProgress: true,
        });

        setOpenCreateCollection(false);
        setAddNewClass(false);
        setOpen(false);
      } catch (error: any) {
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
        fetchCollectionData();
        fetchData();
        setLoading(false);
      }
    }
  };

  const close = async () => {
    handleInputChange('name', '');
    setOpenCreateCollection(false);
    setOpen(false);
    setSelectedImage(null);
    setSelectedImageFromGallery(null);
  };

  const handleSetClassroom = (classroom_id: string) => {
    const collection = collections?.find((e) => e.classroom === classroom_id);
    setCurrentCollection(collection ?? null);
  };
  useEffect(() => {
    fetchData();
    fetchCollectionData();
  }, []);

  return (
    <TourTarget id="classrooms_list">
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

        {hasRole('teacher') ? (
          <TouchableOpacity onPress={() => handleAddNewClass()}>
            <View className=" bg-white p-2 rounded-[12px] shadow-lg flex-row justify-center items-center">
              <AntDesign name="plus-circle" size={24} color="black" />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>
      {loadingClassroom ? (
        <Loading classname="flex-1 items-center justify-center" />
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
          onClose={() => {
            setAddNewClass(false);
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
                  <AntDesign name="plus-circle" size={24} color="black" />

                  <Text className="font-[ComicSans] text-xl font-bold pb-3  px-6">
                    {t('Create a new Collection')}
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </OpenDialogInput>
      )}

      <Modal
        transparent
        animationType="slide"
        visible={openCreateCollection}
        onRequestClose={close}
      >
        <View
          className="flex-1 justify-center items-center px-4"
          style={{ backgroundColor: colors.overlay?.medium || 'rgba(0,0,0,0.5)' }}
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
                    onPress={close}
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
                  <View className="flex flex-row items-stretch gap-3">
                    <TouchableOpacity
                      onPress={pickImage}
                      className="flex-1 border-2 border-dashed rounded-2xl p-6 flex items-center justify-center"
                      style={{
                        borderColor: colors.primary[300],
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
                        {imageSources.map((item) => (
                          <TouchableOpacity
                            key={item.id}
                            onPress={() => {
                              setSelectedImage(item.uri);
                              setSelectedImageFromGallery(`ct_${item.id}`);
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
                    {t('Collection Name')}
                  </Text>
                  <View className="relative">
                    <Input
                      placeholder={t('Enter name deck collection')}
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
                    onPress={() => handleCreateClassroom()}
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
                    onPress={close}
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
    </TourTarget>
  );
}
