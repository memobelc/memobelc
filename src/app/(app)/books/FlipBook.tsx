import React from 'react';
import { View, Dimensions, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  withSpring,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');

const FlipBook = ({ images }: { images: string[] }) => {
  const currentIndex = useSharedValue(0);
  const rotationY = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      rotationY.value = interpolate(
        event.translationX,
        [-width / 2, width / 2],
        [180, 0],
      );
    })
    .onEnd((event) => {
      if (event.translationX < -50 && currentIndex.value < images.length - 1) {
        currentIndex.value += 1;
      } else if (event.translationX > 50 && currentIndex.value > 0) {
        currentIndex.value -= 1;
      }
      rotationY.value = withSpring(0, { damping: 20, stiffness: 80 }); // Suaviza a transição
    });

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        {images.map((image, index) => {
          const animatedStyle = useAnimatedStyle(() => {
            const rotateY = interpolate(
              currentIndex.value,
              [index - 1, index, index + 1],
              [-180, 0, 180],
            );

            return {
              transform: [{ rotateY: `${rotateY}deg` }],
              opacity: interpolate(rotateY, [-180, 0, 180], [0, 1, 0]),
            };
          });

          return (
            <Animated.View
              key={index}
              style={[
                {
                  position: 'absolute',
                  backfaceVisibility: 'hidden',
                },
                animatedStyle,
              ]}
            >
              <Image
                source={{ uri: image }}
                style={{
                  width: width * 0.8,
                  height: height * 0.8,
                  resizeMode: 'contain',
                }}
              />
            </Animated.View>
          );
        })}
      </View>
    </GestureDetector>
  );
};

export default FlipBook;
