import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '@/styles/colors';

interface MultipleChoiceCardProps {
  question: string;
  options: string[];
  correctIndex?: number;
  selectedIndex?: number | null;
  onSelect?: (index: number) => void;
  showResult?: boolean;
  disabled?: boolean;
}

export const MultipleChoiceCard = ({
  question,
  options,
  correctIndex = 0,
  selectedIndex = null,
  onSelect,
  showResult = false,
  disabled = false,
}: MultipleChoiceCardProps) => {
  return (
    <View className="w-full px-4">
      {!!question && (
        <Text className="text-xl font-bold text-gray-800 mb-4 text-center">
          {question}
        </Text>
      )}
      <View className="gap-2">
        {options.map((option, index) => {
          const selected = selectedIndex === index;
          const isCorrect = showResult && index === correctIndex;
          const isWrong = showResult && selected && index !== correctIndex;
          return (
            <TouchableOpacity
              key={`${option}-${index}`}
              disabled={disabled || showResult}
              onPress={() => onSelect?.(index)}
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
                  borderColor: selected || isCorrect ? colors.primary[500] : colors.gray[400],
                }}
              >
                {(selected || isCorrect) && (
                  <View
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: colors.primary[500] }}
                  />
                )}
              </View>
              <Text
                className="flex-1 text-sm"
                style={{
                  color: isCorrect
                    ? colors.success[600]
                    : isWrong
                      ? colors.error[600]
                      : colors.gray[800],
                }}
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
    </View>
  );
};
