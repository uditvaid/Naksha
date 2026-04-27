import Purchases, { LOG_LEVEL, PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';
import { REVENUECAT_IOS_KEY, REVENUECAT_ANDROID_KEY } from '@constants/config';

const IOS_API_KEY = REVENUECAT_IOS_KEY;
const ANDROID_API_KEY = REVENUECAT_ANDROID_KEY;

let _configured = false;

export async function initRevenueCat(userId?: string): Promise<void> {
  if (_configured) return;
  const apiKey = Platform.OS === 'ios' ? IOS_API_KEY : ANDROID_API_KEY;
  if (!apiKey) {
    throw new Error('RevenueCat API key missing — subscription features are disabled in this build.');
  }
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.VERBOSE : LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey, appUserID: userId });
  _configured = true;
}

export async function getOfferings(): Promise<PurchasesPackage[]> {
  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current) {
      return offerings.current.availablePackages;
    }
    return [];
  } catch (e) {
    if (__DEV__) console.warn('RevenueCat getOfferings error:', e);
    return [];
  }
}

export type PurchaseResult =
  | { status: 'success'; customerInfo: CustomerInfo }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

export async function purchasePackage(pkg: PurchasesPackage): Promise<PurchaseResult> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { status: 'success', customerInfo };
  } catch (e: any) {
    if (e?.userCancelled) return { status: 'cancelled' };
    if (__DEV__) console.warn('Purchase error:', e);
    return { status: 'error', message: e?.message ?? 'Purchase failed. Please try again.' };
  }
}

export async function restorePurchases(): Promise<CustomerInfo> {
  // Throws on error so callers can distinguish "no purchases" from "couldn't reach server"
  return Purchases.restorePurchases();
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    return null;
  }
}

export function isPremiumActive(customerInfo: CustomerInfo): boolean {
  return !!customerInfo.entitlements.active['premium'];
}

// Pricing display helpers
export const PRICING = {
  monthly: { price: '$14.99', period: 'month', label: 'Monthly' },
  annual: { price: '$149.99', period: 'year', label: 'Annual', savings: 'Save 17%' },
  lifetime: { price: '$249.99', period: 'once', label: 'Lifetime', savings: 'Best Value' },
};

export function addCustomerInfoListener(
  callback: (info: CustomerInfo) => void
): () => void {
  Purchases.addCustomerInfoUpdateListener(callback);
  return () => Purchases.removeCustomerInfoUpdateListener(callback);
}

export const PREMIUM_FEATURES = [
  { icon: '∞', text: 'Unlimited Guru AI conversations' },
  { icon: '✦', text: 'Personalized daily cosmic readings' },
  { icon: '🖐', text: 'Full palm reading analysis' },
  { icon: '◉', text: 'Complete birth chart with all divisional charts' },
  { icon: '☯', text: 'Chinese astrology & zodiac reading' },
  { icon: '📖', text: 'Lal Kitab remedies & personalized upay' },
  { icon: '♡', text: 'Unlimited compatibility & synastry reports' },
  { icon: '📊', text: 'Advanced Dasha timeline & predictions' },
  { icon: '∑', text: 'Full numerology profile' },
  { icon: '✓', text: 'Saved charts for family & friends' },
];
