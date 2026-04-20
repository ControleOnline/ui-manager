import {createDeviceTypeTab} from './shared';

const emptyState = {
  icon: 'monitor',
  title: 'Nenhum dispositivo encontrado',
  description: 'Cadastre dispositivos para visualizar os equipamentos da empresa.',
};

const allDeviceType = {
  key: 'ALL',
  label: 'Todos',
  icon: 'layers',
  shouldDisplay: () => true,
  getAccent: ({brandColors, hex}) => brandColors?.primary || hex.primary,
  getEmptyState: () => emptyState,
  TabComponent: createDeviceTypeTab({
    label: 'Todos os dispositivos',
    emptyState,
  }),
};

export default allDeviceType;
