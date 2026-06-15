/* global test */

const assert = require('node:assert/strict');
const {
  collectMenuCostsComponentRecordIds,
  fetchMenuCostsComponentRecords,
  indexMenuCostsComponentRecords,
} = require('@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/menuCostsComponentRecords');

test('collects unique component product ids', () => {
  assert.deepEqual(
    collectMenuCostsComponentRecordIds([
      { refId: 1882 },
      { refId: '/products/1883' },
      { refId: 1882 },
    ]),
    ['1882', '1883'],
  );
});

test('loads component identities sequentially through the products store', async () => {
  const calls = [];
  const records = await fetchMenuCostsComponentRecords({
    ids: [1882, 1883],
    productsActions: {
      get: async id => {
        calls.push(id);
        return { id, product: `Produto ${id}` };
      },
    },
  });

  assert.deepEqual(calls, ['1882', '1883']);
  assert.equal(records[1].product, 'Produto 1883');
  assert.equal(indexMenuCostsComponentRecords(records)['1882'].product, 'Produto 1882');
});
