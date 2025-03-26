import { useEffect, useState } from 'react';
import { useSession } from '@/contexts/AuthContext';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Image as ImageExpo } from 'expo-image';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { getGreeting } from '@/utils/greeting';
import { useDialog, DialogContent } from '@/components/Dialog';
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

export default function Home() {
  const { userInfo, signOut } = useSession();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { collections, setCollections, setCurrentCollection } = useCollection();

  const { setOpen } = useDialog();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageFromGallery, setSelectedImageFromGallery] = useState<
    string | null
  >(null);
  const [nameCollection, setNameCollection] = useState('');
  const [loadingCollection, setLoadingCollection] = useState(false);
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

  const HandleCreateCollection = async () => {
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
      await api.post('/collections/create', {
        name: nameCollection,
        image: url,
        user_id: userInfo?.user_id,
      });

      toast({
        message: 'Collection of deck  created successfully',
        variant: 'success',
        showProgress: true,
      });
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
      setNameCollection('');
      setSelectedImage(null);
      fetchData();
    }
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

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-12 relative">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <View className="flex flex-col justify-center items-center py-5">
            <Text className="text-[15px] text-gray-600 mb-1 font-[ComicSans]">
              {t(getGreeting())}, {userInfo?.name.toUpperCase()}!
            </Text>
            <Text
              style={{ color: colors.primary[500] }}
              className="text-2xl font-bold"
            >
              {t('New Day, Stronger Memories!')}
            </Text>
          </View>
          {loadingCollection ? (
            <Loading />
          ) : collections && collections.length > 0 ? (
            <MainDeckCard
              name={collections[0].name}
              image={collections[0].image}
              pending_cards={collections[0].pending_cards}
              total_cards={collections[0].total_cards}
              onPress={() => setCurrentCollection(collections[0])}
            />
          ) : (
            <View className="flex  items-center justify-center py-10">
              <Text className="font-[ComicSans] text-lg text-gray-500 text-center font-semibold">
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

        {collections && collections.length > 1 && (
          <>
            <Text
              style={{ color: colors.primary[600] }}
              className="text-sm font-bold my-7"
            >
              {t('CHECK OUT OTHER COLLECTIONS')}
            </Text>

            {collections.slice(1, 4).map((item) => (
              <DeckCardSecondary
                key={item._id}
                name={item.name}
                image={item.image}
                type="collection"
                pending_cards={item.pending_cards}
                total_cards={item.total_cards}
                onPress={() => setCurrentCollection(item)}
              />
            ))}
          </>
        )}
        {collections && collections.length > 4 && (
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
      </ScrollView>

      <LinearGradient
        colors={['transparent', 'white']}
        className="absolute bottom-0 left-0 right-0 h-28"
        pointerEvents="none"
      />

      <TouchableOpacity
        className="absolute bottom-7 right-7 bg-[#007AFF] rounded-full p-2.5"
        onPress={() => setOpen(true)}
      >
        <MaterialIcons name="add" size={40} color={colors.gray[100]} />
      </TouchableOpacity>

      <DialogContent className="bg-white rounded-t-lg w-full absolute flex items-center bottom-0 h-1/2 p-4">
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
                    source={{ uri: selectedImage }}
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
                      setSelectedImage(Image.resolveAssetSource(item.uri).uri);
                      setSelectedImageFromGallery(`ct_${item.id}`);
                      setModalVisible(false);
                    }}
                    className="border rounded-lg overflow-hidden"
                  >
                    <Image source={item.uri} className="w-24 h-24" />
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
          onPress={HandleCreateCollection}
        >
          <Text className="text-white text-base font-bold">
            {t('Create New deck collection')}
          </Text>
        </TouchableOpacity>
      </DialogContent>
    </View>
  );
}
