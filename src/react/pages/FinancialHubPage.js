import React, {useMemo, useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import {useStore} from '@store';
import FinancialEntriesPage from '@controleonline/ui-financial/src/react/pages/FinancialEntriesPage';
import {resolveThemePalette, withOpacity} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import styles from './FinancialHubPage.styles';

const FINANCIAL_TABS = [
  {
    key: 'receivables',
    label: 'Contas a receber',
    icon: 'arrow-up-circle',
    accent: '#22C55E',
    categoryContext: 'receiver',
    categoryTitle: 'Categorias de receita',
    categoryContextLabel: 'Receita',
  },
  {
    key: 'payables',
    label: 'Contas a pagar',
    icon: 'arrow-down-circle',
    accent: '#EF4444',
    categoryContext: 'payer',
    categoryTitle: 'Categorias de despesa',
    categoryContextLabel: 'Despesa',
  },
  {
    key: 'ownTransfers',
    label: 'Transferencias',
    icon: 'repeat',
    accent: '#8B5CF6',
    categoryContext: 'payer',
    categoryTitle: 'Categorias de transferencias',
    categoryContextLabel: 'Transferencias',
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

  const [activeTab, setActiveTab] = useState(FINANCIAL_TABS[0].key);

  const activeSection = useMemo(
    () => FINANCIAL_TABS.find(item => item.key === activeTab) || FINANCIAL_TABS[0],
    [activeTab],
  );

  if (!currentCompany?.id) {
    return (
      <SafeAreaView
        style={[styles.container, {backgroundColor: palette.background || '#F8FAFC'}]}
        edges={['bottom']}>
        <View style={styles.centerState}>
          <Icon name="building" size={32} color="#94A3B8" />
          <Text style={styles.centerStateTitle}>Selecione uma empresa</Text>
          <Text style={styles.centerStateText}>
            O modulo financeiro depende da empresa ativa para carregar contas,
            carteiras e categorias.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: palette.background || '#F8FAFC'}]}
      edges={['bottom']}>
      <View style={styles.topBar}>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.subtleButton}
            activeOpacity={0.86}
            onPress={() => navigation.navigate('WalletsPage')}>
            <Icon name="briefcase" size={14} color="#64748B" />
            <Text style={styles.subtleButtonText}>Carteiras</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.subtleButton,
              {
                borderColor: withOpacity(activeSection.accent, 0.24),
                backgroundColor: withOpacity(activeSection.accent, 0.08),
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
            <Icon name="tag" size={14} color={activeSection.accent} />
            <Text
              style={[
                styles.subtleButtonText,
                {color: activeSection.accent},
              ]}>
              Categorias
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabsRow}>
          {FINANCIAL_TABS.map(item => {
            const isActive = item.key === activeSection.key;

            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: isActive
                      ? withOpacity(item.accent, 0.12)
                      : '#FFFFFF',
                    borderColor: isActive
                      ? withOpacity(item.accent, 0.28)
                      : '#E2E8F0',
                  },
                ]}
                activeOpacity={0.88}
                onPress={() => setActiveTab(item.key)}>
                <Icon
                  name={item.icon}
                  size={14}
                  color={isActive ? item.accent : '#64748B'}
                />
                <Text
                  style={[
                    styles.tabChipText,
                    {color: isActive ? item.accent : '#64748B'},
                  ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.contentHeader}>
        <View
          style={[
            styles.contentBadge,
            {backgroundColor: withOpacity(activeSection.accent, 0.12)},
          ]}>
          <Icon
            name={activeSection.icon}
            size={15}
            color={activeSection.accent}
          />
        </View>
        <Text style={styles.contentTitle}>{activeSection.label}</Text>
      </View>

      <View style={styles.entriesContainer}>
        <FinancialEntriesPage mode={activeSection.key} />
      </View>
    </SafeAreaView>
  );
}
