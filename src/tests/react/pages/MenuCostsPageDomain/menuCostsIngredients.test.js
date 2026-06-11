/* global jest */
const assert = require('node:assert/strict');
const { describe, it, beforeEach } = global;

jest.mock('@controleonline/ui-products/src/react/domain/productCatalog', () => ({
  mapProductToCatalogItem: product => ({
    id: product?.id,
    name: product?.product || product?.name || '',
    sku: product?.sku || product?.code || '',
    description: product?.description || '',
    categoryId: product?.categoryId || '',
    type: product?.type || 'feedstock',
    active: product?.active !== false,
    raw: product,
  }),
}));

jest.mock('@controleonline/ui-products/src/react/domain/productCosting', () => ({
  fetchLatestPurchasesByProductIds: jest.fn(),
  normalizeEntityId: value => String(value || '').replace(/\D+/g, ''),
  toNumber: value => Number.parseFloat(String(value ?? 0).replace(',', '.')) || 0,
}));

const {
  fetchLatestPurchasesByProductIds,
} = require('@controleonline/ui-products/src/react/domain/productCosting');

const {
  buildLiveIngredientsDb,
} = require('@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/menuCostsIngredients');

describe('menuCostsIngredients', () => {
  beforeEach(() => {
    fetchLatestPurchasesByProductIds.mockReset();
  });

  it('deduplicates ingredients by code or name and remaps parent relations to the master record', async () => {
    fetchLatestPurchasesByProductIds.mockResolvedValue({
      10: [{ orderId: 200, orderDate: '2026-06-01', supplierLabel: 'Fornecedor A', quantity: 1, unitPrice: 5, totalPrice: 5 }],
      11: [{ orderId: 201, orderDate: '2026-06-03', supplierLabel: 'Fornecedor A', quantity: 2, unitPrice: 6, totalPrice: 12 }],
    });

    const db = await buildLiveIngredientsDb({
      companyId: 3,
      companyIri: '/people/3',
      productsActions: {
        getItems: async () => [
          { id: 10, product: 'Alho em pó', sku: 'ING001', price: 5, productFiles: [{ id: 1, file: { id: 10 } }], active: true },
          { id: 11, product: 'Alho em pó', sku: 'ING001', price: 6, productFiles: [{ id: 2, file: { id: 20 } }], active: true },
        ],
      },
      productGroupProductActions: {
        getItems: async () => [
          {
            id: 50,
            productType: 'feedstock',
            quantity: 1,
            product: { id: 90, product: 'Combo Pai', sku: 'PRD090', type: 'product', active: true },
            productChild: { id: 10, product: 'Alho em pó', sku: 'ING001' },
          },
          {
            id: 51,
            productType: 'feedstock',
            quantity: 2,
            product: { id: 90, product: 'Combo Pai', sku: 'PRD090', type: 'product', active: true },
            productChild: { id: 11, product: 'Alho em pó', sku: 'ING001' },
          },
        ],
      },
      ordersActions: {
        getItems: async () => [],
      },
      categoriesActions: {
        getItems: async () => [
          { id: 7, name: 'Temperos', categoryFiles: [{ id: 4, file: { id: 44 } }] },
        ],
      },
    });

    assert.equal(db.ingredients.length, 1);
    assert.equal(db.ingredients[0].duplicateCount, 2);
    assert.equal(db.ingredients[0].purchaseCost, 12);
    assert.equal(db.ingredients[0].purchaseQty, 2);
    assert.equal(db.products.length, 1);
    assert.equal(db.products[0].components[0].refId, 10);
    assert.equal(db.purchaseItems.length, 2);
    assert.equal(db.purchaseItems[0].resourceId, 10);
    assert.equal(db.purchaseItems[1].resourceId, 10);
  });

  it('keeps the engineering manual cost source saved in product extraData', async () => {
    fetchLatestPurchasesByProductIds.mockResolvedValue({
      20: [{ orderId: 300, orderDate: '2026-06-05', supplierLabel: 'Açougue', quantity: 2, unitPrice: 30, totalPrice: 60 }],
    });

    const db = await buildLiveIngredientsDb({
      companyId: 3,
      companyIri: '/people/3',
      productsActions: {
        getItems: async () => [
          {
            id: 20,
            product: 'Fraldinha',
            sku: 'ING_FRALDINHA',
            price: 42,
            type: 'feedstock',
            active: true,
            extraData: {
              engineeringCost: {
                mode: 'manual',
                manualUnitCost: 43.47,
                note: 'Acordo com açougue',
              },
            },
          },
        ],
      },
      productGroupProductActions: {
        getItems: async () => [],
      },
      ordersActions: {
        getItems: async () => [],
      },
      categoriesActions: {
        getItems: async () => [],
      },
    });

    assert.equal(db.ingredients.length, 1);
    assert.equal(db.ingredients[0].activeCostMode, 'manual');
    assert.equal(db.ingredients[0].manualUnitCost, 43.47);
    assert.equal(db.ingredients[0].activeCostNote, 'Acordo com açougue');
    assert.equal(db.ingredients[0].evidenceType, 'manual');
  });

  it('marks feedstock without price or purchase as review instead of manual zero', async () => {
    fetchLatestPurchasesByProductIds.mockResolvedValue({
      30: [],
    });

    const db = await buildLiveIngredientsDb({
      companyId: 3,
      companyIri: '/people/3',
      productsActions: {
        getItems: async () => [
          {
            id: 30,
            product: 'Carne Fraldinha',
            sku: '',
            price: 0,
            type: 'feedstock',
            active: true,
          },
        ],
      },
      productGroupProductActions: {
        getItems: async () => [],
      },
      ordersActions: {
        getItems: async () => [],
      },
      categoriesActions: {
        getItems: async () => [],
      },
    });

    assert.equal(db.ingredients.length, 1);
    assert.equal(db.ingredients[0].activeCostMode, 'review');
    assert.equal(db.ingredients[0].manualUnitCost, null);
    assert.equal(db.ingredients[0].evidenceType, 'review');
    assert.equal(db.ingredients[0].activeCostNote, 'Sem fonte de custo definida');
  });
});
