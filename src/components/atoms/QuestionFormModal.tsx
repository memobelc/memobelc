import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { IQuestion } from '@/contexts/CollectionContext';

export const QUESTION_TYPES = [
  { value: 'short_answer', label: 'Simple text' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'checkbox', label: 'Checkboxes' },
  { value: 'fill_in_blank', label: 'Fill in the Blank' },
] as const;

export type QuestionTypeValue = IQuestion['type'];

export type QuestionFormPayload = {
  text: string;
  type: QuestionTypeValue;
  options: string[];
  correct_answer: string | string[];
  points: number;
};

interface QuestionFormModalProps {
  visible: boolean;
  saving: boolean;
  question?: IQuestion | null;
  onClose: () => void;
  onSubmit: (payload: QuestionFormPayload) => void;
  onError: (message: string) => void;
}

export function countBlanks(text: string): number {
  return (text.match(/_{3,}/g) || []).length;
}

export function splitBlankParts(text: string): string[] {
  return (text || '').split(/_{3,}/);
}

function typeLabel(type: string): string {
  const found = QUESTION_TYPES.find((qt) => qt.value === type);
  if (found) return found.label;
  const extras: Record<string, string> = {
    dropdown: 'Dropdown',
    paragraph: 'Paragraph',
  };
  return extras[type] ?? type;
}

