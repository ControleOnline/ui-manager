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
  name: 'Produto Exemplo',
  alias: 'EXEMPLO',
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

const createMenuConfigResponse = () => ({
  member: [],
  summary: {
    appTypes: ['ADMIN', 'MANAGER', 'CRM', 'POS', 'DELIVERY', 'PPC', 'SHOP', 'SERVICE'],
    linkTypes: ['owner', 'director', 'manager', 'employee', 'salesman', 'after-sales'],
    categories: [],
    routes: [],
  },
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
        {
          id: 'cron_jobs',
          menuKey: 'cron_jobs',
          label: 'Jobs agendados',
          route: 'CronJobsPage',
          icon: 'clock',
          color: '#F59E0B',
          sortOrder: 15,
          menuType: 'home',
        },
        {
          id: 'test_results',
          menuKey: 'test_results',
          label: 'Resultados de testes',
          route: 'TestsPlaygroundPage',
          icon: 'clipboard',
          color: '#0EA5E9',
          sortOrder: 20,
          menuType: 'home',
        },
        {
          id: 'tenancies',
          menuKey: 'tenancies',
          label: 'Tenancies',
          route: 'TenanciesPage',
          icon: 'server',
          color: '#0F766E',
          sortOrder: 25,
          menuType: 'home',
        },
        {
          id: 'people_domains',
          menuKey: 'people_domains',
          label: 'Domínios',
          route: 'PeopleDomainsPage',
          icon: 'globe',
          color: '#0EA5E9',
          sortOrder: 30,
          menuType: 'home',
        },
      ],
    },
  },
});

const createSmokeIndexResponse = () => ({
  generatedAt: '2026-07-11T13:11:24-03:00',
  status: 'idle',
  progress: 0,
  message: 'Nenhum relatório publicado ainda.',
  lastRunAt: null,
  summary: {
    types: {total: 0, passed: 0, failed: 0},
    suites: {total: 0, passed: 0, failed: 0},
    tests: {total: 0, passed: 0, failed: 0},
  },
  types: [],
  suites: [],
  links: {
    self: '/tests',
    artifacts: '/tests/artifacts',
  },
});

const mockAdminApi = async page => {
  const company = createCompany();

  await page.route(`${API_ORIGIN}/**`, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/^\/+/, '');

    if (request.method().toUpperCase() === 'OPTIONS') {
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

    if (pathname === 'menu-config') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(createMenuConfigResponse()),
      });
    }

    if (pathname === 'configs/discovery-configs') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({configs: {}}),
      });
    }

    if (pathname === 'tests') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(createSmokeIndexResponse()),
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
    {appVersion: '1.0.0'},
  );
};

const openAdminHome = async page => {
  await page.goto('/');

  await expect(page.getByRole('button', {name: 'Selecionar tipo de app'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Selecionar tipo de app'})).toContainText(
    'ADMIN',
  );
};

const switchAppType = async (page, appType) => {
  await page.getByRole('button', {name: 'Selecionar tipo de app'}).click();
  await expect(page.getByRole('button', {name: appType})).toBeVisible();
  await page.getByRole('button', {name: appType}).click();
  await page.waitForLoadState('domcontentloaded');
};

const expectAppTypeAfterRefresh = async (page, appType, marker) => {
  await page.reload({waitUntil: 'domcontentloaded'});

  await expect(page.getByRole('button', {name: 'Selecionar tipo de app'})).toContainText(
    appType,
  );

  if (marker) {
    await expect(page.getByText(marker, {exact: true})).toBeVisible();
  }
};

test.describe('admin browser smoke', () => {
  test('loads the admin shell from the app_type selector and keeps it after refresh', async ({
    page,
  }) => {
    await mockAdminApi(page);

    await openAdminHome(page);
    await expect(page.getByText(/Jobs agendados/i)).toBeVisible();
    await expect(page.getByRole('button', {name: 'Voltar para ADMIN'})).toHaveCount(0);
    await page.goto('/tests-playground');
    await page.waitForURL(/\/tests-playground\/?$/);
    await expect(page.getByText('Smoke Atlas', {exact: true})).toBeVisible({
      timeout: 15000,
    });

    await page.reload({waitUntil: 'domcontentloaded'});

    await expect(page.getByRole('button', {name: 'Selecionar tipo de app'})).toContainText(
      'ADMIN',
    );
  });

  test('switches to manager and can return to admin through the reset path', async ({
    page,
  }) => {
    await mockAdminApi(page);

    await openAdminHome(page);
    await switchAppType(page, 'MANAGER');
    await expectAppTypeAfterRefresh(page, 'MANAGER', `web • MANAGER (127.0.0.1) / v${appVersion}`);
    await expect(page.getByRole('button', {name: 'Voltar para ADMIN'})).toBeVisible();

    await page.getByRole('button', {name: 'Voltar para ADMIN'}).click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('button', {name: 'Selecionar tipo de app'})).toContainText(
      'ADMIN',
    );
  });

  for (const {appType, marker} of [
    {appType: 'SERVICE', marker: 'Operacional'},
    {appType: 'DELIVERY', marker: 'Cadastro do veículo'},
    {appType: 'SHOP', marker: 'Nenhuma entrada do shop esta disponivel'},
    {appType: 'POS', marker: `web • PDV (127.0.0.1) / v${appVersion}`},
    {appType: 'PPC', marker: `web • DISPLAY (127.0.0.1) / v${appVersion}`},
    {appType: 'CRM', marker: `web • CRM (127.0.0.1) / v${appVersion}`},
  ]) {
    test(`switches to ${appType} and keeps it after refresh`, async ({page}) => {
      await mockAdminApi(page);

      await openAdminHome(page);
      await switchAppType(page, appType);
      await expectAppTypeAfterRefresh(page, appType, marker);
      await expect(page.getByRole('button', {name: 'Voltar para ADMIN'})).toBeVisible();
    });
  }

  test('opens menu config directly from the admin build', async ({page}) => {
    await mockAdminApi(page);

    await page.goto('/menu-access-config-page');

    await expect(page.getByRole('heading', {name: 'Menus por perfil'})).toBeVisible();
    await expect(page.getByText('APP_TYPE', {exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Selecionar tipo de app'})).toContainText(
      'ADMIN',
    );
    await expect(
      page.getByText('Nenhum menu cadastrado para este APP_TYPE.', {exact: true}),
    ).toBeVisible();
  });
});
