import React, { useEffect, useMemo } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LessonContentView } from '@/components/molecules/LessonContentView';
import { LessonAnnotationPanels } from '@/components/molecules/LessonAnnotationPanels';
import {
  LessonAnnotatedContentProps,
  useLessonAnnotations,
} from '@/hooks/useLessonAnnotations';
import { applyAnnotationsToHtml, resolveLessonHtml } from '@/utils/lessonAnnotationHtml';

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
  const { annotations, loading, saving, deleteAnnotation } = useLessonAnnotations(
    lessonId,
    token,
  );

  const displayHtml = useMemo(
    () => applyAnnotationsToHtml(baseHtml, annotations),
    [baseHtml, annotations],
  );

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7706/ingest/3c3de19b-64fc-4dfc-aa79-c317e1e7954a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2878ad'},body:JSON.stringify({sessionId:'2878ad',location:'LessonAnnotatedContent.tsx:mount',message:'native variant mounted',data:{lessonId,hasHtml:!!baseHtml},timestamp:Date.now(),hypothesisId:'H1',runId:'post-fix'})}).catch(()=>{});
  }, [lessonId, baseHtml]);
  // #endregion

  if (!baseHtml) {
    return <Text className="text-gray-400 italic">{t('No content yet')}</Text>;
  }

  return (
    <View>
      <LessonContentView contentHtml={displayHtml} description={null} />
      <LessonAnnotationPanels
        annotations={annotations}
        loading={loading}
        saving={saving}
        commentModal={false}
        setCommentModal={() => {}}
        commentText=""
        setCommentText={() => {}}
        selectedColor=""
        setSelectedColor={() => {}}
        onSaveComment={() => {}}
        onDelete={deleteAnnotation}
      />
    </View>
  );
}
