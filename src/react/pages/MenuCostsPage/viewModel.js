export const MISSING_TEXT = 'FALTA INFORMAÇÃO';

export const TAB_DEFINITIONS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    description: 'Visão geral do custo, do cardápio ativo e do rateio fixo.',
  },
  {
    key: 'catalog',
    label: 'Catálogo',
    description: 'Itens finais do cardápio, combos e composição por camadas.',
  },
  {
    key: 'ledger',
    label: 'Lançamentos',
    description: 'Compras organizadas por data, período e evidência.',
  },
  {
    key: 'resources',
    label: 'Cadastros',
    description: 'Ingredientes, preparos, embalagens, custos e parâmetros.',
  },
];

export const LEDGER_MODES = [
  { key: 'timeline', label: 'Linha do tempo' },
  { key: 'map', label: 'Mapa de compras' },
];

export const CATALOG_SEGMENTS = [
  { key: 'all', label: 'Tudo', accent: '#9AA9C2' },
  { key: 'ingredients', label: 'Ingredientes', accent: '#22C55E' },
  { key: 'recipes', label: 'Preparos', accent: '#F97316' },
  { key: 'packaging', label: 'Embalagens', accent: '#38BDF8' },
  { key: 'finalItems', label: 'Itens finais/combos', accent: '#FBBF24' },
];

export const SOURCE_STATUS = {
  AVAILABLE: 'available',
  EMPTY: 'empty',
  MISSING: 'missing',
};

const DEFAULT_EMPTY_MESSAGE = 'Sem registros';
const DEFAULT_PAGE_SIZE = 100;
const DETAIL_FETCH_CONCURRENCY = 6;

const normalizeText = value => String(value || '').trim();

const safeArray = value => (Array.isArray(value) ? value : []);

const normalizeLookupKey = value => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/gi, ' ')
  .trim()
  .toLowerCase();

export const createSourceState = (items, emptyMessage = DEFAULT_EMPTY_MESSAGE) => {
  const normalizedItems = safeArray(items);

  if (normalizedItems.length > 0) {
    return {
      status: SOURCE_STATUS.AVAILABLE,
      items: normalizedItems,
      message: '',
    };
  }

  return {
    status: SOURCE_STATUS.EMPTY,
    items: [],
    message: emptyMessage,
  };
};

export const createMissingSource = (message = MISSING_TEXT) => ({
  status: SOURCE_STATUS.MISSING,
  items: [],
  message,
});

export const getCollectionItems = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.member)) return response.member;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  return [];
};

const getCollectionTotal = response => {
  if (typeof response?.totalItems === 'number') return response.totalItems;
  if (typeof response?.['hydra:totalItems'] === 'number') return response['hydra:totalItems'];
  if (Array.isArray(response)) return response.length;
  return null;
};

const toNumber = value => {
  const number = Number.parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(number) ? number : null;
};

const toPositiveNumber = value => {
  const number = toNumber(value);
  return number !== null && number > 0 ? number : null;
};

const toId = value => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const matches = value.match(/\d+/g);
    return matches ? Number(matches[matches.length - 1]) : null;
  }
  if (typeof value === 'object' && value !== null) {
    if (value.id) return toId(value.id);
    if (value['@id']) return toId(value['@id']);
  }
  return null;
};

const toIri = (resource, value) => {
  if (!value) return null;
  if (typeof value === 'string' && value.startsWith('/')) return value;
  const id = toId(value);
  return id ? `/${resource}/${id}` : null;
};

const getCompanyLabel = company =>
  normalizeText(company?.alias || company?.name || company?.company || company?.fantasy_name || '');

export const getPeopleLabel = people =>
  normalizeText(
    people?.alias ||
    people?.name ||
    people?.company ||
    people?.fantasy_name ||
    people?.document ||
    ''
  );

export const getProductLabel = product =>
  normalizeText(product?.product || product?.name || product?.description || '');

export const getInventoryLabel = inventory =>
  normalizeText(inventory?.inventory || inventory?.name || '');

export const formatDate = value => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

export const formatDateTime = value => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatMoney = value => {
  const number = toPositiveNumber(value);
  if (number === null) return null;
  return number.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

export const formatQuantity = (value, maxDigits = 2) => {
  const number = toNumber(value);
  if (number === null) return '';
  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDigits,
  });
};

const formatPercentValue = value => {
  const number = toNumber(value);
  if (number === null) return null;
  return `${formatQuantity(number, 2)}%`;
};

