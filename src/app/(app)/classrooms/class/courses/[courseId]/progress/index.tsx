import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import api from '@/services/api';
import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type StudentRef = { _id: string; name: string; email: string };

type Submission = StudentRef & {
  student_id: string;
  score: number | null;
  approved: boolean;
  submitted_at: string;
  answers: { question_id: string; answer: any }[];
};

type LessonProgress = {
  _id: string;
  title: string;
  view_count: number;
  viewers: (StudentRef & { viewed_at: string })[];
  not_viewed: StudentRef[];
};

type ActivityProgress = {
  _id: string;
  title: string;
  submission_count: number;
  avg_score: number | null;
  submissions: Submission[];
  not_submitted: StudentRef[];
};

type ModuleProgress = {
  module_id: string;
  module_name: string;
  lessons: LessonProgress[];
  activities: ActivityProgress[];
};

type StudentSummary = StudentRef & {
  lessons_viewed: number;
  total_lessons: number;
  activities_submitted: number;
  total_activities: number;
  avg_score: number | null;
  detail: {
    type: 'lesson' | 'activity';
    title: string;
    module: string;
    viewed?: boolean;
    submitted?: boolean;
    score?: number | null;
    approved?: boolean;
    activity_id?: string;
    student_id?: string;
  }[];
};

type Question = {
  _id: string;
  text: string;
  type: string;
  options?: string[];
  correct_answer?: string | string[];
  show_answer?: boolean;
  points?: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(num: number, den: number) {
  if (den === 0) return 0;
  return Math.round((num / den) * 100);
}

function scoreColor(score: number | null) {
  if (score === null || score === undefined) return colors.gray[400];
  if (score >= 70) return colors.success[600];
  if (score >= 40) return colors.warning[600];
  return colors.error[600];
}

function scoreBg(score: number | null) {
  if (score === null || score === undefined) return colors.gray[100];
  if (score >= 70) return colors.success[100];
  if (score >= 40) return colors.warning[100];
  return colors.error[100];
}

// ─── Mini components ──────────────────────────────────────────────────────────

function ProgressBar({ value, total }: { value: number; total: number }) {
  const ratio = total > 0 ? value / total : 0;
  const color =
    ratio === 1 ? colors.success[500] : ratio >= 0.5 ? colors.warning[500] : colors.error[500];
  return (
    <View className="flex-row items-center gap-2">
      <View
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: 6, backgroundColor: colors.gray[200] }}
      >
        <View
          style={{ width: `${ratio * 100}%`, height: 6, backgroundColor: color, borderRadius: 99 }}
        />
      </View>
      <Text className="text-xs font-bold w-12 text-right" style={{ color }}>
        {value}/{total}
      </Text>
    </View>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined)
    return <Text className="text-xs text-gray-400">—</Text>;
  return (
    <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: scoreBg(score) }}>
      <Text className="text-xs font-bold" style={{ color: scoreColor(score) }}>
        {score.toFixed(0)}%
      </Text>
    </View>
  );
}

function StudentChip({
  student,
  variant,
}: {
  student: StudentRef;
  variant: 'viewed' | 'not_viewed';
}) {
  const bg = variant === 'viewed' ? colors.success[100] : colors.gray[100];
  const fg = variant === 'viewed' ? colors.success[700] : colors.gray[500];
  return (
    <View
      className="flex-row items-center gap-1 px-2 py-1 rounded-full"
      style={{ backgroundColor: bg }}
    >
      <MaterialIcons
        name={variant === 'viewed' ? 'check-circle' : 'radio-button-unchecked'}
        size={12}
        color={fg}
      />
      <Text className="text-xs" style={{ color: fg }} numberOfLines={1}>
        {student.name}
      </Text>
    </View>
  );
}

// ─── Answer Viewer Modal ──────────────────────────────────────────────────────

