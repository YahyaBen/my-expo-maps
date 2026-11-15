import {
  ButtonContent,
  Chip,
  Column,
  EmptyState,
  Icon,
  nativeFillWidth,
  PageScreen,
  PageSection,
  Row,
  UniversalHost,
  UniversalTextContent as Text,
} from '@components/ui';
import Constants from 'expo-constants';
import { router, useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, TurboModuleRegistry, View } from 'react-native';
import type MapView from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/constants/layout';
import { useLayoutDirection } from '@/context/layout-direction.context';
import { useDeviceLocation } from '@/features/settings/use-device-location';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppActive } from '@/hooks/use-motion-enabled';
import { usePageLayout } from '@/hooks/use-page-layout';
import { MapFilterSheet } from './map-filter-sheet';

const initialRegion = {
  latitude: 48.8566,
  longitude: 2.3522,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const openSettings = () => router.navigate('/settings');

export default function MapScreen() {
  const { t } = useTranslation();
  const configured = Constants.expoConfig?.extra?.googleMaps?.[Platform.OS] === true;
  // Older development builds must still open without evaluating a missing maps module.
  const nativeAvailable = TurboModuleRegistry.get('RNMapsAirModule') !== null;

  if (!configured || !nativeAvailable) {
    return (
      <PageScreen title={t('map.title')} showBack={false}>
        <PageSection>
          <EmptyState
            icon={{ ios: 'map', android: 'map' }}
            title={t('map.unavailable')}
            description={t('map.unavailableHint')}
            primaryAction={{
              label: t('settings.title'),
              onPress: openSettings,
              testID: 'map-open-settings',
            }}
            testID="map-unavailable"
          />
        </PageSection>
      </PageScreen>
    );
  }

  return <GoogleMap />;
}

function GoogleMap() {
  const { default: Map, PROVIDER_GOOGLE }: typeof import('react-native-maps') =
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Guard native module availability before evaluating react-native-maps.
    require('react-native-maps');
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const direction = useLayoutDirection();
  const onLayout = usePageLayout();
  const focused = useIsFocused();
  const active = useAppActive();
  const location = useDeviceLocation();
  const map = useRef<MapView>(null);
  const centeredPosition = useRef(location.position);
  const [ready, setReady] = useState(false);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [controlsHeight, setControlsHeight] = useState(0);
  const [filterBarHeight, setFilterBarHeight] = useState(0);
  const visible = focused && active;
  const position = location.position;

  useEffect(() => {
    if (!ready || !visible || !position || !map.current || centeredPosition.current === position)
      return;
    // Status text changes mapPadding as the request finishes. A padding update
    // can cancel an animated camera move, so apply the destination immediately.
    map.current.setCamera({
      center: { latitude: position.coords.latitude, longitude: position.coords.longitude },
      zoom: 16,
    });
    centeredPosition.current = position;
  }, [position, ready, visible]);

  const locationMessage = location.error
    ? t(`settings.location.${location.error}`)
    : !location.enabled
      ? t('map.locationDisabled')
      : location.servicesEnabled === false
        ? t(
            Platform.OS === 'ios'
              ? 'settings.location.servicesOffIOS'
              : 'settings.location.servicesOff',
          )
        : location.permission?.status === 'denied'
          ? t('settings.location.denied')
          : null;

  return (
    <View style={styles.screen} onLayout={onLayout} testID="map-screen">
      <Map
        ref={map}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        mapType={mapType}
        mapPadding={{
          top: insets.top + controlsHeight + spacing.lg * 2,
          bottom: insets.bottom + filterBarHeight + spacing.lg * 2,
          left: insets.left + (direction === 'rtl' ? 76 : spacing.lg),
          right: insets.right + (direction === 'rtl' ? spacing.lg : 76),
        }}
        paddingAdjustmentBehavior="never"
        userInterfaceStyle={scheme}
        showsUserLocation={
          visible &&
          location.enabled &&
          location.permission?.granted === true &&
          location.servicesEnabled === true
        }
        showsMyLocationButton={false}
        toolbarEnabled={false}
        loadingEnabled
        onMapReady={() => setReady(true)}
        accessibilityLabel={t('map.accessibilityLabel')}
        testID="google-map"
      />
      <View
        pointerEvents="box-none"
        style={[
          styles.mapType,
          {
            top: insets.top + spacing.md,
            left: insets.left + spacing.lg,
            right: insets.right + spacing.lg,
          },
        ]}
      >
        <UniversalHost
          ignoreSafeArea="all"
          onLayout={({ nativeEvent }) => setControlsHeight(nativeEvent.layout.height)}
          style={{ maxWidth: 360 }}
        >
          <Column spacing={spacing.sm} modifiers={nativeFillWidth} style={{ padding: spacing.sm }}>
            <Row spacing={spacing.sm} alignment="center">
              <Chip
                variant="filter"
                appearance="filled"
                label={t('map.standard')}
                selected={mapType === 'standard'}
                onPress={() => setMapType('standard')}
                testID="map-mode-standard"
              />
              <Chip
                variant="filter"
                appearance="filled"
                label={t('map.satellite')}
                selected={mapType === 'satellite'}
                onPress={() => setMapType('satellite')}
                testID="map-mode-satellite"
              />
            </Row>
            {location.pending || locationMessage ? (
              <Text
                variant="caption"
                tone={location.error ? 'error' : 'muted'}
                testID="map-location-status"
              >
                {location.pending ? t('settings.location.locating') : (locationMessage ?? '')}
              </Text>
            ) : null}
          </Column>
        </UniversalHost>
      </View>
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          bottom: insets.bottom + filterBarHeight + spacing.lg * 2,
          end: Math.max(insets.left, insets.right) + spacing.lg,
        }}
      >
        <UniversalHost inline ignoreSafeArea="all">
          <Column spacing={spacing.md}>
            <ButtonContent
              variant="primary"
              circular
              size="lg"
              accessibilityLabel={t('settings.title')}
              onPress={openSettings}
              testID="map-open-settings"
            >
              <Icon name={{ ios: 'gearshape', android: 'settings' }} />
            </ButtonContent>
            <ButtonContent
              variant="primary"
              circular
              size="lg"
              accessibilityLabel={t(
                location.pending ? 'settings.location.locating' : 'map.centerLocation',
              )}
              disabled={!ready || location.pending}
              onPress={() => {
                if (!location.enabled) openSettings();
                else void location.requestLocation();
              }}
              testID="map-center-location"
            >
              <Icon name={{ ios: 'location.fill', android: 'my_location' }} />
            </ButtonContent>
          </Column>
        </UniversalHost>
      </View>
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          bottom: insets.bottom + spacing.lg,
          left: insets.left + spacing.lg,
          right: insets.right + spacing.lg,
          alignItems: 'center',
        }}
      >
        <UniversalHost
          ignoreSafeArea="all"
          onLayout={({ nativeEvent }) => setFilterBarHeight(nativeEvent.layout.height)}
          style={{ maxWidth: 480 }}
        >
          <Column modifiers={nativeFillWidth} style={{ padding: spacing.sm }}>
            <MapFilterSheet
              onUseLocation={() => {
                if (!location.enabled) openSettings();
                else void location.requestLocation();
              }}
              locationPending={location.pending}
              locationDisabled={!ready || !location.enabled}
              locationMessage={locationMessage}
            />
          </Column>
        </UniversalHost>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  mapType: { position: 'absolute', alignItems: 'center' },
});
