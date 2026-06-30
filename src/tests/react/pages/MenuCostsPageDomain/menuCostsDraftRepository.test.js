/* global test */

const assert = require('node:assert/strict');
const {
  buildMenuCostsDraftStorageKey,
  createMenuCostsDraftRepository,
} = require('@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/menuCostsDraftRepository');

const createMemoryStorage = () => {
  const values = new Map();
  return {
    values,
    getItem: async key => values.get(key) || null,
    setItem: async (key, value) => values.set(key, value),
    removeItem: async key => values.delete(key),
  };
};

test('stores technical drafts under a company-specific key', async () => {
  const storage = createMemoryStorage();
  const repository = createMenuCostsDraftRepository(storage);

  await repository.save(3, {
    products: [{ id: 'product-1', type: 'sale_product', name: 'Alpha Gyros' }],
  });
  await repository.save(9, {
    products: [{ id: 'product-2', type: 'sale_product', name: 'Outro produto' }],
  });

  assert.equal((await repository.load(3)).products[0].name, 'Alpha Gyros');
  assert.equal((await repository.load(9)).products[0].name, 'Outro produto');
  assert.notEqual(buildMenuCostsDraftStorageKey(3), buildMenuCostsDraftStorageKey(9));
});

test('never calls an API and clears only the selected company workspace', async () => {
  const storage = createMemoryStorage();
  const repository = createMenuCostsDraftRepository(storage);

  await repository.save(3, {});
  await repository.save(9, {});
  await repository.clear(3);

  assert.equal(storage.values.has(buildMenuCostsDraftStorageKey(3)), false);
  assert.equal(storage.values.has(buildMenuCostsDraftStorageKey(9)), true);
});

test('rejects invalid technical boundaries before persisting', async () => {
  const storage = createMemoryStorage();
  const repository = createMenuCostsDraftRepository(storage);

  await assert.rejects(
    repository.save(3, {
      compositionLinks: [{
        id: 'wrong-link',
        productId: 'product-1',
        targetId: 'package-1',
        targetType: 'packaging',
        quantity: 1,
        unit: 'un',
      }],
    }),
    error => error.code === 'MENU_COSTS_INVALID_DRAFT_WORKSPACE',
  );

  assert.equal(storage.values.size, 0);
});
