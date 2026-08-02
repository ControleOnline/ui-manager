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
  name: 'Controle Online',
  alias: 'CONTROLE',
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

const createFlowchart = () => ({
  id: 11,
  appType: 'ADMIN',
  enabled: true,
  flowKey: 'existing-flow',
  mermaid: 'flowchart TD\n  start["Fluxo existente"] --> done["Concluido"]',
  sortOrder: 1,
  summary: 'Fluxo ja salvo',
  title: 'Fluxo existente',
});

const mockFlowchartsApi = async page => {
  const company = createCompany();
  const flowchart = createFlowchart();

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
        body: JSON.stringify({modules: {}}),
      });
    }

    if (pathname === 'configs/discovery-configs') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({configs: {}}),
      });
    }

    if (pathname === 'flowcharts') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection([flowchart])),
      });
    }

    if (pathname === 'flowcharts/11') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(flowchart),
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
          // Initial documents such as about:blank may not expose storage.
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

test.describe('flowcharts browser smoke', () => {
  test('opens a new draft from an existing flowchart route', async ({page}) => {
    await mockFlowchartsApi(page);

    await page.goto('/admin/flowcharts/11');

    await expect(page.getByText('Fluxo existente').first()).toBeVisible();
    const savedFlowButton = page.getByRole('button', {name: /Fluxo existente Fluxo ja salvo/});
    await expect(savedFlowButton).toHaveCSS('border-top-color', 'rgb(14, 165, 233)');

    await page.getByRole('button', {name: 'Novo fluxo'}).click();

    await expect(page.getByRole('button', {name: 'Elemento'})).toBeVisible();
    await expect(page.getByRole('textbox', {name: 'Título do fluxo'})).toHaveValue('Novo fluxo');
    await expect(page.getByText('Rascunho ainda não salvo.')).toBeVisible();
    await expect(page.getByRole('button', {name: /Novo fluxo Rascunho ainda/})).toHaveCSS(
      'border-top-color',
      'rgb(14, 165, 233)',
    );
    await expect(savedFlowButton).not.toHaveCSS('border-top-color', 'rgb(14, 165, 233)');
  });
});