function AnswerViewerModal({
  visible,
  onClose,
  studentName,
  questions,
  answers,
}: {
  visible: boolean;
  onClose: () => void;
  studentName: string;
  questions: Question[];
  answers: { question_id: string; answer: any }[];
}) {
  const { t } = useTranslation();

  const answerMap = useMemo(() => {
    const m: Record<string, any> = {};
    for (const a of answers) m[a.question_id] = a.answer;
    return m;
  }, [answers]);

  const isCorrect = (q: Question, studentAnswer: any): boolean | null => {
    if (!q.correct_answer || !q.show_answer) return null;
    if (Array.isArray(q.correct_answer)) {
      const correct = q.correct_answer.map((c) => c.toLowerCase().trim());
      const given = Array.isArray(studentAnswer)
        ? studentAnswer.map((s: string) => s.toLowerCase().trim())
        : [String(studentAnswer).toLowerCase().trim()];
      return correct.sort().join(',') === given.sort().join(',');
    }
    return (
      String(q.correct_answer).toLowerCase().trim() ===
      String(studentAnswer ?? '').toLowerCase().trim()
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      >
        <View
          className="rounded-t-3xl bg-white"
          style={{ maxHeight: '85%', paddingBottom: 32 }}
        >
          {/* Handle */}
          <View className="items-center pt-3 pb-2">
            <View className="w-10 h-1 rounded-full bg-gray-300" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pb-4 border-b border-gray-100">
            <View>
              <Text className="text-base font-bold text-gray-800">
                {t("Student's Answers")}
              </Text>
              <Text className="text-sm text-gray-500">{studentName}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="p-2 rounded-full"
              style={{ backgroundColor: colors.gray[100] }}
            >
              <MaterialIcons name="close" size={20} color={colors.gray[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 20, gap: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {questions.length === 0 && (
              <Text className="text-gray-400 italic text-center py-8">
                {t('No questions found for this activity.')}
              </Text>
            )}
            {questions.map((q, idx) => {
              const studentAnswer = answerMap[q._id];
              const correct = isCorrect(q, studentAnswer);
              const hasAnswer =
                studentAnswer !== undefined && studentAnswer !== null && studentAnswer !== '';

              return (
                <View
                  key={q._id}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    borderWidth: 1,
                    borderColor:
                      correct === true
                        ? colors.success[200]
                        : correct === false
                        ? colors.error[200]
                        : colors.gray[200],
                    backgroundColor:
                      correct === true
                        ? colors.success[50]
                        : correct === false
                        ? colors.error[50]
                        : colors.white,
                  }}
                >
                  {/* Question header */}
                  <View
                    className="px-4 py-2.5 flex-row items-center justify-between"
                    style={{
                      backgroundColor:
                        correct === true
                          ? colors.success[100]
                          : correct === false
                          ? colors.error[100]
                          : colors.gray[50],
                    }}
                  >
                    <Text className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      {t('Question')} {idx + 1}
                      {q.points ? ` · ${q.points}pt` : ''}
                    </Text>
                    {correct !== null && (
                      <View className="flex-row items-center gap-1">
                        <MaterialIcons
                          name={correct ? 'check-circle' : 'cancel'}
                          size={16}
                          color={correct ? colors.success[600] : colors.error[500]}
                        />
                        <Text
                          className="text-xs font-bold"
                          style={{ color: correct ? colors.success[600] : colors.error[500] }}
                        >
                          {correct ? t('Correct') : t('Incorrect')}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View className="px-4 py-3 gap-3">
                    {/* Question text */}
                    <Text className="text-gray-800 font-semibold text-sm leading-5">
                      {q.text}
                    </Text>

                    {/* Student answer */}
                    <View>
                      <Text className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
                        {t('Answer')}
                      </Text>
                      {hasAnswer ? (
                        Array.isArray(studentAnswer) ? (
                          <View className="flex-row flex-wrap gap-1">
                            {studentAnswer.map((a: string, i: number) => (
                              <View
                                key={i}
                                className="px-2 py-1 rounded-lg"
                                style={{ backgroundColor: colors.primary[100] }}
                              >
                                <Text
                                  className="text-sm font-medium"
                                  style={{ color: colors.primary[700] }}
                                >
                                  {a}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <View
                            className="px-3 py-2 rounded-xl"
                            style={{ backgroundColor: colors.primary[50] }}
                          >
                            <Text className="text-sm" style={{ color: colors.primary[700] }}>
                              {String(studentAnswer)}
                            </Text>
                          </View>
                        )
                      ) : (
                        <Text className="text-sm text-gray-400 italic">{t('No answer given')}</Text>
                      )}
                    </View>

                    {/* Correct answer (if show_answer is enabled) */}
                    {q.show_answer && q.correct_answer && (
                      <View>
                        <Text className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
                          {t('Correct Answer')}
                        </Text>
                        <View
                          className="px-3 py-2 rounded-xl"
                          style={{ backgroundColor: colors.success[50] }}
                        >
                          <Text className="text-sm" style={{ color: colors.success[700] }}>
                            {Array.isArray(q.correct_answer)
                              ? q.correct_answer.join(', ')
                              : q.correct_answer}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Submission row with action menu ─────────────────────────────────────────

function SubmissionRow({
  submission,
  activityId,
  activityTitle,
  token,
  onRefresh,
}: {
  submission: Submission;
  activityId: string;
  activityTitle: string;
  token: string;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [approved, setApproved] = useState(submission.approved);
  const [showMenu, setShowMenu] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const handleViewAnswers = async () => {
    setShowMenu(false);
    try {
      setLoadingAnswers(true);
      setShowAnswers(true);
      const res = await api.get(
        `/course/activity/${activityId}/answer/${submission.student_id}`,
        { headers },
      );
      setQuestions(res.data.questions ?? []);
    } catch {
      toast({ message: t('Failed to load answers'), variant: 'destructive' });
      setShowAnswers(false);
    } finally {
      setLoadingAnswers(false);
    }
  };

  const handleToggleApprove = async () => {
    setShowMenu(false);
    const newVal = !approved;
    try {
      setApproved(newVal);
      await api.post(
        `/course/activity/${activityId}/answer/${submission.student_id}/approve`,
        { approved: newVal },
        { headers },
      );
      toast({
        message: newVal ? t('Student approved') : t('Approval removed'),
        variant: 'success',
      });
    } catch {
      setApproved(!newVal);
      toast({ message: t('Failed to update approval'), variant: 'destructive' });
    }
  };

  const handleReset = () => {
    setShowMenu(false);
    Alert.alert(
      t('Reset submission'),
      `${t('Allow')} ${submission.name} ${t('to retake this activity? Their current answers will be deleted.')}`,
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Reset'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(
                `/course/activity/${activityId}/answer/${submission.student_id}/reset`,
                { headers },
              );
              toast({ message: t('Submission reset'), variant: 'success' });
              onRefresh();
            } catch {
              toast({ message: t('Failed to reset'), variant: 'destructive' });
            }
          },
        },
      ],
    );
  };

  return (
    <>
      <View
        className="flex-row items-center justify-between px-3 py-2.5 rounded-xl mb-1"
        style={{ backgroundColor: colors.gray[50] }}
      >
        {/* Left: name + approved badge */}
        <View className="flex-row items-center gap-2 flex-1 mr-2">
          <MaterialIcons name="check-circle" size={14} color={colors.success[500]} />
          <Text className="text-sm text-gray-800 font-medium flex-1" numberOfLines={1}>
            {submission.name}
          </Text>
          {approved && (
            <View
              className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: colors.success[100] }}
            >
              <MaterialIcons name="verified" size={10} color={colors.success[700]} />
              <Text className="text-xs font-bold" style={{ color: colors.success[700] }}>
                {t('Approved')}
              </Text>
            </View>
          )}
        </View>

        {/* Right: score + menu */}
        <View className="flex-row items-center gap-2">
          <ScoreBadge score={submission.score} />
          <TouchableOpacity
            onPress={() => setShowMenu(true)}
            className="p-1.5 rounded-full"
            style={{ backgroundColor: colors.gray[200] }}
          >
            <MaterialIcons name="more-vert" size={16} color={colors.gray[600]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Action menu modal ── */}
      <Modal visible={showMenu} transparent animationType="fade">
        <TouchableOpacity
          className="flex-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        />
        <View
          className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white pb-8"
          style={{ paddingTop: 12 }}
        >
          {/* Handle */}
          <View className="items-center mb-3">
            <View className="w-10 h-1 rounded-full bg-gray-300" />
          </View>

          {/* Student info */}
          <View className="px-5 pb-3 border-b border-gray-100">
            <Text className="text-base font-bold text-gray-800">{submission.name}</Text>
            <Text className="text-sm text-gray-500">{activityTitle}</Text>
          </View>

          {/* Actions */}
          <TouchableOpacity
            onPress={handleViewAnswers}
            className="flex-row items-center gap-4 px-5 py-4 border-b border-gray-100"
          >
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.primary[100] }}
            >
              <MaterialIcons name="visibility" size={20} color={colors.primary[600]} />
            </View>
            <View>
              <Text className="text-base font-semibold text-gray-800">{t('View Answers')}</Text>
              <Text className="text-sm text-gray-400">{t('See what the student submitted')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleToggleApprove}
            className="flex-row items-center gap-4 px-5 py-4 border-b border-gray-100"
          >
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: approved ? colors.warning[100] : colors.success[100] }}
            >
              <MaterialIcons
                name={approved ? 'undo' : 'verified'}
                size={20}
                color={approved ? colors.warning[700] : colors.success[600]}
              />
            </View>
            <View>
              <Text className="text-base font-semibold text-gray-800">
                {approved ? t('Remove approval') : t('Mark as Approved')}
              </Text>
              <Text className="text-sm text-gray-400">
                {approved
                  ? t('Remove the approved mark from this student')
                  : t('Mark this student as approved for the activity')}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleReset}
            className="flex-row items-center gap-4 px-5 py-4"
          >
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.error[100] }}
            >
              <MaterialIcons name="replay" size={20} color={colors.error[600]} />
            </View>
            <View>
              <Text className="text-base font-semibold" style={{ color: colors.error[600] }}>
                {t('Allow Retake')}
              </Text>
              <Text className="text-sm text-gray-400">
                {t('Delete current submission so student can redo')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Answer viewer ── */}
      {showAnswers && (
        <AnswerViewerModal
          visible={showAnswers}
          onClose={() => setShowAnswers(false)}
          studentName={submission.name}
          questions={questions}
          answers={submission.answers ?? []}
        />
      )}
      {loadingAnswers && (
        <Modal visible transparent>
          <View
            className="flex-1 items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
          >
            <ActivityIndicator size="large" color={colors.white} />
          </View>
        </Modal>
      )}
    </>
  );
}

// ─── By-Content view ─────────────────────────────────────────────────────────

function ByContentView({
  progress,
  totalStudents,
  token,
  onRefresh,
  t,
}: {
  progress: ModuleProgress[];
  totalStudents: number;
  token: string;
  onRefresh: () => void;
  t: (k: string) => string;
}) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    () => new Set(progress.map((m) => m.module_id)),
  );
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleModule = (id: string) =>
    setExpandedModules((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const toggleItem = (id: string) =>
    setExpandedItems((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  if (progress.length === 0)
    return (
      <View className="items-center py-16">
        <MaterialCommunityIcons name="chart-bar-stacked" size={56} color={colors.gray[300]} />
        <Text className="text-gray-400 text-base font-semibold mt-3 text-center px-8">
          {t('No modules found for this course.')}
        </Text>
      </View>
    );

  return (
    <>
      {progress.map((module) => {
        const isExpanded = expandedModules.has(module.module_id);

        return (
          <View
            key={module.module_id}
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
            <TouchableOpacity
              onPress={() => toggleModule(module.module_id)}
              className="px-5 py-4"
              style={{ backgroundColor: colors.primary[600] }}
            >
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-white font-bold text-base flex-1 mr-2" numberOfLines={1}>
                  {module.module_name}
                </Text>
                <MaterialIcons
                  name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={22}
                  color="white"
                />
              </View>
              <Text className="text-white text-xs opacity-75">
                {module.lessons.length} {t('lessons')} · {module.activities.length}{' '}
                {t('activities')}
              </Text>
            </TouchableOpacity>

            {isExpanded && (
              <>
                {module.lessons.length === 0 && module.activities.length === 0 && (
                  <View className="px-5 py-4">
                    <Text className="text-gray-400 text-sm italic">
                      {t('No content in this module yet.')}
                    </Text>
                  </View>
                )}

                {/* Lessons */}
                {module.lessons.map((lesson) => {
                  const itemKey = `lesson-${lesson._id}`;
                  const isOpen = expandedItems.has(itemKey);
                  return (
                    <View key={lesson._id} className="border-b border-gray-100">
                      <TouchableOpacity onPress={() => toggleItem(itemKey)} className="px-5 py-3">
                        <View className="flex-row items-center justify-between mb-1.5">
                          <View className="flex-row items-center gap-2 flex-1 mr-2">
                            <MaterialCommunityIcons
                              name="play-circle-outline"
                              size={18}
                              color={colors.primary[500]}
                            />
                            <Text
                              className="text-gray-800 font-semibold text-sm flex-1"
                              numberOfLines={1}
                            >
                              {lesson.title}
                            </Text>
                          </View>
                          <MaterialIcons
                            name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                            size={18}
                            color={colors.gray[400]}
                          />
                        </View>
                        <ProgressBar value={lesson.view_count} total={totalStudents} />
                      </TouchableOpacity>

                      {isOpen && (
                        <View className="px-5 pb-4">
                          {lesson.viewers.length > 0 && (
                            <>
                              <Text className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">
                                {t('Watched')} ({lesson.viewers.length})
                              </Text>
                              <View className="flex-row flex-wrap gap-1.5 mb-3">
                                {lesson.viewers.map((v) => (
                                  <StudentChip key={v._id} student={v} variant="viewed" />
                                ))}
                              </View>
                            </>
                          )}
                          {lesson.not_viewed.length > 0 && (
                            <>
                              <Text className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
                                {t("Didn't watch")} ({lesson.not_viewed.length})
                              </Text>
                              <View className="flex-row flex-wrap gap-1.5">
                                {lesson.not_viewed.map((s) => (
                                  <StudentChip key={s._id} student={s} variant="not_viewed" />
                                ))}
                              </View>
                            </>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* Activities */}
                {module.activities.map((activity) => {
                  const itemKey = `activity-${activity._id}`;
                  const isOpen = expandedItems.has(itemKey);
                  return (
                    <View key={activity._id} className="border-b border-gray-100">
                      <TouchableOpacity onPress={() => toggleItem(itemKey)} className="px-5 py-3">
                        <View className="flex-row items-center justify-between mb-1.5">
                          <View className="flex-row items-center gap-2 flex-1 mr-2">
                            <MaterialCommunityIcons
                              name="pencil-box-outline"
                              size={18}
                              color={colors.warning[700]}
                            />
                            <Text
                              className="text-gray-800 font-semibold text-sm flex-1"
                              numberOfLines={1}
                            >
                              {activity.title}
                            </Text>
                          </View>
                          <View className="flex-row items-center gap-2">
                            {activity.avg_score !== null && (
                              <ScoreBadge score={activity.avg_score} />
                            )}
                            <MaterialIcons
                              name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                              size={18}
                              color={colors.gray[400]}
                            />
                          </View>
                        </View>
                        <ProgressBar value={activity.submission_count} total={totalStudents} />
                        {activity.avg_score !== null && (
                          <Text className="text-xs text-gray-400 mt-1">
                            {t('Class avg.')}: {activity.avg_score.toFixed(1)}%
                          </Text>
                        )}
                      </TouchableOpacity>

                      {isOpen && (
                        <View className="px-5 pb-4">
                          {activity.submissions.length > 0 && (
                            <>
                              <Text className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">
                                {t('Submitted')} ({activity.submissions.length})
                              </Text>
                              <View className="gap-0">
                                {activity.submissions.map((sub) => (
                                  <SubmissionRow
                                    key={sub.student_id}
                                    submission={sub}
                                    activityId={activity._id}
                                    activityTitle={activity.title}
                                    token={token}
                                    onRefresh={onRefresh}
                                  />
                                ))}
                              </View>
                            </>
                          )}

                          {activity.not_submitted.length > 0 && (
                            <View className={activity.submissions.length > 0 ? 'mt-3' : ''}>
                              <Text className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
                                {t('Pending')} ({activity.not_submitted.length})
                              </Text>
                              <View className="gap-1">
                                {activity.not_submitted.map((s) => (
                                  <View
                                    key={s._id}
                                    className="flex-row items-center gap-2 px-3 py-2 rounded-xl"
                                    style={{ backgroundColor: colors.gray[50] }}
                                  >
                                    <MaterialIcons
                                      name="radio-button-unchecked"
                                      size={14}
                                      color={colors.gray[400]}
                                    />
                                    <Text className="text-sm text-gray-500" numberOfLines={1}>
                                      {s.name}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </View>
        );
      })}
    </>
  );
}

// ─── By-Student view ──────────────────────────────────────────────────────────

function ByStudentView({
  students,
  token,
  onRefresh,
  t,
}: {
  students: StudentSummary[];
  token: string;
  onRefresh: () => void;
  t: (k: string) => string;
}) {
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());

  const toggleStudent = (id: string) =>
    setExpandedStudents((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  if (students.length === 0)
    return (
      <View className="items-center py-16">
        <MaterialCommunityIcons name="account-off-outline" size={56} color={colors.gray[300]} />
        <Text className="text-gray-400 text-base font-semibold mt-3 text-center px-8">
          {t('No students enrolled in this course yet.')}
        </Text>
      </View>
    );

  return (
    <>
      {students.map((student) => {
        const isOpen = expandedStudents.has(student._id);
        const completionPct = pct(
          student.lessons_viewed + student.activities_submitted,
          student.total_lessons + student.total_activities,
        );
        const completionColor =
          completionPct === 100
            ? colors.success[600]
            : completionPct >= 50
            ? colors.warning[600]
            : colors.error[600];

        return (
          <View
            key={student._id}
            className="mb-3 rounded-2xl overflow-hidden"
            style={{
              backgroundColor: colors.white,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.07,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <TouchableOpacity onPress={() => toggleStudent(student._id)} className="px-5 py-4">
              <View className="flex-row items-center justify-between mb-2">
                <View
                  className="w-9 h-9 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: colors.primary[100] }}
                >
                  <Text className="font-bold text-sm" style={{ color: colors.primary[600] }}>
                    {(student.name || '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-gray-800 font-bold text-sm" numberOfLines={1}>
                    {student.name}
                  </Text>
                  {!!student.email && (
                    <Text className="text-gray-400 text-xs" numberOfLines={1}>
                      {student.email}
                    </Text>
                  )}
                </View>
                <View className="flex-row items-center gap-2">
                  {student.avg_score !== null && <ScoreBadge score={student.avg_score} />}
                  <View
                    className="px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: completionColor + '20' }}
                  >
                    <Text className="text-xs font-bold" style={{ color: completionColor }}>
                      {completionPct}%
                    </Text>
                  </View>
                  <MaterialIcons
                    name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={18}
                    color={colors.gray[400]}
                  />
                </View>
              </View>
              <View className="flex-row gap-4">
                <View className="flex-row items-center gap-1">
                  <MaterialCommunityIcons
                    name="play-circle-outline"
                    size={14}
                    color={colors.primary[400]}
                  />
                  <Text className="text-xs text-gray-500">
                    {student.lessons_viewed}/{student.total_lessons} {t('lessons')}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <MaterialCommunityIcons
                    name="pencil-box-outline"
                    size={14}
                    color={colors.warning[500]}
                  />
                  <Text className="text-xs text-gray-500">
                    {student.activities_submitted}/{student.total_activities} {t('activities')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {isOpen && student.detail.length > 0 && (
              <View className="border-t border-gray-100 px-5 py-3 gap-1.5">
                {student.detail.map((item, idx) => {
                  const done = item.type === 'lesson' ? item.viewed : item.submitted;
                  return (
                    <View
                      key={idx}
                      className="flex-row items-center justify-between py-2 px-3 rounded-xl"
                      style={{ backgroundColor: done ? colors.success[50] : colors.gray[50] }}
                    >
                      <View className="flex-row items-center gap-2 flex-1 mr-2">
                        {item.type === 'lesson' ? (
                          <MaterialCommunityIcons
                            name="play-circle-outline"
                            size={14}
                            color={item.viewed ? colors.primary[500] : colors.gray[400]}
                          />
                        ) : (
                          <MaterialCommunityIcons
                            name="pencil-box-outline"
                            size={14}
                            color={item.submitted ? colors.warning[600] : colors.gray[400]}
                          />
                        )}
                        <Text
                          className="text-xs flex-1"
                          style={{ color: done ? colors.gray[800] : colors.gray[400] }}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                      </View>

                      {item.type === 'lesson' ? (
                        <View className="flex-row items-center gap-1">
                          <MaterialIcons
                            name={item.viewed ? 'check-circle' : 'radio-button-unchecked'}
                            size={14}
                            color={item.viewed ? colors.success[500] : colors.gray[300]}
                          />
                          <Text
                            className="text-xs"
                            style={{
                              color: item.viewed ? colors.success[600] : colors.gray[400],
                            }}
                          >
                            {item.viewed ? t('Watched') : t('Not watched')}
                          </Text>
                        </View>
                      ) : item.submitted ? (
                        <View className="flex-row items-center gap-1.5">
                          {item.approved && (
                            <View
                              className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: colors.success[100] }}
                            >
                              <MaterialIcons
                                name="verified"
                                size={10}
                                color={colors.success[700]}
                              />
                              <Text
                                className="text-xs font-bold"
                                style={{ color: colors.success[700] }}
                              >
                                {t('Approved')}
                              </Text>
                            </View>
                          )}
                          <ScoreBadge score={item.score ?? null} />
                        </View>
                      ) : (
                        <Text className="text-xs text-gray-400">{t('Pending')}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function StudentProgressScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { courseId, courseName } = useLocalSearchParams<{
    courseId: string;
    courseName: string;
  }>();
  const { userInfo } = useSession();
  const { toast } = useToast();

  type ViewMode = 'content' | 'student';
  const [viewMode, setViewMode] = useState<ViewMode>('content');
  const [progress, setProgress] = useState<ModuleProgress[]>([]);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);

  const token = userInfo?.token ?? '';

  const fetchProgress = useCallback(async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      const res = await api.get(`/course/${courseId}/students_progress`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProgress(res.data.progress ?? []);
      setStudents(res.data.students ?? []);
      setTotalStudents(res.data.total_students ?? 0);
    } catch {
      toast({ message: t('Failed to load progress'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [courseId, token]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const stats = useMemo(() => {
    let totalLessons = 0,
      totalLessonViews = 0,
      totalActivities = 0,
      totalSubmissions = 0;
    const allAvgScores: number[] = [];
    for (const module of progress) {
      for (const lesson of module.lessons) {
        totalLessons++;
        totalLessonViews += lesson.view_count;
      }
      for (const activity of module.activities) {
        totalActivities++;
        totalSubmissions += activity.submission_count;
        if (activity.avg_score !== null) allAvgScores.push(activity.avg_score);
      }
    }
    const courseAvgScore =
      allAvgScores.length > 0
        ? Math.round(allAvgScores.reduce((a, b) => a + b, 0) / allAvgScores.length)
        : null;
    return { totalLessons, totalLessonViews, totalActivities, totalSubmissions, courseAvgScore };
  }, [progress]);

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
      <View className="flex-row w-full justify-between items-center mb-4">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
          <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
          <Text style={{ color: colors.primary[500] }} className="ml-1">
            {t('Back')}
          </Text>
        </TouchableOpacity>
        <Text
          className="text-lg font-bold text-gray-800 flex-1 text-center mx-2"
          numberOfLines={1}
        >
          {t('Progress')} — {courseName}
        </Text>
        <TouchableOpacity onPress={fetchProgress} className="p-1">
          <MaterialIcons name="refresh" size={22} color={colors.primary[500]} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View className="flex-row gap-3 mb-4">
        <View
          className="flex-1 rounded-2xl px-4 py-3 items-center"
          style={{
            backgroundColor: colors.primary[50],
            borderWidth: 1,
            borderColor: colors.primary[100],
          }}
        >
          <Text className="text-2xl font-bold" style={{ color: colors.primary[600] }}>
            {totalStudents}
          </Text>
          <Text className="text-xs text-gray-500 text-center">{t('Students')}</Text>
        </View>
        <View
          className="flex-1 rounded-2xl px-4 py-3 items-center"
          style={{
            backgroundColor: colors.primary[50],
            borderWidth: 1,
            borderColor: colors.primary[100],
          }}
        >
          <Text className="text-2xl font-bold" style={{ color: colors.primary[600] }}>
            {pct(stats.totalLessonViews, stats.totalLessons * (totalStudents || 1))}%
          </Text>
          <Text className="text-xs text-gray-500 text-center">{t('View rate')}</Text>
        </View>
        <View
          className="flex-1 rounded-2xl px-4 py-3 items-center"
          style={{
            backgroundColor: colors.warning[50],
            borderWidth: 1,
            borderColor: colors.warning[100],
          }}
        >
          <Text className="text-2xl font-bold" style={{ color: colors.warning[700] }}>
            {pct(stats.totalSubmissions, stats.totalActivities * (totalStudents || 1))}%
          </Text>
          <Text className="text-xs text-gray-500 text-center">{t('Submission rate')}</Text>
        </View>
        {stats.courseAvgScore !== null && (
          <View
            className="flex-1 rounded-2xl px-4 py-3 items-center"
            style={{
              backgroundColor: scoreBg(stats.courseAvgScore),
              borderWidth: 1,
              borderColor: colors.gray[200],
            }}
          >
            <Text
              className="text-2xl font-bold"
              style={{ color: scoreColor(stats.courseAvgScore) }}
            >
              {stats.courseAvgScore}%
            </Text>
            <Text className="text-xs text-gray-500 text-center">{t('Avg. score')}</Text>
          </View>
        )}
      </View>

      {/* View toggle */}
      <View className="flex-row rounded-2xl mb-4 p-1" style={{ backgroundColor: colors.gray[100] }}>
        {(
          [
            { key: 'content', label: t('By Content'), icon: 'book-open-variant' },
            { key: 'student', label: t('By Student'), icon: 'account-group' },
          ] as const
        ).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setViewMode(tab.key)}
            className="flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-xl"
            style={{
              backgroundColor: viewMode === tab.key ? colors.white : 'transparent',
              elevation: viewMode === tab.key ? 2 : 0,
            }}
          >
            <MaterialCommunityIcons
              name={tab.icon}
              size={16}
              color={viewMode === tab.key ? colors.primary[500] : colors.gray[500]}
            />
            <Text
              className="text-sm font-semibold"
              style={{ color: viewMode === tab.key ? colors.primary[600] : colors.gray[500] }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {viewMode === 'content' ? (
          <ByContentView
            progress={progress}
            totalStudents={totalStudents}
            token={token}
            onRefresh={fetchProgress}
            t={t}
          />
        ) : (
          <ByStudentView students={students} token={token} onRefresh={fetchProgress} t={t} />
        )}
      </ScrollView>
    </View>
  );
}
