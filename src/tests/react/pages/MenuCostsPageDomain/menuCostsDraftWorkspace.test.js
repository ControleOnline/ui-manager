/* global test */

const assert = require('node:assert/strict');
const {
  MENU_COSTS_DRAFT_ENTITY_TYPES,
  MENU_COSTS_DRAFT_SOURCES,
  createEmptyMenuCostsDraftWorkspace,
  normalizeMenuCostsDraftWorkspace,
  setMenuCostsTechnicalRole,
  validateMenuCostsDraftWorkspace,
} = require('@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/menuCostsDraftWorkspace');

const validEntity = (id, type, name) => ({
  id,
  type,
  name,
  source: MENU_COSTS_DRAFT_SOURCES.MANUAL,
});

test('creates an empty workspace isolated by company', () => {
  const workspace = createEmptyMenuCostsDraftWorkspace(3);

  assert.equal(workspace.companyId, '3');
  assert.equal(workspace.version, 1);
  assert.deepEqual(workspace.compositionLinks, []);
  assert.deepEqual(workspace.preparationComponents, []);
  assert.deepEqual(workspace.choiceGroups, []);
  assert.deepEqual(workspace.technicalRoles, []);
});

test('stores an operational role locally without changing the ERP entity type', () => {
  const workspace = normalizeMenuCostsDraftWorkspace({
    ingredients: [validEntity('1883', 'ingredient', 'Manteiga com sal e alho')],
  }, 3);
  const next = setMenuCostsTechnicalRole(workspace, '1883', 'preparation');

  assert.equal(next.ingredients[0].type, 'ingredient');
  assert.deepEqual(next.technicalRoles, [{
    id: 'technical-role:1883',
    targetId: '1883',
    role: 'preparation',
    source: MENU_COSTS_DRAFT_SOURCES.MANUAL,
  }]);
  assert.deepEqual(validateMenuCostsDraftWorkspace(next), []);
});

test('keeps composition, packaging and resale in separate contracts', () => {
  const workspace = normalizeMenuCostsDraftWorkspace({
    products: [validEntity('product-1', 'sale_product', 'Alpha Gyros')],
    ingredients: [validEntity('ingredient-1', 'ingredient', 'Fraldinha')],
    packaging: [validEntity('package-1', 'packaging', 'Papel barreira')],
    resale: [validEntity('resale-1', 'resale', 'Refrigerante lata')],
    compositionLinks: [{
      id: 'composition-1',
      productId: 'product-1',
      targetId: 'ingredient-1',
      targetType: 'ingredient',
      quantity: 150,
      unit: 'g',
    }],
    packagingLinks: [{
      id: 'package-link-1',
      productId: 'product-1',
      targetId: 'package-1',
      targetType: 'packaging',
      quantity: 1,
      unit: 'un',
    }],
    resaleLinks: [{
      id: 'resale-link-1',
      productId: 'product-1',
      targetId: 'resale-1',
      targetType: 'resale',
      quantity: 1,
      unit: 'un',
    }],
  }, 3);

  assert.deepEqual(validateMenuCostsDraftWorkspace(workspace), []);
  assert.equal(workspace.compositionLinks[0].targetType, 'ingredient');
  assert.equal(workspace.packagingLinks[0].targetType, 'packaging');
  assert.equal(workspace.resaleLinks[0].targetType, 'resale');
});

test('rejects packaging or resale accidentally placed in fixed composition', () => {
  const workspace = normalizeMenuCostsDraftWorkspace({
    compositionLinks: [{
      id: 'composition-1',
      productId: 'product-1',
      targetId: 'package-1',
      targetType: MENU_COSTS_DRAFT_ENTITY_TYPES.PACKAGING,
      quantity: 1,
      unit: 'un',
    }, {
      id: 'composition-2',
      productId: 'product-1',
      targetId: 'resale-1',
      targetType: MENU_COSTS_DRAFT_ENTITY_TYPES.RESALE,
      quantity: 1,
      unit: 'un',
    }],
  }, 3);

  const issues = validateMenuCostsDraftWorkspace(workspace);
  assert.equal(issues.filter(issue => issue.code === 'invalid_target_type').length, 2);
});

test('keeps preparation recipes separate from sale product composition', () => {
  const workspace = normalizeMenuCostsDraftWorkspace({
    preparations: [validEntity('preparation-1', 'preparation', 'Vinagrete da casa')],
    ingredients: [validEntity('ingredient-1', 'ingredient', 'Tomate')],
    preparationComponents: [{
      id: 'recipe-link-1',
      preparationId: 'preparation-1',
      targetId: 'ingredient-1',
      targetType: MENU_COSTS_DRAFT_ENTITY_TYPES.INGREDIENT,
      quantity: 300,
      unit: 'g',
    }],
  }, 3);

  assert.deepEqual(validateMenuCostsDraftWorkspace(workspace), []);
  assert.equal(workspace.preparationComponents[0].preparationId, 'preparation-1');
  assert.equal(workspace.compositionLinks.length, 0);
});

test('allows commercial group options to reference any explicit operational type', () => {
  const workspace = normalizeMenuCostsDraftWorkspace({
    choiceGroups: [{
      id: 'group-1',
      productId: 'product-1',
      name: 'Escolha sua bebida',
      minimum: 1,
      maximum: 1,
    }],
    choiceOptions: [{
      id: 'option-1',
      groupId: 'group-1',
      name: 'Refrigerante lata',
      targetId: 'resale-1',
      targetType: MENU_COSTS_DRAFT_ENTITY_TYPES.RESALE,
      quantity: 1,
      unit: 'un',
    }, {
      id: 'option-2',
      groupId: 'group-1',
      name: 'Suco natural',
      targetId: 'preparation-1',
      targetType: MENU_COSTS_DRAFT_ENTITY_TYPES.PREPARATION,
      quantity: 300,
      unit: 'ml',
    }],
  }, 3);

  assert.deepEqual(validateMenuCostsDraftWorkspace(workspace), []);
});
