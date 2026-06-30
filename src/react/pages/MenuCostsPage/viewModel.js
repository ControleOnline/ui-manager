export { MAIN_TABS } from './tabs';

export const STORAGE_KEY = 'controleonline:menu-costs-page:engineering:v1';

export const PRODUCT_DETAIL_TABS = [
  { key: 'summary', label: 'Ficha' },
  { key: 'composition', label: 'Composição' },
  { key: 'addons', label: 'Grupos e adicionais' },
  { key: 'packaging', label: 'Embalagens' },
  { key: 'purchases', label: 'Compras' },
  { key: 'operation', label: 'Operação' },
];

export const RESOURCE_META = {
  ingredients: {
    singular: 'Ingrediente',
    plural: 'Ingredientes',
    refType: 'ingredient',
    collection: 'ingredients',
    description: 'Itens comprados ou controlados como insumo de estoque e custo.',
  },
  recipes: {
    singular: 'Preparo',
    plural: 'Preparos',
    refType: 'recipe',
    collection: 'recipes',
    description: 'Itens com composição, rendimento ou custo técnico próprio.',
  },
  packaging: {
    singular: 'Embalagem',
    plural: 'Embalagens',
    refType: 'packaging',
    collection: 'packaging',
    description: 'Descartáveis, potes, sacolas e embalagens que entram na ficha ou repasse.',
  },
  products: {
    singular: 'Produto de venda',
    plural: 'Produtos de venda',
    refType: 'product',
    collection: 'products',
    description: 'Itens finais publicados no cardápio, com preço, ficha, grupos e margem.',
  },
};

export const EVIDENCE_LABELS = {
  documented: 'Comprovado',
  review: 'Revisar',
  estimated: 'Estimado',
  manual: 'Manual',
};

export const PAYMENT_LABELS = {
  paid: 'Pago',
  pago: 'Pago',
  scheduled: 'Agendado',
  agendado: 'Agendado',
  pending: 'Pendente',
  pendente: 'Pendente',
};

export const INPUT_TYPE_LABELS = {
  invoice: 'Nota fiscal',
  purchase_list: 'Lista de compras',
  quote: 'Orçamento',
  payment_receipt: 'Comprovante',
  order: 'Pedido',
  screenshot: 'Captura',
  other: 'Outro',
};

export const EXPENSE_CATEGORY_LABELS = {
  rent: 'Aluguel',
  payroll: 'Folha / pró-labore',
  utilities: 'Energia / água / gás',
  taxes: 'Impostos / taxas',
  logistics: 'Frete / logística',
  maintenance: 'Manutenção',
  marketing: 'Marketing',
  software: 'Software / serviços',
  supplier_purchase: 'Compra sem itemização',
  other: 'Outro gasto',
};

const MASS_UNITS = ['g', 'kg'];
const VOLUME_UNITS = ['ml', 'l'];

export const safeArray = value => (Array.isArray(value) ? value : []);

export const num = value => {
  const parsed = Number.parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const normalizeText = value => String(value || '').trim();

export const normalizeEntityId = value => {
  if (!value && value !== 0) return '';
  const raw = typeof value === 'object'
    ? value?.id || value?.['@id'] || value?.value || ''
    : value;
  return String(raw || '').replace(/\D+/g, '').trim();
};

export const normalizeSearch = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();

export const normalizeProductKey = value =>
  normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '')
    .toLowerCase();

export const normalizeProductType = value => String(value || '').trim().toLowerCase();

export const extractItems = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  if (Array.isArray(response?.member)) return response.member;
  return [];
};

export const money = value =>
  num(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

export const preciseMoney = value =>
  num(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });

