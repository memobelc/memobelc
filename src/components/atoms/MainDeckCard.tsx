import { View, Image, Text, TouchableOpacity } from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from "@/styles/colors";
import { Link } from "expo-router";

export const MainDeckCard = () => {
    return (

        <Link href="./collection" asChild>
            <TouchableOpacity className='w-full flex flex-row items-center justify-end'>
                <View className="w-[300px] h-[300px] bg-white rounded-[12px] overflow-hidden shadow-lg">
                    <Image
                        source={require('@/assets/logo_memobelc.jpg')}
                        className="w-full h-[65%]  top-0"
                    />

                    <View className="flex-1 justify-end p-3">
                        <Text className="font-[ComicSans] text-xl font-bold pb-3">Master Deck</Text>
                        <View className="flex flex-row justify-between items-center">
                            <View className="flex bg-red-100 px-2 py-1 rounded-md items-center justify-center flex-row"
                            >
                                <MaterialCommunityIcons className="pr-2" name="cards" size={24} color={colors.error[600]} />
                                <Text className="font-[ComicSans] text-xs  color-red-700">1000 out of 1200 to study</Text>
                            </View>
                            <MaterialIcons name="language" size={24} color="#000" />
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Link>

    );
};
