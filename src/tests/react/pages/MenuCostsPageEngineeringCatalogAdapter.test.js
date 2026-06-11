/* global test */

const assert = require('node:assert/strict');

const {
  filterMenuCostsEngineeringIngredients,
  buildEngineeringResaleRows,
  isEngineeringResaleItem,
  resolveEngineeringOperationalGroup,
  resolveEngineeringResaleMeta,
} = require('@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/engineeringCatalogAdapter');

const categories = [
  { id: 10, category: 'Bebidas' },
  { id: 11, category: 'Refrigerantes', parent: { id: 10 } },
  { id: 12, category: 'Carnes / açougue' },
];

const products = [
  {
    id: 10,
    product: 'Água mineral 510ml',
    sku: 'ING_AGUA_510',
    type: 'feedstock',
    price: 1.25,
    productCategory: { category: { id: 10 } },
  },
  {
    id: 11,
    product: 'Budweiser long neck 330ml',
    sku: 'ING_CERVEJA_BUD_330',
    type: 'feedstock',
    price: 5.95,
  },
  {
    id: 12,
    product: 'Coca-Cola 2L',
    sku: 'BEB_COCA_2L',
    type: 'product',
    price: 10.95,
    productCategory: { category: { id: 11 } },
  },
  {
    id: 13,
    product: 'Fraldinha',
    sku: 'ING_FRALDINHA',
    type: 'feedstock',
    price: 43.47,
    productCategory: { category: { id: 12 } },
  },
  {
    id: 14,
    product: 'Combo Alpha',
    sku: 'CMB_ALPHA',
    type: 'manufactured',
    price: 63,
    productCategory: { category: { id: 10 } },
  },
];

test('engineering resale accepts beverage feedstock without changing ERP type', () => {
  assert.equal(isEngineeringResaleItem(products[0], categories), true);
  assert.equal(resolveEngineeringResaleMeta(products[0], categories).typeLabel, 'feedstock');
});

test('engineering resale accepts beverage products and excludes recipe ingredients', () => {
  assert.equal(isEngineeringResaleItem(products[2], categories), true);
  assert.equal(isEngineeringResaleItem(products[3], categories), false);
});

test('engineering resale excludes manufactured products even inside beverage category', () => {
  assert.equal(isEngineeringResaleItem(products[4], categories), false);
});

test('engineering resale rows include category and keyword matches sorted for the page', () => {
  const rows = buildEngineeringResaleRows({ products, categories });

  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(row => row.name), [
    'Budweiser long neck 330ml',
    'Água mineral 510ml',
    'Coca-Cola 2L',
  ]);
  assert.equal(rows.find(row => row.name === 'Budweiser long neck 330ml').matchSource, 'keyword');
  assert.equal(rows.find(row => row.name === 'Coca-Cola 2L').categoryPath, 'Bebidas');
});

test('engineering ingredients remove beverage resale items from the MenuCostsPage universe', () => {
  const ingredients = products
    .filter(product => product.type === 'feedstock')
    .map(product => ({
      id: product.id,
      name: product.product,
      code: product.sku,
      type: product.type,
      categoryId: product.productCategory?.category?.id,
      rawProduct: product,
    }));

  const rows = filterMenuCostsEngineeringIngredients(ingredients, { categories });

  assert.deepEqual(rows.map(row => row.name), ['Fraldinha']);
});

test('engineering operational group is shared by ingredients and purchases', () => {
  assert.equal(resolveEngineeringOperationalGroup('Coca-Cola 2L'), 'Bebidas');
  assert.equal(resolveEngineeringOperationalGroup('Fraldinha bovina etiqueta'), 'Carnes / açougue');
  assert.equal(resolveEngineeringOperationalGroup({
    name: 'Açúcar',
    categoryLabel: 'Mercearia',
  }), 'Mercearia');
  assert.equal(resolveEngineeringOperationalGroup({
    name: 'Tomate italiano',
    categoryLabel: 'Sem categoria',
  }), 'Hortifruti');
});
