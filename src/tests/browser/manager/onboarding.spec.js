const {expect, test} = require('playwright/test');
const {API_ORIGIN} = require('../../../../../../../src/tests/browser/apiOrigin');
const {version: appVersion} = require('../../../../../../../package.json');

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

const collection = (member = []) => ({
  member,
  'hydra:member': member,
  totalItems: member.length,
  'hydra:totalItems': member.length,
});

const company = {
  id: 42,
  name: 'Santa Redonda Pizzas e Lanches',
  alias: 'SANTA_REDONDA',
  enabled: true,
  panel_enabled: true,
  commercial_enabled: true,
  configs: {},
  theme: {colors: {primary: '#DC2626'}},
};

const managerMenus = {
  modules: {
    operacoes: {
      id: 'manager-operacoes',
      label: 'Operacoes',
      icon: 'briefcase',
      menus: [
        {
          id: 'orders',
          label: 'Pedidos',
          menuKey: 'orders',
          menuType: 'home',
          route: 'OrderHistoryPage',
          sortOrder: 20,
        },
      ],
    },
  },
};

const mockManagerApi = async page => {
  await page.route(`${API_ORIGIN}/**`, async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname.replace(/^\/+/, '');

    if (request.method().toUpperCase() === 'OPTIONS') {
      return route.fulfill({status: 204, headers: CORS_HEADERS, body: ''});
    }

    if (pathname === 'themes-colors.css') {
      return route.fulfill({
        status: 200,
        headers: {...CORS_HEADERS, 'content-type': 'text/css'},
        body: ':root { --primary: #dc2626; }',
      });
    }

    const bodies = {
      'runtime/ip': {ip: '127.0.0.1'},
      'people/companies/my': collection([company]),
      'people/company/default': company,
      'menus-people': managerMenus,
      'configs/discovery-configs': {configs: {}},
    };

    return route.fulfill({
      status: 200,
      headers: jsonHeaders(),
      body: JSON.stringify(bodies[pathname] || collection([])),
    });
  });

  await page.addInitScript(
    ({version}) => {
      localStorage.setItem('app-type', 'MANAGER');
      localStorage.setItem('config', JSON.stringify({language: 'pt-br'}));
      localStorage.setItem(
        'session',
        JSON.stringify({
          id: 7,
          people: '/people/7',
          api_key: 'test-api-key',
          active: 1,
          mycompany: 42,
          roles: ['ROLE_SUPER'],
        }),
      );
      localStorage.setItem(
        'device',
        JSON.stringify({
          id: 'pos-web-santa-redonda',
          device: 'pos-web-santa-redonda',
          type: 'WEB',
          appName: 'Browser Manager',
          appVersion: version,
          buildNumber: version,
          systemName: 'web',
          systemVersion: 'web',
          deviceType: 'web',
          metadata: {},
        }),
      );
    },
    {version: appVersion},
  );
};

test('opens the guided onboarding from Manager operations', async ({page}) => {
  await mockManagerApi(page);
  await page.goto('/');

  const onboardingMenu = page.getByText('Onboarding', {exact: true});
  await expect(onboardingMenu).toBeVisible();
  await onboardingMenu.click();
  await page.waitForURL(/\/manager\/onboarding\/?$/);

  await expect(page.getByRole('heading', {name: 'Implantação assistida'})).toBeVisible();
  await expect(page.getByLabel('Estabelecimento selecionado')).toHaveValue(
    'Santa Redonda Pizzas e Lanches',
  );

  const startButton = page.getByRole('button', {
    name: 'Iniciar onboarding de teste',
  });
  await expect(startButton).toBeDisabled();

  await page.getByLabel('Responsável do cliente').fill('Responsável Santa Redonda');
  await page.getByLabel('Responsável interno').fill('Leandro');
  await page.getByLabel('Data do Z-Day').fill('12/08/2026');
  await page.getByLabel('Horário do Z-Day').fill('09:00');
  await startButton.click();

  await expect(page.getByText(/Onboarding iniciado nesta sessão/)).toBeVisible();
  await expect(page.getByText('Validar e ativar', {exact: true})).toBeVisible();
});
