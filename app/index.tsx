import { Redirect } from 'expo-router';
import { useAppStore } from '../src/store/userStore';

export default function Index() {
  const onboardingComplete = useAppStore(s => s.user.onboardingComplete);
  return onboardingComplete ? <Redirect href="/(tabs)" /> : <Redirect href="/onboarding" />;
}
