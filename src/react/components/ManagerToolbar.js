import { useStore } from '@store';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigationState } from '@react-navigation/native';

import { colors } from '@controleonline/../../src/styles/colors';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';

const TAB_ITEMS = [
  { key: 'HomePage',     icon: 'home',         label: 'Home'          },
  { key: 'CrmIndex',     icon: 'dollar-sign',   label: 'Oportunidades' },
  { key: 'ClientsIndex', icon: 'shopping-bag',  label: 'Clientes'      },
  { key: 'ProfilePage',  icon: 'user',          label: 'Perfil'        },
];

const routeToTab = {
  HomePage:         'HomePage',
  CrmIndex:         'CrmIndex',
  ClientsIndex:     'ClientsIndex',
  ClientDetails:    'ClientsIndex',
  ProfilePage:      'ProfilePage',
  SettingsPage:     'ProfilePage',
  OrderHistoryPage: 'CrmIndex',
  InventoriesPage:  'CrmIndex',
  ProductsPage:     'CrmIndex',
};

const ManagerToolbar = ({ navigation }) => {
  const navigationState = useNavigationState(state => state);
  const routeNameFromState = navigationState?.routes?.[navigationState.index]?.name;
  const activeTab = routeToTab[routeNameFromState] || 'HomePage';

  const peopleStore = useStore('people');
  const themeStore  = useStore('theme');
  const { currentCompany } = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;
  const insets   = useSafeAreaInsets();
  const disabled = !currentCompany || Object.keys(currentCompany).length === 0;

  const brandColors = useMemo(
    () => resolveThemePalette(
      { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
      colors,
    ),
    [themeColors, currentCompany?.id],
  );

  const styles = useMemo(() => createStyles(brandColors), [brandColors]);

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View style={styles.toolbarShadow}>
          <View style={styles.toolbar}>
            {TAB_ITEMS.map(item => {
              const isActive = activeTab === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={styles.tab}
                  disabled={disabled}
                  onPress={() => navigation?.navigate?.(item.key)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                    <Icon
                      name={item.icon}
                      size={20}
                      color={isActive ? '#fff' : brandColors.textSecondary}
                    />
                  </View>
                  <Text style={[styles.label, isActive && styles.labelActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
};

const createStyles = brandColors =>
  StyleSheet.create({
    overlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      elevation: 1000,
    },
    wrapper: {
      paddingHorizontal: 12,
      paddingTop: 6,
      backgroundColor: 'transparent',
    },
    toolbarShadow: {
      height: 56,
      borderRadius: 20,
      backgroundColor: '#fff',
      ...Platform.select({
        ios: {
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
        },
        android: { elevation: 12 },
        web: { boxShadow: '0 -6px 20px rgba(15,23,42,0.12)' },
      }),
    },
    toolbar: {
      flex: 1,
      flexDirection: 'row',
      borderRadius: 20,
      overflow: 'hidden',
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
      overflow: 'hidden',
    },
    iconWrapActive: {
      backgroundColor: brandColors.primary,
    },
    label: {
      fontSize: 10,
      fontWeight: '500',
      color: brandColors.textSecondary,
      letterSpacing: 0.2,
    },
    labelActive: {
      color: brandColors.primary,
      fontWeight: '700',
    },
  });

export default ManagerToolbar;
