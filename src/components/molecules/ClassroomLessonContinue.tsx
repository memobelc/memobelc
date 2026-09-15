import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { ILessonNeighbor } from '@/contexts/CollectionContext';

type ClassroomLessonContinueProps = {
  lastViewed: ILessonNeighbor[];
  nextLesson: ILessonNeighbor | null;
  onOpen: (lesson: ILessonNeighbor) => void;
};

function LessonJumpCard({
  badge,
  lesson,
  onPress,
}: {
  badge: string;
  lesson: ILessonNeighbor;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="rounded-2xl p-4 mb-3"
      style={{
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.gray[200],
      }}
    >
      <Text className="text-xs font-semibold mb-1" style={{ color: colors.primary[600] }}>
        {badge}
      </Text>
      <View className="flex-row items-center">
        <View
          className="w-10 h-10 rounded-xl items-center justify-center mr-3"
          style={{ backgroundColor: colors.primary[50] }}
        >
          <MaterialIcons name="play-circle-filled" size={22} color={colors.primary[500]} />
        </View>
        <View className="flex-1">
          <Text className="font-bold text-gray-800" numberOfLines={2}>
            {lesson.title}
          </Text>
          {lesson.course_name ? (
            <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
              {lesson.course_name}
              {lesson.module_name ? ` · ${lesson.module_name}` : ''}
            </Text>
          ) : null}
        </View>
        <MaterialIcons name="chevron-right" size={22} color={colors.gray[400]} />
      </View>
    </TouchableOpacity>
  );
}

export function ClassroomLessonContinue({
  lastViewed,
  nextLesson,
  onOpen,
}: ClassroomLessonContinueProps) {
  const { t } = useTranslation();
  const recents = lastViewed.filter((lesson) => !nextLesson || lesson._id !== nextLesson._id);
  const showNext = !!nextLesson;

  if (!recents.length && !showNext) return null;

  return (
    <View className="mb-6">
      <Text className="text-lg font-bold text-gray-800 mb-3">{t('Continue learning')}</Text>
      {recents.map((lesson, index) => (
        <LessonJumpCard
          key={lesson._id}
          badge={index === 0 ? t('Last viewed lesson') : t('Recently viewed')}
          lesson={lesson}
          onPress={() => onOpen(lesson)}
        />
      ))}
      {showNext && nextLesson ? (
        <LessonJumpCard
          badge={recents.length ? t('Next lesson') : t('Start here')}
          lesson={nextLesson}
          onPress={() => onOpen(nextLesson)}
        />
      ) : null}
    </View>
  );
}
