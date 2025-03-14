import { colors } from '@/styles/colors';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const books = [
  {
    id: '1',
    title: 'Ali Baba and the Forty Thieves',
    image: '@/assets/logo_memobelc.jpg',
    pdfUri:
      'https://firebasestorage.googleapis.com/v0/b/memobelc.firebasestorage.app/o/books%2Fbook_1_-_oxford_dominoes_quick_starter_ali_baba_and_the_forty_thieves.pdf?alt=media&token=8ee581e0-7ce0-447c-92eb-1684fc1c0ba5',
  },
  {
    id: '2',
    title: 'Ali Baba and the Forty Thieves',
    image: '@/assets/logo_memobelc.jpg',
    pdfUri:
      'https://firebasestorage.googleapis.com/v0/b/memobelc.firebasestorage.app/o/books%2Fbook_1_-_oxford_dominoes_quick_starter_ali_baba_and_the_forty_thieves.pdf?alt=media&token=8ee581e0-7ce0-447c-92eb-1684fc1c0ba5',
  },
  {
    id: '3',
    title: 'Ali Baba and the Forty Thieves',
    image: '@/assets/logo_memobelc.jpg',
    pdfUri:
      'https://firebasestorage.googleapis.com/v0/b/memobelc.firebasestorage.app/o/books%2Fbook_1_-_oxford_dominoes_quick_starter_ali_baba_and_the_forty_thieves.pdf?alt=media&token=8ee581e0-7ce0-447c-92eb-1684fc1c0ba5',
  },
];

export default function BooksScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8 relative">
      <View className="flex-row justify-between items-center w-full bg-gray-100 -mt-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <Ionicons
            name="arrow-back-circle"
            size={24}
            color={colors.primary[500]}
          />
          <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {} /* Function to select language */}
          className="flex-row items-center"
        >
          <Image
            source={require('@/assets/flags/flag-uk.png')}
            className="w-6 h-6"
          />
          <Text style={{ color: colors.primary[500], marginLeft: 5 }}>
            English
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        placeholder={t('Search books...')}
        placeholderTextColor="#888"
        className="h-14 w-full border border-gray-300 rounded-lg pl-2 text-sm"
      />

      <View>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 200 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-center justify-start pt-6 pb-2">
            <MaterialIcons
              className="mr-2"
              name="local-library"
              size={24}
              color="black"
            />
            <Text>Your Library</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={{ paddingHorizontal: 4 }}
          >
            {books.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => router.push('./books/book')}
                className="px-4 flex items-center justify-start w-40 rounded-[12px]"
              >
                <Image
                  source={require('@/assets/page_1.png')}
                  className="w-32 h-48"
                  resizeMode="contain"
                />
                <Text className="font-[ComicSans] text-sm text-center w-32">
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View className="flex-row items-center justify-start mt-4 mb-2">
            <Ionicons
              className="mr-2"
              name="library-outline"
              size={24}
              color="black"
            />
            <Text>Discover</Text>
          </View>

          <View className="flex flex-row flex-wrap justify-start gap-4">
            {books.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => router.push('./books/book')}
                className="p-4 flex items-center justify-center bg-gray-200 w-40 rounded-[12px]"
              >
                <Image
                  source={require('@/assets/page_1.png')}
                  className="w-32 h-40"
                  resizeMode="contain"
                />
                <Text className="font-[ComicSans] text-sm text-center w-32">
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
