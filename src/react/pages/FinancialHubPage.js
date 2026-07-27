import React, {useMemo, useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import {useStore} from '@store';
import FinancialEntriesPage from '@controleonline/ui-financial/src/react/pages/FinancialEntriesPage';
import {createStyles} from './FinancialHubPage.styles';

const translate = (store, type, key) => global.t?.t(store, type, key);

const getFinancialTabs = () => [
  {
    key: 'receivables',
    label: translate('invoice', 'label', 'accountsReceivable') || 'Contas a receber',
    icon: 'arrow-down-circle',
    categoryContext: 'receiver',
    categoryTitle: translate('invoice', 'label', 'revenueCategories'),
    categoryContextLabel: translate('invoice', 'label', 'revenue'),
  },
  {
    key: 'payables',
    label: translate('invoice', 'label', 'accountsPayable') || 'Contas a pagar',
    icon: 'arrow-up-circle',
    categoryContext: 'payer',
    categoryTitle: translate('invoice', 'label', 'expenseCategories'),
    categoryContextLabel: translate('invoice', 'label', 'expense'),
  },
  {
    key: 'ownTransfers',
    label: translate('invoice', 'label', 'transfers') || 'Transferências',
    icon: 'repeat',
    categoryContext: 'payer',
    categoryTitle: translate('invoice', 'label', 'transferCategories'),
    categoryContextLabel: translate('invoice', 'label', 'transfers'),
  },
];

export default function FinancialHubPage({navigation}) {
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const translateStore = useStore('translate');
  const {currentCompany} = peopleStore.getters;
  const themeColors = themeStore?.getters?.colors || {};
  const translateMessages = translateStore?.getters?.messages || {};
  const pendingTranslateMessages = translateStore?.getters?.pendingMessages || {};

  const palette = useMemo(
    () => ({
      pageBackground: themeColors.pageBackground,
      cardBackground: themeColors.cardBackground,
      cardBorder: themeColors.cardBorder,
      textPrimary: themeColors.textPrimary,
      textSecondary: themeColors.textSecondary,
      buttonBackground: themeColors.buttonBackground,
      buttonBackgroundSecondary: themeColors.buttonBackgroundSecondary,
      buttonBorder: themeColors.buttonBorder,
      buttonBorderSecondary: themeColors.buttonBorderSecondary,
      buttonText: themeColors.buttonText,
      buttonTextSecondary: themeColors.buttonTextSecondary,
    }),
    [themeColors],
  );
  const styles = useMemo(() => createStyles(palette), [palette]);

  const FINANCIAL_TABS = useMemo(
    () => getFinancialTabs(),
    [translateMessages, pendingTranslateMessages],
  );
  const tabSurfaceColor = palette.buttonBackground;
  const tabSecondarySurfaceColor = palette.buttonBackgroundSecondary || palette.cardBackground;
  const tabHighlightColor = palette.buttonText;
  const tabBorderColor = palette.buttonBorderSecondary || palette.cardBorder;

  const [activeTab, setActiveTab] = useState('receivables');

  const activeSection =
    FINANCIAL_TABS.find(item => item.key === activeTab) || FINANCIAL_TABS[0];

  const toolbarActions = useMemo(
    () => [
      {
        key: 'wallets',
        label: translate('invoice', 'label', 'wallets'),
        icon: 'briefcase',
        color: tabHighlightColor,
        style: {
          backgroundColor: tabSurfaceColor,
          borderColor: tabSurfaceColor,
          paddingHorizontal: 10,
        },
        onPress: () => navigation.navigate('WalletsPage'),
      },
      {
        key: 'categories',
        label: translate('invoice', 'label', 'categories'),
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
      palette.buttonBackground,
      translateMessages,
      pendingTranslateMessages,
      tabHighlightColor,
      tabSurfaceColor,
    ],
  );

  if (!currentCompany?.id) {
    return (
      <SafeAreaView
        style={[styles.container, {backgroundColor: palette.pageBackground}]}
        edges={['bottom']}>
        <View style={styles.centerState}>
          <Icon name="building" size={32} color={palette.textSecondary} />
          <Text style={styles.centerStateTitle}>
            {translate('invoice', 'message', 'selectCompany')}
          </Text>
          <Text style={styles.centerStateText}>
            {translate(
              'invoice',
              'message',
              'financialModuleRequiresCompany',
            )}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: palette.pageBackground}]}
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
                    backgroundColor: isActive ? tabSurfaceColor : tabSecondarySurfaceColor,
                    borderColor: isActive ? palette.buttonBorder : tabBorderColor,
                  },
                ]}
                activeOpacity={0.88}
                onPress={() => setActiveTab(item.key)}>
                <Icon
                  name={item.icon}
                  size={14}
                  color={isActive ? tabHighlightColor : palette.buttonTextSecondary || palette.textSecondary}
                />
                <Text
                  style={[
                    styles.tabChipText,
                    {color: isActive ? tabHighlightColor : palette.buttonTextSecondary || palette.textSecondary},
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
