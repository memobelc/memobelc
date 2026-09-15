import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as DocumentPicker from 'expo-document-picker';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import api from '@/services/api';
import { colors } from '@/styles/colors';
import { ILesson, LessonFormat, useCollection } from '@/contexts/CollectionContext';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { LessonRichEditor } from '@/components/molecules/LessonRichEditor';
import { storage } from '../../../../../../../../../FirebaseConfig';

export default function PrepareLessonScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { courseId, lessonId, lessonTitle } = useLocalSearchParams<{
    courseId: string;
    lessonId: string;
    lessonTitle?: string;
  }>();
  const { userInfo } = useSession();
  const { toast } = useToast();
  const { currentCourse } = useCollection();

  const [lesson, setLesson] = useState<ILesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingContent, setSavingContent] = useState(false);
  const [savingVideo, setSavingVideo] = useState(false);
  const [lessonFormat, setLessonFormat] = useState<LessonFormat>('text');
  const [savingFormat, setSavingFormat] = useState(false);
  const [videoType, setVideoType] = useState<'youtube' | 'upload' | 'other'>('youtube');
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const showsText = lessonFormat === 'text' || lessonFormat === 'both';
  const showsVideo = lessonFormat === 'video' || lessonFormat === 'both';

  const isTeacher =
    !!currentCourse?.teacher_id &&
    String(currentCourse.teacher_id) === String(userInfo?.user_id);

  const fetchLesson = useCallback(async () => {
    if (!lessonId || !userInfo?.token) return;
    try {
      setLoading(true);
      const res = await api.get(`/course/lesson/${lessonId}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      const data = res.data as ILesson;
      setLesson(data);
      setLessonFormat(data.lesson_format || (data.video_url ? 'video' : 'text'));
      if (data.video_url) {
        setVideoUrl(data.video_url);
        setVideoType(
          data.video_type === 'youtube' || data.video_type === 'upload'
            ? data.video_type
            : 'other',
        );
      } else {
        setVideoUrl('');
        setVideoType('youtube');
      }
    } catch {
      toast({ message: t('Failed to load lesson'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [lessonId, userInfo?.token, t, toast]);

  useEffect(() => {
    fetchLesson();
  }, [fetchLesson]);

  useEffect(() => {
    if (!loading && !isTeacher) {
      router.back();
    }
  }, [loading, isTeacher, router]);

  const handleChangeFormat = async (format: LessonFormat) => {
    if (!lessonId || !userInfo?.token || format === lessonFormat) return;
    try {
      setSavingFormat(true);
      await api.put(
        `/course/lesson/${lessonId}`,
        { lesson_format: format },
        { headers: { Authorization: `Bearer ${userInfo.token}` } },
      );
      setLessonFormat(format);
      if (format === 'text') {
        setVideoUrl('');
      }
      fetchLesson();
      toast({ message: t('Lesson format updated'), variant: 'success' });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      toast({
        message: ax.response?.data?.error || t('Failed to update lesson format'),
        variant: 'destructive',
      });
    } finally {
      setSavingFormat(false);
    }
  };

  const handleSaveContent = async (html: string) => {
    if (!lessonId || !userInfo?.token) return;
    try {
      setSavingContent(true);
      await api.put(
        `/course/lesson/${lessonId}`,
        { content_html: html },
        { headers: { Authorization: `Bearer ${userInfo.token}` } },
      );
      toast({ message: t('Content saved successfully'), variant: 'success' });
      fetchLesson();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      toast({
        message: ax.response?.data?.error || t('Failed to save content'),
        variant: 'destructive',
      });
    } finally {
      setSavingContent(false);
    }
  };

  const handlePickAndUploadVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];
      setUploadingVideo(true);
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `videos/lessons/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);
      setVideoUrl(downloadUrl);
      setVideoType('upload');
      toast({ message: t('Video uploaded successfully'), variant: 'success' });
    } catch {
      toast({ message: t('Failed to upload video'), variant: 'destructive' });
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSaveVideo = async () => {
    if (!lessonId || !userInfo?.token) return;
    try {
      setSavingVideo(true);
      const payload = {
        video_url: videoUrl.trim(),
        video_type: videoType === 'other' ? 'other' : videoType,
        lesson_format: lessonFormat === 'text' ? 'both' : lessonFormat,
      };
      await api.put(`/course/lesson/${lessonId}`, payload, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      toast({ message: t('Video settings saved'), variant: 'success' });
      fetchLesson();
    } catch {
      toast({ message: t('Failed to save video settings'), variant: 'destructive' });
    } finally {
      setSavingVideo(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-4">
      <View className="flex-row items-center justify-between mb-4">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
          <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
          <Text style={{ color: colors.primary[500] }} className="ml-1">
            {t('Back')}
          </Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-800 flex-1 text-center mx-2" numberOfLines={1}>
          {t('Prepare lesson')}: {lesson?.title || lessonTitle}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View
          className="rounded-2xl p-4 mb-4"
          style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray[200] }}
        >
          <Text className="text-sm font-semibold text-gray-700 mb-2">{t('Lesson format')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {([
              { key: 'text' as LessonFormat, label: t('Text only') },
              { key: 'video' as LessonFormat, label: t('Video only') },
              { key: 'both' as LessonFormat, label: t('Text and video') },
            ]).map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => handleChangeFormat(opt.key)}
                disabled={savingFormat}
                className="px-3 py-2 rounded-xl"
                style={{
                  backgroundColor: lessonFormat === opt.key ? colors.primary[500] : colors.gray[100],
                }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: lessonFormat === opt.key ? colors.white : colors.gray[600] }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {showsText && (
          <>
        <Text className="text-sm font-semibold text-gray-700 mb-2 px-1">{t('Lesson content')}</Text>
        <View
          className="rounded-2xl overflow-hidden mb-6"
          style={{
            minHeight: 420,
            backgroundColor: colors.white,
            borderWidth: 1,
            borderColor: colors.gray[200],
          }}
        >
          {lesson && courseId && lessonId && (
            <LessonRichEditor
              initialContent={lesson.content_html || ''}
              courseId={String(courseId)}
              lessonId={String(lessonId)}
              onSave={handleSaveContent}
              saving={savingContent}
            />
          )}
        </View>
          </>
        )}

        {showsVideo && (
        <View
          className="rounded-2xl p-4 mb-4"
          style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray[200] }}
        >
          <Text className="text-base font-bold text-gray-800 mb-3">{t('Video')}</Text>
              <View className="flex-row flex-wrap gap-2 mb-3">
                {(['youtube', 'upload', 'other'] as const).map((vt) => (
                  <TouchableOpacity
                    key={vt}
                    onPress={() => setVideoType(vt)}
                    className="px-3 py-2 rounded-xl"
                    style={{
                      backgroundColor: videoType === vt ? colors.primary[500] : colors.gray[100],
                    }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: videoType === vt ? colors.white : colors.gray[600] }}
                    >
                      {vt === 'youtube' ? 'YouTube' : vt === 'upload' ? t('Upload') : t('Other')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {videoType === 'upload' ? (
                <TouchableOpacity
                  onPress={handlePickAndUploadVideo}
                  disabled={uploadingVideo}
                  className="border-2 border-dashed rounded-xl py-4 items-center mb-3"
                  style={{ borderColor: colors.primary[300], backgroundColor: colors.primary[50] }}
                >
                  {uploadingVideo ? (
                    <ActivityIndicator color={colors.primary[500]} />
                  ) : (
                    <>
                      <MaterialIcons name="cloud-upload" size={28} color={colors.primary[500]} />
                      <Text className="text-sm font-semibold mt-1" style={{ color: colors.primary[600] }}>
                        {videoUrl ? t('Video uploaded') : t('Upload video')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3 mb-3 text-gray-800"
                  placeholder={
                    videoType === 'youtube'
                      ? 'https://www.youtube.com/watch?v=...'
                      : t('Video URL')
                  }
                  value={videoUrl}
                  onChangeText={setVideoUrl}
                  autoCapitalize="none"
                />
              )}

              <TouchableOpacity
                onPress={handleSaveVideo}
                disabled={savingVideo}
                className="rounded-xl py-3 items-center"
                style={{ backgroundColor: colors.primary[500] }}
              >
                {savingVideo ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text className="font-bold text-white">{t('Save video settings')}</Text>
                )}
              </TouchableOpacity>
        </View>
        )}
      </ScrollView>
    </View>
  );
}
