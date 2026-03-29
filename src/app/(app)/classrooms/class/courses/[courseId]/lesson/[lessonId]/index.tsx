import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import YoutubeIframe from 'react-native-youtube-iframe';
import { WebView } from 'react-native-webview';

import api from '@/services/api';
import { colors } from '@/styles/colors';
import { ILesson } from '@/contexts/CollectionContext';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export default function LessonViewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { lessonId, lessonTitle } = useLocalSearchParams<{
    lessonId: string;
    lessonTitle: string;
  }>();
  const { userInfo } = useSession();
  const { toast } = useToast();

  const [lesson, setLesson] = useState<ILesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [playerReady, setPlayerReady] = useState(false);
  const [markedViewed, setMarkedViewed] = useState(false);

  const fetchLesson = useCallback(async () => {
    if (!lessonId) return;
    try {
      setLoading(true);
      const res = await api.get(`/course/lesson/${lessonId}`, {
        headers: { Authorization: `Bearer ${userInfo?.token}` },
      });
      setLesson(res.data);
    } catch {
      toast({ message: t('Failed to load lesson'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [lessonId, userInfo?.token]);

  useEffect(() => {
    fetchLesson();
  }, [fetchLesson]);

  // Mark lesson as viewed for students (fire-and-forget)
  useEffect(() => {
    if (!lessonId || !userInfo?.token || markedViewed) return;
    setMarkedViewed(true);
    api
      .post(
        `/course/lesson/${lessonId}/viewed`,
        {},
        { headers: { Authorization: `Bearer ${userInfo?.token}` } },
      )
      .catch(() => {/* silently ignore */});
  }, [lessonId, userInfo?.token]);

  const renderVideo = () => {
    if (!lesson?.video_url) {
      return (
        <View
          className="w-full items-center justify-center rounded-2xl"
          style={{ height: 200, backgroundColor: colors.gray[100] }}
        >
          <MaterialCommunityIcons
            name="video-off-outline"
            size={48}
            color={colors.gray[400]}
          />
          <Text className="text-gray-400 mt-2">{t('No video available')}</Text>
        </View>
      );
    }

    if (lesson.video_type === 'youtube') {
      const videoId = extractYoutubeId(lesson.video_url);
      if (!videoId) {
        return (
          <TouchableOpacity
            className="w-full rounded-2xl overflow-hidden items-center justify-center py-8"
            style={{ backgroundColor: colors.primary[50], borderWidth: 1, borderColor: colors.primary[200] }}
            onPress={() => Linking.openURL(lesson.video_url)}
          >
            <MaterialCommunityIcons name="youtube" size={48} color="#FF0000" />
            <Text className="text-primary-600 font-semibold mt-2">
              {t('Open on YouTube')}
            </Text>
          </TouchableOpacity>
        );
      }
      return (
        <View className="w-full rounded-2xl overflow-hidden" style={{ aspectRatio: 16 / 9 }}>
          <YoutubeIframe
            height={0}
            width={0}
            videoId={videoId}
            onReady={() => setPlayerReady(true)}
            webViewStyle={{ flex: 1 }}
          />
          {!playerReady && (
            <View
              className="absolute inset-0 items-center justify-center"
              style={{ backgroundColor: colors.gray[900] }}
            >
              <ActivityIndicator color={colors.white} size="large" />
            </View>
          )}
        </View>
      );
    }

    if (lesson.video_type === 'upload' || lesson.video_type === 'other') {
      if (Platform.OS === 'web') {
        return (
          <View className="w-full rounded-2xl overflow-hidden" style={{ aspectRatio: 16 / 9 }}>
            {/* Native HTML5 video element for web */}
            <video
              src={lesson.video_url}
              controls
              style={{ width: '100%', height: '100%', borderRadius: 16, background: '#000' }}
            />
          </View>
        );
      }
      // Native: use WebView with an inline HTML5 video player
      return (
        <View className="w-full rounded-2xl overflow-hidden" style={{ aspectRatio: 16 / 9 }}>
          <WebView
            source={{
              html: `<html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh">
                <video src="${lesson.video_url}" controls autoplay style="width:100%;max-height:100vh" playsinline></video>
              </body></html>`,
            }}
            style={{ flex: 1 }}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
          />
        </View>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8">
      {/* Header */}
      <View className="flex-row w-full justify-between items-center mb-6">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
          <Text style={{ color: colors.primary[500] }} className="ml-1">
            {t('Back')}
          </Text>
        </TouchableOpacity>
        <Text
          className="text-xl font-bold text-gray-800 flex-1 text-center mx-2"
          numberOfLines={1}
        >
          {lessonTitle || lesson?.title}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Video Player */}
        <View className="mb-6">{renderVideo()}</View>

        {/* Lesson info */}
        <View
          className="rounded-2xl p-5"
          style={{
            backgroundColor: colors.white,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.07,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <Text className="text-xl font-bold text-gray-800 mb-2">
            {lesson?.title}
          </Text>
          {lesson?.scheduled_at && (
            <View
              className="flex-row items-center gap-1 mb-3 px-3 py-1.5 rounded-lg self-start"
              style={{ backgroundColor: colors.warning[100] }}
            >
              <MaterialIcons name="schedule" size={14} color={colors.warning[700]} />
              <Text className="text-xs font-semibold" style={{ color: colors.warning[700] }}>
                {t('Scheduled for')} {new Date(lesson.scheduled_at).toLocaleString()}
              </Text>
            </View>
          )}
          {!!lesson?.description && (
            <Text className="text-gray-600 leading-6">{lesson.description}</Text>
          )}
          {!lesson?.description && (
            <Text className="text-gray-400 italic">{t('No description')}</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
