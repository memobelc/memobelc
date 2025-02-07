import { View, Image, Text, TouchableOpacity } from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from "@/styles/colors";
import { Link, LinkProps } from "expo-router";


interface CardSecondaryProps {
    image: string,
    type: 'collection' | 'deck',
    name: string,
    pending_cards: number,
    total_cards: number,
}

export const DeckCardSecondary = ({ image, name, type, pending_cards, total_cards }: CardSecondaryProps) => {
    return (

        <Link href={{ pathname: type == "deck" ? './deck' : "./collection", params: { name } }} asChild>
            <TouchableOpacity className='w-full flex flex-row items-center justify-end'>
                <View className="w-full h-[100px] bg-white rounded-[12px] overflow-hidden relative shadow-lg my-3">
                    <Image
                        source={{ uri: image }}
                        className="w-[30%] h-full absolute  top-0"
                    />

                    <View className="w-[70%] h-full justify-center items-center left-[30%]">
                        <Text className="font-[ComicSans] text-xl font-bold pb-3 text-start w-full px-6">{name}</Text>
                        <View className="flex flex-row justify-between items-center  w-[80%]">
                            <View className="flex  bg-red-100 px-2 py-1 rounded-md items-center justify-between flex-row"
                            >
                                <MaterialCommunityIcons className="pr-2" name="cards" size={24} color={colors.error[600]} />
                                <Text className="font-[ComicSans] text-xs  color-red-700">{total_cards != 0 ? `${pending_cards} out of ${total_cards} to study` : 'No cards added yet'}</Text>
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
