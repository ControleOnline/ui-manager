import { buildImportedSuppliersFromPeople } from '@controleonline/ui-people/src/react/utils/menuCostsSuppliers';
import { fetchAllPagedItems } from '@controleonline/ui-products/src/react/domain/menuCostsPagination';
import { mapProductToCatalogItem } from '@controleonline/ui-products/src/react/domain/productCatalog';
import { buildLiveIngredientsDb } from './menuCostsIngredients';
import { buildLivePackagingDb } from './menuCostsPackaging';

const safeArray = value => (Array.isArray(value) ? value : []);

const extractItems = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  if (Array.isArray(response?.member)) return response.member;
  return [];
};

const componentKey = component => [
  component?.relationId || '',
  component?.refType || '',
  component?.refId || '',
  component?.productChildIri || '',
].join(':');

const mergeComponents = (targetComponents, sourceComponents) => {
  const map = new Map();

  [...safeArray(targetComponents), ...safeArray(sourceComponents)].forEach(component => {
    const key = componentKey(component);
    if (!key.replace(/:/g, '')) return;
    map.set(key, {
      ...(map.get(key) || {}),
      ...component,
    });
  });

  return Array.from(map.values());
};

const mergeProductRecord = (target, source) => ({
  ...target,
  ...source,
  components: mergeComponents(target.components, source.components),
  addons: safeArray(target.addons).length ? target.addons : safeArray(source.addons),
  productFiles: safeArray(target.productFiles).length ? target.productFiles : safeArray(source.productFiles),
  extraData: {
    ...(source.extraData || {}),
    ...(target.extraData || {}),
  },
  raw: target.raw || source.raw,
});

const mergeById = items => {
  const map = new Map();

  safeArray(items).forEach(item => {
    const id = String(item?.id || '').trim();
    if (!id) return;
    if (!map.has(id)) {
      map.set(id, item);
      return;
    }
    map.set(id, mergeProductRecord(map.get(id), item));
  });

  return Array.from(map.values());
};

const collectionFrom = value => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.member)) return value.member;
  if (Array.isArray(value['hydra:member'])) return value['hydra:member'];
  return [value];
};

const resolveProductCategoryId = product => {
  const productCategory = collectionFrom(product?.productCategory)[0];
  const productCategories = collectionFrom(product?.productCategories)[0];
  const categories = collectionFrom(product?.categories)[0];
  const category =
    productCategory?.category ||
    productCategory?.categoryId ||
    productCategories?.category ||
    productCategories?.categoryId ||
    categories?.category ||
    categories?.categoryId ||
    product?.category ||
    product?.categoryId;

  return normalizeEntityId(category);
};

const resolveProductCategoryIds = product => {
  const relations = [
    ...collectionFrom(product?.productCategory),
    ...collectionFrom(product?.productCategories),
    ...collectionFrom(product?.categories),
  ];
  const ids = relations
    .map(relation => normalizeEntityId(relation?.category || relation?.categoryId || relation))
    .filter(Boolean);
  const fallbackId = resolveProductCategoryId(product);
  if (fallbackId) ids.push(fallbackId);
  return Array.from(new Set(ids));
};

export const normalizeLiveProduct = product => {
  const normalized = mapProductToCatalogItem(product || {}, {});

  return {
    id: normalized.id,
    product: normalized.name || product?.product || product?.name || '',
    name: normalized.name || product?.product || product?.name || '',
    code: normalized.sku || product?.code || String(normalized.id || product?.id || ''),
    sku: normalized.sku || product?.sku || '',
    categoryId: normalized.categoryId || resolveProductCategoryId(product) || '',
    categoryIds: resolveProductCategoryIds(product),
    type: normalized.type || product?.type || 'product',
    active: normalized.active !== false && product?.active !== false,
    description: normalized.description || product?.description || '',
    notes: product?.notes || '',
    price: normalized.price || Number(product?.price || 0) || 0,
    salePrice: normalized.price || Number(product?.price || 0) || 0,
    erpUnit: product?.erpUnit || product?.unit || 'UN',
    erpProductType: product?.type || 'product',
    productFiles: safeArray(product?.productFiles),
    extraData: product?.extraData || {},
    components: safeArray(product?.components),
    addons: safeArray(product?.addons),
    raw: product,
  };
};

