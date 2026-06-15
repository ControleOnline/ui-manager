const safeArray = value => (Array.isArray(value) ? value : []);

export const normalizeCatalogEntityId = value => {
  if (!value && value !== 0) return '';
  const raw = typeof value === 'object'
    ? value?.id || value?.['@id'] || value?.value || ''
    : value;
  return String(raw || '').replace(/\D+/g, '').trim();
};

const collectionFrom = value => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.member)) return value.member;
  if (Array.isArray(value?.['hydra:member'])) return value['hydra:member'];
  return [value];
};

const categoryIdFromRelation = relation => normalizeCatalogEntityId(
  relation?.category || relation?.categoryId || relation,
);

export const extractProductCategoryIds = product => {
  const raw = product?.raw || product || {};
  const ids = [
    ...safeArray(product?.categoryIds),
    ...collectionFrom(raw?.productCategory).map(categoryIdFromRelation),
    ...collectionFrom(raw?.productCategories).map(categoryIdFromRelation),
    ...collectionFrom(raw?.categories).map(categoryIdFromRelation),
    categoryIdFromRelation(raw?.category),
    normalizeCatalogEntityId(raw?.categoryId),
    normalizeCatalogEntityId(product?.categoryId),
  ].map(normalizeCatalogEntityId).filter(Boolean);

  return Array.from(new Set(ids));
};

const categoryLabel = category =>
  category?.name || category?.category || category?.title || 'Categoria';

const categoryOrder = category => {
  const value = category?.extraData?.sortOrder ??
    category?.sortOrder ??
    category?.groupOrder ??
    category?.order ??
    category?.menuOrder ??
    category?.position ??
    category?.categoryOrder;
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : 9999;
};

const normalizeText = value => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const productSearchText = item => normalizeText([
  item?.product?.name,
  item?.product?.product,
  item?.product?.description,
  item?.product?.notes,
  item?.product?.code,
  item?.product?.sku,
].filter(Boolean).join(' '));

const isAncestor = (ancestorId, categoryId, categoryById) => {
  let current = categoryById.get(String(categoryId));
  const visited = new Set();

  while (current) {
    const currentId = normalizeCatalogEntityId(current);
    if (!currentId || visited.has(currentId)) return false;
    visited.add(currentId);

    const parentId = normalizeCatalogEntityId(current?.parent);
    if (!parentId) return false;
    if (parentId === String(ancestorId)) return true;
    current = categoryById.get(parentId);
  }

  return false;
};

const deepestCategoryIds = (categoryIds, categoryById) => categoryIds.filter(candidateId =>
  !categoryIds.some(otherId => (
    otherId !== candidateId && isAncestor(candidateId, otherId, categoryById)
  )),
);

const sortNodes = (nodes, orderKeys = []) => {
  const orderMap = new Map(safeArray(orderKeys).map((key, index) => [String(key), index]));
  return [...safeArray(nodes)].sort((left, right) => {
    const leftIndex = orderMap.has(String(left.key)) ? orderMap.get(String(left.key)) : 9999;
    const rightIndex = orderMap.has(String(right.key)) ? orderMap.get(String(right.key)) : 9999;
    return leftIndex - rightIndex || left.order - right.order || left.title.localeCompare(right.title, 'pt-BR');
  });
};

const uniqueProducts = items => {
  const byId = new Map();
  safeArray(items).forEach(item => {
    const id = String(item?.product?.id || '');
    if (id && !byId.has(id)) byId.set(id, item);
  });
  return Array.from(byId.values());
};

const hydrateNode = (node, orderByParent) => {
  const children = sortNodes(
    node.children.map(child => hydrateNode(child, orderByParent)),
    orderByParent?.[node.key],
  );
  const aggregateProducts = uniqueProducts([
    ...node.directProducts,
    ...children.flatMap(child => child.aggregateProducts),
  ]);

  return {
    ...node,
    children,
    aggregateProducts,
    aggregateProductCount: aggregateProducts.length,
    descendantCategoryCount: children.reduce(
      (total, child) => total + 1 + child.descendantCategoryCount,
      0,
    ),
  };
};

