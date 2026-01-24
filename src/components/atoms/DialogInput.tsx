import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/colors';
import { Dialog, DialogContent, useDialog } from '@/components/Dialog';

interface OpenDialogProps {
  open: boolean;
  title?: string;
  subTitle?: string;
  children: React.ReactNode;
}

export const OpenDialogInput = ({
  open,
  title,
  subTitle,
  children,
}: OpenDialogProps) => {
  const router = useRouter();
  const { setOpen } = useDialog();

  return (
    <Dialog>
      <DialogContent
        style={{
          backgroundColor: colors.primary[500],
          display: open ? 'flex' : 'none',
        }}
        className="rounded-t-lg w-full absolute items-center bottom-0 h-4/5 p-4"
      >
        <View className="flex flex-row justify-between items-center mb-2 w-full">
          <TouchableOpacity onPress={() => setOpen(false)}>
            <MaterialIcons name="close" size={24} color={colors.gray[100]} />
          </TouchableOpacity>
        </View>

        <View className="my-10">
          <Text className="text-white text-3xl font-bold">{title}</Text>
          <Text className="text-white text-xl">{subTitle}</Text>
        </View>
        {children}
      </DialogContent>
    </Dialog>
  );
};
