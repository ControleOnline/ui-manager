import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import {Picker} from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/Feather';
import {useStore} from '@store';
import {api} from '@controleonline/ui-common/src/api';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import {resolveThemePalette, withOpacity} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import {resolveFileImageUrl} from '@controleonline/ui-common/src/react/utils/fileUrl';
import {buildOrderProductCards} from '@controleonline/ui-orders/src/react/components/OrderProducts.utils';
import {resolveMarketplaceOrderCode} from '@controleonline/ui-orders/src/react/utils/orderIdentity';
import {
  hasOrderProducts,
  needsDetailedOrderProductsFetch,
} from '@controleonline/ui-orders/src/react/utils/orderProductsFetchPolicy';
import {getNetworkDeviceProfile} from '@controleonline/ui-common/src/react/utils/networkDeviceProfiles';
import {
  buildNetworkCameraConfigs,
  buildNetworkCameraMetadata,
  DEFAULT_NETWORK_CAMERA_PROTOCOL,
  getCameraMetadataField,
  getNetworkCameraConfigValues,
  NETWORK_CAMERA_PORT_CONFIG_KEY,
  NETWORK_CAMERA_PROTOCOL_OPTIONS,
} from '@controleonline/ui-common/src/react/utils/networkCameraDevices';
import {
  DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY,
  isTruthyValue,
  parseConfigsObject,
} from '@controleonline/ui-common/src/react/config/deviceConfigBootstrap';
import {
  checkNetworkPrinterConnection,
  isNetworkPrinterRuntimeSupported,
} from '@controleonline/ui-common/src/react/services/NetworkPrinterService';
import {
  buildNetworkPrinterMetadata,
  DEFAULT_NETWORK_PRINTER_COLUMNS,
  DEFAULT_NETWORK_PRINTER_CODE_PAGE,
  DEFAULT_NETWORK_PRINTER_PORT,
  DEFAULT_NETWORK_PRINTER_TRANSPORT,
  getDeviceTypeLabel,
  getPrinterManagerDeviceOptions,
  getPrinterMetadataField,
  IP_CAMERA_DEVICE_TYPE,
  NETWORK_PRINTER_CODE_PAGE_CONFIG_KEY,
  NETWORK_PRINTER_COLUMNS_CONFIG_KEY,
  NETWORK_PRINTER_MANAGER_DEVICE_CONFIG_KEY,
  NETWORK_PRINTER_PORT_CONFIG_KEY,
  NETWORK_PRINTER_TRANSPORT_CONFIG_KEY,
  normalizePrinterColumns,
  normalizePrinterHost,
  normalizePrinterPort,
  PRINT_DEVICE_TYPE,
} from '@controleonline/ui-common/src/react/utils/printerDevices';
import {
  filterDeviceConfigsByCompany,
  normalizeDeviceId,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import NetworkPrinterPreviewModal from '../components/NetworkPrinterPreviewModal';
import styles from './PrinterDeviceDetailPage.styles';

const resolveErrorMessage = error =>
  error?.response?.data?.['hydra:description'] ||
  error?.response?.data?.message ||
  error?.message ||
  'Nao foi possivel salvar as alteracoes.';

const extractCollectionMembers = response => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.member)) {
    return response.member;
  }

  if (Array.isArray(response?.['hydra:member'])) {
    return response['hydra:member'];
  }

  return [];
};

const normalizeEntityId = value => {
  if (!value) {
    return '';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string') {
    return value.replace(/\D+/g, '');
  }

  return normalizeEntityId(value?.id || value?.['@id']);
};

const normalizePreviewText = value => String(value || '').trim();

const ORDER_PRINT_FOOTER_TEXT_CONFIG_KEY = 'order-print-footer-text';
const ORDER_PREVIEW_CHANNELS = {
  food99: {
    app: 'Food99',
    label: 'Food99',
    stateEndpoint: orderId => `marketplace/integrations/99food/orders/${orderId}/state`,
  },
  ifood: {
    app: 'iFood',
    label: 'iFood',
    stateEndpoint: orderId => `marketplace/integrations/ifood/orders/${orderId}/state`,
  },
};

const NETWORK_PRINTER_CODE_PAGE_OPTIONS = [
  {value: 'cp850', label: 'CP850 - portugues/Bematech'},
  {value: 'latin1', label: 'Latin-1 / Windows-1252'},
];

const formatPreviewMoney = value => {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue)) {
    return '0,00';
  }

  return numericValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const upperPreviewText = value =>
  normalizePreviewText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

const previewLine = (text, options = {}) => ({
  ...options,
  text: normalizePreviewText(text),
});

const getEmbeddedOrderProducts = order => {
  if (Array.isArray(order?.orderProducts)) {
    return order.orderProducts;
  }

  if (Array.isArray(order?.orderProducts?.member)) {
    return order.orderProducts.member;
  }

  if (Array.isArray(order?.orderProducts?.['hydra:member'])) {
    return order.orderProducts['hydra:member'];
  }

  return [];
};

const normalizeConfigEntries = response => {
  const rawConfigs =
    response?.configs ?? response?.member ?? response?.['hydra:member'] ?? response;

  if (Array.isArray(rawConfigs)) {
    return rawConfigs.reduce((configs, config) => {
      const key =
        config?.configKey ||
        config?.key ||
        config?.name ||
        config?.config_name;
      const value =
        config?.configValue !== undefined
          ? config.configValue
          : config?.value !== undefined
            ? config.value
            : config?.config_value;

      if (key) {
        configs[key] = value;
      }

      return configs;
    }, {});
  }

  return rawConfigs && typeof rawConfigs === 'object' ? rawConfigs : {};
};

const getOrderExternalCode = (order, marketplaceState = null) => {
  const marketplaceCode = resolveMarketplaceOrderCode(order, marketplaceState);
  if (marketplaceCode) {
    return marketplaceCode;
  }

  const app = normalizePreviewText(order?.app);
  const matchingExtraData = (Array.isArray(order?.extraData) ? order.extraData : [])
    .filter(item => {
      const source = normalizePreviewText(item?.source).toLowerCase();
      const fieldName = normalizePreviewText(item?.extra_fields?.name).toLowerCase();
      return source === app.toLowerCase() && ['code', 'id'].includes(fieldName);
    })
    .sort((left, right) => {
      const leftName = normalizePreviewText(left?.extra_fields?.name).toLowerCase();
      const rightName = normalizePreviewText(right?.extra_fields?.name).toLowerCase();
      return (leftName === 'code' ? 0 : 1) - (rightName === 'code' ? 0 : 1);
    })[0];

  return (
    normalizePreviewText(order?.externalCode) ||
    normalizePreviewText(matchingExtraData?.value) ||
    normalizePreviewText(order?.id)
  );
};

