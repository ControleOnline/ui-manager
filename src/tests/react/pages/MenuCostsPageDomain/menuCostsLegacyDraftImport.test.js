/* global test */

const assert = require('node:assert/strict');
const {
  buildGyrosLegacyDraftImport,
  ensureGyrosLegacyDraftImport,
  isGyrosLegacyCompany,
} = require('@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/menuCostsLegacyDraftImport');

const legacyDb = {
  ingredients: [
    { id: 'ing_bread', name: 'Pão Francês com Parmesão', baseUnit: 'un' },
    { id: 'ing_butter', name: 'Manteiga', baseUnit: 'g' },
  ],
  recipes: [{
    id: 'rec_butter',
    name: 'Manteiga com alho',
    yieldQty: 550,
    yieldUnit: 'g',
    components: [{ refType: 'ingredient', refId: 'ing_butter', qty: 500 }],
  }],
  packaging: [{ id: 'pkg_wrap', name: 'Papel barreira' }],
  products: [{
    id: 'prd_alpha',
    name: 'Alpha Gyros de Fraldinha',
    code: 'GYR-LAN-ALPHA',
    active: true,
    components: [
      { refType: 'ingredient', refId: 'ing_bread', qty: 1 },
      { refType: 'recipe', refId: 'rec_butter', qty: 20 },
      { refType: 'packaging', refId: 'pkg_wrap', qty: 1 },
    ],
    addons: [{ id: 'legacy-addon', group: 'Nao importar' }],
  }],
};

const erpDb = {
  ingredients: [{ id: 10, name: 'Pão Francês com Parmesão' }],
  recipes: [],
  packaging: [],
  products: [{ id: 1104, name: 'Alpha Gyros (Fraldinha)', sku: 'ALPHA' }],
};

test('recognizes only the Gyros company for the temporary migration', () => {
  assert.equal(isGyrosLegacyCompany({ name: 'GYROS' }), true);
  assert.equal(isGyrosLegacyCompany({ alias: 'Gyros Greek Barbecue' }), true);
  assert.equal(isGyrosLegacyCompany({ name: 'Outra Pizzaria' }), false);
});

test('imports legacy technical composition without importing commercial groups', () => {
  const workspace = buildGyrosLegacyDraftImport({ companyId: 3, erpDb, legacyDb });

  assert.equal(workspace.products.length, 1);
  assert.equal(workspace.products[0].erpReference.id, '1104');
  assert.equal(workspace.compositionLinks.length, 2);
  assert.equal(workspace.packagingLinks.length, 1);
  assert.equal(workspace.preparations[0].name, 'Manteiga com alho');
  assert.equal(workspace.preparationComponents.length, 1);
  assert.equal(workspace.choiceGroups.length, 0);
  assert.equal(workspace.choiceOptions.length, 0);
  assert.equal(workspace.compositionLinks[0].targetId, '10');
  assert.equal(workspace.compositionLinks[1].unit, 'g');
});

test('runs once and preserves existing local records', async () => {
  let stored = {
    companyId: '3',
    ingredients: [{ id: 'manual-1', type: 'ingredient', name: 'Manual', source: 'manual' }],
  };
  let saveCount = 0;
  const repository = {
    load: async () => stored,
    save: async (companyId, workspace) => {
      saveCount += 1;
      stored = { ...workspace, companyId: String(companyId) };
      return stored;
    },
  };

  await ensureGyrosLegacyDraftImport({
    company: { id: 3, name: 'Gyros' },
    erpDb,
    legacyDb,
    draftRepository: repository,
  });
  await ensureGyrosLegacyDraftImport({
    company: { id: 3, name: 'Gyros' },
    erpDb,
    legacyDb,
    draftRepository: repository,
  });

  assert.equal(saveCount, 1);
  assert.ok(stored.ingredients.some(item => item.id === 'manual-1'));
  assert.equal(stored.imports.legacyPwa.version, 3);
  assert.ok(stored.technicalRoles.some(assignment => (
    assignment.targetId === '1894' && assignment.role === 'packaging'
  )));
});
