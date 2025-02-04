import React, { useState } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';

const FlipCard = () => {
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
    <View className="flex items-center justify-center h-full">
      <Pressable onPress={flipCard} className="w-64 h-96 relative">
        {/* Front of Card */}

        <Animated.View
          style={{
            transform: [{ rotateY: frontInterpolate }],
            opacity: frontOpacity,
          }}
          className="absolute w-full h-full bg-white rounded-2xl justify-center items-center shadow-lg">
          <Text className="text-xl font-bold">Front Side</Text>
          {/* <View className="absolute top-0 right-0 w-8 h-8 bg-gray-200 rounded-br-3xl transform rotate-45 -translate-y-2 translate-x-2" /> */}
        </Animated.View>
        
        {/* Back of Card */}

        <Animated.View
          style={{
            transform: [{ rotateY: backInterpolate }],
            opacity: backOpacity,
          }}
          className="absolute w-full h-full bg-blue-500 rounded-2xl justify-center items-center shadow-lg">
          <Text className="text-xl font-bold text-white">Back Side</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
};

export default FlipCard;
