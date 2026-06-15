/* global test */

const assert = require('node:assert/strict');
const {
  MENU_COSTS_TECHNICAL_ORIGINS,
  buildMenuCostsTechnicalWorkspace,
  collectMenuCostsTechnicalWorkspace,
} = require('@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/menuCostsTechnicalWorkspace');

const erpDb = {
  categories: [{ id: 9, name: 'Bebidas' }],
  ingredients: [{ id: 10, name: 'Fraldinha' }],
  recipes: [{
    id: 20,
    name: 'Vinagrete da casa',
    components: [{ relationId: 601, refType: 'ingredient', refId: 11, qty: 300, unit: 'g' }],
  }],
  packaging: [{ id: 30, name: 'Papel barreira' }],
  products: [{
    id: 100,
    name: 'Alpha Gyros',
    components: [
      { relationId: 501, refType: 'ingredient', refId: 10, qty: 150, unit: 'g' },
      { relationId: 502, refType: 'recipe', refId: 20, qty: 60, unit: 'ml' },
      { relationId: 503, refType: 'packaging', refId: 30, qty: 1, unit: 'un' },
      { relationId: 504, refType: 'product', refId: 200, qty: 1, unit: 'un' },
    ],
    addons: [{
      id: 701,
      groupId: 70,
      group: 'Escolha sua bebida',
      name: 'Coca-Cola lata',
      required: true,
      minimum: 1,
      maximum: 1,
      components: [{ refType: 'product', refId: 200, qty: 1, unit: 'un' }],
    }],
  }, {
    id: 200,
    name: 'Coca-Cola lata',
    product: 'Coca-Cola lata',
    categoryId: 9,
    type: 'product',
  }],
};

test('collects ERP entities and keeps operational relations separated', () => {
  const view = buildMenuCostsTechnicalWorkspace({ companyId: 3, erpDb });

  assert.equal(view.entities.products.length, 2);
  assert.equal(view.entities.ingredients[0].origin, MENU_COSTS_TECHNICAL_ORIGINS.ERP);
  assert.equal(view.entities.preparations[0].name, 'Vinagrete da casa');
  assert.equal(view.entities.resale[0].name, 'Coca-Cola lata');
  assert.equal(view.relations.composition.length, 2);
  assert.equal(view.relations.packaging.length, 1);
  assert.equal(view.relations.resale.length, 1);
  assert.equal(view.relations.preparationComponents.length, 1);
  assert.equal(view.relations.choiceGroups.length, 1);
  assert.equal(view.relations.choiceOptions.length, 1);
  assert.equal(view.relations.choiceOptions[0].targets[0].targetType, 'product');
});

test('combines local drafts without replacing linked ERP records', () => {
  const view = buildMenuCostsTechnicalWorkspace({
    companyId: 3,
    erpDb,
    draftWorkspace: {
      ingredients: [{
        id: 'draft-ingredient-10',
        type: 'ingredient',
        name: 'Fraldinha revisada localmente',
        erpReference: { id: 10 },
      }, {
        id: 'draft-ingredient-new',
        type: 'ingredient',
        name: 'Manteiga com alho',
      }],
      compositionLinks: [{
        id: 'draft-composition-1',
        productId: '100',
        targetId: 'draft-ingredient-new',
        targetType: 'ingredient',
        quantity: 20,
        unit: 'g',
      }],
    },
  });

  const linked = view.entities.ingredients.find(entity => entity.id === '10');
  const local = view.entities.ingredients.find(entity => entity.id === 'draft-ingredient-new');

  assert.equal(linked.name, 'Fraldinha');
  assert.equal(linked.draftName, 'Fraldinha revisada localmente');
  assert.equal(linked.origin, MENU_COSTS_TECHNICAL_ORIGINS.ERP_AND_DRAFT);
  assert.equal(local.origin, MENU_COSTS_TECHNICAL_ORIGINS.DRAFT);
  assert.equal(view.relations.composition.filter(relation => relation.origin === 'draft').length, 1);
  assert.equal(view.summary.unlinkedDraftCount, 1);
});

test('indexes deduplicated ERP source ids with their original identity', () => {
  const view = buildMenuCostsTechnicalWorkspace({
    companyId: 3,
    erpDb: {
      ingredients: [{
        id: 1800,
        name: 'Pães',
        sourceIds: ['1800', '1882'],
        sourceRecords: [{
          id: '1882',
          name: 'Pão Francês com Parmesão',
          code: 'PAO-PARMESAO',
          baseUnit: 'un',
        }],
      }],
    },
  });

  assert.equal(view.entityIndex['ingredient:1882'].name, 'Pão Francês com Parmesão');
  assert.equal(view.entityIndex['ingredient:1882'].record.code, 'PAO-PARMESAO');
  assert.equal(view.entityIndex['ingredient:1882'].record.id, '1882');
});

test('exposes local technical roles without changing the official entity collection', () => {
  const view = buildMenuCostsTechnicalWorkspace({
    companyId: 3,
    erpDb,
    draftWorkspace: {
      technicalRoles: [{ id: 'technical-role:10', targetId: '10', role: 'preparation' }],
    },
  });

  assert.equal(view.entities.ingredients[0].type, 'ingredient');
  assert.equal(view.technicalRoleByTargetId['10'], 'preparation');
});

test('indexes hydrated component products separately from cost entities', () => {
  const view = buildMenuCostsTechnicalWorkspace({
    companyId: 3,
    erpDb: {
      ingredients: [],
      componentProducts: [{
        id: 1882,
        product: 'Pão Francês com Parmesão',
        type: 'feedstock',
      }],
    },
  });

  assert.equal(view.entityIndex['ingredient:1882'], undefined);
  assert.equal(view.componentRecordIndex['1882'].product, 'Pão Francês com Parmesão');
});

test('keeps unknown ERP links visible as unresolved instead of guessing their role', () => {
  const view = buildMenuCostsTechnicalWorkspace({
    companyId: 3,
    erpDb: {
      products: [{
        id: 100,
        name: 'Produto com vinculo antigo',
        components: [{ relationId: 900, refType: 'product', refId: 999, qty: 1, unit: 'un' }],
      }],
    },
  });

  assert.equal(view.relations.composition.length, 0);
  assert.equal(view.relations.resale.length, 0);
  assert.equal(view.relations.unresolved.length, 1);
  assert.equal(view.relations.unresolved[0].reason, 'unsupported_fixed_component_type');
});

test('loads the company draft repository before building the combined view', async () => {
  const calls = [];
  const draftRepository = {
    load: async companyId => {
      calls.push(companyId);
      return {
        companyId: String(companyId),
        preparations: [{ id: 'draft-prep-1', type: 'preparation', name: 'Barbecue da casa' }],
      };
    },
  };

  const view = await collectMenuCostsTechnicalWorkspace({ companyId: 3, erpDb, draftRepository });

  assert.deepEqual(calls, [3]);
  assert.ok(view.entities.preparations.some(entity => entity.name === 'Barbecue da casa'));
});
