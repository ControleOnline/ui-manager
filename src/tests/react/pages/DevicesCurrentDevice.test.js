/* global describe, expect, it, jest */

jest.mock(
  '@controleonline/ui-common/src/react/utils/printerDevices',
  () => ({
    PDV_DEVICE_TYPE: 'PDV',
    normalizeDeviceType: value =>
      String(value || '')
        .trim()
        .toUpperCase(),
  }),
);

jest.mock(
  '@controleonline/ui-common/src/react/utils/paymentDevices',
  () => ({
    normalizeDeviceId: value => String(value || '').trim(),
    normalizeEntityId: value =>
      String(value || '')
        .replace(/\D+/g, '')
        .trim(),
  }),
);

const {
  findDeviceConfigByType,
  filterDeviceConfigsByTypes,
  getRuntimeDeviceIdentifier,
  groupDeviceConfigs,
  hasCurrentPdvConfig,
  isCurrentDeviceConfig,
  isCurrentDeviceGroup,
  prioritizeCurrentDeviceGroups,
  prioritizeCurrentDeviceConfigs,
  readStoredRuntimeDevice,
} = require('../../../react/pages/Devices/currentDevice');

const currentManager = {
  id: 487,
  type: 'MANAGER',
  device: {
    id: 396,
    device: '0d1bea46f3d93f07',
    alias: 'Caixa',
  },
};

const currentPdv = {
  id: 488,
  type: 'PDV',
  device: {
    id: 396,
    device: '0d1bea46f3d93f07',
    alias: 'Caixa',
  },
};

const remotePdv = {
  id: 410,
  type: 'PDV',
  device: {
    id: 380,
    device: '61378bea41ff1712',
    alias: 'Outro caixa',
  },
};

describe('current device profiles', () => {
  it('reads the runtime identity from persisted device storage', () => {
    const storage = {
      getItem: jest.fn(() =>
        JSON.stringify({
          id: '0d1bea46f3d93f07',
          type: 'MANAGER',
        }),
      ),
    };

    const runtimeDevice = readStoredRuntimeDevice(storage);

    expect(getRuntimeDeviceIdentifier(runtimeDevice)).toBe(
      '0d1bea46f3d93f07',
    );
  });

  it('does not fail when persisted device storage is invalid', () => {
    const storage = {
      getItem: jest.fn(() => '{invalid'),
    };

    expect(readStoredRuntimeDevice(storage)).toEqual({});
  });

  it('recognizes every operational profile of the same physical device', () => {
    const runtimeDeviceIdentifier = '0d1bea46f3d93f07';

    expect(
      isCurrentDeviceConfig({
        deviceConfig: currentManager,
        runtimeDeviceIdentifier,
      }),
    ).toBe(true);
    expect(
      isCurrentDeviceConfig({
        deviceConfig: currentPdv,
        runtimeDeviceIdentifier,
      }),
    ).toBe(true);
    expect(
      isCurrentDeviceConfig({
        deviceConfig: remotePdv,
        runtimeDeviceIdentifier,
      }),
    ).toBe(false);
  });

  it('pins all current profiles before remote devices without changing their order', () => {
    expect(
      prioritizeCurrentDeviceConfigs(
        [remotePdv, currentManager, currentPdv],
        '0d1bea46f3d93f07',
      ).map(item => item.id),
    ).toEqual([487, 488, 410]);
  });

  it('keeps only current PDV profiles when the PDV filter is active', () => {
    expect(
      filterDeviceConfigsByTypes(
        [currentManager, currentPdv],
        ['PDV'],
      ).map(item => item.id),
    ).toEqual([488]);
  });

  it('offers PDV setup only until the current physical device has a PDV profile', () => {
    expect(
      hasCurrentPdvConfig(
        [currentManager, remotePdv],
        '0d1bea46f3d93f07',
      ),
    ).toBe(false);
    expect(
      hasCurrentPdvConfig(
        [currentManager, currentPdv, remotePdv],
        '0d1bea46f3d93f07',
      ),
    ).toBe(true);
  });

  it('groups every configuration of the same Device into one card', () => {
    const groups = groupDeviceConfigs([
      remotePdv,
      currentManager,
      currentPdv,
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.find(group => group.key === 'device:396').deviceConfigs)
      .toEqual([currentManager, currentPdv]);
  });

  it('pins the current Device once and resolves the session configuration by type', () => {
    const groups = prioritizeCurrentDeviceGroups(
      groupDeviceConfigs([remotePdv, currentManager, currentPdv]),
      '0d1bea46f3d93f07',
    );

    expect(groups[0].key).toBe('device:396');
    expect(
      isCurrentDeviceGroup({
        deviceGroup: groups[0],
        runtimeDeviceIdentifier: '0d1bea46f3d93f07',
      }),
    ).toBe(true);
    expect(findDeviceConfigByType(groups[0], 'PDV')).toBe(currentPdv);
  });

  it('creates a synthetic current Device group when it has no configuration yet', () => {
    const groups = groupDeviceConfigs([remotePdv], {
      includeRuntimeDevice: true,
      runtimeDevice: {
        id: 'new-device',
        alias: 'Nova maquininha',
        type: 'MANAGER',
      },
    });

    expect(groups).toHaveLength(2);
    expect(groups[1]).toMatchObject({
      key: 'identifier:new-device',
      device: {
        device: 'new-device',
        alias: 'Nova maquininha',
      },
      deviceConfigs: [],
    });
  });
});
