import { colors } from '@/styles/colors';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Animated, Platform } from 'react-native';
import AudioPlayer from './AudioPlayer';

interface FlipCardProps {
  frontSide: string;
  backSide: string;
  audio?: string | null;
  onFlip?: () => void;
}

const FlipCard = ({
  frontSide,
  backSide,
  audio,
  onFlip = () => {},
}: FlipCardProps) => {
  const [flipped, setFlipped] = useState(false);
  const rotateAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    rotateAnim.setValue(0);
    setFlipped(false);
  }, [frontSide]);

  const flipCard = () => {
    if (flipped) {
      onFlip();
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setFlipped(false);
    } else {
      onFlip();
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setFlipped(true);
    }
  };

  const frontInterpolate = rotateAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '180deg'],
  });

  const backInterpolate = rotateAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['180deg', '270deg', '360deg'],
  });

  const frontOpacity = rotateAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });

  const backOpacity = rotateAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <View className="flex  w-full items-center justify-start py-5">
      <Pressable
        onPress={flipCard}
        className={`w-[80%] ${Platform.OS == 'web' ? 'h-[350]' : 'h-[70%]'} relative`}
      >
        {/* Front of Card */}

        <Animated.View
          style={{
            width: '100%',
            height: '100%',
            display: !flipped ? 'flex' : 'none',
            justifyContent: 'center',
            alignItems: 'center',
            transform: [{ rotateY: frontInterpolate }],
            opacity: frontOpacity,
            backgroundColor: 'white',
            borderRadius: Platform.OS === 'web' ? '16px' : 16,
          }}
          className="absolute w-full h-full bg-white rounded-2xl justify-center items-center shadow-lg"
        >
          <Text className="text-xl font-bold">{frontSide}</Text>
          {Platform.OS !== 'web' && (
            <View style={{ position: 'absolute', top: -1, right: -1 }}>
              <LinearGradient
                colors={[colors.gray[200], colors.primary[500]]}
                start={{ x: 0.01, y: 0 }}
                end={{ x: 0, y: 0.01 }}
                style={{
                  height: 40,
                  width: 40,
                  borderTopRightRadius: 16,
                  borderBottomLeftRadius: 16,
                }}
              />
            </View>
          )}
        </Animated.View>

        {/* Back of Card */}
        <Animated.View
          style={{
            width: '100%',
            height: '100%',
            display: flipped ? 'flex' : 'none',
            justifyContent: 'center',
            alignItems: 'center',
            transform: [{ rotateY: backInterpolate }],
            opacity: backOpacity,
            backgroundColor: colors.primary[500],
            borderRadius: Platform.OS === 'web' ? '16px' : 16,
          }}
          className="absolute w-full h-full rounded-2xl justify-center items-center shadow-lg"
        >
          <Text className="text-xl font-bold text-white">{backSide}</Text>
          {Platform.OS !== 'web' && (
            <View style={{ position: 'absolute', top: -0.8, left: -0.8 }}>
              <LinearGradient
                colors={['white', colors.gray[100]]}
                start={{ x: 0.01, y: 0 }}
                end={{ x: 0, y: 0.01 }}
                style={{
                  height: 40,
                  width: 40,
                  borderTopRightRadius: 16,
                  borderBottomLeftRadius: 16,
                  transform: [{ rotate: '90deg' }],
                }}
              />
            </View>
          )}
        </Animated.View>
        {audio && (
          <View className="absolute left-5 bottom-5">
            <AudioPlayer audioUri={audio} autoPlay={true} />
          </View>
        )}
      </Pressable>
    </View>
  );
};

export default FlipCard;
