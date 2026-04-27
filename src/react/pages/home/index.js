import React, { useState, useEffect, useMemo } from 'react';
import {
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-animatable';
import {
  resolveThemePalette,
  withOpacity,
} from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import { api } from '@controleonline/ui-common/src/api';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import styles from './index.styles';

// Hex fixos para uso com withOpacity (CSS vars não são suportadas)
const HEX = {
  info: '#3B82F6',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  purple: '#8B5CF6',
  orange: '#F97316',
  muted: '#64748B',
};

const resolveShortcutLabel = (value, fallback) => {
  const normalizedValue = String(value || '').replace(/^Tab\s+/i, '').trim();
  return normalizedValue || fallback;
};

function ShortcutCard({ label, icon, color, onPress }) {
  return (
    <TouchableOpacity style={styles.shortcutCard} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.shortcutIcon, { backgroundColor: withOpacity(color, 0.12) }]}>
        <Icon name={icon} size={22} color={color} />
      </View>
      <Text style={styles.shortcutLabel} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

function SectionSummary({ items, loading }) {
  if (!items || items.length === 0) return null;
  return (
    <View style={styles.sectionSummaryRow}>
      {items.map((item, idx) => (
        <View key={idx} style={styles.sectionSummaryItem}>
          {loading ? (
            <ActivityIndicator size="small" color={HEX.muted} />
          ) : (
            <Text style={styles.sectionSummaryValue}>{item.value}</Text>
          )}
          <Text style={styles.sectionSummaryLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function SectionBlock({ title, icon, color, summary, loadingSummary, last, children }) {
  return (
    <View style={[styles.sectionBlock, last && styles.sectionBlockLast]}>
      <View style={styles.sectionHeaderRow}>
        <View style={[styles.sectionIconWrap, { backgroundColor: withOpacity(color, 0.12) }]}>
          <Icon name={icon} size={15} color={color} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <SectionSummary items={summary} loading={loadingSummary} />
      {children}
    </View>
  );
}

function ShortcutsRow({ children, last }) {
  return <View style={[styles.shortcutsRow, last && styles.shortcutsRowLast]}>{children}</View>;
}

export default function HomePage({ navigation }) {
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');

  const { colors: themeColors } = themeStore.getters;
  const { currentCompany } = peopleStore.getters;

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
        colors,
      ),
    [themeColors, currentCompany?.id],
  );

  const [stats, setStats] = useState([
    { label: global.t?.t('configs', 'stat_label', 'orders'), value: '...', icon: 'shopping-bag', color: HEX.info, route: 'OrderHistoryPage' },
    { label: global.t?.t('configs', 'stat_label', 'customers'), value: '...', icon: 'users', color: HEX.success, route: 'ClientsIndex' },
  ]);
  const [loadingStats, setLoadingStats] = useState(true);
  const salesHistoryLabel = useMemo(
    () => resolveShortcutLabel(global.t?.t('orders', 'label', 'tab_sale'), 'Vendas'),
    [],
  );
  const purchaseHistoryLabel = useMemo(
    () => resolveShortcutLabel(global.t?.t('orders', 'label', 'tab_purchase'), 'Compras'),
    [],
  );

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [summaries, setSummaries] = useState({
    financeiro: [
      { label: global.t?.t('configs', 'summary_label', 'receivableMonth'), value: '...' },
      { label: global.t?.t('configs', 'summary_label', 'payableMonth'), value: '...' },
    ],
    operacoes: [
      { label: global.t?.t('configs', 'summary_label', 'orders'), value: '...' },
      { label: global.t?.t('configs', 'summary_label', 'products'), value: '...' },
    ],
    modelos: [
      { label: 'Propostas', value: '...' },
      { label: 'Contratos', value: '...' },
      { label: 'E-mails', value: '...' },
      { label: 'Cardapios', value: '...' },
    ],
  });

  useEffect(() => {
    if (!currentCompany?.id) return;

    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const [ordersRes, clientsRes, incomeRes, productsRes, modelsRes] =
          await Promise.all([
            api.fetch('/orders', { params: { provider: currentCompany.id, itemsPerPage: 1 } }).catch(() => null),
            api.fetch('/people', { params: { 'link.company': `/people/${currentCompany.id}`, 'link.linkType': 'client', itemsPerPage: 1 } }).catch(() => null),
            api.fetch('/income_statements', { params: { people: currentCompany.id, year: currentYear } }).catch(() => null),
            api.fetch('/products', { params: { company: currentCompany.id, itemsPerPage: 1 } }).catch(() => null),
            api.fetch('/models', { params: { people: `/people/${currentCompany.id}`, itemsPerPage: 200 } }).catch(() => null),
          ]);

        const modelItems = Array.isArray(modelsRes?.member) ? modelsRes.member : [];
        const modelSummary = {
          proposal: 0,
          contract: 0,
          email: 0,
          menu: 0,
        };

        modelItems.forEach(item => {
          if (modelSummary[item?.context] !== undefined) {
            modelSummary[item.context] += 1;
          }
        });

        const incomeData = incomeRes?.member;
        const monthKey = String(currentMonth);
        const monthData = incomeData?.[monthKey] || null;
        const receiveTotal = typeof monthData?.receive === 'object' && !Array.isArray(monthData?.receive)
          ? (monthData.receive?.total_month_price ?? null)
          : null;
        const payTotal = typeof monthData?.pay === 'object' && !Array.isArray(monthData?.pay)
          ? (monthData.pay?.total_month_price ?? null)
          : null;

        setStats([
          { label: global.t?.t('configs', 'stat_label', 'orders'), value: String(ordersRes?.totalItems ?? '—'), icon: 'shopping-bag', color: HEX.info, route: 'OrderHistoryPage' },
          { label: global.t?.t('configs', 'stat_label', 'customers'), value: String(clientsRes?.totalItems ?? '—'), icon: 'users', color: HEX.success, route: 'ClientsIndex' },
        ]);

        setSummaries({
          financeiro: [
            { label: global.t?.t('configs', 'summary_label', 'receivableMonth'), value: receiveTotal !== null ? Formatter.formatMoney(receiveTotal) : '—' },
            { label: global.t?.t('configs', 'summary_label', 'payableMonth'), value: payTotal !== null ? Formatter.formatMoney(payTotal) : '—' },
          ],
          operacoes: [
            { label: global.t?.t('configs', 'summary_label', 'orders'), value: String(ordersRes?.totalItems ?? '—') },
            { label: global.t?.t('configs', 'summary_label', 'products'), value: String(productsRes?.totalItems ?? '—') },
          ],
          modelos: [
            { label: 'Propostas', value: String(modelSummary.proposal || 0) },
            { label: 'Contratos', value: String(modelSummary.contract || 0) },
            { label: 'E-mails', value: String(modelSummary.email || 0) },
            { label: 'Cardapios', value: String(modelSummary.menu || 0) },
          ],
        });
      } catch {
        // mantém os valores padrão
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [currentCompany?.id]);

  const go = (route, params = undefined) => navigation.navigate(route, params);
  const openOrderHistory = (orderTypeFilter, historyTitle) =>
    navigation.navigate('OrderHistoryPage', {
      orderTypeFilter,
      historyTitle,
    });
  const openModelEditor = (params = {}) =>
    navigation.navigate('ModelTemplatesPage', {
      templateAction: Date.now(),
      ...params,
    });

  if (!currentCompany || !themeColors) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={HEX.info} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: brandColors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Stats */}
        <Text style={styles.overviewLabel}>{global.t?.t('configs', 'section_title', 'overview')}</Text>
        <View style={styles.statsRow}>
          {stats.map((stat, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.statCard}
              activeOpacity={0.85}
              onPress={() => go(stat.route)}
            >
              <View style={[styles.statIcon, { backgroundColor: withOpacity(stat.color, 0.12) }]}>
                <Icon name={stat.icon} size={17} color={stat.color} />
              </View>
              {loadingStats ? (
                <ActivityIndicator size="small" color={stat.color} style={styles.statLoader} />
              ) : (
                <Text style={styles.statValue}>{stat.value}</Text>
              )}
              <Text style={styles.statLabel}>{stat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Banner — Resultado */}
        <TouchableOpacity
          style={[styles.actionBanner, { backgroundColor: brandColors.primary }]}
          activeOpacity={0.9}
          onPress={() => go('IncomeStatement')}
        >
          <View style={styles.actionContent}>
            <View>
              <Text style={styles.actionTitle}>{global.t?.t('configs', 'button_title', 'results')}</Text>
              <Text style={styles.actionSub}>{global.t?.t('configs', 'section_title', 'resultsDescription')}</Text>
            </View>
            <View style={styles.actionArrow}>
              <Icon name="arrow-right" size={20} color={brandColors.primary} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Bloco Financeiro */}
        <SectionBlock
          title={global.t?.t('configs', 'section_title', 'financial')}
          icon="dollar-sign"
          color={HEX.info}
          summary={summaries.financeiro}
          loadingSummary={loadingStats}
        >
          <ShortcutsRow>
            <ShortcutCard label="Financeiro" icon="dollar-sign" color={HEX.info} onPress={() => go('FinancialHubPage')} />
            <View style={styles.shortcutSpacer} />
          </ShortcutsRow>
        </SectionBlock>

        {/* Bloco Operações */}
        <SectionBlock
          title={global.t?.t('configs', 'section_title', 'operations')}
          icon="shopping-bag"
          color={HEX.warning}
          summary={summaries.operacoes}
          loadingSummary={loadingStats}
        >
          <ShortcutsRow>
            <ShortcutCard label={global.t?.t('configs', 'button_title', 'ppc')} icon="monitor" color={HEX.purple} onPress={() => go('DisplayList')} />
            <ShortcutCard label={global.t?.t('configs', 'button_title', 'providers')} icon="briefcase" color={HEX.warning} onPress={() => go('ProvidersIndex')} />
            <ShortcutCard label={salesHistoryLabel} icon="shopping-bag" color={HEX.info} onPress={() => openOrderHistory('sale', salesHistoryLabel)} />
          </ShortcutsRow>
          <ShortcutsRow>
            <ShortcutCard label={global.t?.t('configs', 'button_title', 'products')} icon="package" color={HEX.success} onPress={() => go('CategoriesPage')} />
            <ShortcutCard label={global.t?.t('configs', 'button_title', 'inventory')} icon="archive" color={HEX.warning} onPress={() => go('InventoriesPage')} />
            <ShortcutCard label={purchaseHistoryLabel} icon="truck" color={HEX.orange} onPress={() => openOrderHistory('purchase', purchaseHistoryLabel)} />
          </ShortcutsRow>
          <ShortcutsRow>
            <ShortcutCard label={global.t?.t('configs', 'button_title', 'purchasingSuggestion')} icon="truck" color={HEX.purple} onPress={() => go('PurchasingSuggestion')} />
            <ShortcutCard label={global.t?.t('configs', 'button_title', 'purchaseForm')} icon="shopping-cart" color={HEX.success} onPress={() => go('PurchaseFormPage')} />
          </ShortcutsRow>
          <ShortcutsRow last>
            <View style={styles.shortcutSpacer} />
          </ShortcutsRow>
        </SectionBlock>

        {/* Bloco Commercial */}
        <SectionBlock
          title={global.t?.t('configs', 'section_title', 'comercial')}
          icon="users"
          color={HEX.success}
        >
          <ShortcutsRow>
            <ShortcutCard label={global.t?.t('configs', 'button_title', 'customers')} icon="users" color={HEX.success} onPress={() => go('ClientsIndex')} />
            <ShortcutCard label="PDV" icon="shopping-bag" color={HEX.orange} onPress={() => go('PdvPage')} />
          </ShortcutsRow>
          <ShortcutsRow last>
            <ShortcutCard
              label={global.t?.t('orders', 'title', 'linkedOrderSettlement')}
              icon="layers"
              color={HEX.info}
              onPress={() => go('LinkedOrderSettlementPage')}
            />
            <View style={styles.shortcutSpacer} />
          </ShortcutsRow>
        </SectionBlock>

        <SectionBlock
          title="Modelos"
          icon="edit-3"
          color={HEX.orange}
          summary={summaries.modelos}
          loadingSummary={loadingStats}
        >
          <ShortcutsRow last>
            <ShortcutCard label="Editor de modelos" icon="edit-3" color={HEX.orange} onPress={() => openModelEditor()} />
            <View style={styles.shortcutSpacer} />
          </ShortcutsRow>
        </SectionBlock>

        {/* Bloco Configurações */}
        <SectionBlock
          title={global.t?.t('configs', 'section_title', 'Configurations')}
          icon="monitor"
          color={HEX.purple}
          last
        >
          <ShortcutsRow>
            <ShortcutCard label="Configurador" icon="settings" color={HEX.muted} onPress={() => go('ConfiguratorPage')} />
            <ShortcutCard label="Dispositivos" icon="credit-card" color={HEX.warning} onPress={() => go('DevicesIndex')} />
          </ShortcutsRow>
        </SectionBlock>

      </ScrollView>
    </View>
  );
}
