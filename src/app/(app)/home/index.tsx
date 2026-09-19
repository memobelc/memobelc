import { useEffect, useState } from 'react';
import { useSession } from '@/contexts/AuthContext';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Image as ImageExpo } from 'expo-image';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { getGreeting } from '@/utils/greeting';
// Dialog removido, agora usando Modal diretamente
import { Input } from '@/components/Input';
import { colors } from '@/styles/colors';
import { MainDeckCard } from '@/components/atoms/MainDeckCard';
import { DeckCardSecondary } from '@/components/atoms/DeckCardSecondary';

import { storage } from '../../../../FirebaseConfig';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useToast } from '@/components/Toast';
import api from '@/services/api';
import { useCollection } from '@/contexts/CollectionContext';
import { Loading } from '@/components/Loading';
import { useTranslation } from 'react-i18next';
import { imageSources } from '@/utils/imgSource';
import * as yup from 'yup';
import StudyStreak from '@/components/atoms/StudyStreak';
import { NotificationPermissionCard } from '@/components/atoms/NotificationPermissionCard';

export default function Home() {
  const { userInfo } = useSession();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { collections, setCollections, setCurrentCollection } = useCollection();

  const validationSchema = yup.object().shape({
    name: yup.string().required(t('Name is required')),
  });

  const [formData, setFormData] = useState<Record<string, string>>({
    name: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Removido useDialog, agora usando Modal diretamente
  const [openAddCollection, setOpenAddCollection] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageFromGallery, setSelectedImageFromGallery] = useState<
    string | null
  >(null);
  const [loadingCollection, setLoadingCollection] = useState(true);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [characterCounter, setCharacterCounter] = useState(0);
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;

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

  const HandleCreateCollection = async () => {
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

    const createCollection = async (imageUrl: string) => {
      await api.post('/collections/create', {
        name: formData.name,
        image: imageUrl,
        user_id: userInfo?.user_id,
      });

      toast({
        message: t('Collection of deck created successfully'),
        variant: 'success',
        showProgress: true,
      });
    };

    try {
      setLoading(true);
      await validateForm();
      url = await uploadImageIfNeeded();
      await createCollection(url);
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
      setOpenAddCollection(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));

    setCharacterCounter(value.length);
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

  const closeAddCollection = async () => {
    handleInputChange('name', '');
    setOpenAddCollection(false);
    setSelectedImage(null);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8 relative">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          className={` flex  ${
            !collections || collections.length == 0
              ? 'flex-col'
              : 'flex-col md:flex-row '
          }  justify-center md:justify-between`}
        >
          <View className="flex flex-col md:w-[60%] justify-start md:justify-center items-start py-5">
            <Text className="text-lg md:text-2xl text-gray-600 mb-1 font-[ComicSans]">
              {t(getGreeting())}, {userInfo?.name.split(' ')[0].toUpperCase()}!
            </Text>
            <Text
              style={{ color: colors.primary[500] }}
              className="text-sm md:text-4xl font-bold"
            >
              {t('New Day, Stronger Memories!')}
            </Text>
          </View>
          {loadingCollection ? (
            <Loading classname="flex-1 items-center justify-center" />
          ) : collections && collections.length > 0 ? (
            <View className="flex items-center md:items-end md:w-[30%]">
              <MainDeckCard
                name={collections[0].name}
                image={collections[0].image}
                pending_cards={collections[0].pending_cards}
                type={'collection'}
                total_cards={collections[0].total_cards}
                onPress={() => setCurrentCollection(collections[0])}
              />
            </View>
          ) : (
            <View className="flex  items-center justify-center py-10">
              <Text className="font-[ComicSans] text-lg md:text-2xl text-gray-500 text-center font-semibold">
                {t(
                  'Every great journey begins with a single step. Start your first collection today and take your learning to new heights!',
                )}
              </Text>
              <Image
                style={{ width: 200, height: 200 }}
                className="w-60 h-60"
                source={require('@/assets/1.png')}
                resizeMode="cover"
              />
            </View>
          )}
        </View>

        <NotificationPermissionCard />

        {collections && collections.length > 1 && (
          <>
            <Text
              style={{ color: colors.primary[600] }}
              className="text-sm font-bold my-7"
            >
              {t('CHECK OUT OTHER COLLECTIONS')}
            </Text>

            {!isSmallScreen ? (
              <FlatList
                key={width < 1024 ? 'two-columns' : 'three-columns'}
                data={collections}
                keyExtractor={(item) => item._id}
                numColumns={width < 1024 ? 2 : 3}
                columnWrapperStyle={{ justifyContent: 'flex-start' }}
                renderItem={({ item }) => (
                  <View className="w-[48%] lg:w-[31%] mx-[1%] p-[1%]">
                    <DeckCardSecondary
                      name={item.name}
                      image={item.image}
                      type="collection"
                      pending_cards={item.pending_cards}
                      total_cards={item.total_cards}
                      onPress={() => setCurrentCollection(item)}
                    />
                  </View>
                )}
              />
            ) : (
              collections
                .slice(1, 4)
                .map((item) => (
                  <DeckCardSecondary
                    key={item._id}
                    name={item.name}
                    image={item.image}
                    type="collection"
                    pending_cards={item.pending_cards}
                    total_cards={item.total_cards}
                    onPress={() => setCurrentCollection(item)}
                  />
                ))
            )}
          </>
        )}

        {isSmallScreen && collections && collections.length > 4 && (
          <Link href="./collections" asChild>
            <TouchableOpacity className="w-full flex flex-row items-center justify-end">
              <Text style={{ color: colors.primary[500] }}>
                {t('See all your decks')}
              </Text>
              <MaterialIcons
                name="arrow-right-alt"
                size={24}
                color={colors.primary[500]}
              />
            </TouchableOpacity>
          </Link>
        )}

        {/* Study Streak Component */}
        <View className="mt-8 mb-4">
          <StudyStreak />
        </View>
      </ScrollView>

      <LinearGradient
        colors={['transparent', `${colors.gray[100]}`]}
        className="absolute bottom-0 left-0 right-0 h-28"
        pointerEvents="none"
      />

      <TouchableOpacity
        style={{
          backgroundColor: colors.primary[500],
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
        className="absolute bottom-7 right-7 rounded-full p-4 active:scale-95"
        onPress={() => {
          setOpenAddCollection(true);
        }}
      >
        <MaterialIcons name="add" size={32} color={colors.white} />
      </TouchableOpacity>

      <Modal
        transparent
        animationType="slide"
        visible={openAddCollection}
        onRequestClose={closeAddCollection}
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
                  onPress={closeAddCollection}
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
                  {t('Collection Image')}
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

              {/* Name Input */}
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
                  onPress={HandleCreateCollection}
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
                  onPress={closeAddCollection}
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
