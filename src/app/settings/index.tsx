import { router } from 'expo-router';
import SettingsScreen from '@/features/settings/settings-screen';

export default function Settings() {
  return (
    <SettingsScreen onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
  );
}
