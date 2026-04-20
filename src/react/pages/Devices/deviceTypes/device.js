import {createDeviceTypeTab} from './shared';

const emptyState = {
  icon: 'cpu',
  title: 'Nenhum device encontrado',
  description: 'A empresa ativa ainda nao possui devices cadastrados neste filtro.',
};

const deviceDeviceType = {
  key: 'DEVICE',
  label: 'Devices',
  itemLabel: 'Device',
  icon: 'cpu',
  matches: type => String(type || '').trim().toUpperCase() === 'DEVICE',
  shouldDisplay: () => true,
  getAccent: ({hex}) => hex.warning,
  getEmptyState: () => emptyState,
  TabComponent: createDeviceTypeTab({
    label: 'Devices',
    queryTypes: ['DEVICE'],
    emptyState,
  }),
};

export default deviceDeviceType;
