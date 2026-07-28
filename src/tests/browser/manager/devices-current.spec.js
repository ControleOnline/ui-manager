const {expect, test} = require('playwright/test');
const packageJson = require('../../../../../../../package.json');
const {API_ORIGIN} = require('../../../../../../../src/tests/browser/apiOrigin');

const APP_VERSION = packageJson?.version || '1.0.0';
const CURRENT_DEVICE_ID = 'web-7';

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers':
    'API-TOKEN, APP-DOMAIN, DEVICE, ACCEPT, CONTENT-TYPE, X-Requested-With',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};

const jsonHeaders = () => ({
  ...CORS_HEADERS,
  'content-type': 'application/ld+json; charset=utf-8',
});

const collection = member => ({
  member,
  'hydra:member': member,
  totalItems: member.length,
  'hydra:totalItems': member.length,
  summary: {},
});

const currentDevice = {
  '@id': '/devices/396',
  '@type': 'Device',
  id: 396,
  device: CURRENT_DEVICE_ID,
  alias: 'Caixa atual',
  metadata: {
    runtime: 'web',
    network: {
      publicIp: '127.0.0.1',
    },
  },
};

const remoteDevice = {
  '@id': '/devices/410',
  '@type': 'Device',
  id: 410,
  device: 'remote-pdv',
  alias: 'Caixa remoto',
  metadata: {
    runtime: 'android',
  },
};

const createDeviceConfig = ({
  id,
  type,
  device = currentDevice,
}) => ({
  '@id': `/device_configs/${id}`,
  '@type': 'DeviceConfig',
  id,
  type,
  people: '/people/3',
  device,
  configs: JSON.stringify({
    'config-version': APP_VERSION,
    'pos-gateway': 'infinite-pay',
  }),
});

const mockDevicesApi = async (page, {includeCurrentPdv}) => {
  const company = {
    id: 3,
    name: 'Teste',
    alias: 'TESTE',
    panel_enabled: true,
    enabled: true,
    commercial_enabled: true,
    theme: {
      colors: {
        primary: '#0EA5E9',
        cardBackground: '#FFFFFF',
        cardBorder: '#D8E0EA',
        cardSelectedBackground: '#E8F8FD',
        cardSelectedBorder: '#0284C7',
        cardSelectedText: '#0F172A',
        badgeSelectedBackground: '#CDEFFA',
        badgeSelectedText: '#075985',
      },
    },
  };
  const managerConfig = createDeviceConfig({id: 487, type: 'MANAGER'});
  const currentPdvConfig = createDeviceConfig({id: 488, type: 'PDV'});
  const remotePdvConfig = createDeviceConfig({
    id: 410,
    type: 'PDV',
    device: remoteDevice,
  });
  const deviceConfigs = [
    remotePdvConfig,
    managerConfig,
    ...(includeCurrentPdv ? [currentPdvConfig] : []),
  ];
  const savedPdvRequests = [];

  await page.route(`${API_ORIGIN}/**`, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/^\/+/, '');
    const method = request.method().toUpperCase();

    if (method === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: CORS_HEADERS,
        body: '',
      });
    }

    if (pathname === 'themes-colors.css') {
      return route.fulfill({
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'content-type': 'text/css; charset=utf-8',
        },
        body: ':root { --primary: #0ea5e9; }',
      });
    }

    if (pathname === 'runtime/ip') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({ip: '127.0.0.1'}),
      });
    }

    if (pathname === 'menus-people') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({modules: {}}),
      });
    }

    if (pathname === 'people/companies/my') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection([company])),
      });
    }

    if (pathname === 'people/company/default') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(company),
      });
    }

    if (pathname === 'configs/discovery-configs') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({configs: {}}),
      });
    }

    if (pathname === 'devices' && method === 'GET') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection([currentDevice])),
      });
    }

    if (pathname === 'devices' && method === 'POST') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(currentDevice),
      });
    }

    if (pathname === 'device_configs' && method === 'GET') {
      const requestedDevice = url.searchParams.get('device.device');
      const requestedType = url.searchParams.get('type');
      const filtered = deviceConfigs.filter(deviceConfig => {
        if (
          requestedDevice &&
          deviceConfig.device.device !== requestedDevice
        ) {
          return false;
        }

        if (requestedType && deviceConfig.type !== requestedType) {
          return false;
        }

        return true;
      });

      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection(filtered)),
      });
    }

    if (pathname === 'device_configs/add-configs' && method === 'POST') {
      const payload = request.postDataJSON();
      const type = String(payload?.type || '').toUpperCase();
      const savedDeviceConfig = createDeviceConfig({
        id: type === 'PDV' ? 489 : 490,
        type: type || 'MANAGER',
      });

      if (type === 'PDV') {
        savedPdvRequests.push(payload);
        deviceConfigs.push(savedDeviceConfig);
      }

      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(savedDeviceConfig),
      });
    }

    return route.fulfill({
      status: 200,
      headers: jsonHeaders(),
      body: JSON.stringify(collection([])),
    });
  });

  await page.addInitScript(
    ({appVersion}) => {
      localStorage.setItem(
        'session',
        JSON.stringify({
          id: 7,
          people: '/people/7',
          api_key: 'test-api-key',
          active: 1,
          mycompany: 3,
          roles: ['ROLE_SUPER'],
        }),
      );
      localStorage.setItem('config', JSON.stringify({language: 'pt-br'}));
      localStorage.setItem(
        'device',
        JSON.stringify({
          id: 'web-7',
          device: 'web-7',
          type: 'MANAGER',
          appName: 'Browser Manager',
          appVersion,
          buildNumber: appVersion,
          systemName: 'web',
          systemVersion: 'web',
          deviceType: 'web',
          metadata: {
            runtime: 'web',
          },
        }),
      );
    },
    {appVersion: APP_VERSION},
  );

  return {savedPdvRequests};
};

