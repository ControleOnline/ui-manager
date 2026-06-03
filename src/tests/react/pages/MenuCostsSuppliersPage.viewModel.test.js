/* global test */

const assert = require('node:assert/strict');

const {
  buildImportedSuppliers,
  filterSuppliers,
  getSupplierSelection,
} = require('@controleonline/ui-manager/src/react/pages/MenuCostsSuppliersPage/viewModel');
const {
  buildImportedSuppliersFromPeople,
} = require('@controleonline/ui-people/src/react/utils/menuCostsSuppliers');
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

test('suppliers view model merges duplicate people records from ERP and keeps contacts nested', () => {
  const suppliers = buildImportedSuppliersFromPeople([
    {
      id: 101,
      alias: 'Samppel',
      name: 'Samppel Ltda',
      peopleType: 'J',
      phone: [{ddi: 55, ddd: 11, phone: 39310750}],
      email: [{email: 'contato@samppel.com.br'}],
      document: [{document: '11222333000199'}],
      address: [
        {
          street: {
            cep: {cep: '01001000'},
            district: {
              city: {
                city: 'São Paulo',
                state: {uf: 'SP'},
              },
            },
          },
        },
      ],
      productPeople: [
        {
          id: 901,
          role: 'supplier',
          costPrice: '12.50',
          supplierSku: 'MAI-001',
          createdAt: '2026-06-01T10:00:00Z',
          product: {
            id: 88,
            product: 'Maionese',
            sku: 'MAI-001',
            type: 'feedstock',
            price: 15,
          },
        },
      ],
      otherInformations: {notes: 'Fornecedor principal'},
    },
    {
      id: 102,
      alias: 'Samppel Embalagens',
      name: 'Samppel Ltda',
      peopleType: 'J',
      phone: [{ddi: 55, ddd: 11, phone: 39310750}],
      email: [{email: 'contato@samppel.com.br'}],
      productPeople: [
        {
          id: 902,
          role: 'supplier',
          costPrice: '2.90',
          supplierSku: 'EMB-003',
          createdAt: '2026-06-02T10:00:00Z',
          product: {
            id: 99,
            product: 'Saco',
            sku: 'EMB-003',
            type: 'package',
            price: 3.2,
          },
        },
      ],
    },
  ]);

  const samppel = suppliers.find(
    item => String(item.id) === '101' || item.sourceIds.includes(101),
  );

  assert.ok(samppel, 'expected merged Samppel supplier to exist');
  assert.equal(samppel.sourceIds.length, 2);
  assert.equal(samppel.duplicateCount, 1);
  assert.equal(samppel.contactCount, 1);
  assert.equal(samppel.contacts[0].phone, '+55 (11) 3931-0750');
  assert.equal(samppel.contacts[0].email, 'contato@samppel.com.br');
  assert.equal(samppel.productCount, 2);
  assert.ok(Array.isArray(samppel.products));
  assert.ok(samppel.sourceNames.includes('Samppel'));
  assert.ok(samppel.sourceNames.some(name => name.includes('Embalagens')));
  assert.equal(samppel.movementCount, 2);
  assert.equal(samppel.products[0].productName, 'Saco');
});
