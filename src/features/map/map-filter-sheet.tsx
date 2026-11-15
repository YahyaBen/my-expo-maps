import {
  BottomSheet,
  ButtonContent,
  Column,
  Icon,
  nativeFillSize,
  nativeFillWidth,
  nativeRowWeight,
  Picker,
  Row,
  ScrollView,
  Switch,
  Text as NativeText,
  TextInput,
  UniversalTextContent as Text,
} from '@components/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { spacing } from '@/constants/layout';

const initialFilters = {
  fuel: 'diesel',
  district: 'all',
  municipality: 'all',
  stationType: 'all',
  brand: 'all',
  maxPrice: '',
  adblue: false,
  discounts: false,
  discount: '',
};

type Filters = typeof initialFilters;

const municipalities: Record<string, string[]> = {
  paris: ['paris'],
  rhone: ['lyon', 'villeurbanne'],
  bouchesDuRhone: ['marseille', 'aixEnProvence'],
};

type Props = {
  onUseLocation: () => void;
  locationPending: boolean;
  locationDisabled: boolean;
  locationMessage: string | null;
};

/** Local prototype selections; applying does not request station data. */
export function MapFilterSheet({
  onUseLocation,
  locationPending,
  locationDisabled,
  locationMessage,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [isPresented, setIsPresented] = useState(false);
  const [applied, setApplied] = useState<Filters | null>(null);
  const [draft, setDraft] = useState(initialFilters);
  const label = (key: string) => t(`map.filters.${key}`);
  const options = (group: string, values: string[]) =>
    values.map((value) => ({ value, label: label(`${group}.${value}`) }));
  const all = { value: 'all', label: label('all') };
  const activeCount = applied
    ? 1 +
      [
        applied.district !== 'all',
        applied.municipality !== 'all',
        applied.stationType !== 'all',
        applied.brand !== 'all',
        applied.maxPrice.trim() !== '',
        applied.adblue,
        applied.discounts,
      ].filter(Boolean).length
    : 0;

  return (
    <Column spacing={spacing.sm} modifiers={nativeFillWidth}>
      {applied ? (
        <Text variant="caption" testID="map-filter-summary">
          {t('map.filters.summary', {
            fuel: label(`fuels.${applied.fuel}`),
            count: activeCount,
          })}
        </Text>
      ) : null}
      <ButtonContent
        variant="primary"
        fullWidth
        size="lg"
        accessibilityLabel={label('open')}
        onPress={() => {
          setDraft(applied ?? initialFilters);
          setIsPresented(true);
        }}
        testID="map-open-filters"
      >
        <Row spacing={spacing.sm} alignment="center">
          <Icon name={{ ios: 'line.3.horizontal.decrease', android: 'filter_list' }} />
          <NativeText>{label('open')}</NativeText>
        </Row>
      </ButtonContent>
      <BottomSheet
        isPresented={isPresented}
        onDismiss={() => setIsPresented(false)}
        heightFraction={0.78}
        testID="map-filter-sheet"
      >
        <Column modifiers={nativeFillSize}>
          <ScrollView modifiers={nativeFillSize} testID="map-filter-scroll">
            <Column
              spacing={spacing.xl}
              modifiers={nativeFillWidth}
              style={{ paddingTop: spacing.sm, paddingBottom: spacing.xxl }}
            >
              <Row alignment="center" spacing={spacing.sm} modifiers={nativeFillWidth}>
                <Column modifiers={nativeRowWeight}>
                  <Text variant="title" testID="map-filter-title">
                    {label('title')}
                  </Text>
                </Column>
                <ButtonContent
                  variant="tertiary"
                  circular
                  size="sm"
                  accessibilityLabel={t('common.close')}
                  onPress={() => setIsPresented(false)}
                  testID="map-filter-close"
                >
                  <Icon name={{ ios: 'xmark', android: 'close' }} />
                </ButtonContent>
              </Row>
              <FilterPicker
                label={label('fuel')}
                value={draft.fuel}
                onChange={(fuel) => setDraft({ ...draft, fuel })}
                options={options('fuels', ['diesel', 'e10', 'sp98', 'e85', 'lpg', 'offRoadDiesel'])}
                testID="map-filter-fuel"
              />
              <FilterPicker
                label={label('district')}
                value={draft.district}
                onChange={(district) => setDraft({ ...draft, district, municipality: 'all' })}
                options={[all, ...options('districts', Object.keys(municipalities))]}
                testID="map-filter-district"
              />
              <ButtonContent
                variant="secondary"
                label={locationPending ? t('settings.location.locating') : label('useLocation')}
                fullWidth
                disabled={locationDisabled || locationPending}
                onPress={onUseLocation}
                testID="map-filter-use-location"
              />
              {locationMessage ? (
                <Text variant="caption" tone="muted" testID="map-filter-location-status">
                  {locationMessage}
                </Text>
              ) : null}
              <FilterPicker
                label={label('municipality')}
                value={draft.municipality}
                enabled={draft.district !== 'all'}
                onChange={(municipality) => setDraft({ ...draft, municipality })}
                options={[all, ...options('municipalities', municipalities[draft.district] ?? [])]}
                testID="map-filter-municipality"
              />
              <FilterPicker
                label={label('stationType')}
                value={draft.stationType}
                onChange={(stationType) => setDraft({ ...draft, stationType })}
                options={[
                  all,
                  ...options('stationTypes', ['supermarket', 'motorway', 'independent']),
                ]}
                testID="map-filter-station-type"
              />
              <FilterPicker
                label={label('brand')}
                value={draft.brand}
                onChange={(brand) => setDraft({ ...draft, brand })}
                options={[
                  all,
                  ...[
                    'TotalEnergies',
                    'Shell',
                    'Esso',
                    'Carrefour',
                    'E.Leclerc',
                    'Intermarché',
                  ].map((brand) => ({ value: brand, label: brand })),
                ]}
                testID="map-filter-brand"
              />
              <TextInput
                label={label('maxPrice')}
                placeholder={label('pricePlaceholder')}
                value={draft.maxPrice}
                onChangeText={(maxPrice) => setDraft({ ...draft, maxPrice })}
                keyboardType="decimal-pad"
                style={{ width: '100%' }}
                testID="map-filter-max-price"
              />
              <Switch
                label={label('adblue')}
                value={draft.adblue}
                onValueChange={(adblue) => setDraft({ ...draft, adblue })}
                testID="map-filter-adblue"
              />
              <Switch
                label={label('discounts')}
                value={draft.discounts}
                onValueChange={(discounts) => setDraft({ ...draft, discounts })}
                testID="map-filter-discounts"
              />
              {draft.discounts ? (
                <TextInput
                  label={label('discountAmount')}
                  placeholder="0"
                  value={draft.discount}
                  onChangeText={(discount) => setDraft({ ...draft, discount })}
                  keyboardType="decimal-pad"
                  style={{ width: '100%' }}
                  testID="map-filter-discount-amount"
                />
              ) : null}
              <ButtonContent
                variant="primary"
                label={label('search')}
                size="lg"
                fullWidth
                onPress={() => {
                  setApplied(draft);
                  setIsPresented(false);
                }}
                testID="map-filter-search"
              />
              <ButtonContent
                variant="tertiary"
                label={label('reset')}
                fullWidth
                onPress={() => setDraft(initialFilters)}
                testID="map-filter-reset"
              />
            </Column>
          </ScrollView>
        </Column>
      </BottomSheet>
    </Column>
  );
}

function FilterPicker({
  label,
  value,
  options,
  onChange,
  enabled = true,
  testID,
}: Readonly<{
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  enabled?: boolean;
  testID: string;
}>) {
  return (
    <Column spacing={spacing.xs} modifiers={nativeFillWidth}>
      <Text variant="caption" tone={enabled ? 'muted' : 'disabled'}>
        {label}
      </Text>
      <Picker selectedValue={value} onValueChange={onChange} enabled={enabled} testID={testID}>
        {options.map((option) => (
          <Picker.Item key={option.value} value={option.value} label={option.label} />
        ))}
      </Picker>
    </Column>
  );
}
