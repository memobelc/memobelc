import React, { useState } from 'react';
import { View, Image, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/colors';
import { DialogContent, useDialog } from '@/components/Dialog';
import { CardDisplaying } from '@/components/atoms/CardDisplaying';
import { Input } from '@/components/Input';
import FlipCard from '@/components/atoms/FlipCard';
import { OpenStudy } from '@/components/atoms/openStudy';
import { useCollection } from '@/contexts/CollectionContext';
import api from '@/services/api';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';

export default function Deck() {
  const router = useRouter();

  const { currentDeck, setCollections } = useCollection();

  const { userInfo, signOut } = useSession();
  const { toast } = useToast();

  const [loadingCollection, setLoadingCollection] = useState(false);

  const { setOpen } = useDialog();
  const [openAddCard, setOpenAddCard] = useState(false);
  const [openStudy, setOpenStudy] = useState(false);
  const { name } = useLocalSearchParams();

  const [frontSide, setFrontSide] = useState('');
  const [backSide, setBackSide] = useState('');

  const [viewCArd, setViewCArd] = useState(false);

  const HandleOpenAddCard = () => {
    setOpenAddCard(true);
    setOpenStudy(false);
    setOpen(true);
  };

  const HandleOpenStudy = () => {
    setOpenStudy(true);
    setOpenAddCard(false);
    setOpen(true);
  };

  const HandleClose = () => {
    setOpen(false);
    setFrontSide('');
    setBackSide('');
    setViewCArd(false);
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

  const HandleCreateCard = async () => {
    try {
      await api.post('/card', {
        front: frontSide,
        back: backSide,
        deck_id: currentDeck?._id,
        user_id: userInfo?.user_id,
      });

      toast({
        message: 'Card created successfully',
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
      HandleClose();
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
        <Text style={{ color: colors.primary[500] }}>Back</Text>
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
            1000 out of 1200 to study
          </Text>
        </View>
      </View>

      <Text className="w-full text-gray-800 text-2xl font-bold">{name}</Text>

      <View className="my-6 w-full h-36 bg-white rounded-[12px] overflow-hidden shadow-lg">
        <Image
          source={{
            uri: 'https://travelopod.com/_next/image?url=https%3A%2F%2Fstatic.wixstatic.com%2Fmedia%2F0539f7_aee4fccbe409439e8334b9f9b5426020~mv2.jpg&w=2048&q=75',
          }}
          className="w-full h-full top-0"
        />
      </View>

      <TouchableOpacity
        style={{ backgroundColor: colors.warning[500] }}
        className="flex flex-row items-center justify-center w-full  rounded-full p-2.5"
        onPress={HandleOpenStudy}
      >
        <Text className="text-white font-bold text-2xl">Study Now</Text>
        <MaterialIcons name="arrow-right-alt" size={40} color="white" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 200, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        <CardDisplaying
          front="No problem, do you have your passport with you?"
          back="Sem problema, você tem seu passaporte com você?"
        />
        <CardDisplaying
          front="No problem, do you have your passport with you?"
          back="Sem problema, você tem seu passaporte com você?"
        />
      </ScrollView>

      <LinearGradient
        colors={['transparent', 'white']}
        className="absolute bottom-0 left-0 right-0 h-60"
        pointerEvents="none"
      />

      <TouchableOpacity
        style={{ backgroundColor: colors.primary[500] }}
        className="flex flex-row items-center justify-center w-full absolute bottom-7 rounded-full p-2"
        onPress={HandleOpenAddCard}
      >
        <Text className="text-white font-bold text-2xl">Add cards</Text>
      </TouchableOpacity>

      {openStudy && <OpenStudy open={openStudy} />}

      {openAddCard && (
        <DialogContent className="bg-white rounded-t-lg flex w-full  h-full absolute items-center bottom-0  p-4">
          <View className="flex flex-row justify-between items-center mb-2 w-full">
            <TouchableOpacity onPress={HandleClose}>
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color="black"
              />
            </TouchableOpacity>
            <View className="flex-row w-[60%] items-center justify-between">
              <Text className="font-semibold text-xl text-primary justify-center">
                New card
              </Text>
              <TouchableOpacity onPress={() => setViewCArd(!viewCArd)}>
                <MaterialCommunityIcons
                  name={!viewCArd ? 'eye' : 'eye-off'}
                  size={24}
                  color="black"
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={HandleCreateCard}
                style={{ backgroundColor: colors.primary[500] }}
                className="rounded-2xl p-2.5"
              >
                <MaterialCommunityIcons name="check" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="border-b border-gray-300 mb-4 w-full" />
          {!viewCArd ? (
            <>
              <Input
                label="Front Side"
                className="py-6 w-full"
                inputClasses="h-40"
                value={frontSide}
                onChangeText={(text) => setFrontSide(text)}
              />
              <Input
                label="Back Side"
                className="py-6 w-full"
                inputClasses="h-40"
                value={backSide}
                onChangeText={(text) => setBackSide(text)}
              />
            </>
          ) : (
            <FlipCard frontSide={frontSide} backSide={backSide} />
          )}
        </DialogContent>
      )}
    </View>
  );
}
