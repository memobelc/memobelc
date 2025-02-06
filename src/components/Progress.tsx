import { useEffect, useRef } from 'react';
import { Animated, View, Text } from 'react-native';
import { cn } from '@/lib/utils';

function Progress({ className, value, range }: { className?: string; value: number, range?: number }) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  let inRange = range ? range : 100
  let percent = value * 100 / inRange

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: value,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [value]);

  return (
    <View className='w-full flex-row items-center'>
      <Text className='text-xs w-[15%] flex items-center px-1'>{Math.round(percent)} %</Text>
      <View className={cn('h-4 w-[70%] overflow-hidden rounded-full bg-gray-300', className)}>

        <Animated.View
          style={{
            width: widthAnim.interpolate({
              inputRange: [0, inRange],
              outputRange: ['0%', '100%'],
            }),
            backgroundColor: '#3b82f6',
            height: '100%',
          }}
        />
      </View>
      <Text className='text-xs w-[15%] flex-row items-center '> {value} / {inRange}</Text>
    </View>
  );
}

export { Progress };