const normalizeRecipeProduct = (product, components = null) => {
  const normalized = mapProductToCatalogItem(product || {}, {});

  return {
    id: normalized.id,
    product: normalized.name || product?.product || product?.name || '',
    name: normalized.name || product?.product || product?.name || '',
    code: normalized.sku || product?.code || String(normalized.id || product?.id || ''),
    sku: normalized.sku || product?.sku || '',
    categoryId: normalized.categoryId || resolveProductCategoryId(product) || '',
    type: 'recipe',
    active: normalized.active !== false && product?.active !== false,
    description: normalized.description || product?.description || '',
    notes: product?.notes || '',
    erpProductType: product?.type || 'recipe',
    yieldQty: Number(product?.yieldQty || product?.extraData?.yieldQty || 1) || 1,
    yieldUnit: product?.yieldUnit || product?.extraData?.yieldUnit || product?.erpUnit || 'un',
    components: components ? safeArray(components) : safeArray(product?.components),
    storage: product?.storage || '',
    evidenceType: product?.extraData?.evidenceType || 'review',
    evidenceSource: product?.extraData?.evidenceSource || product?.description || '',
    sourceReference: product?.sku || product?.code || '',
    productFiles: safeArray(product?.productFiles),
    extraData: product?.extraData || {},
    raw: product,
  };
};

const normalizeEntityId = value => {
  if (!value && value !== 0) return '';
  const raw = typeof value === 'object'
    ? value?.id || value?.['@id'] || value?.value || ''
    : value;
  return String(raw || '').replace(/\D+/g, '').trim();
};

const toProductIri = value => {
  const id = normalizeEntityId(value);
  return id ? `/products/${id}` : '';
};

const toProductGroupIri = value => {
  const id = normalizeEntityId(value);
  return id ? `/product_groups/${id}` : '';
};

const relationIri = (value, prefix) => {
  if (!value) return '';
  if (typeof value === 'string') {
    if (value.startsWith(prefix)) return value;
    const id = normalizeEntityId(value);
    return id ? `${prefix}${id}` : '';
  }
  return value?.['@id'] || (normalizeEntityId(value) ? `${prefix}${normalizeEntityId(value)}` : '');
};

const productLabel = product =>
  product?.product || product?.name || product?.description || (normalizeEntityId(product) ? `#${normalizeEntityId(product)}` : '');

const productUnit = product =>
  product?.productUnit?.productUnit ||
  product?.productUnit?.unit ||
  product?.productUnity?.productUnit ||
  product?.productUnity?.unit ||
  product?.unit ||
  product?.erpUnit ||
  'UN';

const refTypeForGroupProduct = relation => {
  const relationType = String(relation?.productType || relation?.product_type || '').toLowerCase();
  const childType = String(relation?.productChild?.type || relation?.product_child?.type || '').toLowerCase();
  const type = childType || relationType;

  if (type === 'feedstock') return 'ingredient';
  if (type === 'package') return 'packaging';
  if (['component', 'manufactured', 'recipe', 'preparation'].includes(type)) return 'recipe';
  return 'product';
};

const relationToComponent = relation => {
  const child = relation?.productChild || relation?.product_child || null;
  const childId = normalizeEntityId(child || relation?.productChild || relation?.product_child);
  const parentId = normalizeEntityId(relation?.product);
  const relationId = normalizeEntityId(relation);

  if (!childId || !relationId) return null;

  const productType = relation?.productType || relation?.product_type || productTypeForRefType(refTypeForGroupProduct(relation));

  return {
    relationId,
    productIri: relationIri(relation?.product, '/products/') || (parentId ? `/products/${parentId}` : ''),
    productGroupIri: relationIri(relation?.productGroup || relation?.product_group, '/product_groups/'),
    productChildIri: relationIri(child, '/products/') || toProductIri(childId),
    productType,
    price: Number(relation?.price || 0) || 0,
    active: relation?.active !== false,
    refType: refTypeForGroupProduct(relation),
    refId: Number(childId) || childId,
    qty: Number(relation?.quantity || 0) || 1,
    unit: relation?.unit || productUnit(child),
    pricingMode: relation?.pricingMode || 'receita',
  };
};

const productTypeForRefType = refType => {
  if (refType === 'ingredient') return 'feedstock';
  if (refType === 'packaging') return 'package';
  if (refType === 'recipe') return 'preparation';
  return 'product';
};

