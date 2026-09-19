import { useState, useEffect } from 'react';
import { DeckCardSecondary } from '@/components/atoms/DeckCardSecondary';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '@/styles/colors';
import { useCollection } from '@/contexts/CollectionContext';
import { useTranslation } from 'react-i18next';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
// Dialog removido, agora usando Modal diretamente
import { Input } from '@/components/Input';
import { Loading } from '@/components/Loading';
import TourTarget from '@/components/atoms/TourTarget';
import { storage } from '../../../../FirebaseConfig';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import api from '@/services/api';
import * as yup from 'yup';
import { imageSources, setImageUrl } from '@/utils/imgSource';

type Collection = {
  _id: string;
  name: string;
  image: string | null;
  pending_cards: number;
  total_cards: number;
  classroom?: string | null;
  is_book_collection?: boolean;
  book_id?: string;
  book_titulo?: string;
};

export default function AllCollections() {
  const { t } = useTranslation();
  const router = useRouter();
  const { collections, setCurrentCollection, setCollections } = useCollection();
  const { userInfo } = useSession();
  const { toast } = useToast();
  // Removido useDialog, agora usando Modal diretamente

  const validationSchema = yup.object().shape({
    name: yup.string().required(t('Name is required')),
  });

  const [formData, setFormData] = useState<Record<string, string>>({
    name: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [openAddCollection, setOpenAddCollection] = useState(false);
  const [openEditCollection, setOpenEditCollection] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageFromGallery, setSelectedImageFromGallery] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [characterCounter, setCharacterCounter] = useState(0);
  const [collectionToEdit, setCollectionToEdit] = useState<Collection | null>(
    null,
  );
  const [collectionToDelete, setCollectionToDelete] =
    useState<Collection | null>(null);

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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
    setCharacterCounter(value.length);
  };

  const fetchData = async () => {
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

  const HandleEditCollection = (collection: Collection) => {
    setCollectionToEdit(collection);
    setFormData({ name: collection.name });
    setCharacterCounter(collection.name.length);
    setSelectedImage(null);
    setSelectedImageFromGallery(null);

    // Se a imagem começa com 'ct_', é da galeria
    if (collection.image && collection.image.startsWith('ct_')) {
      const imageId = Number(collection.image.split('_')[1]);
      setSelectedImageFromGallery(collection.image);
      const galleryImage = imageSources.find((img) => img.id === imageId);
      if (galleryImage) {
        setSelectedImage(galleryImage.uri);
      } else {
        setSelectedImage(imageSources[0].uri);
      }
    } else if (collection.image) {
      setSelectedImage(collection.image);
      setSelectedImageFromGallery(null);
    }

    setOpenEditCollection(true);
  };

  const HandleDeleteCollection = (collection: Collection) => {
    setCollectionToDelete(collection);
    setOpenDeleteModal(true);
  };

  const HandleConfirmDelete = async () => {
    if (!collectionToDelete) return;

    const collectionIdToDelete = collectionToDelete._id;

    try {
      setLoading(true);
      await api.delete(`/collections/delete/${collectionIdToDelete}`, {
        headers: {
          Authorization: `Bearer ${userInfo?.token}`,
        },
      });

      // Remove a collection da lista imediatamente após confirmação do servidor
      if (collections) {
        setCollections(
          collections.filter((c) => c._id !== collectionIdToDelete),
        );
      }

      toast({
        message: t('Collection deleted successfully'),
        variant: 'success',
        showProgress: true,
      });

      setOpenDeleteModal(false);
      setCollectionToDelete(null);

      // Atualiza os dados do servidor para garantir sincronização completa
      await fetchData();
    } catch (error) {
      // Em caso de erro, buscar os dados novamente do servidor para garantir sincronização
      await fetchData();

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
      setLoading(false);
    }
  };

  const HandleUpdateCollection = async () => {
    if (!collectionToEdit) return;

    setErrors({});
    let url = '';

    const validateForm = async () => {
      await validationSchema.validate(formData, { abortEarly: false });
    };

    const uploadImageIfNeeded = async (): Promise<string> => {
      if (selectedImage && !selectedImageFromGallery) {
        // Nova imagem - fazer upload
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        const storageRef = ref(storage, `images/decks/${Date.now()}`);
        await uploadBytes(storageRef, blob);
        return await getDownloadURL(storageRef);
      }

      // Usar imagem existente ou da galeria
      return (
        selectedImageFromGallery ||
        selectedImage ||
        collectionToEdit.image ||
        ''
      );
    };

    const updateCollection = async (imageUrl: string) => {
      await api.put(
        `/collections/update/${collectionToEdit._id}`,
        {
          name: formData.name,
          image: imageUrl,
        },
        {
          headers: {
            Authorization: `Bearer ${userInfo?.token}`,
          },
        },
      );

      toast({
        message: t('Collection updated successfully'),
        variant: 'success',
        showProgress: true,
      });
    };

    try {
      setLoading(true);
      await validateForm();
      url = await uploadImageIfNeeded();
      await updateCollection(url);
      setSelectedImage(null);
      setSelectedImageFromGallery(null);
      setOpenEditCollection(false);
      setCollectionToEdit(null);
      await fetchData();
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
      setLoading(false);
    }
  };

  const closeEditCollection = () => {
    setFormData({ name: '' });
    setOpenEditCollection(false);
    setSelectedImage(null);
    setSelectedImageFromGallery(null);
    setCollectionToEdit(null);
    setCharacterCounter(0);
  };

  return (
    <TourTarget id="collections_list">
    <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8 relative">
      <View
        className="absolute top-0 left-0 right-0 flex-col w-full items-start
             justify-between z-10 bg-gray-100 -mt-2"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center mb-3 ml-3"
        >
          <Ionicons
            name="arrow-back-circle"
            size={24}
            color={colors.primary[500]}
          />
          <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
        </TouchableOpacity>
      </View>
      <View
        style={
          Platform.OS === 'web' ? { flex: 1, height: '100%' } : { flex: 1 }
        }
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: 100,
            paddingBottom: 200,
          }}
          showsVerticalScrollIndicator={false}
        >
          {collections && collections.length >= 1 && (
            <>
              {collections.map((item) => {
                const isClassroom = !!item.classroom;
                const isBookCollection = !!item.is_book_collection;
                const noEditDelete = isClassroom || isBookCollection;

                return (
                  <DeckCardSecondary
                    key={item._id}
                    name={
                      item.is_book_collection && item.book_titulo
                        ? item.book_titulo
                        : item.name
                    }
                    image={item.image}
                    type="collection"
                    classroom={item.classroom || undefined}
                    isBookCollection={!!item.is_book_collection}
                    pending_cards={item.pending_cards}
                    total_cards={item.total_cards}
                    onPress={() => setCurrentCollection(item)}
                    {...(!noEditDelete && {
                      onEdit: () => HandleEditCollection(item),
                      onDelete: () => HandleDeleteCollection(item),
                    })}
                  />
                );
              })}
            </>
          )}
        </ScrollView>
      </View>

      <LinearGradient
        colors={['transparent', `${colors.gray[100]}`]}
        className="absolute bottom-0 left-0 right-0 h-28"
        pointerEvents="none"
      />

      {/* Modal de confirmação de exclusão */}
      <Modal
        visible={openDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenDeleteModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white rounded-lg p-6 w-full max-w-md">
            <Text
              className="text-xl font-bold mb-4"
              style={{ color: colors.error[500] }}
            >
              {t('Confirm Deletion')}
            </Text>
            <Text className="text-base mb-6 text-gray-700">
              {t(
                'You are sure you want to delete? All data will be deleted, all cards and all study progress will be lost...',
              )}
            </Text>
            <View className="flex-row justify-end gap-3">
              <TouchableOpacity
                onPress={() => {
                  setOpenDeleteModal(false);
                  setCollectionToDelete(null);
                }}
                className="px-6 py-3 rounded-lg bg-gray-200"
              >
                <Text className="text-gray-700 font-semibold">
                  {t('Cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={HandleConfirmDelete}
                disabled={loading}
                className="px-6 py-3 rounded-lg"
                style={{ backgroundColor: colors.error[500] }}
              >
                {loading ? (
                  <Loading />
                ) : (
                  <Text className="text-white font-semibold">
                    {t('Delete')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de edição */}
      <Modal
        transparent
        animationType="slide"
        visible={openEditCollection}
        onRequestClose={closeEditCollection}
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
                    <MaterialIcons
                      name="edit"
                      size={24}
                      color={colors.primary[500]}
                    />
                  </View>
                  <Text
                    className="font-bold text-2xl md:text-3xl"
                    style={{ color: colors.primary[700] }}
                  >
                    {t('Edit Collection')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={closeEditCollection}
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
                  onPress={HandleUpdateCollection}
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
                        {t('Update Collection')}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={closeEditCollection}
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
