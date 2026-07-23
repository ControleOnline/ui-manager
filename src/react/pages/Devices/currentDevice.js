import {PDV_DEVICE_TYPE, normalizeDeviceType} from '@controleonline/ui-common/src/react/utils/printerDevices';
import {
  normalizeDeviceId,
  normalizeEntityId,
} from '@controleonline/ui-common/src/react/utils/paymentDevices';

export const readStoredRuntimeDevice = (storage = globalThis?.localStorage) => {
  if (!storage || typeof storage.getItem !== 'function') {
    return {};
  }

  try {
    const storedDevice = JSON.parse(storage.getItem('device') || '{}');
    return storedDevice && typeof storedDevice === 'object'
      ? storedDevice
      : {};
  } catch {
    return {};
  }
};

export const getRuntimeDeviceIdentifier = runtimeDevice =>
  normalizeDeviceId(runtimeDevice?.id || runtimeDevice?.device);

export const getDeviceConfigIdentifier = deviceConfig =>
  normalizeDeviceId(deviceConfig?.device?.device);

export const isCurrentDeviceConfig = ({
  deviceConfig,
  runtimeDeviceIdentifier,
}) =>
  Boolean(
    runtimeDeviceIdentifier &&
      getDeviceConfigIdentifier(deviceConfig) ===
        normalizeDeviceId(runtimeDeviceIdentifier),
  );

export const prioritizeCurrentDeviceConfigs = (
  deviceConfigs = [],
  runtimeDeviceIdentifier = '',
) => {
  const current = [];
  const remaining = [];

  (Array.isArray(deviceConfigs) ? deviceConfigs : []).forEach(deviceConfig => {
    if (isCurrentDeviceConfig({deviceConfig, runtimeDeviceIdentifier})) {
      current.push(deviceConfig);
      return;
    }

    remaining.push(deviceConfig);
  });

  return [...current, ...remaining];
};

export const filterDeviceConfigsByTypes = (
  deviceConfigs = [],
  queryTypes = [],
) => {
  const normalizedTypes = (Array.isArray(queryTypes) ? queryTypes : [])
    .map(normalizeDeviceType)
    .filter(Boolean);

  if (normalizedTypes.length === 0) {
    return Array.isArray(deviceConfigs) ? deviceConfigs : [];
  }

  return (Array.isArray(deviceConfigs) ? deviceConfigs : []).filter(
    deviceConfig =>
      normalizedTypes.includes(normalizeDeviceType(deviceConfig?.type)),
  );
};

export const hasCurrentPdvConfig = (
  deviceConfigs = [],
  runtimeDeviceIdentifier = '',
) =>
  (Array.isArray(deviceConfigs) ? deviceConfigs : []).some(
    deviceConfig =>
      isCurrentDeviceConfig({deviceConfig, runtimeDeviceIdentifier}) &&
      normalizeDeviceType(deviceConfig?.type) === PDV_DEVICE_TYPE,
  );

export const getDeviceGroupKey = device => {
  const entityId = normalizeEntityId(
    device?.id || device?.['@id'] || device?.entityId || device?.entityIri,
  );

  if (entityId) {
    return `device:${entityId}`;
  }

  const identifier = normalizeDeviceId(device?.device || device?.id);
  return identifier ? `identifier:${identifier}` : '';
};

const createRuntimeDevice = runtimeDevice => ({
  id:
    runtimeDevice?.entityId ||
    runtimeDevice?.entityIri ||
    runtimeDevice?.databaseId ||
    null,
  device: getRuntimeDeviceIdentifier(runtimeDevice),
  alias:
    runtimeDevice?.alias ||
    runtimeDevice?.deviceName ||
    runtimeDevice?.modelName ||
    runtimeDevice?.model ||
    'Este dispositivo',
  metadata: runtimeDevice?.metadata || {},
});

export const groupDeviceConfigs = (
  deviceConfigs = [],
  {includeRuntimeDevice = false, runtimeDevice = {}} = {},
) => {
  const groupsByKey = new Map();

  (Array.isArray(deviceConfigs) ? deviceConfigs : []).forEach(deviceConfig => {
    const device = deviceConfig?.device || {};
    const key =
      getDeviceGroupKey(device) ||
      `config:${normalizeEntityId(deviceConfig?.id || deviceConfig?.['@id'])}`;

    if (!groupsByKey.has(key)) {
      groupsByKey.set(key, {
        key,
        device,
        deviceConfigs: [],
      });
    }

    groupsByKey.get(key).deviceConfigs.push(deviceConfig);
  });

  if (includeRuntimeDevice) {
    const runtimeIdentifier = getRuntimeDeviceIdentifier(runtimeDevice);
    const matchingGroup = [...groupsByKey.values()].find(
      group =>
        normalizeDeviceId(group?.device?.device) === runtimeIdentifier,
    );

    if (!matchingGroup && runtimeIdentifier) {
      const device = createRuntimeDevice(runtimeDevice);
      const key = getDeviceGroupKey(device) || `identifier:${runtimeIdentifier}`;
      groupsByKey.set(key, {
        key,
        device,
        deviceConfigs: [],
      });
    }
  }

  return [...groupsByKey.values()];
};

export const isCurrentDeviceGroup = ({
  deviceGroup,
  runtimeDeviceIdentifier,
}) =>
  Boolean(
    runtimeDeviceIdentifier &&
      normalizeDeviceId(deviceGroup?.device?.device) ===
        normalizeDeviceId(runtimeDeviceIdentifier),
  );

export const prioritizeCurrentDeviceGroups = (
  deviceGroups = [],
  runtimeDeviceIdentifier = '',
) => {
  const current = [];
  const remaining = [];

  (Array.isArray(deviceGroups) ? deviceGroups : []).forEach(deviceGroup => {
    if (isCurrentDeviceGroup({deviceGroup, runtimeDeviceIdentifier})) {
      current.push(deviceGroup);
      return;
    }

    remaining.push(deviceGroup);
  });

  return [...current, ...remaining];
};

export const findDeviceConfigByType = (deviceGroup, type) => {
  const normalizedType = normalizeDeviceType(type);

  return (deviceGroup?.deviceConfigs || []).find(
    deviceConfig =>
      normalizeDeviceType(deviceConfig?.type) === normalizedType,
  );
};
