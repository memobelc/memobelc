import { CardSecondary } from '@/components/atoms/CardSecondary';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/colors';

export default function AllDecks() {
    const router = useRouter();

    return (
        <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8 relative">
            <View className="absolute top-0 left-0 right-0 flex-col w-full  items-start
             justify-between z-10 bg-gray-100 -mt-2">
                <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-3 ml-3">
                <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
                <Text style={{color: colors.primary[500]}}>Back</Text>
                </TouchableOpacity>

                <TextInput
                    placeholder="Search decks..."
                    placeholderTextColor="#888"
                     className="h-14 w-full mb-3 border border-gray-300 rounded-lg pl-2 text-sm"
                />
            </View>
            <View>
                <ScrollView contentContainerStyle={{ paddingBottom: 200, paddingTop: 100 }} showsVerticalScrollIndicator={false}>
                    <CardSecondary />
                    <CardSecondary />
                    <CardSecondary />
                    <CardSecondary />
                    <CardSecondary />
                    <CardSecondary />
                    <CardSecondary />
                    <CardSecondary />
                    <CardSecondary />
                    <CardSecondary />
                    <CardSecondary />
                    <CardSecondary />
                </ScrollView>

            </View>



            <LinearGradient
                colors={['transparent', 'white']}
                className="absolute bottom-0 left-0 right-0 h-28"
                pointerEvents="none"
            />


        </View>
    );
}
