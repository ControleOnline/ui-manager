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

const ManagerToolbar = ({navigation}) => {
  const navigationState = useNavigationState(state => state);
  const routeNameFromState = navigationState?.routes?.[navigationState.index]?.name;
  const preset = getBottomNavigationPreset('managerToolbar');
  const activeTab = resolveBottomNavigationRoute(
    preset.routeAliases,
    routeNameFromState,
  );

  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const {currentCompany} = peopleStore.getters;
  const {colors: themeColors} = themeStore.getters;
  const disabled = !currentCompany || Object.keys(currentCompany).length === 0;

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        {...themeColors, ...(currentCompany?.theme?.colors || {})},
        colors,
      ),
    [themeColors, currentCompany?.id],
  );
  const tabItems = useMemo(
    () => resolveBottomNavigationItems(preset.items, global.t?.t),
    [preset.items],
  );

  return (
    <BottomNavigationBar
      activeRouteName={activeTab}
      colors={brandColors}
      disabled={disabled}
      items={tabItems}
      navigation={navigation}
    />
  );
};

export default ManagerToolbar;
