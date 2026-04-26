import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import {Picker} from '@react-native-picker/picker';
import { useStore } from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import { resolveThemePalette, withOpacity } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import Icon from 'react-native-vector-icons/Feather';
import styles from './DeviceDetailPage.styles';

import {
  canDisplayChangePrinter,
  DISPLAY_AUTO_PRINT_PRODUCT_CONFIG_KEY,
  DISPLAY_ALLOW_PRINTER_CHANGE_CONFIG_KEY,
  DEVICE_ALERT_SOUND_ENABLED_KEY,
  DEVICE_ALERT_SOUND_URL_KEY,
  DEVICE_ORDER_VISIBILITY_COMPANY,
  DEVICE_ORDER_VISIBILITY_DEVICE,
  DEVICE_ORDER_VISIBILITY_KEY,
  DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY,
  isPosAutoPrintEnabled,
  isPosCashRegisterOpen,
  isTruthyValue,
  parseConfigsObject,
  POS_AUTO_PRINT_ENABLED_CONFIG_KEY,
  POS_CASH_MANAGEMENT_MODE_CASH_REGISTER,
  POS_CASH_MANAGEMENT_MODE_CONFIG_KEY,
  POS_CASH_MANAGEMENT_MODE_DAILY,
  POS_CHECK_ORDER_MANAGEMENT_MODE_CONFIG_KEY,
  POS_CHECK_ORDER_MANAGEMENT_MODE_EXISTING_ONLY,
  POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE,
  POS_CHECK_ORDER_TYPE_CONFIG_KEY,
  POS_CHECK_ORDER_TYPE_NONE,
  POS_CHECK_ORDER_TYPE_TAB,
  POS_CHECK_ORDER_TYPE_TABLE,
  POS_OPERATION_MODE_COUNTER,
  POS_OPERATION_MODE_CONFIG_KEY,
  POS_OPERATION_MODE_OPTIONS,
  POS_PRINT_MODE_FORM,
  POS_PRINT_MODE_ORDER,
  getPosOperationModeOption,
  resolvePosCheckOrderManagementMode,
  resolvePosCheckOrderType,
  resolveDeviceOrderVisibility,
  resolvePosCashManagementMode,
  resolvePosOperationMode,
  resolvePosPrintMode,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';

import {
  filterDeviceConfigsByCompany,
  getCompanyPaymentDeviceOptions,
  getPaymentGatewayFromConfigs,
  getPaymentGatewayLabel,
  isPaymentCapableDeviceConfig,
  isPdvPrinterEnabled,
  normalizeDeviceId,
  normalizeEntityId,
  PAYMENT_GATEWAY_CIELO,
  PDV_PRINTER_ENABLED_CONFIG_KEY,
  ORDER_PAYMENT_DEVICE_CONFIG_KEY,
  POS_GATEWAY_CONFIG_KEY,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';

import {
  getPrinterOptionValue,
  getDeviceTypeLabel,
  getPrinterLabel,
  getPrinterOptions,
} from '@controleonline/ui-common/src/react/utils/printerDevices';

import { inlineStyle_667_12, inlineStyle_1301_61 } from './DeviceDetailPage.styles';

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
const tt = (type, key) => global.t?.t('configs', type, key);

const PDV_TAB_OPERATION = 'operation';
const PDV_TAB_ORDERS = 'orders';
const PDV_TAB_DEVICE = 'device';
const PDV_TAB_MOVEMENT = 'movement';

const PDV_DETAIL_TABS = [
  {key: PDV_TAB_OPERATION, icon: 'sliders', labelKey: 'pdvOperation'},
  {key: PDV_TAB_ORDERS, icon: 'list', labelKey: 'pdvOrders'},
  {key: PDV_TAB_DEVICE, icon: 'cpu', labelKey: 'pdvDevice'},
  {key: PDV_TAB_MOVEMENT, icon: 'bar-chart-2', labelKey: 'pdvMovement'},
];

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
  return isPosCashRegisterOpen(configs);
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
  const { item: runtimeDevice } = deviceStore.getters;
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
  const [loadingConfigData, setLoadingConfigData] = useState(false);
  const [loadingCompanyDeviceConfigs, setLoadingCompanyDeviceConfigs] =
    useState(false);
  const [loadingMovementData, setLoadingMovementData] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activePdvTab, setActivePdvTab] = useState(PDV_TAB_OPERATION);
  const [savingPaymentTarget, setSavingPaymentTarget] = useState(false);
  const [savingPdvSettings, setSavingPdvSettings] = useState(false);
  const [savingPosOperationMode, setSavingPosOperationMode] = useState(false);
  const [savingAlertSound, setSavingAlertSound] = useState(false);
  const [savingOrderVisibility, setSavingOrderVisibility] = useState(false);
  const [savingRuntimeDebugInfo, setSavingRuntimeDebugInfo] = useState(false);
  const [sendingCatalogRefresh, setSendingCatalogRefresh] = useState(false);
  const [search,        setSearch]        = useState('');
  const [devicePaymentTarget, setDevicePaymentTarget] = useState(
    normalizeDeviceId(normalizedInitialConfigs?.[ORDER_PAYMENT_DEVICE_CONFIG_KEY]),
  );
  const [pdvGateway, setPdvGateway] = useState(
    getPaymentGatewayFromConfigs(normalizedInitialConfigs),
  );
  const [pdvPrinterEnabled, setPdvPrinterEnabled] = useState(
    isPdvPrinterEnabled(normalizedInitialConfigs),
  );
  const [posOperationMode, setPosOperationMode] = useState(
    resolvePosOperationMode(normalizedInitialConfigs),
  );
  const [counterAutoPrintEnabled, setCounterAutoPrintEnabled] = useState(
    isPosAutoPrintEnabled(normalizedInitialConfigs),
  );
  const [counterPrintMode, setCounterPrintMode] = useState(
    resolvePosPrintMode(normalizedInitialConfigs),
  );
  const [counterCashManagementMode, setCounterCashManagementMode] = useState(
    resolvePosCashManagementMode(normalizedInitialConfigs),
  );
  const [checkOrderType, setCheckOrderType] = useState(
    resolvePosCheckOrderType(normalizedInitialConfigs),
  );
  const [checkOrderManagementMode, setCheckOrderManagementMode] = useState(
    resolvePosCheckOrderManagementMode(normalizedInitialConfigs),
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
  const [displayAllowPrinterChange, setDisplayAllowPrinterChange] = useState(
    canDisplayChangePrinter(normalizedInitialConfigs),
  );
  const [displayAutoPrintProductEnabled, setDisplayAutoPrintProductEnabled] =
    useState(
      isTruthyValue(
        normalizedInitialConfigs?.[DISPLAY_AUTO_PRINT_PRODUCT_CONFIG_KEY],
      ),
    );
  const [savingDisplayPrintingConfig, setSavingDisplayPrintingConfig] = useState(false);
  const [hasLoadedCurrentConfig, setHasLoadedCurrentConfig] = useState(false);
  const [hasLoadedCompanyConfigs, setHasLoadedCompanyConfigs] = useState(false);
  const [hasLoadedMovementData, setHasLoadedMovementData] = useState(false);

  // Edição inline do alias
  const [alias,        setAlias]        = useState(initialAlias || '');
  const [editingAlias, setEditingAlias] = useState(false);
  const [aliasInput,   setAliasInput]   = useState(alias);
  const [savingAlias,  setSavingAlias]  = useState(false);
  const aliasInputRef = useRef(null);

  const isOpen = useMemo(() => getIsOpen(configs), [configs]);
  const hasLocalPaymentGateway = useMemo(
    () =>
      isPaymentCapableDeviceConfig({
        configs,
        type: deviceType,
        device: {type: deviceType},
      }),
    [configs, deviceType],
  );
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
  const selectedPosOperationModeOption = useMemo(
    () => getPosOperationModeOption(posOperationMode),
    [posOperationMode],
  );
  const pickerMode = Platform.OS === 'android' ? 'dropdown' : undefined;
  const runtimeDeviceId = useMemo(
    () => normalizeDeviceId(runtimeDevice?.id || runtimeDevice?.device),
    [runtimeDevice?.device, runtimeDevice?.id],
  );
  const runtimeDeviceType = useMemo(
    () =>
      String(runtimeDevice?.type || runtimeDevice?.deviceType || '')
        .trim()
        .toUpperCase(),
    [runtimeDevice?.deviceType, runtimeDevice?.type],
  );
  const isEditingRuntimeDevice = useMemo(
    () =>
      !!runtimeDeviceId &&
      runtimeDeviceId === normalizeDeviceId(deviceString) &&
      runtimeDeviceType === deviceType,
    [deviceString, deviceType, runtimeDeviceId, runtimeDeviceType],
  );

  const applyCurrentDeviceConfig = useCallback(scopedItems => {
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
      if (isEditingRuntimeDevice) {
        actionsRef.current.deviceConfigActions.setItem({
          ...dc,
          configs: nextConfigs,
        });
      }
      setConfigs(nextConfigs);
      setDevicePaymentTarget(
        normalizeDeviceId(nextConfigs[ORDER_PAYMENT_DEVICE_CONFIG_KEY]),
      );
      setPdvGateway(getPaymentGatewayFromConfigs(nextConfigs));
      setPdvPrinterEnabled(isPdvPrinterEnabled(nextConfigs));
      setPosOperationMode(resolvePosOperationMode(nextConfigs));
      setCounterAutoPrintEnabled(isPosAutoPrintEnabled(nextConfigs));
      setCounterPrintMode(resolvePosPrintMode(nextConfigs));
      setCounterCashManagementMode(resolvePosCashManagementMode(nextConfigs));
      setCheckOrderType(resolvePosCheckOrderType(nextConfigs));
      setCheckOrderManagementMode(
        resolvePosCheckOrderManagementMode(nextConfigs),
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
      setDisplayAllowPrinterChange(
        canDisplayChangePrinter(nextConfigs),
      );
      setDisplayAutoPrintProductEnabled(
        isTruthyValue(nextConfigs[DISPLAY_AUTO_PRINT_PRODUCT_CONFIG_KEY]),
      );
      return;
    }

    if (isEditingRuntimeDevice) {
      actionsRef.current.deviceConfigActions.setItem({});
    }

    setConfigs({});
    setDevicePaymentTarget('');
    setPdvGateway('');
    setPdvPrinterEnabled(true);
    setPosOperationMode(resolvePosOperationMode({}));
    setCounterAutoPrintEnabled(isPosAutoPrintEnabled({}));
    setCounterPrintMode(resolvePosPrintMode({}));
    setCounterCashManagementMode(resolvePosCashManagementMode({}));
    setCheckOrderType(resolvePosCheckOrderType({}));
    setCheckOrderManagementMode(resolvePosCheckOrderManagementMode({}));
    setDeviceOrderVisibility(DEVICE_ORDER_VISIBILITY_DEVICE);
    setDeviceAlertSoundEnabled(false);
    setDeviceAlertSoundUrl('');
    setDeviceRuntimeDebugInfoEnabled(false);
    setLinkedDisplayId('');
    setDisplayPrinterId('');
    setDisplayAllowPrinterChange(false);
    setDisplayAutoPrintProductEnabled(false);
  }, [dcId, deviceString, deviceType, isEditingRuntimeDevice]);

  const loadMovementData = useCallback(async () => {
    if (!isPdvDevice) {
      setProducts([]);
      setInflowData(null);
      setHasLoadedMovementData(false);
      return;
    }

    if (!currentCompany?.id || !deviceString) return;
    setLoadingMovementData(true);
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
      setLoadingMovementData(false);
      setHasLoadedMovementData(true);
    }
  }, [currentCompany?.id, deviceString, isPdvDevice]);

  const refreshCurrentConfig = useCallback(async () => {
    if (!currentCompany?.id) return;
    setLoadingConfigData(true);
    try {
      const items = await actionsRef.current.deviceConfigActions.getItems({
        'device.device': deviceString,
        people: `/people/${currentCompany.id}`,
        type: deviceType,
      });
      const scopedItems = filterDeviceConfigsByCompany(items, currentCompany?.id);
      applyCurrentDeviceConfig(scopedItems);
    } catch {
      applyCurrentDeviceConfig([]);
    } finally {
      setLoadingConfigData(false);
      setHasLoadedCurrentConfig(true);
    }
  }, [
    actionsRef,
    applyCurrentDeviceConfig,
    currentCompany?.id,
    deviceString,
    deviceType,
  ]);

  const loadCompanyConfigs = useCallback(async () => {
    if (!currentCompany?.id) return;

    setLoadingCompanyDeviceConfigs(true);
    try {
      const items = await actionsRef.current.deviceConfigActions.getItems({
        people: `/people/${currentCompany.id}`,
      });
      const scopedItems = filterDeviceConfigsByCompany(items, currentCompany?.id);
      setCompanyDeviceConfigs(Array.isArray(scopedItems) ? scopedItems : []);
    } catch {
      setCompanyDeviceConfigs([]);
    } finally {
      setLoadingCompanyDeviceConfigs(false);
      setHasLoadedCompanyConfigs(true);
    }
  }, [currentCompany?.id]);

  const ensureActiveTabData = useCallback(async ({ force = false } = {}) => {
    if (!currentCompany?.id) {
      return;
    }

    if (!isPdvDevice) {
      await Promise.all([
        refreshCurrentConfig(),
        loadCompanyConfigs(),
      ]);
      return;
    }

    if (activePdvTab === PDV_TAB_MOVEMENT) {
      if (!force && hasLoadedMovementData) {
        return;
      }
      await loadMovementData();
      return;
    }

    if (activePdvTab === PDV_TAB_ORDERS) {
      const pendingLoads = [];
      if (force || !hasLoadedCurrentConfig) {
        pendingLoads.push(refreshCurrentConfig());
      }
      if (force || !hasLoadedCompanyConfigs) {
        pendingLoads.push(loadCompanyConfigs());
      }

      if (pendingLoads.length > 0) {
        await Promise.all(pendingLoads);
      }
      return;
    }

    if (force || !hasLoadedCurrentConfig) {
      await refreshCurrentConfig();
    }
  }, [
    activePdvTab,
    currentCompany?.id,
    hasLoadedCompanyConfigs,
    hasLoadedCurrentConfig,
    hasLoadedMovementData,
    isPdvDevice,
    loadCompanyConfigs,
    loadMovementData,
    refreshCurrentConfig,
  ]);

  useEffect(() => {
    setHasLoadedCurrentConfig(false);
    setHasLoadedCompanyConfigs(false);
    setHasLoadedMovementData(false);
    setProducts([]);
    setInflowData(null);
    setCompanyDeviceConfigs([]);
  }, [currentCompany?.id, deviceString, deviceType]);

  useFocusEffect(
    useCallback(() => {
      ensureActiveTabData({ force: true });
    }, [ensureActiveTabData]),
  );

  useEffect(() => {
    if (!isPdvDevice) {
      return;
    }

    ensureActiveTabData();
  }, [activePdvTab, ensureActiveTabData, isPdvDevice]);

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

  const handleToggle = useCallback(() => {
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
        await refreshCurrentConfig();
        if (activePdvTab === PDV_TAB_MOVEMENT || hasLoadedMovementData) {
          await loadMovementData();
        }
      } catch {
        // silencioso
      } finally {
        setActionLoading(false);
      }
    });
  }, [
    activePdvTab,
    currentCompany?.id,
    deviceString,
    hasLoadedMovementData,
    isOpen,
    isPdvDevice,
    loadMovementData,
    refreshCurrentConfig,
  ]);

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
      const savedDevice = await actionsRef.current.deviceActions.save({
        id: deviceId,
        alias: trimmed,
      });
      const nextAlias = String(savedDevice?.alias || trimmed).trim();
      setAlias(nextAlias);
      setAliasInput(nextAlias);
      navigation.setParams({alias: nextAlias});
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
      await refreshCurrentConfig();
    } catch {
      // silencioso
    } finally {
      setSavingPaymentTarget(false);
    }
  }, [currentCompany?.id, devicePaymentTarget, deviceString, deviceType, refreshCurrentConfig]);

  const savePdvSettings = useCallback(async () => {
    if (
      !isPdvDevice ||
      !currentCompany?.id ||
      !deviceString ||
      savingPdvSettings
    ) {
      return;
    }

    setSavingPdvSettings(true);
    try {
      await actionsRef.current.deviceConfigActions.addDeviceConfigs({
        device: deviceString,
        configs: JSON.stringify({
          [POS_GATEWAY_CONFIG_KEY]: pdvGateway || '',
          [PDV_PRINTER_ENABLED_CONFIG_KEY]: pdvPrinterEnabled ? '1' : '0',
        }),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshCurrentConfig();
    } catch {
      // silencioso
    } finally {
      setSavingPdvSettings(false);
    }
  }, [
    currentCompany?.id,
    deviceString,
    deviceType,
    isPdvDevice,
    pdvGateway,
    pdvPrinterEnabled,
    refreshCurrentConfig,
    savingPdvSettings,
  ]);

  const savePosOperationMode = useCallback(async () => {
    if (
      !isPdvDevice ||
      !currentCompany?.id ||
      !deviceString ||
      savingPosOperationMode
    ) {
      return;
    }

    setSavingPosOperationMode(true);
    try {
      const nextOperationConfigs = {
        [POS_OPERATION_MODE_CONFIG_KEY]: posOperationMode,
        [POS_CHECK_ORDER_TYPE_CONFIG_KEY]: checkOrderType,
        [POS_CHECK_ORDER_MANAGEMENT_MODE_CONFIG_KEY]:
          checkOrderType === POS_CHECK_ORDER_TYPE_NONE
            ? POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE
            : checkOrderManagementMode,
      };

      if (posOperationMode === POS_OPERATION_MODE_COUNTER) {
        nextOperationConfigs[POS_AUTO_PRINT_ENABLED_CONFIG_KEY] =
          counterAutoPrintEnabled ? '1' : '0';
        nextOperationConfigs['print-mode'] = counterPrintMode;
        nextOperationConfigs[POS_CASH_MANAGEMENT_MODE_CONFIG_KEY] =
          counterCashManagementMode;
      }

      await actionsRef.current.deviceConfigActions.addDeviceConfigs({
        device: deviceString,
        configs: JSON.stringify(nextOperationConfigs),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshCurrentConfig();
    } catch {
      // silencioso
    } finally {
      setSavingPosOperationMode(false);
    }
  }, [
    currentCompany?.id,
    checkOrderManagementMode,
    checkOrderType,
    counterAutoPrintEnabled,
    counterCashManagementMode,
    counterPrintMode,
    deviceString,
    deviceType,
    isPdvDevice,
    posOperationMode,
    refreshCurrentConfig,
    savingPosOperationMode,
  ]);

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
      await refreshCurrentConfig();
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
    refreshCurrentConfig,
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
      await refreshCurrentConfig();
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
    refreshCurrentConfig,
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
      await refreshCurrentConfig();
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
    refreshCurrentConfig,
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
          [DISPLAY_ALLOW_PRINTER_CHANGE_CONFIG_KEY]:
            displayAllowPrinterChange ? '1' : '0',
          [DISPLAY_AUTO_PRINT_PRODUCT_CONFIG_KEY]:
            displayAutoPrintProductEnabled ? '1' : '0',
        }),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshCurrentConfig();
    } catch {
      // silencioso
    } finally {
      setSavingDisplayPrintingConfig(false);
    }
  }, [
    currentCompany?.id,
    deviceString,
    deviceType,
    displayAllowPrinterChange,
    displayAutoPrintProductEnabled,
    displayPrinterId,
    isDisplayDevice,
    linkedDisplayId,
    refreshCurrentConfig,
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
      } catch {
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
  const showPdvOperationTab =
    isPdvDevice && activePdvTab === PDV_TAB_OPERATION;
  const showPdvOrdersTab = isPdvDevice && activePdvTab === PDV_TAB_ORDERS;
  const showPdvDeviceTab = isPdvDevice && activePdvTab === PDV_TAB_DEVICE;
  const showPdvMovementTab =
    isPdvDevice && activePdvTab === PDV_TAB_MOVEMENT;
  const loadingActiveTabData = isPdvDevice && (
    (showPdvMovementTab && loadingMovementData) ||
    (!showPdvMovementTab && loadingConfigData) ||
    (showPdvOrdersTab && loadingCompanyDeviceConfigs)
  );
  const shouldShowOrderVisibility =
    !isDisplayDevice && (!isPdvDevice || showPdvOrdersTab);
  const shouldShowRemotePayment =
    shouldShowOrderVisibility &&
    (!hasLocalPaymentGateway || pdvGateway !== PAYMENT_GATEWAY_CIELO);
  const shouldShowDeviceBehavior = !isPdvDevice || showPdvDeviceTab;
  const shouldShowRemoteCommands =
    !isDisplayDevice && (!isPdvDevice || showPdvDeviceTab);

  const renderProduct = ({ item, index }) => (
    <View style={[styles.productRow, index % 2 === 0 && styles.productRowAlt]}>
      <Text style={[styles.productCell, { flex: 0.5 }]}>{item.quantity}</Text>
      <View style={inlineStyle_667_12}>
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

        </View>

        {loadingActiveTabData && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={brandColors.primary} />
            <Text style={styles.loadingText}>Carregando dados do device...</Text>
          </View>
        )}

        {isPdvDevice && (
          <View style={styles.tabsBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsContent}>
              {PDV_DETAIL_TABS.map(tab => {
                const active = activePdvTab === tab.key;

                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[
                      styles.tabButton,
                      active && {
                        borderColor: withOpacity(brandColors.primary, 0.35),
                        backgroundColor: withOpacity(brandColors.primary, 0.1),
                      },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => setActivePdvTab(tab.key)}>
                    <Icon
                      name={tab.icon}
                      size={14}
                      color={active ? brandColors.primary : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.tabButtonText,
                        active && {color: brandColors.primary},
                      ]}>
                      {tt('tab', tab.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {showPdvMovementTab && (
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

        {showPdvOperationTab && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Icon name="credit-card" size={13} /> {'  '}Configuracao do PDV
            </Text>

            <View style={styles.configCard}>
              <Text style={styles.configTitle}>
                {tt('title', 'posOperationMode')}
              </Text>
              <Text style={styles.configDescription}>
                {tt('description', 'posOperationModeDescription')}
              </Text>

              <View style={styles.textInputWrap}>
                <Text style={styles.textInputLabel}>
                  {tt('label', 'operationMode')}
                </Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={posOperationMode}
                    mode={pickerMode}
                    onValueChange={value =>
                      setPosOperationMode(resolvePosOperationMode({
                        [POS_OPERATION_MODE_CONFIG_KEY]: value,
                      }))
                    }>
                    {POS_OPERATION_MODE_OPTIONS.map(option => (
                      <Picker.Item
                        key={option.value}
                        label={tt('option', option.translationKey)}
                        value={option.value}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <Text style={styles.configHint}>
                {tt(
                  'description',
                  selectedPosOperationModeOption?.descriptionKey,
                )}
              </Text>

              <View style={styles.textInputWrap}>
                <Text style={styles.textInputLabel}>
                  {global.t?.t('configs', 'label', 'linkedOrderType') ||
                    'Service base order'}
                </Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={checkOrderType}
                    mode={pickerMode}
                    onValueChange={value =>
                      setCheckOrderType(
                        value === POS_CHECK_ORDER_TYPE_TAB
                          ? POS_CHECK_ORDER_TYPE_TAB
                          : value === POS_CHECK_ORDER_TYPE_TABLE
                            ? POS_CHECK_ORDER_TYPE_TABLE
                            : POS_CHECK_ORDER_TYPE_NONE,
                      )
                    }>
                    <Picker.Item
                      label={global.t?.t('configs', 'option', 'none') || 'None'}
                      value={POS_CHECK_ORDER_TYPE_NONE}
                    />
                    <Picker.Item
                      label={global.t?.t('orders', 'title', 'tab') || 'Tab'}
                      value={POS_CHECK_ORDER_TYPE_TAB}
                    />
                    <Picker.Item
                      label={global.t?.t('orders', 'title', 'table') || 'Table'}
                      value={POS_CHECK_ORDER_TYPE_TABLE}
                    />
                  </Picker>
                </View>
              </View>

              {checkOrderType !== POS_CHECK_ORDER_TYPE_NONE && (
                <View style={styles.textInputWrap}>
                  <Text style={styles.textInputLabel}>
                    {global.t?.t(
                      'configs',
                      'label',
                      'linkedOrderManagementMode',
                    ) || 'Tab and table access'}
                  </Text>
                  <View style={styles.pickerWrap}>
                    <Picker
                      selectedValue={checkOrderManagementMode}
                      mode={pickerMode}
                      onValueChange={value =>
                        setCheckOrderManagementMode(
                          value ===
                            POS_CHECK_ORDER_MANAGEMENT_MODE_EXISTING_ONLY
                            ? POS_CHECK_ORDER_MANAGEMENT_MODE_EXISTING_ONLY
                            : POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE,
                        )
                      }>
                      <Picker.Item
                        label={
                          global.t?.t(
                            'configs',
                            'option',
                            'manageLinkedOrders',
                          ) || 'Open and close tabs/tables'
                        }
                        value={POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE}
                      />
                      <Picker.Item
                        label={
                          global.t?.t(
                            'configs',
                            'option',
                            'existingLinkedOrdersOnly',
                          ) || 'Use open tabs/tables only'
                        }
                        value={
                          POS_CHECK_ORDER_MANAGEMENT_MODE_EXISTING_ONLY
                        }
                      />
                    </Picker>
                  </View>
                </View>
              )}

              {posOperationMode === POS_OPERATION_MODE_COUNTER && (
                <>
                  <TouchableOpacity
                    style={styles.toggleRow}
                    activeOpacity={0.85}
                    onPress={() =>
                      setCounterAutoPrintEnabled(currentValue => !currentValue)
                    }>
                    <View>
                      <Text style={styles.toggleRowLabel}>
                        Impressao automatica
                      </Text>
                      <Text style={styles.toggleRowValue}>
                        {counterAutoPrintEnabled ? 'Sim' : 'Nao'}
                      </Text>
                    </View>
                    <Icon
                      name={
                        counterAutoPrintEnabled
                          ? 'toggle-right'
                          : 'toggle-left'
                      }
                      size={28}
                      color={
                        counterAutoPrintEnabled
                          ? hex.success
                          : '#94A3B8'
                      }
                    />
                  </TouchableOpacity>

                  {counterAutoPrintEnabled && (
                    <View style={styles.textInputWrap}>
                      <Text style={styles.textInputLabel}>
                        Tipo de impressao automatica
                      </Text>
                      <View style={styles.pickerWrap}>
                        <Picker
                          selectedValue={counterPrintMode}
                          mode={pickerMode}
                          onValueChange={value =>
                            setCounterPrintMode(
                              value === POS_PRINT_MODE_FORM
                                ? POS_PRINT_MODE_FORM
                                : POS_PRINT_MODE_ORDER,
                            )
                          }>
                          <Picker.Item
                            label="Pedido"
                            value={POS_PRINT_MODE_ORDER}
                          />
                          <Picker.Item
                            label="Fichas"
                            value={POS_PRINT_MODE_FORM}
                          />
                        </Picker>
                      </View>
                    </View>
                  )}

                  <View style={styles.textInputWrap}>
                    <Text style={styles.textInputLabel}>
                      Politica de caixa
                    </Text>
                    <View style={styles.pickerWrap}>
                      <Picker
                        selectedValue={counterCashManagementMode}
                        mode={pickerMode}
                        onValueChange={value =>
                          setCounterCashManagementMode(
                            value === POS_CASH_MANAGEMENT_MODE_DAILY
                              ? POS_CASH_MANAGEMENT_MODE_DAILY
                              : POS_CASH_MANAGEMENT_MODE_CASH_REGISTER,
                          )
                        }>
                        <Picker.Item
                          label="Abertura e fechamento de caixa"
                          value={POS_CASH_MANAGEMENT_MODE_CASH_REGISTER}
                        />
                        <Picker.Item
                          label="Fechamento diario"
                          value={POS_CASH_MANAGEMENT_MODE_DAILY}
                        />
                      </Picker>
                    </View>
                  </View>

                  <Text style={styles.configHint}>
                    Quando o balcao usar abertura e fechamento de caixa, o
                    fechamento pode disparar o relatorio de vendas do device
                    para os numeros configurados em Operacao e PDV da empresa.
                  </Text>
                </>
              )}

              <TouchableOpacity
                style={[
                  styles.configButton,
                  savingPosOperationMode && {opacity: 0.6},
                ]}
                activeOpacity={0.85}
                disabled={savingPosOperationMode}
                onPress={savePosOperationMode}>
                {savingPosOperationMode ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="save" size={14} color="#fff" />
                    <Text style={styles.configButtonText}>
                      {tt('button', 'savePosOperationMode')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.configCard}>
              <Text style={styles.configTitle}>Gateway e impressora</Text>
              <Text style={styles.configDescription}>
                O tipo do PDV define qual carteira da empresa sera usada no
                caixa e no pagamento remoto. Ative a opcao de impressora apenas
                quando este PDV puder receber impressoes.
              </Text>

              <View style={styles.textInputWrap}>
                <Text style={styles.textInputLabel}>Tipo do PDV</Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={pdvGateway || ''}
                    mode={pickerMode}
                    onValueChange={value => setPdvGateway(String(value || ''))}>
                    <Picker.Item
                      label="Selecione o tipo do PDV"
                      value=""
                    />
                    <Picker.Item label="Infinite Pay" value="infinite-pay" />
                    <Picker.Item label="Cielo" value="cielo" />
                  </Picker>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.toggleRow,
                  pdvPrinterEnabled && styles.toggleRowActive,
                ]}
                activeOpacity={0.85}
                onPress={() =>
                  setPdvPrinterEnabled(currentValue => !currentValue)
                }>
                <View>
                  <Text style={styles.toggleRowLabel}>Impressora</Text>
                  <Text style={styles.toggleRowValue}>
                    {pdvPrinterEnabled ? 'Sim' : 'Nao'}
                  </Text>
                </View>
                <Icon
                  name={pdvPrinterEnabled ? 'toggle-right' : 'toggle-left'}
                  size={28}
                  color={pdvPrinterEnabled ? hex.success : '#94A3B8'}
                />
              </TouchableOpacity>

              <Text style={styles.configHint}>
                {pdvGateway
                  ? `Gateway atual: ${getPaymentGatewayLabel(pdvGateway)}.`
                  : 'Escolha Cielo ou Infinite Pay para que o PDV use a carteira correta da empresa.'}{' '}
                Quando a impressora estiver desativada, este PDV deixa de ser
                oferecido como destino padrao de impressao.
              </Text>

              <TouchableOpacity
                style={[
                  styles.configButton,
                  savingPdvSettings && {opacity: 0.6},
                ]}
                activeOpacity={0.85}
                disabled={savingPdvSettings}
                onPress={savePdvSettings}>
                {savingPdvSettings ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="save" size={14} color="#fff" />
                    <Text style={styles.configButtonText}>Salvar configuracao do PDV</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {shouldShowOrderVisibility && (
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
                      displayAllowPrinterChange && styles.toggleRowActive,
                    ]}
                    activeOpacity={0.85}
                    onPress={() =>
                      setDisplayAllowPrinterChange(currentValue => !currentValue)
                    }>
                    <View>
                      <Text style={styles.toggleRowLabel}>
                        Pode trocar de impressora?
                      </Text>
                      <Text style={styles.toggleRowValue}>
                        {displayAllowPrinterChange ? 'Sim' : 'Nao'}
                      </Text>
                    </View>
                    <Icon
                      name={
                        displayAllowPrinterChange
                          ? 'toggle-right'
                          : 'toggle-left'
                      }
                      size={28}
                      color={
                        displayAllowPrinterChange
                          ? hex.success
                          : '#94A3B8'
                      }
                    />
                  </TouchableOpacity>

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
                impressao na impressora vinculada. Quando a troca estiver
                desativada, o app usa sempre a impressora padrao acima.
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

        {shouldShowDeviceBehavior && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Icon name="volume-2" size={13} /> {'  '}Aviso Sonoro
          </Text>

          <View style={styles.configCard}>
            <Text style={styles.configTitle}>Alerta via websocket</Text>
            <Text style={styles.configDescription}>
              Quando habilitado, este device toca o audio configurado ao receber
              o evento `order.created` de um novo pedido em preparo.
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
        )}

        {shouldShowDeviceBehavior && (
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
        )}

        {shouldShowRemotePayment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Icon name="credit-card" size={13} /> {'  '}Pagamento Remoto
            </Text>

            <View style={styles.configCard}>
              <Text style={styles.configTitle}>Device preferencial para pagamento</Text>
              <Text style={styles.configDescription}>
                Esse destino funciona como fallback desta origem quando a
                empresa nao definiu uma ordem padrao no configurador geral.
                Quando a empresa tiver devices padrao para pagamento remoto,
                essa ordem global tem prioridade. Quando vazio, o sistema usa a
                regra da empresa ou cai para os PDVs remotos disponiveis.
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

        {shouldShowRemoteCommands && (
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

        {showPdvMovementTab && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                <Icon name="shield" size={13} /> {'  '}
                {global.t?.t('manager', 'title', 'pdvMovement') || 'PDV Movement'}
              </Text>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  {backgroundColor: isOpen ? hex.danger : hex.success},
                  actionLoading && {opacity: 0.6},
                ]}
                onPress={handleToggle}
                disabled={actionLoading || loadingConfigData}
                activeOpacity={0.85}>
                {actionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Icon
                      name={isOpen ? 'lock' : 'unlock'}
                      size={13}
                      color="#fff"
                    />
                    <Text style={styles.toggleBtnText}>
                      {isOpen
                        ? global.t?.t('orders', 'button', 'closeCashRegister') || 'Close'
                        : global.t?.t('orders', 'button', 'openCashRegister') || 'Open'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionHelperText}>
              {isOpen
                ? global.t?.t('orders', 'message', 'cashRegisterOpen') || 'The register is currently open for this device.'
                : global.t?.t('orders', 'message', 'cashRegisterClosed') || 'The register is currently closed for this device.'}
            </Text>
          </View>
        )}

        {showPdvMovementTab && wallets.length > 0 && (
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

        {showPdvMovementTab && (
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
                <Icon name="inbox" size={24} color="#CBD5E1" style={inlineStyle_1301_61} />
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

export default DeviceDetailPage;
