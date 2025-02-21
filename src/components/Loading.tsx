import { View, ActivityIndicator, StyleSheet } from 'react-native';

interface ILoadingProps {
  color?: string;
}

export const Loading = ({ color = 'white' }: ILoadingProps) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={color} />
    </View>
  );
};

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});