export const buildRecipeComponentsByProductId = async ({ recipes, productGroupProductActions }) => {
  if (!productGroupProductActions?.getItems) return {};

  const componentsByRecipeId = {};

  for (const recipe of safeArray(recipes)) {
    const recipeId = normalizeEntityId(recipe);
    if (!recipeId) continue;

    let response = [];
    try {
      response = await productGroupProductActions.getItems({
        product: `/products/${recipeId}`,
        'order[id]': 'ASC',
      });
    } catch {
      response = [];
    }

    const components = extractItems(response)
      .filter(relation => relation?.active !== false)
      .map(relationToComponent)
      .filter(Boolean);

    if (components.length) {
      componentsByRecipeId[recipeId] = components;
    }
  }

  return componentsByRecipeId;
};

const buildAddonFromRelation = ({ relation, group, parentProductId }) => {
  const child = relation?.productChild || relation?.product_child || null;
  const childId = normalizeEntityId(child || relation?.productChild || relation?.product_child);
  const groupId = normalizeEntityId(group || relation?.productGroup || relation?.product_group);
  const relationId = normalizeEntityId(relation);

  if (!childId || !groupId || !relationId) return null;

  const productType = relation?.productType || relation?.product_type || (refTypeForGroupProduct(relation) === 'packaging' ? 'package' : 'component');
  const productIri = relationIri(relation?.product, '/products/') || (productType === 'feedstock' ? toProductIri(parentProductId) : '');

  return {
    id: relationId,
    groupId,
    group: group?.productGroup || group?.name || 'Adicional',
    name: productLabel(child) || `Item #${childId}`,
    required: group?.required === true,
    minimum: Number(group?.minimum ?? (group?.required ? 1 : 0)) || 0,
    maximum: group?.maximum ?? null,
    salePriceDelta: Number(relation?.price || 0) || 0,
    notes: relation?.description || group?.description || '',
    components: [{
      relationId,
      productIri,
      productGroupIri: relationIri(relation?.productGroup || relation?.product_group, '/product_groups/') || toProductGroupIri(groupId),
      productChildIri: relationIri(relation?.productChild || relation?.product_child, '/products/') || toProductIri(childId),
      productType,
      price: Number(relation?.price || 0) || 0,
      active: relation?.active !== false,
      refType: refTypeForGroupProduct(relation),
      refId: Number(childId) || childId,
      qty: Number(relation?.quantity || 0) || 1,
      unit: relation?.unit || productUnit(child),
      pricingMode: relation?.pricingMode || 'markup',
    }],
  };
};

export const buildAddonsForProducts = async ({ products, productGroupActions, productGroupProductActions }) => {
  if (!productGroupActions?.getItems || !productGroupProductActions?.getItems) return {};

  const addonsByProductId = {};
  const groupItemsById = new Map();

  for (const product of safeArray(products)) {
    const productId = normalizeEntityId(product);
    if (!productId) continue;

    const groupsResponse = await productGroupActions.getItems({
      product: productId,
      'order[groupOrder]': 'ASC',
      'order[productGroup]': 'ASC',
    }).catch(() => []);
    const groups = safeArray(groupsResponse?.['hydra:member'] || groupsResponse?.member || groupsResponse)
      .filter(group => group?.active !== false);

    for (const group of groups) {
      const groupIri = group?.['@id'] || toProductGroupIri(group);
      const groupId = normalizeEntityId(groupIri);
      if (!groupIri || !groupId) continue;

      if (!groupItemsById.has(groupId)) {
        const itemsResponse = await productGroupProductActions.getItems({
          productGroup: groupIri,
        }).catch(() => []);
        const items = safeArray(itemsResponse?.['hydra:member'] || itemsResponse?.member || itemsResponse)
          .filter(item => item?.active !== false);
        groupItemsById.set(groupId, items);
      }

      const groupAddons = safeArray(groupItemsById.get(groupId))
        .map(relation => buildAddonFromRelation({ relation, group, parentProductId: productId }))
        .filter(Boolean);

      if (groupAddons.length) {
        addonsByProductId[productId] = [
          ...safeArray(addonsByProductId[productId]),
          ...groupAddons,
        ];
      }
    }
  }

  return addonsByProductId;
};

const dedupeByType = items =>
  safeArray(items).filter(item => {
    const type = String(item?.type || '').toLowerCase();
    return !['feedstock', 'package'].includes(type);
  });

const mergeCollections = (primary = [], secondary = []) =>
  mergeById([...safeArray(primary), ...safeArray(secondary)]);

