const safeArray = value => (Array.isArray(value) ? value : []);

const normalizeText = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const normalizeEntityId = value => {
  if (!value && value !== 0) return '';

  const raw = typeof value === 'object'
    ? value?.id || value?.['@id'] || value?.value || ''
    : value;

  return String(raw || '').replace(/\D+/g, '').trim();
};

const toNumber = value => {
  const parsed = Number.parseFloat(String(value ?? 0).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const BEVERAGE_CATEGORY_KEYWORDS = [
  'bebida',
  'bebidas',
  'drink',
  'drinks',
  'refrigerante',
  'refri',
  'agua',
  'suco',
  'cerveja',
  'chopp',
  'vinho',
  'h2o',
  'ice tea',
  'isotonico',
  'energ',
];

const BEVERAGE_PRODUCT_KEYWORDS = [
  'bebida',
  'coca',
  'cola',
  'agua',
  'h2o',
  'fanta',
  'sprite',
  'guarana',
  'suco',
  'cha',
  'ice tea',
  'bud',
  'budweiser',
  'heineken',
  'schweppes',
  'limoneto',
  'cerveja',
  'refrigerante',
];

const NON_RESALE_TYPES = new Set([
  'component',
  'custom',
  'manufactured',
  'package',
  'preparation',
  'service',
]);

const OPERATIONAL_GROUP_RULES = [
  {
    label: 'Carnes / açougue',
    pattern: /\b(fraldinha|frango|linguica|bacon|carne|acougue|bovina|suina|peito|sobrecoxa)\b/,
  },
  {
    label: 'Laticínios e frios',
    pattern: /\b(queijo|mucarela|mussarela|catupiry|cheddar|maionese|requeijao|laticinio|frios|manteiga)\b/,
  },
  {
    label: 'Hortifruti',
    pattern: /\b(tomate|cebola|alho|limao|cheiro|verde|louro|manjericao|berinjela|hortifruti|verdura|legume)\b/,
  },
  {
    label: 'Mercearia e temperos',
    pattern: /\b(azeite|oleo|vinagre|molho|barbecue|ketchup|mostarda|pimenta|sal|acucar|tempero|sache)\b/,
  },
  {
    label: 'Congelados e bases prontas',
    pattern: /\b(batata|congelado|churros|base pronta)\b/,
  },
  {
    label: 'Bebidas',
    pattern: /\b(agua|cerveja|refrigerante|suco|budweiser|guarana|coca|fanta|sprite|heineken|cha|ice tea)\b/,
  },
];

export const ENGINEERING_OPERATIONAL_GROUPS = [
  'Bebidas',
  'Carnes / açougue',
  'Congelados e bases prontas',
  'Hortifruti',
  'Itens comprados',
  'Laticínios e frios',
  'Mercearia e temperos',
  'Sem categoria',
];

export const ENGINEERING_INGREDIENT_OPERATIONAL_GROUPS = ENGINEERING_OPERATIONAL_GROUPS.filter(
  groupName => groupName !== 'Bebidas',
);

const OPERATIONAL_GROUP_ORDER = new Map(
  ENGINEERING_OPERATIONAL_GROUPS.map((groupName, index) => [groupName, index]),
);

export const orderEngineeringOperationalGroupEntries = (
  entries = [],
  { includeEmpty = false, emptyGroups = ENGINEERING_OPERATIONAL_GROUPS } = {},
) => {
  const entryMap = new Map(entries);
  const names = new Set([
    ...(includeEmpty ? safeArray(emptyGroups) : []),
    ...Array.from(entryMap.keys()),
  ]);

  return Array.from(names)
    .map(groupName => [groupName, safeArray(entryMap.get(groupName))])
    .filter(([, rows]) => includeEmpty || rows.length > 0)
    .sort(([left], [right]) => {
      const leftOrder = OPERATIONAL_GROUP_ORDER.has(left) ? OPERATIONAL_GROUP_ORDER.get(left) : Number.MAX_SAFE_INTEGER;
      const rightOrder = OPERATIONAL_GROUP_ORDER.has(right) ? OPERATIONAL_GROUP_ORDER.get(right) : Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return String(left).localeCompare(String(right), 'pt-BR');
    });
};

const resolveCategoryMap = categories =>
  new Map(
    safeArray(categories)
      .map(category => [normalizeEntityId(category), category])
      .filter(([id]) => Boolean(id)),
  );

const resolveCategoryLabel = category =>
  category?.category ||
  category?.name ||
  category?.title ||
  category?.description ||
  '';

const resolveProductCategoryId = product =>
  normalizeEntityId(
    product?.productCategory?.category ||
      product?.productCategories?.[0]?.category ||
      product?.category ||
      product?.categoryId,
  );

const resolveProductText = product => normalizeText([
  product?.product,
  product?.name,
  product?.description,
  product?.notes,
  product?.sku,
].filter(Boolean).join(' '));

export const resolveEngineeringOperationalGroup = (source = {}) => {
  if (typeof source === 'string') {
    const text = normalizeText(source);
    return OPERATIONAL_GROUP_RULES.find(rule => rule.pattern.test(text))?.label || 'Itens comprados';
  }

  const categoryLabel = source?.categoryLabel || source?.categoryName || source?.category;
  if (categoryLabel && categoryLabel !== 'Sem categoria') {
    return categoryLabel;
  }

  const text = normalizeText([
    source?.label,
    source?.name,
    source?.product,
    source?.code,
    source?.sku,
    source?.description,
    source?.notes,
    source?.supplier,
    source?.sourceReference,
    source?.evidenceSource,
  ].filter(Boolean).join(' '));

  return OPERATIONAL_GROUP_RULES.find(rule => rule.pattern.test(text))?.label || 'Sem categoria';
};

const isBeverageCategory = (category, categoryMap, memo = new Map()) => {
  if (!category) return false;

  const categoryId = normalizeEntityId(category);
  if (!categoryId) return false;
  if (memo.has(categoryId)) return memo.get(categoryId);

  const ownText = normalizeText([
    resolveCategoryLabel(category),
    category?.description,
    category?.notes,
  ].filter(Boolean).join(' '));

  if (BEVERAGE_CATEGORY_KEYWORDS.some(keyword => ownText.includes(keyword))) {
    memo.set(categoryId, true);
    return true;
  }

  const parent = categoryMap.get(normalizeEntityId(category?.parent));
  const result = parent ? isBeverageCategory(parent, categoryMap, memo) : false;
  memo.set(categoryId, result);
  return result;
};

export const resolveEngineeringBeverageCategoryIds = (categories = []) => {
  const categoryMap = resolveCategoryMap(categories);
  const memo = new Map();

  return safeArray(categories)
    .filter(category => isBeverageCategory(category, categoryMap, memo))
    .map(category => normalizeEntityId(category))
    .filter(Boolean);
};

export const resolveEngineeringResaleMeta = (product, categories = []) => {
  const normalizedType = normalizeText(product?.type);
  const categoryMap = resolveCategoryMap(categories);
  const categoryId = resolveProductCategoryId(product);
  const category = categoryId ? categoryMap.get(categoryId) || null : null;
  const categoryLabel = resolveCategoryLabel(category);
  const categoryMatch = isBeverageCategory(category, categoryMap);
  const productText = resolveProductText(product);
  const textMatch = BEVERAGE_PRODUCT_KEYWORDS.some(keyword => productText.includes(keyword));
  const blockedByType = NON_RESALE_TYPES.has(normalizedType);
  const matches = !blockedByType && (categoryMatch || textMatch);

  return {
    matches,
    matchSource: categoryMatch ? 'category' : (textMatch ? 'keyword' : ''),
    matchLabel: categoryMatch ? 'Categoria' : (textMatch ? 'Texto' : ''),
    categoryId,
    categoryLabel,
    categoryPath: category?.parent ? resolveCategoryLabel(categoryMap.get(normalizeEntityId(category.parent))) : '',
    typeLabel: normalizedType || 'sem tipo',
  };
};

export const isEngineeringResaleItem = (product, categories = []) =>
  resolveEngineeringResaleMeta(product, categories).matches;

export const buildEngineeringResaleRows = ({ products = [], categories = [] } = {}) => {
  const rows = safeArray(products)
    .filter(product => isEngineeringResaleItem(product, categories))
    .map(product => {
      const meta = resolveEngineeringResaleMeta(product, categories);

      return {
        ...product,
        id: normalizeEntityId(product),
        name: product?.product || product?.name || '',
        product: product?.product || product?.name || '',
        sku: product?.sku || '',
        price: toNumber(product?.price),
        ...meta,
      };
    });

  return rows.sort((left, right) => {
    const leftCategory = normalizeText(left.categoryLabel || '');
    const rightCategory = normalizeText(right.categoryLabel || '');
    if (leftCategory !== rightCategory) {
      return leftCategory.localeCompare(rightCategory, 'pt-BR');
    }

    return normalizeText(left.name).localeCompare(normalizeText(right.name), 'pt-BR');
  });
};

const toClassifierProduct = item => {
  const rawProduct = item?.rawProduct || {};
  const categoryId = item?.categoryId || rawProduct?.categoryId || rawProduct?.category;

  return {
    ...rawProduct,
    product: rawProduct?.product || item?.product || item?.name || '',
    name: rawProduct?.name || item?.name || item?.product || '',
    description: rawProduct?.description || item?.description || '',
    notes: rawProduct?.notes || item?.notes || '',
    sku: rawProduct?.sku || item?.sku || item?.code || '',
    type: rawProduct?.type || item?.type || 'feedstock',
    productCategory: rawProduct?.productCategory || (categoryId ? { category: { id: categoryId } } : undefined),
  };
};

export const filterMenuCostsEngineeringIngredients = (ingredients = [], db = {}) =>
  safeArray(ingredients).filter(item => !isEngineeringResaleItem(toClassifierProduct(item), db?.categories || []));