const getOrderCustomerName = order =>
  normalizePreviewText(order?.client?.name) ||
  normalizePreviewText(order?.payer?.name) ||
  'Cliente';

const getOrderChannelName = order => {
  const app = normalizePreviewText(order?.app);
  if (app.toLowerCase() === 'food99') {
    return 'Food99';
  }

  if (app.toLowerCase() === 'ifood') {
    return 'iFood';
  }

  return app || 'PDV';
};

const getCompanyBrandTitle = ({company, order, marketplaceState = {}}) =>
  normalizePreviewText(marketplaceState?.merchant?.name) ||
  normalizePreviewText(marketplaceState?.merchant?.merchant_name) ||
  normalizePreviewText(marketplaceState?.shop?.shop_name) ||
  normalizePreviewText(marketplaceState?.shop?.merchant_name) ||
  normalizePreviewText(marketplaceState?.store?.name) ||
  normalizePreviewText(marketplaceState?.integration?.merchant_name) ||
  normalizePreviewText(marketplaceState?.integration?.store_name) ||
  normalizePreviewText(marketplaceState?.order?.merchant?.name) ||
  normalizePreviewText(company?.alias) ||
  normalizePreviewText(order?.provider?.alias) ||
  normalizePreviewText(company?.name) ||
  normalizePreviewText(order?.provider?.name);

const getNestedAddressValue = (address, paths) => {
  for (const path of paths) {
    const value = path
      .split('.')
      .reduce((currentValue, key) => currentValue?.[key], address);
    const normalizedValue = normalizePreviewText(value);

    if (normalizedValue) {
      return normalizedValue;
    }
  }

  return '';
};

const buildAddressLinesFromAddress = address => {
  if (!address) {
    return [];
  }

  const streetLine = [
    getNestedAddressValue(address, [
      'street.street',
      'streetName',
      'street_name',
      'street',
      'address',
    ]),
    getNestedAddressValue(address, ['number', 'streetNumber', 'street_number']),
  ]
    .map(normalizePreviewText)
    .filter(Boolean)
    .join(', ');
  const districtLine = [
    getNestedAddressValue(address, [
      'street.district.district',
      'district.district',
      'neighborhood',
      'district',
    ]),
    getNestedAddressValue(address, [
      'street.cep.cep',
      'cep.cep',
      'zipcode',
      'zipCode',
      'postalCode',
      'postal_code',
    ]),
  ]
    .map(normalizePreviewText)
    .filter(Boolean)
    .join(', ');
  const complementLine = getNestedAddressValue(address, [
    'complement',
    'reference',
    'details',
  ]);

  return [streetLine, districtLine, complementLine].filter(Boolean);
};

const getOrderAddressLines = (order, marketplaceState = {}) => {
  const addressCandidates = [
    marketplaceState?.address,
    marketplaceState?.delivery?.address,
    order?.addressDestination,
    order?.delivery?.address,
    order?.client?.address,
  ];

  for (const address of addressCandidates) {
    const lines = buildAddressLinesFromAddress(address);
    if (lines.length > 0) {
      return lines;
    }
  }

  return [];
};

const getCardQueueName = card =>
  normalizePreviewText(card?.queuePresentation?.queueLabel) ||
  normalizePreviewText(card?.queuePresentation?.queue?.queue) ||
  normalizePreviewText(card?.queuePresentation?.queue?.name) ||
  'Fila sem nome';

const getMarketplaceDelivery = marketplaceState => marketplaceState?.delivery || {};

const getMarketplacePayment = marketplaceState => marketplaceState?.payment || {};

const getOrderOperationLabel = (order, marketplaceState = {}) => {
  const channelName = getOrderChannelName(order);
  const delivery = getMarketplaceDelivery(marketplaceState);
  const deliveryLabel =
    normalizePreviewText(delivery?.delivery_label) ||
    normalizePreviewText(delivery?.mode_label) ||
    normalizePreviewText(delivery?.type_label) ||
    normalizePreviewText(delivery?.type) ||
    'Entrega';

  return `${channelName} - ${deliveryLabel}`;
};

const getDeliveryPeopleName = marketplaceState => {
  const delivery = getMarketplaceDelivery(marketplaceState);

  return (
    normalizePreviewText(delivery?.rider_name) ||
    normalizePreviewText(delivery?.courier_name) ||
    normalizePreviewText(delivery?.delivery_people?.name) ||
    normalizePreviewText(delivery?.provider?.name)
  );
};

const getDeliveryCode = marketplaceState => {
  const delivery = getMarketplaceDelivery(marketplaceState);
  const identifiers = marketplaceState?.identifiers || {};

  return (
    normalizePreviewText(delivery?.handover_code) ||
    normalizePreviewText(delivery?.pickup_code) ||
    normalizePreviewText(delivery?.locator) ||
    normalizePreviewText(identifiers?.handover_code) ||
    normalizePreviewText(identifiers?.pickup_code) ||
    normalizePreviewText(identifiers?.locator)
  );
};

const getPaymentLine = marketplaceState => {
  const payment = getMarketplacePayment(marketplaceState);
  const hasPaymentContext = Object.keys(payment).length > 0;
  const collectAmount = Number(
    payment?.collect_on_delivery_amount || payment?.amount_pending || 0,
  );
  const isPaidOnline =
    payment?.is_paid_online === true ||
    payment?.is_fully_paid === true ||
    normalizePreviewText(payment?.pay_type).toLowerCase() === 'online';

  if (!hasPaymentContext) {
    return 'PAGAMENTO NAO INFORMADO';
  }

  if (isPaidOnline || collectAmount <= 0) {
    return 'PAGO ONLINE - NAO COBRAR NA ENTREGA';
  }

  if (collectAmount > 0) {
    return `COBRAR NA ENTREGA R$ ${formatPreviewMoney(collectAmount)}`;
  }

  return (
    normalizePreviewText(payment?.selected_payment_label) ||
    normalizePreviewText(payment?.pay_method) ||
    'PAGAMENTO NAO INFORMADO'
  );
};

const getCardQuantity = card => {
  const quantity = Number(card?.quantity || 1);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
};

const getOrderItemsCount = cards =>
  (Array.isArray(cards) ? cards : []).reduce(
    (total, card) => total + getCardQuantity(card),
    0,
  );

const appendPreviewGroupLines = (group, lines, level = 0) => {
  const groupLabel = upperPreviewText(group?.label);
  const indent = ' '.repeat(Math.min(level * 2, 6));

  if (groupLabel) {
    lines.push(previewLine(`${indent}${groupLabel}:`, {bold: true}));
  }

  (Array.isArray(group?.items) ? group.items : []).forEach(item => {
    const quantity = Number(item?.quantity || 0);
    const quantityText = quantity > 1 ? `${quantity}x ` : '';
    lines.push(`${indent}* ${quantityText}${item?.name || 'Item'}`);

    if (item?.observation) {
      lines.push(previewLine(`${indent}OBS: ${item.observation}`, {reverse: true}));
    }

    (Array.isArray(item?.groups) ? item.groups : []).forEach(childGroup => {
      appendPreviewGroupLines(childGroup, lines, level + 1);
    });
  });
};

