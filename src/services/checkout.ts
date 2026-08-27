import { Platform } from 'react-native';
import { billingApi } from '@/services/billing';

export type BillingType = 'PIX' | 'CREDIT_CARD';

export type CreditCardPayload = {
  holder_name: string;
  number: string;
  expiry_month: string;
  expiry_year: string;
  ccv: string;
  postal_code: string;
  address_number: string;
  phone: string;
};

export async function waitForPayment(token: string | undefined, paymentId: string, attempts = 12) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 2000 : 3000));
    const response = await billingApi.syncPayment(token, paymentId);
    if (response.data?.granted || response.data?.payment?.status === 'confirmed') {
      return true;
    }
  }
  return false;
}

export async function startCheckout(options: {
  token?: string;
  productType: 'plan' | 'book' | 'bundle' | 'course' | 'classroom';
  productId: string;
  couponCode?: string;
  cpfCnpj?: string;
  billingType: BillingType;
  creditCard?: CreditCardPayload;
  publicCheckout?: {
    name: string;
    email: string;
    password?: string;
  };
}) {
  const payload: Record<string, unknown> = {
    product_type: options.productType,
    product_id: options.productId,
    // Legacy APIs routed android → Google Play. Checkout is Asaas-only.
    platform: 'web',
    coupon_code: options.couponCode,
    billing_type: options.billingType,
    cpf_cnpj: options.cpfCnpj,
  };
  if (options.publicCheckout) {
    payload.name = options.publicCheckout.name;
    payload.email = options.publicCheckout.email;
  }
  const response = options.publicCheckout
    ? await billingApi.publicCheckout(payload)
    : await billingApi.checkout(options.token, payload);
  const data = response.data;
  if (data?.provider === 'google_play') {
    throw new Error('Checkout must use Asaas. Google Play is disabled.');
  }
  return data;
}

export function formatCpfCnpj(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2}).*/, (_, a, b, c, d, e) =>
      `${a}.${b}.${c}/${d}${e ? `-${e}` : ''}`,
    );
}

export async function openAsaasCheckout(url: string) {
  if (!url) return false;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.location.assign(url);
    }
    return true;
  }
  try {
    const WebBrowser = require('expo-web-browser');
    if (WebBrowser?.openBrowserAsync) {
      await WebBrowser.openBrowserAsync(url);
      return true;
    }
  } catch {
    /* fallback below */
  }
  try {
    const { Linking } = require('react-native');
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

export async function copyText(value: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  try {
    const Clipboard = require('expo-clipboard');
    if (Clipboard?.setStringAsync) {
      await Clipboard.setStringAsync(value);
      return true;
    }
  } catch {
    /* optional native clipboard */
  }
  try {
    const { Share } = require('react-native');
    await Share.share({ message: value });
    return true;
  } catch {
    return Platform.OS === 'web';
  }
}
