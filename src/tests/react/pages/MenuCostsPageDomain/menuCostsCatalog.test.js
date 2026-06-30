/* global test */

const assert = require('node:assert/strict');
const {
  buildMenuCostsCatalogTree,
  buildPreparationLinkSuggestions,
  extractProductCategoryIds,
  filterMenuCostsCatalogTree,
  productCatalogPaths,
} = require('@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/menuCostsCatalog');

const categories = [
  { id: 276, name: 'Bebidas', context: 'products' },
  { id: 278, name: 'Águas', context: 'products', parent: { id: 276 } },
  { id: 279, name: 'Chás', context: 'products', parent: '/categories/276' },
  { id: 296, name: 'Combos', context: 'products' },
];

const productRow = (id, name, categoryIds, description = '') => ({
  product: {
    id,
    name,
    description,
    categoryIds,
  },
  directCost: 1,
  salePrice: 5,
});

test('extracts every category relation from normalized and raw ERP products', () => {
  assert.deepEqual(extractProductCategoryIds({
    categoryIds: ['276'],
    raw: {
      productCategory: [{ category: { id: 278 } }],
      productCategories: [{ category: '/categories/279' }],
    },
  }), ['276', '278', '279']);
});

test('builds category hierarchy and places a product only in its deepest category', () => {
  const tree = buildMenuCostsCatalogTree({
    categories,
    products: [
      productRow(1147, 'Água mineral', ['276', '278']),
      productRow(1117, 'Bebibas', ['276']),
      productRow(1343, 'Combo Alpha', ['296']),
    ],
  });

  const beverages = tree.find(node => node.key === '276');
  const waters = beverages.children.find(node => node.key === '278');

  assert.deepEqual(beverages.directProducts.map(item => item.product.name), ['Bebibas']);
  assert.deepEqual(waters.directProducts.map(item => item.product.name), ['Água mineral']);
  assert.equal(beverages.aggregateProductCount, 2);
  assert.equal(tree.find(node => node.key === '296').aggregateProductCount, 1);
});

test('preserves unrelated multiple placements and exposes complete category paths', () => {
  const product = { id: 10, name: 'Produto especial', categoryIds: ['279', '296'] };
  const tree = buildMenuCostsCatalogTree({ categories, products: [{ product }] });

  assert.equal(tree.find(node => node.key === '276').aggregateProductCount, 1);
  assert.equal(tree.find(node => node.key === '296').directProducts[0].catalogPlacementCount, 2);
  assert.deepEqual(productCatalogPaths(categories, product), ['Bebidas › Chás', 'Combos']);
});

test('search keeps ancestors openable while pruning unrelated branches', () => {
  const tree = buildMenuCostsCatalogTree({
    categories,
    products: [productRow(20, 'Chá gelado', ['279']), productRow(30, 'Combo Alpha', ['296'])],
  });
  const filtered = filterMenuCostsCatalogTree(tree, 'gelado');

  assert.deepEqual(filtered.map(node => node.title), ['Bebidas']);
  assert.deepEqual(filtered[0].children.map(node => node.title), ['Chás']);
});

test('suggests mentioned preparations without duplicating confirmed links', () => {
  const suggestions = buildPreparationLinkSuggestions({
    product: { name: 'Gyros', description: 'Carne, vinagrete da casa e maionese chimichurri' },
    recipes: [
      { id: 1, name: 'Vinagrete da casa' },
      { id: 2, name: 'Maionese chimichurri' },
      { id: 3, name: 'Antepasto de berinjela' },
    ],
    linkedNodes: [{ refType: 'recipe', refId: 1 }],
  });

  assert.deepEqual(suggestions.map(item => item.name), ['Maionese chimichurri']);
});

