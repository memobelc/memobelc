import { useState } from 'react';
import { useSession } from '@/contexts/AuthContext';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { styles } from './styles';
import { getGreeting } from '@/utils/greeting';
import { useDialog, DialogContent } from '@/components/Dialog';
import { Input } from '@/components/Input';
import { colors } from '@/styles/colors';


export default function Home() {
    const { userInfo } = useSession();
    const { setOpen } = useDialog();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
        <View style={styles.container}>
            <View style={styles.mainCard}>
                <View style={styles.greetingContainer}>
                    <Text style={styles.greetingText}>
                        {getGreeting()}, {userInfo?.name.toUpperCase()}!
                    </Text>
                    <Text style={styles.mainText}>New Day, New Strength!</Text>
                    <TouchableOpacity style={styles.studyButton}>
                        <Text style={styles.studyButtonText}>Study Now</Text>
                        <MaterialIcons name="arrow-forward" size={24} color={colors.primary[500]} />
                    </TouchableOpacity>
                </View>
            </View>


            <TouchableOpacity style={styles.floatingButton} onPress={() => setOpen(true)}>
                <MaterialIcons name="add" size={40} color={colors.gray[100]} />
            </TouchableOpacity>

            <DialogContent className="bg-white rounded-t-lg w-full absolute flex items-center bottom-0 h-1/2 p-4">
                {/* Cabeçalho do Dialog */}
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
                <TouchableOpacity style={{backgroundColor:colors.primary[500]}}  className='w-full max-w-[500px] py-4 rounded-3xl items-center mb-5' onPress={() => console.log()}>
                    <Text className='text-white text-base font-bold'>Create New deck collection</Text>
                </TouchableOpacity>

            </DialogContent>
        </View>
    );
}
