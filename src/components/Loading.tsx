import { View, ActivityIndicator, StyleSheet } from 'react-native';

interface ILoadingProps {
  color?: string;
  classname?: string;
}

export const Loading = ({ color = 'white', classname }: ILoadingProps) => {
  return (
    <View className={classname}>
      <ActivityIndicator size="large" color={color} />
    </View>
  );
};
