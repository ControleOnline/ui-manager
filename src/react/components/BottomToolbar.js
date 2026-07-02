import { useNavigationState } from '@react-navigation/native';
import {useStore} from '@store';
import React, {useMemo} from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {colors} from '@controleonline/../../src/styles/colors';
import {resolveThemePalette} from '@controleonline/../../src/styles/branding';
import BottomNavigationBar from '@controleonline/ui-common/src/react/components/BottomNavigationBar';

const BottomToolbar = ({navigation}) => {
  const state = useNavigationState(state => state);
  const currentRoute = state.routes[state.index]?.name || 'HomePage';
  const activeTab =
    currentRoute === 'EmployeesIndex' || currentRoute === 'ClientDetails' || currentRoute === 'FranchiseesIndex'
      ? 'ClientsIndex'
      : currentRoute;
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const themeStore = useStore('theme');
  const getters = themeStore.getters;
  const {colors: themeColors} = getters;
  const {currentCompany} = peopleGetters;
  const insets = useSafeAreaInsets();
  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        {...themeColors, ...(currentCompany?.theme?.colors || {})},
        colors,
      ),
    [themeColors, currentCompany?.id],
  );
  const items = [
    {route: 'HomePage', icon: 'home', label: 'Home'},
    {route: 'CrmIndex', icon: 'dollar-sign', label: 'Oportunidades'},
    {route: 'ClientsIndex', icon: 'shopping-bag', label: 'Clientes'},
    {route: 'ProfilePage', icon: 'user', label: 'Perfil'},
  ];

  return (
    <BottomNavigationBar
      activeRouteName={activeTab}
      colors={brandColors}
      disabled={!currentCompany || Object.entries(currentCompany).length === 0}
      insets={insets}
      items={items}
      navigation={navigation}
    />
  );
};
export default BottomToolbar;
