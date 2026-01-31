import { LanguageSelectWithFlags } from '@/components/atoms/LanguageSelectWithFlags';
import api from '@/services/api';
import { colors } from '@/styles/colors';
import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface IVideosProps {
  _id: string;
  deck_id: string;
  thumbnail: string;
  title: string;
  video_id: string;
}

export default function VideoScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<IVideosProps[] | null>(null);
  const [languageVideo, setLanguageVideo] = useState('en');
  // Message in the selected video language (not app language)
  const tVideoLang = i18n.getFixedT(languageVideo);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get(
        languageVideo ? `/video/get?language=${languageVideo}` : `/video/get`,
      );

      if (response.status === 201) {
        setVideos(response.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [languageVideo]);

  return (
    <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8 relative">
      <View className="flex-row justify-between items-center w-full bg-gray-100 -mt-2 gap-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center flex-shrink-0"
        >
          <Ionicons
            name="arrow-back-circle"
            size={24}
            color={colors.primary[500]}
          />
          <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
        </TouchableOpacity>

        <LanguageSelectWithFlags
          value={languageVideo}
          onValueChange={setLanguageVideo}
          options={[
            { code: 'en', label: 'English' },
            { code: 'pt-BR', label: 'Português' },
            { code: 'es', label: 'Español' },
            { code: 'de', label: 'Deutsch' },
            { code: 'zh', label: '中文' },
          ]}
          className={Platform.OS === 'web' ? 'w-48' : 'w-32 flex-shrink-0'}
          compact={Platform.OS !== 'web'}
        />
      </View>

      {/* <TextInput
        placeholder={t('Search videos...')}
        placeholderTextColor="#888"
        className="h-14 w-full border border-gray-300 rounded-lg pl-2 text-sm"
      /> */}

      <View>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 200 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-center justify-start mt-4 mb-2">
            <MaterialIcons
              className="mr-2"
              name="ondemand-video"
              size={24}
              color="black"
            />
            <Text>{t('Discover')}</Text>
          </View>

          <View className="flex flex-row flex-wrap justify-start gap-4">
            {videos?.map((item) => (
              <TouchableOpacity
                key={item._id}
                onPress={() =>
                  router.push(
                    `./videos/youtube-video?videoId=${item.video_id}&deckId=${item.deck_id}`,
                  )
                }
                className="p-4 flex items-center justify-center  w-40 rounded-[12px]"
              >
                <View className="w-40 h-24 relative">
                  <Image
                    source={{ uri: item.thumbnail }}
                    className="w-40 h-24"
                    resizeMode="cover"
                  />

                  <View
                    className="absolute inset-0"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
                  />

                  <View className="absolute inset-0 flex items-center justify-center">
                    <FontAwesome name="play" size={24} color="white" />
                  </View>
                </View>

                <Text className="font-[ComicSans] text-sm text-center w-32">
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))}

            {videos?.length == 0 && (
              <View className="flex  items-center justify-center py-10">
                <Text className="font-[ComicSans] text-lg md:text-2xl text-gray-500 text-center font-semibold">
                  {tVideoLang('There are no videos in the selected language!')}
                </Text>
                <Image
                  style={{ width: 200, height: 200 }}
                  className="w-60 h-60"
                  source={require('@/assets/shame.png')}
                  resizeMode="cover"
                />
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
