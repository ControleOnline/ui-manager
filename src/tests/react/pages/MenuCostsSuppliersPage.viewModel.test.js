/* global test */

const assert = require('node:assert/strict');

const {
  buildImportedSuppliers,
  filterSuppliers,
  getSupplierSelection,
} = require('@controleonline/ui-manager/src/react/pages/MenuCostsSuppliersPage/viewModel');
const { cloneSeedData } = require('@controleonline/ui-manager/src/react/pages/MenuCostsPage/viewModel');

test('suppliers view model merges duplicate Samppel records and keeps contacts nested', () => {
  const rawSeed = cloneSeedData();
  const suppliers = buildImportedSuppliers(rawSeed);
  const samppel = suppliers.find(
    item => item.id === 'sup_samppael' || item.sourceIds.includes('sup_samppael'),
  );

  assert.ok(samppel, 'expected merged Samppel supplier to exist');
  assert.equal(samppel.sourceIds.length, 2);
  assert.equal(samppel.duplicateCount, 1);
  assert.equal(samppel.contactCount, 1);
  assert.equal(samppel.contacts[0].phone, '(11) 3931-0750');
  assert.equal(samppel.contacts[0].email, 'contato@samppel.com.br');
  assert.ok(samppel.sourceNames.includes('Samppel'));
  assert.ok(samppel.sourceNames.includes('Samppel Embalagens'));
  assert.equal(suppliers.length, rawSeed.suppliers.length - 1);
});

test('suppliers view model searches duplicated supplier by nested contact data', () => {
  const suppliers = buildImportedSuppliers();
  const filtered = filterSuppliers(suppliers, '3931-0750');
  const selected = getSupplierSelection(filtered, null);

  assert.ok(filtered.some(item => item.sourceIds.includes('sup_samppael')));
  assert.ok(selected);
  assert.equal(selected.contacts[0].phone, '(11) 3931-0750');
});
