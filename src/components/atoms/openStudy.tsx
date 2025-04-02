import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/colors';
import { DialogContent, useDialog } from '@/components/Dialog';
import { useTranslation } from 'react-i18next';

type MaterialIconName = keyof typeof MaterialIcons.glyphMap;

interface OpenStudyProps {
  open: boolean;
}

export const OpenStudy = ({ open }: OpenStudyProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { setOpen } = useDialog();

  const HandleToStudy = (q: string) => {
    router.push({ pathname: './study', params: { q } });
    setOpen(false);
  };

  const studyOptions: {
    label: string;
    desc: string;
    icon: MaterialIconName;
    q: string;
  }[] = [
    {
      label: 'Ideal',
      desc: 'Study all of the cards from the deck',
      icon: 'emoji-emotions',
      q: 'all',
    },
    { label: 'Good', desc: 'Up to 150 cards', icon: 'thumb-up', q: '150' },
    { label: 'Medium', desc: 'Up to 100 cards', icon: 'balance', q: '100' },
    {
      label: 'Short',
      desc: 'Up to 50 cards',
      icon: 'hourglass-bottom',
      q: '50',
    },
  ];

  return (
    <DialogContent
      style={{
        backgroundColor: colors.primary[500],
        display: open ? 'flex' : 'none',
      }}
      className="rounded-t-lg w-full max-w-md md:max-w-[80%] absolute items-center h-auto min-h-[60vh] md:h-[80%] p-6 md:p-10"
    >
      <View className="flex flex-row justify-between items-center mb-4 w-full">
        <TouchableOpacity onPress={() => setOpen(false)}>
          <MaterialIcons name="close" size={24} color={colors.gray[100]} />
        </TouchableOpacity>
      </View>

      <View className="my-6 text-center">
        <Text className="text-white text-2xl md:text-3xl font-bold">
          {t('Select your study goal now')}
        </Text>
        <Text className="text-white text-lg md:text-xl mt-2">
          {t('The more you study, the more you learn!')}
        </Text>
      </View>

      <View className="w-full gap-4">
        {studyOptions.map(({ label, desc, icon, q }) => (
          <TouchableOpacity key={q} onPress={() => HandleToStudy(q)}>
            <View className="w-full h-24 md:h-20 bg-white flex-row rounded-lg items-center p-4 shadow-md">
              <MaterialIcons
                name={icon}
                size={36}
                color={colors.warning[500]}
                className="mr-4"
              />
              <View>
                <Text className="text-gray-700 font-bold text-xl">
                  {t(label)}
                </Text>
                <Text className="text-gray-700 text-sm">{t(desc)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </DialogContent>
  );
};
