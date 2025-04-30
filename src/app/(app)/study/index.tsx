import FlipCard from '@/components/atoms/FlipCard';
import { useEffect, useState } from 'react';
import { View, Modal, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Progress } from '@/components/Progress';
import { useCollection } from '@/contexts/CollectionContext';
import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import api from '@/services/api';
import { useToast } from '@/components/Toast';

export default function Study() {
  const router = useRouter();
  const { currentCollection, setProgressUpdate, progressUpdate } =
    useCollection();
  const { userInfo } = useSession();
  const { toast } = useToast();
  const { q } = useLocalSearchParams();

  const [range, setRange] = useState(0);
  const [open, setOpen] = useState(true);
  const [valueProgress, setValueProgress] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const sendCardsStudied = () => {
    if (progressUpdate && progressUpdate.cards.length > 0) {
      try {
        api.put('/progress/update_status', progressUpdate);
        toast({
          message: `Awesome, you reviewed all ${progressUpdate.cards.length} cards today!`,
          variant: 'success',
        });
        setProgressUpdate(null);
      } catch (error) {
        console.error(error);
      } finally {
        setProgressUpdate(null);
      }
    }
  };

  const setIndexOrClose = () => {
    if (currentIndex + 1 < range) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleCloseStudy();
    }
  };

  const handleCloseStudy = () => {
    setCurrentIndex(0);
    sendCardsStudied();
    setOpen(false);

    router.push('./');
  };

  useEffect(() => {
    let newRange = q === 'all' ? 999 : Number(q) || 0;
    if (currentCollection?.review_collections_cards) {
      newRange = Math.min(
        newRange,
        currentCollection.review_collections_cards.length,
      );
    }
    setRange(newRange);
  }, [q, currentCollection]);

  const handleRecallLevel = (recall_level: any) => {
    const cardId =
      currentCollection?.review_collections_cards[currentIndex]?.card_id;
    if (!cardId) return;

    setValueProgress((prev) => prev + 1);
    setFlipped(false);

    setProgressUpdate((prev) => {
      const updatedProgress = prev
        ? [...prev.cards, { card_id: cardId, recall_level }]
        : [{ card_id: cardId, recall_level }];

      const newProgress = {
        user_id: userInfo!.user_id,
        cards: updatedProgress,
      };

      return newProgress;
    });
  };

  useEffect(() => {
    if (progressUpdate) {
      setIndexOrClose();
    }
  }, [progressUpdate]);

  const currentCard = currentCollection?.review_collections_cards[currentIndex];

  return (
    <Modal transparent animationType="fade" visible={open}>
      <View className="w-full h-full flex flex-1 items-center bg-gray-200">
        <View className="flex-col mb-2 w-full p-10 gap-5">
          <View className="flex flex-row items-center">
            <TouchableOpacity className="w-[10%]" onPress={handleCloseStudy}>
              <MaterialCommunityIcons name="close" size={30} color="black" />
            </TouchableOpacity>
            <View className="flex-row w-[80%] items-center justify-center">
              <Text className="font-semibold text-3xl text-black">
                {currentCollection?.name}
              </Text>
            </View>
          </View>
          <Progress value={valueProgress} range={range} />
        </View>
        {currentCard && (
          <FlipCard
            frontSide={currentCard.front}
            backSide={currentCard.back}
            audio={currentCard.audio}
            onFlip={() => setFlipped(true)}
          />
        )}
        {flipped && (
          <View className="flex-row justify-between p-4 md:w-[50%]">
            {['easy', 'good', 'difficult', "I don't remember"].map((level) => (
              <TouchableOpacity
                key={level}
                className={`flex-1 items-center p-2 mx-1 bg-${level}-500 rounded-lg`}
                onPress={() => handleRecallLevel(level)}
              >
                <MaterialCommunityIcons
                  name={
                    level === 'easy'
                      ? 'emoticon-excited-outline'
                      : level === 'good'
                        ? 'emoticon-happy-outline'
                        : level === 'difficult'
                          ? 'emoticon-neutral-outline'
                          : 'emoticon-sad-outline'
                  }
                  size={24}
                  color={colors.error[600]}
                />
                <Text className="text-blue text-center text-xs mt-1">
                  {level.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}
