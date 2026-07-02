import {useNavigationState} from '@react-navigation/native';
import {useStore} from '@store';
import React, {useMemo} from 'react';
import {colors} from '@controleonline/../../src/styles/colors';
import {resolveThemePalette} from '@controleonline/../../src/styles/branding';
import BottomNavigationBar from '@controleonline/ui-common/src/react/components/BottomNavigationBar';
import {
  getBottomNavigationPreset,
  resolveBottomNavigationItems,
  resolveBottomNavigationRoute,
} from '@controleonline/ui-common/src/react/components/BottomNavigationBar.config';

const BottomToolbar = ({navigation}) => {
  const state = useNavigationState(state => state);
  const currentRoute = state.routes[state.index]?.name || 'HomePage';
  const preset = getBottomNavigationPreset('managerDock');
  const activeTab = resolveBottomNavigationRoute(
    preset.routeAliases,
    currentRoute,
  );

  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const themeStore = useStore('theme');
  const getters = themeStore.getters;
  const {colors: themeColors} = getters;
  const {currentCompany} = peopleGetters;
  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        {...themeColors, ...(currentCompany?.theme?.colors || {})},
        colors,
      ),
    [themeColors, currentCompany?.id],
  );
  const items = useMemo(
    () => resolveBottomNavigationItems(preset.items),
    [preset.items],
  );

  return (
    <BottomNavigationBar
      activeRouteName={activeTab}
      colors={brandColors}
      disabled={!currentCompany || Object.entries(currentCompany).length === 0}
      items={items}
      navigation={navigation}
    />
  );
};
export default BottomToolbar;
