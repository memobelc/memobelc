import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { LessonAnnotationPanels } from '@/components/molecules/LessonAnnotationPanels';
import {
  LessonAnnotatedContentProps,
  useLessonAnnotations,
} from '@/hooks/useLessonAnnotations';
import {
  ANNOTATION_COLORS,
  applyAnnotationsToHtml,
  getSelectionOffsets,
  resolveLessonHtml,
} from '@/utils/lessonAnnotationHtml';
import { applyLessonImageSizes } from '@/utils/lessonEditorImages';

export function LessonAnnotatedContent({
  lessonId,
  contentHtml,
  description,
  token,
}: LessonAnnotatedContentProps) {
  const { t } = useTranslation();
  const baseHtml = useMemo(
    () => resolveLessonHtml(contentHtml, description),
    [contentHtml, description],
  );
  const {
    annotations,
    loading,
    saving,
    createAnnotation,
    deleteAnnotation,
  } = useLessonAnnotations(lessonId, token);

  const [toolbar, setToolbar] = useState<{ x: number; y: number } | null>(null);
  const [pendingRange, setPendingRange] = useState<{
    start: number;
    end: number;
    quote: string;
  } | null>(null);
  const [commentModal, setCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(ANNOTATION_COLORS[0]);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const displayHtml = useMemo(
    () => applyLessonImageSizes(applyAnnotationsToHtml(baseHtml, annotations)),
    [baseHtml, annotations],
  );

  const setContentRef = useCallback(
    (node: HTMLDivElement | null) => {
      contentRef.current = node;
      if (node) node.innerHTML = displayHtml;
    },
    [displayHtml],
  );

  useEffect(() => {
    if (contentRef.current) contentRef.current.innerHTML = displayHtml;
  }, [displayHtml]);

  const resetSelectionUi = () => {
    setPendingRange(null);
    setToolbar(null);
    setCommentModal(false);
    setCommentText('');
    window.getSelection()?.removeAllRanges();
  };

  const submitAnnotation = async (comment = '') => {
    if (!pendingRange) return;
    await createAnnotation({
      start: pendingRange.start,
      end: pendingRange.end,
      quote: pendingRange.quote,
      highlightColor: selectedColor,
      comment,
    });
    resetSelectionUi();
  };

  const handleMouseUp = () => {
    if (!contentRef.current) return;
    const offsets = getSelectionOffsets(contentRef.current);
    if (!offsets) {
      setToolbar(null);
      setPendingRange(null);
      return;
    }
    setPendingRange(offsets);
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    setToolbar({ x: rect.left + rect.width / 2, y: rect.top - 8 });
  };

  if (!baseHtml) {
    return <Text className="text-gray-400 italic">{t('No content yet')}</Text>;
  }

  return (
    <View>
      {React.createElement('style', {
        dangerouslySetInnerHTML: {
          __html: '.lesson-annotated-html img{max-width:100%;height:auto;border-radius:8px;}',
        },
      })}
      {React.createElement('div', {
        className: 'lesson-annotated-html',
        ref: setContentRef,
        onMouseUp: handleMouseUp,
        style: {
          color: colors.gray[700],
          fontSize: 16,
          lineHeight: '24px',
          userSelect: 'text',
          cursor: 'text',
        },
      })}

      {toolbar && pendingRange ? (
        <View
          style={{
            position: 'fixed' as any,
            left: toolbar.x,
            top: toolbar.y,
            transform: [{ translateX: -80 }],
            zIndex: 9999,
            flexDirection: 'row',
            backgroundColor: colors.gray[900],
            borderRadius: 12,
            padding: 6,
            gap: 4,
          }}
        >
          {ANNOTATION_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => {
                setSelectedColor(c);
                submitAnnotation();
              }}
              disabled={saving}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: c,
                borderWidth: selectedColor === c ? 2 : 0,
                borderColor: colors.white,
              }}
            />
          ))}
          <TouchableOpacity
            onPress={() => setCommentModal(true)}
            style={{ paddingHorizontal: 8, justifyContent: 'center' }}
          >
            <MaterialIcons name="comment" size={18} color={colors.white} />
          </TouchableOpacity>
        </View>
      ) : null}

      <LessonAnnotationPanels
        annotations={annotations}
        loading={loading}
        saving={saving}
        commentModal={commentModal}
        setCommentModal={setCommentModal}
        commentText={commentText}
        setCommentText={setCommentText}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        pendingQuote={pendingRange?.quote}
        onSaveComment={() => submitAnnotation(commentText)}
        onDelete={deleteAnnotation}
      />
    </View>
  );
}
