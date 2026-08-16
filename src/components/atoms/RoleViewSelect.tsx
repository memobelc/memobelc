import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors } from '@/styles/colors';

export type RoleViewOption = { value: string; label: string };

interface RoleViewSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: RoleViewOption[];
}

export function RoleViewSelect({
  value,
  onValueChange,
  options,
}: RoleViewSelectProps) {
  const [open, setOpen] = useState(false);
  const currentOption = options.find((o) => o.value === value) ?? options[0];

  const handleSelect = (next: string) => {
    onValueChange(next);
    setOpen(false);
  };

  return (
    <View className="w-full">
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        className="flex-row items-center border border-gray-200 rounded-lg px-3 py-2.5 min-h-[50px]"
      >
        <Text className="text-primary flex-1" numberOfLines={1}>
          {currentOption?.label}
        </Text>
      </TouchableOpacity>

      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.4)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 24,
            }}
          >
            <TouchableWithoutFeedback>
              <View
                style={{
                  backgroundColor: colors.surface ?? '#fff',
                  borderRadius: 12,
                  paddingVertical: 8,
                  paddingHorizontal: 4,
                  width: '100%',
                  maxWidth: 320,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 4,
                }}
              >
                {options.map((opt) => {
                  const isSelected = value === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => handleSelect(opt.value)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        backgroundColor: isSelected
                          ? (colors.gray[200] ?? '#E4E4E7')
                          : 'transparent',
                        borderRadius: 8,
                        marginVertical: 2,
                      }}
                    >
                      <Text className="text-primary" style={{ fontSize: 16 }}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
