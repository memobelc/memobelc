import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '@/styles/colors';

interface OpenDialogProps {
  open: boolean;
  title?: string;
  subTitle?: string;
  children: React.ReactNode;
  onClose?: () => void;
}

export const OpenDialogInput = ({
  open,
  title,
  subTitle,
  children,
  onClose,
}: OpenDialogProps) => {
  const handleClose = () => {
    onClose?.();
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={open}
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        className="w-full h-full"
        activeOpacity={1}
        onPress={handleClose}
      >
        <View className="flex flex-1 justify-end items-center bg-black/75">
          <TouchableOpacity
            activeOpacity={1}
            style={{
              backgroundColor: colors.primary[500],
            }}
            className="rounded-t-lg w-full items-center h-4/5 p-4"
          >
            <View className="flex flex-row justify-between items-center mb-2 w-full">
              <TouchableOpacity onPress={handleClose}>
                <MaterialIcons name="close" size={24} color={colors.gray[100]} />
              </TouchableOpacity>
            </View>

            <View className="my-10">
              <Text className="text-white text-3xl font-bold">{title}</Text>
              {!!subTitle && (
                <Text className="text-white text-xl">{subTitle}</Text>
              )}
            </View>
            {children}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};
