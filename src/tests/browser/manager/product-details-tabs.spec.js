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

const company = {
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
};

const mockProductDetailsApi = async page => {
  const requestedPaths = [];

  await page.route(`${API_ORIGIN}/**`, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/^\/+/, '');

    requestedPaths.push(`${pathname}${url.search}`);

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

    if (pathname === 'products/1343') {
      await new Promise(resolve => setTimeout(resolve, 150));

      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({
          '@id': '/products/1343',
          id: 1343,
          product: 'Combo Alpha Gyros',
          description: 'Combo configurável',
          type: 'custom',
          price: 73,
          sku: 'GYR-COM-ALPHA',
          company: '/people/3',
        }),
      });
    }

    if (
      pathname === 'product_groups' &&
      url.searchParams.get('product') === '1343'
    ) {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(
          collection([
            {
              '@id': '/product_groups/98',
              id: 98,
              productGroup: 'Adicionais',
              groupOrder: 3,
              active: true,
            },
          ]),
        ),
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
      localStorage.setItem('app-type', 'MANAGER');
      localStorage.setItem(
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
    },
    {appVersion: APP_VERSION},
  );

  return {requestedPaths};
};

test('opens tabs that become available after loading a custom product', async ({page}) => {
  const {requestedPaths} = await mockProductDetailsApi(page);

  await page.goto('/product-details/1343');

  const suppliesTab = page.getByRole('tab', {name: /Insumos/});
  const groupsTab = page.getByRole('tab', {name: /Grupos/});

  await expect(suppliesTab).toBeVisible();
  await expect(groupsTab).toBeVisible();

  await groupsTab.click();

  await expect(groupsTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Adicionais')).toBeVisible();
  await expect
    .poll(() =>
      requestedPaths.some(path =>
        path.startsWith('product_groups?product=1343'),
      ),
    )
    .toBe(true);
  expect(
    requestedPaths.some(path => path.startsWith('product_group_parents?')),
  ).toBe(false);
});
