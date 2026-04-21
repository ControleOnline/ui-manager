import React, {useEffect, useMemo, useState} from 'react';
import {ScrollView, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useStore} from '@store';
import {resolveThemePalette, withOpacity} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}>
          {filterOptions.map(option => {
            const active = option.key === topLevelActiveFilter;
            const accentColor = getDeviceFilterAccent(option.key, {
              brandColors,
              hex,
            });

            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterChip,
                  active && {
                    borderColor: withOpacity(accentColor, 0.35),
                    backgroundColor: withOpacity(accentColor, 0.1),
                  },
                ]}
                activeOpacity={0.86}
                onPress={() => setActiveFilter(option.key)}>
                <Icon
                  name={getDeviceFilterIcon(option.key)}
                  size={14}
                  color={active ? accentColor : '#64748B'}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    active && {color: accentColor},
                  ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {topLevelActiveFilter === PDV_DEVICE_TYPE && pdvSubfilterOptions.length > 0 ? (
        <View style={styles.filtersBlock}>
          <Text style={styles.filtersLabel}>Gateway do PDV</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilter === PDV_DEVICE_TYPE && {
                  borderColor: withOpacity(brandColors.primary, 0.35),
                  backgroundColor: withOpacity(brandColors.primary, 0.1),
                },
              ]}
              activeOpacity={0.86}
              onPress={() => setActiveFilter(PDV_DEVICE_TYPE)}>
              <Icon
                name={getDeviceFilterIcon(PDV_DEVICE_TYPE)}
                size={14}
                color={
                  activeFilter === PDV_DEVICE_TYPE
                    ? brandColors.primary
                    : '#64748B'
                }
              />
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === PDV_DEVICE_TYPE && {
                    color: brandColors.primary,
                  },
                ]}>
                Todos
              </Text>
            </TouchableOpacity>

            {pdvSubfilterOptions.map(option => {
              const active = option.key === activeFilter;
              const accentColor = getDeviceFilterAccent(option.key, {
                brandColors,
                hex,
              });

              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.filterChip,
                    active && {
                      borderColor: withOpacity(accentColor, 0.35),
                      backgroundColor: withOpacity(accentColor, 0.1),
                    },
                  ]}
                  activeOpacity={0.86}
                  onPress={() => setActiveFilter(option.key)}>
                  <Icon
                    name={getDeviceFilterIcon(option.key)}
                    size={14}
                    color={active ? accentColor : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      active && {color: accentColor},
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