export const csvEscape = value => {
  const text = String(value ?? '');
  if (!/[",;\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
};

export const csvLine = values => values.map(csvEscape).join(';');

export const percent = value => `${num(value).toLocaleString('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})}%`;

export const decimal = (value, digits = 2) =>
  num(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });

export const formatDate = value => {
  if (!value) return 'Sem data';
  const [year, month, day] = String(value).split('-');
  if (!year || !month || !day) return String(value);
  return `${day}/${month}/${year}`;
};

export const evidenceLabel = value => EVIDENCE_LABELS[value] || EVIDENCE_LABELS.review;

export const paymentLabel = value => PAYMENT_LABELS[value] || PAYMENT_LABELS.pending;

export const inputTypeLabel = value => INPUT_TYPE_LABELS[value] || INPUT_TYPE_LABELS.other;

export const expenseCategoryLabel = value => EXPENSE_CATEGORY_LABELS[value] || EXPENSE_CATEGORY_LABELS.other;

export const getById = (db, collection, id) =>
  safeArray(db?.[collection]).find(item => String(item.id) === String(id)) || null;

export const categoryName = (db, categoryId) =>
  getById(db, 'categories', categoryId)?.name || 'Sem categoria';

export const resourceCollectionForRef = refType => {
  if (refType === 'ingredient') return 'ingredients';
  if (refType === 'recipe') return 'recipes';
  if (refType === 'packaging') return 'packaging';
  if (refType === 'product') return 'products';
  return '';
};

export const resourceTypeLabel = refType => {
  if (refType === 'ingredient') return 'Ingrediente';
  if (refType === 'recipe') return 'Preparo';
  if (refType === 'packaging') return 'Embalagem';
  if (refType === 'product') return 'Produto';
  return 'Outro';
};

export const resourceName = (db, refType, refId) => {
  const collection = resourceCollectionForRef(refType);
  const record = collection ? getById(db, collection, refId) : null;
  return record?.name || record?.title || record?.label || refId || 'Item';
};

export const baseUnitForRef = (db, refType, refId) => {
  const collection = resourceCollectionForRef(refType);
  const record = collection ? getById(db, collection, refId) : null;
  if (refType === 'recipe') return record?.yieldUnit || 'un';
  if (refType === 'packaging') return 'un';
  return record?.baseUnit || record?.erpUnit || 'un';
};

export const comparableUnitForBase = baseUnit => {
  const unit = String(baseUnit || '').toLowerCase();
  if (MASS_UNITS.includes(unit)) return 'kg';
  if (VOLUME_UNITS.includes(unit)) return 'L';
  return 'un';
};

export const convertQty = (qty, fromUnit, toUnit) => {
  const value = num(qty);
  const from = String(fromUnit || '').toLowerCase();
  const to = String(toUnit || '').toLowerCase();
  if (!from || !to || from === to) return value;
  if (from === 'kg' && to === 'g') return value * 1000;
  if (from === 'g' && to === 'kg') return value / 1000;
  if (from === 'l' && to === 'ml') return value * 1000;
  if (from === 'ml' && to === 'l') return value / 1000;
  return value;
};

export const ingredientUnitCost = item => {
  const packageQty = Math.max(1, num(item?.purchaseQty));
  const rawUnitCost = num(item?.purchaseCost) / packageQty;
  const wasteFactor = 1 + num(item?.wastePct) / 100;
  return rawUnitCost * wasteFactor;
};

export const packagingUnitCost = item => {
  const packageQty = Math.max(1, num(item?.purchaseQty));
  return num(item?.purchaseCost) / packageQty;
};

export const activeCostMode = item => normalizeText(item?.activeCostMode || item?.costMode || 'purchase');

export const activeCostModeLabel = mode => ({
  purchase: 'Cadastro',
  manual: 'Manual',
  selected: 'Compra escolhida',
  latest: 'Última compra',
  average: 'Média histórica',
  calculated: 'Calculado',
  review: 'Revisão',
}[mode] || mode || 'Cadastro');

export const activeCostOptionsForRef = refType => {
  if (refType === 'recipe') {
    return [
      { value: 'calculated', label: 'Receita calculada' },
      { value: 'manual', label: 'Manual' },
      { value: 'review', label: 'Revisar' },
    ];
  }
  return [
    { value: 'purchase', label: 'Cadastro' },
    { value: 'selected', label: 'Compra escolhida' },
    { value: 'latest', label: 'Última compra' },
    { value: 'average', label: 'Média histórica' },
    { value: 'manual', label: 'Manual' },
    { value: 'review', label: 'Revisar' },
  ];
};

export const activeCostCollectionForRef = refType => {
  if (refType === 'ingredient') return 'ingredients';
  if (refType === 'recipe') return 'recipes';
  if (refType === 'packaging') return 'packaging';
  return '';
};

export const canonicalCostInfoForRecord = (db, refType, record = {}) => {
  if (refType === 'ingredient') {
    const baseUnit = String(record.baseUnit || 'un').toLowerCase();
    const primaryUnit = comparableUnitForBase(baseUnit);
    const baseCost = ingredientUnitCost(record);
    const primaryCost = primaryUnit === 'kg' || primaryUnit === 'L' ? baseCost * 1000 : baseCost;
    return { baseUnit, baseCost, primaryUnit, primaryCost };
  }
  if (refType === 'packaging') {
    const baseCost = packagingUnitCost(record);
    return { baseUnit: 'un', baseCost, primaryUnit: 'un', primaryCost: baseCost };
  }
  if (refType === 'recipe') {
    const baseUnit = String(record.yieldUnit || 'un').toLowerCase();
    const primaryUnit = comparableUnitForBase(baseUnit);
    const baseCost = recipeUnitCost(db, record);
    const primaryCost = primaryUnit === 'kg' || primaryUnit === 'L' ? baseCost * 1000 : baseCost;
    return { baseUnit, baseCost, primaryUnit, primaryCost };
  }
  return { baseUnit: 'un', baseCost: 0, primaryUnit: 'un', primaryCost: 0 };
};

export const purchaseComparableCost = (row = {}, baseUnit = 'un') => {
  const unit = String(row.unit || baseUnit || 'un').toLowerCase();
  const unitPrice = num(row.unitPrice);
  if (!unitPrice) return 0;
  if (unit === baseUnit) return unitPrice;
  return unitPrice / Math.max(1, convertQty(1, baseUnit, unit));
};

const primaryMultiplierForCost = (primaryUnit, baseUnit) => {
  if (primaryUnit === baseUnit) return 1;
  return Math.max(1, convertQty(1, primaryUnit, baseUnit));
};

export const selectedPurchaseForRecord = (db, refType, record = {}) => {
  const rows = purchaseItemsForResource(db, refType, record.id);
  const selectedId = record.activePurchaseItemId || record.selectedPurchaseItemId;
  if (selectedId) return rows.find(row => String(row.id) === String(selectedId)) || null;
  return null;
};

export const activeUnitCost = (db, refType, record = {}) => {
  const mode = activeCostMode(record);
  const baseInfo = canonicalCostInfoForRecord(db, refType, record);
  if (mode === 'manual') return num(record.manualUnitCost || record.fixedUnitCost || record.overrideUnitCost) || baseInfo.primaryCost;
  if (mode === 'selected') {
    const selected = selectedPurchaseForRecord(db, refType, record);
    return selected ? purchaseComparableCost(selected, baseInfo.baseUnit) * primaryMultiplierForCost(baseInfo.primaryUnit, baseInfo.baseUnit) : baseInfo.primaryCost;
  }
  if (mode === 'latest') {
    const latest = purchaseItemsForResource(db, refType, record.id)
      .find(row => purchaseComparableCost(row, baseInfo.baseUnit) > 0);
    return latest ? purchaseComparableCost(latest, baseInfo.baseUnit) * primaryMultiplierForCost(baseInfo.primaryUnit, baseInfo.baseUnit) : baseInfo.primaryCost;
  }
  if (mode === 'average') {
    const rows = purchaseItemsForResource(db, refType, record.id)
      .map(row => purchaseComparableCost(row, baseInfo.baseUnit))
      .filter(value => value > 0);
    const average = rows.length ? rows.reduce((sum, value) => sum + value, 0) / rows.length : 0;
    return average ? average * primaryMultiplierForCost(baseInfo.primaryUnit, baseInfo.baseUnit) : baseInfo.primaryCost;
  }
  return baseInfo.primaryCost;
};

export const activeCostSummary = (db, refType, record = {}) => {
  const baseInfo = canonicalCostInfoForRecord(db, refType, record);
  const mode = activeCostMode(record);
  const purchases = purchaseItemsForResource(db, refType, record.id);
  const activePrimaryCost = activeUnitCost(db, refType, record);
  const selected = selectedPurchaseForRecord(db, refType, record);
  const latest = purchases[0] || null;
  const source =
    mode === 'selected' && selected
      ? `${formatDate(selected.date)} · ${selected.supplierName}`
      : mode === 'latest' && latest
        ? `${formatDate(latest.date)} · ${latest.supplierName}`
        : mode === 'average'
          ? `${purchases.length} compra(s)`
          : record.activeCostNote || record.sourceReference || record.evidenceSource || 'Cadastro técnico';

  return {
    mode,
    modeLabel: activeCostModeLabel(mode),
    primaryUnit: baseInfo.primaryUnit,
    baseUnit: baseInfo.baseUnit,
    activePrimaryCost,
    activeBaseCost: activePrimaryCost / primaryMultiplierForCost(baseInfo.primaryUnit, baseInfo.baseUnit),
    registeredPrimaryCost: baseInfo.primaryCost,
    registeredBaseCost: baseInfo.baseCost,
    source,
    purchaseCount: purchases.length,
    selected,
    latest,
  };
};

export const recipeBatchCost = (db, recipe, stack = []) => {
  if (!recipe || stack.includes(recipe.id)) return 0;
  return safeArray(recipe.components).reduce((sum, component) => (
    sum + componentCost(db, component, [...stack, recipe.id])
  ), 0);
};

export const recipeUnitCost = (db, recipe, stack = []) => {
  const batchCost = recipeBatchCost(db, recipe, stack);
  return batchCost / Math.max(1, num(recipe?.yieldQty));
};

export const componentCost = (db, component, stack = []) => {
  const refType = component?.refType;
  const refId = component?.refId;
  const qty = num(component?.qty);
  const collection = resourceCollectionForRef(refType);
  const record = collection ? getById(db, collection, refId) : null;
  if (!record) return 0;

  if (refType === 'ingredient') return activeCostSummary(db, 'ingredient', record).activeBaseCost * qty;
  if (refType === 'packaging') return activeCostSummary(db, 'packaging', record).activeBaseCost * qty;
  if (refType === 'recipe') {
    const unitCost = activeCostSummary(db, 'recipe', record).activeBaseCost;
    const baseUnit = record?.yieldUnit || 'un';
    const requestedUnit = component?.unit || baseUnit;
    return unitCost * convertQty(qty, requestedUnit, baseUnit);
  }
  if (refType === 'product') return computeProduct(db, refId, stack)?.directCost || 0;
  return 0;
};

export const resolveComponentNode = (db, component, stack = []) => {
  const collection = resourceCollectionForRef(component?.refType);
  const record = collection ? getById(db, collection, component?.refId) : null;
  const children = component?.refType === 'recipe' && record && !stack.includes(record.id)
    ? safeArray(record.components).map(child => resolveComponentNode(db, child, [...stack, record.id]))
    : [];

  return {
    key: `${component?.relationId || ''}:${component?.refType}:${component?.refId}:${stack.join('/')}:${component?.qty}`,
    relationId: component?.relationId || '',
    productIri: component?.productIri || '',
    productGroupIri: component?.productGroupIri || '',
    productChildIri: component?.productChildIri || '',
    productType: component?.productType || '',
    price: num(component?.price),
    active: component?.active !== false,
    refType: component?.refType,
    refId: component?.refId,
    record,
    name: record?.name || component?.refId || 'Item',
    qty: num(component?.qty),
    unit: component?.unit || baseUnitForRef(db, component?.refType, component?.refId),
    cost: componentCost(db, component, stack),
    pricingMode: component?.pricingMode || 'markup',
    children,
  };
};

export const flattenNodes = nodes => safeArray(nodes).flatMap(node => [node, ...flattenNodes(node.children)]);

export const defaultMarkupPct = db => num(db?.settings?.defaultMarkupPct || 200);

export const targetMarginPct = db => num(db?.settings?.targetMarginPct || 68);

export const activeProducts = db =>
  safeArray(db?.products).filter(product => (
    product.active !== false &&
    product.scope !== 'greguinho' &&
    !['feedstock', 'package', 'component'].includes(normalizeProductType(product?.type))
  ));

export const computeAddon = (db, addon = {}, stack = []) => {
  const nodes = safeArray(addon.components).map(component => resolveComponentNode(db, component, stack));
  const directCost = nodes.reduce((sum, node) => sum + node.cost, 0);
  return {
    ...addon,
    nodes,
    directCost,
    salePriceDelta: num(addon.salePriceDelta),
    required: addon.required === true,
    minimum: num(addon.minimum ?? (addon.required ? 1 : 0)),
  };
};

export const computeProduct = (db, productId, stack = []) => {
  const product = getById(db, 'products', productId);
  if (!product || stack.includes(product.id)) return null;

  const nodes = safeArray(product.components).map(component => resolveComponentNode(db, component, [...stack, product.id]));
  const baseDirectCost = nodes.reduce((sum, node) => sum + node.cost, 0);
  const addons = safeArray(product.addons).map(addon => computeAddon(db, addon, [...stack, product.id]));

  const requiredGroups = Object.values(addons.reduce((accumulator, addon) => {
    const group = addon.group || 'Obrigatórios';
    if (!addon.required && addon.minimum <= 0) return accumulator;
    if (!accumulator[group]) accumulator[group] = [];
    accumulator[group].push(addon);
    return accumulator;
  }, {}));

  const requiredCost = requiredGroups.reduce((sum, group) => {
    const sorted = [...group].sort((left, right) => left.directCost - right.directCost);
    const minimum = Math.max(1, num(sorted[0]?.minimum));
    return sum + sorted.slice(0, minimum).reduce((groupSum, addon) => groupSum + addon.directCost, 0);
  }, 0);

  const directCost = baseDirectCost + requiredCost;
  const autoSalePrice = directCost * (1 + defaultMarkupPct(db) / 100);
  const salePrice = num(product.salePrice || product.price || autoSalePrice);
  const ifoodSalePrice = salePrice * 1.27;
  const marginPct = salePrice > 0 ? ((salePrice - directCost) / salePrice) * 100 : 0;
  const passThroughCost = nodes.reduce((sum, node) => (
    sum + (node.pricingMode === 'pass_through' ? node.cost : 0)
  ), 0);
  const markupBaseCost = Math.max(0, directCost - passThroughCost);

  return {
    product,
    nodes,
    addons,
    baseDirectCost,
    requiredCost,
    directCost,
    passThroughCost,
    markupBaseCost,
    autoSalePrice,
    salePrice,
    ifoodSalePrice,
    marginPct,
  };
};

export const computeAllProducts = db =>
  activeProducts(db)
    .map(product => computeProduct(db, product.id))
    .filter(Boolean)
    .sort((left, right) => left.product.name.localeCompare(right.product.name, 'pt-BR'));

export const purchaseItemsForResource = (db, refType, refId) =>
  safeArray(db?.purchaseItems)
    .filter(item => item.resourceType === refType && item.resourceId === refId)
    .map(item => {
      const order = getById(db, 'purchaseOrders', item.orderId);
      const supplier = getById(db, 'suppliers', item.supplierId || order?.supplierId);
      const inputs = linkedInputsForOrder(db, order);
      return {
        ...item,
        order,
        supplier,
        inputs,
        date: order?.date || '',
        supplierName: supplier?.name || order?.supplierName || 'Fornecedor não vinculado',
        paymentStatus: order?.paymentStatus || item.paymentStatus,
      };
    })
    .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));

