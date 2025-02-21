import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import YoutubeIframe from 'react-native-youtube-iframe';
import * as ScreenOrientation from 'expo-screen-orientation';

import { Loading } from '@/components/Loading';
import { colors } from '@/styles/colors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CardDisplaying } from '@/components/atoms/CardDisplaying';
import api from '@/services/api';

interface IcardProps {
  _id: string;
  back: string;
  created_at: string;
  front: string;
  media_type: any;
  updated_at: string;
}

const YouTubeVideo = () => {
  const router = useRouter();

  const { videoId, deckId } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const VIDEO_HEIGHT = ((width - 48) / 16) * 9;
  const [videoReady, setVideoReady] = useState(false);

  const [cards, setCards] = useState<IcardProps[] | []>([]);

  const onFullScreenChange = useCallback((isFullScreen: boolean) => {
    if (isFullScreen) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } else {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
    }
  }, []);

  const fetchCardsData = async () => {
    try {
      const response = await api.get(`/card/get_cards_by_deck/${deckId}`);

      if (response.status === 200) {
        setCards(response.data.cards);
      }
    } catch (error) {
      console.error(error);
    } finally {
    }
  };

  useEffect(() => {
    fetchCardsData();
  }, []);

  return (
    <View className="flex-1 p-6">
      <TouchableOpacity
        onPress={() => router.back()}
        className="flex-row items-center"
      >
        <Ionicons
          name="arrow-back-circle"
          size={24}
          color={colors.primary[500]}
        />
        <Text style={{ color: colors.primary[500] }}>Back</Text>
      </TouchableOpacity>
      <View className="w-full h-[180]">
        <YoutubeIframe
          videoId={videoId as string}
          width={width - 48}
          height={videoReady ? VIDEO_HEIGHT : 0}
          onReady={() => setVideoReady(true)}
          onFullScreenChange={onFullScreenChange}
        />
        {!videoReady && <Loading color={colors.primary[500]} />}
      </View>
      <TouchableOpacity
        style={{ backgroundColor: colors.primary[500] }}
        className=" mt-10 flex flex-row items-center justify-center w-full  rounded-full p-2.5"
        onPress={() => {}}
      >
        <Text className="text-white font-bold text-2xl">Save Deck</Text>
        <MaterialCommunityIcons name="cards-outline" size={24} color="white" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 200, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        {cards &&
          cards.map((item) => (
            <CardDisplaying
              key={item._id}
              front={item.front}
              back={item.back}
            />
          ))}
      </ScrollView>

      <LinearGradient
        colors={['transparent', 'white']}
        className="absolute bottom-0 left-0 right-0 h-60"
        pointerEvents="none"
      />
    </View>
  );
};

export default YouTubeVideo;
