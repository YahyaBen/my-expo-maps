import { AlertHost, AppearanceTransition, LaunchScreen } from '@components/ui';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Appearance, AppState, Platform } from 'react-native';
import { getAppBrand } from '@/config/brand';
import { getBrandFonts } from '@/config/brand-assets';
import { navigationTheme } from '@/constants/navigation-theme';
import { stackMotionOptions } from '@/constants/navigation-motion';
import { LanguageProvider, useLanguage } from '@/context/language.context';
import { LayoutDirectionProvider, useLayoutDirection } from '@/context/layout-direction.context';
import { PerformanceReadyContext } from '@/context/performance-ready.context';
import { StartupLayoutContext } from '@/context/startup-layout.context';
import {
  ThemePreferencesProvider,
  useAppearanceSettings,
  useMotionReady,
} from '@/context/theme.context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppActive, useAppReducedMotion } from '@/hooks/use-motion-enabled';
import { useAppTheme } from '@/hooks/use-theme';
import { useDevicePreferencesReady } from '@/lib/device-preferences';
import { configurePerformance, markStartupMilestone, PerformanceRoot } from '@/lib/performance';
import { AppUpdatesProvider } from '@/features/updates/app-updates';
import { AppUpdatePrompt } from '@/features/updates/app-update-prompt';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = { anchor: 'index' };

SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 0, fade: false });
const brand = getAppBrand();
const brandFonts = getBrandFonts(brand);
configurePerformance(brand.variant);

export default function RootLayout() {
  const [loaded, error] = useFonts(brandFonts);
  const fontsReady = loaded || Boolean(error);
  useEffect(() => {
    if (fontsReady) markStartupMilestone('fonts_ready');
  }, [fontsReady]);

  return (
    <PerformanceRoot>
      <LayoutDirectionProvider>
        <LanguageProvider>
          <ThemePreferencesProvider
            initialTheme={brand.presentation.palette}
            allowThemeSelection
            persistMotion
            persistAppearance
          >
            <RootLayoutContent fontsReady={fontsReady} />
          </ThemePreferencesProvider>
        </LanguageProvider>
      </LayoutDirectionProvider>
    </PerformanceRoot>
  );
}

function RootLayoutContent({ fontsReady }: Readonly<{ fontsReady: boolean }>) {
  const devicePreferencesReady = useDevicePreferencesReady();
  const { colorScheme: appearance, appearanceReady } = useAppearanceSettings();
  const motionReady = useMotionReady();
  const { ready: languageReady } = useLanguage();
  const colorScheme = useColorScheme();
  const { colors } = useAppTheme(colorScheme);
  const active = useAppActive();
  const [showLaunchScreen, setShowLaunchScreen] = useState(true);
  const [initialLayoutReady, setInitialLayoutReady] = useState(false);
  const onInitialLayout = useCallback(() => setInitialLayoutReady(true), []);
  const finishLaunchScreen = useCallback(() => setShowLaunchScreen(false), []);
  const revealLaunchScreen = useCallback(() => SplashScreen.hide(), []);
  const preferencesReady =
    appearanceReady && languageReady && motionReady && devicePreferencesReady;
  const resourcesReady = fontsReady && preferencesReady;
  const interactive = resourcesReady && initialLayoutReady && !showLaunchScreen;

  useEffect(() => {
    if (!interactive || Platform.OS !== 'android' || !brand.pushNotifications) return;
    let disposed = false;
    void import('@/lib/device-permissions')
      .then(({ configureNotificationPresentation }) => {
        if (!disposed) configureNotificationPresentation();
      })
      .catch(() => console.warn('[Notifications] Could not configure notification presentation.'));
    return () => {
      disposed = true;
    };
  }, [interactive]);

  useEffect(() => {
    if (!interactive) return;
    let disposed = false;
    let checking = false;
    let entered = false;
    let backgrounded = false;

    async function checkNotificationPermission() {
      if (disposed || checking || AppState.currentState !== 'active') return;
      checking = true;
      entered = true;
      try {
        const { requestNotificationPermissionOnEntry } = await import('@/lib/device-permissions');
        if (disposed || AppState.currentState !== 'active') return;
        const permission = await requestNotificationPermissionOnEntry();
        if (
          disposed ||
          !permission.granted ||
          Platform.OS !== 'android' ||
          !brand.pushNotifications
        )
          return;
        const { subscribeToPushTopic } = await import('@/lib/push-notifications');
        if (!disposed && AppState.currentState === 'active') {
          // Connectivity must not hold the permission check open across app entries.
          void subscribeToPushTopic().catch(() => {
            console.warn('[Notifications] Could not join the all-testing-maps topic.');
          });
        }
      } catch {
        console.warn('[Notifications] Could not complete notification permission setup.');
      } finally {
        checking = false;
      }
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') backgrounded = true;
      // Closing a system dialog alone is not another app entry.
      if (state !== 'active' || (entered && !backgrounded)) return;
      backgrounded = false;
      void checkNotificationPermission();
    });
    void checkNotificationPermission();
    return () => {
      disposed = true;
      subscription.remove();
    };
  }, [interactive]);

  useEffect(() => {
    if (appearanceReady)
      Appearance.setColorScheme(appearance === 'system' ? 'unspecified' : appearance);
  }, [appearance, appearanceReady]);
  useEffect(() => {
    if (preferencesReady) markStartupMilestone('preferences_ready');
    if (initialLayoutReady) markStartupMilestone('page_layout_ready');
    if (resourcesReady && initialLayoutReady) markStartupMilestone('content_ready');
    if (interactive && active) markStartupMilestone('interactive');
  }, [preferencesReady, initialLayoutReady, resourcesReady, interactive, active]);

  if (!fontsReady) return null;

  return (
    <AppUpdatesProvider ready={interactive && active}>
      <AppearanceTransition
        enabled={interactive}
        testID={interactive ? 'app-ready' : undefined}
        collapsable={false}
        style={{ flex: 1, backgroundColor: navigationTheme(colorScheme, colors).colors.background }}
      >
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <PerformanceReadyContext.Provider value={interactive}>
          <StartupLayoutContext.Provider value={onInitialLayout}>
            <AppNavigator ready={resourcesReady} />
          </StartupLayoutContext.Provider>
        </PerformanceReadyContext.Provider>
        {showLaunchScreen && appearanceReady ? (
          <LaunchScreen
            mode={brand.presentation.launch}
            exiting={resourcesReady && initialLayoutReady}
            onReady={revealLaunchScreen}
            onExitComplete={finishLaunchScreen}
          />
        ) : null}
        {!showLaunchScreen && <AlertHost />}
        <AppUpdatePrompt ready={interactive && active} />
      </AppearanceTransition>
    </AppUpdatesProvider>
  );
}

/** Motion preferences belong to the native transition owner, below startup layout. */
function AppNavigator({ ready }: Readonly<{ ready: boolean }>) {
  const colorScheme = useColorScheme();
  const { colors } = useAppTheme(colorScheme);
  const direction = useLayoutDirection();
  const reducedMotion = useAppReducedMotion();
  const theme = useMemo(() => navigationTheme(colorScheme, colors), [colorScheme, colors]);
  if (!ready) return null;
  return (
    <ThemeProvider value={theme}>
      <Stack
        // Keep the previous scene laid out for Back; hide deeper scenes on iOS and Android.
        activityEnabled
        screenOptions={{
          ...stackMotionOptions(reducedMotion, direction),
          contentStyle: { backgroundColor: theme.colors.background, direction },
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ThemeProvider>
  );
}