export const linkedInputsForOrder = (db, order) => {
  const explicitIds = safeArray(order?.inputIds);
  const explicit = explicitIds.map(id => getById(db, 'inputs', id)).filter(Boolean);
  const byDocument = safeArray(db?.inputs).filter(input =>
    order?.documentNumber &&
    input.documentNumber &&
    normalizeSearch(input.documentNumber) === normalizeSearch(order.documentNumber)
  );
  return uniqueById([...explicit, ...byDocument]);
};

export const uniqueById = items => {
  const seen = new Set();
  return safeArray(items).filter(item => {
    const id = item?.id || item?.filePath || item?.title;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

export const productPurchaseRows = (db, computedProduct) => {
  const nodes = flattenNodes(computedProduct?.nodes || []);
  return nodes
    .filter(node => ['ingredient', 'packaging'].includes(node.refType))
    .flatMap(node =>
      purchaseItemsForResource(db, node.refType, node.refId).slice(0, 3).map(row => ({
        ...row,
        resourceName: node.name,
        resourceType: node.refType,
      }))
    )
    .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));
};

export const purchaseFamilyKey = row =>
  [
    row.resourceType || 'other',
    row.resourceId || '',
    normalizeSearch(row.description || row.resourceName || ''),
  ].join(':');

export const purchaseFamilyEntries = db => {
  const entries = safeArray(db?.purchaseItems).map(item => {
    const order = getById(db, 'purchaseOrders', item.orderId);
    const supplier = getById(db, 'suppliers', item.supplierId || order?.supplierId);
    const resource = item.resourceType && item.resourceId
      ? getById(db, resourceCollectionForRef(item.resourceType), item.resourceId)
      : null;
    const inputs = linkedInputsForOrder(db, order);
    const row = {
      ...item,
      date: order?.date || '',
      orderLabel: order?.label || item.orderId,
      documentNumber: order?.documentNumber || '',
      paymentStatus: order?.paymentStatus || item.paymentStatus,
      supplierName: supplier?.name || order?.supplierName || 'Fornecedor não vinculado',
      resourceName: resource?.name || item.description || 'Item comprado',
      inputs,
    };
    return row;
  });

  const grouped = groupBy(entries, purchaseFamilyKey);
  return Object.entries(grouped).map(([key, rows]) => {
    const sorted = [...rows].sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));
    const latest = sorted[0] || {};
    const prices = sorted.map(row => num(row.unitPrice)).filter(value => value > 0);
    const totalAmount = sorted.reduce((sum, row) => sum + num(row.totalPrice || row.totalAmount), 0);
    const suppliers = Array.from(new Set(sorted.map(row => row.supplierName).filter(Boolean)));
    const evidenceCount = sorted.reduce((sum, row) => sum + safeArray(row.inputs).length, 0);
    return {
      key,
      resourceType: latest.resourceType,
      resourceId: latest.resourceId,
      familyName: latest.resourceName || latest.description || 'Item comprado',
      latest,
      rows: sorted,
      occurrenceCount: sorted.length,
      supplierSummary: suppliers.slice(0, 3).join(', '),
      supplierCount: suppliers.length,
      evidenceCount,
      totalAmount,
      minUnitPrice: prices.length ? Math.min(...prices) : 0,
      maxUnitPrice: prices.length ? Math.max(...prices) : 0,
      avgUnitPrice: prices.length ? prices.reduce((sum, value) => sum + value, 0) / prices.length : 0,
      unit: latest.unit || 'un',
    };
  }).sort((left, right) => String(left.familyName).localeCompare(String(right.familyName), 'pt-BR'));
};

