import { CardSecondary } from '@/components/atoms/CardSecondary';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/colors';

export default function Deck() {
    const router = useRouter();

    return (
        <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8 relative">
            <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-3 ml-3">
                <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
                <Text style={{ color: colors.primary[500] }}>Back</Text>
            </TouchableOpacity>
            <View className="flex flex-row justify-between items-center">
                <MaterialIcons name="language" size={24} color="#000" />
                <View className="flex bg-red-100 px-2 py-1 rounded-md items-center justify-center flex-row"
                >
                    <MaterialCommunityIcons className="pr-2" name="cards" size={24} color={colors.red[600]} />
                    <Text className="text-xs  color-red-700">1000 out of 1200 to study</Text>
                </View>

            </View>
            <LinearGradient
                colors={['transparent', 'white']}
                className="absolute bottom-0 left-0 right-0 h-28"
                pointerEvents="none"
            />
        </View>
    );
}
