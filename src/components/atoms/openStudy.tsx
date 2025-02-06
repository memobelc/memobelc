import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/colors';
import { DialogContent, useDialog } from '@/components/Dialog';


interface OpenStudyProps {
    open: boolean;
}

export const OpenStudy = ({ open }: OpenStudyProps) => {

    const router = useRouter();
    const { setOpen } = useDialog();

    const HandleToStudy = (q: string) => {
        router.push({ pathname: './study', params: { q } })
        setOpen(false)
    }


    return (
        <DialogContent style={{ backgroundColor: colors.primary[500], display: open ? 'flex' : 'none' }} className="rounded-t-lg w-full absolute items-center bottom-0 h-4/5 p-4">

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

                <TouchableOpacity onPress={() => HandleToStudy('all')} >
                    <View className='w-full h-28 bg-white flex-row rounded-lg items-center justify-start'>
                        <MaterialIcons className='mx-8' name="emoji-emotions" size={36} color={colors.warning[500]} />
                        <View>
                            <Text className='text-gray-700 font-bold text-2xl'>Ideal</Text>
                            <Text className='text-gray-700 font-bold text-1xs'>Study all of the cards from the deck</Text>
                        </View>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => HandleToStudy('150')} >
                    <View className='w-full h-28 bg-white flex-row rounded-lg items-center justify-start'>
                        <MaterialIcons className='mx-8' name="thumb-up" size={36} color={colors.warning[500]} />
                        <View>
                            <Text className='text-gray-700 font-bold text-2xl'>Good</Text>
                            <Text className='text-gray-700 font-bold text-1xs'>Up to 150 cards</Text>
                        </View>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => HandleToStudy('100')} >
                    <View className='w-full h-28 bg-white flex-row rounded-lg items-center justify-start'>
                        <MaterialIcons className='mx-8' name="balance" size={36} color={colors.warning[500]} />
                        <View>
                            <Text className='text-gray-700 font-bold text-2xl'>Medium</Text>
                            <Text className='text-gray-700 font-bold text-1xs'>Up to 100 cards</Text>
                        </View>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => HandleToStudy('50')} >
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
    )
}