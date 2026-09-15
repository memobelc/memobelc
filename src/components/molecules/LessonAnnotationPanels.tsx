import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { colors } from '@/styles/colors';
import { ANNOTATION_COLORS, ILessonAnnotation } from '@/utils/lessonAnnotationHtml';

type AnnotationPanelsProps = {
  annotations: ILessonAnnotation[];
  loading: boolean;
  saving: boolean;
  commentModal: boolean;
  setCommentModal: (value: boolean) => void;
  commentText: string;
  setCommentText: (value: string) => void;
  selectedColor: string;
  setSelectedColor: (value: string) => void;
  pendingQuote?: string;
  onSaveComment: () => void;
  onDelete: (id: string) => void;
};

export function LessonAnnotationPanels({
  annotations,
  loading,
  saving,
  commentModal,
  setCommentModal,
  commentText,
  setCommentText,
  selectedColor,
  setSelectedColor,
  pendingQuote,
  onSaveComment,
  onDelete,
}: AnnotationPanelsProps) {
  const { t } = useTranslation();
  const [activeAnnotation, setActiveAnnotation] = useState<ILessonAnnotation | null>(null);

  return (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary[500]} style={{ marginTop: 12 }} />
      ) : annotations.length > 0 ? (
        <View className="mt-4 pt-4" style={{ borderTopWidth: 1, borderTopColor: colors.gray[200] }}>
          <Text className="text-sm font-bold text-gray-700 mb-2">{t('Notes and highlights')}</Text>
          {annotations.map((ann) => (
            <TouchableOpacity
              key={ann._id}
              onPress={() => setActiveAnnotation(ann)}
              className="rounded-xl p-3 mb-2"
              style={{
                backgroundColor: ann.is_public ? colors.primary[50] : colors.gray[100],
                borderLeftWidth: 4,
                borderLeftColor: ann.highlight_color,
              }}
            >
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-xs font-semibold text-gray-600">
                  {ann.is_public ? t('Teacher note') : ann.is_mine ? t('Your note') : ann.author_name}
                </Text>
                {ann.is_mine && (
                  <TouchableOpacity
                    onPress={() => {
                      onDelete(ann._id);
                      if (activeAnnotation?._id === ann._id) setActiveAnnotation(null);
                    }}
                  >
                    <MaterialIcons name="delete-outline" size={16} color={colors.gray[500]} />
                  </TouchableOpacity>
                )}
              </View>
              {!!ann.quote && (
                <Text className="text-sm italic text-gray-700 mb-1">"{ann.quote}"</Text>
              )}
              {!!ann.comment && <Text className="text-sm text-gray-800">{ann.comment}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <Modal visible={commentModal} transparent animationType="fade">
        <View
          className="flex-1 justify-center items-center px-4"
          style={{ backgroundColor: colors.overlay.medium }}
        >
          <View className="bg-white rounded-2xl p-5 w-full max-w-md">
            <Text className="text-lg font-bold text-gray-800 mb-2">{t('Add comment')}</Text>
            {pendingQuote ? (
              <Text className="text-sm italic text-gray-500 mb-3">"{pendingQuote}"</Text>
            ) : null}
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-800"
              placeholder={t('Write your comment')}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
            <View className="flex-row gap-2 mb-3">
              {ANNOTATION_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setSelectedColor(c)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: c,
                    borderWidth: selectedColor === c ? 2 : 0,
                    borderColor: colors.primary[600],
                  }}
                />
              ))}
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => {
                  setCommentModal(false);
                  setCommentText('');
                }}
                className="flex-1 py-3 rounded-xl items-center"
                style={{ backgroundColor: colors.gray[200] }}
              >
                <Text className="font-semibold text-gray-700">{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onSaveComment}
                disabled={saving}
                className="flex-1 py-3 rounded-xl items-center"
                style={{ backgroundColor: colors.primary[500] }}
              >
                {saving ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text className="font-semibold text-white">{t('Save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!activeAnnotation} transparent animationType="fade">
        <View
          className="flex-1 justify-center items-center px-4"
          style={{ backgroundColor: colors.overlay.medium }}
        >
          <View className="bg-white rounded-2xl p-5 w-full max-w-md">
            {activeAnnotation ? (
              <>
                <Text className="text-lg font-bold text-gray-800 mb-2">
                  {activeAnnotation.is_public ? t('Teacher note') : t('Note')}
                </Text>
                {!!activeAnnotation.quote && (
                  <Text className="text-sm italic text-gray-600 mb-2">
                    "{activeAnnotation.quote}"
                  </Text>
                )}
                {!!activeAnnotation.comment && (
                  <Text className="text-base text-gray-800 mb-4">{activeAnnotation.comment}</Text>
                )}
                <Text className="text-xs text-gray-400 mb-4">{activeAnnotation.author_name}</Text>
                <TouchableOpacity
                  onPress={() => setActiveAnnotation(null)}
                  className="py-3 rounded-xl items-center"
                  style={{ backgroundColor: colors.primary[500] }}
                >
                  <Text className="font-semibold text-white">{t('Close')}</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}
