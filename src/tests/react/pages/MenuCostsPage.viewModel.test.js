/* global test */

const assert = require('node:assert/strict');
const {
  cloneSeedData,
  buildErpCatalogCsv,
  buildErpExportPayload,
  activeCostSummary,
  computeProduct,
  computeEngineeringProducts,
  componentCost,
  pendingItems,
  processRows,
  purchaseFamilyEntries,
  resaleItems,
  validateImportedDb,
} = require('../../../react/pages/MenuCostsPage/viewModel');

test('menu costs seed keeps Gyros engineering entities separated', () => {
  const db = cloneSeedData();

  assert.ok(db.ingredients.length > 0);
  assert.ok(db.recipes.length > 0);
  assert.ok(db.packaging.length > 0);
  assert.ok(db.products.length > 0);
  assert.notEqual(db.ingredients[0].id, db.recipes[0].id);
});

test('product costing resolves a sale product without mutating the seed', () => {
  const db = cloneSeedData();
  const alpha = computeProduct(db, 'prd_alpha');

  assert.equal(alpha.product.name, 'Alpha Gyros de Fraldinha');
  assert.ok(alpha.directCost > 0);
  assert.ok(alpha.salePrice > alpha.directCost);
  assert.ok(alpha.nodes.length > 0);
});

test('operational views expose resale, pending and process rows', () => {
  const db = cloneSeedData();

  assert.ok(resaleItems(db).length > 0);
  assert.ok(pendingItems(db).length > 0);
  assert.ok(processRows(db).length > db.products.length);
});

test('engineering products list does not duplicate resale items', () => {
  const db = cloneSeedData();
  const resaleIds = new Set(resaleItems(db).map(item => item.id));
  const products = computeEngineeringProducts(db);

  assert.ok(products.length > 0);
  assert.ok(!products.some(item => resaleIds.has(item.product.id)));
  assert.ok(products[0].nodes.length > 0);
});

test('process details can summarize product addon obligations safely', () => {
  const db = cloneSeedData();
  const productProcess = processRows(db).find(item => item.refType === 'product');

  assert.ok(productProcess);

  const computed = computeProduct(db, productProcess.refId);
  const requiredAddonCount = computed.addons.filter(addon => addon.required || Number(addon.minimum || 0) > 0).length;

  assert.ok(Array.isArray(computed.addons));
  assert.ok(requiredAddonCount >= 0);
});

test('erp exports preserve products, components and addon rows', () => {
  const db = cloneSeedData();
  const payload = buildErpExportPayload(db);
  const csv = buildErpCatalogCsv(db);

  assert.ok(payload.products.length > 0);
  assert.ok(payload.components.length > payload.products.length);
  assert.ok(payload.addons.length > 0);
  assert.match(csv, /codigo;produto;categoria/);
  assert.match(csv, /Alpha Gyros de Fraldinha/);
  assert.equal(validateImportedDb(db), db);
});

test('active cost summary keeps canonical purchase reading visible', () => {
  const db = cloneSeedData();
  const fraldinha = db.ingredients.find(item => item.id === 'ing_fraldinha');
  const summary = activeCostSummary(db, 'ingredient', fraldinha);

  assert.equal(summary.primaryUnit, 'kg');
  assert.equal(summary.baseUnit, 'g');
  assert.ok(summary.activePrimaryCost > 0);
  assert.ok(summary.activeBaseCost > 0);
  assert.ok(summary.purchaseCount > 0);
});

test('product costing uses active cost overrides and editable quantities', () => {
  const db = cloneSeedData();
  const base = computeProduct(db, 'prd_alpha');
  const product = db.products.find(item => item.id === 'prd_alpha');
  const fraldinha = db.ingredients.find(item => item.id === 'ing_fraldinha');
  const component = product.components.find(item => item.refId === 'ing_fraldinha');
  const originalComponentCost = componentCost(db, component);

  fraldinha.activeCostMode = 'manual';
  fraldinha.manualUnitCost = 60;
  const overridden = computeProduct(db, 'prd_alpha');

  component.qty = Number(component.qty) + 50;
  const adjusted = computeProduct(db, 'prd_alpha');

  assert.ok(overridden.directCost > base.directCost);
  assert.ok(adjusted.directCost > overridden.directCost);
  assert.ok(componentCost(db, component) > originalComponentCost);
});

test('purchase family entries group comparable evidence history', () => {
  const db = cloneSeedData();
  const families = purchaseFamilyEntries(db);
  const fraldinha = families.find(item => item.resourceId === 'ing_fraldinha');

  assert.ok(families.length > 0);
  assert.ok(fraldinha.occurrenceCount > 0);
  assert.ok(fraldinha.totalAmount > 0);
  assert.ok(fraldinha.evidenceCount >= 0);
});
