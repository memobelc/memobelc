import { View, Image, Text, TouchableOpacity } from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from "@/styles/colors";
import { Link, LinkProps } from "expo-router";


interface CardSecondaryProps{
    image: string
    type: 'collection' | 'deck'
    name: string
}

export const DeckCardSecondary = ({ image, name, type, ...rest }: CardSecondaryProps) => {
    return (

        <Link href={{ pathname: type == "deck" ? './deck' : "./collection", params: { name } }} asChild>
            <TouchableOpacity className='w-full flex flex-row items-center justify-end'>
                <View className="w-full h-[100px] bg-white rounded-[12px] overflow-hidden relative shadow-lg my-3">
                    <Image
                        source={{ uri: image }}
                        className="w-[30%] h-full absolute  top-0"
                    />

                    <View className="w-[70%] h-full justify-center items-center left-[30%]">
                        <Text className="text-xl font-bold pb-3">{name}</Text>
                        <View className="flex flex-row justify-between items-center  w-[80%]">
                            <View className="flex  bg-red-100 px-2 py-1 rounded-md items-center justify-between flex-row"
                            >
                                <MaterialCommunityIcons className="pr-2" name="cards" size={24} color={colors.error[600]} />
                                <Text className="text-xs  color-red-700">1000 out of 1200</Text>
                            </View>

                            {
                                type === "collection" && <MaterialIcons name="language" size={24} color="#000" />
                            }

                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Link>

    );
};
