import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import api from '@/services/api';
import { colors } from '@/styles/colors';
import { PickerSelect } from '@/components/atoms/PickerSelect';
import { ICourse, ICourseModule, IClassroom } from '@/contexts/CollectionContext';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';

export type DuplicateTargetType = 'course' | 'module' | 'lesson';

type DuplicateTargetModalProps = {
  visible: boolean;
  type: DuplicateTargetType;
  sourceId: string;
  defaultName?: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function DuplicateTargetModal({
  visible,
  type,
  sourceId,
  defaultName = '',
  onClose,
  onSuccess,
}: DuplicateTargetModalProps) {
  const { t } = useTranslation();
  const { userInfo } = useSession();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [classrooms, setClassrooms] = useState<IClassroom[]>([]);
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [modules, setModules] = useState<ICourseModule[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [includeDecks, setIncludeDecks] = useState(false);
  const [name, setName] = useState('');

  const titleKey = useMemo(() => {
    if (type === 'course') return 'Duplicate course';
    if (type === 'module') return 'Duplicate module';
    return 'Duplicate lesson';
  }, [type]);

  const resetForm = useCallback(() => {
    setSelectedClassroomId('');
    setSelectedCourseId('');
    setSelectedModuleId('');
    setIncludeDecks(false);
    setName(defaultName ? t('Copy of {{name}}', { name: defaultName }) : '');
    setCourses([]);
    setModules([]);
  }, [defaultName, t]);

  const loadClassrooms = useCallback(async () => {
    if (!userInfo?.token) return;
    setLoading(true);
    try {
      const res = await api.get('/classroom/get_classrooms', {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      const list = (res.data.classrooms || []).filter(
        (c: IClassroom) => c.user_role === 'teacher',
      );
      setClassrooms(list);
      if (list.length > 0) {
        setSelectedClassroomId((prev) => prev || list[0]._id);
      }
    } finally {
      setLoading(false);
    }
  }, [userInfo?.token]);

  const loadCourses = useCallback(
    async (classroomId: string) => {
      if (!classroomId || !userInfo?.token) {
        setCourses([]);
        return;
      }
      try {
        const res = await api.get(`/course/by_classroom/${classroomId}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        const list = res.data.courses || [];
        setCourses(list);
        setSelectedCourseId(list[0]?._id || '');
      } catch {
        setCourses([]);
        setSelectedCourseId('');
      }
    },
    [userInfo?.token],
  );

  const loadModules = useCallback(
    async (courseId: string) => {
      if (!courseId || !userInfo?.token) {
        setModules([]);
        return;
      }
      try {
        const res = await api.get(`/course/${courseId}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        const list = res.data.modules || [];
        setModules(list);
        setSelectedModuleId(list[0]?._id || '');
      } catch {
        setModules([]);
        setSelectedModuleId('');
      }
    },
    [userInfo?.token],
  );

  useEffect(() => {
    if (!visible) return;
    resetForm();
    loadClassrooms();
  }, [visible, resetForm, loadClassrooms]);

  useEffect(() => {
    if (!visible || type === 'course') return;
    if (selectedClassroomId) {
      loadCourses(selectedClassroomId);
    }
  }, [visible, type, selectedClassroomId, loadCourses]);

  useEffect(() => {
    if (!visible || type !== 'lesson') return;
    if (selectedCourseId) {
      loadModules(selectedCourseId);
    }
  }, [visible, type, selectedCourseId, loadModules]);

  const canSubmit = useMemo(() => {
    if (type === 'course') return !!selectedClassroomId;
    if (type === 'module') return !!selectedCourseId;
    return !!selectedCourseId && !!selectedModuleId;
  }, [type, selectedClassroomId, selectedCourseId, selectedModuleId]);

  const handleSubmit = async () => {
    if (!userInfo?.token || !canSubmit) return;
    setSubmitting(true);
    const payload =
      type === 'course'
        ? {
            target_classroom_id: selectedClassroomId,
            include_decks: includeDecks,
            ...(name.trim() ? { name: name.trim() } : {}),
          }
        : type === 'module'
          ? {
              target_course_id: selectedCourseId,
              include_decks: includeDecks,
              ...(name.trim() ? { name: name.trim() } : {}),
            }
          : {
              target_module_id: selectedModuleId,
              target_course_id: selectedCourseId,
              include_decks: includeDecks,
              ...(name.trim() ? { title: name.trim() } : {}),
            };
    const url =
      type === 'course'
        ? `/course/${sourceId}/duplicate`
        : type === 'module'
          ? `/course/module/${sourceId}/duplicate`
          : `/course/lesson/${sourceId}/duplicate`;
    try {
      await api.post(url, payload, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      onSuccess();
      onClose();
    } catch {
      toast({ message: t('Failed to duplicate'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const classroomOptions = classrooms.map((c) => ({
    label: c.name || c._id,
    value: c._id,
  }));

  const courseOptions = courses.map((c) => ({
    label: c.name,
    value: c._id,
  }));

  const moduleOptions = modules.map((m) => ({
    label: m.name,
    value: m._id,
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        className="flex-1 items-center justify-center px-4"
        style={{ backgroundColor: colors.overlay.medium }}
      >
        <View
          className="bg-white rounded-3xl w-full max-w-lg overflow-hidden"
          style={{ maxHeight: '90%' }}
        >
          <View className="flex-row justify-between items-center px-6 pt-6 pb-3">
            <Text className="text-xl font-bold" style={{ color: colors.primary[700] }}>
              {t(titleKey)}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="rounded-full p-2"
              style={{ backgroundColor: colors.gray[100] }}
            >
              <MaterialIcons name="close" size={20} color={colors.gray[700]} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View className="py-12 items-center">
              <ActivityIndicator size="large" color={colors.primary[500]} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}>
              {(type === 'module' || type === 'lesson') && (
                <>
                  <Text className="text-sm font-semibold text-gray-700 mb-1">
                    {t('Select target classroom')}
                  </Text>
                  <PickerSelect
                    selectedValue={selectedClassroomId}
                    onValueChange={setSelectedClassroomId}
                    options={
                      classroomOptions.length
                        ? classroomOptions
                        : [{ label: t('No classrooms'), value: '' }]
                    }
                    border
                    className="mb-4"
                  />
                </>
              )}

              {type === 'course' && (
                <>
                  <Text className="text-sm font-semibold text-gray-700 mb-1">
                    {t('Select target classroom')}
                  </Text>
                  <PickerSelect
                    selectedValue={selectedClassroomId}
                    onValueChange={setSelectedClassroomId}
                    options={
                      classroomOptions.length
                        ? classroomOptions
                        : [{ label: t('No classrooms'), value: '' }]
                    }
                    border
                    className="mb-4"
                  />
                </>
              )}

              {(type === 'module' || type === 'lesson') && (
                <>
                  <Text className="text-sm font-semibold text-gray-700 mb-1">
                    {t('Select target course')}
                  </Text>
                  <PickerSelect
                    selectedValue={selectedCourseId}
                    onValueChange={setSelectedCourseId}
                    options={
                      courseOptions.length
                        ? courseOptions
                        : [{ label: t('No courses available yet.'), value: '' }]
                    }
                    border
                    className="mb-4"
                  />
                </>
              )}

              {type === 'lesson' && (
                <>
                  <Text className="text-sm font-semibold text-gray-700 mb-1">
                    {t('Select target module')}
                  </Text>
                  <PickerSelect
                    selectedValue={selectedModuleId}
                    onValueChange={setSelectedModuleId}
                    options={
                      moduleOptions.length
                        ? moduleOptions
                        : [{ label: t('No modules yet. Add your first module below!'), value: '' }]
                    }
                    border
                    className="mb-4"
                  />
                </>
              )}

              <Text className="text-sm font-semibold text-gray-700 mb-1">
                {type === 'lesson' ? t('Lesson title') : t('Course Name')}
              </Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-800"
                value={name}
                onChangeText={setName}
                placeholder={defaultName}
                maxLength={120}
              />

              <View className="flex-row items-center justify-between mb-5 py-2">
                <Text className="text-sm font-semibold text-gray-700 flex-1 mr-3">
                  {t('Include associated decks')}
                </Text>
                <Switch
                  value={includeDecks}
                  onValueChange={setIncludeDecks}
                  trackColor={{ false: colors.gray[300], true: colors.primary[300] }}
                  thumbColor={includeDecks ? colors.primary[500] : colors.gray[100]}
                />
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={onClose}
                  className="flex-1 rounded-xl py-3 items-center"
                  style={{ backgroundColor: colors.gray[200] }}
                  disabled={submitting}
                >
                  <Text className="font-bold text-gray-700">{t('Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={submitting || !canSubmit}
                  className="flex-[2] rounded-xl py-3 items-center"
                  style={{
                    backgroundColor:
                      submitting || !canSubmit ? colors.gray[300] : colors.primary[500],
                  }}
                >
                  {submitting ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text className="font-bold text-white">{t('Duplicate')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
