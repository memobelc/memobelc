import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  Feather,
} from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as DocumentPicker from 'expo-document-picker';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../../../../../../../FirebaseConfig';

import api from '@/services/api';
import { colors } from '@/styles/colors';
import {
  ICourse,
  ICourseModule,
  ILesson,
  IActivity,
  useCollection,
} from '@/contexts/CollectionContext';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';

type ContentItem =
  | (ILesson & { itemType: 'lesson' })
  | (IActivity & { itemType: 'activity' });

function getYoutubeVideoId(url: string): string | null {
  const regExp =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

export default function CourseDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { courseId, courseName } = useLocalSearchParams<{
    courseId: string;
    courseName: string;
  }>();
  const { userInfo } = useSession();
  const { toast } = useToast();
  const { setCurrentCourse } = useCollection();

  const isTeacher = userInfo?.role === 'teacher';

  const [course, setCourse] = useState<ICourse | null>(null);
  const [loading, setLoading] = useState(true);

  // Module modal
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingModule, setEditingModule] = useState<ICourseModule | null>(null);
  const [moduleName, setModuleName] = useState('');
  const [moduleUseSchedule, setModuleUseSchedule] = useState(false);
  const [moduleScheduledAt, setModuleScheduledAt] = useState('');
  const [savingModule, setSavingModule] = useState(false);

  // Lesson modal
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonModuleId, setLessonModuleId] = useState('');
  const [editingLesson, setEditingLesson] = useState<ILesson | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [lessonVideoType, setLessonVideoType] = useState<'youtube' | 'upload' | 'other'>('youtube');
  const [lessonDescription, setLessonDescription] = useState('');
  const [lessonVisible, setLessonVisible] = useState(true);
  const [lessonUseSchedule, setLessonUseSchedule] = useState(false);
  const [lessonScheduledAt, setLessonScheduledAt] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);

  // Activity modal
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityModuleId, setActivityModuleId] = useState('');
  const [editingActivity, setEditingActivity] = useState<IActivity | null>(null);
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [activityVisible, setActivityVisible] = useState(true);
  const [activityUseSchedule, setActivityUseSchedule] = useState(false);
  const [activityScheduledAt, setActivityScheduledAt] = useState('');
  const [savingActivity, setSavingActivity] = useState(false);

  const fetchCourse = useCallback(async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      const res = await api.get(`/course/${courseId}`, {
        headers: { Authorization: `Bearer ${userInfo?.token}` },
      });
      setCourse(res.data);
      setCurrentCourse(res.data);
    } catch {
      toast({ message: t('Failed to load course'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [courseId, userInfo?.token]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  // ── Module CRUD ────────────────────────────────────────────────────────────

  const openCreateModule = () => {
    setEditingModule(null);
    setModuleName('');
    setModuleUseSchedule(false);
    setModuleScheduledAt('');
    setShowModuleModal(true);
  };

  const openEditModule = (mod: ICourseModule) => {
    setEditingModule(mod);
    setModuleName(mod.name);
    const hasSched = !!mod.scheduled_at;
    setModuleUseSchedule(hasSched);
    setModuleScheduledAt(hasSched ? mod.scheduled_at!.substring(0, 16) : '');
    setShowModuleModal(true);
  };

  const handleSaveModule = async () => {
    if (!moduleName.trim()) return;
    try {
      setSavingModule(true);
      const payload: Record<string, any> = {
        name: moduleName.trim(),
        scheduled_at: moduleUseSchedule && moduleScheduledAt ? moduleScheduledAt : null,
      };
      if (editingModule) {
        await api.put(
          `/course/module/${editingModule._id}`,
          payload,
          { headers: { Authorization: `Bearer ${userInfo?.token}` } },
        );
      } else {
        await api.post(
          '/course/module/create',
          { ...payload, course_id: courseId },
          { headers: { Authorization: `Bearer ${userInfo?.token}` } },
        );
      }
      setShowModuleModal(false);
      fetchCourse();
    } catch {
      toast({ message: t('Failed to save module'), variant: 'destructive' });
    } finally {
      setSavingModule(false);
    }
  };

  const handleDeleteModule = (mod: ICourseModule) => {
    Alert.alert(
      t('Delete Module'),
      t('This will delete the module and all its contents. Continue?'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/course/module/${mod._id}`, {
                headers: { Authorization: `Bearer ${userInfo?.token}` },
              });
              fetchCourse();
            } catch {
              toast({ message: t('Failed to delete module'), variant: 'destructive' });
            }
          },
        },
      ],
    );
  };

  const handleReorderModuleUp = async (mod: ICourseModule, index: number) => {
    if (!course?.modules || index === 0) return;
    const newOrder = [...course.modules];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    try {
      await api.put(
        `/course/${courseId}/modules/reorder`,
        { module_ids: newOrder.map((m) => m._id) },
        { headers: { Authorization: `Bearer ${userInfo?.token}` } },
      );
      fetchCourse();
    } catch {
      toast({ message: t('Failed to reorder'), variant: 'destructive' });
    }
  };

  const handleReorderModuleDown = async (mod: ICourseModule, index: number) => {
    if (!course?.modules || index === course.modules.length - 1) return;
    const newOrder = [...course.modules];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    try {
      await api.put(
        `/course/${courseId}/modules/reorder`,
        { module_ids: newOrder.map((m) => m._id) },
        { headers: { Authorization: `Bearer ${userInfo?.token}` } },
      );
      fetchCourse();
    } catch {
      toast({ message: t('Failed to reorder'), variant: 'destructive' });
    }
  };

  // ── Lesson CRUD ────────────────────────────────────────────────────────────

  const openCreateLesson = (moduleId: string) => {
    setEditingLesson(null);
    setLessonModuleId(moduleId);
    setLessonTitle('');
    setLessonVideoUrl('');
    setLessonVideoType('youtube');
    setLessonDescription('');
    setLessonVisible(true);
    setLessonUseSchedule(false);
    setLessonScheduledAt('');
    setShowLessonModal(true);
  };

  const openEditLesson = (lesson: ILesson) => {
    setEditingLesson(lesson);
    setLessonModuleId(lesson.module_id);
    setLessonTitle(lesson.title);
    setLessonVideoUrl(lesson.video_url);
    setLessonVideoType(lesson.video_type as any);
    setLessonDescription(lesson.description);
    setLessonVisible(lesson.visible);
    const hasSched = !!lesson.scheduled_at;
    setLessonUseSchedule(hasSched);
    setLessonScheduledAt(hasSched ? lesson.scheduled_at!.substring(0, 16) : '');
    setShowLessonModal(true);
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
      setLessonVideoUrl(downloadUrl);
      setLessonVideoType('upload');
      toast({ message: t('Video uploaded successfully'), variant: 'success' });
    } catch {
      toast({ message: t('Failed to upload video'), variant: 'destructive' });
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSaveLesson = async () => {
    if (!lessonTitle.trim()) return;
    try {
      setSavingLesson(true);
      const payload: Record<string, any> = {
        title: lessonTitle.trim(),
        video_url: lessonVideoUrl.trim(),
        video_type: lessonVideoType,
        description: lessonDescription.trim(),
        visible: lessonUseSchedule ? false : lessonVisible,
        module_id: lessonModuleId,
        course_id: courseId,
        scheduled_at: lessonUseSchedule && lessonScheduledAt ? lessonScheduledAt : null,
      };
      if (editingLesson) {
        await api.put(`/course/lesson/${editingLesson._id}`, payload, {
          headers: { Authorization: `Bearer ${userInfo?.token}` },
        });
      } else {
        await api.post('/course/lesson/create', payload, {
          headers: { Authorization: `Bearer ${userInfo?.token}` },
        });
      }
      setShowLessonModal(false);
      fetchCourse();
    } catch {
      toast({ message: t('Failed to save lesson'), variant: 'destructive' });
    } finally {
      setSavingLesson(false);
    }
  };

  const handleDeleteLesson = (lesson: ILesson) => {
    Alert.alert(t('Delete Lesson'), t('Are you sure?'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/course/lesson/${lesson._id}`, {
              headers: { Authorization: `Bearer ${userInfo?.token}` },
            });
            fetchCourse();
          } catch {
            toast({ message: t('Failed to delete lesson'), variant: 'destructive' });
          }
        },
      },
    ]);
  };

  const handleToggleLessonVisibility = async (lesson: ILesson) => {
    try {
      await api.put(
        `/course/lesson/${lesson._id}`,
        { visible: !lesson.visible },
        { headers: { Authorization: `Bearer ${userInfo?.token}` } },
      );
      fetchCourse();
    } catch {
      toast({ message: t('Failed to update visibility'), variant: 'destructive' });
    }
  };

  // ── Activity CRUD ──────────────────────────────────────────────────────────

  const openCreateActivity = (moduleId: string) => {
    setEditingActivity(null);
    setActivityModuleId(moduleId);
    setActivityTitle('');
    setActivityDescription('');
    setActivityVisible(true);
    setActivityUseSchedule(false);
    setActivityScheduledAt('');
    setShowActivityModal(true);
  };

  const openEditActivity = (activity: IActivity) => {
    setEditingActivity(activity);
    setActivityModuleId(activity.module_id);
    setActivityTitle(activity.title);
    setActivityDescription(activity.description);
    setActivityVisible(activity.visible);
    const hasSched = !!activity.scheduled_at;
    setActivityUseSchedule(hasSched);
    setActivityScheduledAt(hasSched ? activity.scheduled_at!.substring(0, 16) : '');
    setShowActivityModal(true);
  };

  const handleSaveActivity = async () => {
    if (!activityTitle.trim()) return;
    try {
      setSavingActivity(true);
      const payload: Record<string, any> = {
        title: activityTitle.trim(),
        description: activityDescription.trim(),
        visible: activityUseSchedule ? false : activityVisible,
        module_id: activityModuleId,
        course_id: courseId,
        scheduled_at: activityUseSchedule && activityScheduledAt ? activityScheduledAt : null,
      };
      if (editingActivity) {
        await api.put(`/course/activity/${editingActivity._id}`, payload, {
          headers: { Authorization: `Bearer ${userInfo?.token}` },
        });
      } else {
        await api.post('/course/activity/create', payload, {
          headers: { Authorization: `Bearer ${userInfo?.token}` },
        });
      }
      setShowActivityModal(false);
      fetchCourse();
    } catch {
      toast({ message: t('Failed to save activity'), variant: 'destructive' });
    } finally {
      setSavingActivity(false);
    }
  };

  const handleDeleteActivity = (activity: IActivity) => {
    Alert.alert(t('Delete Activity'), t('Are you sure?'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/course/activity/${activity._id}`, {
              headers: { Authorization: `Bearer ${userInfo?.token}` },
            });
            fetchCourse();
          } catch {
            toast({ message: t('Failed to delete activity'), variant: 'destructive' });
          }
        },
      },
    ]);
  };

  const handleToggleActivityVisibility = async (activity: IActivity) => {
    try {
      await api.put(
        `/course/activity/${activity._id}`,
        { visible: !activity.visible },
        { headers: { Authorization: `Bearer ${userInfo?.token}` } },
      );
      fetchCourse();
    } catch {
      toast({ message: t('Failed to update visibility'), variant: 'destructive' });
    }
  };

  // ── Navigation ─────────────────────────────────────────────────────────────

  const handleOpenLesson = (lesson: ILesson) => {
    router.push({
      pathname: '/classrooms/class/courses/[courseId]/lesson/[lessonId]' as any,
      params: { courseId, lessonId: lesson._id, lessonTitle: lesson.title },
    });
  };

  const handleOpenActivity = (activity: IActivity) => {
    router.push({
      pathname: '/classrooms/class/courses/[courseId]/activity/[activityId]' as any,
      params: {
        courseId,
        activityId: activity._id,
        activityTitle: activity.title,
      },
    });
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
        <Text className="text-xl font-bold text-gray-800 flex-1 text-center mx-2" numberOfLines={1}>
          {courseName || course?.name}
        </Text>
        {isTeacher ? (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/classrooms/class/courses/[courseId]/progress' as any,
                params: { courseId, courseName: courseName || course?.name },
              })
            }
            className="flex-row items-center gap-1 px-2 py-1 rounded-xl"
            style={{ backgroundColor: colors.primary[50] }}
          >
            <MaterialIcons name="bar-chart" size={18} color={colors.primary[500]} />
            <Text className="text-xs font-semibold" style={{ color: colors.primary[500] }}>
              {t('Progress')}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {course?.description ? (
        <Text className="text-gray-500 text-sm mb-5 text-center">
          {course.description}
        </Text>
      ) : null}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {(!course?.modules || course.modules.length === 0) && (
          <View className="items-center py-16">
            <MaterialCommunityIcons
              name="folder-open-outline"
              size={56}
              color={colors.gray[300]}
            />
            <Text className="text-gray-400 text-base font-semibold mt-3 text-center">
              {isTeacher
                ? t('No modules yet. Add your first module below!')
                : t('No content available yet.')}
            </Text>
          </View>
        )}

        {course?.modules?.map((mod, modIndex) => (
          <View
            key={mod._id}
            className="mb-5 rounded-2xl overflow-hidden"
            style={{
              backgroundColor: colors.white,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.07,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {/* Module header */}
            <View
              className="px-5 py-3 flex-row items-center justify-between"
              style={{ backgroundColor: colors.primary[500] }}
            >
              <View className="flex-1 mr-2">
                <Text className="text-white font-bold text-base" numberOfLines={1}>
                  {t('Module')} {modIndex + 1}: {mod.name}
                </Text>
                {/* Schedule badge — only visible to teacher */}
                {isTeacher && mod.scheduled_at && (
                  <View className="flex-row items-center gap-1 mt-0.5">
                    <MaterialIcons name="schedule" size={11} color="rgba(255,255,255,0.85)" />
                    <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.85)' }}>
                      {new Date(mod.scheduled_at) > new Date()
                        ? `${t('Releases')} ${new Date(mod.scheduled_at).toLocaleString()}`
                        : `${t('Released')} ${new Date(mod.scheduled_at).toLocaleString()}`}
                    </Text>
                  </View>
                )}
              </View>
              {isTeacher && (
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity onPress={() => handleReorderModuleUp(mod, modIndex)}>
                    <MaterialIcons name="keyboard-arrow-up" size={22} color="rgba(255,255,255,0.8)" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleReorderModuleDown(mod, modIndex)}>
                    <MaterialIcons name="keyboard-arrow-down" size={22} color="rgba(255,255,255,0.8)" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => openEditModule(mod)}>
                    <Feather name="edit-2" size={18} color="rgba(255,255,255,0.9)" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteModule(mod)}>
                    <MaterialIcons name="delete-outline" size={20} color="rgba(255,255,255,0.9)" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Lessons */}
            {(mod.lessons ?? []).length === 0 && (mod.activities ?? []).length === 0 ? (
              <View className="px-5 py-4">
                <Text className="text-gray-400 text-sm italic">
                  {isTeacher
                    ? t('No content. Add lessons or activities below.')
                    : t('No content available.')}
                </Text>
              </View>
            ) : null}

            {(mod.lessons ?? []).map((lesson) => (
              <TouchableOpacity
                key={lesson._id}
                onPress={() => handleOpenLesson(lesson)}
                className="flex-row items-center px-5 py-3 border-b border-gray-100"
                style={!lesson.visible ? { opacity: 0.5 } : undefined}
              >
                <View
                  className="rounded-full p-2 mr-3"
                  style={{ backgroundColor: colors.primary[50] }}
                >
                  <MaterialCommunityIcons
                    name="play-circle-outline"
                    size={20}
                    color={colors.primary[500]}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-800 font-semibold text-sm" numberOfLines={1}>
                    {lesson.title}
                  </Text>
                  {lesson.scheduled_at && (
                    <View className="flex-row items-center mt-0.5 gap-1">
                      <MaterialIcons name="schedule" size={11} color={colors.warning[600]} />
                      <Text className="text-xs" style={{ color: colors.warning[600] }}>
                        {new Date(lesson.scheduled_at).toLocaleString()}
                      </Text>
                    </View>
                  )}
                  {!lesson.visible && !lesson.scheduled_at && (
                    <Text className="text-xs text-gray-400 mt-0.5">{t('Hidden')}</Text>
                  )}
                </View>
                {isTeacher && (
                  <View className="flex-row items-center gap-3">
                    <TouchableOpacity onPress={() => handleToggleLessonVisibility(lesson)}>
                      <MaterialIcons
                        name={lesson.visible ? 'visibility' : 'visibility-off'}
                        size={18}
                        color={lesson.visible ? colors.primary[500] : colors.gray[400]}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openEditLesson(lesson)}>
                      <Feather name="edit-2" size={16} color={colors.gray[500]} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteLesson(lesson)}>
                      <MaterialIcons name="delete-outline" size={18} color={colors.error[500]} />
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))}

            {(mod.activities ?? []).map((activity) => (
              <TouchableOpacity
                key={activity._id}
                onPress={() => handleOpenActivity(activity)}
                className="flex-row items-center px-5 py-3 border-b border-gray-100"
                style={!activity.visible ? { opacity: 0.5 } : undefined}
              >
                <View
                  className="rounded-full p-2 mr-3"
                  style={{ backgroundColor: colors.warning[100] }}
                >
                  <MaterialCommunityIcons
                    name="pencil-box-outline"
                    size={20}
                    color={colors.warning[700]}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-800 font-semibold text-sm" numberOfLines={1}>
                    {activity.title}
                  </Text>
                  {activity.scheduled_at && (
                    <View className="flex-row items-center mt-0.5 gap-1">
                      <MaterialIcons name="schedule" size={11} color={colors.warning[600]} />
                      <Text className="text-xs" style={{ color: colors.warning[600] }}>
                        {new Date(activity.scheduled_at).toLocaleString()}
                      </Text>
                    </View>
                  )}
                  {!activity.visible && !activity.scheduled_at && (
                    <Text className="text-xs text-gray-400 mt-0.5">{t('Hidden')}</Text>
                  )}
                </View>
                {isTeacher && (
                  <View className="flex-row items-center gap-3">
                    <TouchableOpacity onPress={() => handleToggleActivityVisibility(activity)}>
                      <MaterialIcons
                        name={activity.visible ? 'visibility' : 'visibility-off'}
                        size={18}
                        color={activity.visible ? colors.primary[500] : colors.gray[400]}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openEditActivity(activity)}>
                      <Feather name="edit-2" size={16} color={colors.gray[500]} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteActivity(activity)}>
                      <MaterialIcons name="delete-outline" size={18} color={colors.error[500]} />
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))}

            {/* Module actions */}
            {isTeacher && (
              <View className="flex-row px-4 py-3 gap-2 border-t border-gray-100">
                <TouchableOpacity
                  onPress={() => openCreateLesson(mod._id)}
                  className="flex-1 flex-row items-center justify-center py-2 rounded-xl gap-1"
                  style={{ backgroundColor: colors.primary[50] }}
                >
                  <MaterialCommunityIcons
                    name="play-circle-outline"
                    size={16}
                    color={colors.primary[500]}
                  />
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: colors.primary[500] }}
                  >
                    {t('Add Lesson')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => openCreateActivity(mod._id)}
                  className="flex-1 flex-row items-center justify-center py-2 rounded-xl gap-1"
                  style={{ backgroundColor: colors.warning[100] }}
                >
                  <MaterialCommunityIcons
                    name="pencil-box-outline"
                    size={16}
                    color={colors.warning[700]}
                  />
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: colors.warning[700] }}
                  >
                    {t('Add Activity')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* FAB: Add Module */}
      {isTeacher && (
        <TouchableOpacity
          className="absolute bottom-7 right-0 rounded-full p-3 flex-row items-center gap-2"
          style={{ backgroundColor: colors.primary[500] }}
          onPress={openCreateModule}
        >
          <MaterialIcons name="add" size={26} color={colors.white} />
          <Text className="text-white font-bold mr-2">{t('Add Module')}</Text>
        </TouchableOpacity>
      )}

      {/* Module Modal */}
      <Modal visible={showModuleModal} transparent animationType="fade">
        <View
          className="flex-1 justify-center items-center px-4"
          style={{ backgroundColor: colors.overlay.medium }}
        >
          <View
            className="bg-white rounded-3xl w-full max-w-md p-6"
            style={{ elevation: 10 }}
          >
            <Text className="text-xl font-bold text-gray-800 mb-4">
              {editingModule ? t('Edit Module') : t('New Module')}
            </Text>

            <Text className="text-sm font-semibold text-gray-700 mb-2">
              {t('Module Name')} *
            </Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-800"
              placeholder={t('e.g. Module 1 – Foundations')}
              value={moduleName}
              onChangeText={setModuleName}
              maxLength={80}
            />

            {/* Schedule toggle */}
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="schedule" size={18} color={colors.warning[600]} />
                <Text className="text-sm font-semibold text-gray-700">
                  {t('Schedule module release')}
                </Text>
              </View>
              <Switch
                value={moduleUseSchedule}
                onValueChange={setModuleUseSchedule}
                trackColor={{ false: colors.gray[300], true: colors.warning[500] }}
              />
            </View>

            {moduleUseSchedule && (
              <View className="mb-4">
                <Text className="text-xs text-gray-500 mb-1">
                  {t('Release date & time (YYYY-MM-DDTHH:MM)')}
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="2025-12-31T18:00"
                  value={moduleScheduledAt}
                  onChangeText={setModuleScheduledAt}
                  {...(Platform.OS === 'web' ? { type: 'datetime-local' } as any : {})}
                />
                <Text className="text-xs text-gray-400 mt-1">
                  {t('All content inside this module will be hidden from students until this date.')}
                </Text>
              </View>
            )}

            <View className="flex-row gap-3 mt-2">
              <TouchableOpacity
                onPress={() => setShowModuleModal(false)}
                className="flex-1 rounded-xl py-3 items-center"
                style={{ backgroundColor: colors.gray[200] }}
              >
                <Text className="font-bold text-gray-700">{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveModule}
                disabled={savingModule || !moduleName.trim()}
                className="flex-[2] rounded-xl py-3 items-center"
                style={{
                  backgroundColor: moduleName.trim()
                    ? colors.primary[500]
                    : colors.gray[300],
                }}
              >
                {savingModule ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text className="font-bold text-white">{t('Save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Lesson Modal */}
      <Modal visible={showLessonModal} transparent animationType="fade">
        <View
          className="flex-1 justify-center items-center px-4"
          style={{ backgroundColor: colors.overlay.medium }}
        >
          <View
            className="bg-white rounded-3xl w-full max-w-lg p-6"
            style={{ elevation: 10, maxHeight: '90%' }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-xl font-bold text-gray-800 mb-4">
                {editingLesson ? t('Edit Lesson') : t('New Lesson')}
              </Text>

              <Text className="text-sm font-semibold text-gray-700 mb-2">
                {t('Title')} *
              </Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-800"
                placeholder={t('Lesson title')}
                value={lessonTitle}
                onChangeText={setLessonTitle}
                maxLength={120}
              />

              <Text className="text-sm font-semibold text-gray-700 mb-2">
                {t('Video Type')}
              </Text>
              <View className="flex-row gap-2 mb-4">
                {(['youtube', 'upload', 'other'] as const).map((vt) => (
                  <TouchableOpacity
                    key={vt}
                    onPress={() => setLessonVideoType(vt)}
                    className="flex-1 py-2 rounded-xl items-center"
                    style={{
                      backgroundColor:
                        lessonVideoType === vt ? colors.primary[500] : colors.gray[100],
                    }}
                  >
                    <Text
                      className="text-xs font-semibold capitalize"
                      style={{
                        color: lessonVideoType === vt ? colors.white : colors.gray[600],
                      }}
                    >
                      {vt === 'youtube' ? 'YouTube' : vt === 'upload' ? t('Upload') : t('Other')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {lessonVideoType === 'upload' ? (
                <>
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    {t('Video File')}
                  </Text>
                  <TouchableOpacity
                    onPress={handlePickAndUploadVideo}
                    disabled={uploadingVideo}
                    className="rounded-xl px-4 py-3 mb-4 flex-row items-center gap-3"
                    style={{
                      borderWidth: 2,
                      borderStyle: 'dashed',
                      borderColor: lessonVideoUrl ? colors.success[500] : colors.primary[300],
                      backgroundColor: lessonVideoUrl ? colors.success[100] : colors.primary[50],
                    }}
                  >
                    {uploadingVideo ? (
                      <ActivityIndicator color={colors.primary[500]} />
                    ) : (
                      <MaterialIcons
                        name={lessonVideoUrl ? 'check-circle' : 'cloud-upload'}
                        size={24}
                        color={lessonVideoUrl ? colors.success[600] : colors.primary[500]}
                      />
                    )}
                    <Text
                      className="flex-1 text-sm font-semibold"
                      style={{ color: lessonVideoUrl ? colors.success[700] : colors.primary[600] }}
                      numberOfLines={1}
                    >
                      {uploadingVideo
                        ? t('Uploading…')
                        : lessonVideoUrl
                        ? t('Video uploaded ✓ Tap to replace')
                        : t('Tap to select and upload a video')}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    {lessonVideoType === 'youtube' ? t('YouTube URL') : t('Video URL')}
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-800"
                    placeholder={
                      lessonVideoType === 'youtube'
                        ? 'https://youtube.com/watch?v=...'
                        : t('Video URL')
                    }
                    value={lessonVideoUrl}
                    onChangeText={setLessonVideoUrl}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </>
              )}

              <Text className="text-sm font-semibold text-gray-700 mb-2">
                {t('Description')}
              </Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-800"
                placeholder={t('Optional description')}
                value={lessonDescription}
                onChangeText={setLessonDescription}
                multiline
                numberOfLines={3}
                style={{ textAlignVertical: 'top', minHeight: 70 }}
              />

              {/* Visibility */}
              {!lessonUseSchedule && (
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-sm font-semibold text-gray-700">
                    {t('Visible to students')}
                  </Text>
                  <Switch
                    value={lessonVisible}
                    onValueChange={setLessonVisible}
                    trackColor={{ false: colors.gray[300], true: colors.primary[400] }}
                  />
                </View>
              )}

              {/* Schedule */}
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="schedule" size={18} color={colors.warning[600]} />
                  <Text className="text-sm font-semibold text-gray-700">
                    {t('Schedule release')}
                  </Text>
                </View>
                <Switch
                  value={lessonUseSchedule}
                  onValueChange={setLessonUseSchedule}
                  trackColor={{ false: colors.gray[300], true: colors.warning[500] }}
                />
              </View>
              {lessonUseSchedule && (
                <View className="mb-4">
                  <Text className="text-xs text-gray-500 mb-1">{t('Release date & time (YYYY-MM-DDTHH:MM)')}</Text>
                  <TextInput
                    className="border border-gray-300 rounded-xl px-4 py-3 text-gray-800"
                    placeholder="2025-12-31T18:00"
                    value={lessonScheduledAt}
                    onChangeText={setLessonScheduledAt}
                    {...(Platform.OS === 'web' ? { type: 'datetime-local' } as any : {})}
                  />
                </View>
              )}

              <View className="flex-row gap-3 mt-2">
                <TouchableOpacity
                  onPress={() => setShowLessonModal(false)}
                  className="flex-1 rounded-xl py-3 items-center"
                  style={{ backgroundColor: colors.gray[200] }}
                >
                  <Text className="font-bold text-gray-700">{t('Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveLesson}
                  disabled={savingLesson || !lessonTitle.trim()}
                  className="flex-[2] rounded-xl py-3 items-center"
                  style={{
                    backgroundColor: lessonTitle.trim() ? colors.primary[500] : colors.gray[300],
                  }}
                >
                  {savingLesson ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text className="font-bold text-white">{t('Save')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Activity Modal */}
      <Modal visible={showActivityModal} transparent animationType="fade">
        <View
          className="flex-1 justify-center items-center px-4"
          style={{ backgroundColor: colors.overlay.medium }}
        >
          <View
            className="bg-white rounded-3xl w-full max-w-lg p-6"
            style={{ elevation: 10 }}
          >
            <Text className="text-xl font-bold text-gray-800 mb-4">
              {editingActivity ? t('Edit Activity') : t('New Activity')}
            </Text>

            <Text className="text-sm font-semibold text-gray-700 mb-2">
              {t('Title')} *
            </Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-800"
              placeholder={t('Activity title')}
              value={activityTitle}
              onChangeText={setActivityTitle}
              maxLength={120}
            />

            <Text className="text-sm font-semibold text-gray-700 mb-2">
              {t('Description')}
            </Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-800"
              placeholder={t('Optional description / instructions')}
              value={activityDescription}
              onChangeText={setActivityDescription}
              multiline
              numberOfLines={3}
              style={{ textAlignVertical: 'top', minHeight: 70 }}
            />

            {/* Visibility */}
            {!activityUseSchedule && (
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-sm font-semibold text-gray-700">
                  {t('Visible to students')}
                </Text>
                <Switch
                  value={activityVisible}
                  onValueChange={setActivityVisible}
                  trackColor={{ false: colors.gray[300], true: colors.primary[400] }}
                />
              </View>
            )}

            {/* Schedule */}
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="schedule" size={18} color={colors.warning[600]} />
                <Text className="text-sm font-semibold text-gray-700">
                  {t('Schedule release')}
                </Text>
              </View>
              <Switch
                value={activityUseSchedule}
                onValueChange={setActivityUseSchedule}
                trackColor={{ false: colors.gray[300], true: colors.warning[500] }}
              />
            </View>
            {activityUseSchedule && (
              <View className="mb-4">
                <Text className="text-xs text-gray-500 mb-1">{t('Release date & time (YYYY-MM-DDTHH:MM)')}</Text>
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="2025-12-31T18:00"
                  value={activityScheduledAt}
                  onChangeText={setActivityScheduledAt}
                  {...(Platform.OS === 'web' ? { type: 'datetime-local' } as any : {})}
                />
              </View>
            )}

            <View className="flex-row gap-3 mt-2">
              <TouchableOpacity
                onPress={() => setShowActivityModal(false)}
                className="flex-1 rounded-xl py-3 items-center"
                style={{ backgroundColor: colors.gray[200] }}
              >
                <Text className="font-bold text-gray-700">{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveActivity}
                disabled={savingActivity || !activityTitle.trim()}
                className="flex-[2] rounded-xl py-3 items-center"
                style={{
                  backgroundColor: activityTitle.trim() ? colors.primary[500] : colors.gray[300],
                }}
              >
                {savingActivity ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text className="font-bold text-white">{t('Save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
