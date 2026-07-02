import { useStore } from '@store';
import React, { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigationState } from '@react-navigation/native';

import { colors } from '@controleonline/../../src/styles/colors';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import BottomNavigationBar from '@controleonline/ui-common/src/react/components/BottomNavigationBar';

const tt = key => global.t?.t('configs', 'toolbar', key);

const getTabItems = () => [
  { key: 'HomePage', icon: 'home', label: tt('home') || 'Home' },
  { key: 'CrmIndex', icon: 'dollar-sign', label: tt('opportunities') || 'Oportunidades' },
  { key: 'ClientsIndex', icon: 'shopping-bag', label: tt('customers') || 'Clientes' },
  { key: 'ProfilePage', icon: 'user', label: tt('profile') || 'Perfil' },
];

const routeToTab = {
  HomePage:         'HomePage',
  CrmIndex:         'CrmIndex',
  ClientsIndex:     'ClientsIndex',
  EmployeesIndex:   'ClientsIndex',
  FranchiseesIndex: 'ClientsIndex',
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
  const tabItems = getTabItems().map(item => ({
    route: item.key,
    icon: item.icon,
    label: item.label,
  }));

  return (
    <BottomNavigationBar
      activeRouteName={activeTab}
      colors={brandColors}
      disabled={disabled}
      insets={insets}
      items={tabItems}
      navigation={navigation}
    />
  );
};



export default ManagerToolbar;
