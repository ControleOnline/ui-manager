/* global jest */
const assert = require('node:assert/strict');
const { describe, it, beforeEach } = global;

jest.mock('@controleonline/ui-people/src/react/utils/menuCostsSuppliers', () => ({
  buildImportedSuppliersFromPeople: jest.fn(records =>
    records.map(person => ({
      id: person.id,
      name: person.name || person.businessName || person.tradeName || '',
      contacts: person.contacts || [],
    })),
  ),
}));

jest.mock('@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/menuCostsIngredients', () => ({
  buildLiveIngredientsDb: jest.fn(),
}));

jest.mock('@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/menuCostsPackaging', () => ({
  buildLivePackagingDb: jest.fn(),
}));

jest.mock('@controleonline/ui-products/src/react/domain/productCatalog', () => ({
  mapProductToCatalogItem: jest.fn(product => ({
    id: product?.id,
    name: product?.product || product?.name || '',
    sku: product?.sku || product?.code || '',
    description: product?.description || '',
    categoryId: product?.categoryId || '',
    type: product?.type || 'product',
    active: product?.active !== false,
    price: Number(product?.price || 0),
    raw: product,
  })),
}));

const { buildImportedSuppliersFromPeople } = require('@controleonline/ui-people/src/react/utils/menuCostsSuppliers');
const { buildLiveIngredientsDb } = require('@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/menuCostsIngredients');
const { buildLivePackagingDb } = require('@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/menuCostsPackaging');
const { buildLiveMenuCostsDb } = require('@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/menuCostsLiveDb');

