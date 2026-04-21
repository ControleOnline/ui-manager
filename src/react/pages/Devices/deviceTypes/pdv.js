import {PDV_DEVICE_TYPE, normalizeDeviceType} from '@controleonline/ui-common/src/react/utils/printerDevices';
import {
  getPaymentGateway,
  PAYMENT_GATEWAY_CIELO,
  PAYMENT_GATEWAY_INFINITE_PAY,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';
import {createDeviceTypeTab} from './shared';

const emptyState = {
  icon: 'shopping-bag',
  title: 'Nenhum pdv encontrado',
  description: 'A empresa ativa ainda nao possui devices cadastrados neste filtro.',
};

export const PDV_CIELO_FILTER = 'PDV_CIELO';
export const PDV_INFINITE_PAY_FILTER = 'PDV_INFINITE_PAY';
export const PDV_SUBFILTER_KEYS = [
  PDV_CIELO_FILTER,
  PDV_INFINITE_PAY_FILTER,
];

const pdvDeviceType = {
  key: PDV_DEVICE_TYPE,
  label: 'PDVs',
  itemLabel: 'PDV',
  icon: 'shopping-bag',
  matches: type => normalizeDeviceType(type) === PDV_DEVICE_TYPE,
  shouldDisplay: () => true,
  getAccent: ({hex}) => hex.success,
  getEmptyState: () => emptyState,
  TabComponent: createDeviceTypeTab({
    label: 'PDVs',
    queryTypes: [PDV_DEVICE_TYPE],
    emptyState,
  }),
};

const createPdvGatewayDeviceType = ({
  key,
  label,
  gateway,
  title,
  accentResolver,
}) => {
  const gatewayEmptyState = {
    icon: 'shopping-bag',
    title,
    description:
      'A empresa ativa ainda nao possui devices cadastrados neste filtro.',
  };

  return {
    key,
    label,
    itemLabel: 'PDV',
    icon: 'shopping-bag',
    matches: () => false,
    shouldDisplay: () => true,
    getAccent: accentResolver,
    getEmptyState: () => gatewayEmptyState,
    TabComponent: createDeviceTypeTab({
      label,
      pageSize: 200,
      queryTypes: [PDV_DEVICE_TYPE],
      emptyState: gatewayEmptyState,
      clientFilter: deviceConfig => getPaymentGateway(deviceConfig) === gateway,
    }),
  };
};

export const pdvCieloDeviceType = createPdvGatewayDeviceType({
  key: PDV_CIELO_FILTER,
  label: 'Cielo',
  gateway: PAYMENT_GATEWAY_CIELO,
  title: 'Nenhum pdv Cielo encontrado',
  accentResolver: ({hex, brandColors}) => brandColors?.primary || hex.primary,
});

export const pdvInfinitePayDeviceType = createPdvGatewayDeviceType({
  key: PDV_INFINITE_PAY_FILTER,
  label: 'Infinite Pay',
  gateway: PAYMENT_GATEWAY_INFINITE_PAY,
  title: 'Nenhum pdv Infinite Pay encontrado',
  accentResolver: ({brandColors, hex}) => brandColors?.primary || hex.success,
});

export default pdvDeviceType;
