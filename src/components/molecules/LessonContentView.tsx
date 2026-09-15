import React, { useMemo } from 'react';
import { Text, useWindowDimensions } from 'react-native';
import RenderHTML from 'react-native-render-html';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { applyLessonImageSizes } from '@/utils/lessonEditorImages';

type LessonContentViewProps = {
  contentHtml?: string | null;
  description?: string | null;
};

export function LessonContentView({ contentHtml, description }: LessonContentViewProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width * 0.8, 1440) - 40;

  const html = useMemo(() => {
    if (contentHtml?.trim()) return contentHtml;
    if (description?.trim()) {
      const escaped = description
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<p>${escaped.replace(/\n/g, '<br/>')}</p>`;
    }
    return '';
  }, [contentHtml, description]);

  const sizedHtml = useMemo(() => applyLessonImageSizes(html), [html]);

  if (!sizedHtml) {
    return <Text className="text-gray-400 italic">{t('No content yet')}</Text>;
  }

  return (
    <RenderHTML
      contentWidth={contentWidth}
      source={{ html: sizedHtml }}
      baseStyle={{ color: colors.gray[700], fontSize: 16, lineHeight: 24 }}
      tagsStyles={{
        h1: { fontSize: 24, fontWeight: '700', marginVertical: 8, color: colors.gray[800] },
        h2: { fontSize: 20, fontWeight: '700', marginVertical: 8, color: colors.gray[800] },
        h3: { fontSize: 18, fontWeight: '600', marginVertical: 6, color: colors.gray[800] },
        p: { marginBottom: 8 },
        ul: { marginBottom: 8, paddingLeft: 8 },
        ol: { marginBottom: 8, paddingLeft: 8 },
        li: { marginBottom: 4 },
        blockquote: {
          borderLeftWidth: 3,
          borderLeftColor: colors.primary[300],
          paddingLeft: 12,
          marginVertical: 8,
          color: colors.gray[600],
        },
        img: { marginVertical: 8, borderRadius: 8, maxWidth: '100%' },
        a: { color: colors.primary[600], textDecorationLine: 'underline' },
      }}
    />
  );
}