const appendPreviewCardLines = ({card, lines}) => {
  const quantity = getCardQuantity(card);
  const quantityText = `${quantity}x `;

  lines.push(previewLine(`${quantityText}${card?.name || 'Produto'}`, {bold: true}));

  if (card?.observation) {
    lines.push(previewLine(`OBS: ${card.observation}`, {reverse: true}));
  }

  (Array.isArray(card?.groups) ? card.groups : []).forEach(group => {
    appendPreviewGroupLines(group, lines);
  });
};

const buildQueueGroupsFromCards = cards => {
  const groupedCards = new Map();

  (Array.isArray(cards) ? cards : []).forEach(card => {
    const queueName = getCardQueueName(card);
    groupedCards.set(queueName, [...(groupedCards.get(queueName) || []), card]);
  });

  return Array.from(groupedCards.entries()).map(([queueName, items]) => ({
    queueName,
    items,
  }));
};

const buildOrderDocuments = ({
  order,
  orderProducts,
  columns,
  company,
  marketplaceState = {},
  footerText = '',
}) => {
  const divider = '-'.repeat(Number(columns || 48));
  const externalCode = getOrderExternalCode(order, marketplaceState);
  const channelName = getOrderChannelName(order);
  const orderProductCards = buildOrderProductCards(orderProducts);
  const groupedQueueItems = buildQueueGroupsFromCards(orderProductCards);
  const companyName =
    normalizePreviewText(company?.name) ||
    normalizePreviewText(order?.provider?.name) ||
    normalizePreviewText(company?.alias);
  const brandTitle = getCompanyBrandTitle({company, order, marketplaceState});
  const shouldShowCompanyName =
    companyName &&
    brandTitle.toLocaleLowerCase() !== companyName.toLocaleLowerCase();
  const customerName = upperPreviewText(getOrderCustomerName(order));
  const footerLine = normalizePreviewText(footerText);
  const addressLines = getOrderAddressLines(order, marketplaceState);
  const deliveryPeopleName = getDeliveryPeopleName(marketplaceState);
  const deliveryCode = getDeliveryCode(marketplaceState);
  const itemsCount = getOrderItemsCount(orderProductCards);

  const orderHeaderLines = [
    ...(brandTitle ? [previewLine(brandTitle, {center: true, bold: true})] : []),
    ...(shouldShowCompanyName ? [previewLine(companyName, {center: true})] : []),
    divider,
    previewLine(`Pedido #${order?.id || ''} - ${channelName}`, {center: true}),
    previewLine(upperPreviewText(getOrderOperationLabel(order, marketplaceState)), {
      center: true,
    }),
    previewLine(`PEDIDO #${externalCode}`, {center: true, bold: true, reverse: true, large: true}),
    previewLine(customerName, {center: true, bold: true}),
    divider,
    ...addressLines,
    ...(addressLines.length > 0 ? [divider] : []),
    ...(deliveryPeopleName ? [`Entregador: ${deliveryPeopleName}`] : []),
    ...(deliveryCode
      ? [
          'CODIGO DE ENTREGA/COLETA:',
          previewLine(deliveryCode, {reverse: true}),
        ]
      : []),
    ...(deliveryPeopleName || deliveryCode ? [getPaymentLine(marketplaceState), divider] : []),
    previewLine(`ITENS DO PEDIDO (${itemsCount})`, {bold: true}),
    ...orderProductCards.flatMap(card => {
      const lines = [];
      appendPreviewCardLines({card, lines});
      lines.push(divider);
      return lines;
    }),
    ...(deliveryPeopleName || deliveryCode ? [] : [getPaymentLine(marketplaceState)]),
    ...(footerLine ? [divider, footerLine] : []),
  ];

  return [
    {
      title: 'Pedido completo',
      subtitle: `${channelName} #${externalCode}`,
      hideDefaultHeader: true,
      lines: orderHeaderLines,
    },
    ...groupedQueueItems.map(group => ({
      title: group.queueName,
      subtitle: `Pedido #${order?.id || ''} - ${channelName}`,
      hideDefaultHeader: true,
      hideLogo: true,
      lines: [
        previewLine(group.queueName, {center: true, bold: true}),
        previewLine(upperPreviewText(channelName), {center: true}),
        previewLine(`PEDIDO #${externalCode}`, {
          center: true,
          bold: true,
          reverse: true,
        }),
        previewLine(customerName, {center: true, bold: true}),
        divider,
        ...group.items.flatMap(card => {
          const lines = [];
          appendPreviewCardLines({card, lines});
          lines.push(divider);
          return lines;
        }),
      ],
    })),
  ];
};

const getConnectionStatusMeta = status => {
  if (status === 'online') {
    return {
      label: 'Online',
      color: '#22C55E',
      icon: 'wifi',
    };
  }

  if (status === 'offline') {
    return {
      label: 'Offline',
      color: '#EF4444',
      icon: 'wifi-off',
    };
  }

  if (status === 'checking') {
    return {
      label: 'Testando',
      color: '#0EA5E9',
      icon: 'loader',
    };
  }

  if (status === 'unsupported') {
    return {
      label: 'Sem teste',
      color: '#F59E0B',
      icon: 'slash',
    };
  }

  return {
    label: 'Pendente',
    color: '#64748B',
    icon: 'clock',
  };
};