export const productUsesForResource = (db, refType, refId) => {
  const uses = [];
  safeArray(db?.recipes).forEach(recipe => {
    const nodes = flattenNodes(safeArray(recipe.components).map(component => resolveComponentNode(db, component, [recipe.id])));
    if (nodes.some(node => node.refType === refType && node.refId === refId)) {
      uses.push({
        key: `recipe:${recipe.id}`,
        type: 'recipe',
        title: recipe.name,
        meta: `Preparo com ${safeArray(recipe.components).length} componente(s)`,
      });
    }
  });
  safeArray(db?.products).forEach(product => {
    const productComponents = safeArray(product.components);
    const productNodes = flattenNodes(productComponents.map(component => resolveComponentNode(db, component, [product.id])));
    if (productNodes.some(node => node.refType === refType && node.refId === refId)) {
      uses.push({
        key: `product:${product.id}`,
        type: 'product',
        title: product.name,
        meta: categoryName(db, product.categoryId),
      });
    }
    safeArray(product.addons).forEach(addon => {
      const addonNodes = flattenNodes(safeArray(addon.components).map(component => resolveComponentNode(db, component, [product.id, addon.id])));
      if (addonNodes.some(node => node.refType === refType && node.refId === refId)) {
        uses.push({
          key: `addon:${product.id}:${addon.id}`,
          type: 'addon',
          title: `${addon.name} em ${product.name}`,
          meta: addon.group || 'Adicional',
        });
      }
    });
  });
  return uniqueById(uses);
};

