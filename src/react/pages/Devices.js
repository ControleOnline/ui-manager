import React, {useEffect, useMemo, useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useStore} from '@store';
import {resolveThemePalette} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import CompactFilterSelector from '@controleonline/ui-common/src/react/components/filters/CompactFilterSelector';
import {PDV_DEVICE_TYPE} from '@controleonline/ui-common/src/react/utils/printerDevices';
import Icon from 'react-native-vector-icons/Feather';
import {
  ALL_DEVICE_FILTER,
  getDeviceCreationAction,
  getDeviceFilterAccent,
  getDeviceFilterDefinition,
  getDeviceFilterIcon,
  getDeviceFilterOptions,
  getPdvSubfilterOptions,
  hasRegisteredDeviceFilter,
  isPdvSubfilter,
} from './Devices/deviceTypes';
import styles from './Devices.styles';

const hex = {
  primary: '#0EA5E9',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
};

const Devices = () => {
  const navigation = useNavigation();
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');

  const {currentCompany} = peopleStore.getters;
  const {colors: themeColors} = themeStore.getters;

  const [activeFilter, setActiveFilter] = useState(ALL_DEVICE_FILTER);

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        {...themeColors, ...(currentCompany?.theme?.colors || {})},
        colors,
      ),
    [themeColors, currentCompany?.id],
  );

  const filterOptions = useMemo(() => getDeviceFilterOptions(), []);
  const pdvSubfilterOptions = useMemo(() => getPdvSubfilterOptions(), []);
  const activeFilterDefinition = useMemo(
    () => getDeviceFilterDefinition(activeFilter),
    [activeFilter],
  );
  const topLevelActiveFilter = useMemo(
    () => (isPdvSubfilter(activeFilter) ? PDV_DEVICE_TYPE : activeFilter),
    [activeFilter],
  );
  const activeFilterAction = useMemo(
    () => getDeviceCreationAction(topLevelActiveFilter),
    [topLevelActiveFilter],
  );
  const deviceTypeSelectorOptions = useMemo(
    () => filterOptions.map(option => ({
      key: option.key,
      label: option.label,
    })),
    [filterOptions],
  );
  const pdvGatewaySelectorOptions = useMemo(
    () => [
      {key: PDV_DEVICE_TYPE, label: 'Todos'},
      ...pdvSubfilterOptions.map(option => ({
        key: option.key,
        label: option.label,
      })),
    ],
    [pdvSubfilterOptions],
  );
  const selectedDeviceTypeLabel = useMemo(
    () => deviceTypeSelectorOptions.find(option => option.key === topLevelActiveFilter)?.label || 'Todos os tipos',
    [deviceTypeSelectorOptions, topLevelActiveFilter],
  );
  const selectedPdvGatewayLabel = useMemo(
    () => pdvGatewaySelectorOptions.find(option => option.key === activeFilter)?.label || 'Todos',
    [activeFilter, pdvGatewaySelectorOptions],
  );
  const ActiveTabComponent = activeFilterDefinition.TabComponent;

  useEffect(() => {
    if (!hasRegisteredDeviceFilter(activeFilter)) {
      setActiveFilter(ALL_DEVICE_FILTER);
    }
  }, [activeFilter]);

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: brandColors.background}]}>
      <View style={styles.filtersBlock}>
        <Text style={styles.filtersLabel}>Filtrar por tipo</Text>
        <CompactFilterSelector
          icon={getDeviceFilterIcon(topLevelActiveFilter)}
          label={selectedDeviceTypeLabel}
          title="Filtrar por tipo"
          accentColor={getDeviceFilterAccent(topLevelActiveFilter, {
            brandColors,
            hex,
          })}
          active={topLevelActiveFilter !== ALL_DEVICE_FILTER}
          options={deviceTypeSelectorOptions}
          selectedKey={topLevelActiveFilter}
          onSelect={optionKey => {
            setActiveFilter(optionKey);
            return true;
          }}
        />
      </View>

      {topLevelActiveFilter === PDV_DEVICE_TYPE && pdvSubfilterOptions.length > 0 ? (
        <View style={styles.filtersBlock}>
          <Text style={styles.filtersLabel}>Gateway do PDV</Text>
          <CompactFilterSelector
            icon={getDeviceFilterIcon(activeFilter)}
            label={selectedPdvGatewayLabel}
            title="Gateway do PDV"
            accentColor={getDeviceFilterAccent(activeFilter, {
              brandColors,
              hex,
            })}
            active={activeFilter !== PDV_DEVICE_TYPE}
            options={pdvGatewaySelectorOptions}
            selectedKey={activeFilter}
            onSelect={optionKey => {
              setActiveFilter(optionKey);
              return true;
            }}
          />
        </View>
      ) : null}

      {activeFilterAction ? (
        <View style={styles.printerActionBlock}>
          <TouchableOpacity
            style={[
              styles.createPrinterBtn,
              {backgroundColor: brandColors.primary},
            ]}
            activeOpacity={0.86}
            onPress={() => navigation.navigate(activeFilterAction.routeName)}>
            <Icon name="plus-circle" size={16} color="#fff" />
            <Text style={styles.createPrinterBtnText}>
              {activeFilterAction.label}
            </Text>
          </TouchableOpacity>

          <Text style={styles.helperText}>
            {activeFilterAction.helperText}
          </Text>
        </View>
      ) : null}

      {ActiveTabComponent ? (
        <ActiveTabComponent
          key={`${activeFilter}-${currentCompany?.id || 'company'}`}
        />
      ) : null}
    </SafeAreaView>
  );
};

export default Devices;
