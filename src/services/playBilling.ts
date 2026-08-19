import { Platform } from 'react-native';

export async function purchaseGooglePlaySku(sku: string): Promise<{ purchaseToken: string; productId: string }> {
  if (Platform.OS !== 'android') {
    throw new Error('Google Play is only available on Android');
  }
  try {
    const iap = require('react-native-iap');
    await iap.initConnection();
    const purchases = await iap.requestPurchase({ sku });
    const purchase = Array.isArray(purchases) ? purchases[0] : purchases;
    const token = purchase?.purchaseToken || purchase?.purchaseTokenAndroid;
    if (!token) {
      throw new Error('Missing purchase token');
    }
    return { purchaseToken: token, productId: purchase.productId || sku };
  } catch (error: any) {
    if (error?.message?.includes('react-native-iap')) {
      throw new Error('Google Play Billing requires a development or production build.');
    }
    throw error;
  }
}

export async function openPlaySubscriptions() {
  const { Linking } = require('react-native');
  await Linking.openURL('https://play.google.com/store/account/subscriptions');
}