export const resourceUsageCountMap = db => {
  const map = new Map();
  const add = (refType, refId, ownerKey) => {
    if (!refType || !refId || !ownerKey) return;
    const key = `${refType}:${refId}`;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(ownerKey);
  };

  safeArray(db?.recipes).forEach(recipe => {
    safeArray(recipe.components).forEach(component => {
      flattenNodes([resolveComponentNode(db, component, [recipe.id])])
        .forEach(node => add(node.refType, node.refId, `recipe:${recipe.id}`));
    });
  });

  safeArray(db?.products).forEach(product => {
    safeArray(product.components).forEach(component => {
      flattenNodes([resolveComponentNode(db, component, [product.id])])
        .forEach(node => add(node.refType, node.refId, `product:${product.id}`));
    });
    safeArray(product.addons).forEach(addon => {
      safeArray(addon.components).forEach(component => {
        flattenNodes([resolveComponentNode(db, component, [product.id, addon.id])])
          .forEach(node => add(node.refType, node.refId, `addon:${product.id}:${addon.id}`));
      });
    });
  });

  return Array.from(map.entries()).reduce((accumulator, [key, owners]) => {
    accumulator[key] = owners.size;
    return accumulator;
  }, {});
};

export const supplyResourceTypeForCollection = collection => {
  if (collection === 'ingredients') return 'ingredient';
  if (collection === 'packaging') return 'packaging';
  return '';
};

export const supplyProductTypeForCollection = collection => {
  if (collection === 'ingredients') return 'feedstock';
  if (collection === 'packaging') return 'package';
  return '';
};

export const supplyUnitTokenForCollection = (collection, record) => {
  if (collection === 'ingredients') {
    return normalizeText(record?.erpUnit || record?.baseUnit || 'UN').toUpperCase();
  }

  if (collection === 'packaging') {
    return normalizeText(record?.erpUnit || 'UN').toUpperCase();
  }

  return 'UN';
};

export const supplyActiveUnitCost = (db, collection, record) => {
  const refType = supplyResourceTypeForCollection(collection);
  if (!refType) return 0;
  return activeCostSummary(db, refType, record).activeBaseCost;
};

export const productResourceNodes = computedProduct => [
  ...flattenNodes(safeArray(computedProduct?.nodes || [])),
  ...safeArray(computedProduct?.addons).flatMap(addon =>
    flattenNodes(safeArray(addon?.nodes || [])).map(node => ({
      ...node,
      addonId: addon?.id || '',
      addonName: addon?.name || '',
      addonGroup: addon?.group || '',
      sourceScope: 'addon',
    }))
  ),
];

export const resourceParentUsageRows = (db, refType, refId) => {
  const rows = new Map();

  safeArray(db?.products)
    .filter(product => product.active !== false)
    .forEach(product => {
      const computed = computeProduct(db, product.id);
      const matches = productResourceNodes(computed).filter(node =>
        node.refType === refType && String(node.refId) === String(refId)
      );

      if (!matches.length) return;

      const current = rows.get(String(product.id)) || {
        product: computed?.product || product,
        productId: product.id,
        productName: product.name || `#${product.id}`,
        productCode: product.code || product.id,
        category: categoryName(db, product.categoryId),
        unit: matches[0]?.unit || baseUnitForRef(db, refType, refId),
        qty: 0,
        cost: 0,
        nodeCount: 0,
      };

      matches.forEach(match => {
        current.qty += num(match.qty);
        current.cost += num(match.cost);
        current.nodeCount += 1;
      });

      rows.set(String(product.id), current);
    });

  return Array.from(rows.values()).sort((left, right) =>
    String(left.productName || '').localeCompare(String(right.productName || ''), 'pt-BR')
  );
};