const PrinterDeviceDetailPage = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {
    dcId: initialDeviceConfigId,
    deviceId,
    deviceString,
    deviceType: initialDeviceType,
    alias: initialAlias,
    configs: initialConfigs,
    metadata: initialMetadata,
  } = route.params || {};
  const normalizedDeviceType =
    String(initialDeviceType || '').trim().toUpperCase() || PRINT_DEVICE_TYPE;
  const isIpCamera = normalizedDeviceType === IP_CAMERA_DEVICE_TYPE;
  const deviceProfile = useMemo(
    () => getNetworkDeviceProfile(normalizedDeviceType),
    [normalizedDeviceType],
  );

  const peopleStore = useStore('people');
  const deviceStore = useStore('device');
  const deviceConfigStore = useStore('device_config');
  const themeStore = useStore('theme');

  const {currentCompany} = peopleStore.getters;
  const {colors: themeColors} = themeStore.getters;

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        {...themeColors, ...(currentCompany?.theme?.colors || {})},
        colors,
      ),
    [themeColors, currentCompany?.id],
  );

  const initialParsedConfigs = useMemo(
    () => parseConfigsObject(initialConfigs),
    [initialConfigs],
  );
  const initialCameraConfigValues = useMemo(
    () => getNetworkCameraConfigValues(initialParsedConfigs),
    [initialParsedConfigs],
  );
  const persistedDeviceHost = normalizePrinterHost(deviceString);

  const [loading, setLoading] = useState(false);
  const [savingDevice, setSavingDevice] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingRuntimeDebugInfo, setSavingRuntimeDebugInfo] = useState(false);
  const [removingConfig, setRemovingConfig] = useState(false);
  const [companyDeviceConfigs, setCompanyDeviceConfigs] = useState([]);
  const [deviceConfigId, setDeviceConfigId] = useState(
    String(initialDeviceConfigId || '').trim(),
  );
  const [deviceMetadata, setDeviceMetadata] = useState(initialMetadata || {});
  const [alias, setAlias] = useState(initialAlias || '');
  const [deviceHost, setDeviceHost] = useState(persistedDeviceHost);
  const [connectionStatus, setConnectionStatus] = useState(
    isNetworkPrinterRuntimeSupported ? 'idle' : 'unsupported',
  );
  const [connectionMessage, setConnectionMessage] = useState(
    isNetworkPrinterRuntimeSupported
      ? `Aguardando teste do socket da ${deviceProfile.itemLabel.toLowerCase()}.`
      : 'Teste de socket disponivel apenas no app nativo.',
  );
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [printPreviewVisible, setPrintPreviewVisible] = useState(false);
  const [printPreviewDocuments, setPrintPreviewDocuments] = useState([]);
  const [printPreviewError, setPrintPreviewError] = useState('');
  const [printPreviewLoading, setPrintPreviewLoading] = useState(false);
  const [printPreviewLogoUrl, setPrintPreviewLogoUrl] = useState('');
  const [printPreviewSubtitle, setPrintPreviewSubtitle] = useState('');
  const [printPreviewTitle, setPrintPreviewTitle] = useState(
    'Visualizacao da impressao',
  );
  const [manufacturer, setManufacturer] = useState(
    isIpCamera
      ? getCameraMetadataField(initialMetadata, 'manufacturer')
      : getPrinterMetadataField(initialMetadata, 'manufacturer'),
  );
  const [model, setModel] = useState(
    isIpCamera
      ? getCameraMetadataField(initialMetadata, 'model')
      : getPrinterMetadataField(initialMetadata, 'model'),
  );
  const [version, setVersion] = useState(
    isIpCamera
      ? getCameraMetadataField(initialMetadata, 'version')
      : getPrinterMetadataField(initialMetadata, 'version'),
  );
  const [port, setPort] = useState(
    isIpCamera
      ? initialCameraConfigValues.port
      : normalizePrinterPort(
          initialParsedConfigs[NETWORK_PRINTER_PORT_CONFIG_KEY] ||
            DEFAULT_NETWORK_PRINTER_PORT,
        ),
  );
  const [columns, setColumns] = useState(
    normalizePrinterColumns(
      initialParsedConfigs[NETWORK_PRINTER_COLUMNS_CONFIG_KEY] ||
        DEFAULT_NETWORK_PRINTER_COLUMNS,
    ),
  );
  const [managerDeviceId, setManagerDeviceId] = useState(
    isIpCamera
      ? initialCameraConfigValues.managerDeviceId
      : normalizeDeviceId(
          initialParsedConfigs[NETWORK_PRINTER_MANAGER_DEVICE_CONFIG_KEY],
        ),
  );
  const [transport, setTransport] = useState(
    String(
      initialParsedConfigs[NETWORK_PRINTER_TRANSPORT_CONFIG_KEY] ||
        DEFAULT_NETWORK_PRINTER_TRANSPORT,
    ),
  );
  const [codePage, setCodePage] = useState(
    String(
      initialParsedConfigs[NETWORK_PRINTER_CODE_PAGE_CONFIG_KEY] ||
        DEFAULT_NETWORK_PRINTER_CODE_PAGE,
    ),
  );
  const [protocol, setProtocol] = useState(initialCameraConfigValues.protocol);
  const [streamPath, setStreamPath] = useState(
    initialCameraConfigValues.streamPath,
  );
  const [username, setUsername] = useState(initialCameraConfigValues.username);
  const [password, setPassword] = useState(initialCameraConfigValues.password);
  const [deviceRuntimeDebugInfoEnabled, setDeviceRuntimeDebugInfoEnabled] =
    useState(
      isTruthyValue(
        initialParsedConfigs[DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY],
      ),
    );

  const pickerMode = Platform.OS === 'android' ? 'dropdown' : undefined;
  const scopedDeviceConfigs = useMemo(
    () => filterDeviceConfigsByCompany(companyDeviceConfigs, currentCompany?.id),
    [companyDeviceConfigs, currentCompany?.id],
  );
  const managerDeviceOptions = useMemo(
    () =>
      getPrinterManagerDeviceOptions({
        deviceConfigs: scopedDeviceConfigs,
        companyId: currentCompany?.id,
        excludeDeviceId: deviceHost || persistedDeviceHost,
      }),
    [currentCompany?.id, deviceHost, persistedDeviceHost, scopedDeviceConfigs],
  );
  const connectionStatusMeta = useMemo(
    () => getConnectionStatusMeta(connectionStatus),
    [connectionStatus],
  );

  const runConnectionCheck = useCallback(
    async ({hostOverride = null, portOverride = null} = {}) => {
      const normalizedHost = normalizePrinterHost(
        hostOverride ?? deviceHost ?? persistedDeviceHost,
      );
      const normalizedPort = normalizePrinterPort(
        portOverride ?? port ?? DEFAULT_NETWORK_PRINTER_PORT,
      );

      if (!isNetworkPrinterRuntimeSupported) {
        setConnectionStatus('unsupported');
        setConnectionMessage(
          'Teste de socket disponivel apenas no app nativo.',
        );
        return false;
      }

      if (!normalizedHost) {
        setConnectionStatus('offline');
        setConnectionMessage('IP ou hostname nao configurado.');
        return false;
      }

      setCheckingConnection(true);
      setConnectionStatus('checking');
      setConnectionMessage(
        `Testando socket ${normalizedHost}:${normalizedPort}...`,
      );

      try {
        await checkNetworkPrinterConnection({
          host: normalizedHost,
          port: normalizedPort,
        });

        setConnectionStatus('online');
        setConnectionMessage(
          `Socket conectado em ${normalizedHost}:${normalizedPort}.`,
        );
        return true;
      } catch (error) {
        setConnectionStatus('offline');
        setConnectionMessage(
          error?.message ||
            `Falha ao conectar em ${normalizedHost}:${normalizedPort}.`,
        );
        return false;
      } finally {
        setCheckingConnection(false);
      }
    },
    [deviceHost, persistedDeviceHost, port],
  );

  useFocusEffect(
    useCallback(() => {
      if (!currentCompany?.id || !deviceId) {
        return;
      }

      let cancelled = false;
      setLoading(true);

      Promise.all([
        deviceStore.actions.get(deviceId).catch(() => null),
        deviceConfigStore.actions
          .getItems({people: `/people/${currentCompany.id}`})
          .catch(() => []),
      ])
        .then(([deviceData, configs]) => {
          if (cancelled) {
            return;
          }

          const scopedConfigs = filterDeviceConfigsByCompany(
            configs,
            currentCompany?.id,
          );
          setCompanyDeviceConfigs(scopedConfigs);

          const normalizedDeviceKey = String(deviceId || '').trim();
          const currentDeviceConfig = scopedConfigs.find(deviceConfig => {
            const currentDeviceId = String(deviceConfig?.device?.id || '').trim();
            const currentDeviceString = normalizeDeviceId(
              deviceConfig?.device?.device,
            );
            const currentDeviceType = String(
              deviceConfig?.type || deviceConfig?.device?.type || '',
            )
              .trim()
              .toUpperCase();

            return (
              currentDeviceType === normalizedDeviceType &&
              (
                (normalizedDeviceKey !== '' &&
                  currentDeviceId === normalizedDeviceKey) ||
                currentDeviceString === normalizeDeviceId(persistedDeviceHost)
              )
            );
          });
          const nextConfigs = parseConfigsObject(currentDeviceConfig?.configs);
          const nextCameraConfigValues =
            getNetworkCameraConfigValues(nextConfigs);
          const nextMetadata =
            deviceData?.metadata ||
            currentDeviceConfig?.device?.metadata ||
            initialMetadata;
          const nextDeviceHost = normalizePrinterHost(
            deviceData?.device || currentDeviceConfig?.device?.device || deviceString,
          );

          setDeviceConfigId(
            String(currentDeviceConfig?.id || initialDeviceConfigId || '').trim(),
          );
          setDeviceMetadata(nextMetadata || {});
          setAlias(
            deviceData?.alias ||
              currentDeviceConfig?.device?.alias ||
              initialAlias ||
              '',
          );
          setDeviceHost(nextDeviceHost);
          setManufacturer(
            isIpCamera
              ? getCameraMetadataField(nextMetadata, 'manufacturer')
              : getPrinterMetadataField(nextMetadata, 'manufacturer'),
          );
          setModel(
            isIpCamera
              ? getCameraMetadataField(nextMetadata, 'model')
              : getPrinterMetadataField(nextMetadata, 'model'),
          );
          setVersion(
            isIpCamera
              ? getCameraMetadataField(nextMetadata, 'version')
              : getPrinterMetadataField(nextMetadata, 'version'),
          );
          setPort(
            isIpCamera
              ? nextCameraConfigValues.port
              : normalizePrinterPort(
                  nextConfigs[NETWORK_PRINTER_PORT_CONFIG_KEY] ||
                    DEFAULT_NETWORK_PRINTER_PORT,
                ),
          );
          setColumns(
            normalizePrinterColumns(
              nextConfigs[NETWORK_PRINTER_COLUMNS_CONFIG_KEY] ||
                DEFAULT_NETWORK_PRINTER_COLUMNS,
            ),
          );
          setManagerDeviceId(
            isIpCamera
              ? nextCameraConfigValues.managerDeviceId
              : normalizeDeviceId(
                  nextConfigs[NETWORK_PRINTER_MANAGER_DEVICE_CONFIG_KEY],
                ),
          );
          setTransport(
            String(
              nextConfigs[NETWORK_PRINTER_TRANSPORT_CONFIG_KEY] ||
                DEFAULT_NETWORK_PRINTER_TRANSPORT,
            ),
          );
          setCodePage(
            String(
              nextConfigs[NETWORK_PRINTER_CODE_PAGE_CONFIG_KEY] ||
                DEFAULT_NETWORK_PRINTER_CODE_PAGE,
            ),
          );
          setProtocol(nextCameraConfigValues.protocol);
          setStreamPath(nextCameraConfigValues.streamPath);
          setUsername(nextCameraConfigValues.username);
          setPassword(nextCameraConfigValues.password);
          setDeviceRuntimeDebugInfoEnabled(
            isTruthyValue(
              nextConfigs[DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY],
            ),
          );
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });

      return () => {
        cancelled = true;
      };
    }, [
      currentCompany?.id,
      deviceConfigStore.actions,
      deviceId,
      deviceStore.actions,
      deviceString,
      initialAlias,
      initialDeviceConfigId,
      initialMetadata,
      isIpCamera,
      persistedDeviceHost,
    ]),
  );

  useFocusEffect(
    useCallback(() => {
      runConnectionCheck();
    }, [runConnectionCheck]),
  );

  const saveDeviceRegistration = useCallback(async () => {
    const normalizedHost = normalizePrinterHost(deviceHost);
    if (!normalizedHost) {
      Alert.alert(
        deviceProfile.registrationAlertTitle,
        deviceProfile.hostMissingMessage,
      );
      return;
    }

    const normalizedAlias = String(alias || '').trim() || normalizedHost;
    const metadata = isIpCamera
      ? buildNetworkCameraMetadata({
          existingMetadata: deviceMetadata,
          host: normalizedHost,
          manufacturer,
          model,
          version,
        })
      : buildNetworkPrinterMetadata({
          existingMetadata: deviceMetadata,
          host: normalizedHost,
          manufacturer,
          model,
          version,
          transport,
        });

    setSavingDevice(true);

    try {
      const savedDevice = await deviceStore.actions.save({
        id: deviceId,
        alias: normalizedAlias,
        device: normalizedHost,
        metadata,
      });
      const nextDeviceHost = normalizePrinterHost(
        savedDevice?.device || normalizedHost,
      );

      setAlias(savedDevice?.alias || normalizedAlias);
      setDeviceHost(nextDeviceHost);
      setDeviceMetadata(savedDevice?.metadata || metadata);
      navigation.setParams({
        deviceString: nextDeviceHost,
        alias: savedDevice?.alias || normalizedAlias,
        metadata: savedDevice?.metadata || metadata,
      });
      runConnectionCheck({
        hostOverride: nextDeviceHost,
        portOverride: port,
      });
    } catch (error) {
      Alert.alert(
        deviceProfile.registrationAlertTitle,
        resolveErrorMessage(error),
      );
    } finally {
      setSavingDevice(false);
    }
  }, [
    alias,
    deviceHost,
    deviceMetadata,
    deviceId,
    deviceStore.actions,
    manufacturer,
    model,
    navigation,
    isIpCamera,
    transport,
    version,
    port,
    runConnectionCheck,
    deviceProfile,
  ]);

  const saveRuntimeDebugInfoConfig = useCallback(async () => {
    if (!currentCompany?.id) {
      Alert.alert(
        'Empresa nao selecionada',
        'Selecione uma empresa antes de salvar as configuracoes.',
      );
      return;
    }

    const normalizedHost = normalizePrinterHost(deviceHost);
    if (!normalizedHost) {
      Alert.alert(
        'Rodapé do sistema',
        deviceProfile.hostMissingBeforeSaveMessage,
      );
      return;
    }

    setSavingRuntimeDebugInfo(true);

    try {
      const savedDeviceConfig = await deviceConfigStore.actions.addDeviceConfigs({
        device: normalizedHost,
        people: `/people/${currentCompany.id}`,
        type: normalizedDeviceType,
        configs: JSON.stringify({
          [DEVICE_RUNTIME_DEBUG_INFO_ENABLED_KEY]:
            deviceRuntimeDebugInfoEnabled ? '1' : '0',
        }),
      });

      setDeviceConfigId(String(savedDeviceConfig?.id || deviceConfigId || '').trim());
      navigation.setParams({
        dcId: savedDeviceConfig?.id || deviceConfigId,
        deviceString: normalizedHost,
      });
    } catch (error) {
      Alert.alert('Rodapé do sistema', resolveErrorMessage(error));
    } finally {
      setSavingRuntimeDebugInfo(false);
    }
  }, [
    currentCompany?.id,
    deviceConfigStore.actions,
    deviceConfigId,
    deviceHost,
    deviceRuntimeDebugInfoEnabled,
    navigation,
    deviceProfile,
  ]);

  const savePrinterConfig = useCallback(async () => {
    if (!currentCompany?.id) {
      Alert.alert(
        'Empresa nao selecionada',
        'Selecione uma empresa antes de salvar as configuracoes.',
      );
      return;
    }

    if (!managerDeviceId) {
      Alert.alert(
        'Device responsavel',
        deviceProfile.managerRoutingMessage,
      );
      return;
    }

    const normalizedHost = normalizePrinterHost(deviceHost);
    if (!normalizedHost) {
      Alert.alert(
        deviceProfile.routingAlertTitle,
        deviceProfile.hostMissingMessage,
      );
      return;
    }

    if (normalizedHost !== persistedDeviceHost) {
      Alert.alert(
        deviceProfile.routingAlertTitle,
        deviceProfile.saveBeforeRoutingMessage,
      );
      return;
    }

    const nextConfigs = isIpCamera
      ? buildNetworkCameraConfigs({
          managerDeviceId,
          port,
          protocol,
          streamPath,
          username,
          password,
        })
      : {
          [NETWORK_PRINTER_MANAGER_DEVICE_CONFIG_KEY]: managerDeviceId,
          [NETWORK_PRINTER_PORT_CONFIG_KEY]: normalizePrinterPort(port),
          [NETWORK_PRINTER_COLUMNS_CONFIG_KEY]: normalizePrinterColumns(columns),
          [NETWORK_PRINTER_TRANSPORT_CONFIG_KEY]:
            String(transport || '').trim() || DEFAULT_NETWORK_PRINTER_TRANSPORT,
          [NETWORK_PRINTER_CODE_PAGE_CONFIG_KEY]:
            String(codePage || '').trim() || DEFAULT_NETWORK_PRINTER_CODE_PAGE,
        };

    setSavingConfig(true);

    try {
      const savedDeviceConfig = await deviceConfigStore.actions.addDeviceConfigs({
        device: normalizedHost,
        people: `/people/${currentCompany.id}`,
        type: normalizedDeviceType,
        configs: JSON.stringify(nextConfigs),
      });

      setDeviceConfigId(String(savedDeviceConfig?.id || deviceConfigId || '').trim());
      navigation.setParams({
        configs: nextConfigs,
        dcId: savedDeviceConfig?.id || deviceConfigId,
        deviceString: normalizedHost,
      });
      runConnectionCheck({
        hostOverride: normalizedHost,
        portOverride: isIpCamera
          ? nextConfigs[NETWORK_CAMERA_PORT_CONFIG_KEY]
          : nextConfigs[NETWORK_PRINTER_PORT_CONFIG_KEY],
      });
    } catch (error) {
      Alert.alert(
        deviceProfile.routingAlertTitle,
        resolveErrorMessage(error),
      );
    } finally {
      setSavingConfig(false);
    }
  }, [
    columns,
    codePage,
    currentCompany?.id,
    deviceHost,
    deviceConfigStore.actions,
    deviceConfigId,
    isIpCamera,
    managerDeviceId,
    navigation,
    password,
    port,
    persistedDeviceHost,
    protocol,
    streamPath,
    transport,
    runConnectionCheck,
    username,
    deviceProfile,
  ]);

  const handleRemoveConfig = useCallback(() => {
    const normalizedCurrentConfigId = String(deviceConfigId || '').trim();
    if (!normalizedCurrentConfigId || removingConfig) {
      return;
    }

    Alert.alert(
      deviceProfile.removeConfirmTitle,
      deviceProfile.removeConfirmMessage,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            setRemovingConfig(true);

            try {
              await deviceConfigStore.actions.remove(normalizedCurrentConfigId);
              setDeviceConfigId('');
              navigation.navigate('DevicesIndex');
            } catch (error) {
              Alert.alert(
                deviceProfile.removeConfirmTitle,
                error?.message || deviceProfile.removeErrorMessage,
              );
            } finally {
              setRemovingConfig(false);
            }
          },
        },
      ],
    );
  }, [
    deviceConfigId,
    deviceConfigStore.actions,
    deviceProfile,
    navigation,
    removingConfig,
  ]);

  const fetchCompanyPrintContext = useCallback(async companyId => {
    const [configsResponse, companyResponse] = await Promise.all([
      api
        .fetch('configs/discovery-configs', {
          method: 'POST',
          body: {
            people: `/people/${companyId}`,
          },
        })
        .catch(() => ({})),
      api.fetch(`people/${companyId}`).catch(() => currentCompany || {}),
    ]);

    return {
      company: {
        ...(currentCompany || {}),
        ...(companyResponse || {}),
      },
      configs: normalizeConfigEntries(configsResponse),
    };
  }, [currentCompany]);

  const fetchLatestClosedOrder = useCallback(async (companyId, channelKey) => {
    const ordersResponse = await api.fetch('orders', {
      params: {
        company: companyId,
        itemsPerPage: 80,
        'order[id]': 'desc',
      },
    });
    const orders = extractCollectionMembers(ordersResponse);
    const channel = ORDER_PREVIEW_CHANNELS[channelKey];
    const expectedApp = normalizePreviewText(channel?.app).toLowerCase();

    return (
      orders.find(order => {
        const realStatus = normalizePreviewText(
          order?.status?.realStatus || order?.status?.real_status,
        ).toLowerCase();
        const status = normalizePreviewText(
          order?.status?.status || order?.status,
        ).toLowerCase();
        const orderType = normalizePreviewText(
          order?.orderType?.orderType || order?.orderType,
        ).toLowerCase();
        const app = normalizePreviewText(order?.app).toLowerCase();

        return (
          (realStatus === 'closed' || status === 'closed') &&
          (!orderType || orderType === 'sale') &&
          (!expectedApp || app === expectedApp)
        );
      }) ||
      null
    );
  }, []);

  const fetchMarketplaceStateForPreview = useCallback(async (orderId, channelKey) => {
    const channel = ORDER_PREVIEW_CHANNELS[channelKey];
    if (!channel?.stateEndpoint || !orderId) {
      return {};
    }

    return api.fetch(channel.stateEndpoint(orderId)).catch(() => ({}));
  }, []);

  const fetchOrderProductsForPreview = useCallback(async order => {
    const orderId = normalizeEntityId(order);
    const embeddedOrderProducts = getEmbeddedOrderProducts(order);

    if (
      hasOrderProducts(embeddedOrderProducts) &&
      !needsDetailedOrderProductsFetch(embeddedOrderProducts)
    ) {
      return embeddedOrderProducts;
    }

    const orderProductsResponse = await api.fetch('order_products', {
      params: {
        order: `/orders/${orderId}`,
        itemsPerPage: 250,
      },
    });
    const orderProducts = extractCollectionMembers(orderProductsResponse);

    return orderProducts.length > 0 ? orderProducts : embeddedOrderProducts;
  }, []);

  const openLatestOrderPreview = useCallback(async channelKey => {
    const channel = ORDER_PREVIEW_CHANNELS[channelKey];
    setPrintPreviewVisible(true);
    setPrintPreviewTitle(`Ultimo pedido ${channel?.label || 'real'}`);
    setPrintPreviewSubtitle('Pedido completo e vias separadas por fila.');
    setPrintPreviewDocuments([]);
    setPrintPreviewError('');
    setPrintPreviewLogoUrl('');
    setPrintPreviewLoading(true);

    try {
      const companyId = currentCompany?.id;
      const latestOrder = await fetchLatestClosedOrder(companyId, channelKey);
      const latestOrderId = normalizeEntityId(latestOrder);

      if (!latestOrderId) {
        throw new Error(
          `Nenhum pedido ${channel?.label || ''} fechado encontrado para esta empresa.`,
        );
      }

      const [orderDetails, companyContext, marketplaceState] = await Promise.all([
        api.fetch(`orders/${latestOrderId}`).catch(() => latestOrder),
        fetchCompanyPrintContext(companyId),
        fetchMarketplaceStateForPreview(latestOrderId, channelKey),
      ]);
      const orderProducts = await fetchOrderProductsForPreview(orderDetails);
      const logoUrl = resolveFileImageUrl(companyContext.company?.image, {
        company: companyContext.company,
      });

      setPrintPreviewLogoUrl(logoUrl);
      setPrintPreviewDocuments(
        buildOrderDocuments({
          order: orderDetails || latestOrder,
          orderProducts,
          columns,
          company: companyContext.company,
          marketplaceState,
          footerText: companyContext.configs[ORDER_PRINT_FOOTER_TEXT_CONFIG_KEY],
        }),
      );
    } catch (error) {
      setPrintPreviewError(resolveErrorMessage(error));
    } finally {
      setPrintPreviewLoading(false);
    }
  }, [
    columns,
    currentCompany?.id,
    fetchCompanyPrintContext,
    fetchLatestClosedOrder,
    fetchMarketplaceStateForPreview,
    fetchOrderProductsForPreview,
  ]);

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: brandColors.background}]}>
      <StateStore stores={['device', 'device_config', 'people']} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View
            style={[
              styles.heroIcon,
              {backgroundColor: withOpacity(brandColors.primary, 0.12)},
            ]}>
            <Icon name={deviceProfile.icon} size={20} color={brandColors.primary} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>
              {alias || deviceProfile.detailHeroFallback}
            </Text>
            <Text style={styles.heroText}>
              {getDeviceTypeLabel(normalizedDeviceType)} vinculada ao endereco{' '}
              {deviceHost || persistedDeviceHost}
            </Text>
          </View>
        </View>

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={brandColors.primary} />
            <Text style={styles.loadingText}>{deviceProfile.detailLoadingText}</Text>
          </View>
        )}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Status do socket</Text>
          <Text style={styles.sectionDescription}>
            {deviceProfile.statusSectionDescription}
          </Text>

          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: withOpacity(connectionStatusMeta.color, 0.08),
                borderColor: withOpacity(connectionStatusMeta.color, 0.28),
              },
            ]}>
            <View style={styles.statusCopy}>
              <View style={styles.statusTitleRow}>
                <Icon
                  name={connectionStatusMeta.icon}
                  size={15}
                  color={connectionStatusMeta.color}
                />
                <Text
                  style={[
                    styles.statusTitle,
                    {color: connectionStatusMeta.color},
                  ]}>
                  {connectionStatusMeta.label}
                </Text>
              </View>
              <Text style={styles.statusDescription}>{connectionMessage}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                checkingConnection && styles.secondaryButtonDisabled,
              ]}
              activeOpacity={0.85}
              disabled={checkingConnection}
              onPress={() => runConnectionCheck()}>
              {checkingConnection ? (
                <ActivityIndicator size="small" color={connectionStatusMeta.color} />
              ) : (
                <>
                  <Icon
                    name="refresh-cw"
                    size={14}
                    color={connectionStatusMeta.color}
                  />
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      {color: connectionStatusMeta.color},
                    ]}>
                    Testar
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {!isIpCamera ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Visualizacao de impressao</Text>
            <Text style={styles.sectionDescription}>
              Use dados reais para conferir largura do papel, quebras de linha,
              origem do pedido e separacao por filas antes de enviar qualquer
              coisa para a impressora.
            </Text>

            <View style={styles.actionButtonRow}>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  styles.actionButton,
                  {backgroundColor: brandColors.primary},
                ]}
                activeOpacity={0.85}
                onPress={() => openLatestOrderPreview('food99')}>
                <Icon name="eye" size={15} color="#fff" />
                <Text style={styles.primaryButtonText}>
                  Visualizar ultimo pedido Food99
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  styles.actionButton,
                  {backgroundColor: brandColors.primary},
                ]}
                activeOpacity={0.85}
                onPress={() => openLatestOrderPreview('ifood')}>
                <Icon name="eye" size={15} color="#fff" />
                <Text style={styles.primaryButtonText}>
                  Visualizar ultimo pedido iFood
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            {deviceProfile.registrationSectionTitle}
          </Text>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Nome exibido</Text>
            <TextInput
              style={styles.input}
              value={alias}
              onChangeText={setAlias}
              placeholder={deviceProfile.detailAliasPlaceholder}
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>IP ou hostname</Text>
            <TextInput
              style={styles.input}
              value={deviceHost}
              onChangeText={setDeviceHost}
              placeholder="192.168.0.120"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Fabricante</Text>
            <TextInput
              style={styles.input}
              value={manufacturer}
              onChangeText={setManufacturer}
              placeholder="Fabricante"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Modelo</Text>
            <TextInput
              style={styles.input}
              value={model}
              onChangeText={setModel}
              placeholder="Modelo"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Versao/Firmware</Text>
            <TextInput
              style={styles.input}
              value={version}
              onChangeText={setVersion}
              placeholder="Versao"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              {backgroundColor: brandColors.primary},
              savingDevice && styles.primaryButtonDisabled,
            ]}
            activeOpacity={0.85}
            disabled={savingDevice}
            onPress={saveDeviceRegistration}>
            {savingDevice ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="save" size={15} color="#fff" />
                <Text style={styles.primaryButtonText}>Salvar cadastro</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            {deviceProfile.routingSectionTitle}
          </Text>
          <Text style={styles.sectionDescription}>
            {deviceProfile.routingSectionDescription}
          </Text>

          <View style={styles.inlineFields}>
            <View style={[styles.fieldBlock, styles.inlineField]}>
              <Text style={styles.fieldLabel}>
                {isIpCamera ? 'Porta' : 'Porta TCP'}
              </Text>
              <TextInput
                style={styles.input}
                value={port}
                onChangeText={setPort}
                placeholder={
                  isIpCamera ? '554' : DEFAULT_NETWORK_PRINTER_PORT
                }
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
              />
            </View>

            {isIpCamera ? (
              <View style={[styles.fieldBlock, styles.inlineField]}>
                <Text style={styles.fieldLabel}>Protocolo</Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={protocol || DEFAULT_NETWORK_CAMERA_PROTOCOL}
                    mode={pickerMode}
                    style={styles.picker}
                    dropdownIconColor="#64748B"
                    onValueChange={value =>
                      setProtocol(String(value || DEFAULT_NETWORK_CAMERA_PROTOCOL))
                    }>
                    {NETWORK_CAMERA_PROTOCOL_OPTIONS.map(option => (
                      <Picker.Item
                        key={option.value}
                        label={option.label}
                        value={option.value}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            ) : (
              <View style={[styles.fieldBlock, styles.inlineField]}>
                <Text style={styles.fieldLabel}>Colunas</Text>
                <TextInput
                  style={styles.input}
                  value={columns}
                  onChangeText={setColumns}
                  placeholder={DEFAULT_NETWORK_PRINTER_COLUMNS}
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />
              </View>
            )}
          </View>

          {isIpCamera ? (
            <>
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Caminho do stream</Text>
                <TextInput
                  style={styles.input}
                  value={streamPath}
                  onChangeText={setStreamPath}
                  placeholder="Ex.: /Streaming/Channels/101"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inlineFields}>
                <View style={[styles.fieldBlock, styles.inlineField]}>
                  <Text style={styles.fieldLabel}>Usuario</Text>
                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Ex.: admin"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={[styles.fieldBlock, styles.inlineField]}>
                  <Text style={styles.fieldLabel}>Senha</Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Senha da camera"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                  />
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Transporte</Text>
                <TextInput
                  style={[styles.input, styles.readonlyInput]}
                  value={transport || DEFAULT_NETWORK_PRINTER_TRANSPORT}
                  editable={false}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Code page</Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={codePage || DEFAULT_NETWORK_PRINTER_CODE_PAGE}
                    mode={pickerMode}
                    style={styles.picker}
                    dropdownIconColor="#64748B"
                    onValueChange={value =>
                      setCodePage(String(value || DEFAULT_NETWORK_PRINTER_CODE_PAGE))
                    }>
                    {NETWORK_PRINTER_CODE_PAGE_OPTIONS.map(option => (
                      <Picker.Item
                        key={option.value}
                        label={option.label}
                        value={option.value}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </>
          )}

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Device responsavel</Text>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={managerDeviceId || ''}
                mode={pickerMode}
                style={styles.picker}
                dropdownIconColor="#64748B"
                onValueChange={value =>
                  setManagerDeviceId(String(value || '').trim())
                }>
                <Picker.Item
                  label="Selecione um PDV ou DISPLAY"
                  value=""
                />
                {managerDeviceOptions.map(option => (
                  <Picker.Item
                    key={option.deviceId}
                    label={option.label}
                    value={option.deviceId}
                  />
                ))}
              </Picker>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              {backgroundColor: brandColors.primary},
              savingConfig && styles.primaryButtonDisabled,
            ]}
            activeOpacity={0.85}
            disabled={savingConfig}
            onPress={savePrinterConfig}>
            {savingConfig ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="save" size={15} color="#fff" />
                <Text style={styles.primaryButtonText}>
                  {isIpCamera
                    ? 'Salvar acesso da camera'
                    : 'Salvar roteamento'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Rodapé do sistema</Text>
          <Text style={styles.sectionDescription}>
            {deviceProfile.footerDebugDescription}
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
                deviceRuntimeDebugInfoEnabled ? 'toggle-right' : 'toggle-left'
              }
              size={28}
              color={deviceRuntimeDebugInfoEnabled ? '#22C55E' : '#94A3B8'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              {backgroundColor: brandColors.primary},
              savingRuntimeDebugInfo && styles.primaryButtonDisabled,
            ]}
            activeOpacity={0.85}
            disabled={savingRuntimeDebugInfo}
            onPress={saveRuntimeDebugInfoConfig}>
            {savingRuntimeDebugInfo ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="save" size={15} color="#fff" />
                <Text style={styles.primaryButtonText}>
                  Salvar debug do rodape
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {deviceConfigId ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              {deviceProfile.removeSectionTitle}
            </Text>
            <Text style={styles.sectionDescription}>
              {deviceProfile.removeSectionDescription}
            </Text>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                {backgroundColor: '#DC2626'},
                removingConfig && styles.primaryButtonDisabled,
              ]}
              activeOpacity={0.85}
              disabled={removingConfig}
              onPress={handleRemoveConfig}>
              {removingConfig ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="trash-2" size={15} color="#fff" />
                  <Text style={styles.primaryButtonText}>
                    {deviceProfile.removeButtonLabel}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      {!isIpCamera ? (
        <NetworkPrinterPreviewModal
          visible={printPreviewVisible}
          onClose={() => setPrintPreviewVisible(false)}
          codePage={codePage}
          columns={columns}
          documents={printPreviewDocuments}
          error={printPreviewError}
          logoUrl={printPreviewLogoUrl}
          loading={printPreviewLoading}
          printerManufacturer={manufacturer}
          printerModel={model}
          subtitle={printPreviewSubtitle}
          title={printPreviewTitle}
          transport={transport}
        />
      ) : null}
    </SafeAreaView>
  );
};

export default PrinterDeviceDetailPage;
