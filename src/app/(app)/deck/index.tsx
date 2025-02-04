import { CardSecondary } from '@/components/atoms/CardSecondary';
import { View, Image, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/colors';
import { DialogContent, useDialog } from '@/components/Dialog';

export default function Deck() {
    const router = useRouter();
    const { setOpen } = useDialog();

    return (
        <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8 relative">
            <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-3 mr-5">
                <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
                <Text style={{ color: colors.primary[500] }}>Back</Text>
            </TouchableOpacity>

            <View className="flex flex-row justify-between items-center mb-4">
                <MaterialIcons name="language" size={24} color="#000" />
                <View className="flex bg-red-100 px-2 py-1 rounded-md items-center justify-center flex-row">
                    <MaterialCommunityIcons className="pr-2" name="cards" size={24} color={colors.error[600]} />
                    <Text className="text-xs color-red-700">1000 out of 1200 to study</Text>
                </View>
            </View>

            <View className="my-10 w-full h-60 bg-white rounded-[12px] overflow-hidden shadow-lg">
                <Image
                    source={require('@/assets/masterdeck.png')}
                    className="w-full h-full top-0"
                />
            </View>

            <View className="flex-col w-full items-start justify-between z-10 bg-gray-100 -mt-2 mb-4">
                <TextInput
                    placeholder="Search decks..."
                    placeholderTextColor="#888"
                    className="h-14 w-full border border-gray-300 rounded-lg pl-2 text-sm"
                />
            </View>

            <ScrollView
                contentContainerStyle={{ paddingBottom: 200, paddingTop: 20 }}
                showsVerticalScrollIndicator={false}
                className="flex-1"
            >
                <CardSecondary />
                <CardSecondary />
                <CardSecondary />
                <CardSecondary />
                <CardSecondary />
            </ScrollView>

            <LinearGradient
                colors={['transparent', 'white']}
                className="absolute bottom-0 left-0 right-0 h-60"
                pointerEvents="none"
            />

            <TouchableOpacity style={{ backgroundColor: colors.primary[500] }} className="flex flex-row items-center justify-center w-full absolute bottom-7 rounded-full p-2.5" onPress={() => setOpen(true)}>
                <Text className='text-white font-bold text-2xl'>Study Now</Text>
                <MaterialIcons name="arrow-right-alt" size={40} color='white' />
            </TouchableOpacity>

            <DialogContent style={{ backgroundColor: colors.primary[500] }} className="rounded-t-lg w-full absolute flex items-center bottom-0 h-4/5 p-4">

                <View className="flex flex-row justify-between items-center mb-2 w-full">
                    <TouchableOpacity onPress={() => setOpen(false)}>
                        <MaterialIcons name="close" size={24} color={colors.gray[100]} />
                    </TouchableOpacity>
                </View>

                <View className='my-10'>
                    <Text className='text-white text-3xl font-bold'>Select your study goal now</Text>
                    <Text className='text-white text-xl'>The more you study, the more you learn!</Text>
                </View>

                <View className='w-full gap-3' >

                    <TouchableOpacity >
                        <View className='w-full h-28 bg-white flex-row rounded-lg items-center justify-start'>
                            <MaterialIcons className='mx-8' name="emoji-emotions" size={36} color={colors.warning[500]} />
                            <View>
                                <Text className='text-gray-700 font-bold text-2xl'>Ideal</Text>
                                <Text className='text-gray-700 font-bold text-1xs'>Study all of the cards from the deck</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity >
                        <View className='w-full h-28 bg-white flex-row rounded-lg items-center justify-start'>
                            <MaterialIcons className='mx-8' name="thumb-up" size={36} color={colors.warning[500]} />
                            <View>
                                <Text className='text-gray-700 font-bold text-2xl'>Good</Text>
                                <Text className='text-gray-700 font-bold text-1xs'>Up to 150 cards</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity >
                        <View className='w-full h-28 bg-white flex-row rounded-lg items-center justify-start'>
                            <MaterialIcons className='mx-8' name="balance" size={36} color={colors.warning[500]} />
                            <View>
                                <Text className='text-gray-700 font-bold text-2xl'>Medium</Text>
                                <Text className='text-gray-700 font-bold text-1xs'>Up to 100 cards</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity >
                        <View className='w-full h-28 bg-white flex-row rounded-lg items-center justify-start'>
                            <MaterialIcons className='mx-8' name="hourglass-bottom" size={36} color={colors.warning[500]} />
                            <View>
                                <Text className='text-gray-700 font-bold text-2xl'>Short</Text>
                                <Text className='text-gray-700 font-bold text-1xs'>Up to 50 cards</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                </View>

            </DialogContent>

        </View>
    );
}
