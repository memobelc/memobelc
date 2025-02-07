import FlipCard from '@/components/atoms/FlipCard';
import { useEffect, useState } from 'react';
import { View, Modal, TouchableOpacity, Text } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Progress } from '@/components/Progress';

export default function Study() {
  const router = useRouter();
  const { q } = useLocalSearchParams();

  const [range, setRange] = useState(0);
  const [open, setOpen] = useState(true);
  const [valueProgress, setValueProgress] = useState(0);

  const HandleCloseStudy = () => {
    setOpen(false);
    router.push({ pathname: './' });
  };

  useEffect(() => {
    let newRange = 0;

    if (q === 'all') {
      newRange = 999;
    } else {
      const parsedNumber = Number(q);
      newRange = isNaN(parsedNumber) ? 0 : parsedNumber;
    }

    setRange(newRange);
  }, [q]);
  return (
    <Modal
      transparent
      animationType="fade"
      visible={open}
      onRequestClose={() => setOpen(false)}
    >
      <View className=" w-full h-full flex flex-1 items-center bg-gray-200">
        <View className="flex-col  mb-2 w-full p-10 gap-5 ">
          <View className="flex flex-row items-center ">
            <TouchableOpacity className="w-[10%]" onPress={HandleCloseStudy}>
              <MaterialCommunityIcons name="close" size={30} color="black" />
            </TouchableOpacity>
            <View className="flex-row w-[80%]  items-center justify-center">
              <Text className="font-semibold font-[ComicSans] text-3xl text-black justify-center">
                Collection name
              </Text>
            </View>
            <TouchableOpacity className="w-[10%] ">
              <MaterialCommunityIcons name="filter-variant" size={30} />
            </TouchableOpacity>
          </View>
          <Progress value={valueProgress} range={range} />
        </View>
        <FlipCard frontSide="" backSide="" />
      </View>
    </Modal>
  );
}
