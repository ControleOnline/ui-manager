import {getDeviceTypeLabel, normalizeDeviceType} from '@controleonline/ui-common/src/react/utils/printerDevices';

import allDeviceType from './all';
import deviceDeviceType from './device';
import displayDeviceType from './display';
import ipCameraDeviceType from './ipCamera';
import pdvDeviceType, {
  pdvCieloDeviceType,
  pdvInfinitePayDeviceType,
} from './pdv';
import printerDeviceType from './printer';
import {createDeviceTypeTab} from './shared';

const registeredDeviceTypes = [
  allDeviceType,
  pdvDeviceType,
  pdvCieloDeviceType,
  pdvInfinitePayDeviceType,
  displayDeviceType,
  printerDeviceType,
  ipCameraDeviceType,
  deviceDeviceType,
];

const deviceTypesByKey = registeredDeviceTypes.reduce((acc, deviceType) => {
  acc[deviceType.key] = deviceType;
  return acc;
}, {});

const matchedDeviceTypes = [
  pdvDeviceType,
  displayDeviceType,
  printerDeviceType,
  ipCameraDeviceType,
  deviceDeviceType,
];

export const ALL_DEVICE_FILTER = allDeviceType.key;
export const PRINTER_DEVICE_FILTER = printerDeviceType.key;

const createRuntimeDeviceType = filterKey => {
  const normalizedType = normalizeDeviceType(filterKey);
  const emptyState = {
    icon: 'cpu',
    title: `Nenhum ${getDeviceTypeLabel(normalizedType).toLowerCase()} encontrado`,
    description:
      'A empresa ativa ainda nao possui devices cadastrados neste filtro.',
  };

  return {
    key: normalizedType,
    label: getDeviceTypeLabel(normalizedType),
    itemLabel: getDeviceTypeLabel(normalizedType),
    icon: 'cpu',
    shouldDisplay: () => true,
    getAccent: ({hex}) => hex.warning,
    getEmptyState: () => emptyState,
    TabComponent: createDeviceTypeTab({
      label: getDeviceTypeLabel(normalizedType),
      queryTypes: [normalizedType],
      emptyState,
    }),
  };
};

const resolveDeviceTypeDefinition = type => {
  const normalizedType = normalizeDeviceType(type);

  if (!normalizedType) {
    return deviceDeviceType;
  }

  return (
    matchedDeviceTypes.find(deviceType => deviceType.matches(normalizedType)) ||
    createRuntimeDeviceType(normalizedType)
  );
};

export const resolveDeviceFilterKey = type =>
  resolveDeviceTypeDefinition(type).key;

export const getDeviceFilterDefinition = filterKey =>
  deviceTypesByKey[filterKey] || createRuntimeDeviceType(filterKey);

export const getDeviceFilterIcon = filterKey =>
  getDeviceFilterDefinition(filterKey).icon;

export const getDeviceFilterAccent = (filterKey, context = {}) =>
  getDeviceFilterDefinition(filterKey).getAccent(context);

export const getDeviceDetailRoute = type =>
  resolveDeviceTypeDefinition(type).detailRouteName || 'DeviceDetail';

export const getDeviceCreationAction = filterKey => {
  const deviceType = getDeviceFilterDefinition(filterKey);

  if (!deviceType.createRouteName) {
    return null;
  }

  return {
    routeName: deviceType.createRouteName,
    label: deviceType.createActionLabel,
    helperText: deviceType.createHelperText,
  };
};

export const getDeviceItemTypeLabel = type => {
  const normalizedType = normalizeDeviceType(type);
  const deviceType = resolveDeviceTypeDefinition(normalizedType);

  return deviceType.itemLabel || getDeviceTypeLabel(normalizedType);
};

export const getDeviceFilterOptions = () =>
  registeredDeviceTypes
    .filter(deviceType => deviceType.shouldDisplay())
    .map(deviceType => ({
      key: deviceType.key,
      label: deviceType.label,
      icon: deviceType.icon,
    }));

export const getDeviceEmptyState = ({activeFilter} = {}) =>
  getDeviceFilterDefinition(activeFilter).getEmptyState();
