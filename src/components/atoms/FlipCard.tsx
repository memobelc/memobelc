import { colors } from '@/styles/colors';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';

interface FlipCardProps {
  frontSide: string,
  backSide: string
}


const FlipCard = ({ frontSide, backSide }: FlipCardProps) => {
  const [flipped, setFlipped] = useState(false);
  const rotateAnim = useState(new Animated.Value(0))[0];

  const flipCard = () => {
    if (flipped) {
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setFlipped(false);
    } else {
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
    <View className="flex items-center justify-center py-5">
      <Pressable onPress={flipCard} className="w-64 h-96 relative">
        {/* Front of Card */}

        <Animated.View
          style={{
            transform: [{ rotateY: frontInterpolate }],
            opacity: frontOpacity,
          }}
          className="absolute w-full h-full bg-white rounded-2xl justify-center items-center shadow-lg">
          <Text className="text-xl font-bold">{frontSide}</Text>
          <View style={{ position: 'absolute', top: 0, right: 0 }}>
            <LinearGradient
              colors={[colors.gray[100], colors.primary[500]]}
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



        </Animated.View>

        {/* Back of Card */}

        <Animated.View
          style={{
            transform: [{ rotateY: backInterpolate }],
            opacity: backOpacity,
            backgroundColor: colors.primary[500]
          }}
          className="absolute w-full h-full rounded-2xl justify-center items-center shadow-lg">
          <Text className="text-xl font-bold text-white">{backSide}</Text>
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
                transform: [{ rotate: '90deg' }]
              }}
            />
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
};

export default FlipCard;
