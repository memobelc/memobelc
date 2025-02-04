import { View, Image, Text, TouchableOpacity } from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from "@/styles/colors";
import { Link } from "expo-router";

export const CardSecondary = () => {
    return (

        <Link href="./deck" asChild>
            <TouchableOpacity className='w-full flex flex-row items-center justify-end'>
                <View className="w-full h-[100px] bg-white rounded-[12px] overflow-hidden relative shadow-lg my-3">
                    <Image
                        source={require('@/assets/logo_memobelc.jpg')}
                        className="w-[30%] h-full absolute  top-0"
                    />

                    <View className="w-[70%] h-full justify-center items-center left-[30%]">
                        <Text className="text-xl font-bold pb-3">Master Deck</Text>
                        <View className="flex flex-row justify-between items-center  w-[80%]">
                            <View className="flex  bg-red-100 px-2 py-1 rounded-md items-center justify-between flex-row"
                            >
                                <MaterialCommunityIcons className="pr-2" name="cards" size={24} color={colors.error[600]} />
                                <Text className="text-xs  color-red-700">1000 out of 1200</Text>
                            </View>
                            <MaterialIcons name="language" size={24} color="#000" />
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Link>

    );
};
