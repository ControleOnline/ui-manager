import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import {Picker} from '@react-native-picker/picker';
import { useStore } from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import { resolveThemePalette, withOpacity } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import Icon from 'react-native-vector-icons/Feather';
import {
  DISPLAY_AUTO_PRINT_PRODUCT_CONFIG_KEY,
  DEVICE_ALERT_SOUND_ENABLED_KEY,
  DEVICE_ALERT_SOUND_URL_KEY,
  DEVICE_ORDER_VISIBILITY_COMPANY,
  DEVICE_ORDER_VISIBILITY_DEVICE,
  DEVICE_ORDER_VISIBILITY_KEY,
  DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY,
  isTruthyValue,
  parseConfigsObject,
  resolveDeviceOrderVisibility,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {
  filterDeviceConfigsByCompany,
  getCompanyPaymentDeviceOptions,
  normalizeDeviceId,
  normalizeEntityId,
  ORDER_PAYMENT_DEVICE_CONFIG_KEY,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import {
  getPrinterOptionValue,
  getDeviceTypeLabel,
  getPrinterLabel,
  getPrinterOptions,
} from '@controleonline/ui-common/src/react/utils/printerDevices';

const cardShadow = Platform.select({
  ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
  android: { elevation: 2 },
  web: { boxShadow: '0 4px 12px rgba(15,23,42,0.06)' },
});

const hex = {
  success: '#22C55E',
  danger:  '#EF4444',
  warning: '#F59E0B',
  info:    '#0EA5E9',
  purple:  '#8B5CF6',
};

const PAYMENT_ICONS = {
  dinheiro: 'dollar-sign',
  pix:      'zap',
  debito:   'credit-card',
  credito:  'credit-card',
  default:  'hash',
};

const paymentIcon = label => {
  const l = String(label || '').toLowerCase();
  if (l.includes('pix'))    return PAYMENT_ICONS.pix;
  if (l.includes('debit'))  return PAYMENT_ICONS.debito;
  if (l.includes('crédit') || l.includes('credit')) return PAYMENT_ICONS.credito;
  if (l.includes('dinh'))   return PAYMENT_ICONS.dinheiro;
  return PAYMENT_ICONS.default;
};

const DISPLAY_DEVICE_TYPE = 'DISPLAY';
const PDV_DEVICE_TYPE = 'PDV';
const DISPLAY_DEVICE_LINK_CONFIG_KEY = 'display-id';
const DISPLAY_DEVICE_PRINTER_CONFIG_KEY = 'printer';

const getDisplayLabel = display => {
  const name = String(display?.display || '').trim();
  const type = String(display?.displayType || '').trim().toUpperCase();

  if (name && type) {
    return `${name} (${type})`;
  }

  if (name) {
    return name;
  }

  return `Display #${normalizeEntityId(display) || '--'}`;
};

const getIsOpen = configs => {
  const closed = configs?.['cash-wallet-closed-id'];
  return closed === 0 || closed === '0' || closed === undefined || closed === null;
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

const DeviceDetailPage = () => {
  const route      = useRoute();
  const navigation = useNavigation();
  const {
    dcId,
    deviceId,
    deviceString,
    deviceType: initialDeviceType,
    alias: initialAlias,
    configs: initialConfigs,
  } = route.params || {};
  const normalizedInitialConfigs = useMemo(
    () => parseConfigsObject(initialConfigs),
    [initialConfigs],
  );
  const deviceType = String(initialDeviceType || '').trim().toUpperCase();
  const isDisplayDevice = deviceType === DISPLAY_DEVICE_TYPE;
  const isPdvDevice = deviceType === PDV_DEVICE_TYPE;

  const invoiceStore      = useStore('invoice');
  const deviceConfigStore = useStore('device_config');
  const deviceStore       = useStore('device');
  const displayStore      = useStore('displays');
  const peopleStore       = useStore('people');
  const printerStore      = useStore('printer');
  const themeStore        = useStore('theme');
  const websocketStore    = useStore('websocket');

  const { currentCompany }      = peopleStore.getters;
  const { items: displays = [], isLoading: isLoadingDisplays } = displayStore.getters;
  const { items: printers = [], isLoading: isLoadingPrinters } = printerStore.getters;
  const { colors: themeColors } = themeStore.getters;
  const websocketActions = websocketStore.actions;

  const actionsRef = useRef({});
  actionsRef.current = {
    invoiceActions:      invoiceStore.actions,
    deviceConfigActions: deviceConfigStore.actions,
    deviceActions:       deviceStore.actions,
  };

  const brandColors = useMemo(
    () => resolveThemePalette({ ...themeColors, ...(currentCompany?.theme?.colors || {}) }, colors),
    [themeColors, currentCompany?.id],
  );

  const [products,      setProducts]      = useState([]);
  const [companyDeviceConfigs, setCompanyDeviceConfigs] = useState([]);
  const [inflowData,    setInflowData]    = useState(null);
  const [configs,       setConfigs]       = useState(normalizedInitialConfigs || {});
  const [loadingData,   setLoadingData]   = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [savingPaymentTarget, setSavingPaymentTarget] = useState(false);
  const [savingAlertSound, setSavingAlertSound] = useState(false);
  const [savingOrderVisibility, setSavingOrderVisibility] = useState(false);
  const [savingRuntimeDebugInfo, setSavingRuntimeDebugInfo] = useState(false);
  const [sendingCatalogRefresh, setSendingCatalogRefresh] = useState(false);
  const [search,        setSearch]        = useState('');
  const [devicePaymentTarget, setDevicePaymentTarget] = useState(
    normalizeDeviceId(normalizedInitialConfigs?.[ORDER_PAYMENT_DEVICE_CONFIG_KEY]),
  );
  const [deviceOrderVisibility, setDeviceOrderVisibility] = useState(
    resolveDeviceOrderVisibility(normalizedInitialConfigs),
  );
  const [deviceAlertSoundEnabled, setDeviceAlertSoundEnabled] = useState(
    isTruthyValue(normalizedInitialConfigs?.[DEVICE_ALERT_SOUND_ENABLED_KEY]),
  );
  const [deviceAlertSoundUrl, setDeviceAlertSoundUrl] = useState(
    String(normalizedInitialConfigs?.[DEVICE_ALERT_SOUND_URL_KEY] || ''),
  );
  const [deviceRuntimeDebugInfoEnabled, setDeviceRuntimeDebugInfoEnabled] =
    useState(
      isTruthyValue(
        normalizedInitialConfigs?.[DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY],
      ),
    );
  const [linkedDisplayId, setLinkedDisplayId] = useState(
    normalizeEntityId(normalizedInitialConfigs?.[DISPLAY_DEVICE_LINK_CONFIG_KEY]),
  );
  const [displayPrinterId, setDisplayPrinterId] = useState(
    normalizeDeviceId(normalizedInitialConfigs?.[DISPLAY_DEVICE_PRINTER_CONFIG_KEY]),
  );
  const [displayAutoPrintProductEnabled, setDisplayAutoPrintProductEnabled] =
    useState(
      isTruthyValue(
        normalizedInitialConfigs?.[DISPLAY_AUTO_PRINT_PRODUCT_CONFIG_KEY],
      ),
    );
  const [savingDisplayPrintingConfig, setSavingDisplayPrintingConfig] = useState(false);

  // Edição inline do alias
  const [alias,        setAlias]        = useState(initialAlias || '');
  const [editingAlias, setEditingAlias] = useState(false);
  const [aliasInput,   setAliasInput]   = useState(alias);
  const [savingAlias,  setSavingAlias]  = useState(false);
  const aliasInputRef = useRef(null);

  const isOpen = useMemo(() => getIsOpen(configs), [configs]);
  const paymentDeviceOptions = useMemo(
    () =>
      getCompanyPaymentDeviceOptions(
        filterDeviceConfigsByCompany(companyDeviceConfigs, currentCompany?.id),
      ).filter(
        option => option.deviceId !== deviceString,
      ),
    [companyDeviceConfigs, currentCompany?.id, deviceString],
  );
  const displayOptions = useMemo(
    () =>
      (Array.isArray(displays) ? displays : [])
        .filter(option => {
          const companyId = normalizeEntityId(option?.company?.id || option?.company);
          const currentCompanyId = normalizeEntityId(currentCompany?.id);
          return !currentCompanyId || !companyId || companyId === currentCompanyId;
        })
        .sort((left, right) =>
          String(left?.display || '').localeCompare(String(right?.display || '')),
        ),
    [currentCompany?.id, displays],
  );
  const printerOptions = useMemo(
    () =>
      getPrinterOptions({
        printers,
        deviceConfigs: companyDeviceConfigs,
        companyId: currentCompany?.id,
      }),
    [companyDeviceConfigs, currentCompany?.id, printers],
  );
  const pickerMode = Platform.OS === 'android' ? 'dropdown' : undefined;

  const loadData = useCallback(async () => {
    if (!isPdvDevice) {
      setProducts([]);
      setInflowData(null);
      setLoadingData(false);
      return;
    }

    if (!currentCompany?.id || !deviceString) return;
    setLoadingData(true);
    try {
      const [cashData, inflowRaw] = await Promise.all([
        actionsRef.current.invoiceActions.getCashRegister({
          device:   deviceString,
          provider: currentCompany.id,
        }),
        actionsRef.current.invoiceActions.getInflow({
          'device.device': deviceString,
          receiver:        currentCompany.id,
        }),
      ]);

      setProducts(Array.isArray(cashData) ? cashData : []);

      // getInflow retorna data['member'] = [{ payments: {...} }]
      const member = Array.isArray(inflowRaw) ? inflowRaw : [];
      setInflowData(member[0]?.payments || null);
    } catch {
      setProducts([]);
      setInflowData(null);
    } finally {
      setLoadingData(false);
    }
  }, [currentCompany?.id, deviceString, isPdvDevice]);

  const refreshConfigs = useCallback(async () => {
    if (!currentCompany?.id) return;
    const items = await actionsRef.current.deviceConfigActions.getItems({
      people: `/people/${currentCompany.id}`,
    });
    const scopedItems = filterDeviceConfigsByCompany(items, currentCompany?.id);
    setCompanyDeviceConfigs(Array.isArray(scopedItems) ? scopedItems : []);
    const dc = (scopedItems || []).find(d => {
      const currentConfigType = String(d?.type || d?.device?.type || '')
        .trim()
        .toUpperCase();

      if (String(d?.id || '') === String(dcId || '')) {
        return true;
      }

      return (
        d?.device?.device === deviceString &&
        currentConfigType === deviceType
      );
    });
    if (dc) {
      const nextConfigs = parseConfigsObject(dc.configs);
      setConfigs(nextConfigs);
      setDevicePaymentTarget(
        normalizeDeviceId(nextConfigs[ORDER_PAYMENT_DEVICE_CONFIG_KEY]),
      );
      setDeviceOrderVisibility(
        resolveDeviceOrderVisibility(nextConfigs),
      );
      setDeviceAlertSoundEnabled(
        isTruthyValue(nextConfigs[DEVICE_ALERT_SOUND_ENABLED_KEY]),
      );
      setDeviceAlertSoundUrl(
        String(nextConfigs[DEVICE_ALERT_SOUND_URL_KEY] || ''),
      );
      setDeviceRuntimeDebugInfoEnabled(
        isTruthyValue(nextConfigs[DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY]),
      );
      setLinkedDisplayId(
        normalizeEntityId(nextConfigs[DISPLAY_DEVICE_LINK_CONFIG_KEY]),
      );
      setDisplayPrinterId(
        normalizeDeviceId(nextConfigs[DISPLAY_DEVICE_PRINTER_CONFIG_KEY]),
      );
      setDisplayAutoPrintProductEnabled(
        isTruthyValue(nextConfigs[DISPLAY_AUTO_PRINT_PRODUCT_CONFIG_KEY]),
      );
      return;
    }

    setConfigs({});
    setDevicePaymentTarget('');
    setDeviceOrderVisibility(DEVICE_ORDER_VISIBILITY_DEVICE);
    setDeviceAlertSoundEnabled(false);
    setDeviceAlertSoundUrl('');
    setDeviceRuntimeDebugInfoEnabled(false);
    setLinkedDisplayId('');
    setDisplayPrinterId('');
    setDisplayAutoPrintProductEnabled(false);
  }, [currentCompany?.id, dcId, deviceString, deviceType]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      refreshConfigs();
    }, [loadData, refreshConfigs]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!isDisplayDevice || !currentCompany?.id) {
        return;
      }

      displayStore.actions
        .getItems({
          company: currentCompany.id,
          itemsPerPage: 200,
        })
        .catch(() => {});
      printerStore.actions
        .getPrinters({people: currentCompany.id})
        .catch(() => {});
    }, [
      currentCompany?.id,
      displayStore.actions,
      isDisplayDevice,
      printerStore.actions,
    ]),
  );

  const handleToggle = () => {
    if (!isPdvDevice) {
      return;
    }

    const msg = isOpen ? 'Deseja fechar o caixa?' : 'Deseja abrir o caixa?';
    confirm(msg, async () => {
      setActionLoading(true);
      try {
        const action = isOpen
          ? actionsRef.current.invoiceActions.closeCashRegister
          : actionsRef.current.invoiceActions.openCashRegister;
        await action({ device: deviceString, provider: currentCompany.id });
        await refreshConfigs();
        await loadData();
      } catch {
        // silencioso
      } finally {
        setActionLoading(false);
      }
    });
  };

  const startEditAlias = useCallback(() => {
    setAliasInput(alias);
    setEditingAlias(true);
    setTimeout(() => aliasInputRef.current?.focus(), 80);
  }, [alias]);

  const cancelEditAlias = useCallback(() => {
    setEditingAlias(false);
    setAliasInput(alias);
  }, [alias]);

  const saveAlias = useCallback(async () => {
    const trimmed = aliasInput.trim();
    if (!trimmed || trimmed === alias || !deviceId) {
      cancelEditAlias();
      return;
    }
    setSavingAlias(true);
    try {
      await actionsRef.current.deviceActions.updateItem({ id: deviceId, alias: trimmed });
      setAlias(trimmed);
      navigation.setParams({ alias: trimmed });
      setEditingAlias(false);
    } catch {
      // silencioso — mantém o valor anterior
      cancelEditAlias();
    } finally {
      setSavingAlias(false);
    }
  }, [aliasInput, alias, deviceId, cancelEditAlias, navigation]);

  const saveDevicePaymentTarget = useCallback(async () => {
    if (!currentCompany?.id || !deviceString) {
      return;
    }

    setSavingPaymentTarget(true);
    try {
      await actionsRef.current.deviceConfigActions.addDeviceConfigs({
        device: deviceString,
        configs: JSON.stringify({
          [ORDER_PAYMENT_DEVICE_CONFIG_KEY]: devicePaymentTarget || '',
        }),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshConfigs();
    } catch {
      // silencioso
    } finally {
      setSavingPaymentTarget(false);
    }
  }, [currentCompany?.id, devicePaymentTarget, deviceString, deviceType, refreshConfigs]);

  const saveDeviceAlertSoundConfig = useCallback(async () => {
    if (!currentCompany?.id || !deviceString || savingAlertSound) {
      return;
    }

    setSavingAlertSound(true);
    try {
      await actionsRef.current.deviceConfigActions.addDeviceConfigs({
        device: deviceString,
        configs: JSON.stringify({
          [DEVICE_ALERT_SOUND_ENABLED_KEY]: deviceAlertSoundEnabled ? '1' : '0',
          [DEVICE_ALERT_SOUND_URL_KEY]: deviceAlertSoundUrl.trim(),
        }),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshConfigs();
    } catch {
      // silencioso
    } finally {
      setSavingAlertSound(false);
    }
  }, [
    currentCompany?.id,
    deviceAlertSoundEnabled,
    deviceAlertSoundUrl,
    deviceString,
    deviceType,
    refreshConfigs,
    savingAlertSound,
  ]);

  const saveDeviceOrderVisibility = useCallback(async () => {
    if (!currentCompany?.id || !deviceString || savingOrderVisibility) {
      return;
    }

    setSavingOrderVisibility(true);
    try {
      await actionsRef.current.deviceConfigActions.addDeviceConfigs({
        device: deviceString,
        configs: JSON.stringify({
          [DEVICE_ORDER_VISIBILITY_KEY]: deviceOrderVisibility || DEVICE_ORDER_VISIBILITY_DEVICE,
        }),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshConfigs();
    } catch {
      // silencioso
    } finally {
      setSavingOrderVisibility(false);
    }
  }, [
    currentCompany?.id,
    deviceOrderVisibility,
    deviceString,
    deviceType,
    refreshConfigs,
    savingOrderVisibility,
  ]);

  const saveDeviceRuntimeDebugInfo = useCallback(async () => {
    if (!currentCompany?.id || !deviceString || savingRuntimeDebugInfo) {
      return;
    }

    setSavingRuntimeDebugInfo(true);
    try {
      await actionsRef.current.deviceConfigActions.addDeviceConfigs({
        device: deviceString,
        configs: JSON.stringify({
          [DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY]:
            deviceRuntimeDebugInfoEnabled ? '1' : '0',
        }),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshConfigs();
    } catch {
      // silencioso
    } finally {
      setSavingRuntimeDebugInfo(false);
    }
  }, [
    currentCompany?.id,
    deviceRuntimeDebugInfoEnabled,
    deviceString,
    deviceType,
    refreshConfigs,
    savingRuntimeDebugInfo,
  ]);

  const saveDisplayPrintingConfig = useCallback(async () => {
    if (
      !isDisplayDevice ||
      !currentCompany?.id ||
      !deviceString ||
      savingDisplayPrintingConfig
    ) {
      return;
    }

    const normalizedDisplayId = String(linkedDisplayId || '').trim();
    const normalizedPrinterId = normalizeDeviceId(displayPrinterId);

    if (
      (normalizedDisplayId && !normalizedPrinterId) ||
      (!normalizedDisplayId && normalizedPrinterId)
    ) {
      Alert.alert(
        'Impressao de preparo',
        'Selecione juntos o display vinculado e a impressora da fila, ou limpe os dois campos.',
      );
      return;
    }

    if (
      displayAutoPrintProductEnabled &&
      (!normalizedDisplayId || !normalizedPrinterId)
    ) {
      Alert.alert(
        'Impressao automatica',
        'Para imprimir produtos automaticamente, selecione o display vinculado e a impressora deste KDS.',
      );
      return;
    }

    setSavingDisplayPrintingConfig(true);
    try {
      await actionsRef.current.deviceConfigActions.addDeviceConfigs({
        device: deviceString,
        configs: JSON.stringify({
          [DISPLAY_DEVICE_LINK_CONFIG_KEY]: normalizedDisplayId,
          [DISPLAY_DEVICE_PRINTER_CONFIG_KEY]: normalizedPrinterId,
          [DISPLAY_AUTO_PRINT_PRODUCT_CONFIG_KEY]:
            displayAutoPrintProductEnabled ? '1' : '0',
        }),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshConfigs();
    } catch {
      // silencioso
    } finally {
      setSavingDisplayPrintingConfig(false);
    }
  }, [
    currentCompany?.id,
    deviceString,
    deviceType,
    displayAutoPrintProductEnabled,
    displayPrinterId,
    isDisplayDevice,
    linkedDisplayId,
    refreshConfigs,
    savingDisplayPrintingConfig,
  ]);

  const sendCatalogRefreshCommand = useCallback(() => {
    if (!currentCompany?.id || !deviceString || sendingCatalogRefresh) {
      return;
    }

    confirm('Deseja limpar o cache de produtos deste device?', async () => {
      setSendingCatalogRefresh(true);
      try {
        await websocketActions.send({
          destination: deviceString,
          store: 'categories',
          command: 'clear-product-cache',
          companyId: currentCompany.id,
        });
      } catch (e) {
        // silencioso
      } finally {
        setSendingCatalogRefresh(false);
      }
    });
  }, [currentCompany?.id, deviceString, sendingCatalogRefresh, websocketActions]);

  // Totais derivados
  const productTotal = useMemo(
    () => products.reduce((s, p) => s + Number(p.order_product_total || 0), 0),
    [products],
  );

  const inflowTotal = inflowData?.total ?? productTotal;

  const wallets = useMemo(() => {
    if (!inflowData?.wallet) return [];
    return Object.values(inflowData.wallet).map(w => ({
      wallet:   w.wallet,
      total:    w.total || 0,
      payments: Object.values(w.payment || {}).filter(pt => (pt.inflow || 0) > 0),
    }));
  }, [inflowData]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(p =>
      String(p.product_name || '').toLowerCase().includes(term) ||
      String(p.product_sku  || '').toLowerCase().includes(term),
    );
  }, [products, search]);

  const accent = isPdvDevice
    ? (isOpen ? hex.success : hex.danger)
    : hex.info;

  const renderProduct = ({ item, index }) => (
    <View style={[styles.productRow, index % 2 === 0 && styles.productRowAlt]}>
      <Text style={[styles.productCell, { flex: 0.5 }]}>{item.quantity}</Text>
      <View style={{ flex: 3 }}>
        <Text style={styles.productName} numberOfLines={1}>{item.product_name}</Text>
        {!!item.product_sku && (
          <Text style={styles.productSku}>{item.product_sku}</Text>
        )}
      </View>
      <Text style={[styles.productCell, { flex: 1.2, textAlign: 'right' }]}>
        {Formatter.formatMoney(item.order_product_price)}
      </Text>
      <Text style={[styles.productCell, { flex: 1.3, textAlign: 'right', fontWeight: '700' }]}>
        {Formatter.formatMoney(item.order_product_total)}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: brandColors.background }]}>
      <StateStore stores={['invoice', 'device_config', 'device', 'displays', 'printer', 'websocket']} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Cabeçalho do dispositivo */}
        <View style={styles.deviceHeader}>
          <View style={styles.deviceHeaderLeft}>
            <View style={[styles.deviceIconBox, { backgroundColor: withOpacity(accent, 0.1) }]}>
              <Icon name="monitor" size={20} color={accent} />
            </View>

            <View style={styles.aliasBlock}>
              <View style={styles.aliasRow}>
                {editingAlias ? (
                  <TextInput
                    ref={aliasInputRef}
                    style={styles.aliasInput}
                    value={aliasInput}
                    onChangeText={setAliasInput}
                    onSubmitEditing={saveAlias}
                    returnKeyType="done"
                    autoCapitalize="words"
                    selectTextOnFocus
                  />
                ) : (
                  <Text style={styles.deviceAlias} numberOfLines={1} ellipsizeMode="tail">
                    {alias}
                  </Text>
                )}

                {!!deviceId && (
                  <TouchableOpacity
                    style={styles.editAliasBtn}
                    onPress={editingAlias ? saveAlias : startEditAlias}
                    activeOpacity={0.8}
                    disabled={savingAlias}
                  >
                    {savingAlias
                      ? <ActivityIndicator size="small" color={brandColors.primary} />
                      : <Icon name={editingAlias ? 'check' : 'edit'} size={14} color={editingAlias ? hex.success : '#64748B'} />
                    }
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.deviceString} numberOfLines={1} ellipsizeMode="middle">
                {deviceString}
              </Text>
            </View>
          </View>

          {isPdvDevice && (
            <View style={styles.deviceHeaderRight}>
              <TouchableOpacity
                style={[styles.toggleBtn, { backgroundColor: isOpen ? hex.danger : hex.success }, actionLoading && { opacity: 0.6 }]}
                onPress={handleToggle}
                disabled={actionLoading || loadingData}
                activeOpacity={0.85}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Icon name={isOpen ? 'lock' : 'unlock'} size={13} color="#fff" />
                    <Text style={styles.toggleBtnText}>{isOpen ? 'Fechar' : 'Abrir'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {isPdvDevice && loadingData && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={brandColors.primary} />
            <Text style={styles.loadingText}>Carregando dados do device...</Text>
          </View>
        )}

        {isPdvDevice && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Icon name="dollar-sign" size={14} color={hex.success} style={styles.summaryIcon} />
              <Text style={styles.summaryLabel}>Total Geral</Text>
              <Text style={[styles.summaryValue, { color: hex.success }]}>
                {Formatter.formatMoney(inflowTotal)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Icon name="shopping-bag" size={14} color={hex.info} style={styles.summaryIcon} />
              <Text style={styles.summaryLabel}>Em Produtos</Text>
              <Text style={[styles.summaryValue, { color: hex.info }]}>
                {Formatter.formatMoney(productTotal)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Icon name="package" size={14} color={hex.purple} style={styles.summaryIcon} />
              <Text style={styles.summaryLabel}>Itens</Text>
              <Text style={[styles.summaryValue, { color: hex.purple }]}>
                {products.length}
              </Text>
            </View>
          </View>
        )}

        {!isDisplayDevice && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Icon name="list" size={13} /> {'  '}Pedidos do Device
            </Text>

            <View style={styles.configCard}>
              <Text style={styles.configTitle}>Escopo da listagem no PDV</Text>
              <Text style={styles.configDescription}>
                Define se este device enxerga apenas os pedidos criados nele ou
                todos os pedidos da empresa no histórico do PDV.
              </Text>

              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={deviceOrderVisibility}
                  mode={pickerMode}
                  onValueChange={value =>
                    setDeviceOrderVisibility(value || DEVICE_ORDER_VISIBILITY_DEVICE)
                  }>
                  <Picker.Item
                    label="Somente pedidos deste device"
                    value={DEVICE_ORDER_VISIBILITY_DEVICE}
                  />
                  <Picker.Item
                    label="Todos os pedidos da empresa"
                    value={DEVICE_ORDER_VISIBILITY_COMPANY}
                  />
                </Picker>
              </View>

              <TouchableOpacity
                style={[
                  styles.configButton,
                  savingOrderVisibility && {opacity: 0.6},
                ]}
                activeOpacity={0.85}
                disabled={savingOrderVisibility}
                onPress={saveDeviceOrderVisibility}>
                {savingOrderVisibility ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="save" size={14} color="#fff" />
                    <Text style={styles.configButtonText}>Salvar visibilidade dos pedidos</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isDisplayDevice && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Icon name="printer" size={13} /> {'  '}Impressao de Preparo
            </Text>

            <View style={styles.configCard}>
              <Text style={styles.configTitle}>Display vinculado e impressora da fila</Text>
              <Text style={styles.configDescription}>
                Este bloco e usado na impressao automatica do backend. O device
                DISPLAY precisa apontar qual display/fila representa e qual
                impressora deve receber a copia separada por fila.
              </Text>

              {(isLoadingDisplays || isLoadingPrinters) ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={brandColors.primary} />
                  <Text style={styles.loadingText}>Carregando displays e impressoras...</Text>
                </View>
              ) : (
                <>
                  <View style={styles.pickerWrap}>
                    <Picker
                      selectedValue={linkedDisplayId || ''}
                      mode={pickerMode}
                      onValueChange={value => setLinkedDisplayId(String(value || '').trim())}>
                      <Picker.Item
                        label="Nenhum display vinculado"
                        value=""
                      />
                      {displayOptions.map(option => {
                        const optionId = normalizeEntityId(option);
                        return (
                          <Picker.Item
                            key={`display-option-${optionId}`}
                            label={getDisplayLabel(option)}
                            value={optionId}
                          />
                        );
                      })}
                    </Picker>
                  </View>

                  <View style={styles.pickerWrap}>
                    <Picker
                      selectedValue={displayPrinterId || ''}
                      mode={pickerMode}
                      onValueChange={value =>
                        setDisplayPrinterId(normalizeDeviceId(value))
                      }>
                      <Picker.Item
                        label="Nenhuma impressora configurada"
                        value=""
                      />
                      {printerOptions.map(option => {
                        const printerId = normalizeDeviceId(option?.device);
                        const printerValue = getPrinterOptionValue(option);
                        const printerTypeLabel = getDeviceTypeLabel(
                          option?.type,
                        );
                        return (
                          <Picker.Item
                            key={`printer-option-${printerValue || printerId}`}
                            label={`${getPrinterLabel(option)} (${printerTypeLabel} • ${printerId})`}
                            value={printerValue || printerId}
                          />
                        );
                      })}
                    </Picker>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.toggleRow,
                      displayAutoPrintProductEnabled && styles.toggleRowActive,
                    ]}
                    activeOpacity={0.85}
                    onPress={() =>
                      setDisplayAutoPrintProductEnabled(currentValue => !currentValue)
                    }>
                    <View>
                      <Text style={styles.toggleRowLabel}>
                        Imprimir produtos automaticamente
                      </Text>
                      <Text style={styles.toggleRowValue}>
                        {displayAutoPrintProductEnabled ? 'Ativo' : 'Inativo'}
                      </Text>
                    </View>
                    <Icon
                      name={
                        displayAutoPrintProductEnabled
                          ? 'toggle-right'
                          : 'toggle-left'
                      }
                      size={28}
                      color={
                        displayAutoPrintProductEnabled
                          ? hex.success
                          : '#94A3B8'
                      }
                    />
                  </TouchableOpacity>
                </>
              )}

              <Text style={styles.configHint}>
                Para esta rotina funcionar, os dois campos precisam estar
                preenchidos. Quando a opcao automatica estiver ativa, cada
                produto enviado para a fila deste display gera sua propria
                impressao na impressora vinculada.
              </Text>

              <TouchableOpacity
                style={[
                  styles.configButton,
                  savingDisplayPrintingConfig && {opacity: 0.6},
                ]}
                activeOpacity={0.85}
                disabled={savingDisplayPrintingConfig}
                onPress={saveDisplayPrintingConfig}>
                {savingDisplayPrintingConfig ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="save" size={14} color="#fff" />
                    <Text style={styles.configButtonText}>Salvar impressao de preparo</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Icon name="volume-2" size={13} /> {'  '}Aviso Sonoro
          </Text>

          <View style={styles.configCard}>
            <Text style={styles.configTitle}>Alerta via websocket</Text>
            <Text style={styles.configDescription}>
              Quando habilitado, este device toca o audio configurado ao receber
              os eventos order.created, order_product_queue.created e comandos
              de impressao.
            </Text>

            <TouchableOpacity
              style={[
                styles.toggleRow,
                deviceAlertSoundEnabled && styles.toggleRowActive,
              ]}
              activeOpacity={0.85}
              onPress={() =>
                setDeviceAlertSoundEnabled(currentValue => !currentValue)
              }>
              <View>
                <Text style={styles.toggleRowLabel}>Aviso sonoro habilitado</Text>
                <Text style={styles.toggleRowValue}>
                  {deviceAlertSoundEnabled ? 'Ativo' : 'Inativo'}
                </Text>
              </View>
              <Icon
                name={deviceAlertSoundEnabled ? 'toggle-right' : 'toggle-left'}
                size={28}
                color={deviceAlertSoundEnabled ? hex.success : '#94A3B8'}
              />
            </TouchableOpacity>

            <View style={styles.textInputWrap}>
              <Text style={styles.textInputLabel}>URL do audio</Text>
              <TextInput
                style={styles.textInput}
                value={deviceAlertSoundUrl}
                onChangeText={setDeviceAlertSoundUrl}
                placeholder="https://exemplo.com/alerta.mp3"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="done"
                onSubmitEditing={saveDeviceAlertSoundConfig}
                onBlur={saveDeviceAlertSoundConfig}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.configButton,
                savingAlertSound && {opacity: 0.6},
              ]}
              activeOpacity={0.85}
              disabled={savingAlertSound}
              onPress={saveDeviceAlertSoundConfig}>
              {savingAlertSound ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="save" size={14} color="#fff" />
                  <Text style={styles.configButtonText}>Salvar aviso sonoro</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Icon name="activity" size={13} /> {'  '}Rodape do Sistema
          </Text>

          <View style={styles.configCard}>
            <Text style={styles.configTitle}>Debug do socket no rodape</Text>
            <Text style={styles.configDescription}>
              Quando habilitado, este device troca a bolinha discreta do socket
              pelos detalhes de debug publicados pelos servicos do runtime no
              rodape global do sistema.
            </Text>

            <TouchableOpacity
              style={[
                styles.toggleRow,
                deviceRuntimeDebugInfoEnabled && styles.toggleRowActive,
              ]}
              activeOpacity={0.85}
              onPress={() =>
                setDeviceRuntimeDebugInfoEnabled(currentValue => !currentValue)
              }>
              <View>
                <Text style={styles.toggleRowLabel}>Exibir debug detalhado</Text>
                <Text style={styles.toggleRowValue}>
                  {deviceRuntimeDebugInfoEnabled ? 'Ativo' : 'Inativo'}
                </Text>
              </View>
              <Icon
                name={
                  deviceRuntimeDebugInfoEnabled
                    ? 'toggle-right'
                    : 'toggle-left'
                }
                size={28}
                color={
                  deviceRuntimeDebugInfoEnabled ? hex.success : '#94A3B8'
                }
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.configButton,
                savingRuntimeDebugInfo && {opacity: 0.6},
              ]}
              activeOpacity={0.85}
              disabled={savingRuntimeDebugInfo}
              onPress={saveDeviceRuntimeDebugInfo}>
              {savingRuntimeDebugInfo ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="save" size={14} color="#fff" />
                  <Text style={styles.configButtonText}>Salvar debug do rodape</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {!isDisplayDevice && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Icon name="credit-card" size={13} /> {'  '}Pagamento Remoto
            </Text>

            <View style={styles.configCard}>
              <Text style={styles.configTitle}>Device preferencial para pagamento</Text>
              <Text style={styles.configDescription}>
                Se este device nao tiver gateway local, o sistema usa este destino.
                Quando vazio, ele segue a ordem padrao definida na empresa.
              </Text>

              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={devicePaymentTarget || ''}
                  mode={pickerMode}
                  onValueChange={value => setDevicePaymentTarget(value || '')}>
                  <Picker.Item
                    label="Usar devices padrao da empresa"
                    value=""
                  />
                  {paymentDeviceOptions.map(option => (
                    <Picker.Item
                      key={option.deviceId}
                      label={`${option.alias} (${option.gatewayLabel})`}
                      value={option.deviceId}
                    />
                  ))}
                </Picker>
              </View>

              <TouchableOpacity
                style={[
                  styles.configButton,
                  savingPaymentTarget && {opacity: 0.6},
                ]}
                activeOpacity={0.85}
                disabled={savingPaymentTarget}
                onPress={saveDevicePaymentTarget}>
                {savingPaymentTarget ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="save" size={14} color="#fff" />
                    <Text style={styles.configButtonText}>Salvar destino de pagamento</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!isDisplayDevice && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Icon name="refresh-cw" size={13} /> {'  '}Comandos Remotos
            </Text>

            <View style={styles.configCard}>
              <Text style={styles.configTitle}>Catálogo do PDV</Text>
              <Text style={styles.configDescription}>
                Limpa o cache local de produtos e categorias deste device.
                O recarregamento acontece no próximo uso do PDV.
              </Text>

              <TouchableOpacity
                style={[
                  styles.configButton,
                  sendingCatalogRefresh && {opacity: 0.6},
                ]}
                activeOpacity={0.85}
                disabled={sendingCatalogRefresh}
                onPress={sendCatalogRefreshCommand}>
                {sendingCatalogRefresh ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="trash-2" size={14} color="#fff" />
                    <Text style={styles.configButtonText}>Limpar cache de produtos</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isPdvDevice && wallets.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Icon name="credit-card" size={13} /> {'  '}Recebimentos por Forma de Pagamento
            </Text>
            {wallets.map((wallet, wi) => (
              <View key={wi} style={styles.walletCard}>
                <View style={styles.walletHeader}>
                  <Icon name="briefcase" size={13} color="#64748B" />
                  <Text style={styles.walletName}>{wallet.wallet || 'Carteira'}</Text>
                  <Text style={[styles.walletTotal, { color: brandColors.primary }]}>
                    {Formatter.formatMoney(wallet.total)}
                  </Text>
                </View>
                {wallet.payments.map((pt, pi) => (
                  <View key={pi} style={styles.paymentRow}>
                    <View style={[styles.paymentIconBox, { backgroundColor: withOpacity(hex.info, 0.1) }]}>
                      <Icon name={paymentIcon(pt.payment)} size={11} color={hex.info} />
                    </View>
                    <Text style={styles.paymentName}>{pt.payment || '-'}</Text>
                    <Text style={styles.paymentValue}>
                      {Formatter.formatMoney(pt.inflow)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {isPdvDevice && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Icon name="shopping-bag" size={13} /> {'  '}Produtos Vendidos
            </Text>

            <View style={styles.searchRow}>
              <Icon name="search" size={14} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar produto ou SKU..."
                placeholderTextColor="#94A3B8"
              />
              {!!search && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Icon name="x" size={14} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {filteredProducts.length > 0 ? (
              <View style={styles.tableContainer}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHead, { flex: 0.5 }]}>Qtd</Text>
                  <Text style={[styles.tableHead, { flex: 3 }]}>Produto</Text>
                  <Text style={[styles.tableHead, { flex: 1.2, textAlign: 'right' }]}>Unit.</Text>
                  <Text style={[styles.tableHead, { flex: 1.3, textAlign: 'right' }]}>Total</Text>
                </View>
                <FlatList
                  data={filteredProducts}
                  keyExtractor={(item, i) => `${item.product_sku || i}`}
                  renderItem={renderProduct}
                  scrollEnabled={false}
                />
                <View style={styles.tableFooter}>
                  <Text style={styles.tableFooterLabel}>Total em produtos</Text>
                  <Text style={[styles.tableFooterValue, { color: brandColors.primary }]}>
                    {Formatter.formatMoney(productTotal)}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <Icon name="inbox" size={24} color="#CBD5E1" style={{ marginBottom: 8 }} />
                <Text style={styles.emptyText}>
                  {search ? 'Nenhum produto encontrado para esta busca' : 'Nenhum produto registrado neste device'}
                </Text>
              </View>
            )}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },

  /* Cabeçalho do device */
  deviceHeader: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...cardShadow,
  },
  deviceHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  deviceIconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  aliasBlock:  { flex: 1, minWidth: 0 },
  aliasRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  aliasInput: {
    flex: 1,
    fontSize: 15, fontWeight: '700', color: '#0F172A',
    borderBottomWidth: 1.5, borderBottomColor: '#0EA5E9',
    paddingVertical: 2, paddingHorizontal: 0,
    outlineStyle: 'none',
  },
  editAliasBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  deviceAlias:       { fontSize: 15, fontWeight: '800', color: '#0F172A', flex: 1 },
  deviceString:      { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  deviceHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  toggleBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  /* Loading */
  loadingBox:  { flexDirection: 'row', gap: 8, alignItems: 'center' },
  loadingText: { fontSize: 12, color: '#64748B', fontWeight: '600' },

  /* Resumo */
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14,
    padding: 12, ...cardShadow,
  },
  summaryIcon:  { marginBottom: 6 },
  summaryLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: '#94A3B8', letterSpacing: 0.3, marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: '800', color: '#0F172A' },

  /* Seção */
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 13, fontWeight: '800', color: '#334155',
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  configCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    ...cardShadow,
  },
  configTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  configDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
  },
  configHint: {
    fontSize: 12,
    lineHeight: 18,
    color: '#475569',
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  configButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  configButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  toggleRow: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  toggleRowActive: {
    borderColor: withOpacity(hex.success, 0.4),
    backgroundColor: withOpacity(hex.success, 0.08),
  },
  toggleRowLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  toggleRowValue: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
  },
  textInputWrap: {
    gap: 6,
  },
  textInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  textInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#fff',
    color: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 10,
    outlineStyle: 'none',
  },

  /* Carteiras / pagamentos */
  walletCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    gap: 8, ...cardShadow,
  },
  walletHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  walletName:   { flex: 1, fontSize: 14, fontWeight: '700', color: '#0F172A' },
  walletTotal:  { fontSize: 15, fontWeight: '800' },
  paymentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
  },
  paymentIconBox: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  paymentName:    { flex: 1, fontSize: 13, color: '#475569', fontWeight: '600' },
  paymentValue:   { fontSize: 14, fontWeight: '800', color: '#0F172A' },

  /* Tabela de produtos */
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    ...cardShadow,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A', paddingVertical: 0 },
  tableContainer: {
    backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', ...cardShadow,
  },
  tableHeader: {
    flexDirection: 'row', backgroundColor: '#F1F5F9',
    paddingHorizontal: 12, paddingVertical: 8,
  },
  tableHead: { fontSize: 10, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.3 },
  productRow:    { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 9, alignItems: 'flex-start' },
  productRowAlt: { backgroundColor: '#F8FAFC' },
  productCell:   { fontSize: 12, color: '#334155', fontWeight: '500' },
  productName:   { fontSize: 12, color: '#334155', fontWeight: '600' },
  productSku:    { fontSize: 10, color: '#94A3B8', marginTop: 1 },
  tableFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  tableFooterLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  tableFooterValue: { fontSize: 17, fontWeight: '900' },

  /* Vazio */
  emptyBox: {
    backgroundColor: '#fff', borderRadius: 14, padding: 28,
    alignItems: 'center', ...cardShadow,
  },
  emptyText: { fontSize: 13, color: '#94A3B8', fontWeight: '600', textAlign: 'center' },
});

export default DeviceDetailPage;
