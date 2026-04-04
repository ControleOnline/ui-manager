import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import { resolveThemePalette, withOpacity } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import Icon from 'react-native-vector-icons/Feather';

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  android: { elevation: 2 },
  web: { boxShadow: '0 4px 12px rgba(15,23,42,0.06)' },
});

const hex = {
  primary: '#0EA5E9',
  success: '#22C55E',
  danger:  '#EF4444',
  warning: '#F59E0B',
};

const CashRegisters = () => {
  const peopleStore      = useStore('people');
  const invoiceStore     = useStore('invoice');
  const deviceConfigStore = useStore('device_config');
  const themeStore       = useStore('theme');

  const { currentCompany }              = peopleStore.getters;
  const { colors: themeColors }         = themeStore.getters;
  const { items: deviceConfigs, isLoading: isLoadingDevices } = deviceConfigStore.getters;
  const deviceConfigActions             = deviceConfigStore.actions;
  const invoiceActions                  = invoiceStore.actions;

  const [cashData, setCashData]         = useState({});
  const [cashErrors, setCashErrors]     = useState({});
  const [loadingCash, setLoadingCash]   = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
        colors,
      ),
    [themeColors, currentCompany?.id],
  );

  useEffect(() => {
    if (currentCompany?.id) {
      deviceConfigActions.getItems({ people: `/people/${currentCompany.id}` });
    }
  }, [currentCompany?.id]);

  const loadAllCashRegisters = useCallback(async () => {
    if (!currentCompany?.id || !deviceConfigs?.length) return;
    setLoadingCash(true);
    const results = {};
    const errors  = {};
    await Promise.all(
      deviceConfigs.map(async dc => {
        try {
          const data = await invoiceActions.getCashRegister({
            device:   dc.device?.device,
            provider: currentCompany.id,
          });
          results[dc.id] = Array.isArray(data) ? data : [];
          errors[dc.id]  = null;
        } catch (e) {
          results[dc.id] = [];
          errors[dc.id]  = e?.message || 'Erro ao carregar';
        }
      }),
    );
    setCashData(results);
    setCashErrors(errors);
    setLoadingCash(false);
  }, [currentCompany?.id, deviceConfigs, invoiceActions]);

  useFocusEffect(
    useCallback(() => {
      loadAllCashRegisters();
    }, [loadAllCashRegisters]),
  );

  const getStatus = dc => {
    const cfg = dc?.configs || {};
    const closed = cfg['cash-wallet-closed-id'];
    return closed === 0 || closed === '0' || closed === undefined || closed === null
      ? 'open'
      : 'closed';
  };

  const confirm = (msg, cb) => {
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) cb();
    } else {
      Alert.alert('Confirmação', msg, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: cb },
      ]);
    }
  };

  const handleToggle = dc => {
    const isOpen   = getStatus(dc) === 'open';
    const msg      = isOpen ? 'Deseja fechar o caixa?' : 'Deseja abrir o caixa?';
    confirm(msg, () => {
      setActionLoading(prev => ({ ...prev, [dc.id]: true }));
      invoiceActions
        .getItems({ 'order[id]': 'DESC', itemsPerPage: 1 })
        .then(data => {
          const lastId =
            data?.[0]?.['@id']?.replace(/\D/g, '') || 0;
          const configValue = isOpen
            ? { 'cash-wallet-closed-id': lastId }
            : { 'cash-wallet-open-id': lastId, 'cash-wallet-closed-id': 0 };

          return deviceConfigActions.addDeviceConfigs({
            configs: JSON.stringify(configValue),
            people:  `/people/${currentCompany.id}`,
            device:  dc.device?.device,
          });
        })
        .then(() => {
          deviceConfigActions.getItems({ people: `/people/${currentCompany.id}` });
          loadAllCashRegisters();
        })
        .catch(() => {})
        .finally(() =>
          setActionLoading(prev => ({ ...prev, [dc.id]: false })),
        );
    });
  };

  const renderDevice = dc => {
    const items   = cashData[dc.id] || [];
    const hasError = !!cashErrors[dc.id];
    const total   = items.reduce((s, i) => s + Number(i.order_product_total || 0), 0);
    const isOpen  = getStatus(dc) === 'open';
    const acting  = !!actionLoading[dc.id];
    const alias   = dc.device?.alias || dc.device?.device || `Dispositivo #${dc.id}`;

    return (
      <View key={dc.id} style={styles.deviceCard}>
        {/* Cabeçalho do dispositivo */}
        <View style={styles.deviceHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.deviceTitle}>{alias}</Text>
          </View>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: withOpacity(isOpen ? hex.success : hex.danger, 0.12),
                borderColor:     withOpacity(isOpen ? hex.success : hex.danger, 0.45),
              },
            ]}
          >
            <View style={styles.badgeInner}>
              <View
                style={[
                  styles.badgeDot,
                  { backgroundColor: isOpen ? hex.success : hex.danger },
                ]}
              />
              <Text style={[styles.badgeText, { color: isOpen ? hex.success : hex.danger }]}>
                {isOpen ? 'Aberto' : 'Fechado'}
              </Text>
            </View>
          </View>
        </View>

        {/* Conteúdo: itens do caixa */}
        {loadingCash ? (
          <View style={styles.loadingDevice}>
            <ActivityIndicator size="small" color={brandColors.primary} />
          </View>
        ) : hasError ? (
          <View style={[styles.emptyDevice, { borderColor: withOpacity(hex.warning, 0.4), backgroundColor: withOpacity(hex.warning, 0.06) }]}>
            <Icon name="alert-triangle" size={18} color={hex.warning} style={{ marginBottom: 6 }} />
            <Text style={[styles.emptyDeviceText, { color: hex.warning }]}>Caixa não configurado ou sem registros</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyDevice}>
            <Icon name="inbox" size={18} color="#CBD5E1" style={{ marginBottom: 6 }} />
            <Text style={styles.emptyDeviceText}>Nenhum lançamento encontrado</Text>
          </View>
        ) : (
          <View style={styles.itemsContainer}>
            {/* Linha de cabeçalho */}
            <View style={styles.itemHeaderRow}>
              <Text style={[styles.itemHeader, { flex: 0.5 }]}>Qtd</Text>
              <Text style={[styles.itemHeader, { flex: 3 }]}>Produto</Text>
              <Text style={[styles.itemHeader, { flex: 1.2, textAlign: 'right' }]}>Unit.</Text>
              <Text style={[styles.itemHeader, { flex: 1.2, textAlign: 'right' }]}>Total</Text>
            </View>

            {items.map((item, idx) => (
              <View
                key={idx}
                style={[
                  styles.itemRow,
                  idx % 2 === 0 && styles.itemRowAlt,
                ]}
              >
                <Text style={[styles.itemCell, { flex: 0.5 }]}>{item.quantity}</Text>
                <Text style={[styles.itemCell, { flex: 3 }]} numberOfLines={2}>
                  {item.product_name}
                  {item.product_description ? ` — ${item.product_description}` : ''}
                </Text>
                <Text style={[styles.itemCell, { flex: 1.2, textAlign: 'right' }]}>
                  {Formatter.formatMoney(item.order_product_price)}
                </Text>
                <Text style={[styles.itemCell, { flex: 1.2, textAlign: 'right', fontWeight: '700' }]}>
                  {Formatter.formatMoney(item.order_product_total)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Rodapé: total + botão abrir/fechar */}
        <View style={styles.deviceFooter}>
          <View>
            <Text style={styles.totalLabel}>Total do caixa</Text>
            <Text style={[styles.totalValue, { color: brandColors.primary }]}>
              {Formatter.formatMoney(total)}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              { backgroundColor: isOpen ? hex.danger : hex.success },
              acting && { opacity: 0.6 },
            ]}
            onPress={() => handleToggle(dc)}
            disabled={acting}
            activeOpacity={0.8}
          >
            {acting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name={isOpen ? 'lock' : 'unlock'} size={13} color="#fff" />
                <Text style={styles.toggleBtnText}>
                  {isOpen ? 'Fechar Caixa' : 'Abrir Caixa'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const totalAll  = useMemo(
    () =>
      Object.values(cashData).reduce(
        (s, items) => s + items.reduce((ss, i) => ss + Number(i.order_product_total || 0), 0),
        0,
      ),
    [cashData],
  );
  const openCount = useMemo(
    () => deviceConfigs?.filter(dc => getStatus(dc) === 'open').length || 0,
    [deviceConfigs],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: brandColors.background }]}>
      <StateStore store="invoice" />
      <StateStore store="device_config" />

      {/* Resumo geral */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Dispositivos</Text>
          <Text style={styles.summaryValue}>{deviceConfigs?.length || 0}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Abertos</Text>
          <Text style={[styles.summaryValue, { color: hex.success }]}>{openCount}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total geral</Text>
          <Text style={[styles.summaryValue, { color: hex.success }]}>
            {Formatter.formatMoney(totalAll)}
          </Text>
        </View>
      </View>

      {(isLoadingDevices || loadingCash) && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={brandColors.primary} />
          <Text style={styles.loadingText}>Carregando caixas...</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {deviceConfigs?.length ? (
          deviceConfigs.map(renderDevice)
        ) : (
          <View style={styles.emptyMain}>
            <Icon name="monitor" size={32} color="#CBD5E1" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyMainTitle}>Nenhum dispositivo encontrado</Text>
            <Text style={styles.emptyMainSubtitle}>
              Cadastre dispositivos para visualizar os caixas.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  /* Resumo */
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...cardShadow,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#94A3B8',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },

  /* Loading */
  loadingBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  loadingDevice: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  /* Lista */
  scrollContent: {
    paddingBottom: 26,
    gap: 12,
  },

  /* Card de dispositivo */
  deviceCard: {
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 14,
    ...cardShadow,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  /* Tabela de itens */
  itemsContainer: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 12,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  itemHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  itemRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  itemRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  itemCell: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
    lineHeight: 17,
  },

  /* Vazio */
  emptyDevice: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
  },
  emptyDeviceText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  emptyMain: {
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 32,
    alignItems: 'center',
    ...cardShadow,
  },
  emptyMainTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  emptyMainSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },

  /* Rodapé do card */
  deviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});

export default CashRegisters;
