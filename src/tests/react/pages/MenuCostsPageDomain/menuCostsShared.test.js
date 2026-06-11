/* global test */

const assert = require('node:assert/strict');

const {
  activeCostSummary,
  activeProducts,
  comparableCostLabel,
  computeProduct,
  filterBySearch,
  formatDate,
  purchaseItemsForResource,
  resourceParentUsageRows,
  RESOURCE_META,
  safeArray,
} = require('@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/menuCostsShared');

const db = {
  categories: [
    { id: 1, name: 'Temperos' },
  ],
  ingredients: [
    {
      id: 10,
      name: 'Alho em pó',
      code: 'ALH-001',
      purchaseCost: 10,
      purchaseQty: 2,
      baseUnit: 'un',
      erpUnit: 'UN',
      categoryId: 1,
      evidenceType: 'documented',
      activeCostMode: 'latest',
    },
  ],
  recipes: [],
  packaging: [],
  products: [
    {
      id: 20,
      name: 'Combo A',
      code: 'P20',
      categoryId: 1,
      active: true,
      components: [
        {
          relationId: 501,
          productIri: '/products/20',
          productGroupIri: '/product_groups/7',
          productChildIri: '/products/10',
          productType: 'feedstock',
          refType: 'ingredient',
          refId: 10,
          qty: 2,
          unit: 'un',
        },
      ],
      addons: [
        {
          id: 701,
          group: 'Obrigatórios',
          name: 'Mais alho',
          required: true,
          minimum: 1,
          maximum: 2,
          salePriceDelta: 0,
          components: [
            {
              relationId: 701,
              productIri: '/products/20',
              productGroupIri: '/product_groups/70',
              productChildIri: '/products/10',
              productType: 'feedstock',
              refType: 'ingredient',
              refId: 10,
              qty: 1,
              unit: 'un',
            },
          ],
        },
      ],
    },
    {
      id: 21,
      name: 'Papel Toalha',
      code: 'PKG-1',
      categoryId: 1,
      type: 'package',
      active: true,
      components: [],
      addons: [],
    },
    {
      id: 22,
      name: 'Preparo Base',
      code: 'CMP-1',
      categoryId: 1,
      type: 'component',
      active: true,
      components: [],
      addons: [],
    },
  ],
  purchaseOrders: [
    {
      id: 100,
      date: '2026-06-01',
      supplierName: 'Fornecedor A',
      paymentStatus: 'paid',
    },
  ],
  purchaseItems: [
    {
      id: 1,
      resourceType: 'ingredient',
      resourceId: 10,
      orderId: 100,
      quantity: 2,
      unitPrice: 5,
      totalPrice: 10,
      paymentStatus: 'paid',
    },
  ],
  inputs: [],
  settings: {},
};

test('menu costs shared helpers expose ingredient costing and usage rows', () => {
  const ingredient = db.ingredients[0];
  const summary = activeCostSummary(db, 'ingredient', ingredient);
  const purchaseRows = purchaseItemsForResource(db, 'ingredient', ingredient.id);
  const parentRows = resourceParentUsageRows(db, 'ingredient', ingredient.id);

  assert.equal(RESOURCE_META.ingredients.singular, 'Ingrediente');
  assert.equal(formatDate('2026-06-01'), '01/06/2026');
  assert.equal(comparableCostLabel('ingredient', ingredient), 'R$\u00a05,00 / un');
  assert.equal(summary.activePrimaryCost, 5);
  assert.equal(summary.registeredPrimaryCost, 5);
  assert.equal(summary.purchaseCount, 1);
  assert.equal(purchaseRows.length, 1);
  assert.equal(purchaseRows[0].supplierName, 'Fornecedor A');
  assert.equal(parentRows.length, 1);
  assert.equal(parentRows[0].productName, 'Combo A');
  assert.equal(parentRows[0].cost, 15);
  assert.equal(filterBySearch(db.ingredients, 'alho', [item => item.name]).length, 1);
  assert.equal(safeArray(null).length, 0);
  assert.equal(activeProducts(db).length, 1);
});

test('sale product composition uses active ingredient cost and keeps ERP relation metadata', () => {
  const product = computeProduct(db, 20);
  const node = product.nodes[0];

  assert.equal(node.relationId, 501);
  assert.equal(node.productIri, '/products/20');
  assert.equal(node.productChildIri, '/products/10');
  assert.equal(node.productType, 'feedstock');
  assert.equal(node.cost, 10);
  assert.equal(product.requiredCost, 5);
  assert.equal(product.directCost, 15);
  assert.equal(product.addons[0].nodes[0].relationId, 701);

  const nextDb = {
    ...db,
    ingredients: db.ingredients.map(item =>
      item.id === 10
        ? { ...item, activeCostMode: 'manual', manualUnitCost: 7 }
        : item
    ),
  };
  const updated = computeProduct(nextDb, 20);

  assert.equal(updated.nodes[0].cost, 14);
  assert.equal(updated.requiredCost, 7);
  assert.equal(updated.directCost, 21);
});
