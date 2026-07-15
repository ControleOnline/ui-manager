const {expect, test} = require('playwright/test');
const packageJson = require('../../../../../../../package.json');
const {API_ORIGIN} = require('../../../../../../../src/tests/browser/apiOrigin');

const APP_VERSION = packageJson?.version || '1.0.0';

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

const textHeaders = () => ({
  ...CORS_HEADERS,
  'content-type': 'text/css; charset=utf-8',
});

const collection = (member = []) => ({
  member,
  'hydra:member': member,
  totalItems: member.length,
  'hydra:totalItems': member.length,
  summary: {},
});

const createCompany = (configs = {}) => ({
  id: 3,
  name: 'Gyros',
  alias: 'GYROS',
  panel_enabled: true,
  enabled: true,
  commercial_enabled: true,
  theme: {
    colors: {
      primary: '#0EA5E9',
      secondary: '#F97316',
    },
  },
  configs,
});

const normalizeConfigValue = value => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
};

/*
 * @agents This smoke keeps the settings screen on the selected tab after refresh
 * and verifies text inputs persist through blur without a save button.
 */
const mockGeneralSettingsApi = async (page, {activeTab = 'maps'} = {}) => {
  const companyConfigs = {
    'web-google-maps-api-key': 'saved-web-key',
    'android-google-maps-api-key': '',
  };
  const privateConfigs = {};
  const company = createCompany(companyConfigs);
  const savedConfigRequests = [];

  const persistConfigs = payload => {
    const entries = Array.isArray(payload?.configs) ? payload.configs : [];

    entries.forEach(entry => {
      const key = String(entry?.configKey || '').trim();
      if (!key) {
        return;
      }

      companyConfigs[key] = normalizeConfigValue(entry?.configValue);
      company.configs = {...companyConfigs};
    });
  };

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
        headers: textHeaders(),
        body: ':root { --primary: #0ea5e9; --secondary: #f97316; }',
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
        body: JSON.stringify({configs: {...companyConfigs}}),
      });
    }

    if (pathname === 'configs' && method === 'GET') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection(Object.entries(privateConfigs).map(([configKey, configValue], index) => ({
          id: index + 1,
          configKey,
          configValue,
        })))),
      });
    }

    if (
      pathname === 'configs/add-many-configs' ||
      pathname === 'configs/add-configs'
    ) {
      const payload = request.postDataJSON();
      savedConfigRequests.push(payload);
      persistConfigs(payload);

      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({}),
      });
    }

    return route.fulfill({
      status: 200,
      headers: jsonHeaders(),
      body: JSON.stringify(collection([])),
    });
  });

  await page.addInitScript(
    ({appVersion, activeTab: initialActiveTab}) => {
      const setLocalStorageItem = (key, value) => {
        try {
          localStorage.setItem(key, value);
        } catch {
          // Some initial documents (like about:blank) do not expose storage.
        }
      };

      setLocalStorageItem(
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
      setLocalStorageItem('config', JSON.stringify({language: 'pt-br'}));
      setLocalStorageItem('app-type', 'MANAGER');
      setLocalStorageItem(
        'device',
        JSON.stringify({
          id: 'web-manager',
          device: 'web-manager',
          type: 'WEB',
          appName: 'Browser Manager',
          appVersion,
          buildNumber: appVersion,
          systemName: 'web',
          systemVersion: 'web',
          deviceType: 'web',
          metadata: {},
        }),
      );
      setLocalStorageItem(
        'controleonline.general-settings.active-tab',
        initialActiveTab,
      );
    },
    {appVersion: APP_VERSION, activeTab},
  );

  return {
    savedConfigRequests,
    companyConfigs,
  };
};

test.describe('general settings browser smoke', () => {
  test('keeps the stored integrations tab after refresh', async ({page}) => {
    await mockGeneralSettingsApi(page, {activeTab: 'integrations'});

    await page.goto('/general-settings');

    await expect(
      page.getByPlaceholder('1234567890-abc123def456.apps.googleusercontent.com'),
    ).toBeVisible();
    await expect(page.getByPlaceholder('Cole a chave do Google Maps para web')).toHaveCount(0);

    await page.reload({waitUntil: 'domcontentloaded'});

    await expect(
      page.getByPlaceholder('1234567890-abc123def456.apps.googleusercontent.com'),
    ).toBeVisible();
    await expect(page.getByPlaceholder('Cole a chave do Google Maps para web')).toHaveCount(0);
  });

  test('saves map settings on blur without a save button', async ({page}) => {
    const api = await mockGeneralSettingsApi(page, {activeTab: 'maps'});

    await page.goto('/general-settings');

    await expect(page.getByPlaceholder('Cole a chave do Google Maps para web')).toBeVisible();
    await expect(page.getByRole('button', {name: /^Salvar/})).toHaveCount(0);

    await page.getByPlaceholder('Cole a chave do Google Maps para web').fill(
      'https://maps.example.com/api-key',
    );

    const saveRequestPromise = page.waitForRequest(request => {
      return (
        request.url().includes('/configs/add-many-configs') &&
        request.method().toUpperCase() === 'POST'
      );
    });

    await page.keyboard.press('Tab');
    await saveRequestPromise;
    await expect.poll(() => api.savedConfigRequests.length).toBe(1);
    expect(JSON.stringify(api.savedConfigRequests[0])).toContain(
      'web-google-maps-api-key',
    );
    expect(JSON.stringify(api.savedConfigRequests[0])).toContain(
      'https://maps.example.com/api-key',
    );
    expect(api.companyConfigs['web-google-maps-api-key']).toBe(
      'https://maps.example.com/api-key',
    );
  });
});
