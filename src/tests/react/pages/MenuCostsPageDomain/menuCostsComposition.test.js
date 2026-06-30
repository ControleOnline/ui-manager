/* global test */

const assert = require('node:assert/strict');
const {
  buildMenuCostsCompositionPieces,
  buildMenuCostsPackagingPieces,
  updateMenuCostsCompositionLinkQuantity,
} = require('@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/menuCostsComposition');

test('merges a linked draft relation into one composition piece', () => {
  const officialNode = { key: 'erp-node-1', refType: 'ingredient', refId: 10, qty: 120, unit: 'g' };
  const pieces = buildMenuCostsCompositionPieces({
    productId: 100,
    officialNodes: [officialNode],
    technicalWorkspace: {
      entityIndex: {
        'ingredient:draft-10': { name: 'Fraldinha', erpReference: { id: 10 } },
      },
      relations: {
        composition: [{
          key: 'draft-relation-1',
          id: 'relation-1',
          origin: 'draft',
          ownerId: 100,
          targetId: 'draft-10',
          targetType: 'ingredient',
          quantity: 150,
          unit: 'g',
        }],
      },
    },
  });

  assert.equal(pieces.length, 1);
  assert.equal(pieces[0].origin, 'draft');
  assert.equal(pieces[0].node, officialNode);
  assert.equal(pieces[0].quantity, 150);
});

test('keeps unlinked drafts and unmatched ERP nodes in the same list', () => {
  const pieces = buildMenuCostsCompositionPieces({
    productId: 100,
    officialNodes: [{ key: 'erp-node-1', refType: 'ingredient', refId: 1882, qty: 1, unit: 'un' }],
    technicalWorkspace: {
      entityIndex: {
        'preparation:draft-prep': { name: 'Vinagrete da casa', erpReference: null },
      },
      relations: {
        composition: [{
          key: 'draft-relation-1',
          id: 'relation-1',
          origin: 'draft',
          ownerId: 100,
          targetId: 'draft-prep',
          targetType: 'preparation',
          quantity: 60,
          unit: 'ml',
        }],
      },
    },
  });

  assert.deepEqual(pieces.map(piece => piece.origin), ['draft', 'erp']);
  assert.equal(pieces[0].entity.name, 'Vinagrete da casa');
  assert.equal(pieces[1].node.refId, 1882);
});

test('uses the hydrated ERP product only as the identity of an unresolved component', () => {
  const pieces = buildMenuCostsCompositionPieces({
    productId: 100,
    officialNodes: [{ key: 'erp-node-1', refType: 'ingredient', refId: 1882, qty: 1, unit: 'un' }],
    technicalWorkspace: {
      componentRecordIndex: {
        1882: { id: 1882, product: 'Pão Francês com Parmesão', type: 'feedstock' },
      },
      entityIndex: {},
      technicalRoleByTargetId: {},
      relations: { composition: [] },
    },
  });

  assert.equal(pieces[0].entity, null);
  assert.equal(pieces[0].productRecord.product, 'Pão Francês com Parmesão');
  assert.equal(pieces[0].productRecord.id, 1882);
});

test('updates only the selected local composition quantity', () => {
  const workspace = {
    compositionLinks: [
      { id: 'a', quantity: 10 },
      { id: 'b', quantity: 20 },
    ],
  };
  const next = updateMenuCostsCompositionLinkQuantity(workspace, 'b', 35);

  assert.equal(next.compositionLinks[0].quantity, 10);
  assert.equal(next.compositionLinks[1].quantity, 35);
});

test('resolves an ERP component through its original deduplicated product id', () => {
  const pieces = buildMenuCostsCompositionPieces({
    productId: 100,
    officialNodes: [{ key: 'erp-node-1', refType: 'ingredient', refId: 1882, qty: 1, unit: 'un' }],
    technicalWorkspace: {
      entityIndex: {
        'ingredient:1882': {
          id: '1882',
          name: 'Pão Francês com Parmesão',
          erpReference: { id: '1882' },
          record: { id: '1882', name: 'Pão Francês com Parmesão', baseUnit: 'un' },
        },
      },
      technicalRoleByTargetId: {},
      relations: { composition: [] },
    },
  });

  assert.equal(pieces[0].entity.name, 'Pão Francês com Parmesão');
  assert.equal(pieces[0].entity.record.id, '1882');
});

test('moves a locally reclassified item from composition to packaging', () => {
  const officialNodes = [
    { key: 'guardanapo', refType: 'ingredient', refId: 1894, qty: 1, unit: 'un' },
  ];
  const technicalWorkspace = {
    entityIndex: {
      'ingredient:1894': {
        id: '1894',
        name: 'Guardanapo sache',
        erpReference: { id: '1894' },
        record: { id: '1894', name: 'Guardanapo sache', baseUnit: 'un' },
      },
    },
    technicalRoleByTargetId: { 1894: 'packaging' },
    relations: { composition: [], packaging: [] },
  };

  assert.equal(buildMenuCostsCompositionPieces({
    productId: 100,
    officialNodes,
    technicalWorkspace,
  }).length, 0);

  const packaging = buildMenuCostsPackagingPieces({
    productId: 100,
    officialNodes,
    technicalWorkspace,
  });
  assert.equal(packaging.length, 1);
  assert.equal(packaging[0].technicalRole, 'packaging');
  assert.equal(packaging[0].entity.name, 'Guardanapo sache');
});