test.describe('current device browser smoke', () => {
  test('groups every profile under one highlighted current Device', async ({
    page,
  }) => {
    await mockDevicesApi(page, {includeCurrentPdv: true});

    await page.goto('/devices-index?store=device_config');

    await expect(page.getByTestId('current-device-badge')).toHaveCount(1);
    await expect(page.getByTestId('device-config-487')).toBeVisible();
    await expect(page.getByTestId('device-config-488')).toBeVisible();
    await expect(page.getByTestId('device-config-410')).toBeVisible();
    await expect(page.getByTestId('device-config-488')).toContainText(
      'PDV · Infinite Pay',
    );
    await expect(
      page.getByTestId('configure-current-device-pdv'),
    ).toHaveCount(0);

    const groups = page.locator('[data-testid^="device-group-"]');
    await expect(groups).toHaveCount(2);
    await expect(groups.first()).toContainText('Caixa atual');
    await expect(page.getByTestId('device-config-487')).toHaveAttribute(
      'data-session-config',
      'true',
    );
  });

  test('opens the detail for the selected configuration profile', async ({
    page,
  }) => {
    await mockDevicesApi(page, {includeCurrentPdv: true});

    await page.goto('/devices-index?store=device_config');

    await page.getByTestId('device-config-487').click();
    await expect(page).toHaveURL(/device-detail/);
    await expect(page.getByText('Configuração do PDV')).toHaveCount(0);

    await page.goBack();
    await expect(page.getByTestId('device-config-488')).toBeVisible();
    await page.getByTestId('device-config-488').click();

    await expect(page).toHaveURL(/device-detail/);
    await expect(page.getByText('Configuração do PDV')).toBeVisible();
  });

  test('creates the missing PDV profile for the current device', async ({
    page,
  }) => {
    const api = await mockDevicesApi(page, {includeCurrentPdv: false});

    await page.goto('/devices-index?store=device_config');

    const setupButton = page.getByTestId('configure-current-device-pdv');
    await expect(setupButton).toBeVisible();
    await setupButton.click();

    await expect.poll(() => api.savedPdvRequests.length).toBe(1);
    expect(api.savedPdvRequests[0]).toEqual(
      expect.objectContaining({
        device: CURRENT_DEVICE_ID,
        people: '/people/3',
        type: 'PDV',
      }),
    );
  });
});
