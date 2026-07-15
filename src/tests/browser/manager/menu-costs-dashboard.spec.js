const { expect, test } = require('playwright/test');
const packageJson = require('../../../../../../../package.json');
const { API_ORIGIN } = require('../../../../../../../src/tests/browser/apiOrigin');

const APP_VERSION = packageJson?.version || '1.0.0';
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers':
    'API-TOKEN, APP-DOMAIN, DEVICE, ACCEPT, CONTENT-TYPE, X-Requested-With',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};

const collection = (member = []) => ({
  member,
  'hydra:member': member,
  totalItems: member.length,
  'hydra:totalItems': member.length,
  summary: {},
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

const createMenuCategories = () => [
  {
    id: 10,
    '@id': '/categories/10',
    name: 'Lanches',
    context: 'products',
    active: true,
    extraData: { sortOrder: 1 },
  },
  {
    id: 11,
    '@id': '/categories/11',
    name: 'Bebidas',
    context: 'products',
    active: true,
    extraData: { sortOrder: 2 },
  },
  {
    id: 12,
    '@id': '/categories/12',
    name: 'Chás',
    context: 'products',
    active: true,
    parent: '/categories/11',
    extraData: { sortOrder: 1 },
  },
];

const createMenuProducts = () => [
  {
    id: 1104,
    '@id': '/products/1104',
    product: 'Alpha Gyros (Fraldinha)',
    description: 'Pao Frances, Carne, Vinagrete',
    sku: 'ALPHA',
    type: 'product',
    active: true,
    price: 59.9,
    productCategory: [{ category: { id: 10, '@id': '/categories/10' } }],
    productFiles: [],
    extraData: {},
  },
  {
    id: 1117,
    '@id': '/products/1117',
    product: 'Escolha de bebida',
    description: 'Seleção comercial de bebidas',
    sku: 'BEBIDAS',
    type: 'custom',
    active: true,
    price: 1,
    productCategory: [{ category: { id: 11, '@id': '/categories/11' } }],
    productFiles: [],
    extraData: {},
  },
  {
    id: 1131,
    '@id': '/products/1131',
    product: 'Chá gelado de limão',
    description: 'Bebida pronta para revenda',
    sku: 'CHA-LIMAO',
    type: 'product',
    active: true,
    price: 9.99,
    productCategory: [
      { category: { id: 11, '@id': '/categories/11' } },
      { category: { id: 12, '@id': '/categories/12' } },
    ],
    productFiles: [],
    extraData: {},
  },
];

const createMenuPreparations = () => [{
  id: 210,
  '@id': '/products/210',
  product: 'Vinagrete da casa',
  type: 'preparation',
  active: true,
  price: 0,
  productFiles: [],
  extraData: { yieldQty: 1000, yieldUnit: 'G' },
}];

const createComponentProduct = id => ({
  id,
  '@id': `/products/${id}`,
  product: id === 1882 ? 'Pão Francês com Parmesão' : `Componente ${id}`,
  type: 'feedstock',
  active: true,
  productUnit: { productUnit: 'UN' },
});

const mockMenuCostsApi = async page => {
  const company = createCompany();
  const savedConfigRequests = [];

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
        body: JSON.stringify({ ip: '127.0.0.1' }),
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
        body: JSON.stringify({ configs: {} }),
      });
    }

    if (pathname === 'configs/add-many-configs' || pathname === 'configs/add-configs') {
      savedConfigRequests.push(request.postDataJSON());
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify({}),
      });
    }

    if (pathname === 'categories') {
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection(createMenuCategories())),
      });
    }

    if (pathname.startsWith('products/')) {
      const id = Number(pathname.split('/').pop());
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(createComponentProduct(id)),
      });
    }

    if (pathname === 'products') {
      const search = url.search.toLowerCase();
      const isCategoryLookup = search.includes('productcategory.category');
      const products = isCategoryLookup
        ? createMenuProducts()
        : search.includes('feedstock') || search.includes('package')
        ? []
        : (search.includes('preparation') || search.includes('recipe'))
          ? createMenuPreparations()
          : createMenuProducts();

      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection(products)),
      });
    }

    if (pathname === 'product_groups') {
      const productId = url.searchParams.get('product');
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection(String(productId) === '1117' ? [{
          id: 50,
          '@id': '/product_groups/50',
          productGroup: 'Escolha as Bebidas',
          required: false,
          minimum: 0,
          maximum: 1,
          active: true,
        }] : [])),
      });
    }

    if (pathname === 'product_group_products') {
      const productGroup = url.searchParams.get('productGroup');
      const product = url.searchParams.get('product');
      const fixedComponents = product === '/products/1104' ? [{
        id: 61,
        '@id': '/product_group_products/61',
        product: '/products/1104',
        productGroup: null,
        productChild: '/products/1882',
        productType: 'feedstock',
        quantity: 1,
        unit: 'UN',
        price: 0,
        active: true,
      }] : [];
      return route.fulfill({
        status: 200,
        headers: jsonHeaders(),
        body: JSON.stringify(collection(productGroup === '/product_groups/50' ? [{
          id: 60,
          '@id': '/product_group_products/60',
          product: '/products/1117',
          productGroup: '/product_groups/50',
          productChild: createMenuProducts()[2],
          productType: 'product',
          quantity: 1,
          price: 0,
          active: true,
        }] : fixedComponents)),
      });
    }

    return route.fulfill({
      status: 200,
      headers: jsonHeaders(),
      body: JSON.stringify(collection([])),
    });
  });

  await page.addInitScript(
    ({ appVersion }) => {
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
        }),
      );
      setLocalStorageItem('config', JSON.stringify({ language: 'pt-br' }));
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
    },
    { appVersion: APP_VERSION },
  );

  return { savedConfigRequests };
};

