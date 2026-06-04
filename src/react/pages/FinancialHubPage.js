import React, {useMemo, useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import {useStore} from '@store';
import FinancialEntriesPage from '@controleonline/ui-financial/src/react/pages/FinancialEntriesPage';
import {resolveThemePalette, withOpacity} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import {createStyles} from './FinancialHubPage.styles';

const getFinancialTabs = () => [
  {
    key: 'receivables',
    label: global.t?.t('invoice', 'label', 'accountsReceivable'),
    icon: 'arrow-up-circle',
    accentKey: 'success',
    categoryContext: 'receiver',
    categoryTitle: global.t?.t('invoice', 'label', 'revenueCategories'),
    categoryContextLabel: global.t?.t('invoice', 'label', 'revenue'),
  },
  {
    key: 'payables',
    label: global.t?.t('invoice', 'label', 'accountsPayable'),
    icon: 'arrow-down-circle',
    accentKey: 'error',
    categoryContext: 'payer',
    categoryTitle: global.t?.t('invoice', 'label', 'expenseCategories'),
    categoryContextLabel: global.t?.t('invoice', 'label', 'expense'),
  },
  {
    key: 'ownTransfers',
    label: global.t?.t('invoice', 'label', 'transfers'),
    icon: 'repeat',
    accentKey: 'info',
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

  const palette = useMemo(
    () =>
      resolveThemePalette(
        {...themeColors, ...(currentCompany?.theme?.colors || {})},
        colors,
      ),
    [themeColors, currentCompany?.id],
  );
  const styles = useMemo(() => createStyles(palette), [palette]);

  const FINANCIAL_TABS = useMemo(() => getFinancialTabs(), []);

  const [activeTab, setActiveTab] = useState('receivables');

  const activeSection = useMemo(
    () => FINANCIAL_TABS.find(item => item.key === activeTab) || FINANCIAL_TABS[0],
    [activeTab],
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
            const accent = palette[item.accentKey] || palette.primary;

            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: isActive
                      ? withOpacity(accent, 0.12)
                      : palette.white,
                    borderColor: isActive
                      ? withOpacity(accent, 0.28)
                      : palette.border,
                  },
                ]}
                activeOpacity={0.88}
                onPress={() => setActiveTab(item.key)}>
                <Icon
                  name={item.icon}
                  size={14}
                  color={isActive ? accent : palette.textSecondary}
                />
                <Text
                  style={[
                    styles.tabChipText,
                    {color: isActive ? accent : palette.textSecondary},
                  ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.subtleButton}
            activeOpacity={0.86}
            onPress={() => navigation.navigate('WalletsPage')}>
            <Icon name="briefcase" size={14} color={palette.textSecondary} />
            <Text style={styles.subtleButtonText}>
              {global.t?.t('invoice', 'label', 'wallets')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.subtleButton,
              {
                borderColor: withOpacity(
                  palette[activeSection.accentKey] || palette.primary,
                  0.24,
                ),
                backgroundColor: withOpacity(
                  palette[activeSection.accentKey] || palette.primary,
                  0.08,
                ),
              },
            ]}
            activeOpacity={0.86}
            onPress={() =>
              navigation.navigate('InvoiceCategoriesPage', {
                context: activeSection.categoryContext,
                contextLabel: activeSection.categoryContextLabel,
                lockContext: true,
                title: activeSection.categoryTitle,
              })
            }>
            <Icon
              name="tag"
              size={14}
              color={palette[activeSection.accentKey] || palette.primary}
            />
            <Text
              style={[
                styles.subtleButtonText,
                {color: palette[activeSection.accentKey] || palette.primary},
              ]}>
              {global.t?.t('invoice', 'label', 'categories')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.entriesContainer}>
        <FinancialEntriesPage mode={activeSection.key} />
      </View>
    </SafeAreaView>
  );
}
