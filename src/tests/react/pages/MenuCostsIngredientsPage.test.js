/* global test */

const assert = require('node:assert/strict');

const { resolveMenuCostsTabRoute } = require('@controleonline/ui-manager/src/react/pages/MenuCostsPage/navigation');
const { buildSupplySyncRows } = require('@controleonline/ui-manager/src/react/pages/MenuCostsPage/viewModel');

test('ingredients tab routes to the dedicated ingredients screen', () => {
  const route = resolveMenuCostsTabRoute('ingredients');

  assert.equal(route.routeName, 'MenuCostsIngredientsPage');
  assert.deepEqual(route.params, {});
});

test('packaging tab routes to the dedicated packaging screen', () => {
  const route = resolveMenuCostsTabRoute('packaging');

  assert.equal(route.routeName, 'MenuCostsPackagingPage');
  assert.deepEqual(route.params, {});
});

test('resale tab routes to the dedicated resale screen', () => {
  const route = resolveMenuCostsTabRoute('resale');

  assert.equal(route.routeName, 'MenuCostsResalePage');
  assert.deepEqual(route.params, {});
});

test('ingredient sync flags duplicate and conflicting ERP matches', () => {
  const db = {
    ingredients: [
      {
        id: 'ing_oregano',
        name: 'Orégano',
        code: 'ING_OREGANO',
        baseUnit: 'g',
        purchaseQty: 20,
        purchaseCost: 4.99,
        wastePct: 0,
        supplier: 'Mercearia / referência web',
        sourceType: 'documented',
        sourceReference: 'Lista de compras, nota fiscal ou orçamento',
        notes: 'Tempero seco.',
        description: 'Tempero seco.',
        erpUnit: 'G',
      },
    ],
  };

  const duplicateCatalog = [
    { id: 101, product: 'Orégano', sku: 'ING_OREGANO', type: 'feedstock', price: 0.2495, active: true },
    { id: 102, product: 'Orégano', sku: 'ING_OREGANO', type: 'feedstock', price: 0.2495, active: true },
  ];

  const conflictCatalog = [
    { id: 201, product: 'Orégano', sku: 'ING_OREGANO', type: 'product', price: 0.2495, active: true },
  ];

  const duplicateRows = buildSupplySyncRows(db, 'ingredients', duplicateCatalog);
  const conflictRows = buildSupplySyncRows(db, 'ingredients', conflictCatalog);

  assert.equal(duplicateRows[0].remoteSupplyStatus, 'duplicate');
  assert.equal(conflictRows[0].remoteSupplyStatus, 'type_conflict');
});
