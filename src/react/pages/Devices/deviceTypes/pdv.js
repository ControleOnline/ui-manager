import {PDV_DEVICE_TYPE, normalizeDeviceType} from '@controleonline/ui-common/src/react/utils/printerDevices';
import {createDeviceTypeTab} from './shared';

const emptyState = {
  icon: 'shopping-bag',
  title: 'Nenhum pdv encontrado',
  description: 'A empresa ativa ainda nao possui devices cadastrados neste filtro.',
};

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

export default pdvDeviceType;
