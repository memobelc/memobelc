import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { colors } from '@/styles/colors';
import { splitBlankParts } from '@/components/atoms/QuestionFormModal';

type FillInBlankInputProps = {
  text: string;
  values: string[];
  onChange: (values: string[]) => void;
  editable?: boolean;
  showCorrect?: boolean;
  correctAnswers?: string[];
};

export function FillInBlankInput({
  text,
  values,
  onChange,
  editable = true,
  showCorrect = false,
  correctAnswers = [],
}: FillInBlankInputProps) {
  const parts = splitBlankParts(text);
  const blankCount = Math.max(parts.length - 1, 0);

  const setBlank = (index: number, value: string) => {
    const next = Array.from({ length: blankCount }, (_, i) => values[i] ?? '');
    next[index] = value;
    onChange(next);
  };

  return (
    <View className="flex-row flex-wrap items-center">
      {parts.map((part, index) => {
        const isLast = index === parts.length - 1;
        const given = values[index] ?? '';
        const expected = correctAnswers[index];
        const isRight =
          showCorrect &&
          expected != null &&
          given.trim().toLowerCase() === String(expected).trim().toLowerCase();
        const isWrong = showCorrect && expected != null && !isRight;
        return (
          <React.Fragment key={index}>
            {!!part && (
              <Text className="text-gray-800 text-sm leading-7">{part}</Text>
            )}
            {!isLast && (
              <TextInput
                className="mx-1 px-2 py-1 rounded-lg text-sm text-gray-800"
                style={{
                  minWidth: 88,
                  borderWidth: 1.5,
                  borderColor: isRight
                    ? colors.success[500]
                    : isWrong
                      ? colors.error[500]
                      : colors.gray[300],
                  backgroundColor: isRight
                    ? colors.success[100]
                    : isWrong
                      ? colors.error[100]
                      : colors.white,
                }}
                value={given}
                onChangeText={(v) => setBlank(index, v)}
                editable={editable}
                placeholder={`(${index + 1})`}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}
