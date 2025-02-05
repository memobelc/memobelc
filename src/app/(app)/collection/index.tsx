import { DeckCardSecondary } from '@/components/atoms/DeckCardSecondary';
import { View, Image, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/colors';
import { DialogContent, useDialog } from '@/components/Dialog';
import { useState } from 'react';
import { Input } from '@/components/Input';

export default function Collection() {
    const router = useRouter();
    const { setOpen } = useDialog();
    const [openAddDeck, setOpenAddDeck] = useState(false)
    const [openStudy, setOpenStudy] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const { name } = useLocalSearchParams();

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            alert('Permission denied, You need to allow access to the gallery.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setSelectedImage(result.assets[0].uri);
        }
    };

    const HandleOpenAddDeck = () => {
        setOpenAddDeck(true)
        setOpenStudy(false);
        setOpen(true)
    }

    const HandleOpenStudy = () => {
        setOpenStudy(true);
        setOpenAddDeck(false)
        setOpen(true)
    }

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

            <Text className='w-full text-gray-800 text-2xl font-bold'>
                {name}
            </Text>

            <View className="my-6 w-full h-40 bg-white rounded-[12px] overflow-hidden shadow-lg">
                <Image
                    source={require('@/assets/masterdeck.png')}
                    className="w-full h-full top-0"
                />
            </View>

            <TouchableOpacity style={{ backgroundColor: colors.warning[500] }} className="flex flex-row items-center justify-center w-full  rounded-full p-2.5" onPress={HandleOpenStudy}>
                <Text className='text-white font-bold text-2xl'>Study Now</Text>
                <MaterialIcons name="arrow-right-alt" size={40} color='white' />
            </TouchableOpacity>

            <View className="mt-8 flex-col w-full items-start justify-between z-10 bg-gray-100 mb-4">
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
                <DeckCardSecondary name="DC - Checking in at the airport" image="https://travelopod.com/_next/image?url=https%3A%2F%2Fstatic.wixstatic.com%2Fmedia%2F0539f7_aee4fccbe409439e8334b9f9b5426020~mv2.jpg&w=2048&q=75" type="deck" />
                <DeckCardSecondary name="DC - Checking in at the airport" image="'@/assets/logo_memobelc.jpg'" type="deck" />
                <DeckCardSecondary name="DC - Checking in at the airport" image="'@/assets/logo_memobelc.jpg'" type="deck" />
                <DeckCardSecondary name="DC - Checking in at the airport" image="'@/assets/logo_memobelc.jpg'" type="deck" />
                <DeckCardSecondary name="DC - Checking in at the airport" image="'@/assets/logo_memobelc.jpg'" type="deck" />
            </ScrollView>

            <LinearGradient
                colors={['transparent', 'white']}
                className="absolute bottom-0 left-0 right-0 h-60"
                pointerEvents="none"
            />

            <TouchableOpacity style={{ backgroundColor: colors.primary[500] }} className="flex flex-row items-center justify-center w-full absolute bottom-7 rounded-full p-2" onPress={HandleOpenAddDeck}>
                <Text className='text-white font-bold text-2xl'>Add deck</Text>
            </TouchableOpacity>

            {openStudy && <DialogContent style={{ backgroundColor: colors.primary[500], display: openStudy ? 'flex' : 'none' }} className="rounded-t-lg w-full absolute items-center bottom-0 h-4/5 p-4">

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

            </DialogContent>}



            {
                openAddDeck && <DialogContent className="bg-white rounded-t-lg flex w-full absolute items-center bottom-0 h-1/2 p-4">

                    <View className="flex flex-row justify-between items-center mb-2 w-full">
                        <Text className="font-semibold text-xl text-primary justify-center">New deck collection</Text>
                        <TouchableOpacity onPress={() => setOpen(false)}>
                            <MaterialIcons name="close" size={24} color={colors.gray[950]} />
                        </TouchableOpacity>
                    </View>

                    <View className="border-b border-gray-300 mb-4 w-full" />

                    <TouchableOpacity
                        onPress={pickImage}
                        className="border border-dashed border-gray-400 rounded-lg p-10 flex items-center justify-center w-full"
                    >
                        {selectedImage ? (
                            <View className='relative'>
                                <Image source={{ uri: selectedImage }} className="w-32 h-32 rounded-lg" />
                                <View className='bg-slate-100 absolute -top-2 -right-2 w-6 rounded-md' >
                                    <MaterialIcons onPress={() => setSelectedImage(null)} name="close" size={24} color="red" className='' />
                                </View>
                            </View>

                        ) : (
                            <View className='flex-col items-center justify-center '>
                                <MaterialIcons name="cloud-upload" size={40} color="gray" />
                                <Text className="text-gray-500 mt-2 ">Tap to send an image</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <Input placeholder="Enter your name deck collection" className='py-6 w-full' />
                    <TouchableOpacity style={{ backgroundColor: colors.primary[500] }} className='w-full max-w-[500px] py-4 rounded-3xl items-center mb-5' onPress={() => console.log()}>
                        <Text className='text-white text-base font-bold'>Create New deck collection</Text>
                    </TouchableOpacity>

                </DialogContent>

            }


        </View>
    );
}
