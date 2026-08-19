import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { billingApi, billingPlatform } from '@/services/billing';
import { purchaseGooglePlaySku } from '@/services/playBilling';

export async function startCheckout(options: {
  token?: string;
  productType: 'plan' | 'book' | 'bundle';
  productId: string;
  couponCode?: string;
  cpfCnpj?: string;
}) {
  const platform = billingPlatform();
  const response = await billingApi.checkout(options.token, {
    product_type: options.productType,
    product_id: options.productId,
    platform,
    coupon_code: options.couponCode,
    billing_type: 'UNDEFINED',
    cpf_cnpj: options.cpfCnpj,
  });
  const data = response.data;
  if (data.provider === 'google_play' && data.sku) {
    const purchase = await purchaseGooglePlaySku(data.sku);
    await billingApi.googleVerify(options.token, {
      sku: purchase.productId,
      purchase_token: purchase.purchaseToken,
      product_type: options.productType,
    });
    return { provider: 'google_play', verified: true };
  }
  if (data.checkout_url) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(data.checkout_url, '_blank');
    } else {
      await WebBrowser.openBrowserAsync(data.checkout_url);
    }
  }
  return data;
}
