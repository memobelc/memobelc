import { useCallback, useEffect, useState } from 'react';

import api from '@/services/api';
import { ANNOTATION_COLORS, ILessonAnnotation } from '@/utils/lessonAnnotationHtml';

export function useLessonAnnotations(lessonId: string, token?: string) {
  const [annotations, setAnnotations] = useState<ILessonAnnotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAnnotations = useCallback(async () => {
    if (!lessonId || !token) return;
    try {
      setLoading(true);
      const res = await api.get(`/course/lesson/${lessonId}/annotations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnnotations(res.data || []);
    } catch {
      setAnnotations([]);
    } finally {
      setLoading(false);
    }
  }, [lessonId, token]);

  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations]);

  const createAnnotation = async (payload: {
    start: number;
    end: number;
    quote: string;
    highlightColor?: string;
    comment?: string;
  }) => {
    if (!token) return null;
    try {
      setSaving(true);
      const res = await api.post(
        `/course/lesson/${lessonId}/annotations`,
        {
          start_offset: payload.start,
          end_offset: payload.end,
          quote: payload.quote,
          highlight_color: payload.highlightColor || ANNOTATION_COLORS[0],
          comment: (payload.comment || '').trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setAnnotations((prev) => [...prev, res.data]);
      return res.data as ILessonAnnotation;
    } finally {
      setSaving(false);
    }
  };

  const deleteAnnotation = async (annotationId: string) => {
    if (!token) return;
    await api.delete(`/course/lesson/annotation/${annotationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setAnnotations((prev) => prev.filter((a) => a._id !== annotationId));
  };

  return {
    annotations,
    loading,
    saving,
    createAnnotation,
    deleteAnnotation,
  };
}

export type LessonAnnotatedContentProps = {
  lessonId: string;
  contentHtml?: string | null;
  description?: string | null;
  token?: string;
};
