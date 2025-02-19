import { colors } from '@/styles/colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

export default function BooksScreen() {
  const router = useRouter();
  return (
    <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8 relative">
      <TouchableOpacity
        onPress={() => router.back()}
        className="flex-row items-center mb-3 mr-5"
      >
        <Ionicons
          name="arrow-back-circle"
          size={24}
          color={colors.primary[500]}
        />
        <Text style={{ color: colors.primary[500] }}>Back</Text>
      </TouchableOpacity>

      <View className="flex flex-row justify-center items-center mb-4">
        <View className="flex bg-red-100 px-2 py-1 rounded-md items-center justify-center flex-row">
          <Text className="text-xs color-red-700">No book added yet</Text>
        </View>
      </View>
    </View>
  );
}
