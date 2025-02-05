import { useState } from 'react';
import { useSession } from '@/contexts/AuthContext';
import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, Link } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { getGreeting } from '@/utils/greeting';
import { useDialog, DialogContent } from '@/components/Dialog';
import { Input } from '@/components/Input';
import { colors } from '@/styles/colors';
import { MainDeckCard } from '@/components/atoms/MainDeckCard';
import { DeckCardSecondary } from '@/components/atoms/DeckCardSecondary';


export default function Home() {
    const { userInfo } = useSession();

    const { setOpen } = useDialog();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const router = useRouter();

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

    return (
        <View className='flex-1 w-4/5 max-w-[1440px] mx-auto mt-12 relative'>
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                <View >
                    <View className='flex flex-col justify-center items-center py-5'>
                        <Text className='text-[15px] text-gray-600 mb-1 font-[ComicSans]'>
                            {getGreeting()}, {userInfo?.name.toUpperCase()}!
                        </Text>
                        <Text style={{ color: colors.primary[500] }}
                            className="text-2xl font-bold">New Day, New Strength!</Text>
                    </View>
                    <MainDeckCard />
                </View>

                <Text style={{ color: colors.primary[600] }}
                    className="text-sm font-bold my-7">CHECK OUT OTHERS MASTERDECKS</Text>

                <DeckCardSecondary name="Ingles" image="https://images.prismic.io/website-b2c/Zu2_orVsGrYSvo18_ingles-britanico-2-.jpg?auto=format,compress" type="collection" />
                <DeckCardSecondary name="Espanhol" image="https://www.agbt.com.br/wp-content/uploads/2020/02/O-Melhor-Tradutor-de-Portugu%C3%AAs-para-Espanhol.jpg" type="collection" />
                <DeckCardSecondary name="Italiano" image="https://laviaitalia.com.br/wp-content/uploads/2023/10/aprender-italiano-960x640-1.jpg" type="collection" />
                <DeckCardSecondary name="Chinês" image="https://ibrachina.com.br/wp-content/uploads/2019/11/wp1939724-scaled.jpg" type="collection" />
                <DeckCardSecondary name="Francês" image="https://cdn.wizard.com.br/wp-content/uploads/2019/08/14113136/moca-torre-eiffel-com-bandeira-francesa.jpg" type="collection" />

                <Link href="./collections" asChild>
                    <TouchableOpacity className='w-full flex flex-row items-center justify-end'>
                        <Text style={{ color: colors.primary[500] }}>See all your decks</Text>
                        <MaterialIcons name="arrow-right-alt" size={24} color={colors.primary[500]} />
                    </TouchableOpacity>
                </Link>

            </ScrollView>

            <LinearGradient
                colors={['transparent', 'white']}
                className="absolute bottom-0 left-0 right-0 h-28"
                pointerEvents="none"
            />


            <TouchableOpacity className="absolute bottom-7 right-7 bg-[#007AFF] rounded-full p-2.5"
                onPress={() => setOpen(true)}>
                <MaterialIcons name="add" size={40} color={colors.gray[100]} />
            </TouchableOpacity>

            <DialogContent className="bg-white rounded-t-lg w-full absolute flex items-center bottom-0 h-1/2 p-4">

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

        </View>
    );
}
