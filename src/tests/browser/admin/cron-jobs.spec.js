const {expect, test} = require('playwright/test');
const {API_ORIGIN} = require('../../../../../../../src/tests/browser/apiOrigin');
const {version: appVersion} = require('../../../../../../../package.json');

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers':
    'API-TOKEN, APP-DOMAIN, DEVICE, ACCEPT, CONTENT-TYPE, X-Requested-With',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};

const collection = (member = [], summary = {}) => ({
  member,
  'hydra:member': member,
  totalItems: member.length,
  'hydra:totalItems': member.length,
  summary,
});

const jsonHeaders = () => ({
  ...CORS_HEADERS,
  'content-type': 'application/ld+json; charset=utf-8',
});

const textHeaders = () => ({
  ...CORS_HEADERS,
  'content-type': 'text/css; charset=utf-8',
});

const createCompany = () => ({
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
  configs: {},
});

const createCronJobsResponse = () => ({
  member: [
    {
      id: 1,
      jobKey: 'websocket_start',
      title: 'Servidor WebSocket',
      description: 'Mantem o servidor WebSocket da API ativo.',
      enabled: true,
      cronExpression: '* * * * *',
      command: 'websocket:start',
      arguments: ['--domain=api.controleonline.com', '-p', '8080', '-b', '0.0.0.0'],
      background: true,
      sortOrder: 10,
      isValid: true,
    },
  ],
  summary: {},
});

const createAdminRuntimeMenusResponse = () => ({
  modules: {
    configuracoes: {
      id: 'admin-configuracoes',
      label: 'Configuracoes',
      icon: 'settings',
      menus: [
        {
          id: 'menu_access',
          menuKey: 'menu_access',
          label: 'Menus por perfil',
          route: 'MenuAccessConfigPage',
          icon: 'list',
          color: '#64748B',
          sortOrder: 10,
          menuType: 'home',
        },
      ],
    },
  },
});

const mockCronJobsApi = async page => {
  const company = createCompany();

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

    if (pathname === 'menus-people') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(createAdminRuntimeMenusResponse()),
      });
    }

    if (pathname === 'configs/discovery-configs') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({configs: {}}),
      });
    }

    if (pathname === 'cron_jobs') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(createCronJobsResponse()),
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
      setLocalStorageItem('app-type', 'ADMIN');
      setLocalStorageItem(
        'device',
        JSON.stringify({
          id: 'web-admin',
          device: 'web-admin',
          type: 'WEB',
          appName: 'Browser Admin',
          appVersion,
          buildNumber: appVersion,
          systemName: 'web',
          systemVersion: 'web',
          deviceType: 'web',
          metadata: {},
        }),
      );
    },
    {appVersion},
  );
};

test.describe('cron jobs browser smoke', () => {
  test('renders the admin cron jobs page', async ({page}) => {
    await mockCronJobsApi(page);

    await page.goto('/cron-jobs');

    await expect(page.getByText('Jobs agendados')).toBeVisible();
    await expect(page.getByText('Servidor WebSocket')).toBeVisible();
    await expect(page.getByText('websocket:start')).toBeVisible();
    await expect(page.getByRole('button', {name: /^Adicionar$/})).toBeVisible();
  });
});
