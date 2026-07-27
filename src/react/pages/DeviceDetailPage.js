import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import {Picker} from '@react-native-picker/picker';
import { useStore } from '@store';
import { api } from '@controleonline/ui-common/src/api';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import StateStore from '@controleonline/ui-common/src/react/components/StateStore';
import PaymentTypesByWalletTab from '@controleonline/ui-common/src/react/pages/SettingsPage/PaymentTypesByWalletTab';
import { appendScreenMetrics } from '@controleonline/ui-common/src/react/utils/screenMetrics';
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';
import { resolveThemePalette, withOpacity } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import Icon from 'react-native-vector-icons/Feather';
import styles from './DeviceDetailPage.styles';
import packageJson from '@package';
import DefaultTooltip from '@controleonline/ui-default/src/react/components/help/DefaultTooltip';

import {
  canDisplayChangePrinter,
  DEVICE_ANDROID_KIOSK_ENABLED_CONFIG_KEY,
  DEVICE_ANDROID_LAUNCHER_ENABLED_CONFIG_KEY,
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
  POS_CHECK_ORDER_TYPE_STAMP,
  POS_DELIVERY_ENABLED_CONFIG_KEY,
  POS_OPERATION_MODE_COUNTER,
  POS_OPERATION_MODE_CONFIG_KEY,
  POS_OPERATION_MODE_OPTIONS,
  POS_PRODUCT_SHOWCASE_CONFIG_KEY,
  POS_PRINT_MODE_FORM,
  POS_PRINT_MODE_ORDER,
  getPosOperationModeOption,
  isAndroidKioskEnabled,
  isAndroidLauncherEnabled,
  isPosDeliveryEnabled,
  resolvePosCheckOrderManagementMode,
  resolvePosCheckOrderType,
  resolvePosCheckOrderTypeForShop,
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
  PAYMENT_TYPE_IDS_CONFIG_KEY,
  PAYMENT_GATEWAY_CIELO,
  PDV_PRINTER_ENABLED_CONFIG_KEY,
  ORDER_PAYMENT_DEVICE_CONFIG_KEY,
  POS_GATEWAY_CONFIG_KEY,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import {
  normalizeBooleanConfig,
  SHOP_LOYALTY_COUPONS_ENABLED_CONFIG_KEY,
} from '@controleonline/ui-common/src/react/utils/shopConfig';

import {
  getPrinterOptionValue,
  getDeviceTypeLabel,
  getPrinterLabel,
  getPrinterOptions,
} from '@controleonline/ui-common/src/react/utils/printerDevices';

import { inlineStyle_667_12, inlineStyle_1301_61 } from './DeviceDetailPage.styles';

const hex = {
  success: '#10b981',
  danger:  '#c10015',
  warning: '#e67e22',
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
const PDV_TAB_PAYMENT_TYPES = 'payment-types';
const PDV_TAB_MOVEMENT = 'movement';

const PDV_DETAIL_TABS = [
  {key: PDV_TAB_OPERATION, icon: 'sliders', labelKey: 'pdvOperation'},
  {key: PDV_TAB_ORDERS, icon: 'list', labelKey: 'pdvOrders'},
  {key: PDV_TAB_DEVICE, icon: 'cpu', labelKey: 'pdvDevice'},
  {key: PDV_TAB_PAYMENT_TYPES, icon: 'credit-card', labelKey: 'pdvPayments'},
  {key: PDV_TAB_MOVEMENT, icon: 'bar-chart-2', labelKey: 'pdvMovement'},
];

const formatApiError = (error, fallback) => {
  if (typeof error === 'string') {
    return error.trim() || fallback;
  }

  if (Array.isArray(error?.message)) {
    return (
      error.message
        .map(item => item?.message || item?.title || String(item || '').trim())
        .filter(Boolean)
        .join('\n') || fallback
    );
  }

  return error?.message || error?.description || fallback;
};

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

const getProductShowcaseLabel = showcase => {
  const name = String(showcase?.name || '').trim();
  const externalCode = String(showcase?.externalStoreCode || '').trim();
  if (name && externalCode) return `${name} (${externalCode})`;
  return name || `Vitrine #${normalizeEntityId(showcase) || '--'}`;
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

const getDeviceSwitchProps = ({
  disabled = false,
  palette,
  value = false,
}) => {
  const offTrackColor = disabled
    ? palette.switchDisabledTrack
    : palette.switchOffTrack;
  const onTrackColor = disabled
    ? palette.switchDisabledTrack
    : palette.switchOnTrack;

  return {
    ios_backgroundColor: offTrackColor,
    thumbColor: disabled
      ? palette.switchDisabledThumb
      : value
        ? palette.switchOnThumb
        : palette.switchOffThumb,
    trackColor: {
      false: offTrackColor,
      true: onTrackColor,
    },
  };
};

const OptionButtonChip = ({
  label,
  selected,
  disabled,
  colors: optionColors,
  tooltip,
  onPress,
}) => {
  const [hovered, setHovered] = useState(false);
  const showTooltip = Platform.OS === 'web' && disabled && Boolean(tooltip) && hovered;

  return (
    <Pressable
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[styles.optionButtonHoverWrap, hovered && styles.optionButtonHoverWrapActive]}
    >
      <TouchableOpacity
        style={[
          styles.optionButton,
          selected && styles.optionButtonActive,
          optionColors && {
            backgroundColor: selected
              ? optionColors.buttonBackground
              : optionColors.buttonBackgroundSecondary,
            borderColor: selected
              ? optionColors.buttonBorder
              : optionColors.buttonBorderSecondary,
          },
          disabled && {opacity: 0.55},
        ]}
        accessibilityHint={tooltip || undefined}
        activeOpacity={disabled ? 1 : 0.85}
        disabled={disabled}
        onPress={disabled ? undefined : onPress}
      >
        <Text
          style={[
            styles.optionButtonText,
            selected && styles.optionButtonTextActive,
            optionColors && {
              color: selected
                ? optionColors.buttonText
                : optionColors.buttonTextSecondary,
            },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>

      {showTooltip ? (
        <View pointerEvents="none" style={styles.optionButtonTooltip}>
          <Text style={styles.optionButtonTooltipText}>{tooltip}</Text>
        </View>
      ) : null}
    </Pressable>
  );
};

const DeviceDetailPage = () => {
  const route      = useRoute();
  const navigation = useNavigation();
  const {
    deviceId: routeDeviceId,
  } = route.params || {};
  const deviceId = useMemo(
    () => normalizeEntityId(routeDeviceId),
    [routeDeviceId],
  );

  const invoiceStore      = useStore('invoice');
  const deviceConfigStore = useStore('device_config');
  const deviceStore       = useStore('device');
  const displayStore      = useStore('displays');
  const peopleStore       = useStore('people');
  const printerStore      = useStore('printer');
  const themeStore        = useStore('theme');
  const websocketStore    = useStore('websocket');
  const messageApi = useMessage() || {};

  const { currentCompany }      = peopleStore.getters;
  const { item: runtimeDevice } = deviceStore.getters;
  const { item: runtimeDeviceConfig } = deviceConfigStore.getters;
  const { items: displays = [], isLoading: isLoadingDisplays } = displayStore.getters;
  const { items: printers = [], isLoading: isLoadingPrinters } = printerStore.getters;
  const { colors: themeColors } = themeStore.getters;
  const websocketActions = websocketStore.actions;
  const runtimeCompanyConfigs = useMemo(
    () => parseConfigsObject(currentCompany?.configs),
    [currentCompany?.configs],
  );
  const showSystemError = useCallback(
    (error, fallback) => {
      messageApi.showError?.(formatApiError(error, fallback));
    },
    [messageApi],
  );
  const loyaltyCouponsEnabled = useMemo(
    () => {
      const hasLoyaltyCouponsEnabledKey = Object.prototype.hasOwnProperty.call(
        runtimeCompanyConfigs || {},
        SHOP_LOYALTY_COUPONS_ENABLED_CONFIG_KEY,
      );

      return hasLoyaltyCouponsEnabledKey
        ? normalizeBooleanConfig(
            runtimeCompanyConfigs?.[SHOP_LOYALTY_COUPONS_ENABLED_CONFIG_KEY],
          )
        : true;
    },
    [runtimeCompanyConfigs],
  );

  const currentDevice =
    deviceId &&
    normalizeEntityId(runtimeDevice?.id || runtimeDevice?.['@id']) === deviceId
      ? runtimeDevice
      : {};
  const currentDeviceConfig =
    deviceId &&
    normalizeEntityId(
      runtimeDeviceConfig?.device?.id ||
        runtimeDeviceConfig?.device?.['@id'] ||
        runtimeDeviceConfig?.deviceId ||
        runtimeDeviceConfig?.device?.deviceId,
    ) === deviceId
      ? runtimeDeviceConfig
      : {};
  const deviceString = String(
    currentDevice?.device || currentDeviceConfig?.device?.device || '',
  ).trim();
  const deviceType = String(
    currentDevice?.type ||
      currentDevice?.deviceType ||
      currentDeviceConfig?.type ||
      currentDeviceConfig?.device?.type ||
      '',
  )
    .trim()
    .toUpperCase();
  const normalizedInitialConfigs = useMemo(
    () => parseConfigsObject(currentDeviceConfig?.configs),
    [currentDeviceConfig?.configs],
  );
  const initialAlias = String(
    currentDevice?.alias || currentDeviceConfig?.device?.alias || currentDevice?.device || '',
  ).trim();
  const isDisplayDevice = deviceType === DISPLAY_DEVICE_TYPE;
  const isPdvDevice = deviceType === PDV_DEVICE_TYPE;

  const actionsRef = useRef({});
  const stampAutoDisableSignatureRef = useRef('');
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
  const [productShowcases, setProductShowcases] = useState([]);
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
  const [savingPaymentTypes, setSavingPaymentTypes] = useState(false);
  const [savingPosOperationMode, setSavingPosOperationMode] = useState(false);
  const [savingProductShowcase, setSavingProductShowcase] = useState(false);
  const [savingLauncherMode, setSavingLauncherMode] = useState(false);
  const [savingAlertSound, setSavingAlertSound] = useState(false);
  const [savingOrderVisibility, setSavingOrderVisibility] = useState(false);
  const [savingDeviceDeliverySettings, setSavingDeviceDeliverySettings] =
    useState(false);
  const [savingRuntimeDebugInfo, setSavingRuntimeDebugInfo] = useState(false);
  const [sendingCatalogRefresh, setSendingCatalogRefresh] = useState(false);
  const [loadingProductShowcases, setLoadingProductShowcases] = useState(false);
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
  const [productShowcaseId, setProductShowcaseId] = useState(
    normalizeEntityId(normalizedInitialConfigs?.[POS_PRODUCT_SHOWCASE_CONFIG_KEY]),
  );
  const [androidKioskEnabled, setAndroidKioskEnabled] = useState(
    isAndroidKioskEnabled(normalizedInitialConfigs),
  );
  const [androidLauncherEnabled, setAndroidLauncherEnabled] = useState(
    isAndroidLauncherEnabled(normalizedInitialConfigs),
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
    resolvePosCheckOrderTypeForShop(
      normalizedInitialConfigs,
      runtimeCompanyConfigs,
    ),
  );
  const [checkOrderManagementMode, setCheckOrderManagementMode] = useState(
    resolvePosCheckOrderManagementMode(normalizedInitialConfigs),
  );
  const [deviceOrderVisibility, setDeviceOrderVisibility] = useState(
    resolveDeviceOrderVisibility(normalizedInitialConfigs),
  );
  const [deviceDeliveryEnabled, setDeviceDeliveryEnabled] = useState(
    isPosDeliveryEnabled(normalizedInitialConfigs),
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
  const hasLoadedCurrentConfigRef = useRef(false);
  const hasLoadedCompanyConfigsRef = useRef(false);
  const hasLoadedMovementDataRef = useRef(false);
  const hasInitializedPdvTabRef = useRef(false);

  // Edição inline do alias
  const [alias,        setAlias]        = useState(initialAlias || '');
  const [editingAlias, setEditingAlias] = useState(false);
  const [aliasInput,   setAliasInput]   = useState(alias);
  const [savingAlias,  setSavingAlias]  = useState(false);
  const aliasInputRef = useRef(null);

  useEffect(() => {
    if (editingAlias) {
      return;
    }

    setAlias(initialAlias || '');
    setAliasInput(initialAlias || '');
  }, [editingAlias, initialAlias]);

  useEffect(() => {
    hasLoadedCurrentConfigRef.current = hasLoadedCurrentConfig;
  }, [hasLoadedCurrentConfig]);

  useEffect(() => {
    hasLoadedCompanyConfigsRef.current = hasLoadedCompanyConfigs;
  }, [hasLoadedCompanyConfigs]);

  useEffect(() => {
    hasLoadedMovementDataRef.current = hasLoadedMovementData;
  }, [hasLoadedMovementData]);

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
  const packageVersion = packageJson?.version || packageJson?.default?.version;
  const appVersion = packageVersion || runtimeDevice?.appVersion || '';
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

  const resolveDeviceContext = useCallback(async () => {
    if (deviceString && deviceType) {
      return {
        deviceData: null,
        deviceString,
        deviceType,
      };
    }

    if (!deviceId) {
      return {
        deviceData: null,
        deviceString: '',
        deviceType: '',
      };
    }

    const fetchedDevice = await actionsRef.current.deviceActions
      .get(deviceId)
      .catch(() => null);

    return {
      deviceData: fetchedDevice,
      deviceString: String(fetchedDevice?.device || '').trim(),
      deviceType: String(fetchedDevice?.type || fetchedDevice?.deviceType || '')
        .trim()
        .toUpperCase(),
    };
  }, [deviceId, deviceString, deviceType]);

  const applyCurrentDeviceConfig = useCallback((scopedItems, context = {}) => {
    const currentDeviceString = String(
      context.deviceString || deviceString || '',
    ).trim();
    const currentDeviceType = String(
      context.deviceType || deviceType || '',
    )
      .trim()
      .toUpperCase();
    const currentDeviceConfigId = normalizeEntityId(
      context.deviceId || deviceId,
    );
    const dc = (scopedItems || []).find(d => {
      const currentConfigType = String(d?.type || d?.device?.type || '')
        .trim()
        .toUpperCase();
      const nextDeviceId = normalizeEntityId(
        d?.device?.id ||
          d?.device?.['@id'] ||
          d?.deviceId ||
          d?.device?.deviceId,
      );

      if (currentDeviceConfigId && nextDeviceId === currentDeviceConfigId) {
        return true;
      }

      return (
        d?.device?.device === currentDeviceString &&
        currentConfigType === currentDeviceType
      );
    });

    if (dc) {
      const nextConfigs = parseConfigsObject(dc.configs);
      actionsRef.current.deviceConfigActions.setItem({
        ...dc,
        configs: nextConfigs,
      });
      setConfigs(nextConfigs);
      setDevicePaymentTarget(
        normalizeDeviceId(nextConfigs[ORDER_PAYMENT_DEVICE_CONFIG_KEY]),
      );
      setPdvGateway(getPaymentGatewayFromConfigs(nextConfigs));
      setPdvPrinterEnabled(isPdvPrinterEnabled(nextConfigs));
      setPosOperationMode(resolvePosOperationMode(nextConfigs));
      setProductShowcaseId(
        normalizeEntityId(nextConfigs[POS_PRODUCT_SHOWCASE_CONFIG_KEY]),
      );
      setAndroidKioskEnabled(isAndroidKioskEnabled(nextConfigs));
      setAndroidLauncherEnabled(isAndroidLauncherEnabled(nextConfigs));
      setCounterAutoPrintEnabled(isPosAutoPrintEnabled(nextConfigs));
      setCounterPrintMode(resolvePosPrintMode(nextConfigs));
      setCounterCashManagementMode(resolvePosCashManagementMode(nextConfigs));
      setCheckOrderType(
        resolvePosCheckOrderTypeForShop(nextConfigs, runtimeCompanyConfigs),
      );
      setCheckOrderManagementMode(
        resolvePosCheckOrderManagementMode(nextConfigs),
      );
      setDeviceOrderVisibility(
        resolveDeviceOrderVisibility(nextConfigs),
      );
      setDeviceDeliveryEnabled(
        isPosDeliveryEnabled(nextConfigs),
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

    actionsRef.current.deviceConfigActions.setItem({});

    setConfigs({});
    setDevicePaymentTarget('');
    setPdvGateway('');
    setPdvPrinterEnabled(true);
    setPosOperationMode(resolvePosOperationMode({}));
    setProductShowcaseId('');
    setAndroidKioskEnabled(false);
    setAndroidLauncherEnabled(false);
    setCounterAutoPrintEnabled(isPosAutoPrintEnabled({}));
    setCounterPrintMode(resolvePosPrintMode({}));
    setCounterCashManagementMode(resolvePosCashManagementMode({}));
    setCheckOrderType(
      resolvePosCheckOrderTypeForShop({}, runtimeCompanyConfigs),
    );
    setCheckOrderManagementMode(resolvePosCheckOrderManagementMode({}));
    setDeviceOrderVisibility(DEVICE_ORDER_VISIBILITY_DEVICE);
    setDeviceDeliveryEnabled(isPosDeliveryEnabled({}));
    setDeviceAlertSoundEnabled(false);
    setDeviceAlertSoundUrl('');
    setDeviceRuntimeDebugInfoEnabled(false);
    setLinkedDisplayId('');
    setDisplayPrinterId('');
    setDisplayAllowPrinterChange(false);
    setDisplayAutoPrintProductEnabled(false);
  }, [deviceId, deviceString, deviceType]);

  const loadMovementData = useCallback(async () => {
    if (!isPdvDevice) {
      setProducts([]);
      setInflowData(null);
      setHasLoadedMovementData(false);
      return;
    }

    if (!currentCompany?.id) return;
    const resolvedContext = await resolveDeviceContext();
    const nextDeviceString = resolvedContext?.deviceString || deviceString;
    if (!nextDeviceString) return;
    setLoadingMovementData(true);
    try {
      const [cashData, inflowRaw] = await Promise.all([
        actionsRef.current.invoiceActions.getCashRegister({
          device:   nextDeviceString,
          provider: currentCompany.id,
        }),
        actionsRef.current.invoiceActions.getInflow({
          'device.device': nextDeviceString,
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
  }, [currentCompany?.id, deviceString, isPdvDevice, resolveDeviceContext]);

  const refreshCurrentConfig = useCallback(async () => {
    if (!currentCompany?.id) return;
    setLoadingConfigData(true);
    try {
      const resolvedContext = await resolveDeviceContext();
      const nextDeviceString = resolvedContext?.deviceString || deviceString;
      const nextDeviceType = resolvedContext?.deviceType || deviceType;
      if (!nextDeviceString || !nextDeviceType) {
        applyCurrentDeviceConfig([], {
          deviceId,
          deviceString: nextDeviceString,
          deviceType: nextDeviceType,
        });
        return;
      }

      const items = await actionsRef.current.deviceConfigActions.getItems({
        'device.device': nextDeviceString,
        people: `/people/${currentCompany.id}`,
        type: nextDeviceType,
      });
      const scopedItems = filterDeviceConfigsByCompany(items, currentCompany?.id);
      const selectedDeviceConfig = scopedItems.find(d => {
        const currentConfigType = String(d?.type || d?.device?.type || '')
          .trim()
          .toUpperCase();
        const nextDeviceId = normalizeEntityId(
          d?.device?.id ||
            d?.device?.['@id'] ||
            d?.deviceId ||
            d?.device?.deviceId,
        );

        return (
          (deviceId && nextDeviceId === deviceId) ||
          (d?.device?.device === nextDeviceString &&
            currentConfigType === nextDeviceType)
        );
      });

      if (selectedDeviceConfig) {
        actionsRef.current.deviceConfigActions.setItem({
          ...selectedDeviceConfig,
          configs: parseConfigsObject(selectedDeviceConfig.configs),
        });
      }

      applyCurrentDeviceConfig(
        selectedDeviceConfig ? [selectedDeviceConfig] : scopedItems,
        {
          deviceId,
          deviceString: nextDeviceString,
          deviceType: nextDeviceType,
        },
      );
    } catch {
      applyCurrentDeviceConfig([], {deviceId});
    } finally {
      setLoadingConfigData(false);
      setHasLoadedCurrentConfig(true);
    }
  }, [
    applyCurrentDeviceConfig,
    currentCompany?.id,
    deviceString,
    deviceType,
    deviceId,
    resolveDeviceContext,
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

  const loadProductShowcases = useCallback(async () => {
    if (!currentCompany?.id || !isPdvDevice) {
      setProductShowcases([]);
      return;
    }

    setLoadingProductShowcases(true);
    try {
      const response = await api.fetch('/product_showcases', {
        params: {
          company: `/people/${currentCompany.id}`,
          integrationKey: 'pos',
          active: 1,
          'order[name]': 'ASC',
        },
      });
      const items =
        response?.member ||
        response?.['hydra:member'] ||
        response?.items ||
        response;
      setProductShowcases(Array.isArray(items) ? items : []);
    } catch {
      setProductShowcases([]);
    } finally {
      setLoadingProductShowcases(false);
    }
  }, [currentCompany?.id, isPdvDevice]);

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
      if (!force && hasLoadedMovementDataRef.current) {
        return;
      }
      await loadMovementData();
      return;
    }

    if (activePdvTab === PDV_TAB_ORDERS) {
      const pendingLoads = [];
      if (force || !hasLoadedCurrentConfigRef.current) {
        pendingLoads.push(refreshCurrentConfig());
      }
      if (force || !hasLoadedCompanyConfigsRef.current) {
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

    if (activePdvTab === PDV_TAB_OPERATION) {
      await loadProductShowcases();
    }
  }, [
    activePdvTab,
    currentCompany?.id,
    isPdvDevice,
    loadCompanyConfigs,
    loadMovementData,
    loadProductShowcases,
    refreshCurrentConfig,
  ]);

  useEffect(() => {
    setHasLoadedCurrentConfig(false);
    setHasLoadedCompanyConfigs(false);
    setHasLoadedMovementData(false);
    hasInitializedPdvTabRef.current = false;
    setProducts([]);
    setInflowData(null);
    setCompanyDeviceConfigs([]);
  }, [currentCompany?.id, deviceString, deviceType]);

  const ensureActiveTabDataRef = useRef(ensureActiveTabData);
  useEffect(() => {
    ensureActiveTabDataRef.current = ensureActiveTabData;
  }, [ensureActiveTabData]);

  useFocusEffect(
    useCallback(() => {
      ensureActiveTabDataRef.current({ force: true });
    }, []),
  );

  useEffect(() => {
    if (!isPdvDevice) {
      return;
    }

    if (!hasInitializedPdvTabRef.current) {
      hasInitializedPdvTabRef.current = true;
      return;
    }

    ensureActiveTabDataRef.current();
  }, [activePdvTab, isPdvDevice]);

  useFocusEffect(
    useCallback(() => {
      if (!isDisplayDevice || !currentCompany?.id) {
        return;
      }

      displayStore.actions
        .getItems({
          company: currentCompany.id,
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
      } catch (error) {
        showSystemError(
          error,
          'Nao foi possivel atualizar o caixa deste device.',
        );
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
    showSystemError,
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
      setEditingAlias(false);
    } catch (error) {
      showSystemError(error, 'Nao foi possivel salvar o nome do device.');
      cancelEditAlias();
    } finally {
      setSavingAlias(false);
    }
  }, [aliasInput, alias, deviceId, cancelEditAlias, showSystemError]);

  const saveDevicePaymentTarget = useCallback(async (override = {}) => {
    const nextDevicePaymentTarget =
      override.devicePaymentTarget ?? devicePaymentTarget;

    if (!currentCompany?.id || !deviceString) {
      return;
    }

    setSavingPaymentTarget(true);
    try {
      await actionsRef.current.deviceConfigActions.addDeviceConfigs({
        device: deviceString,
        configs: JSON.stringify({
          [ORDER_PAYMENT_DEVICE_CONFIG_KEY]: nextDevicePaymentTarget || '',
        }),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshCurrentConfig();
    } catch (error) {
      showSystemError(
        error,
        'Nao foi possivel salvar o device de pagamento.',
      );
    } finally {
      setSavingPaymentTarget(false);
    }
  }, [currentCompany?.id, devicePaymentTarget, deviceString, deviceType, refreshCurrentConfig, showSystemError]);

  const savePdvSettings = useCallback(async (override = {}) => {
    const nextPdvGateway = override.pdvGateway ?? pdvGateway;
    const nextPdvPrinterEnabled =
      override.pdvPrinterEnabled ?? pdvPrinterEnabled;

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
          [POS_GATEWAY_CONFIG_KEY]: nextPdvGateway || '',
          [PDV_PRINTER_ENABLED_CONFIG_KEY]: nextPdvPrinterEnabled ? '1' : '0',
        }),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshCurrentConfig();
    } catch (error) {
      showSystemError(
        error,
        'Nao foi possivel salvar as configuracoes de pagamento do PDV.',
      );
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
    showSystemError,
  ]);

  const saveProductShowcaseConfig = useCallback(async (override = {}) => {
    const nextProductShowcaseId =
      override.productShowcaseId ?? productShowcaseId;

    if (!currentCompany?.id || !deviceString || savingProductShowcase) {
      return;
    }

    setSavingProductShowcase(true);
    try {
      await actionsRef.current.deviceConfigActions.addDeviceConfigs({
        device: deviceString,
        configs: JSON.stringify({
          [POS_PRODUCT_SHOWCASE_CONFIG_KEY]: nextProductShowcaseId || '',
        }),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshCurrentConfig();
    } catch (error) {
      showSystemError(
        error,
        'Nao foi possivel salvar a vitrine deste PDV.',
      );
    } finally {
      setSavingProductShowcase(false);
    }
  }, [
    currentCompany?.id,
    deviceString,
    deviceType,
    productShowcaseId,
    refreshCurrentConfig,
    savingProductShowcase,
    showSystemError,
  ]);

  const savePaymentTypeConfigs = useCallback(
    async nextSelectedPaymentTypeIds => {
      if (
        !currentCompany?.id ||
        !deviceString ||
        savingPaymentTypes
      ) {
        return;
      }

      setSavingPaymentTypes(true);
      try {
        const nextConfigs = appendScreenMetrics({
          ...(configs || {}),
          [PAYMENT_TYPE_IDS_CONFIG_KEY]: nextSelectedPaymentTypeIds,
          'config-version': appVersion,
        });

        await actionsRef.current.deviceConfigActions.addDeviceConfigs({
          device: deviceString,
          configs: JSON.stringify(nextConfigs),
          people: '/people/' + currentCompany.id,
          type: deviceType,
        });

        actionsRef.current.deviceConfigActions.setItem({
          ...(currentDeviceConfig || {}),
          configs: nextConfigs,
          device:
            currentDeviceConfig?.device ||
            currentDevice ||
            {device: deviceString, type: deviceType},
          people:
            currentDeviceConfig?.people ||
            `/people/${currentCompany.id}`,
          type:
            currentDeviceConfig?.type ||
            deviceType,
        });
        setConfigs(nextConfigs);
      } catch (error) {
        showSystemError(
          error,
          'Nao foi possivel salvar os tipos de pagamento do device.',
        );
      } finally {
        setSavingPaymentTypes(false);
      }
    },
    [
      currentCompany?.id,
      appVersion,
      configs,
      currentDevice,
      currentDeviceConfig,
      deviceString,
      deviceType,
      savingPaymentTypes,
      showSystemError,
    ],
  );

  const savePosOperationMode = useCallback(async (override = {}) => {
    const nextPosOperationMode =
      override.posOperationMode ?? posOperationMode;
    const nextAndroidKioskEnabled =
      override.androidKioskEnabled ?? androidKioskEnabled;
    const nextCheckOrderType =
      override.checkOrderType ?? checkOrderType;
    const nextCheckOrderManagementMode =
      override.checkOrderManagementMode ?? checkOrderManagementMode;
    const nextCounterAutoPrintEnabled =
      override.counterAutoPrintEnabled ?? counterAutoPrintEnabled;
    const nextCounterPrintMode =
      override.counterPrintMode ?? counterPrintMode;
    const nextCounterCashManagementMode =
      override.counterCashManagementMode ?? counterCashManagementMode;

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
        [POS_OPERATION_MODE_CONFIG_KEY]: nextPosOperationMode,
        [DEVICE_ANDROID_KIOSK_ENABLED_CONFIG_KEY]: nextAndroidKioskEnabled
          ? '1'
          : '0',
        [POS_CHECK_ORDER_TYPE_CONFIG_KEY]: nextCheckOrderType,
        [POS_CHECK_ORDER_MANAGEMENT_MODE_CONFIG_KEY]:
          nextCheckOrderType === POS_CHECK_ORDER_TYPE_NONE
            ? POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE
            : nextCheckOrderManagementMode,
      };

      if (nextPosOperationMode === POS_OPERATION_MODE_COUNTER) {
        nextOperationConfigs[POS_AUTO_PRINT_ENABLED_CONFIG_KEY] =
          nextCounterAutoPrintEnabled ? '1' : '0';
        nextOperationConfigs['print-mode'] = nextCounterPrintMode;
        nextOperationConfigs[POS_CASH_MANAGEMENT_MODE_CONFIG_KEY] =
          nextCounterCashManagementMode;
      }

      await actionsRef.current.deviceConfigActions.addDeviceConfigs({
        device: deviceString,
        configs: JSON.stringify(nextOperationConfigs),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshCurrentConfig();
    } catch (error) {
      showSystemError(
        error,
        'Nao foi possivel salvar a operacao do PDV.',
      );
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
    androidKioskEnabled,
    isPdvDevice,
    posOperationMode,
    refreshCurrentConfig,
    savingPosOperationMode,
    showSystemError,
  ]);

  useEffect(() => {
    if (!isPdvDevice || !currentCompany?.id || !deviceString) {
      return;
    }

    const rawCheckOrderType = resolvePosCheckOrderType(configs);
    const nextCheckOrderType = resolvePosCheckOrderTypeForShop(
      configs,
      runtimeCompanyConfigs,
    );

    if (
      rawCheckOrderType !== POS_CHECK_ORDER_TYPE_STAMP ||
      nextCheckOrderType !== POS_CHECK_ORDER_TYPE_NONE ||
      savingPosOperationMode
    ) {
      stampAutoDisableSignatureRef.current = '';
      return;
    }

    const signature = [
      currentCompany?.id,
      deviceString,
      rawCheckOrderType,
      loyaltyCouponsEnabled ? '1' : '0',
      String(configs?.['config-version'] || ''),
    ].join(':');

    if (stampAutoDisableSignatureRef.current === signature) {
      return;
    }

    stampAutoDisableSignatureRef.current = signature;

    setCheckOrderType(POS_CHECK_ORDER_TYPE_NONE);
    setCheckOrderManagementMode(POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE);
    savePosOperationMode({
      checkOrderType: POS_CHECK_ORDER_TYPE_NONE,
      checkOrderManagementMode: POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE,
    });
  }, [
    configs,
    currentCompany?.id,
    deviceString,
    isPdvDevice,
    loyaltyCouponsEnabled,
    savePosOperationMode,
    savingPosOperationMode,
    runtimeCompanyConfigs,
  ]);

  const saveLauncherMode = useCallback(async (override = {}) => {
    const nextAndroidLauncherEnabled =
      override.androidLauncherEnabled ?? androidLauncherEnabled;

    if (
      !isPdvDevice ||
      !currentCompany?.id ||
      !deviceString ||
      savingLauncherMode
    ) {
      return;
    }

    setSavingLauncherMode(true);
    try {
      await actionsRef.current.deviceConfigActions.addDeviceConfigs({
        device: deviceString,
        configs: JSON.stringify({
          [DEVICE_ANDROID_LAUNCHER_ENABLED_CONFIG_KEY]: nextAndroidLauncherEnabled
            ? '1'
            : '0',
          'config-version': appVersion,
        }),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshCurrentConfig();
    } catch (error) {
      showSystemError(
        error,
        'Nao foi possivel salvar o launcher do device.',
      );
    } finally {
      setSavingLauncherMode(false);
    }
  }, [
    androidLauncherEnabled,
    appVersion,
    currentCompany?.id,
    deviceString,
    deviceType,
    isPdvDevice,
    refreshCurrentConfig,
    savingLauncherMode,
    showSystemError,
  ]);

  const saveDeviceAlertSoundConfig = useCallback(async (override = {}) => {
    const nextDeviceAlertSoundEnabled =
      override.deviceAlertSoundEnabled ?? deviceAlertSoundEnabled;
    const nextDeviceAlertSoundUrl =
      override.deviceAlertSoundUrl ?? deviceAlertSoundUrl;

    if (!currentCompany?.id || !deviceString || savingAlertSound) {
      return;
    }

    setSavingAlertSound(true);
    try {
      await actionsRef.current.deviceConfigActions.addDeviceConfigs({
        device: deviceString,
        configs: JSON.stringify({
          [DEVICE_ALERT_SOUND_ENABLED_KEY]: nextDeviceAlertSoundEnabled ? '1' : '0',
          [DEVICE_ALERT_SOUND_URL_KEY]: String(nextDeviceAlertSoundUrl || '').trim(),
        }),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshCurrentConfig();
    } catch (error) {
      showSystemError(
        error,
        'Nao foi possivel salvar o som de alerta do device.',
      );
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
    showSystemError,
  ]);

  const saveDeviceOrderVisibility = useCallback(async (override = {}) => {
    const nextDeviceOrderVisibility =
      override.deviceOrderVisibility ?? deviceOrderVisibility;

    if (!currentCompany?.id || !deviceString || savingOrderVisibility) {
      return;
    }

    setSavingOrderVisibility(true);
    try {
      await actionsRef.current.deviceConfigActions.addDeviceConfigs({
        device: deviceString,
        configs: JSON.stringify({
          [DEVICE_ORDER_VISIBILITY_KEY]: nextDeviceOrderVisibility || DEVICE_ORDER_VISIBILITY_DEVICE,
        }),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshCurrentConfig();
    } catch (error) {
      showSystemError(
        error,
        'Nao foi possivel salvar a visibilidade dos pedidos.',
      );
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
    showSystemError,
  ]);

  const saveDeviceDeliverySettings = useCallback(async (override = {}) => {
    const nextDeviceDeliveryEnabled =
      override.deviceDeliveryEnabled ?? deviceDeliveryEnabled;

    if (
      !currentCompany?.id ||
      !deviceString ||
      savingDeviceDeliverySettings
    ) {
      return;
    }

    setSavingDeviceDeliverySettings(true);
    try {
      await actionsRef.current.deviceConfigActions.addDeviceConfigs({
        device: deviceString,
        configs: JSON.stringify({
          [POS_DELIVERY_ENABLED_CONFIG_KEY]: nextDeviceDeliveryEnabled ? '1' : '0',
        }),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshCurrentConfig();
    } catch (error) {
      showSystemError(
        error,
        'Nao foi possivel salvar a configuracao de entregas.',
      );
    } finally {
      setSavingDeviceDeliverySettings(false);
    }
  }, [
    currentCompany?.id,
    deviceDeliveryEnabled,
    deviceString,
    deviceType,
    refreshCurrentConfig,
    savingDeviceDeliverySettings,
    showSystemError,
  ]);

  const saveDeviceRuntimeDebugInfo = useCallback(async (override = {}) => {
    const nextDeviceRuntimeDebugInfoEnabled =
      override.deviceRuntimeDebugInfoEnabled ?? deviceRuntimeDebugInfoEnabled;

    if (!currentCompany?.id || !deviceString || savingRuntimeDebugInfo) {
      return;
    }

    setSavingRuntimeDebugInfo(true);
    try {
      await actionsRef.current.deviceConfigActions.addDeviceConfigs({
        device: deviceString,
        configs: JSON.stringify({
          [DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY]:
            nextDeviceRuntimeDebugInfoEnabled ? '1' : '0',
        }),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshCurrentConfig();
    } catch (error) {
      showSystemError(
        error,
        'Nao foi possivel salvar a exibicao das informacoes tecnicas.',
      );
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
    showSystemError,
  ]);

  const saveDisplayPrintingConfig = useCallback(async (override = {}) => {
    const nextLinkedDisplayId = override.linkedDisplayId ?? linkedDisplayId;
    const nextDisplayPrinterId = override.displayPrinterId ?? displayPrinterId;
    const nextDisplayAllowPrinterChange =
      override.displayAllowPrinterChange ?? displayAllowPrinterChange;
    const nextDisplayAutoPrintProductEnabled =
      override.displayAutoPrintProductEnabled ?? displayAutoPrintProductEnabled;

    if (
      !isDisplayDevice ||
      !currentCompany?.id ||
      !deviceString ||
      savingDisplayPrintingConfig
    ) {
      return;
    }

    const normalizedDisplayId = String(nextLinkedDisplayId || '').trim();
    const normalizedPrinterId = normalizeDeviceId(nextDisplayPrinterId);

    if (
      nextDisplayAutoPrintProductEnabled &&
      (!normalizedDisplayId || !normalizedPrinterId)
    ) {
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
            nextDisplayAllowPrinterChange ? '1' : '0',
          [DISPLAY_AUTO_PRINT_PRODUCT_CONFIG_KEY]:
            nextDisplayAutoPrintProductEnabled ? '1' : '0',
        }),
        people: '/people/' + currentCompany.id,
        type: deviceType,
      });
      await refreshCurrentConfig();
    } catch (error) {
      showSystemError(
        error,
        'Nao foi possivel salvar a configuracao de impressao.',
      );
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
    showSystemError,
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
      } catch (error) {
        showSystemError(
          error,
          'Nao foi possivel enviar o comando para limpar o cache de produtos.',
        );
      } finally {
        setSendingCatalogRefresh(false);
      }
    });
  }, [currentCompany?.id, deviceString, sendingCatalogRefresh, showSystemError, websocketActions]);

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
  const showPdvPaymentTypesTab =
    isPdvDevice && activePdvTab === PDV_TAB_PAYMENT_TYPES;
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

  const renderHelpButton = (title, message) => (
    <DefaultTooltip
      accentColor={themeColors.buttonIcon}
      title={title}
      message={message}
      style={{
        backgroundColor: themeColors.buttonBackground,
        borderColor: themeColors.buttonBackground,
        borderRadius: 8,
        height: 34,
        width: 34,
      }}
      textStyle={{
        color: themeColors.buttonIcon,
        fontSize: 16,
        lineHeight: 16,
      }}
    />
  );

  const renderSwitchRow = ({
    disabled = false,
    label,
    onValueChange,
    value,
    valueLabel,
  }) => {
    const checked = Boolean(value);

    return (
      <View
        style={[
          styles.toggleRow,
          {
            backgroundColor: themeColors.listItemBackground,
            borderColor: themeColors.listItemBorder,
          },
          disabled && styles.toggleRowDisabled,
        ]}>
        <View style={styles.toggleRowCopy}>
          <Text
            style={[
              styles.toggleRowLabel,
              {color: themeColors.listItemText},
            ]}>
            {label}
          </Text>
          <Text
            style={[
              styles.toggleRowValue,
              {color: themeColors.listItemSubtitleText},
            ]}>
            {valueLabel}
          </Text>
        </View>
        <Switch
          value={checked}
          disabled={disabled}
          onValueChange={onValueChange}
          {...getDeviceSwitchProps({
            disabled,
            palette: themeColors,
            value: checked,
          })}
        />
      </View>
    );
  };

  const renderOptionButtons = ({ options, value, onChange, disabled = false, optionColors = null }) => (
    <View style={styles.optionRow}>
      {options.map(option => {
        const selected = String(option.value) === String(value);
        const optionDisabled = disabled || option.disabled === true;
        const optionTitle = String(option.title || '').trim();
        if (optionDisabled && optionTitle) {
          return (
            <OptionButtonChip
              key={String(option.value)}
              label={option.label}
              selected={selected}
              disabled
              colors={optionColors}
              tooltip={optionTitle}
              onPress={() => onChange(option.value)}
            />
          );
        }

        return (
          <OptionButtonChip
            key={String(option.value)}
            label={option.label}
            selected={selected}
            disabled={optionDisabled}
            colors={optionColors}
            tooltip={optionTitle}
            onPress={() => onChange(option.value)}
          />
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: brandColors.background }]}>
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
                    style={[
                      styles.editAliasBtn,
                      {
                        backgroundColor: themeColors.buttonBackground,
                        borderColor: themeColors.buttonBackground,
                      },
                    ]}
                    onPress={editingAlias ? saveAlias : startEditAlias}
                    activeOpacity={0.8}
                    disabled={savingAlias}
                  >
                    <Icon
                      name={savingAlias ? 'save' : editingAlias ? 'check' : 'edit-2'}
                      size={16}
                      color={themeColors.buttonIcon}
                    />
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
          <StateStore
            compact
            loading="Carregando dados do device..."
          />
        )}

        {isPdvDevice && (
          <View style={styles.tabsBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsContent}>
              {PDV_DETAIL_TABS.map(tab => {
                const active = activePdvTab === tab.key;
                const tabButtonColors = active
                  ? {
                      backgroundColor: themeColors.buttonBackground,
                      borderColor: themeColors.buttonBorder,
                      iconColor: themeColors.buttonIcon,
                      textColor: themeColors.buttonText,
                    }
                  : {
                      backgroundColor: themeColors.buttonBackgroundSecondary,
                      borderColor: themeColors.buttonBorderSecondary,
                      iconColor: themeColors.buttonIconSecondary,
                      textColor: themeColors.buttonTextSecondary,
                    };

                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[
                      styles.tabButton,
                      {
                        backgroundColor: tabButtonColors.backgroundColor,
                        borderColor: tabButtonColors.borderColor,
                      },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => setActivePdvTab(tab.key)}>
                    <Icon
                      name={tab.icon}
                      size={14}
                      color={tabButtonColors.iconColor}
                    />
                    <Text
                      style={[
                        styles.tabButtonText,
                        {color: tabButtonColors.textColor},
                      ]}>
                      {tt('tab', tab.labelKey) ||
                        (tab.key === PDV_TAB_PAYMENT_TYPES
                          ? 'Pagamentos'
                          : tab.labelKey)}
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
              <Icon name="credit-card" size={13} /> {'  '}Configuração do PDV
            </Text>

            <View style={styles.configCard}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.configTitle}>
                  {tt('title', 'posOperationMode')}
                </Text>
                {renderHelpButton(
                  tt('title', 'posOperationMode') || 'Modo de operacao',
                  tt('description', 'posOperationModeDescription') ||
                    'Escolha o modo, a trava kiosk e a politica de ordem/caixa deste device.',
                )}
              </View>

              {renderOptionButtons({
                options: POS_OPERATION_MODE_OPTIONS.map(option => ({
                  label: tt('option', option.translationKey),
                  value: option.value,
                })),
                value: posOperationMode,
                optionColors: {
                  buttonBackground: themeColors.buttonBackground,
                  buttonBorder: themeColors.buttonBorder,
                  buttonText: themeColors.buttonText,
                  buttonBackgroundSecondary: themeColors.buttonBackgroundSecondary,
                  buttonBorderSecondary: themeColors.buttonBorderSecondary,
                  buttonTextSecondary: themeColors.buttonTextSecondary,
                },
                onChange: value => {
                  const nextValue = resolvePosOperationMode({
                    [POS_OPERATION_MODE_CONFIG_KEY]: value,
                  });
                  setPosOperationMode(nextValue);
                  savePosOperationMode({posOperationMode: nextValue});
                },
              })}

              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={productShowcaseId || ''}
                  mode={pickerMode}
                  enabled={!loadingProductShowcases && !savingProductShowcase}
                  style={styles.picker}
                  dropdownIconColor="#64748B"
                  onValueChange={value => {
                    const nextValue = normalizeEntityId(value);
                    setProductShowcaseId(nextValue);
                    saveProductShowcaseConfig({productShowcaseId: nextValue});
                  }}>
                  <Picker.Item
                    label={
                      loadingProductShowcases
                        ? 'Carregando vitrines...'
                        : 'Sem vitrine vinculada'
                    }
                    value=""
                  />
                  {productShowcases.map(showcase => {
                    const showcaseId = normalizeEntityId(showcase);
                    return (
                      <Picker.Item
                        key={`pos-showcase-${showcaseId}`}
                        label={getProductShowcaseLabel(showcase)}
                        value={showcaseId}
                      />
                    );
                  })}
                </Picker>
              </View>

              {renderSwitchRow({
                disabled: savingPosOperationMode,
                label: 'Modo Kiosk',
                value: androidKioskEnabled,
                valueLabel: androidKioskEnabled ? 'Ativo' : 'Inativo',
                onValueChange: nextValue => {
                  setAndroidKioskEnabled(nextValue);
                  savePosOperationMode({androidKioskEnabled: nextValue});
                },
              })}

              {renderOptionButtons({
                options: [
                  {
                    label: global.t?.t('configs', 'option', 'none') || 'None',
                    value: POS_CHECK_ORDER_TYPE_NONE,
                  },
                  {
                    label: global.t?.t('orders', 'title', 'tab') || 'Tab',
                    value: POS_CHECK_ORDER_TYPE_TAB,
                  },
                  {
                    label: global.t?.t('orders', 'title', 'table') || 'Table',
                    value: POS_CHECK_ORDER_TYPE_TABLE,
                  },
                  {
                    label: global.t?.t('orders', 'title', 'stamp') || 'Stamp',
                    value: POS_CHECK_ORDER_TYPE_STAMP,
                    disabled: !loyaltyCouponsEnabled,
                    title: !loyaltyCouponsEnabled
                      ? 'Ative em Shop -> Cupom fidelidade\npara liberar Stamp'
                      : '',
                  },
                ],
                value: checkOrderType,
                optionColors: {
                  buttonBackground: themeColors.buttonBackground,
                  buttonBorder: themeColors.buttonBorder,
                  buttonText: themeColors.buttonText,
                  buttonBackgroundSecondary: themeColors.buttonBackgroundSecondary,
                  buttonBorderSecondary: themeColors.buttonBorderSecondary,
                  buttonTextSecondary: themeColors.buttonTextSecondary,
                },
                onChange: value => {
                  const nextCheckOrderType =
                    value === POS_CHECK_ORDER_TYPE_TAB
                      ? POS_CHECK_ORDER_TYPE_TAB
                      : value === POS_CHECK_ORDER_TYPE_TABLE
                        ? POS_CHECK_ORDER_TYPE_TABLE
                        : value === POS_CHECK_ORDER_TYPE_STAMP
                          ? loyaltyCouponsEnabled
                            ? POS_CHECK_ORDER_TYPE_STAMP
                            : POS_CHECK_ORDER_TYPE_NONE
                        : POS_CHECK_ORDER_TYPE_NONE;
                  const nextCheckOrderManagementMode =
                    nextCheckOrderType === POS_CHECK_ORDER_TYPE_NONE
                      ? POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE
                      : checkOrderManagementMode;
                  setCheckOrderType(nextCheckOrderType);
                  if (nextCheckOrderType === POS_CHECK_ORDER_TYPE_NONE) {
                    setCheckOrderManagementMode(
                      POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE,
                    );
                  }
                  savePosOperationMode({
                    checkOrderType: nextCheckOrderType,
                    checkOrderManagementMode: nextCheckOrderManagementMode,
                  });
                },
              })}

              {checkOrderType !== POS_CHECK_ORDER_TYPE_NONE &&
                renderOptionButtons({
                  options: [
                    {
                      label:
                        global.t?.t(
                          'configs',
                          'option',
                          'manageLinkedOrders',
                        ) || 'Open and close tabs/tables/stamps',
                      value: POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE,
                    },
                    {
                      label:
                        global.t?.t(
                          'configs',
                          'option',
                          'existingLinkedOrdersOnly',
                        ) || 'Use open tabs/tables/stamps only',
                      value: POS_CHECK_ORDER_MANAGEMENT_MODE_EXISTING_ONLY,
                    },
                  ],
                  value: checkOrderManagementMode,
                  onChange: value => {
                    const nextValue =
                      value === POS_CHECK_ORDER_MANAGEMENT_MODE_EXISTING_ONLY
                        ? POS_CHECK_ORDER_MANAGEMENT_MODE_EXISTING_ONLY
                        : POS_CHECK_ORDER_MANAGEMENT_MODE_MANAGE;
                    setCheckOrderManagementMode(nextValue);
                    savePosOperationMode({checkOrderManagementMode: nextValue});
                  },
                })}

              {posOperationMode === POS_OPERATION_MODE_COUNTER && (
                <>
                  {renderSwitchRow({
                    disabled: savingPosOperationMode,
                    label: 'Impressao automatica',
                    value: counterAutoPrintEnabled,
                    valueLabel: counterAutoPrintEnabled ? 'Sim' : 'Nao',
                    onValueChange: nextValue => {
                      setCounterAutoPrintEnabled(nextValue);
                      savePosOperationMode({counterAutoPrintEnabled: nextValue});
                    },
                  })}

                  {counterAutoPrintEnabled &&
                    renderOptionButtons({
                      options: [
                        {label: 'Pedido', value: POS_PRINT_MODE_ORDER},
                        {label: 'Fichas', value: POS_PRINT_MODE_FORM},
                      ],
                      value: counterPrintMode,
                      optionColors: {
                        buttonBackground: themeColors.buttonBackground,
                        buttonBorder: themeColors.buttonBorder,
                        buttonText: themeColors.buttonText,
                        buttonBackgroundSecondary: themeColors.buttonBackgroundSecondary,
                        buttonBorderSecondary: themeColors.buttonBorderSecondary,
                        buttonTextSecondary: themeColors.buttonTextSecondary,
                      },
                      onChange: value => {
                        const nextValue =
                          value === POS_PRINT_MODE_FORM
                            ? POS_PRINT_MODE_FORM
                            : POS_PRINT_MODE_ORDER;
                        setCounterPrintMode(nextValue);
                        savePosOperationMode({counterPrintMode: nextValue});
                      },
                    })}

                  {renderOptionButtons({
                    options: [
                      {
                        label: 'Abertura e fechamento de caixa',
                        value: POS_CASH_MANAGEMENT_MODE_CASH_REGISTER,
                      },
                      {
                        label: 'Fechamento diario',
                        value: POS_CASH_MANAGEMENT_MODE_DAILY,
                      },
                    ],
                    value: counterCashManagementMode,
                    optionColors: {
                      buttonBackground: themeColors.buttonBackground,
                      buttonBorder: themeColors.buttonBorder,
                      buttonText: themeColors.buttonText,
                      buttonBackgroundSecondary: themeColors.buttonBackgroundSecondary,
                      buttonBorderSecondary: themeColors.buttonBorderSecondary,
                      buttonTextSecondary: themeColors.buttonTextSecondary,
                    },
                    onChange: value => {
                      const nextValue =
                        value === POS_CASH_MANAGEMENT_MODE_DAILY
                          ? POS_CASH_MANAGEMENT_MODE_DAILY
                          : POS_CASH_MANAGEMENT_MODE_CASH_REGISTER;
                      setCounterCashManagementMode(nextValue);
                      savePosOperationMode({counterCashManagementMode: nextValue});
                    },
                  })}
                </>
              )}
            </View>

            <View style={styles.configCard}>
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.configTitle, {color: brandColors.text}]}>
                  {tt('title', 'androidLauncherMode') || 'Launcher / home app'}
                </Text>
                {renderHelpButton(
                  tt('title', 'androidLauncherMode') || 'Launcher / home app',
                  tt('description', 'androidLauncherDescription') ||
                    'Quando ativado, o device volta para a app ao usar home ou apps recentes. O voltar continua seguindo a tela.',
                )}
              </View>

              {renderSwitchRow({
                disabled: savingLauncherMode,
                label: 'Modo launcher?',
                value: androidLauncherEnabled,
                valueLabel: androidLauncherEnabled ? 'Ativo' : 'Inativo',
                onValueChange: nextValue => {
                  setAndroidLauncherEnabled(nextValue);
                  saveLauncherMode({androidLauncherEnabled: nextValue});
                },
              })}
              <Text style={[styles.deviceString, {color: brandColors.textSecondary}]}>
                Salva automaticamente
              </Text>
            </View>

            <View style={styles.configCard}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.configTitle}>Gateway e impressora</Text>
                {renderHelpButton(
                  'Gateway e impressora',
                  'Escolha o gateway usado pelo PDV e se ele pode aparecer como destino de impressao.',
                )}
              </View>

              {renderOptionButtons({
                options: [
                  {label: 'Nenhum', value: ''},
                  {label: 'Infinite Pay', value: 'infinite-pay'},
                  {label: 'Cielo', value: 'cielo'},
                ],
                value: pdvGateway || '',
                optionColors: {
                  buttonBackground: themeColors.buttonBackground,
                  buttonBorder: themeColors.buttonBorder,
                  buttonText: themeColors.buttonText,
                  buttonBackgroundSecondary: themeColors.buttonBackgroundSecondary,
                  buttonBorderSecondary: themeColors.buttonBorderSecondary,
                  buttonTextSecondary: themeColors.buttonTextSecondary,
                },
                onChange: value => {
                  const nextValue = String(value || '');
                  setPdvGateway(nextValue);
                  savePdvSettings({pdvGateway: nextValue});
                },
              })}

              {renderSwitchRow({
                disabled: savingPdvSettings,
                label: 'Impressora',
                value: pdvPrinterEnabled,
                valueLabel: pdvPrinterEnabled ? 'Sim' : 'Nao',
                onValueChange: nextValue => {
                  setPdvPrinterEnabled(nextValue);
                  savePdvSettings({pdvPrinterEnabled: nextValue});
                },
              })}
              <Text style={styles.deviceString}>Salva automaticamente</Text>
            </View>
          </View>
        )}

        {shouldShowOrderVisibility && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Icon name="list" size={13} /> {'  '}Pedidos do Device
          </Text>

            <View style={styles.configCard}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.configTitle}>Escopo da listagem no PDV</Text>
                {renderHelpButton(
                  'Escopo da listagem',
                  'Define se este device mostra apenas os pedidos criados nele ou todos os pedidos da empresa.',
                )}
              </View>

              {renderOptionButtons({
                options: [
                  {
                    label: 'Somente deste device',
                    value: DEVICE_ORDER_VISIBILITY_DEVICE,
                  },
                  {
                    label: 'Todos da empresa',
                    value: DEVICE_ORDER_VISIBILITY_COMPANY,
                  },
                ],
                value: deviceOrderVisibility,
                optionColors: {
                  buttonBackground: themeColors.buttonBackground,
                  buttonBorder: themeColors.buttonBorder,
                  buttonText: themeColors.buttonText,
                  buttonBackgroundSecondary: themeColors.buttonBackgroundSecondary,
                  buttonBorderSecondary: themeColors.buttonBorderSecondary,
                  buttonTextSecondary: themeColors.buttonTextSecondary,
                },
                onChange: value => {
                  const nextValue =
                    value || DEVICE_ORDER_VISIBILITY_DEVICE;
                  setDeviceOrderVisibility(nextValue);
                  saveDeviceOrderVisibility({deviceOrderVisibility: nextValue});
                },
              })}
            </View>

            <View style={styles.configCard}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.configTitle}>
                  {tt('title', 'deliveryOnDevice') || 'Delivery neste equipamento'}
                </Text>
                {renderHelpButton(
                  tt('title', 'deliveryOnDevice') || 'Delivery neste equipamento',
                  tt('description', 'deliveryOnDeviceDescription') ||
                    'Ative quando este equipamento precisa operar pedidos com cliente, endereço e observações de entrega.',
                )}
              </View>

              {renderSwitchRow({
                disabled: savingDeviceDeliverySettings,
                label: tt('label', 'deliveryEnabled') ||
                  'Trabalhar com delivery',
                value: deviceDeliveryEnabled,
                valueLabel: deviceDeliveryEnabled ? 'Ativo' : 'Inativo',
                onValueChange: nextValue => {
                  setDeviceDeliveryEnabled(nextValue);
                  saveDeviceDeliverySettings({
                    deviceDeliveryEnabled: nextValue,
                  });
                },
              })}
            </View>
          </View>
        )}

        {isDisplayDevice && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Icon name="printer" size={13} /> {'  '}Impressão de Preparo
            </Text>

            <View style={styles.configCard}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.configTitle}>Display vinculado e impressora da fila</Text>
                {renderHelpButton(
                  'Display vinculado e impressora da fila',
                  'Este bloco é usado na impressão automática disparada pelo app DISPLAY. O device DISPLAY precisa apontar qual display representa e qual impressora deve receber a cópia separada por fila.',
                )}
              </View>

              {(isLoadingDisplays || isLoadingPrinters) ? (
                <StateStore
                  compact
                  loading="Carregando displays e impressoras..."
                />
              ) : (
                <>
                  <View style={styles.pickerWrap}>
                    <Picker
                      selectedValue={linkedDisplayId || ''}
                      mode={pickerMode}
                      style={styles.picker}
                      dropdownIconColor="#64748B"
                      onValueChange={value => {
                        const nextValue = String(value || '').trim();
                        setLinkedDisplayId(nextValue);
                        saveDisplayPrintingConfig({linkedDisplayId: nextValue});
                      }}>
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
                      style={styles.picker}
                      dropdownIconColor="#64748B"
                      onValueChange={value => {
                        const nextValue = normalizeDeviceId(value);
                        setDisplayPrinterId(nextValue);
                        saveDisplayPrintingConfig({
                          displayPrinterId: nextValue,
                        });
                      }}>
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

                  {renderSwitchRow({
                    disabled: savingDisplayPrintingConfig,
                    label: 'Pode trocar de impressora?',
                    value: displayAllowPrinterChange,
                    valueLabel: displayAllowPrinterChange ? 'Sim' : 'Nao',
                    onValueChange: nextValue => {
                      setDisplayAllowPrinterChange(nextValue);
                      saveDisplayPrintingConfig({
                        displayAllowPrinterChange: nextValue,
                      });
                    },
                  })}

                  {renderSwitchRow({
                    disabled: savingDisplayPrintingConfig,
                    label: 'Imprimir produtos automaticamente',
                    value: displayAutoPrintProductEnabled,
                    valueLabel: displayAutoPrintProductEnabled
                      ? 'Ativo'
                      : 'Inativo',
                    onValueChange: nextValue => {
                      setDisplayAutoPrintProductEnabled(nextValue);
                      saveDisplayPrintingConfig({
                        displayAutoPrintProductEnabled: nextValue,
                      });
                    },
                  })}
                </>
              )}
            </View>
          </View>
        )}

        {shouldShowDeviceBehavior && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Icon name="volume-2" size={13} /> {'  '}Aviso Sonoro
          </Text>

          <View style={styles.configCard}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.configTitle}>Alerta via websocket</Text>
              {renderHelpButton(
                'Alerta via websocket',
                'Quando habilitado, este device toca o audio configurado ao receber o evento order.created de um novo pedido em preparo.',
              )}
            </View>

            {renderSwitchRow({
              disabled: savingAlertSound,
              label: 'Aviso sonoro habilitado',
              value: deviceAlertSoundEnabled,
              valueLabel: deviceAlertSoundEnabled ? 'Ativo' : 'Inativo',
              onValueChange: nextValue => {
                setDeviceAlertSoundEnabled(nextValue);
                saveDeviceAlertSoundConfig({
                  deviceAlertSoundEnabled: nextValue,
                });
              },
            })}

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
          </View>
        </View>
        )}

        {shouldShowDeviceBehavior && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Icon name="activity" size={13} /> {'  '}Rodapé do Sistema
          </Text>

          <View style={styles.configCard}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.configTitle}>Debug do socket no rodapé</Text>
              {renderHelpButton(
                'Debug do socket no rodapé',
                'Quando habilitado, este device troca a bolinha discreta do socket pelos detalhes de debug publicados pelos serviços do runtime no rodapé global do sistema.',
              )}
            </View>

            {renderSwitchRow({
              disabled: savingRuntimeDebugInfo,
              label: 'Exibir debug detalhado',
              value: deviceRuntimeDebugInfoEnabled,
              valueLabel: deviceRuntimeDebugInfoEnabled ? 'Ativo' : 'Inativo',
              onValueChange: nextValue => {
                setDeviceRuntimeDebugInfoEnabled(nextValue);
                saveDeviceRuntimeDebugInfo({
                  deviceRuntimeDebugInfoEnabled: nextValue,
                });
              },
            })}
          </View>
        </View>
        )}

        {shouldShowRemotePayment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Icon name="credit-card" size={13} /> {'  '}Pagamento Remoto
            </Text>

            <View style={styles.configCard}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.configTitle}>Device preferencial para pagamento</Text>
                {renderHelpButton(
                  'Device preferencial para pagamento',
                  'Esse destino funciona como fallback desta origem quando a empresa não definiu uma ordem padrão no configurador geral. Quando a empresa tiver devices padrão para pagamento remoto, essa ordem global tem prioridade.',
                )}
              </View>

              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={devicePaymentTarget || ''}
                  mode={pickerMode}
                  style={styles.picker}
                  dropdownIconColor="#64748B"
                  onValueChange={value => {
                    const nextValue = value || '';
                    setDevicePaymentTarget(nextValue);
                    saveDevicePaymentTarget({
                      devicePaymentTarget: nextValue,
                    });
                  }}>
                  <Picker.Item
                    label="Usar devices padrão da empresa"
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
            </View>
          </View>
        )}

        {shouldShowRemoteCommands && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Icon name="refresh-cw" size={13} /> {'  '}Comandos Remotos
            </Text>

            <View style={styles.configCard}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.configTitle}>Catálogo do PDV</Text>
                {renderHelpButton(
                  'Catálogo do PDV',
                  'Limpa o cache local de produtos e categorias deste device. O recarregamento acontece no próximo uso do PDV.',
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.configButton,
                  {
                    backgroundColor: themeColors.buttonBackground,
                    borderColor: themeColors.buttonBackground,
                  },
                  sendingCatalogRefresh && {opacity: 0.6},
                ]}
                activeOpacity={0.85}
                disabled={sendingCatalogRefresh}
                onPress={sendCatalogRefreshCommand}>
                <Icon name="trash-2" size={16} color={themeColors.buttonIcon} />
                <Text
                  style={[
                    styles.configButtonText,
                    {color: themeColors.buttonText},
                  ]}>
                  {sendingCatalogRefresh ? 'Limpando cache...' : 'Limpar cache de produtos'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {showPdvPaymentTypesTab && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                <Icon name="credit-card" size={13} /> {'  '}Pagamentos do device
              </Text>
              {renderHelpButton(
                'Pagamentos do device',
                'Selecione os meios de pagamento que este device pode exibir e usar nas opções de pagamento. Os wallets entram só para organizar a lista.',
              )}
            </View>
            <PaymentTypesByWalletTab
              currentCompanyId={currentCompany?.id}
              configs={configs}
              disableSelection={savingPaymentTypes}
              isSaving={savingPaymentTypes}
              onPersistSelectedPaymentTypeIds={savePaymentTypeConfigs}
            />
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
                <Icon
                  name={isOpen ? 'lock' : 'unlock'}
                  size={13}
                  color="#fff"
                />
                <Text style={styles.toggleBtnText}>
                  {actionLoading
                    ? isOpen
                      ? 'Fechando...'
                      : 'Abrindo...'
                    : isOpen
                      ? global.t?.t('orders', 'button', 'closeCashRegister') || 'Close'
                      : global.t?.t('orders', 'button', 'openCashRegister') || 'Open'}
                </Text>
              </TouchableOpacity>
            </View>
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
                  {search ? 'Nenhum produto encontrado para esta busca' : 'Nenhum produto registrado neste equipamento'}
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
