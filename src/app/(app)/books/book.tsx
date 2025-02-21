import { Image, Text, TouchableOpacity, View } from 'react-native';
import FlipBook from './FlipBook';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/styles/colors';
import { useRouter } from 'expo-router';
import { Progress } from '@/components/Progress';

const images = [
  'https://firebasestorage.googleapis.com/v0/b/memobelc.firebasestorage.app/o/books%2Fpage_1.png?alt=media&token=fa5bc473-8fbd-43c0-9858-df1b0ac369a6',
  'https://firebasestorage.googleapis.com/v0/b/memobelc.firebasestorage.app/o/books%2Fpage_2.png?alt=media&token=7d7aaa5d-dbe8-4e43-9766-f6a5572800ea',
  'https://firebasestorage.googleapis.com/v0/b/memobelc.firebasestorage.app/o/books%2Fpage_3.png?alt=media&token=dbb3e43c-d801-418f-802c-ebe815c7b50a',
  'https://firebasestorage.googleapis.com/v0/b/memobelc.firebasestorage.app/o/books%2Fpage_4.png?alt=media&token=d4f28a82-1b2f-4e22-84b8-534b2edc3557',
  'https://firebasestorage.googleapis.com/v0/b/memobelc.firebasestorage.app/o/books%2Fpage_5.png?alt=media&token=b84a9c68-8620-4363-a1f5-4919d149ce71',
];

export default function BookScreen() {
  const router = useRouter();
  return (
    <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8 relative">
      <View className="flex-row justify-between items-center w-full bg-gray-100 -mt-2">
        <View className="flex-col w-full p-2 gap-5">
          <View className="flex flex-row items-center">
            <TouchableOpacity className="w-[10%]" onPress={() => router.back()}>
              <MaterialCommunityIcons name="close" size={30} color="black" />
            </TouchableOpacity>
            <View className="flex-row w-[80%] items-center justify-center">
              <Text className="font-semibold text-3xl text-black">
                name livro
              </Text>
            </View>
          </View>
          {/* <Progress value={2} range={images.length} /> */}
        </View>
      </View>{' '}
      <FlipBook images={images} />
    </View>
  );
}