export function QuestionFormModal({
  visible,
  saving,
  question,
  onClose,
  onSubmit,
  onError,
}: QuestionFormModalProps) {
  const { t } = useTranslation();
  const editing = !!question;

  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<QuestionTypeValue>('short_answer');
  const [qOptions, setQOptions] = useState<string[]>(['', '']);
  const [qCorrectAnswer, setQCorrectAnswer] = useState<string | string[]>('');
  const [qBlankAnswers, setQBlankAnswers] = useState<string[]>([]);
  const [qPoints, setQPoints] = useState('1');

  const blankCount = countBlanks(qText);

  useEffect(() => {
    if (!visible) return;
    if (question) {
      setQText(question.text);
      setQType(question.type);
      setQOptions(question.options.length >= 2 ? [...question.options] : ['', '']);
      setQCorrectAnswer(
        Array.isArray(question.correct_answer)
          ? question.correct_answer
          : question.correct_answer ?? '',
      );
      const blanks = countBlanks(question.text);
      const existing = Array.isArray(question.correct_answer)
        ? question.correct_answer.map(String)
        : question.correct_answer
          ? [String(question.correct_answer)]
          : [];
      setQBlankAnswers(
        Array.from({ length: Math.max(blanks, existing.length) }, (_, i) => existing[i] ?? ''),
      );
      setQPoints(String(question.points ?? 1));
    } else {
      setQText('');
      setQType('short_answer');
      setQOptions(['', '']);
      setQCorrectAnswer('');
      setQBlankAnswers([]);
      setQPoints('1');
    }
  }, [visible, question]);

  useEffect(() => {
    if (qType !== 'fill_in_blank') return;
    setQBlankAnswers((prev) => {
      const next = [...prev];
      while (next.length < blankCount) next.push('');
      return next.slice(0, blankCount);
    });
  }, [blankCount, qType]);

  const typeOptions = useMemo(() => {
    const base = [...QUESTION_TYPES];
    if (question && !base.some((qt) => qt.value === question.type)) {
      return [...base, { value: question.type, label: typeLabel(question.type) }];
    }
    return base;
  }, [question]);

  const validate = (): QuestionFormPayload | null => {
    const text = qText.trim();
    if (!text) {
      onError(t('Question text is required'));
      return null;
    }
    const points = parseInt(qPoints, 10);
    if (!Number.isFinite(points) || points < 1) {
      onError(t('Points must be at least 1'));
      return null;
    }

    const hasOptions = ['multiple_choice', 'checkbox', 'dropdown'].includes(qType);
    const filteredOptions = hasOptions
      ? qOptions.map((o) => o.trim()).filter(Boolean)
      : [];

    if (hasOptions && filteredOptions.length < 2) {
      onError(t('At least 2 options are required'));
      return null;
    }

    if (qType === 'multiple_choice' || qType === 'dropdown') {
      const correct = typeof qCorrectAnswer === 'string' ? qCorrectAnswer.trim() : '';
      if (!correct) {
        onError(t('Select the correct option'));
        return null;
      }
      if (!filteredOptions.includes(correct)) {
        onError(t('Select the correct option'));
        return null;
      }
      return { text, type: qType, options: filteredOptions, correct_answer: correct, points };
    }

    if (qType === 'checkbox') {
      const selected = Array.isArray(qCorrectAnswer)
        ? qCorrectAnswer.filter((x) => filteredOptions.includes(x))
        : [];
      if (selected.length < 1) {
        onError(t('Select at least one correct option'));
        return null;
      }
      return { text, type: qType, options: filteredOptions, correct_answer: selected, points };
    }

    if (qType === 'fill_in_blank') {
      if (blankCount < 1) {
        onError(t('Add at least one blank using ___'));
        return null;
      }
      const answers = qBlankAnswers.map((a) => a.trim());
      if (answers.length !== blankCount || answers.some((a) => !a)) {
        onError(t('Fill in the expected answer for every blank'));
        return null;
      }
      return { text, type: qType, options: [], correct_answer: answers, points };
    }

    const expected = typeof qCorrectAnswer === 'string' ? qCorrectAnswer.trim() : '';
    if (qType === 'short_answer' && !expected) {
      onError(t('Expected answer is required'));
      return null;
    }
    return { text, type: qType, options: [], correct_answer: expected, points };
  };

  const handleSave = () => {
    const payload = validate();
    if (!payload) return;
    onSubmit(payload);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
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
                {editing ? t('Edit Question') : t('New Question')}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="rounded-full p-2"
                style={{ backgroundColor: colors.gray[100] }}
              >
                <MaterialIcons name="close" size={20} color={colors.gray[700]} />
              </TouchableOpacity>
            </View>

            <Text className="text-sm font-semibold text-gray-700 mb-2">
              {t('Question')} *
            </Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 mb-1 text-gray-800"
              placeholder={
                qType === 'fill_in_blank'
                  ? t('Use ___ to mark each blank')
                  : t('Enter the question text')
              }
              value={qText}
              onChangeText={setQText}
              multiline
              numberOfLines={3}
              style={{ textAlignVertical: 'top', minHeight: 80 }}
            />
            {qType === 'fill_in_blank' && (
              <Text className="text-xs text-gray-400 mb-3">
                {t('Example')}: {t('The capital of ___ is ___.')}
              </Text>
            )}

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
                  const next = v as QuestionTypeValue;
                  setQType(next);
                  setQCorrectAnswer(next === 'checkbox' ? [] : '');
                }}
                style={{ color: colors.gray[800] }}
              >
                {typeOptions.map((qt) => (
                  <Picker.Item key={qt.value} label={t(qt.label)} value={qt.value} />
                ))}
              </Picker>
            </View>

            {['multiple_choice', 'checkbox', 'dropdown'].includes(qType) && (
              <>
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  {t('Options')} *
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
                        onPress={() => setQOptions(qOptions.filter((_, i) => i !== idx))}
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
                  <MaterialIcons name="add-circle-outline" size={20} color={colors.primary[500]} />
                  <Text className="text-sm font-semibold" style={{ color: colors.primary[500] }}>
                    {t('Add Option')}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {qType === 'checkbox' ? (
              <>
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  {t('Correct answers')} *
                </Text>
                <View className="gap-2 mb-4">
                  {qOptions.filter((o) => o.trim()).map((opt) => {
                    const checked = Array.isArray(qCorrectAnswer)
                      ? qCorrectAnswer.includes(opt)
                      : false;
                    return (
                      <TouchableOpacity
                        key={opt}
                        onPress={() => {
                          const arr = Array.isArray(qCorrectAnswer) ? [...qCorrectAnswer] : [];
                          setQCorrectAnswer(
                            arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt],
                          );
                        }}
                        className="flex-row items-center rounded-xl px-3 py-2"
                        style={{
                          backgroundColor: checked ? colors.success[100] : colors.gray[50],
                          borderWidth: 1,
                          borderColor: checked ? colors.success[500] : colors.gray[200],
                        }}
                      >
                        <View
                          className="w-5 h-5 rounded mr-3 border-2 items-center justify-center"
                          style={{
                            borderColor: checked ? colors.success[500] : colors.gray[400],
                            backgroundColor: checked ? colors.success[500] : 'transparent',
                          }}
                        >
                          {checked && (
                            <MaterialIcons name="check" size={14} color={colors.white} />
                          )}
                        </View>
                        <Text className="text-sm text-gray-700">{opt}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : ['multiple_choice', 'dropdown'].includes(qType) ? (
              <>
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  {t('Correct Answer')} *
                </Text>
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
              </>
            ) : qType === 'fill_in_blank' ? (
              <>
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  {t('Answers for each blank')} *
                </Text>
                {blankCount === 0 ? (
                  <Text className="text-xs text-gray-400 mb-4">
                    {t('Add at least one blank using ___')}
                  </Text>
                ) : (
                  qBlankAnswers.map((ans, idx) => (
                    <TextInput
                      key={idx}
                      className="border border-gray-300 rounded-xl px-4 py-3 mb-2 text-gray-800"
                      placeholder={`${t('Blank')} ${idx + 1}`}
                      value={ans}
                      onChangeText={(v) => {
                        const next = [...qBlankAnswers];
                        next[idx] = v;
                        setQBlankAnswers(next);
                      }}
                    />
                  ))
                )}
              </>
            ) : (
              <>
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  {t('Expected answer')} {qType === 'short_answer' ? '*' : ''}
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-800"
                  placeholder={t('Expected answer')}
                  value={typeof qCorrectAnswer === 'string' ? qCorrectAnswer : ''}
                  onChangeText={setQCorrectAnswer}
                />
              </>
            )}

            <Text className="text-sm font-semibold text-gray-700 mb-2">{t('Points')}</Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 mb-5 text-gray-800 w-24"
              value={qPoints}
              onChangeText={setQPoints}
              keyboardType="numeric"
              maxLength={3}
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={onClose}
                className="flex-1 rounded-xl py-3 items-center"
                style={{ backgroundColor: colors.gray[200] }}
              >
                <Text className="font-bold text-gray-700">{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                className="flex-[2] rounded-xl py-3 items-center"
                style={{ backgroundColor: colors.primary[500] }}
              >
                {saving ? (
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
  );
}
