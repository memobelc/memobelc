import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons, MaterialIcons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import api from '@/services/api';
import { colors } from '@/styles/colors';
import { IActivity, IQuestion, useCollection } from '@/contexts/CollectionContext';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import {
  QuestionFormModal,
  QuestionFormPayload,
} from '@/components/atoms/QuestionFormModal';
import { FillInBlankInput } from '@/components/atoms/FillInBlankInput';

type StudentAnswers = Record<string, string | string[]>;

function QuestionTypeLabel({ type }: { type: string }) {
  const { t } = useTranslation();
  const map: Record<string, string> = {
    multiple_choice: t('Multiple Choice'),
    checkbox: t('Checkboxes'),
    dropdown: t('Dropdown'),
    paragraph: t('Paragraph'),
    short_answer: t('Simple text'),
    fill_in_blank: t('Fill in the Blank'),
  };
  return <Text className="text-xs text-gray-400">{map[type] ?? type}</Text>;
}

function toBlankArray(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value) return [value];
  return [];
}

export default function ActivityViewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { activityId, activityTitle } = useLocalSearchParams<{
    activityId: string;
    activityTitle: string;
  }>();
  const { userInfo } = useSession();
  const { currentCourse } = useCollection();
  const { toast } = useToast();

  const isTeacher = currentCourse?.teacher_id
    ? String(currentCourse.teacher_id) === String(userInfo?.user_id)
    : false;

  const [activity, setActivity] = useState<IActivity | null>(null);
  const [questions, setQuestions] = useState<IQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const [answers, setAnswers] = useState<StudentAnswers>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [feedbackPending, setFeedbackPending] = useState(false);
  const [result, setResult] = useState<{
    score: number | null;
    earned_points: number | null;
    total_points: number | null;
    xp_earned?: number;
  } | null>(null);

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<IQuestion | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);

  const feedbackMode = activity?.feedback_mode || 'immediate';
  const showCorrect =
    submitted && !feedbackPending && (isTeacher || feedbackMode === 'immediate' || !!result);

  const fetchActivity = useCallback(async () => {
    if (!activityId) return;
    try {
      setLoading(true);
      const res = await api.get(`/course/activity/${activityId}`, {
        headers: { Authorization: `Bearer ${userInfo?.token}` },
      });
      setActivity(res.data);
      setQuestions(res.data.questions ?? []);

      if (!isTeacher) {
        const ansRes = await api.get(`/course/activity/${activityId}/my_answer`, {
          headers: { Authorization: `Bearer ${userInfo?.token}` },
        });
        if (ansRes.data.answer) {
          const answer = ansRes.data.answer;
          setSubmitted(true);
          const pending = !!answer.feedback_pending || answer.score == null;
          setFeedbackPending(pending);
          const pre: StudentAnswers = {};
          for (const a of answer.answers ?? []) {
            pre[a.question_id] = a.answer;
          }
          setAnswers(pre);
          setResult({
            score: answer.score,
            earned_points: answer.earned_points ?? null,
            total_points: answer.total_points ?? null,
            xp_earned:
              answer.earned_points != null ? Math.round(answer.earned_points) : undefined,
          });
        }
      }
    } catch {
      toast({ message: t('Failed to load activity'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [activityId, userInfo?.token, isTeacher]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const setAnswer = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const toggleCheckbox = (questionId: string, option: string) => {
    setAnswers((prev) => {
      const current = (prev[questionId] as string[]) ?? [];
      if (current.includes(option)) {
        return { ...prev, [questionId]: current.filter((o) => o !== option) };
      }
      return { ...prev, [questionId]: [...current, option] };
    });
  };

  const handleSubmit = async () => {
    const unanswered = questions.filter((q) => {
      const ans = answers[q._id];
      if (!ans) return true;
      if (Array.isArray(ans) && (ans.length === 0 || ans.every((x) => !String(x).trim()))) {
        return true;
      }
      if (typeof ans === 'string' && ans.trim() === '') return true;
      return false;
    });

    if (unanswered.length > 0) {
      Alert.alert(t('Incomplete'), t('Please answer all questions before submitting.'));
      return;
    }

    try {
      setSubmitting(true);
      const payload = Object.entries(answers).map(([question_id, answer]) => ({
        question_id,
        answer,
      }));
      const res = await api.post(
        `/course/activity/${activityId}/submit`,
        { answers: payload },
        { headers: { Authorization: `Bearer ${userInfo?.token}` } },
      );
      setResult(res.data);
      setSubmitted(true);
      setFeedbackPending(!!res.data.feedback_pending);
      if (res.data.feedback_pending) {
        toast({ message: t('Submitted. Waiting for teacher correction.'), variant: 'success' });
      } else {
        const xp = res.data.xp_earned ?? res.data.earned_points ?? 0;
        toast({
          message: xp ? `${t('Activity submitted!')} ${t('You earned')} ${xp} XP` : t('Activity submitted!'),
          variant: 'success',
        });
      }
      fetchActivity();
    } catch {
      toast({ message: t('Failed to submit'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveQuestion = async (payload: QuestionFormPayload) => {
    try {
      setSavingQuestion(true);
      const body = { ...payload, activity_id: activityId };
      if (editingQuestion) {
        await api.put(`/course/question/${editingQuestion._id}`, body, {
          headers: { Authorization: `Bearer ${userInfo?.token}` },
        });
      } else {
        await api.post('/course/question/create', body, {
          headers: { Authorization: `Bearer ${userInfo?.token}` },
        });
      }
      setShowQuestionModal(false);
      setEditingQuestion(null);
      fetchActivity();
    } catch (err: any) {
      const message = err?.response?.data?.error || t('Failed to save question');
      toast({ message, variant: 'destructive' });
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = (q: IQuestion) => {
    Alert.alert(t('Delete Question'), t('Are you sure?'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/course/question/${q._id}`, {
              headers: { Authorization: `Bearer ${userInfo?.token}` },
            });
            fetchActivity();
          } catch {
            toast({ message: t('Failed to delete question'), variant: 'destructive' });
          }
        },
      },
    ]);
  };

  const handleReorderQuestion = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    const ids = questions.map((q) => q._id);
    const tmp = ids[index];
    ids[index] = ids[target];
    ids[target] = tmp;
    const reordered = [...questions];
    const item = reordered[index];
    reordered[index] = reordered[target];
    reordered[target] = item;
    setQuestions(reordered);
    try {
      await api.put(
        `/course/activity/${activityId}/questions/reorder`,
        { question_ids: ids },
        { headers: { Authorization: `Bearer ${userInfo?.token}` } },
      );
    } catch {
      toast({ message: t('Failed to reorder'), variant: 'destructive' });
      fetchActivity();
    }
  };

  const renderStudentQuestion = (q: IQuestion, index: number) => {
    const ans = answers[q._id];
    const isChecked = (option: string) =>
      Array.isArray(ans) ? ans.includes(option) : false;
    const isSelected = (option: string) =>
      typeof ans === 'string' ? ans === option : false;
    const reveal = showCorrect && q.correct_answer != null;

    return (
      <View
        key={q._id}
        className="mb-5 rounded-2xl p-5"
        style={{
          backgroundColor: colors.white,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        <View className="flex-row items-start mb-3">
          <Text className="font-bold mr-2" style={{ color: colors.primary[500] }}>
            {index + 1}.
          </Text>
          {q.type !== 'fill_in_blank' && (
            <Text className="flex-1 text-gray-800 font-semibold leading-5">{q.text}</Text>
          )}
        </View>

        {q.type === 'fill_in_blank' && (
          <FillInBlankInput
            text={q.text}
            values={toBlankArray(ans)}
            onChange={(vals) => setAnswer(q._id, vals)}
            editable={!submitted}
            showCorrect={reveal}
            correctAnswers={toBlankArray(q.correct_answer ?? undefined)}
          />
        )}

        {q.type === 'multiple_choice' && (
          <View className="gap-2">
            {q.options.map((option) => {
              const selected = isSelected(option);
              const isCorrect = reveal && option === q.correct_answer;
              const isWrong = submitted && reveal && selected && option !== q.correct_answer;
              return (
                <TouchableOpacity
                  key={option}
                  disabled={submitted}
                  onPress={() => setAnswer(q._id, option)}
                  className="flex-row items-center rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: isCorrect
                      ? colors.success[100]
                      : isWrong
                        ? colors.error[100]
                        : selected
                          ? colors.primary[50]
                          : colors.gray[100],
                    borderWidth: 1.5,
                    borderColor: isCorrect
                      ? colors.success[500]
                      : isWrong
                        ? colors.error[500]
                        : selected
                          ? colors.primary[500]
                          : colors.gray[200],
                  }}
                >
                  <View
                    className="w-5 h-5 rounded-full border-2 mr-3 items-center justify-center"
                    style={{
                      borderColor: selected ? colors.primary[500] : colors.gray[400],
                    }}
                  >
                    {selected && (
                      <View
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: colors.primary[500] }}
                      />
                    )}
                  </View>
                  <Text
                    className="flex-1 text-sm"
                    style={{ color: isCorrect ? colors.success[600] : colors.gray[800] }}
                  >
                    {option}
                  </Text>
                  {isCorrect && (
                    <MaterialIcons name="check-circle" size={18} color={colors.success[500]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {q.type === 'checkbox' && (
          <View className="gap-2">
            {q.options.map((option) => {
              const checked = isChecked(option);
              const correctArr = Array.isArray(q.correct_answer) ? q.correct_answer : [];
              const isCorrectOption = reveal && correctArr.includes(option);
              return (
                <TouchableOpacity
                  key={option}
                  disabled={submitted}
                  onPress={() => toggleCheckbox(q._id, option)}
                  className="flex-row items-center rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: isCorrectOption
                      ? colors.success[100]
                      : checked
                        ? colors.primary[50]
                        : colors.gray[100],
                    borderWidth: 1.5,
                    borderColor: isCorrectOption
                      ? colors.success[500]
                      : checked
                        ? colors.primary[500]
                        : colors.gray[200],
                  }}
                >
                  <View
                    className="w-5 h-5 rounded mr-3 border-2 items-center justify-center"
                    style={{
                      borderColor: checked ? colors.primary[500] : colors.gray[400],
                      backgroundColor: checked ? colors.primary[500] : 'transparent',
                    }}
                  >
                    {checked && <MaterialIcons name="check" size={14} color={colors.white} />}
                  </View>
                  <Text className="flex-1 text-sm text-gray-800">{option}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {q.type === 'dropdown' && (
          <View
            className="rounded-xl overflow-hidden"
            style={{ borderWidth: 1, borderColor: colors.gray[300] }}
          >
            <Picker
              selectedValue={typeof ans === 'string' ? ans : ''}
              enabled={!submitted}
              onValueChange={(val) => setAnswer(q._id, val)}
              style={{ color: colors.gray[800] }}
            >
              <Picker.Item label={t('Select an option…')} value="" color={colors.gray[400]} />
              {q.options.map((option) => (
                <Picker.Item key={option} label={option} value={option} />
              ))}
            </Picker>
          </View>
        )}

        {q.type === 'short_answer' && (
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-gray-800"
            placeholder={t('Your answer…')}
            value={typeof ans === 'string' ? ans : ''}
            onChangeText={(v) => setAnswer(q._id, v)}
            editable={!submitted}
          />
        )}

        {q.type === 'paragraph' && (
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-gray-800"
            placeholder={t('Write your answer here…')}
            value={typeof ans === 'string' ? ans : ''}
            onChangeText={(v) => setAnswer(q._id, v)}
            multiline
            numberOfLines={4}
            style={{ textAlignVertical: 'top', minHeight: 100 }}
            editable={!submitted}
          />
        )}

        {reveal && q.type !== 'multiple_choice' && q.type !== 'checkbox' && q.type !== 'fill_in_blank' && (
          <View
            className="mt-3 rounded-xl px-4 py-2"
            style={{ backgroundColor: colors.success[100] }}
          >
            <Text className="text-xs font-semibold" style={{ color: colors.success[600] }}>
              {t('Correct answer')}:{' '}
              {Array.isArray(q.correct_answer)
                ? q.correct_answer.join(', ')
                : q.correct_answer}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderTeacherQuestion = (q: IQuestion, index: number) => (
    <View
      key={q._id}
      className="mb-4 rounded-2xl p-5"
      style={{
        backgroundColor: colors.white,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      <View className="flex-row items-start justify-between mb-1">
        <View className="flex-1">
          <QuestionTypeLabel type={q.type} />
          <Text className="text-gray-800 font-semibold mt-1 flex-1 leading-5">
            {index + 1}. {q.text}
          </Text>
        </View>
        <View className="flex-row gap-2 ml-3 items-center">
          <TouchableOpacity onPress={() => handleReorderQuestion(index, -1)}>
            <MaterialIcons name="keyboard-arrow-up" size={22} color={colors.gray[500]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleReorderQuestion(index, 1)}>
            <MaterialIcons name="keyboard-arrow-down" size={22} color={colors.gray[500]} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setEditingQuestion(q);
              setShowQuestionModal(true);
            }}
          >
            <Feather name="edit-2" size={18} color={colors.gray[500]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteQuestion(q)}>
            <MaterialIcons name="delete-outline" size={20} color={colors.error[500]} />
          </TouchableOpacity>
        </View>
      </View>

      {q.options.length > 0 && (
        <View className="mt-2 gap-1.5">
          {q.options.map((option) => {
            const isCorrect = Array.isArray(q.correct_answer)
              ? q.correct_answer.includes(option)
              : q.correct_answer === option;
            return (
              <View
                key={option}
                className="flex-row items-center rounded-lg px-3 py-2"
                style={{
                  backgroundColor: isCorrect ? colors.success[100] : colors.gray[50],
                  borderWidth: 1,
                  borderColor: isCorrect ? colors.success[500] : colors.gray[200],
                }}
              >
                <Text className="flex-1 text-sm text-gray-700">{option}</Text>
                {isCorrect && (
                  <MaterialIcons name="check" size={16} color={colors.success[600]} />
                )}
              </View>
            );
          })}
        </View>
      )}

      {['paragraph', 'short_answer', 'fill_in_blank'].includes(q.type) && q.correct_answer != null ? (
        <View className="mt-2 rounded-lg px-3 py-2" style={{ backgroundColor: colors.success[100] }}>
          <Text className="text-xs" style={{ color: colors.success[600] }}>
            {t('Expected')}:{' '}
            {Array.isArray(q.correct_answer) ? q.correct_answer.join(' / ') : String(q.correct_answer)}
          </Text>
        </View>
      ) : null}

      <View className="flex-row items-center mt-2 gap-4">
        <Text className="text-xs text-gray-400">
          {q.points} {q.points === 1 ? t('point') : t('points')}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8">
      <View className="flex-row w-full justify-between items-center mb-4">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
          <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
          <Text style={{ color: colors.primary[500] }} className="ml-1">
            {t('Back')}
          </Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-800 flex-1 text-center mx-2" numberOfLines={1}>
          {activityTitle || activity?.title}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {isTeacher && (
        <View
          className="rounded-xl px-4 py-2 mb-4 flex-row items-center gap-2"
          style={{ backgroundColor: colors.primary[50] }}
        >
          <MaterialCommunityIcons
            name={feedbackMode === 'immediate' ? 'trophy-outline' : 'clipboard-check-outline'}
            size={18}
            color={colors.primary[600]}
          />
          <Text className="text-sm font-semibold" style={{ color: colors.primary[700] }}>
            {feedbackMode === 'immediate'
              ? t('Gamified quiz — answers shown after submit')
              : t('Teacher correction — answers released later')}
          </Text>
        </View>
      )}

      {!isTeacher && submitted && feedbackPending && (
        <View
          className="rounded-2xl px-5 py-4 mb-4 flex-row items-center gap-3"
          style={{ backgroundColor: colors.warning[100] }}
        >
          <MaterialIcons name="hourglass-empty" size={28} color={colors.warning[700]} />
          <View className="flex-1">
            <Text className="font-bold text-base" style={{ color: colors.warning[800] }}>
              {t('Waiting for correction')}
            </Text>
            <Text className="text-sm text-gray-600 mt-0.5">
              {t('Your teacher will release the answers after reviewing.')}
            </Text>
          </View>
        </View>
      )}

      {!isTeacher && submitted && !feedbackPending && result?.score != null && (
        <View
          className="rounded-2xl px-5 py-4 mb-4 flex-row items-center justify-between"
          style={{
            backgroundColor: (result.score ?? 0) >= 70 ? colors.success[100] : colors.error[100],
          }}
        >
          <View>
            <Text
              className="font-bold text-lg"
              style={{
                color: (result.score ?? 0) >= 70 ? colors.success[700] : colors.error[700],
              }}
            >
              {t('Your score')}: {result.score?.toFixed(1)}%
            </Text>
            {result.total_points ? (
              <Text className="text-sm text-gray-600 mt-0.5">
                {result.earned_points} / {result.total_points} {t('points')}
              </Text>
            ) : null}
            {!!result.xp_earned && (
              <Text className="text-sm font-semibold mt-1" style={{ color: colors.primary[600] }}>
                +{result.xp_earned} XP
              </Text>
            )}
          </View>
          <MaterialCommunityIcons
            name={(result.score ?? 0) >= 70 ? 'trophy-outline' : 'emoticon-sad-outline'}
            size={32}
            color={(result.score ?? 0) >= 70 ? colors.success[600] : colors.error[600]}
          />
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {!!activity?.description && (
          <View
            className="rounded-2xl px-5 py-4 mb-5"
            style={{
              backgroundColor: colors.primary[50],
              borderWidth: 1,
              borderColor: colors.primary[100],
            }}
          >
            <Text className="text-gray-700 leading-6">{activity.description}</Text>
          </View>
        )}

        {questions.length === 0 ? (
          <View className="items-center py-16">
            <MaterialCommunityIcons name="help-box-outline" size={56} color={colors.gray[300]} />
            <Text className="text-gray-400 text-base font-semibold mt-3 text-center">
              {isTeacher
                ? t('No questions yet. Add your first question!')
                : t('No questions available.')}
            </Text>
          </View>
        ) : (
          questions.map((q, i) =>
            isTeacher ? renderTeacherQuestion(q, i) : renderStudentQuestion(q, i),
          )
        )}

        {!isTeacher && questions.length > 0 && !submitted && (
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            className="rounded-2xl py-4 items-center mt-2"
            style={{ backgroundColor: colors.primary[500] }}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="send" size={20} color={colors.white} />
                <Text className="text-white font-bold text-base">{t('Submit Activity')}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {!isTeacher && submitted && (
          <View
            className="rounded-2xl py-4 items-center mt-2"
            style={{ backgroundColor: colors.gray[100] }}
          >
            <MaterialIcons name="check-circle" size={20} color={colors.success[500]} />
            <Text className="text-gray-600 font-semibold mt-1">{t('Already submitted')}</Text>
          </View>
        )}
      </ScrollView>

      {isTeacher && (
        <TouchableOpacity
          className="absolute bottom-7 right-0 rounded-full p-3 flex-row items-center gap-2"
          style={{ backgroundColor: colors.primary[500] }}
          onPress={() => {
            setEditingQuestion(null);
            setShowQuestionModal(true);
          }}
        >
          <MaterialIcons name="add" size={26} color={colors.white} />
          <Text className="text-white font-bold mr-2">{t('Add Question')}</Text>
        </TouchableOpacity>
      )}

      <QuestionFormModal
        visible={showQuestionModal}
        saving={savingQuestion}
        question={editingQuestion}
        onClose={() => {
          setShowQuestionModal(false);
          setEditingQuestion(null);
        }}
        onSubmit={handleSaveQuestion}
        onError={(message) => toast({ message, variant: 'destructive' })}
      />
    </View>
  );
}
