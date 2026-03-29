import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Switch,
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

type StudentAnswers = Record<string, string | string[]>;

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'fill_in_blank', label: 'Fill in the Blank' },
] as const;

function QuestionTypeLabel({ type }: { type: string }) {
  const map: Record<string, string> = {
    multiple_choice: 'Multiple Choice',
    checkbox: 'Checkbox',
    dropdown: 'Dropdown',
    paragraph: 'Paragraph',
    short_answer: 'Short Answer',
    fill_in_blank: 'Fill in the Blank',
  };
  return <Text className="text-xs text-gray-400">{map[type] ?? type}</Text>;
}

export default function ActivityViewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { activityId, activityTitle } = useLocalSearchParams<{
    activityId: string;
    activityTitle: string;
  }>();
  const { userInfo } = useSession();
  const { toast } = useToast();

  const isTeacher = userInfo?.role === 'teacher';

  const [activity, setActivity] = useState<IActivity | null>(null);
  const [questions, setQuestions] = useState<IQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  // Student answer state
  const [answers, setAnswers] = useState<StudentAnswers>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    score: number | null;
    earned_points: number;
    total_points: number;
  } | null>(null);
  const [previousAnswer, setPreviousAnswer] = useState<any>(null);

  // Question editor state (teacher)
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<IQuestion | null>(null);
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<IQuestion['type']>('multiple_choice');
  const [qOptions, setQOptions] = useState<string[]>(['', '']);
  const [qCorrectAnswer, setQCorrectAnswer] = useState<string | string[]>('');
  const [qShowAnswer, setQShowAnswer] = useState(true);
  const [qPoints, setQPoints] = useState('1');
  const [savingQuestion, setSavingQuestion] = useState(false);

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
        // Check if already submitted
        const ansRes = await api.get(`/course/activity/${activityId}/my_answer`, {
          headers: { Authorization: `Bearer ${userInfo?.token}` },
        });
        if (ansRes.data.answer) {
          setPreviousAnswer(ansRes.data.answer);
          setSubmitted(true);
          // Pre-fill answers
          const pre: StudentAnswers = {};
          for (const a of ansRes.data.answer.answers ?? []) {
            pre[a.question_id] = a.answer;
          }
          setAnswers(pre);
          setResult({
            score: ansRes.data.answer.score,
            earned_points: 0,
            total_points: 0,
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

  // ── Student Answer Handling ────────────────────────────────────────────────

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
      if (Array.isArray(ans) && ans.length === 0) return true;
      if (typeof ans === 'string' && ans.trim() === '') return true;
      return false;
    });

    if (unanswered.length > 0) {
      Alert.alert(
        t('Incomplete'),
        t('Please answer all questions before submitting.'),
      );
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
      toast({ message: t('Activity submitted!'), variant: 'success' });
    } catch {
      toast({ message: t('Failed to submit'), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Question Editor (Teacher) ──────────────────────────────────────────────

  const openCreateQuestion = () => {
    setEditingQuestion(null);
    setQText('');
    setQType('multiple_choice');
    setQOptions(['', '']);
    setQCorrectAnswer('');
    setQShowAnswer(true);
    setQPoints('1');
    setShowQuestionModal(true);
  };

  const openEditQuestion = (q: IQuestion) => {
    setEditingQuestion(q);
    setQText(q.text);
    setQType(q.type);
    setQOptions(q.options.length >= 2 ? [...q.options] : ['', '']);
    setQCorrectAnswer(
      Array.isArray(q.correct_answer) ? q.correct_answer : q.correct_answer ?? '',
    );
    setQShowAnswer(q.show_answer);
    setQPoints(String(q.points ?? 1));
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = async () => {
    if (!qText.trim()) return;
    try {
      setSavingQuestion(true);
      const hasOptions = ['multiple_choice', 'checkbox', 'dropdown'].includes(qType);
      const filteredOptions = hasOptions
        ? qOptions.filter((o) => o.trim() !== '')
        : [];
      const payload = {
        text: qText.trim(),
        type: qType,
        options: filteredOptions,
        correct_answer: qCorrectAnswer,
        show_answer: qShowAnswer,
        points: parseInt(qPoints, 10) || 1,
        activity_id: activityId,
      };
      if (editingQuestion) {
        await api.put(`/course/question/${editingQuestion._id}`, payload, {
          headers: { Authorization: `Bearer ${userInfo?.token}` },
        });
      } else {
        await api.post('/course/question/create', payload, {
          headers: { Authorization: `Bearer ${userInfo?.token}` },
        });
      }
      setShowQuestionModal(false);
      fetchActivity();
    } catch {
      toast({ message: t('Failed to save question'), variant: 'destructive' });
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

  // ── Render Question (Student View) ────────────────────────────────────────

  const renderStudentQuestion = (q: IQuestion, index: number) => {
    const ans = answers[q._id];
    const isChecked = (option: string) =>
      Array.isArray(ans) ? ans.includes(option) : false;
    const isSelected = (option: string) =>
      typeof ans === 'string' ? ans === option : false;

    const showCorrect = submitted && q.show_answer && q.correct_answer != null;

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
          <Text
            className="font-bold mr-2"
            style={{ color: colors.primary[500] }}
          >
            {index + 1}.
          </Text>
          <Text className="flex-1 text-gray-800 font-semibold leading-5">
            {q.text}
          </Text>
        </View>

        {q.type === 'multiple_choice' && (
          <View className="gap-2">
            {q.options.map((option) => {
              const selected = isSelected(option);
              const isCorrect = showCorrect && option === q.correct_answer;
              const isWrong = submitted && selected && option !== q.correct_answer;
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
              const isCorrectOption = showCorrect && correctArr.includes(option);
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
                    {checked && (
                      <MaterialIcons name="check" size={14} color={colors.white} />
                    )}
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
              <Picker.Item
                label={t('Select an option…')}
                value=""
                color={colors.gray[400]}
              />
              {q.options.map((option) => (
                <Picker.Item key={option} label={option} value={option} />
              ))}
            </Picker>
          </View>
        )}

        {(q.type === 'short_answer' || q.type === 'fill_in_blank') && (
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-gray-800"
            placeholder={
              q.type === 'fill_in_blank'
                ? t('Complete the sentence…')
                : t('Your answer…')
            }
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

        {showCorrect && q.type !== 'multiple_choice' && q.type !== 'checkbox' && (
          <View
            className="mt-3 rounded-xl px-4 py-2"
            style={{ backgroundColor: colors.success[100] }}
          >
            <Text className="text-xs font-semibold" style={{ color: colors.success[600] }}>
              {t('Correct answer')}: {Array.isArray(q.correct_answer)
                ? q.correct_answer.join(', ')
                : q.correct_answer}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // ── Render Question (Teacher View) ────────────────────────────────────────

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
        <View className="flex-row gap-2 ml-3">
          <TouchableOpacity onPress={() => openEditQuestion(q)}>
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
            const isCorrect =
              Array.isArray(q.correct_answer)
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

      {q.type === 'paragraph' || q.type === 'short_answer' || q.type === 'fill_in_blank' ? (
        q.correct_answer != null ? (
          <View
            className="mt-2 rounded-lg px-3 py-2"
            style={{ backgroundColor: colors.success[100] }}
          >
            <Text className="text-xs" style={{ color: colors.success[600] }}>
              {t('Expected')}: {String(q.correct_answer)}
            </Text>
          </View>
        ) : null
      ) : null}

      <View className="flex-row items-center mt-2 gap-4">
        <Text className="text-xs text-gray-400">
          {q.points} {q.points === 1 ? t('point') : t('points')}
        </Text>
        <Text className="text-xs text-gray-400">
          {q.show_answer ? t('Answer shown after submission') : t('Answer hidden')}
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
      {/* Header */}
      <View className="flex-row w-full justify-between items-center mb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
          <Text style={{ color: colors.primary[500] }} className="ml-1">
            {t('Back')}
          </Text>
        </TouchableOpacity>
        <Text
          className="text-xl font-bold text-gray-800 flex-1 text-center mx-2"
          numberOfLines={1}
        >
          {activityTitle || activity?.title}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Score banner (student after submission) */}
      {!isTeacher && submitted && result?.score != null && (
        <View
          className="rounded-2xl px-5 py-4 mb-4 flex-row items-center justify-between"
          style={{
            backgroundColor:
              (result.score ?? 0) >= 70 ? colors.success[100] : colors.error[100],
          }}
        >
          <View>
            <Text
              className="font-bold text-lg"
              style={{
                color:
                  (result.score ?? 0) >= 70 ? colors.success[700] : colors.error[700],
              }}
            >
              {t('Your score')}: {result.score?.toFixed(1)}%
            </Text>
            {result.total_points > 0 && (
              <Text className="text-sm text-gray-600 mt-0.5">
                {result.earned_points} / {result.total_points} {t('points')}
              </Text>
            )}
          </View>
          <MaterialCommunityIcons
            name={
              (result.score ?? 0) >= 70 ? 'trophy-outline' : 'emoticon-sad-outline'
            }
            size={32}
            color={
              (result.score ?? 0) >= 70 ? colors.success[600] : colors.error[600]
            }
          />
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Activity description */}
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
            <MaterialCommunityIcons
              name="help-box-outline"
              size={56}
              color={colors.gray[300]}
            />
            <Text className="text-gray-400 text-base font-semibold mt-3 text-center">
              {isTeacher
                ? t('No questions yet. Add your first question!')
                : t('No questions available.')}
            </Text>
          </View>
        ) : (
          questions.map((q, i) =>
            isTeacher
              ? renderTeacherQuestion(q, i)
              : renderStudentQuestion(q, i),
          )
        )}

        {/* Student: Submit button */}
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
                <Text className="text-white font-bold text-base">
                  {t('Submit Activity')}
                </Text>
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
            <Text className="text-gray-600 font-semibold mt-1">
              {t('Already submitted')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* FAB: Add Question (teacher only) */}
      {isTeacher && (
        <TouchableOpacity
          className="absolute bottom-7 right-0 rounded-full p-3 flex-row items-center gap-2"
          style={{ backgroundColor: colors.primary[500] }}
          onPress={openCreateQuestion}
        >
          <MaterialIcons name="add" size={26} color={colors.white} />
          <Text className="text-white font-bold mr-2">{t('Add Question')}</Text>
        </TouchableOpacity>
      )}

      {/* Question Editor Modal */}
      <Modal visible={showQuestionModal} transparent animationType="fade">
        <View
          className="flex-1 justify-center items-center px-4"
          style={{ backgroundColor: colors.overlay.medium }}
        >
          <View
            className="bg-white rounded-3xl w-full max-w-2xl p-6"
            style={{ elevation: 10, maxHeight: '95%' }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-800">
                  {editingQuestion ? t('Edit Question') : t('New Question')}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowQuestionModal(false)}
                  className="rounded-full p-2"
                  style={{ backgroundColor: colors.gray[100] }}
                >
                  <MaterialIcons name="close" size={20} color={colors.gray[700]} />
                </TouchableOpacity>
              </View>

              {/* Question Text */}
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                {t('Question')} *
              </Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-800"
                placeholder={t('Enter the question text')}
                value={qText}
                onChangeText={setQText}
                multiline
                numberOfLines={3}
                style={{ textAlignVertical: 'top', minHeight: 80 }}
              />

              {/* Question Type */}
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                {t('Question Type')}
              </Text>
              <View
                className="rounded-xl overflow-hidden mb-4"
                style={{ borderWidth: 1, borderColor: colors.gray[300] }}
              >
                <Picker
                  selectedValue={qType}
                  onValueChange={(v) => {
                    setQType(v as IQuestion['type']);
                    setQCorrectAnswer(
                      v === 'checkbox' ? [] : '',
                    );
                  }}
                  style={{ color: colors.gray[800] }}
                >
                  {QUESTION_TYPES.map((qt) => (
                    <Picker.Item key={qt.value} label={t(qt.label)} value={qt.value} />
                  ))}
                </Picker>
              </View>

              {/* Options (MC / Checkbox / Dropdown) */}
              {['multiple_choice', 'checkbox', 'dropdown'].includes(qType) && (
                <>
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    {t('Options')}
                  </Text>
                  {qOptions.map((opt, idx) => (
                    <View key={idx} className="flex-row items-center mb-2 gap-2">
                      <TextInput
                        className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-gray-800"
                        placeholder={`${t('Option')} ${idx + 1}`}
                        value={opt}
                        onChangeText={(v) => {
                          const updated = [...qOptions];
                          updated[idx] = v;
                          setQOptions(updated);
                        }}
                      />
                      {qOptions.length > 2 && (
                        <TouchableOpacity
                          onPress={() =>
                            setQOptions(qOptions.filter((_, i) => i !== idx))
                          }
                        >
                          <MaterialIcons
                            name="remove-circle-outline"
                            size={22}
                            color={colors.error[500]}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  <TouchableOpacity
                    onPress={() => setQOptions([...qOptions, ''])}
                    className="flex-row items-center gap-1 mb-4 self-start"
                  >
                    <MaterialIcons
                      name="add-circle-outline"
                      size={20}
                      color={colors.primary[500]}
                    />
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: colors.primary[500] }}
                    >
                      {t('Add Option')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Correct Answer */}
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                {t('Correct Answer')}
              </Text>
              {qType === 'checkbox' ? (
                <View className="gap-2 mb-4">
                  {qOptions.filter((o) => o.trim()).map((opt) => {
                    const checked = Array.isArray(qCorrectAnswer)
                      ? qCorrectAnswer.includes(opt)
                      : false;
                    return (
                      <TouchableOpacity
                        key={opt}
                        onPress={() => {
                          const arr = Array.isArray(qCorrectAnswer)
                            ? [...qCorrectAnswer]
                            : [];
                          if (arr.includes(opt)) {
                            setQCorrectAnswer(arr.filter((x) => x !== opt));
                          } else {
                            setQCorrectAnswer([...arr, opt]);
                          }
                        }}
                        className="flex-row items-center rounded-xl px-3 py-2"
                        style={{
                          backgroundColor: checked
                            ? colors.success[100]
                            : colors.gray[50],
                          borderWidth: 1,
                          borderColor: checked ? colors.success[500] : colors.gray[200],
                        }}
                      >
                        <View
                          className="w-5 h-5 rounded mr-3 border-2 items-center justify-center"
                          style={{
                            borderColor: checked
                              ? colors.success[500]
                              : colors.gray[400],
                            backgroundColor: checked
                              ? colors.success[500]
                              : 'transparent',
                          }}
                        >
                          {checked && (
                            <MaterialIcons
                              name="check"
                              size={14}
                              color={colors.white}
                            />
                          )}
                        </View>
                        <Text className="text-sm text-gray-700">{opt}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : ['multiple_choice', 'dropdown'].includes(qType) ? (
                <View
                  className="rounded-xl overflow-hidden mb-4"
                  style={{ borderWidth: 1, borderColor: colors.gray[300] }}
                >
                  <Picker
                    selectedValue={typeof qCorrectAnswer === 'string' ? qCorrectAnswer : ''}
                    onValueChange={(v) => setQCorrectAnswer(v)}
                    style={{ color: colors.gray[800] }}
                  >
                    <Picker.Item
                      label={t('Select correct option…')}
                      value=""
                      color={colors.gray[400]}
                    />
                    {qOptions.filter((o) => o.trim()).map((opt) => (
                      <Picker.Item key={opt} label={opt} value={opt} />
                    ))}
                  </Picker>
                </View>
              ) : (
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-800"
                  placeholder={t('Expected answer (optional)')}
                  value={typeof qCorrectAnswer === 'string' ? qCorrectAnswer : ''}
                  onChangeText={setQCorrectAnswer}
                />
              )}

              {/* Points */}
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                {t('Points')}
              </Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-800 w-24"
                value={qPoints}
                onChangeText={setQPoints}
                keyboardType="numeric"
                maxLength={3}
              />

              {/* Show Answer */}
              <View className="flex-row items-center justify-between mb-5">
                <Text className="text-sm font-semibold text-gray-700">
                  {t('Show correct answer after submission')}
                </Text>
                <Switch
                  value={qShowAnswer}
                  onValueChange={setQShowAnswer}
                  trackColor={{ false: colors.gray[300], true: colors.primary[400] }}
                />
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setShowQuestionModal(false)}
                  className="flex-1 rounded-xl py-3 items-center"
                  style={{ backgroundColor: colors.gray[200] }}
                >
                  <Text className="font-bold text-gray-700">{t('Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveQuestion}
                  disabled={savingQuestion || !qText.trim()}
                  className="flex-[2] rounded-xl py-3 items-center"
                  style={{
                    backgroundColor: qText.trim()
                      ? colors.primary[500]
                      : colors.gray[300],
                  }}
                >
                  {savingQuestion ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text className="font-bold text-white">{t('Save Question')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
