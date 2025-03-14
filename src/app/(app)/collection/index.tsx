import { useState } from 'react';

import {
  View,
  Image,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useTranslation } from 'react-i18next';

import { DialogContent, useDialog } from '@/components/Dialog';
import { DeckCardSecondary } from '@/components/atoms/DeckCardSecondary';
import { Input } from '@/components/Input';
import { OpenStudy } from '@/components/atoms/openStudy';
import { useToast } from '@/components/Toast';
import api from '@/services/api';
import { useCollection } from '@/contexts/CollectionContext';
import { useSession } from '@/contexts/AuthContext';
import { colors } from '@/styles/colors';

import { storage } from '../../../../FirebaseConfig';

export default function Collection() {
  const { setCollections, currentCollection, setCurrentDeck } = useCollection();
  const { userInfo, signOut } = useSession();
  const { toast } = useToast();
  const { t } = useTranslation();

  const router = useRouter();
  const { setOpen } = useDialog();
  const [openAddDeck, setOpenAddDeck] = useState(false);
  const [openStudy, setOpenStudy] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [nameDeck, setNameDeck] = useState('');
  const [loadingCollection, setLoadingCollection] = useState(false);
  const { name } = useLocalSearchParams();

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

  const HandleOpenStudy = () => {
    setOpenStudy(true);
    setOpenAddDeck(false);
    setOpen(true);
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

  const HandleCreateDeck = async () => {
    if (!selectedImage) return;

    const response = await fetch(selectedImage);
    const blob = await response.blob();
    const storageRef = ref(storage, `images/decks/${Date.now()}`);

    try {
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

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

  return (
    <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8 relative">
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
        <MaterialIcons name="language" size={24} color="#000" />
        <View className="flex bg-red-100 px-2 py-1 rounded-md items-center justify-center flex-row">
          <MaterialCommunityIcons
            className="pr-2"
            name="cards"
            size={24}
            color={colors.error[600]}
          />
          <Text className="text-xs color-red-700">
            {currentCollection?.total_cards != 0
              ? `${currentCollection?.pending_cards} out of ${currentCollection?.total_cards} to study`
              : 'No cards added yet'}
          </Text>
        </View>
      </View>

      <Text className="w-full text-gray-800 text-2xl font-bold">{name}</Text>

      <View className="my-6 w-full h-40 bg-white rounded-[12px] overflow-hidden shadow-lg">
        <Image
          source={{
            uri: currentCollection?.image
              ? currentCollection?.image
              : 'https://images.prismic.io/website-b2c/Zu2_orVsGrYSvo18_ingles-britanico-2-.jpg?auto=format,compress',
          }}
          className="w-full h-full top-0"
        />
      </View>

      <TouchableOpacity
        style={{ backgroundColor: colors.warning[500] }}
        className="flex flex-row items-center justify-center w-full  rounded-full p-2.5"
        onPress={HandleOpenStudy}
      >
        <Text className="text-white font-bold text-2xl">{t('Study Now')}</Text>
        <MaterialIcons name="arrow-right-alt" size={40} color="white" />
      </TouchableOpacity>

      <View className="mt-8 flex-col w-full items-start justify-between z-10 bg-gray-100 mb-4">
        <TextInput
          placeholder={t('Search decks...')}
          placeholderTextColor="#888"
          className="h-14 w-full border border-gray-300 rounded-lg pl-2 text-sm"
        />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 200, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        {currentCollection && (
          <>
            {currentCollection.decks.map((item) => (
              <DeckCardSecondary
                key={item._id}
                name={item.name}
                image={
                  item.image ||
                  'https://images.prismic.io/website-b2c/Zu2_orVsGrYSvo18_ingles-britanico-2-.jpg?auto=format,compress'
                }
                type="deck"
                pending_cards={item.pending_cards}
                total_cards={item.total_cards}
                onPress={() => setCurrentDeck(item)}
              />
            ))}
          </>
        )}
      </ScrollView>

      <LinearGradient
        colors={['transparent', 'white']}
        className="absolute bottom-0 left-0 right-0 h-60"
        pointerEvents="none"
      />

      <TouchableOpacity
        style={{ backgroundColor: colors.primary[500] }}
        className="flex flex-row items-center justify-center w-full absolute bottom-7 rounded-full p-2"
        onPress={HandleOpenAddDeck}
      >
        <Text className="text-white font-bold text-2xl">{t('Add deck')}</Text>
      </TouchableOpacity>

      {openStudy && <OpenStudy open={openStudy} />}

      {openAddDeck && (
        <DialogContent className="bg-white rounded-t-lg flex w-full absolute items-center bottom-0 h-1/2 p-4">
          <View className="flex flex-row justify-between items-center mb-2 w-full">
            <Text className="font-semibold text-xl text-primary justify-center">
              {t('New deck')}
            </Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <MaterialIcons name="close" size={24} color={colors.gray[950]} />
            </TouchableOpacity>
          </View>

          <View className="border-b border-gray-300 mb-4 w-full" />

          <TouchableOpacity
            onPress={pickImage}
            className="border border-dashed border-gray-400 rounded-lg p-10 flex items-center justify-center w-full"
          >
            {selectedImage ? (
              <View className="relative">
                <Image
                  source={{ uri: selectedImage }}
                  className="w-32 h-32 rounded-lg"
                />
                <View className="bg-slate-100 absolute -top-2 -right-2 w-6 rounded-md">
                  <MaterialIcons
                    onPress={() => setSelectedImage(null)}
                    name="close"
                    size={24}
                    color="red"
                    className=""
                  />
                </View>
              </View>
            ) : (
              <View className="flex-col items-center justify-center ">
                <MaterialIcons name="cloud-upload" size={40} color="gray" />
                <Text className="text-gray-500 mt-2 ">
                  {t('Tap to send an image')}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <Input placeholder={t('Enter name deck')} className="py-6 w-full" />
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
  );
}