test.describe('menu costs dashboard smoke', () => {
  test('renders the executive radar on the dashboard route', async ({ page }) => {
    const api = await mockMenuCostsApi(page);

    await page.goto('/menu-costs-page');

    await expect(page.getByText('Radar da operação')).toBeVisible();
    await expect(page.getByText(/pendência\(s\) pedem revisão técnica|Cardápio técnico pronto para leitura/)).toBeVisible();
    await expect(page.getByText('Abrir cardápio técnico')).toBeVisible();
    await expect(page.getByText('Ajustar premissas e rateio')).toBeVisible();
    await expect(page.getByText('Entender motor de custo')).toBeVisible();
    await expect(page.getByText('Revisar compras')).toBeVisible();

    const bottomNavigation = page.getByTestId('bottom-navigation');
    await expect(bottomNavigation).toBeVisible();
    const bottomNavigationBox = await bottomNavigation.boundingBox();
    expect(bottomNavigationBox).toBeTruthy();
    const viewport = page.viewportSize();
    expect(viewport).toBeTruthy();
    const bottomGap = viewport.height - (bottomNavigationBox.y + bottomNavigationBox.height);
    expect(bottomGap).toBeLessThanOrEqual(64);
    const leftGap = bottomNavigationBox.x;
    const rightGap = viewport.width - (bottomNavigationBox.x + bottomNavigationBox.width);
    expect(leftGap).toBeLessThanOrEqual(4);
    expect(rightGap).toBeLessThanOrEqual(4);
    const paddingBottom = await bottomNavigation.evaluate(node =>
      Number.parseFloat(window.getComputedStyle(node).paddingBottom || '0'),
    );
    expect(paddingBottom).toBeGreaterThan(0);

    await page.getByText('Entender motor de custo').click();

    await expect(page.getByText('Motor de custo atual')).toBeVisible();
    await expect(page.getByText('Fluxo de cálculo')).toBeVisible();
    await expect(page.getByText('Regras por canal', { exact: true })).toBeVisible();
    await expect(page.getByText('Marketplace')).toBeVisible();
    await expect(page.getByText('Salvar regras do motor')).toBeVisible();
    await expect(page.getByText('Vincular estes canais aos canais homologados do ERP')).toBeVisible();

    await page.getByText('Salvar regras do motor').click();
    await expect.poll(() => api.savedConfigRequests.length).toBeGreaterThan(0);
    expect(JSON.stringify(api.savedConfigRequests)).toContain('menu-costs-cost-engine-rules');

    await page.getByText('Produtos de venda', { exact: true }).first().click();

    await expect(page.getByText('Cardápio de engenharia')).toBeVisible();
    await expect(page.getByText('Lanches').first()).toBeVisible();
    await expect(page.getByText('Bebidas').first()).toBeVisible();
    await expect(page.getByText('Expandir todas')).toBeVisible();

    await page.getByText('Expandir todas').click();

    await expect(page.getByText('Alpha Gyros (Fraldinha)').first()).toBeVisible();
    await expect(page.getByTestId('menu-category-card-11')).toContainText('Escolha de bebida');
    await expect(page.getByTestId('menu-category-card-11')).not.toContainText('Chá gelado de limão');
    await expect(page.getByTestId('menu-category-card-12')).toContainText('Chá gelado de limão');
    await expect(page.getByTestId('menu-category-card-12')).toContainText('1 produto(s)');

    const lanchesHandle = page.getByRole('button', { name: 'Arrastar Lanches entre categorias do mesmo nível' });
    const beveragesCard = page.getByTestId('menu-category-card-11');
    const sourceBounds = await lanchesHandle.boundingBox();
    const targetBounds = await beveragesCard.boundingBox();
    expect(sourceBounds).toBeTruthy();
    expect(targetBounds).toBeTruthy();
    await page.mouse.move(sourceBounds.x + sourceBounds.width / 2, sourceBounds.y + sourceBounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetBounds.x + targetBounds.width / 2, targetBounds.y + targetBounds.height - 8, { steps: 8 });
    await page.mouse.up();
    await expect(page.locator('[data-testid^="menu-category-card-"]').first()).toHaveAttribute('data-testid', 'menu-category-card-11');

    await page.getByText('Escolha de bebida').first().click();
    await expect(page.getByText('Escolha configurável').first()).toBeVisible();
    await page.getByText('Grupos e adicionais').click();
    await expect(page.getByText('Grupos de escolha do cardápio')).toBeVisible();
    await expect(page.getByText('Escolha as Bebidas')).toBeVisible();
    await expect(page.getByText('Chá gelado de limão').last()).toBeVisible();

    await page.getByText('Alpha Gyros (Fraldinha)').first().click();
    await page.getByText('Composição', { exact: true }).click();
    await expect(page.getByText('Ficha técnica local para revisão')).not.toBeVisible();
    await expect(page.getByText('Rascunho local').first()).toBeVisible();
    await expect(page.getByText('Pão Francês com Parmesão')).toBeVisible();
    await expect(page.getByText('Manteiga com alho')).toBeVisible();
    await expect(page.getByText('Vinagrete da casa')).toBeVisible();
    await expect(page.getByText('Custo ativo').first()).toBeVisible();
    await expect(page.getByText('Quantidade na ficha').first()).toBeVisible();
    await expect(page.getByText('Custo no produto').first()).toBeVisible();
    await expect(page.getByText('Papel técnico').first()).toBeVisible();
    await expect(page.getByText('Código ERP').first()).toBeVisible();
    await expect(page.getByText('Papel acoplado mono frios 30x38')).not.toBeVisible();

    await page.getByRole('tab', { name: 'Embalagens' }).click();
    await expect(page.getByText('Embalagens vinculadas ao produto')).toBeVisible();
    await expect(page.getByText('Papel acoplado mono frios 30x38')).toBeVisible();

    await page.getByText('Motor de custo', { exact: true }).click();

    await page.getByText('Editar premissas').click();

    await expect(page).toHaveURL(/menu-costs-page\/parametros/);
    await expect(page.getByRole('heading', { name: 'Premissas e rateio' })).toBeVisible();
    await expect(page.getByText('Premissas da operação')).toBeVisible();
  });

  test('keeps the hierarchical catalog usable on compact screens', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockMenuCostsApi(page);

    await page.goto('/menu-costs-page');
    await page.getByText('Produtos de venda', { exact: true }).first().click();

    await expect(page.getByText('Cardápio de engenharia')).toBeVisible();
    await page.getByText('Expandir todas').click();
    await expect(page.getByTestId('menu-category-card-11')).toContainText('Bebidas');
    await expect(page.getByTestId('menu-category-card-12')).toContainText('Chás');
    await expect(page.getByText('Escolha de bebida').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Arrastar Bebidas entre categorias do mesmo nível' })).toBeVisible();
  });
});
