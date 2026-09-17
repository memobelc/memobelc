import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather, Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import api from '@/services/api';
import { colors } from '@/styles/colors';
import { ICourse, useCollection } from '@/contexts/CollectionContext';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { useToast } from '@/components/Toast';
import { DuplicateTargetModal, DuplicateTargetType } from '@/components/molecules/DuplicateTargetModal';

export default function CoursesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { currentClassroom, setCurrentCourse } = useCollection();
  const { userInfo } = useSession();
  const { hasRole } = useHasRole();
  const { toast } = useToast();

  const isTeacher = hasRole('teacher');

  const [courses, setCourses] = useState<ICourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [editingCourse, setEditingCourse] = useState<ICourse | null>(null);
  const [savingCourse, setSavingCourse] = useState(false);
  const [duplicateTarget, setDuplicateTarget] = useState<{
    type: DuplicateTargetType;
    sourceId: string;
    defaultName: string;
  } | null>(null);

  const fetchCourses = useCallback(async () => {
    if (!currentClassroom?._id) return;
    try {
      setLoading(true);
      const res = await api.get(`/course/by_classroom/${currentClassroom._id}`, {
        headers: { Authorization: `Bearer ${userInfo?.token}` },
      });
      setCourses(res.data.courses || []);
    } catch {
      toast({ message: t('Failed to load courses'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [currentClassroom?._id, userInfo?.token]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const openCreateModal = () => {
    setEditingCourse(null);
    setCourseName('');
    setCourseDescription('');
    setShowCreate(true);
  };

  const openEditModal = (course: ICourse) => {
    setEditingCourse(course);
    setCourseName(course.name);
    setCourseDescription(course.description || '');
    setShowCreate(true);
  };

  const closeCourseModal = () => {
    setShowCreate(false);
    setEditingCourse(null);
    setCourseName('');
    setCourseDescription('');
  };

  const handleSaveCourse = async () => {
    if (!courseName.trim()) return;
    try {
      if (editingCourse) {
        setSavingCourse(true);
        await api.put(
          `/course/${editingCourse._id}`,
          {
            name: courseName.trim(),
            description: courseDescription.trim(),
          },
          { headers: { Authorization: `Bearer ${userInfo?.token}` } },
        );
        toast({ message: t('Course updated successfully'), variant: 'success' });
      } else {
        setCreating(true);
        await api.post(
          '/course/create',
          {
            name: courseName.trim(),
            description: courseDescription.trim(),
            classroom_id: currentClassroom?._id,
          },
          { headers: { Authorization: `Bearer ${userInfo?.token}` } },
        );
        toast({ message: t('Course created successfully'), variant: 'success' });
      }
      closeCourseModal();
      fetchCourses();
    } catch {
      toast({
        message: editingCourse
          ? t('Failed to update course')
          : t('Failed to create course'),
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
      setSavingCourse(false);
    }
  };

  const handleDeleteCourse = (course: ICourse) => {
    Alert.alert(
      t('Delete Course'),
      t('Are you sure you want to delete this course? All modules, lessons and activities will be removed.'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/course/${course._id}`, {
                headers: { Authorization: `Bearer ${userInfo?.token}` },
              });
              toast({ message: t('Course deleted'), variant: 'success' });
              fetchCourses();
            } catch {
              toast({ message: t('Failed to delete course'), variant: 'destructive' });
            }
          },
        },
      ],
    );
  };

  const handleReorderCourse = async (index: number, direction: 'up' | 'down') => {
    if (!currentClassroom?._id) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= courses.length) return;
    const newOrder = [...courses];
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setCourses(newOrder);
    try {
      await api.put(
        `/course/by_classroom/${currentClassroom._id}/reorder`,
        { course_ids: newOrder.map((c) => c._id) },
        { headers: { Authorization: `Bearer ${userInfo?.token}` } },
      );
    } catch {
      toast({ message: t('Failed to reorder'), variant: 'destructive' });
      fetchCourses();
    }
  };

  const handleOpenCourse = (course: ICourse) => {
    setCurrentCourse(course);
    router.push({
      pathname: '/classrooms/class/courses/[courseId]' as any,
      params: { courseId: course._id, courseName: course.name },
    });
  };

  return (
    <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8">
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
        <Text className="text-xl font-bold text-gray-800">{t('Courses')}</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {courses.length === 0 ? (
            <View className="flex-1 items-center justify-center py-20">
              <MaterialCommunityIcons
                name="book-open-page-variant-outline"
                size={64}
                color={colors.gray[300]}
              />
              <Text className="text-gray-400 text-lg font-semibold mt-4 text-center">
                {isTeacher
                  ? t('No courses yet. Create the first one!')
                  : t('No courses available yet.')}
              </Text>
            </View>
          ) : (
            courses.map((course, index) => (
              <View
                key={course._id}
                className="mb-4 rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: colors.white,
                  shadowColor: colors.shadow,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <TouchableOpacity onPress={() => handleOpenCourse(course)}>
                  <View
                    className="px-5 py-4"
                    style={{
                      borderLeftWidth: 4,
                      borderLeftColor: colors.primary[500],
                    }}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text
                          className="text-base font-bold text-gray-800"
                          numberOfLines={1}
                        >
                          {course.name}
                        </Text>
                        {!!course.description && (
                          <Text
                            className="text-sm text-gray-500 mt-1"
                            numberOfLines={2}
                          >
                            {course.description}
                          </Text>
                        )}
                      </View>
                      <MaterialIcons
                        name="chevron-right"
                        size={24}
                        color={colors.primary[500]}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
                {isTeacher && (
                  <View className="flex-row items-center justify-end gap-1 px-4 pb-3">
                    <TouchableOpacity
                      onPress={() => handleReorderCourse(index, 'up')}
                      disabled={index === 0}
                      className="p-1"
                    >
                      <MaterialIcons
                        name="arrow-upward"
                        size={20}
                        color={index === 0 ? colors.gray[300] : colors.gray[600]}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleReorderCourse(index, 'down')}
                      disabled={index === courses.length - 1}
                      className="p-1"
                    >
                      <MaterialIcons
                        name="arrow-downward"
                        size={20}
                        color={
                          index === courses.length - 1
                            ? colors.gray[300]
                            : colors.gray[600]
                        }
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => openEditModal(course)}
                      className="p-1"
                    >
                      <Feather name="edit-2" size={18} color={colors.gray[600]} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        setDuplicateTarget({
                          type: 'course',
                          sourceId: course._id,
                          defaultName: course.name,
                        })
                      }
                      className="p-1"
                    >
                      <MaterialCommunityIcons
                        name="content-copy"
                        size={18}
                        color={colors.gray[600]}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteCourse(course)}
                      className="p-1"
                    >
                      <MaterialIcons
                        name="delete-outline"
                        size={20}
                        color={colors.error[500]}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {isTeacher && (
        <TouchableOpacity
          className="absolute bottom-7 right-0 rounded-full p-3 flex-row items-center gap-2"
          style={{ backgroundColor: colors.primary[500] }}
          onPress={openCreateModal}
        >
          <MaterialIcons name="add" size={28} color={colors.white} />
          <Text className="text-white font-bold mr-2">{t('New Course')}</Text>
        </TouchableOpacity>
      )}

      <Modal visible={showCreate} transparent animationType="fade">
        <View
          className="flex-1 justify-center items-center px-4"
          style={{ backgroundColor: colors.overlay.medium }}
        >
          <View
            className="bg-white rounded-3xl w-full max-w-lg p-6"
            style={{
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <View className="flex-row justify-between items-center mb-5">
              <Text
                className="text-xl font-bold"
                style={{ color: colors.primary[700] }}
              >
                {editingCourse ? t('Edit course') : t('New Course')}
              </Text>
              <TouchableOpacity
                onPress={closeCourseModal}
                className="rounded-full p-2"
                style={{ backgroundColor: colors.gray[100] }}
              >
                <MaterialIcons name="close" size={20} color={colors.gray[700]} />
              </TouchableOpacity>
            </View>

            <Text className="text-sm font-semibold text-gray-700 mb-2">
              {t('Course Name')} *
            </Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-800"
              placeholder={t('e.g. Introduction to Mathematics')}
              value={courseName}
              onChangeText={setCourseName}
              maxLength={80}
            />

            <Text className="text-sm font-semibold text-gray-700 mb-2">
              {t('Description')}
            </Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 mb-5 text-gray-800"
              placeholder={t('Brief description of the course')}
              value={courseDescription}
              onChangeText={setCourseDescription}
              multiline
              numberOfLines={3}
              maxLength={300}
              style={{ textAlignVertical: 'top', minHeight: 80 }}
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={closeCourseModal}
                className="flex-1 rounded-xl py-3 items-center"
                style={{ backgroundColor: colors.gray[200] }}
              >
                <Text className="font-bold text-gray-700">{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveCourse}
                disabled={creating || savingCourse || !courseName.trim()}
                className="flex-[2] rounded-xl py-3 items-center"
                style={{
                  backgroundColor:
                    courseName.trim() ? colors.primary[500] : colors.gray[300],
                }}
              >
                {creating || savingCourse ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text className="font-bold text-white">
                    {editingCourse ? t('Save') : t('Create')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <DuplicateTargetModal
        visible={!!duplicateTarget}
        type={duplicateTarget?.type ?? 'course'}
        sourceId={duplicateTarget?.sourceId ?? ''}
        defaultName={duplicateTarget?.defaultName}
        onClose={() => setDuplicateTarget(null)}
        onSuccess={() => {
          toast({ message: t('Duplicated successfully'), variant: 'success' });
          fetchCourses();
        }}
      />
    </View>
  );
}