export const buildMenuCostsCatalogTree = ({ categories = [], products = [], orderByParent = {} } = {}) => {
  const categoryRows = safeArray(categories).filter(category => {
    const context = String(category?.context || 'products').trim().toLowerCase();
    return category?.active !== false && context === 'products';
  });
  const categoryById = new Map(
    categoryRows
      .map(category => [normalizeCatalogEntityId(category), category])
      .filter(([id]) => Boolean(id)),
  );
  const nodesById = new Map();

  categoryById.forEach((category, id) => {
    nodesById.set(id, {
      key: id,
      category,
      title: categoryLabel(category),
      order: categoryOrder(category),
      parentId: normalizeCatalogEntityId(category?.parent),
      children: [],
      directProducts: [],
    });
  });

  const roots = [];
  nodesById.forEach(node => {
    const parent = nodesById.get(node.parentId);
    if (parent && parent.key !== node.key) parent.children.push(node);
    else roots.push(node);
  });

  const uncategorizedProducts = [];
  safeArray(products).forEach(item => {
    const knownIds = extractProductCategoryIds(item?.product)
      .filter(categoryId => nodesById.has(categoryId));
    const placementIds = deepestCategoryIds(knownIds, categoryById);

    if (!placementIds.length) {
      uncategorizedProducts.push(item);
      return;
    }

    placementIds.forEach(categoryId => {
      nodesById.get(categoryId)?.directProducts.push({
        ...item,
        catalogPlacementCount: placementIds.length,
      });
    });
  });

  if (uncategorizedProducts.length) {
    roots.push({
      key: 'uncategorized',
      category: null,
      title: 'Sem categoria',
      order: 10000,
      parentId: '',
      children: [],
      directProducts: uncategorizedProducts,
    });
  }

  return sortNodes(
    roots.map(node => hydrateNode(node, orderByParent)),
    orderByParent?.root,
  );
};

export const filterMenuCostsCatalogTree = (nodes, query) => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return safeArray(nodes);

  return safeArray(nodes).map(node => {
    const children = filterMenuCostsCatalogTree(node.children, query);
    const categoryMatches = normalizeText(node.title).includes(normalizedQuery);
    const directProducts = categoryMatches
      ? node.directProducts
      : node.directProducts.filter(item => productSearchText(item).includes(normalizedQuery));

    if (!categoryMatches && !directProducts.length && !children.length) return null;

    const aggregateProducts = uniqueProducts([
      ...directProducts,
      ...children.flatMap(child => child.aggregateProducts),
    ]);

    return {
      ...node,
      children,
      directProducts,
      aggregateProducts,
      aggregateProductCount: aggregateProducts.length,
    };
  }).filter(Boolean);
};

export const flattenMenuCostsCatalogTree = (nodes, depth = 0) => safeArray(nodes).flatMap(node => [
  { ...node, depth },
  ...flattenMenuCostsCatalogTree(node.children, depth + 1),
]);

export const catalogCategoryPath = (categories, categoryId) => {
  const categoryById = new Map(
    safeArray(categories).map(category => [normalizeCatalogEntityId(category), category]),
  );
  const labels = [];
  const visited = new Set();
  let current = categoryById.get(normalizeCatalogEntityId(categoryId));

  while (current) {
    const id = normalizeCatalogEntityId(current);
    if (!id || visited.has(id)) break;
    visited.add(id);
    labels.unshift(categoryLabel(current));
    current = categoryById.get(normalizeCatalogEntityId(current?.parent));
  }

  return labels.join(' › ');
};

export const productCatalogPaths = (categories, product) => {
  const categoryById = new Map(
    safeArray(categories).map(category => [normalizeCatalogEntityId(category), category]),
  );
  const knownIds = extractProductCategoryIds(product).filter(id => categoryById.has(id));
  return deepestCategoryIds(knownIds, categoryById)
    .map(id => catalogCategoryPath(categories, id))
    .filter(Boolean);
};

const meaningfulRecipeTerms = recipe => normalizeText(recipe?.name || recipe?.product)
  .split(' ')
  .filter(term => term.length >= 4 && !['casa', 'molho', 'preparo', 'receita'].includes(term));

export const buildPreparationLinkSuggestions = ({ product, recipes = [], linkedNodes = [] } = {}) => {
  const sourceText = normalizeText([
    product?.name,
    product?.product,
    product?.description,
    product?.notes,
  ].filter(Boolean).join(' '));
  const linkedRecipeIds = new Set(
    safeArray(linkedNodes)
      .filter(node => node?.refType === 'recipe')
      .map(node => String(node?.refId)),
  );

  if (!sourceText) return [];

  return safeArray(recipes).filter(recipe => {
    const recipeId = String(recipe?.id || '');
    if (!recipeId || linkedRecipeIds.has(recipeId)) return false;
    const terms = meaningfulRecipeTerms(recipe);
    return terms.length > 0 && terms.every(term => sourceText.includes(term));
  }).map(recipe => ({
    id: recipe.id,
    name: recipe.name || recipe.product || `Preparo #${recipe.id}`,
    reason: 'Mencionado na descrição, ainda sem quantidade ou vínculo confirmado.',
  }));
};
