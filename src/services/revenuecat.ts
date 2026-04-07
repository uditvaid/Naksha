import Purchases, { LOG_LEVEL, PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';
import { SUBSCRIPTION_PRODUCTS } from '@constants/astrology';
import { REVENUECAT_IOS_KEY, REVENUECAT_ANDROID_KEY } from '@constants/config';

const IOS_API_KEY = REVENUECAT_IOS_KEY;
const ANDROID_API_KEY = REVENUECAT_ANDROID_KEY;

export async function initRevenueCat(userId?: string): Promise<void> {
  Purchases.setLogLevel(LOG_LEVEL.VERBOSE); // remove before production release

  const apiKey = Platform.OS === 'ios' ? IOS_API_KEY : ANDROID_API_KEY;
  Purchases.configure({ apiKey, appUserID: userId });
}

export async function getOfferings(): Promise<PurchasesPackage[]> {
  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current) {
      return offerings.current.availablePackages;
    }
    return [];
  } catch (e) {
    console.error('RevenueCat getOfferings error:', e);
    return [];
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (e: any) {
    if (!e.userCancelled) {
      console.error('Purchase error:', e);
    }
    return null;
  }
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  } catch (e) {
    console.error('Restore error:', e);
    return null;
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    return null;
  }
}

export function isPremiumActive(customerInfo: CustomerInfo): boolean {
  return (
    customerInfo.activeSubscriptions.includes(SUBSCRIPTION_PRODUCTS.monthly) ||
    customerInfo.activeSubscriptions.includes(SUBSCRIPTION_PRODUCTS.annual) ||
    typeof customerInfo.allPurchaseDates[SUBSCRIPTION_PRODUCTS.lifetime] === 'string'
  );
}

// Pricing display helpers
export const PRICING = {
  monthly: { price: '$9.99', period: 'month', label: 'Monthly' },
  annual: { price: '$59.99', period: 'year', label: 'Annual', savings: 'Save 50%' },
  lifetime: { price: '$149.99', period: 'once', label: 'Lifetime', savings: 'Best Value' },
};

export const PREMIUM_FEATURES = [
  { icon: '∞', text: 'Unlimited Guru AI conversations' },
  { icon: '🖐', text: 'Full palm reading analysis' },
  { icon: '◉', text: 'Complete birth chart with all divisional charts' },
  { icon: '☯', text: 'Chinese BaZi Four Pillars reading' },
  { icon: '✦', text: 'Lal Kitab remedies & personalized upay' },
  { icon: '♡', text: 'Unlimited compatibility & synastry reports' },
  { icon: '🔔', text: 'Daily personalized cosmic alerts' },
  { icon: '📊', text: 'Advanced Dasha timeline & predictions' },
  { icon: '∑', text: 'Full numerology profile' },
  { icon: '✓', text: 'Saved charts for family & friends' },
];
