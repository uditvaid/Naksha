import { Redirect } from 'expo-router';
import { useAppStore } from '../src/store/userStore';

/**
 * Initial route — sends the user to onboarding if they've never finished
 * the birth-details flow, or to the tabs otherwise.
 *
 * The `_hasHydrated` flag is set by zustand's persist middleware once it
 * has finished reading the user state from AsyncStorage. Before that, the
 * store returns its INITIAL value (`onboardingComplete: false`), which
 * for a returning user would briefly redirect them to /onboarding before
 * the real persisted state lands — a visible flicker on every cold boot.
 *
 * Rendering `null` while hydration is pending keeps the splash visible
 * (which is held open in _layout.tsx until appReady) and avoids the
 * mis-redirect entirely.
 */
export default function Index() {
  const hasHydrated = useAppStore(s => s._hasHydrated);
  const onboardingComplete = useAppStore(s => s.user.onboardingComplete);
  if (!hasHydrated) return null;
  return onboardingComplete ? <Redirect href="/(tabs)" /> : <Redirect href="/onboarding" />;
}