export const resolveRemoteProductMatch = (products, candidate, expectedTypes = []) => {
  const typeSet = new Set(
    safeArray(expectedTypes)
      .map(normalizeProductType)
      .filter(Boolean)
  );
  const normalizedKey = normalizeProductKey(
    candidate?.sku ||
    candidate?.code ||
    candidate?.productCode ||
    candidate?.id ||
    candidate?.product ||
    candidate?.name ||
    candidate?.description ||
    ''
  );
  const normalizedName = normalizeSearch(
    candidate?.product ||
    candidate?.name ||
    candidate?.description ||
    ''
  );

  const candidates = safeArray(products).filter(product => {
    const productKey = normalizeProductKey(
      product?.sku ||
      product?.code ||
      product?.productCode ||
      product?.id ||
      ''
    );
    const productName = normalizeSearch(
      product?.product ||
      product?.name ||
      product?.description ||
      ''
    );
    const productType = normalizeProductType(product?.type);
    const typeMatches = typeSet.size === 0 || typeSet.has(productType);
    const keyMatches = normalizedKey && productKey === normalizedKey;
    const nameMatches = normalizedName && productName === normalizedName;
    return (keyMatches || nameMatches) && (typeMatches || typeSet.size === 0);
  });

  const allMatches = safeArray(products).filter(product => {
    const productKey = normalizeProductKey(
      product?.sku ||
      product?.code ||
      product?.productCode ||
      product?.id ||
      ''
    );
    const productName = normalizeSearch(
      product?.product ||
      product?.name ||
      product?.description ||
      ''
    );
    return (
      (normalizedKey && productKey === normalizedKey) ||
      (normalizedName && productName === normalizedName)
    );
  });

  return {
    match: candidates[0] || null,
    candidates,
    allMatches,
    duplicateCount: allMatches.length,
    typeConflictCount: allMatches.filter(product => {
      const productType = normalizeProductType(product?.type);
      return typeSet.size > 0 && !typeSet.has(productType);
    }).length,
  };
};

export const buildSupplySyncRows = (db, collection, catalogProducts = []) => {
  const refType = supplyResourceTypeForCollection(collection);
  const productType = supplyProductTypeForCollection(collection);
  const saleTypes = ['product', 'manufactured', 'custom', 'service'];

  if (!refType || !productType) return [];

  return safeArray(db?.[collection]).map(item => {
    const localCost = supplyActiveUnitCost(db, collection, item);
    const unitToken = supplyUnitTokenForCollection(collection, item);
    const localParentRows = resourceParentUsageRows(db, refType, item.id);
    const remoteSupplyMatch = resolveRemoteProductMatch(
      catalogProducts,
      {
        sku: item.code || item.id,
        code: item.code || item.id,
        product: item.name,
        name: item.name,
        description: item.description || item.notes || '',
      },
      [productType]
    );
    const remoteSupplyProduct = remoteSupplyMatch.match;
    const remoteSupplyPrice = num(remoteSupplyProduct?.price);
    const supplyPriceDelta = localCost - remoteSupplyPrice;
    const supplyPriceDeltaPct = remoteSupplyPrice ? (supplyPriceDelta / remoteSupplyPrice) * 100 : 0;
    const remoteSupplyStatus = remoteSupplyMatch.duplicateCount > 1
      ? 'duplicate'
      : remoteSupplyProduct
        ? (Math.abs(supplyPriceDelta) > 0.0001 ? 'divergent' : 'synced')
        : (remoteSupplyMatch.allMatches.length > 0 ? 'type_conflict' : 'missing');

    const parentRows = localParentRows.map(parentRow => {
      const remoteParentMatch = resolveRemoteProductMatch(
        catalogProducts,
        parentRow.product || {
          sku: parentRow.productCode,
          code: parentRow.productCode,
          product: parentRow.productName,
          name: parentRow.productName,
        },
        saleTypes
      );
      const remoteParentProduct = remoteParentMatch.match;
      return {
        ...parentRow,
        remoteParentProduct,
        remoteParentId: remoteParentProduct?.id || null,
        remoteParentIri: remoteParentProduct?.id ? `/products/${remoteParentProduct.id}` : '',
        remoteParentStatus: remoteParentMatch.duplicateCount > 1
          ? 'duplicate'
          : remoteParentProduct
            ? 'synced'
            : (remoteParentMatch.allMatches.length > 0 ? 'type_conflict' : 'missing'),
        remoteParentCandidates: remoteParentMatch.allMatches.length,
      };
    });

    return {
      ...item,
      refType,
      productType,
      unitToken,
      localCost,
      localCostLabel: comparableCostLabel(refType, item),
      remoteSupplyProduct,
      remoteSupplyId: remoteSupplyProduct?.id || null,
      remoteSupplyIri: remoteSupplyProduct?.id ? `/products/${remoteSupplyProduct.id}` : '',
      remoteSupplyPrice,
      supplyPriceDelta,
      supplyPriceDeltaPct,
      remoteSupplyStatus,
      parentRows,
      parentCount: parentRows.length,
      resolvedParentCount: parentRows.filter(row => row.remoteParentId).length,
      unresolvedParentCount: parentRows.filter(row => !row.remoteParentId).length,
      totalParentCost: parentRows.reduce((sum, row) => sum + num(row.cost), 0),
    };
  }).sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR'));
};

export const resaleItems = db =>
  safeArray(db?.products).filter(product =>
    product.type === 'drink' ||
    normalizeSearch(`${product.name} ${categoryName(db, product.categoryId)} ${product.notes}`).match(/\b(bebida|coca|agua|h2o|bud|heineken|fanta|sprite|guarana|suco|cha|ice tea)\b/)
  );

