import {DISPLAY_DEVICE_TYPE, normalizeDeviceType} from '@controleonline/ui-common/src/react/utils/printerDevices';
import {createDeviceTypeTab} from './shared';

const emptyState = {
  icon: 'monitor',
  title: 'Nenhum kds encontrado',
  description: 'A empresa ativa ainda nao possui devices cadastrados neste filtro.',
};

const displayDeviceType = {
  key: DISPLAY_DEVICE_TYPE,
  label: 'KDS',
  itemLabel: 'KDS',
  icon: 'monitor',
  matches: type => normalizeDeviceType(type) === DISPLAY_DEVICE_TYPE,
  shouldDisplay: () => true,
  getAccent: ({brandColors, hex}) => brandColors?.primary || hex.primary,
  getEmptyState: () => emptyState,
  TabComponent: createDeviceTypeTab({
    label: 'KDS',
    queryTypes: [DISPLAY_DEVICE_TYPE],
    emptyState,
  }),
};

export default displayDeviceType;
