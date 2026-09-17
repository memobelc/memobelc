import { Linking, Platform } from 'react-native';

const PLAY_SUBSCRIPTIONS_URL = 'https://play.google.com/store/account/subscriptions';

export async function openPlaySubscriptions() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(PLAY_SUBSCRIPTIONS_URL, '_blank');
    return;
  }
  await Linking.openURL(PLAY_SUBSCRIPTIONS_URL);
}