export const engineeringSaleProducts = db => {
  const resaleIds = new Set(resaleItems(db).map(product => String(product.id)));
  return activeProducts(db)
    .filter(product => !resaleIds.has(String(product.id)))
    .sort((left, right) => {
      const leftHasFicha = safeArray(left.components).length ? 0 : 1;
      const rightHasFicha = safeArray(right.components).length ? 0 : 1;
      if (leftHasFicha !== rightHasFicha) return leftHasFicha - rightHasFicha;
      return String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR');
    });
};

export const computeEngineeringProducts = db =>
  engineeringSaleProducts(db)
    .map(product => computeProduct(db, product.id))
    .filter(Boolean);

export const pendingItems = db => {
  const resourceRows = [
    ...safeArray(db?.ingredients).map(item => ({ ...item, kind: 'Ingrediente', refType: 'ingredient' })),
    ...safeArray(db?.recipes).map(item => ({ ...item, kind: 'Preparo', refType: 'recipe' })),
    ...safeArray(db?.packaging).map(item => ({ ...item, kind: 'Embalagem', refType: 'packaging' })),
  ];

  return resourceRows.filter(item => {
    const evidence = item.evidenceType || item.sourceType;
    return (
      item.active === false ||
      ['review', 'estimated', 'manual'].includes(evidence) ||
      normalizeSearch(`${item.name} ${item.notes} ${item.sourceReference}`).includes('revis')
    );
  });
};

export const processRows = db => {
  const usageCount = resourceUsageCountMap(db);
  const productRows = activeProducts(db).map(product => ({
    key: `product:${product.id}`,
    refType: 'product',
    refId: product.id,
    title: product.name,
    typeLabel: 'Produto de venda',
    purchase: 'Ficha técnica',
    receiving: `${safeArray(product.components).length} componente(s)`,
    storage: categoryName(db, product.categoryId),
    handling: safeArray(product.addons).length ? `${safeArray(product.addons).length} grupo(s)` : 'Sem adicionais',
    portion: product.erpUnit || 'UN',
    usage: money(computeProduct(db, product.id)?.directCost || 0),
    evidence: product.sourceReference || product.notes || '',
  }));

  const recipeRows = safeArray(db?.recipes).map(recipe => ({
    key: `recipe:${recipe.id}`,
    refType: 'recipe',
    refId: recipe.id,
    title: recipe.name,
    typeLabel: 'Preparo',
    purchase: `${safeArray(recipe.components).length} insumo(s)`,
    receiving: 'Receita padrão',
    storage: recipe.storage || 'Não mapeado',
    handling: recipe.notes || recipe.description || 'Processo a revisar',
    portion: `${decimal(recipe.yieldQty)} ${recipe.yieldUnit || 'un'}`,
    usage: money(recipeBatchCost(db, recipe)),
    evidence: recipe.evidenceSource || recipe.sourceReference || '',
  }));

  const ingredientRows = safeArray(db?.ingredients).map(item => ({
    key: `ingredient:${item.id}`,
    refType: 'ingredient',
    refId: item.id,
    title: item.name,
    typeLabel: 'Ingrediente',
    purchase: `${money(item.purchaseCost)} / ${decimal(item.purchaseQty)} ${item.baseUnit || 'un'}`,
    receiving: item.supplier || 'Fornecedor não informado',
    storage: item.storage || 'Estoque',
    handling: item.notes || 'Uso direto ou em preparo',
    portion: comparableCostLabel('ingredient', item),
    usage: `${usageCount[`ingredient:${item.id}`] || 0} uso(s)`,
    evidence: item.evidenceSource || item.sourceReference || '',
  }));

  return [...productRows, ...recipeRows, ...ingredientRows];
};

export const comparableCostLabel = (refType, record) => {
  if (refType === 'ingredient') {
    const unit = String(record?.baseUnit || 'un').toLowerCase();
    const unitCost = ingredientUnitCost(record);
    if (unit === 'g') return `${money(unitCost * 1000)} / kg`;
    if (unit === 'ml') return `${money(unitCost * 1000)} / L`;
    return `${money(unitCost)} / ${unit}`;
  }
  if (refType === 'packaging') return `${money(packagingUnitCost(record))} / un`;
  if (refType === 'recipe') {
    const unit = String(record?.yieldUnit || 'un').toLowerCase();
    return unit === 'g' ? 'por kg' : unit === 'ml' ? 'por L' : `por ${unit}`;
  }
  return '';
};

export const resourceActiveCostLabel = (db, refType, record) => {
  const summary = activeCostSummary(db, refType, record);
  return `${money(summary.activePrimaryCost)} / ${summary.primaryUnit}`;
};

export const dashboardMetrics = db => {
  const products = computeAllProducts(db);
  const directCost = products.reduce((sum, item) => sum + item.directCost, 0);
  const salePrice = products.reduce((sum, item) => sum + item.salePrice, 0);
  const purchaseTotal = safeArray(db?.purchaseOrders).reduce((sum, order) => sum + num(order.totalAmount), 0);
  const evidenceCount = safeArray(db?.inputs).length;
  return [
    { key: 'products', label: 'Produtos ativos', value: String(products.length), tone: 'neutral' },
    { key: 'margin', label: 'Margem média', value: percent(salePrice ? ((salePrice - directCost) / salePrice) * 100 : 0), tone: 'good' },
    { key: 'purchases', label: 'Compras registradas', value: money(purchaseTotal), tone: 'neutral' },
    { key: 'evidence', label: 'Evidências', value: String(evidenceCount), tone: 'neutral' },
    { key: 'pending', label: 'Pendências', value: String(pendingItems(db).length), tone: 'warn' },
  ];
};