export const buildLiveMenuCostsDb = async ({
  companyId,
  companyIri,
  peopleActions,
  productsActions,
  productGroupProductActions,
  productGroupActions,
  ordersActions,
  categoriesActions,
  includeProductAddons = false,
  includeRecipeComponents = false,
}) => {
  if (!companyId) {
    return {
      categories: [],
      ingredients: [],
      recipes: [],
      packaging: [],
      products: [],
      purchaseOrders: [],
      purchaseItems: [],
      inputs: [],
      suppliers: [],
      settings: {},
    };
  }

  const [
    ingredientsDb,
    packagingDb,
    peopleRecords,
    liveProducts,
    liveRecipeProducts,
    liveCategories,
  ] = await Promise.all([
    buildLiveIngredientsDb({
      companyId,
      companyIri,
      productsActions,
      productGroupProductActions,
      ordersActions,
      categoriesActions,
      includePurchaseHistory: false,
    }),
    buildLivePackagingDb({
      companyId,
      companyIri,
      productsActions,
      productGroupProductActions,
      ordersActions,
      categoriesActions,
      includePurchaseHistory: false,
    }),
    fetchAllPagedItems({
      actions: peopleActions,
      params: {
        'link.company': companyIri,
        'link.linkType': 'provider',
      },
      maxPages: 8,
    }),
    fetchAllPagedItems({
      actions: productsActions,
      params: {
        company: companyId,
        people: companyIri,
        active: 1,
        type: ['product', 'custom', 'drink'],
        'order[product]': 'ASC',
      },
      maxPages: 10,
    }),
    fetchAllPagedItems({
      actions: productsActions,
      params: {
        company: companyId,
        people: companyIri,
        active: 1,
        type: ['manufactured', 'component', 'recipe', 'preparation'],
        'order[product]': 'ASC',
      },
      maxPages: 10,
    }),
    fetchAllPagedItems({
      actions: categoriesActions,
      params: {
        company: companyIri,
        'order[name]': 'ASC',
      },
      maxPages: 8,
    }),
  ]);

  const suppliers = buildImportedSuppliersFromPeople(peopleRecords);
  const derivedProducts = mergeCollections(
    safeArray(ingredientsDb.products),
    safeArray(packagingDb.products),
  );
  const derivedProductsById = new Map(
    derivedProducts.map(item => [String(item.id), item]),
  );

  dedupeByType(liveProducts).map(normalizeLiveProduct).forEach(product => {
    const key = String(product.id || '').trim();
    if (!key) return;
    if (!derivedProductsById.has(key)) {
      derivedProductsById.set(key, product);
      return;
    }
    derivedProductsById.set(key, mergeProductRecord(derivedProductsById.get(key), product));
  });

  const productsWithoutAddons = Array.from(derivedProductsById.values()).sort((left, right) =>
    String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR'),
  );

  const addonsByProductId = includeProductAddons
    ? await buildAddonsForProducts({
      products: productsWithoutAddons,
      productGroupActions,
      productGroupProductActions,
    })
    : {};

  const products = productsWithoutAddons.map(product => ({
    ...product,
    addons: safeArray(addonsByProductId[normalizeEntityId(product)]).length
      ? safeArray(addonsByProductId[normalizeEntityId(product)])
      : safeArray(product.addons),
  }));

  const rawRecipes = dedupeByType(liveRecipeProducts);
  const recipeComponentsByProductId = includeRecipeComponents
    ? await buildRecipeComponentsByProductId({
      recipes: rawRecipes,
      productGroupProductActions,
    })
    : {};

  const recipes = rawRecipes
    .map(product => normalizeRecipeProduct(product, recipeComponentsByProductId[normalizeEntityId(product)]))
    .sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR'));

  const categories = mergeCollections(
    mergeCollections(ingredientsDb.categories, packagingDb.categories),
    liveCategories,
  ).sort((left, right) =>
    String(left.name || left.category || '').localeCompare(String(right.name || right.category || ''), 'pt-BR'),
  );

  const purchaseOrders = mergeCollections(
    ingredientsDb.purchaseOrders,
    packagingDb.purchaseOrders,
  ).sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));

  const purchaseItems = mergeCollections(
    ingredientsDb.purchaseItems,
    packagingDb.purchaseItems,
  ).sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));

  const inputs = mergeCollections(ingredientsDb.inputs, packagingDb.inputs);
  const settings = {
    defaultMarkupPct: 200,
    targetMarginPct: 68,
    ...(ingredientsDb.settings || {}),
    ...(packagingDb.settings || {}),
  };

  return {
    categories,
    ingredients: safeArray(ingredientsDb.ingredients),
    recipes,
    packaging: safeArray(packagingDb.packaging),
    products,
    purchaseOrders,
    purchaseItems,
    inputs,
    suppliers,
    settings,
  };
};