const formatMoneyValue = value => {
  const number = toNumber(value);
  if (number === null) return null;
  return number.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

const parseConfigValue = value => {
  if (typeof value !== 'string') return value;

  const trimmedValue = value.trim();
  if (!trimmedValue) return '';

  try {
    return JSON.parse(trimmedValue);
  } catch {
    return value;
  }
};

const prettifyConfigKey = configKey =>
  String(configKey || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const formatConfigValue = value => {
  if (value === null || value === undefined) return '';

  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Não';
  }

  if (typeof value === 'number') {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    const preview = value
      .slice(0, 3)
      .map(item => formatConfigValue(item))
      .filter(Boolean)
      .join(', ');

    return preview || JSON.stringify(value);
  }

  if (typeof value === 'object') {
    const preview = Object.entries(value)
      .slice(0, 3)
      .map(([key, itemValue]) => `${prettifyConfigKey(key)}: ${formatConfigValue(itemValue)}`)
      .join(' • ');

    return preview || JSON.stringify(value);
  }

  return String(value);
};

const createConfigEntry = ({
  id,
  label,
  configKey,
  visibility = '',
  parsedValue,
  parentConfigKey = '',
}) => ({
  id,
  label,
  configKey,
  parentConfigKey,
  visibility,
  parsedValue,
  valueLabel: formatConfigValue(parsedValue),
  normalizedKey: normalizeLookupKey(
    [configKey, parentConfigKey, label]
      .filter(Boolean)
      .join(' '),
  ),
});

const buildConfigEntries = (configItems = [], configMap = {}) => {
  const indexedEntries = new Map();

  safeArray(configItems).forEach(config => {
    const configKey = normalizeText(config?.configKey || '');
    if (!configKey) return;

    const parsedValue = parseConfigValue(config?.configValue);
    indexedEntries.set(configKey, createConfigEntry({
      id: toId(config) || `config-${configKey}`,
      label: prettifyConfigKey(configKey),
      configKey,
      visibility: normalizeText(config?.visibility || ''),
      parsedValue,
    }));
  });

  Object.entries(configMap || {}).forEach(([configKey, configValue]) => {
    const normalizedKey = normalizeText(configKey);
    if (!normalizedKey || indexedEntries.has(normalizedKey)) return;

    const parsedValue = parseConfigValue(configValue);
    indexedEntries.set(normalizedKey, createConfigEntry({
      id: `company-config-${normalizedKey}`,
      label: prettifyConfigKey(normalizedKey),
      configKey: normalizedKey,
      visibility: 'public',
      parsedValue,
    }));
  });

  return Array.from(indexedEntries.values()).sort((left, right) => left.label.localeCompare(right.label, 'pt-BR', { sensitivity: 'base' }));
};

const buildNestedConfigEntries = (entries, maxDepth = 3) => {
  const nestedEntries = [];

  const pushEntry = (baseEntry, path, value) => {
    if (!path.length) return;

    const pathKey = path.join('.');
    nestedEntries.push(createConfigEntry({
      id: `${baseEntry.id}:${pathKey}`,
      label: `${baseEntry.label} / ${path.map(prettifyConfigKey).join(' / ')}`,
      configKey: `${baseEntry.configKey}.${pathKey}`,
      visibility: baseEntry.visibility,
      parsedValue: value,
      parentConfigKey: baseEntry.configKey,
    }));
  };

  const walkValue = (baseEntry, value, path = [], depth = 0) => {
    if (value === null || value === undefined) {
      pushEntry(baseEntry, path, value);
      return;
    }

    if (depth >= maxDepth) {
      pushEntry(baseEntry, path, value);
      return;
    }

    if (Array.isArray(value)) {
      if (!value.length) {
        pushEntry(baseEntry, path, value);
        return;
      }

      value.forEach((item, index) => {
        walkValue(baseEntry, item, [...path, String(index + 1)], depth + 1);
      });
      return;
    }

    if (typeof value === 'object') {
      const objectEntries = Object.entries(value);
      if (!objectEntries.length) {
        pushEntry(baseEntry, path, value);
        return;
      }

      objectEntries.forEach(([key, itemValue]) => {
        walkValue(baseEntry, itemValue, [...path, key], depth + 1);
      });
      return;
    }

    pushEntry(baseEntry, path, value);
  };

  entries.forEach(entry => {
    walkValue(entry, entry.parsedValue);
  });

  return nestedEntries;
};

const buildDisplayConfigEntries = (configEntries, nestedEntries) => {
  const nestedParents = new Set(
    nestedEntries
      .map(entry => normalizeText(entry?.parentConfigKey || ''))
      .filter(Boolean),
  );

  return [
    ...configEntries.filter(entry => !nestedParents.has(normalizeText(entry?.configKey || ''))),
    ...nestedEntries,
  ].sort((left, right) => left.label.localeCompare(right.label, 'pt-BR', { sensitivity: 'base' }));
};

const findConfigEntry = (entries, candidates = [], keywordGroups = []) => {
  const normalizedCandidates = candidates
    .map(candidate => normalizeText(candidate))
    .filter(Boolean);

  if (normalizedCandidates.length) {
    const exactMatch = entries.find(entry => normalizedCandidates.includes(entry.configKey));
    if (exactMatch) return exactMatch;
  }

  if (!keywordGroups.length) return null;

  return entries.find(entry =>
    keywordGroups.every(keywordGroup =>
      keywordGroup.some(keyword => entry.normalizedKey.includes(normalizeLookupKey(keyword))),
    ),
  ) || null;
};

const filterConfigEntries = (entries, keywordGroups = []) => {
  if (!keywordGroups.length) return [];

  return entries.filter(entry =>
    keywordGroups.some(keywordGroup =>
      keywordGroup.every(keyword => entry.normalizedKey.includes(normalizeLookupKey(keyword))),
    ),
  );
};

const buildConfigMetric = (entries, { key, label, candidates = [], keywordGroups = [], formatter = null }) => {
  const configEntry = findConfigEntry(entries, candidates, keywordGroups);

  if (!configEntry) {
    return {
      key,
      label,
      value: '',
      message: 'Sem configuração',
      accent: '#9AA9C2',
      missing: true,
    };
  }

  const formattedValue = formatter
    ? formatter(configEntry.parsedValue, configEntry)
    : configEntry.valueLabel;

  return {
    key,
    label,
    value: formattedValue || '—',
    message: configEntry.configKey,
    accent: '#FBBF24',
    missing: false,
  };
};

const getProductSegmentKey = type => {
  switch (type) {
    case 'feedstock':
      return 'ingredients';
    case 'manufactured':
      return 'recipes';
    case 'package':
      return 'packaging';
    case 'product':
    case 'custom':
    case 'service':
    case 'component':
      return 'finalItems';
    default:
      return 'finalItems';
  }
};

export const getProductSegmentMeta = type => (
  CATALOG_SEGMENTS.find(segment => segment.key === getProductSegmentKey(type))
  || CATALOG_SEGMENTS[CATALOG_SEGMENTS.length - 1]
);

const getProductTypeLabel = type => {
  switch (type) {
    case 'feedstock':
      return 'Ingrediente';
    case 'manufactured':
      return 'Preparo';
    case 'package':
      return 'Embalagem';
    case 'product':
      return 'Produto';
    case 'custom':
      return 'Combo';
    case 'service':
      return 'Serviço';
    case 'component':
      return 'Componente';
    default:
      return 'Outro';
  }
};

export async function fetchAllPages(apiClient, endpoint, params = {}, options = {}) {
  const itemsPerPage = options.itemsPerPage || DEFAULT_PAGE_SIZE;
  const maxPages = options.maxPages || 40;
  let currentPage = 1;
  let items = [];

  while (currentPage <= maxPages) {
    const response = await apiClient.fetch(endpoint, {
      params: {
        ...params,
        itemsPerPage,
        page: currentPage,
      },
    });

    const chunk = getCollectionItems(response);
    const totalItems = getCollectionTotal(response);

    items = items.concat(chunk);

    if (chunk.length < itemsPerPage) break;
    if (totalItems !== null && items.length >= totalItems) break;

    currentPage += 1;
  }

  return items;
}

async function mapWithConcurrency(items, mapper, concurrency = DETAIL_FETCH_CONCURRENCY) {
  const results = new Array(items.length);
  let cursor = 0;

  const workers = new Array(Math.min(concurrency, items.length)).fill(null).map(async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}

const sortByName = (left, right, extractor) =>
  extractor(left).localeCompare(extractor(right), 'pt-BR', { sensitivity: 'base' });

const buildCategoriesByProductId = productCategories => {
  const categoriesByProductId = {};

  productCategories.forEach(relation => {
    const productId = toId(relation?.product);
    const categoryName = normalizeText(relation?.category?.name || relation?.category?.category || '');

    if (!productId || !categoryName) return;

    if (!categoriesByProductId[productId]) {
      categoriesByProductId[productId] = [];
    }

    categoriesByProductId[productId].push({
      id: toId(relation?.category),
      name: categoryName,
      color: normalizeText(relation?.category?.color || ''),
    });
  });

  Object.keys(categoriesByProductId).forEach(productId => {
    categoriesByProductId[productId].sort((left, right) => sortByName(left, right, item => item.name));
  });

  return categoriesByProductId;
};

const buildGroupsByProductId = productGroups => {
  const groupsByProductId = {};

  productGroups.forEach(group => {
    const productId = toId(group?.parentProduct);

    if (!productId) return;

    if (!groupsByProductId[productId]) {
      groupsByProductId[productId] = [];
    }

    groupsByProductId[productId].push({
      id: toId(group),
      iri: toIri('product_groups', group),
      name: normalizeText(group?.productGroup || ''),
      minimum: group?.minimum,
      maximum: group?.maximum,
      required: Boolean(group?.required),
      priceCalculation: normalizeText(group?.priceCalculation || ''),
      groupOrder: toNumber(group?.groupOrder) ?? 0,
      active: group?.active !== false,
    });
  });

  Object.keys(groupsByProductId).forEach(productId => {
    groupsByProductId[productId].sort((left, right) => {
      if (left.groupOrder !== right.groupOrder) return left.groupOrder - right.groupOrder;
      return sortByName(left, right, item => item.name);
    });
  });

  return groupsByProductId;
};

const extractProductSuppliers = product => {
  const relations = safeArray(product?.productPeople)
    .filter(relation => relation?.people)
    .map(relation => ({
      id: toId(relation?.people),
      label: getPeopleLabel(relation?.people),
      role: normalizeText(relation?.role || ''),
      priority: toNumber(relation?.priority) ?? 0,
      costPriceLabel: formatMoney(relation?.costPrice),
      supplierSku: normalizeText(relation?.supplierSku || ''),
      leadTimeDays: toNumber(relation?.leadTimeDays),
    }))
    .filter(relation => relation.id && relation.label);

  relations.sort((left, right) => {
    if (left.priority !== right.priority) return left.priority - right.priority;
    return left.label.localeCompare(right.label, 'pt-BR', { sensitivity: 'base' });
  });

  return relations;
};

const extractPricingSnapshot = product => {
  const pricing = product?.extraData?.pricing;
  if (!pricing || typeof pricing !== 'object') {
    return null;
  }

  const channelSuggestedByMargin = safeArray(pricing?.channelSimulations)
    .map(simulation => toNumber(simulation?.suggestedByMarginWithFees))
    .find(value => value !== null);

  const costBreakdown = pricing?.costBreakdown || {};

  const snapshot = {
    source: normalizeText(pricing?.source || ''),
    syncMode: normalizeText(pricing?.syncMode || ''),
    marginTarget: toNumber(pricing?.marginTarget),
    marginTargetLabel: formatPercentValue(pricing?.marginTarget),
    simulatedByMargin: toNumber(pricing?.simulatedByMargin),
    simulatedByMarginLabel: formatMoneyValue(pricing?.simulatedByMargin),
    suggestedByMarginWithFees: channelSuggestedByMargin,
    suggestedByMarginWithFeesLabel: formatMoneyValue(channelSuggestedByMargin),
    totalUnitCost: toNumber(costBreakdown?.totalUnitCost),
    totalUnitCostLabel: formatMoneyValue(costBreakdown?.totalUnitCost),
    operationalCost: toNumber(costBreakdown?.operationalCost),
    operationalCostLabel: formatMoneyValue(costBreakdown?.operationalCost),
    packagingCost: toNumber(costBreakdown?.packagingCost),
    packagingCostLabel: formatMoneyValue(costBreakdown?.packagingCost),
    logisticsCost: toNumber(costBreakdown?.logisticsCost),
    logisticsCostLabel: formatMoneyValue(costBreakdown?.logisticsCost),
    lossPct: toNumber(pricing?.lossPct),
    lossPctLabel: formatPercentValue(pricing?.lossPct),
  };

  const hasAnyValue = Object.values(snapshot).some(value =>
    value !== null && value !== undefined && value !== '',
  );

  return hasAnyValue ? snapshot : null;
};

const buildCatalogItems = ({ products, categoriesByProductId, groupsByProductId }) => {
  const items = products.map(product => {
    const productId = toId(product);
    const productName = getProductLabel(product) || `Produto #${productId || '-'}`;
    const categories = categoriesByProductId[productId] || [];
    const productGroups = groupsByProductId[productId] || [];
    const suppliers = extractProductSuppliers(product);
    const segment = getProductSegmentMeta(product?.type);
    const pricing = extractPricingSnapshot(product);

    return {
      id: productId,
      iri: toIri('products', product),
      name: productName,
      description: normalizeText(product?.description || ''),
      sku: normalizeText(product?.sku || ''),
      type: normalizeText(product?.type || ''),
      typeLabel: getProductTypeLabel(product?.type),
      segmentKey: segment.key,
      segmentLabel: segment.label,
      segmentAccent: segment.accent,
      active: product?.active !== false,
      featured: Boolean(product?.featured),
      price: toPositiveNumber(product?.price),
      priceLabel: formatMoney(product?.price),
      unitLabel: normalizeText(product?.productUnit?.productUnit || ''),
      queueLabel: normalizeText(product?.queue?.queue || ''),
      categories,
      categoryNames: categories.map(category => category.name),
      suppliers,
      supplierCount: suppliers.length,
      groupCount: productGroups.length,
      groups: productGroups,
      defaultInInventory: getInventoryLabel(product?.defaultInInventory),
      defaultOutInventory: getInventoryLabel(product?.defaultOutInventory),
      pricing,
    };
  });

  items.sort((left, right) => {
    if (left.active !== right.active) return left.active ? -1 : 1;
    return sortByName(left, right, item => item.name);
  });

  return items;
};

const buildPurchaseOrderItem = orderProduct => {
  const productId = toId(orderProduct?.product);
  const productType = normalizeText(orderProduct?.product?.type || '');

  return {
    id: toId(orderProduct),
    productId,
    productKey: `${productId || 'x'}:${productType || 'unknown'}`,
    productType,
    productTypeLabel: getProductTypeLabel(productType),
    productName: getProductLabel(orderProduct?.product) || `Produto #${productId || '-'}`,
    sku: normalizeText(orderProduct?.product?.sku || ''),
    quantity: toNumber(orderProduct?.quantity) ?? 0,
    quantityLabel: formatQuantity(orderProduct?.quantity, 3) || '0',
    inInventoryLabel: getInventoryLabel(orderProduct?.inInventory),
    price: toPositiveNumber(orderProduct?.price),
    priceLabel: formatMoney(orderProduct?.price),
    total: toPositiveNumber(orderProduct?.total),
    totalLabel: formatMoney(orderProduct?.total),
    comment: normalizeText(orderProduct?.comment || ''),
    hasPrice: toPositiveNumber(orderProduct?.price) !== null,
    hasTotal: toPositiveNumber(orderProduct?.total) !== null,
  };
};

const buildLedgerOrders = purchaseOrders => {
  const orders = purchaseOrders.map(order => {
    const topLevelItems = safeArray(order?.orderProducts).filter(item => !item?.orderProduct);
    const items = topLevelItems.map(buildPurchaseOrderItem);
    const supplierLabel = getPeopleLabel(order?.client);

    return {
      id: toId(order),
      iri: toIri('orders', order),
      date: order?.orderDate,
      dateLabel: formatDate(order?.orderDate),
      dateTimeLabel: formatDateTime(order?.orderDate),
      supplierLabel,
      supplierMissing: !supplierLabel,
      comments: normalizeText(order?.comments || ''),
      statusLabel: normalizeText(order?.status?.status || ''),
      statusColor: normalizeText(order?.status?.color || ''),
      totalLabel: formatMoney(order?.price),
      orderPrice: toPositiveNumber(order?.price),
      itemCount: items.length,
      totalQuantity: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
      items,
      itemsPreview: items.slice(0, 3).map(item => item.productName),
      evidence: createMissingSource(),
      documentNumber: createMissingSource(),
      paymentStatus: createMissingSource(),
    };
  });

  orders.sort((left, right) => new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime());

  return orders;
};

const buildPurchaseMapRows = ledgerOrders => {
  const grouped = new Map();

  ledgerOrders.forEach(order => {
    order.items.forEach(item => {
      if (!grouped.has(item.productKey)) {
        grouped.set(item.productKey, {
          key: item.productKey,
          productId: item.productId,
          productName: item.productName,
          productType: item.productType,
          productTypeLabel: item.productTypeLabel,
          sku: item.sku,
          quantity: 0,
          total: 0,
          hasAnyTotal: false,
          hasAnyPrice: false,
          latestPrice: null,
          occurrences: [],
          suppliers: new Set(),
          inventories: new Set(),
          lastOrderDate: order.date,
        });
      }

      const row = grouped.get(item.productKey);

      row.quantity += item.quantity || 0;
      row.total += item.total || 0;
      row.hasAnyTotal = row.hasAnyTotal || item.total !== null;
      row.hasAnyPrice = row.hasAnyPrice || item.price !== null;
      row.latestPrice = row.latestPrice ?? item.price;
      row.lastOrderDate = new Date(order.date || 0) > new Date(row.lastOrderDate || 0)
        ? order.date
        : row.lastOrderDate;

      if (order.supplierLabel) row.suppliers.add(order.supplierLabel);
      if (item.inInventoryLabel) row.inventories.add(item.inInventoryLabel);

      row.occurrences.push({
        orderId: order.id,
        date: order.date,
        dateLabel: order.dateLabel,
        supplierLabel: order.supplierLabel,
        quantityLabel: item.quantityLabel,
        totalLabel: item.totalLabel,
        priceLabel: item.priceLabel,
        inInventoryLabel: item.inInventoryLabel,
      });
    });
  });

  return Array.from(grouped.values())
    .map(row => ({
      key: row.key,
      productId: row.productId,
      productName: row.productName,
      productTypeLabel: row.productTypeLabel,
      sku: row.sku,
      quantityLabel: formatQuantity(row.quantity, 3) || '0',
      totalLabel: row.hasAnyTotal ? formatMoney(row.total) : null,
      latestPriceLabel: row.hasAnyPrice ? formatMoney(row.latestPrice) : null,
      suppliers: Array.from(row.suppliers.values()),
      inventories: Array.from(row.inventories.values()),
      lastOrderDate: row.lastOrderDate,
      lastOrderDateLabel: formatDate(row.lastOrderDate),
      occurrences: row.occurrences.sort(
        (left, right) => new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime(),
      ),
    }))
    .sort((left, right) => new Date(right.lastOrderDate || 0).getTime() - new Date(left.lastOrderDate || 0).getTime());
};

const buildRegisterSections = ({ catalogItems, suppliers, ledgerOrders }) => {
  const sectionFromItems = (items, title) => ({
    title,
    ...createSourceState(items),
  });

  return {
    ingredients: sectionFromItems(catalogItems.filter(item => item.segmentKey === 'ingredients'), 'Ingredientes'),
    recipes: sectionFromItems(catalogItems.filter(item => item.segmentKey === 'recipes'), 'Preparos'),
    packaging: sectionFromItems(catalogItems.filter(item => item.segmentKey === 'packaging'), 'Embalagens'),
    suppliers: sectionFromItems(
      suppliers.map(supplier => ({
        id: toId(supplier),
        label: getPeopleLabel(supplier),
        document: normalizeText(supplier?.document || ''),
        email: normalizeText(supplier?.email || ''),
      })),
      'Fornecedores',
    ),
    purchases: sectionFromItems(ledgerOrders, 'Compras'),
    inputs: {
      title: 'Inputs',
      ...createMissingSource(),
    },
    operationalExpenses: {
      title: 'Gastos operacionais',
      ...createMissingSource(),
    },
    fixedCosts: {
      title: 'Custos fixos',
      ...createMissingSource(),
    },
    settings: {
      title: 'Parâmetros',
      ...createMissingSource(),
    },
  };
};

const buildRegisterSectionsFromConfigs = (
  configEntries,
  searchableEntries = configEntries,
  displayEntries = configEntries,
) => ({
  settings: createSourceState(
    displayEntries.map(entry => ({
      id: entry.id,
      label: entry.label,
      configKey: entry.configKey,
      valueLabel: entry.valueLabel || 'Sem valor configurado',
    })),
    'Sem configurações da empresa',
  ),
  inputs: createSourceState(
    filterConfigEntries(searchableEntries, [
      ['input'],
      ['insumo'],
      ['ingrediente'],
    ]).map(entry => ({
      id: entry.id,
      label: entry.label,
      valueLabel: entry.valueLabel || 'Sem valor configurado',
    })),
    'Sem configurações de inputs',
  ),
  operationalExpenses: createSourceState(
    filterConfigEntries(searchableEntries, [
      ['gasto'],
      ['despesa'],
      ['operacional'],
      ['expense'],
    ]).map(entry => ({
      id: entry.id,
      label: entry.label,
      valueLabel: entry.valueLabel || 'Sem valor configurado',
    })),
    'Sem configurações de gastos operacionais',
  ),
  fixedCosts: createSourceState(
    filterConfigEntries(searchableEntries, [
      ['fixo'],
      ['fixed'],
      ['rateio'],
      ['custo', 'fixo'],
    ]).map(entry => ({
      id: entry.id,
      label: entry.label,
      valueLabel: entry.valueLabel || 'Sem valor configurado',
    })),
    'Sem configurações de custos fixos',
  ),
});

export async function loadProductComposition(apiClient, productGroups = []) {
  if (!productGroups.length) {
    return createSourceState([], 'Sem composição cadastrada');
  }

  const groupsWithProducts = await mapWithConcurrency(productGroups, async group => {
    const response = await fetchAllPages(apiClient, '/product_group_products', {
      productGroup: group.iri,
    }, { itemsPerPage: 100, maxPages: 10 });

    const components = response.map(item => {
      const product = item?.productChild || item?.product;
      return {
        id: toId(item),
        productId: toId(product),
        productName: getProductLabel(product) || `Produto #${toId(product) || '-'}`,
        sku: normalizeText(product?.sku || ''),
        typeLabel: getProductTypeLabel(item?.productType || product?.type),
        quantityLabel: formatQuantity(item?.quantity, 3) || '0',
        priceLabel: formatMoney(item?.price),
      };
    });

    return {
      ...group,
      components: components.sort((left, right) => sortByName(left, right, item => item.productName)),
      componentsState: createSourceState(components, 'Sem componentes vinculados'),
    };
  });

  return createSourceState(groupsWithProducts, 'Sem composição cadastrada');
}

export async function loadMenuCostsViewModel(apiClient, currentCompany) {
  if (!currentCompany?.id) {
    return null;
  }

  const companyId = currentCompany.id;
  const companyIri = toIri('people', companyId);

  const [
    products,
    suppliers,
    purchaseSuggestionsResponse,
    purchaseOrdersResponse,
    categories,
    productCategories,
    productGroups,
    configs,
  ] = await Promise.all([
    fetchAllPages(apiClient, '/products', { company: companyId }, { itemsPerPage: 100, maxPages: 50 }),
    fetchAllPages(apiClient, '/people', {
      'link.company': companyIri,
      'link.linkType': 'provider',
    }, { itemsPerPage: 100, maxPages: 20 }),
    apiClient.fetch('/products/purchasing-suggestion', { params: { company: companyId } }),
    fetchAllPages(apiClient, '/orders', {
      provider: companyId,
      orderType: 'purchase',
    }, { itemsPerPage: 100, maxPages: 30 }),
    fetchAllPages(apiClient, '/categories', {
      company: companyId,
      context: 'product',
    }, { itemsPerPage: 100, maxPages: 20 }),
    fetchAllPages(apiClient, '/product_categories', {
      'category.company': companyIri,
      'category.context': 'product',
    }, { itemsPerPage: 100, maxPages: 50 }),
    fetchAllPages(apiClient, '/product_groups', {
      'parentProduct.company': companyIri,
    }, { itemsPerPage: 100, maxPages: 30 }),
    fetchAllPages(apiClient, '/configs', {
      people: companyIri,
    }, { itemsPerPage: 100, maxPages: 30 }),
  ]);

  const purchaseSuggestions = getCollectionItems(purchaseSuggestionsResponse)
    .map(item => ({
      id: toId(item?.product_id),
      productName: normalizeText(item?.product_name || ''),
      productType: normalizeText(item?.type || ''),
      productTypeLabel: getProductTypeLabel(item?.type),
      stockLabel: formatQuantity(item?.stock, 3) || '0',
      minimumLabel: formatQuantity(item?.minimum, 3) || '0',
      neededLabel: formatQuantity(item?.needed, 3) || '0',
      neededValue: toNumber(item?.needed) ?? 0,
      unity: normalizeText(item?.unity || ''),
    }))
    .sort((left, right) => right.neededValue - left.neededValue);

  const detailedPurchaseOrders = await mapWithConcurrency(
    purchaseOrdersResponse,
    async purchaseOrder => {
      const orderId = toId(purchaseOrder);

      if (!orderId) return purchaseOrder;

      try {
        return await apiClient.fetch(`/orders/${orderId}`);
      } catch {
        return purchaseOrder;
      }
    },
  );

  const categoriesByProductId = buildCategoriesByProductId(productCategories);
  const groupsByProductId = buildGroupsByProductId(productGroups);
  const catalogItems = buildCatalogItems({
    products,
    categoriesByProductId,
    groupsByProductId,
  });
  const ledgerOrders = buildLedgerOrders(detailedPurchaseOrders);
  const purchaseMap = buildPurchaseMapRows(ledgerOrders);
  const configEntries = buildConfigEntries(configs, currentCompany?.configs || {});
  const nestedConfigEntries = buildNestedConfigEntries(configEntries);
  const searchableConfigEntries = [...configEntries, ...nestedConfigEntries];
  const displayConfigEntries = buildDisplayConfigEntries(configEntries, nestedConfigEntries);
  const registerSections = buildRegisterSections({
    catalogItems,
    suppliers,
    ledgerOrders,
  });
  const configSections = buildRegisterSectionsFromConfigs(
    configEntries,
    searchableConfigEntries,
    displayConfigEntries,
  );

  const activeProductsCount = catalogItems.filter(item => item.active).length;
  const supplierRelationsCount = suppliers.length;
  const purchaseOrdersCount = ledgerOrders.length;
  const replenishmentCount = purchaseSuggestions.length;

  const finalItemsCount = catalogItems.filter(item => item.segmentKey === 'finalItems').length;
  const ingredientsCount = catalogItems.filter(item => item.segmentKey === 'ingredients').length;
  const recipesCount = catalogItems.filter(item => item.segmentKey === 'recipes').length;
  const packagingCount = catalogItems.filter(item => item.segmentKey === 'packaging').length;

  return {
    company: {
      id: companyId,
      label: getCompanyLabel(currentCompany),
    },
    dashboard: {
      heroTitle: 'Custos do Cardápio',
      heroSubtitle: 'Leitura consolidada de catálogo, compras, composição e lacunas do backend atual.',
      actualMetrics: [
        { key: 'activeProducts', label: 'Produtos ativos', value: String(activeProductsCount) },
        { key: 'suppliers', label: 'Fornecedores com vínculo', value: String(supplierRelationsCount) },
        { key: 'orders', label: 'Compras registradas', value: String(purchaseOrdersCount) },
        { key: 'suggestions', label: 'Itens com reposição sugerida', value: String(replenishmentCount) },
      ],
      configMetrics: [
        buildConfigMetric(searchableConfigEntries, {
          key: 'targetMargin',
          label: 'Margem alvo',
          candidates: ['target-margin', 'margem-alvo', 'margem_alvo'],
          keywordGroups: [['margem', 'margin'], ['alvo', 'target']],
          formatter: value => formatPercentValue(value) || formatConfigValue(value),
        }),
        buildConfigMetric(searchableConfigEntries, {
          key: 'cmv',
          label: 'CMV consolidado',
          candidates: ['cmv', 'food-cost-percent', 'food_cost_percent'],
          keywordGroups: [['cmv']],
          formatter: value => formatPercentValue(value) || formatConfigValue(value),
        }),
        buildConfigMetric(searchableConfigEntries, {
          key: 'suggestedPrice',
          label: 'Preço sugerido',
          candidates: ['suggested-price', 'preco-sugerido', 'preco_sugerido'],
          keywordGroups: [['preco', 'price'], ['sugerido', 'suggested']],
          formatter: value => formatMoneyValue(value) || formatConfigValue(value),
        }),
        buildConfigMetric(searchableConfigEntries, {
          key: 'fixedAllocation',
          label: 'Rateio fixo mensal',
          candidates: ['fixed-monthly-allocation', 'rateio-fixo-mensal', 'rateio_fixo_mensal'],
          keywordGroups: [['rateio', 'allocation'], ['fixo', 'fixed']],
          formatter: value => formatMoneyValue(value) || formatConfigValue(value),
        }),
      ],
      suggestionSource: createSourceState(purchaseSuggestions, 'Sem itens com reposição sugerida'),
      recentPurchaseSource: createSourceState(ledgerOrders.slice(0, 6), 'Sem compras registradas'),
    },
    catalog: {
      source: createSourceState(catalogItems, 'Sem produtos cadastrados'),
      items: catalogItems,
      segmentSummary: [
        { key: 'ingredients', label: 'Ingredientes', value: String(ingredientsCount), accent: '#22C55E' },
        { key: 'recipes', label: 'Preparos', value: String(recipesCount), accent: '#F97316' },
        { key: 'packaging', label: 'Embalagens', value: String(packagingCount), accent: '#38BDF8' },
        { key: 'finalItems', label: 'Itens finais/combos', value: String(finalItemsCount), accent: '#FBBF24' },
      ],
      categoriesSource: createSourceState(
        categories.map(category => ({
          id: toId(category),
          name: normalizeText(category?.name || category?.category || ''),
        })),
        'Sem categorias cadastradas',
      ),
      groupsByProductId,
      categoriesByProductId,
    },
    ledger: {
      source: createSourceState(ledgerOrders, 'Sem compras registradas'),
      orders: ledgerOrders,
      purchaseMapSource: createSourceState(purchaseMap, 'Sem itens comprados para consolidar'),
      purchaseMap,
    },
    resources: {
      ...registerSections,
      inputs: configSections.inputs,
      operationalExpenses: configSections.operationalExpenses,
      fixedCosts: configSections.fixedCosts,
      settings: configSections.settings,
    },
  };
}
