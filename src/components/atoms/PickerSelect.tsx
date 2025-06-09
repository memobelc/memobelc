import { View, Text } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTranslation } from 'react-i18next';

interface IRenderPickerProps {
  label: string;
  selectedValue: string;
  onValueChange: (value: string) => void;
  options: { label: string; value: string }[];
  className?: string;
}

export const PickerSelect = ({
  label,
  selectedValue,
  onValueChange,
  options,
  className,
}: IRenderPickerProps) => {
  const { t } = useTranslation();
  return (
    <View className={className ?? 'w-full'}>
      <Text className="font-bold text-primary mb-1">{t(label)}</Text>
      <View className="border border-gray-200 rounded-lg">
        <Picker
          selectedValue={selectedValue}
          onValueChange={onValueChange}
          style={{ height: 50 }}
        >
          {options.map((option) => (
            <Picker.Item
              key={option.value}
              label={option.label}
              value={option.value}
            />
          ))}
        </Picker>
      </View>
    </View>
  );
};
