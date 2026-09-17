import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import api from '@/services/api';
import { colors } from '@/styles/colors';
import { IClassroom, ICourse, useCollection } from '@/contexts/CollectionContext';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { Loading } from '@/components/Loading';

type MineCourse = ICourse & { classroom_name?: string };

export default function MyCoursesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { toast } = useToast();
  const { setCurrentClassroom, setCurrentCourse } = useCollection();

  const [courses, setCourses] = useState<MineCourse[]>([]);
  const [classrooms, setClassrooms] = useState<IClassroom[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const [coursesRes, classroomsRes] = await Promise.all([
        api.get('/course/mine', {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        }),
        api.get('/classroom/get_classrooms', {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        }),
      ]);
      setCourses(coursesRes.data.courses || []);
      setClassrooms(classroomsRes.data.classrooms || []);
    } catch {
      toast({
        message: t('Failed to load courses'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [userInfo?.token, t, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; courses: MineCourse[] }>();
    for (const course of courses) {
      const key = course.classroom_id || 'unknown';
      const name = course.classroom_name || t('Classroom');
      if (!map.has(key)) {
        map.set(key, { name, courses: [] });
      }
      map.get(key)!.courses.push(course);
    }
    return Array.from(map.entries());
  }, [courses, t]);

  const openCourse = (course: MineCourse) => {
    const classroom = classrooms.find((item) => item._id === course.classroom_id);
    if (classroom) {
      setCurrentClassroom(classroom);
    } else {
      setCurrentClassroom({
        _id: course.classroom_id,
        name: course.classroom_name || '',
        collection: '',
        created_at: new Date(),
        decks: [],
        guests: [],
        image: '',
        students: [],
        teacher: course.teacher_id,
        updated_at: new Date(),
      });
    }
    setCurrentCourse(course);
    router.push({
      pathname: '/classrooms/class/courses/[courseId]' as any,
      params: { courseId: course._id, courseName: course.name },
    });
  };

  return (
    <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8">
      <View className="flex-row items-center mb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <Ionicons
            name="arrow-back-circle"
            size={24}
            color={colors.primary[500]}
          />
          <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-center font-bold text-primary text-lg">
          {t('Courses')}
        </Text>
        <View style={{ width: 70 }} />
      </View>

      {loading ? (
        <Loading classname="flex-1 items-center justify-center" />
      ) : courses.length === 0 ? (
        <View className="items-center py-16">
          <MaterialCommunityIcons
            name="book-open-page-variant-outline"
            size={56}
            color={colors.gray[300]}
          />
          <Text className="text-gray-400 text-base font-semibold mt-3 text-center">
            {t('No courses available yet.')}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        >
          {grouped.map(([classroomId, group]) => (
            <View key={classroomId} className="mb-6">
              <Text className="text-sm font-bold text-gray-500 mb-2">
                {group.name}
              </Text>
              {group.courses.map((course) => (
                <TouchableOpacity
                  key={course._id}
                  onPress={() => openCourse(course)}
                  className="mb-3 rounded-2xl overflow-hidden bg-white"
                  style={{
                    shadowColor: colors.shadow,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                >
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
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
