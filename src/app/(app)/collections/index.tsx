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
          message: 'An unexpected error has occurred',
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
          message: 'An unexpected error has occurred',
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

                return (
                  <DeckCardSecondary
                    key={item._id}
                    name={item.name}
                    image={item.image}
                    type="collection"
                    classroom={item.classroom || undefined}
                    pending_cards={item.pending_cards}
                    total_cards={item.total_cards}
                    onPress={() => setCurrentCollection(item)}
                    {...(!isClassroom && {
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
        <View className="flex-1 justify-end items-center bg-black/75">
          <TouchableOpacity
            className="bg-white rounded-t-lg w-full absolute flex items-center bottom-0 h-3/4 p-4"
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex flex-row justify-between items-center mb-2 w-full">
              <Text className="font-semibold text-xl text-primary justify-center">
                {t('Edit Collection')}
              </Text>
              <TouchableOpacity onPress={closeEditCollection}>
                <MaterialIcons
                  name="close"
                  size={24}
                  color={colors.gray[950]}
                />
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
                  className="rounded-lg flex-col items-start justify-start p-5 w-[20%]"
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
                    <Text className="text-white text-center">
                      {t('Cancel')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Modal>
            </View>

            <View className="flex-row relative w-full max-w-[500]">
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

            <Text className="-mt-5 mb-5" style={{ color: colors.error[500] }}>
              {errors['name']}
            </Text>

            <TouchableOpacity
              style={{ backgroundColor: colors.primary[500] }}
              className="w-full max-w-[500px] rounded-3xl py-2 items-center mb-5"
              onPress={HandleUpdateCollection}
              disabled={loading}
            >
              {loading ? (
                <Loading />
              ) : (
                <Text className="text-white text-base font-bold my-2">
                  {t('Update Collection')}
                </Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
