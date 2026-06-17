import React, {useMemo, useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import {useStore} from '@store';
import FinancialEntriesPage from '@controleonline/ui-financial/src/react/pages/FinancialEntriesPage';
import {resolveThemePalette} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import {createStyles} from './FinancialHubPage.styles';

const getFinancialTabs = () => [
  {
    key: 'receivables',
    label: global.t?.t('invoice', 'label', 'accountsReceivable'),
    icon: 'arrow-up-circle',
    categoryContext: 'receiver',
    categoryTitle: global.t?.t('invoice', 'label', 'revenueCategories'),
    categoryContextLabel: global.t?.t('invoice', 'label', 'revenue'),
  },
  {
    key: 'payables',
    label: global.t?.t('invoice', 'label', 'accountsPayable'),
    icon: 'arrow-down-circle',
    categoryContext: 'payer',
    categoryTitle: global.t?.t('invoice', 'label', 'expenseCategories'),
    categoryContextLabel: global.t?.t('invoice', 'label', 'expense'),
  },
  {
    key: 'ownTransfers',
    label: global.t?.t('invoice', 'label', 'transfers'),
    icon: 'repeat',
    categoryContext: 'payer',
    categoryTitle: global.t?.t('invoice', 'label', 'transferCategories'),
    categoryContextLabel: global.t?.t('invoice', 'label', 'transfers'),
  },
];

export default function FinancialHubPage({navigation}) {
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const {currentCompany} = peopleStore.getters;
  const {colors: themeColors} = themeStore.getters;
  const themeTokens = useMemo(
    () => ({...themeColors, ...(currentCompany?.theme?.colors || {})}),
    [currentCompany?.theme?.colors, themeColors],
  );

  const palette = useMemo(
    () =>
      resolveThemePalette(
        themeTokens,
        colors,
      ),
    [themeTokens],
  );
  const styles = useMemo(() => createStyles(palette), [palette]);

  const FINANCIAL_TABS = getFinancialTabs();
  const tabSurfaceColor = palette.secondary || palette.text;
  const tabHighlightColor = palette.primary || palette.background;
  const tabBorderColor = palette.border;
  const tabBackgroundColor = palette.background || palette.white;

  const [activeTab, setActiveTab] = useState('receivables');

  const activeSection =
    FINANCIAL_TABS.find(item => item.key === activeTab) || FINANCIAL_TABS[0];

  const toolbarActions = useMemo(
    () => [
      {
        key: 'wallets',
        label: global.t?.t('invoice', 'label', 'wallets'),
        icon: 'briefcase',
        color: palette.textSecondary,
        style: {
          backgroundColor: palette.background || '#FFFFFF',
          borderColor: palette.border,
          paddingHorizontal: 10,
        },
        onPress: () => navigation.navigate('WalletsPage'),
      },
      {
        key: 'categories',
        label: global.t?.t('invoice', 'label', 'categories'),
        icon: 'tag',
        color: tabHighlightColor,
        style: {
          backgroundColor: tabSurfaceColor,
          borderColor: tabSurfaceColor,
          paddingHorizontal: 10,
        },
        onPress: () =>
          navigation.navigate('InvoiceCategoriesPage', {
            context: activeSection.categoryContext,
            contextLabel: activeSection.categoryContextLabel,
            lockContext: true,
            title: activeSection.categoryTitle,
          }),
      },
    ],
    [
      activeSection.categoryContext,
      activeSection.categoryContextLabel,
      activeSection.categoryTitle,
      navigation,
      palette.background,
      palette.border,
      palette.textSecondary,
      tabHighlightColor,
      tabSurfaceColor,
    ],
  );

  if (!currentCompany?.id) {
    return (
      <SafeAreaView
        style={[styles.container, {backgroundColor: palette.background}]}
        edges={['bottom']}>
        <View style={styles.centerState}>
          <Icon name="building" size={32} color={palette.textSecondary} />
          <Text style={styles.centerStateTitle}>
            {global.t?.t('invoice', 'message', 'selectCompany')}
          </Text>
          <Text style={styles.centerStateText}>
            {global.t?.t('invoice', 'message', 'financialModuleRequiresCompany')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: palette.background}]}
      edges={['bottom']}>
      <View style={styles.topBar}>
        <View style={styles.tabsRow}>
          {FINANCIAL_TABS.map(item => {
            const isActive = item.key === activeSection.key;

            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: isActive ? tabSurfaceColor : tabBackgroundColor,
                    borderColor: isActive ? tabSurfaceColor : tabBorderColor,
                  },
                ]}
                activeOpacity={0.88}
                onPress={() => setActiveTab(item.key)}>
                <Icon
                  name={item.icon}
                  size={14}
                  color={isActive ? tabHighlightColor : palette.textSecondary}
                />
                <Text
                  style={[
                    styles.tabChipText,
                    {color: isActive ? tabHighlightColor : palette.textSecondary},
                  ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.entriesContainer}>
        <FinancialEntriesPage mode={activeSection.key} toolbarActions={toolbarActions} />
      </View>
    </SafeAreaView>
  );
}
