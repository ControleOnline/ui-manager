/* global test */

const assert = require('node:assert/strict');
const {
  buildProductTechnicalTreeAudit,
  resolveTechnicalNodeRole,
} = require('@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/menuCostsTechnicalTree');

const ingredientNode = {
  key: 'ingredient:10',
  relationId: 501,
  refType: 'ingredient',
  refId: 10,
  name: 'Fraldinha',
  qty: 150,
  unit: 'g',
  cost: 6.5,
  pricingMode: 'markup',
  record: { id: 10, name: 'Fraldinha' },
  children: [],
};

const preparationNode = {
  key: 'recipe:20',
  relationId: 502,
  refType: 'recipe',
  refId: 20,
  name: 'Vinagrete da casa',
  qty: 60,
  unit: 'ml',
  cost: 1.1,
  pricingMode: 'markup',
  record: {
    id: 20,
    name: 'Vinagrete da casa',
    yieldQty: 600,
    yieldUnit: 'ml',
    components: [{ refType: 'ingredient', refId: 11, qty: 300 }],
  },
  children: [{
    key: 'ingredient:11:recipe:20',
    relationId: 601,
    refType: 'ingredient',
    refId: 11,
    name: 'Tomate',
    qty: 300,
    unit: 'g',
    cost: 0.8,
    record: { id: 11, name: 'Tomate' },
    children: [],
  }],
};

test('consolidates fixed composition, nested preparation and commercial groups', () => {
  const audit = buildProductTechnicalTreeAudit({
    computed: {
      product: { id: 100, name: 'Alpha Gyros' },
      nodes: [ingredientNode, preparationNode],
      addons: [{
        id: 700,
        name: 'Bacon',
        group: 'Adicionais',
        required: false,
        minimum: 0,
        maximum: 3,
        directCost: 1,
        salePriceDelta: 6,
        nodes: [{ ...ingredientNode, key: 'ingredient:10:addon', relationId: 701, qty: 30 }],
      }],
    },
  });

  assert.equal(audit.fixed.length, 2);
  assert.equal(audit.fixed[1].role, 'preparation');
  assert.equal(audit.fixed[1].children[0].pathLabel, 'Vinagrete da casa › Tomate');
  assert.equal(audit.groups.length, 1);
  assert.equal(audit.groups[0].optionCount, 1);
  assert.equal(audit.summary.fixedRoleCounts.ingredient, 1);
  assert.equal(audit.summary.fixedRoleCounts.preparation, 1);
  assert.equal(audit.summary.blockingCount, 0);
  assert.equal(audit.summary.reviewCount, 0);
  assert.equal(audit.summary.confirmedCount, 4);
});

test('marks missing references, invalid quantities and incomplete preparations for review', () => {
  const audit = buildProductTechnicalTreeAudit({
    computed: {
      product: { id: 100, name: 'Produto incompleto' },
      nodes: [{
        key: 'recipe:missing',
        relationId: '',
        refType: 'recipe',
        refId: 99,
        name: 'Preparo pendente',
        qty: 0,
        unit: '',
        cost: 0,
        record: null,
        children: [],
      }],
      addons: [],
    },
  });

  assert.equal(audit.fixed[0].status, 'missing');
  assert.ok(audit.fixed[0].issues.some(item => item.code === 'missing_reference'));
  assert.ok(audit.fixed[0].issues.some(item => item.code === 'invalid_quantity'));
  assert.equal(audit.summary.blockingCount, 2);
  assert.equal(audit.summary.isComplete, false);
});

test('keeps commercial-description matches as suggestions outside confirmed cost', () => {
  const audit = buildProductTechnicalTreeAudit({
    computed: {
      product: { id: 100, name: 'Alpha Gyros' },
      nodes: [ingredientNode],
      addons: [],
    },
    preparationSuggestions: [{
      id: 30,
      name: 'Manteiga com alho',
      reason: 'Mencionado na descrição comercial',
    }],
  });

  assert.equal(audit.suggestions[0].status, 'suggested');
  assert.equal(audit.suggestions[0].qty, 0);
  assert.equal(audit.summary.suggestionCount, 1);
  assert.equal(audit.summary.isComplete, false);
});

test('prefers an explicit engineering role without changing the ERP type', () => {
  assert.equal(resolveTechnicalNodeRole({
    refType: 'ingredient',
    record: { type: 'feedstock', extraData: { menuCostsRole: 'recipe' } },
  }), 'preparation');
  assert.equal(resolveTechnicalNodeRole({
    refType: 'product',
    record: { type: 'product', extraData: { menuCostsRole: 'resale' } },
  }), 'resale');
});