describe('menuCostsLiveDb', () => {
  beforeEach(() => {
    buildImportedSuppliersFromPeople.mockClear();
    buildLiveIngredientsDb.mockReset();
    buildLivePackagingDb.mockReset();
  });

  it('merges live ingredients, packaging, products, recipes and suppliers from the ERP', async () => {
    buildLiveIngredientsDb.mockResolvedValue({
      categories: [{ id: 1, name: 'Ingredientes' }],
      ingredients: [{ id: 10, name: 'Alho', type: 'feedstock', active: true }],
      recipes: [],
      packaging: [],
      products: [{ id: 10, name: 'Alho', type: 'feedstock', active: true }],
      purchaseOrders: [{ id: 101, date: '2026-06-01', label: 'Compra #101' }],
      purchaseItems: [{ id: '101:10', orderId: 101, resourceType: 'ingredient', resourceId: 10 }],
      inputs: [{ id: 1, name: 'Nota fiscal' }],
      suppliers: [],
      settings: { defaultMarkupPct: 180 },
    });

    buildLivePackagingDb.mockResolvedValue({
      categories: [{ id: 2, name: 'Embalagens' }],
      ingredients: [],
      recipes: [],
      packaging: [{ id: 20, name: 'Saco', type: 'package', active: true }],
      products: [{ id: 20, name: 'Saco', type: 'package', active: true }],
      purchaseOrders: [{ id: 102, date: '2026-06-02', label: 'Compra #102' }],
      purchaseItems: [{ id: '102:20', orderId: 102, resourceType: 'packaging', resourceId: 20 }],
      inputs: [{ id: 2, name: 'Comprovante' }],
      suppliers: [],
      settings: { targetMarginPct: 55 },
    });

    const liveDb = await buildLiveMenuCostsDb({
      companyId: 3,
      companyIri: '/people/3',
      peopleActions: {
        getItems: jest.fn(async () => [
          { id: 77, name: 'Fornecedor Norte', email: 'norte@example.com' },
        ]),
      },
      productsActions: {
        getItems: jest.fn(async params => {
          const type = Array.isArray(params?.type) ? params.type : [params?.type];
          if (type.includes('recipe')) {
            return [
              {
                id: 41,
                product: 'Preparo Combo Alpha',
                sku: 'RCP001',
                type: 'recipe',
                active: true,
                price: 14,
                yieldQty: 1,
                yieldUnit: 'un',
              },
            ];
          }
          if (type.includes('manufactured') || type.includes('component')) {
            return [
              {
                id: 40,
                product: 'Combo Alpha',
                sku: 'CMB001',
                type: 'manufactured',
                active: true,
                price: 35,
              },
            ];
          }

          return [
            {
              id: 30,
              product: 'Coca-Cola 350ml',
              sku: 'DRK001',
              type: 'product',
              active: true,
              price: 8.5,
            },
          ];
        }),
      },
      productGroupProductActions: {
        getItems: jest.fn(),
      },
      ordersActions: {
        getItems: jest.fn(),
      },
      categoriesActions: {
        getItems: jest.fn(async () => [
          { id: 3, name: 'Bebidas' },
        ]),
      },
    });

    assert.equal(buildLiveIngredientsDb.mock.calls.length, 1);
    assert.equal(buildLivePackagingDb.mock.calls.length, 1);
    assert.equal(buildImportedSuppliersFromPeople.mock.calls.length, 1);
    assert.equal(liveDb.categories.length, 3);
    assert.equal(liveDb.ingredients.length, 1);
    assert.equal(liveDb.packaging.length, 1);
    assert.equal(liveDb.products.length, 3);
    assert.equal(liveDb.recipes.length, 1);
    assert.equal(liveDb.suppliers.length, 1);
    assert.equal(liveDb.purchaseOrders.length, 2);
    assert.equal(liveDb.purchaseItems.length, 2);
    assert.equal(liveDb.settings.defaultMarkupPct, 180);
    assert.equal(liveDb.settings.targetMarginPct, 55);
    assert.equal(liveDb.products.find(item => item.id === 30).name, 'Coca-Cola 350ml');
    assert.equal(liveDb.recipes[0].name, 'Preparo Combo Alpha');
  });

  it('preserves ERP component relation ids and quantities when merging sale product supplies', async () => {
    buildLiveIngredientsDb.mockResolvedValue({
      categories: [],
      ingredients: [{
        id: 10,
        name: 'Fraldinha',
        type: 'feedstock',
        active: true,
        baseUnit: 'G',
        activeCostMode: 'manual',
        manualUnitCost: 43.47,
      }],
      recipes: [],
      packaging: [],
      products: [{
        id: 30,
        name: 'Alpha Gyros',
        type: 'product',
        active: true,
        components: [{
          relationId: 501,
          productIri: '/products/30',
          productGroupIri: '/product_groups/7',
          productChildIri: '/products/10',
          productType: 'feedstock',
          refType: 'ingredient',
          refId: 10,
          qty: 150,
          unit: 'G',
          price: 43.47,
        }],
      }],
      purchaseOrders: [],
      purchaseItems: [],
      inputs: [],
      suppliers: [],
      settings: {},
    });

    buildLivePackagingDb.mockResolvedValue({
      categories: [],
      ingredients: [],
      recipes: [],
      packaging: [{ id: 20, name: 'Embalagem', type: 'package', active: true }],
      products: [{
        id: 30,
        name: 'Alpha Gyros',
        type: 'product',
        active: true,
        components: [{
          relationId: 502,
          productIri: '/products/30',
          productGroupIri: '/product_groups/8',
          productChildIri: '/products/20',
          productType: 'package',
          refType: 'packaging',
          refId: 20,
          qty: 1,
          unit: 'UN',
          price: 0.5,
        }],
      }],
      purchaseOrders: [],
      purchaseItems: [],
      inputs: [],
      suppliers: [],
      settings: {},
    });

    const liveDb = await buildLiveMenuCostsDb({
      companyId: 3,
      companyIri: '/people/3',
      peopleActions: { getItems: jest.fn(async () => []) },
      productsActions: {
        getItems: jest.fn(async params => {
          const type = Array.isArray(params?.type) ? params.type : [params?.type];
          if (type.includes('manufactured') || type.includes('component') || type.includes('recipe')) return [];
          return [{
            id: 30,
            product: 'Alpha Gyros',
            sku: 'ALPHA',
            type: 'product',
            active: true,
            price: 35,
          }];
        }),
      },
      productGroupProductActions: { getItems: jest.fn() },
      categoriesActions: { getItems: jest.fn(async () => []) },
    });

    const product = liveDb.products.find(item => item.id === 30);

    assert.equal(product.components.length, 2);
    assert.deepEqual(
      product.components.map(component => component.relationId).sort(),
      [501, 502],
    );
    assert.equal(product.components.find(component => component.refType === 'ingredient').qty, 150);
    assert.equal(product.components.find(component => component.refType === 'packaging').qty, 1);
  });

  it('loads preparation products as recipes with ERP component relations', async () => {
    buildLiveIngredientsDb.mockResolvedValue({
      categories: [],
      ingredients: [{
        id: 10,
        name: 'Tomate',
        type: 'feedstock',
        active: true,
        baseUnit: 'G',
        activeCostMode: 'manual',
        manualUnitCost: 14.79,
      }],
      recipes: [],
      packaging: [],
      products: [],
      purchaseOrders: [],
      purchaseItems: [],
      inputs: [],
      suppliers: [],
      settings: {},
    });

    buildLivePackagingDb.mockResolvedValue({
      categories: [],
      ingredients: [],
      recipes: [],
      packaging: [],
      products: [],
      purchaseOrders: [],
      purchaseItems: [],
      inputs: [],
      suppliers: [],
      settings: {},
    });

    const productGroupProductActions = {
      getItems: jest.fn(async params => {
        if (params?.product === '/products/40') {
          return [{
            id: 701,
            product: { id: 40, product: 'Vinagrete da casa', type: 'preparation' },
            productChild: { id: 10, product: 'Tomate', type: 'feedstock', unit: 'g' },
            productType: 'feedstock',
            quantity: 300,
            active: true,
          }];
        }
        return [];
      }),
    };

    const liveDb = await buildLiveMenuCostsDb({
      companyId: 3,
      companyIri: '/people/3',
      peopleActions: { getItems: jest.fn(async () => []) },
      productsActions: {
        getItems: jest.fn(async params => {
          const type = Array.isArray(params?.type) ? params.type : [params?.type];
          if (type.includes('preparation')) {
            return [{
              id: 40,
              product: 'Vinagrete da casa',
              sku: 'REC_VINAGRETE',
              type: 'preparation',
              active: true,
              extraData: { yieldQty: 600, yieldUnit: 'ml' },
            }];
          }
          return [];
        }),
      },
      productGroupProductActions,
      categoriesActions: { getItems: jest.fn(async () => []) },
    });

    assert.equal(liveDb.recipes.length, 1);
    assert.equal(liveDb.recipes[0].erpProductType, 'preparation');
    assert.equal(liveDb.recipes[0].components.length, 1);
    assert.equal(liveDb.recipes[0].components[0].relationId, '701');
    assert.equal(liveDb.recipes[0].components[0].refType, 'ingredient');
    assert.equal(liveDb.recipes[0].components[0].qty, 300);
    assert.equal(liveDb.recipes[0].yieldQty, 600);
  });

  it('builds sale product addons from associated ERP product groups', async () => {
    buildLiveIngredientsDb.mockResolvedValue({
      categories: [],
      ingredients: [{
        id: 10,
        name: 'Fraldinha',
        type: 'feedstock',
        active: true,
        baseUnit: 'G',
        activeCostMode: 'manual',
        manualUnitCost: 43.47,
      }],
      recipes: [],
      packaging: [],
      products: [],
      purchaseOrders: [],
      purchaseItems: [],
      inputs: [],
      suppliers: [],
      settings: {},
    });

    buildLivePackagingDb.mockResolvedValue({
      categories: [],
      ingredients: [],
      recipes: [],
      packaging: [],
      products: [],
      purchaseOrders: [],
      purchaseItems: [],
      inputs: [],
      suppliers: [],
      settings: {},
    });

    const liveDb = await buildLiveMenuCostsDb({
      companyId: 3,
      companyIri: '/people/3',
      peopleActions: { getItems: jest.fn(async () => []) },
      productsActions: {
        getItems: jest.fn(async params => {
          const type = Array.isArray(params?.type) ? params.type : [params?.type];
          if (type.includes('manufactured') || type.includes('component') || type.includes('recipe')) return [];
          return [{
            id: 30,
            product: 'Alpha Gyros',
            sku: 'ALPHA',
            type: 'product',
            active: true,
            price: 35,
          }];
        }),
      },
      productGroupActions: {
        getItems: jest.fn(async () => [{
          id: 7,
          '@id': '/product_groups/7',
          productGroup: 'Turbine seu Gyros',
          required: true,
          minimum: 1,
          maximum: 2,
          active: true,
        }]),
      },
      productGroupProductActions: {
        getItems: jest.fn(async () => [{
          id: 501,
          productGroup: '/product_groups/7',
          product: '/products/30',
          productChild: {
            id: 10,
            '@id': '/products/10',
            product: 'Carne (Fraldinha)',
            type: 'feedstock',
            productUnit: { productUnit: 'G' },
          },
          productType: 'feedstock',
          quantity: 150,
          price: 35,
          active: true,
        }]),
      },
      categoriesActions: { getItems: jest.fn(async () => []) },
    });

    const product = liveDb.products.find(item => item.id === 30);
    const addon = product.addons[0];

    assert.equal(product.components.length, 0);
    assert.equal(product.addons.length, 1);
    assert.equal(addon.group, 'Turbine seu Gyros');
    assert.equal(addon.required, true);
    assert.equal(addon.minimum, 1);
    assert.equal(addon.maximum, 2);
    assert.equal(addon.salePriceDelta, 35);
    assert.equal(addon.components[0].relationId, '501');
    assert.equal(addon.components[0].qty, 150);
    assert.equal(addon.components[0].productIri, '/products/30');
  });
});