export const filterBySearch = (items, query, fields) => {
  const search = normalizeSearch(query);
  if (!search) return items;
  return safeArray(items).filter(item =>
    normalizeSearch(fields.map(field => field(item)).join(' ')).includes(search)
  );
};

export const groupBy = (items, keyGetter) =>
  safeArray(items).reduce((accumulator, item) => {
    const key = keyGetter(item) || 'Outros';
    if (!accumulator[key]) accumulator[key] = [];
    accumulator[key].push(item);
    return accumulator;
  }, {});

export const buildExportPayload = db => ({
  ...db,
  meta: {
    ...(db.meta || {}),
    exportedAt: new Date().toISOString(),
    sourceApp: 'ERP MenuCostsPage',
  },
});

export const buildErpExportPayload = db => {
  const products = computeAllProducts(db);
  const componentRows = products.flatMap(computed =>
    flattenNodes(computed.nodes).map(node => ({
      product_code: computed.product.code || computed.product.id,
      product_name: computed.product.name,
      component_type: node.refType,
      component_code: node.record?.code || node.refId,
      component_name: node.name,
      quantity: node.qty,
      unit: node.unit,
      pricing_mode: node.pricingMode,
      cost: node.cost,
    }))
  );
  const addonRows = products.flatMap(computed =>
    computed.addons.map(addon => ({
      product_code: computed.product.code || computed.product.id,
      product_name: computed.product.name,
      addon_code: addon.code || addon.id,
      addon_name: addon.name,
      group: addon.group,
      required: addon.required,
      minimum: addon.minimum,
      maximum: addon.maximum,
      price_calculation: addon.priceCalculation || addon.salePriceMode || 'sum',
      sale_price_delta: addon.salePriceDelta,
      direct_cost: addon.directCost,
    }))
  );

  return {
    meta: {
      ...(db?.meta || {}),
      exportedAt: new Date().toISOString(),
      sourceApp: 'ERP MenuCostsPage',
      mode: 'local-readonly-migration',
    },
    products: products.map(computed => ({
      code: computed.product.code || computed.product.id,
      name: computed.product.name,
      category: categoryName(db, computed.product.categoryId),
      sale_price: computed.salePrice,
      direct_cost: computed.directCost,
      base_direct_cost: computed.baseDirectCost,
      required_cost: computed.requiredCost,
      margin_pct: computed.marginPct,
      ifood_price: computed.ifoodSalePrice,
      erp_unit: computed.product.erpUnit || 'UN',
      erp_type: computed.product.erpProductType || computed.product.type || 'product',
      active: computed.product.active !== false,
    })),
    components: componentRows,
    addons: addonRows,
    ingredients: safeArray(db?.ingredients).map(item => ({
      code: item.code || item.id,
      name: item.name,
      erp_type: 'feedstock',
      erp_unit: item.erpUnit || item.baseUnit,
      canonical_cost: comparableCostLabel('ingredient', item),
      purchase_qty: num(item.purchaseQty),
      purchase_cost: num(item.purchaseCost),
      waste_pct: num(item.wastePct),
      supplier: item.supplier,
      evidence_type: item.evidenceType || item.sourceType,
      source: item.sourceReference || item.evidenceSource,
    })),
    recipes: safeArray(db?.recipes).map(item => ({
      code: item.code || item.id,
      name: item.name,
      erp_type: 'component',
      erp_unit: item.erpUnit || item.yieldUnit,
      yield_qty: num(item.yieldQty),
      yield_unit: item.yieldUnit,
      batch_cost: recipeBatchCost(db, item),
      unit_cost: recipeUnitCost(db, item),
      components_count: safeArray(item.components).length,
      evidence_type: item.evidenceType || item.sourceType,
    })),
    packaging: safeArray(db?.packaging).map(item => ({
      code: item.code || item.id,
      name: item.name,
      erp_type: 'package',
      erp_unit: item.erpUnit || 'UN',
      unit_cost: packagingUnitCost(item),
      purchase_qty: num(item.purchaseQty),
      purchase_cost: num(item.purchaseCost),
      supplier: item.supplier,
      evidence_type: item.evidenceType || item.sourceType,
    })),
    purchase_orders: safeArray(db?.purchaseOrders),
    purchase_items: safeArray(db?.purchaseItems),
    inputs: safeArray(db?.inputs),
    suppliers: safeArray(db?.suppliers),
  };
};

export const buildErpCatalogCsv = db => {
  const header = [
    'codigo',
    'produto',
    'categoria',
    'preco_venda',
    'custo_direto',
    'custo_obrigatorio',
    'margem_pct',
    'preco_ifood',
    'unidade_erp',
    'tipo_erp',
    'ativo',
  ];
  const rows = computeAllProducts(db).map(computed => [
    computed.product.code || computed.product.id,
    computed.product.name,
    categoryName(db, computed.product.categoryId),
    num(computed.salePrice).toFixed(2),
    num(computed.directCost).toFixed(4),
    num(computed.requiredCost).toFixed(4),
    num(computed.marginPct).toFixed(2),
    num(computed.ifoodSalePrice).toFixed(2),
    computed.product.erpUnit || 'UN',
    computed.product.erpProductType || computed.product.type || 'product',
    computed.product.active !== false ? '1' : '0',
  ]);
  return [csvLine(header), ...rows.map(csvLine)].join('\n');
};

export const validateImportedDb = value => {
  if (!value || typeof value !== 'object') throw new Error('Arquivo inválido.');
  ['categories', 'ingredients', 'recipes', 'products'].forEach(key => {
    if (!Array.isArray(value[key])) throw new Error(`Arquivo sem coleção ${key}.`);
  });
  return value;
};
