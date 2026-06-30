import { fetchAllPagedItems } from '@controleonline/ui-products/src/react/domain/menuCostsPagination';
import { mapProductToCatalogItem } from '@controleonline/ui-products/src/react/domain/productCatalog';
import {
  fetchLatestPurchasesByProductIds,
  normalizeEntityId,
  toNumber,
} from '@controleonline/ui-products/src/react/domain/productCosting';

const safeArray = value => (Array.isArray(value) ? value : []);

const normalizeText = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const uniqueByIdentifier = items => {
  const seen = new Set();
  return safeArray(items).filter(item => {
    const identifier = String(item?.id || item?.['@id'] || item?.filePath || '').trim();
    if (!identifier || seen.has(identifier)) return false;
    seen.add(identifier);
    return true;
  });
};

const extractUnit = product =>
  String(
    product?.productUnit?.productUnit ||
      product?.productUnit?.unit ||
      product?.productUnity?.productUnit ||
      product?.productUnity?.unit ||
      product?.unit ||
      product?.erpUnit ||
      'UN',
  )
    .trim()
    .toUpperCase();

const extractCategoryId = product =>
  normalizeEntityId(
    product?.productCategory?.category ||
      product?.productCategories?.[0]?.category ||
      product?.category ||
      product?.categoryId,
  );

const buildPackagingIdentifiers = product => {
  const identifiers = [];
  const codeKey = normalizeText(product?.sku || product?.code || '');
  const nameKey = normalizeText(product?.product || product?.name || product?.description || '');
  const rawId = String(normalizeEntityId(product) || product?.id || '').trim();

  if (codeKey) identifiers.push(`code:${codeKey}`);
  if (nameKey) identifiers.push(`name:${nameKey}`);
  if (rawId) identifiers.push(`id:${rawId}`);

  return identifiers;
};

const groupPackagingProducts = products => {
  const groups = [];

  safeArray(products).forEach(product => {
    const identifiers = buildPackagingIdentifiers(product);
    const matches = groups.filter(group =>
      identifiers.some(identifier => group.identifiers.has(identifier)),
    );

    if (!matches.length) {
      groups.push({
        identifiers: new Set(identifiers),
        products: [product],
      });
      return;
    }

    const target = matches[0];
    target.products.push(product);
    identifiers.forEach(identifier => target.identifiers.add(identifier));

    matches.slice(1).forEach(source => {
      source.products.forEach(item => target.products.push(item));
      source.identifiers.forEach(identifier => target.identifiers.add(identifier));
      const index = groups.indexOf(source);
      if (index >= 0) {
        groups.splice(index, 1);
      }
    });
  });

  return groups;
};

const scorePackagingProduct = (product, hasPurchase) => {
  const normalized = mapProductToCatalogItem(product || {}, {});
  const files = safeArray(normalized?.raw?.productFiles).length;
  const extraDataScore = normalized?.raw?.extraData && typeof normalized.raw.extraData === 'object'
    ? Object.keys(normalized.raw.extraData).length
    : 0;

  return [
    normalized?.name,
    normalized?.sku,
    normalized?.description,
    product?.notes,
    product?.supplier,
    product?.price,
    product?.categoryId,
    files,
    extraDataScore,
    hasPurchase,
  ].filter(Boolean).length;
};

const pickMasterProduct = (group, latestPurchasesByProductId) => {
  let best = null;

  group.products.forEach(product => {
    const rawId = String(normalizeEntityId(product) || product?.id || '').trim();
    const hasPurchase = safeArray(latestPurchasesByProductId?.[rawId]).length > 0;
    const score = scorePackagingProduct(product, hasPurchase);

    if (!best || score > best.score) {
      best = {
        product,
        score,
        hasPurchase,
      };
    }
  });

  return best || { product: group.products[0] || {}, score: 0, hasPurchase: false };
};

const mergeProductFiles = products =>
  uniqueByIdentifier(safeArray(products).flatMap(product => safeArray(product?.productFiles)));

const mergeExtraData = products =>
  safeArray(products).reduce((accumulator, product) => ({
    ...accumulator,
    ...(product?.extraData || {}),
  }), {});

const resolveLatestPurchaseForGroup = (group, latestPurchasesByProductId) => {
  const allPurchases = group.products.flatMap(product => {
    const rawId = String(normalizeEntityId(product) || product?.id || '').trim();
    return safeArray(latestPurchasesByProductId?.[rawId]).map(purchase => ({
      ...purchase,
      __sourceProductId: rawId,
    }));
  });

  return allPurchases.sort((left, right) =>
    String(right?.orderDate || '').localeCompare(String(left?.orderDate || '')),
  )[0] || null;
};

const buildPurchaseCollections = ({ groups, packagingById, latestPurchasesByProductId, rawIdToMasterId }) => {
  const purchaseOrdersMap = new Map();
  const purchaseItemsMap = new Map();

  groups.forEach(group => {
    group.products.forEach(product => {
      const rawId = String(normalizeEntityId(product) || product?.id || '').trim();
      const masterId = rawIdToMasterId.get(rawId) || rawId;
      const packaging = packagingById.get(String(masterId));
      const purchases = safeArray(latestPurchasesByProductId?.[rawId]);

      purchases.forEach(purchase => {
        const orderId = String(purchase?.orderId || '').trim();
        if (!orderId) return;

        if (!purchaseOrdersMap.has(orderId)) {
          purchaseOrdersMap.set(orderId, {
            id: Number(orderId) || orderId,
            label: `Compra #${orderId}`,
            date: purchase?.orderDate || purchase?.alterDate || '',
            documentNumber: '',
            supplierName: purchase?.supplierLabel || 'Fornecedor não vinculado',
            paymentStatus: 'paid',
          });
        }

        const purchaseKey = `${orderId}:${masterId}`;
        if (purchaseItemsMap.has(purchaseKey)) {
          return;
        }

        const quantity = Math.max(1, toNumber(purchase?.quantity) || 1);
        const unitPrice = toNumber(purchase?.unitPrice);
        const totalPrice = toNumber(purchase?.totalPrice || unitPrice * quantity);

        purchaseItemsMap.set(purchaseKey, {
          id: purchaseKey,
          orderId: Number(orderId) || orderId,
          resourceType: 'packaging',
          resourceId: Number(masterId) || masterId,
          quantity,
          unitPrice,
          totalPrice,
          description: packaging?.name || product?.product || product?.name || `#${masterId}`,
          supplierName: purchase?.supplierLabel || 'Fornecedor não vinculado',
          paymentStatus: 'paid',
          date: purchase?.orderDate || purchase?.alterDate || '',
        });
      });
    });
  });

  return {
    purchaseOrders: Array.from(purchaseOrdersMap.values()).sort((left, right) =>
      String(right.date || '').localeCompare(String(left.date || '')),
    ),
    purchaseItems: Array.from(purchaseItemsMap.values()).sort((left, right) =>
      String(right.date || '').localeCompare(String(left.date || '')),
    ),
  };
};

const buildParentProducts = (relations, rawIdToMasterId) =>
  Object.values(
    safeArray(relations)
      .filter(relation => relation?.active !== false)
      .reduce((accumulator, relation) => {
        const parentProduct = relation?.product || null;
        const parentSummary = mapProductToCatalogItem(parentProduct || {}, {});
        const parentId = String(parentSummary?.id || normalizeEntityId(parentProduct)).trim();
        const childIdRaw = String(
          normalizeEntityId(
            relation?.productChild?.id ||
            relation?.product_child?.id ||
            relation?.productChild ||
            relation?.product_child ||
            '',
          ),
        ).trim();
        const childId = rawIdToMasterId.get(childIdRaw) || childIdRaw;

        if (!parentId || !childId) {
          return accumulator;
        }

        if (!accumulator[parentId]) {
          accumulator[parentId] = {
            id: parentSummary?.id || normalizeEntityId(parentProduct),
            product: parentSummary?.name || parentProduct?.product || parentProduct?.name || '',
            name: parentSummary?.name || parentProduct?.product || parentProduct?.name || '',
            categoryId: parentSummary?.categoryId || extractCategoryId(parentProduct),
            type: parentSummary?.type || parentProduct?.type || 'product',
            active: parentSummary?.active !== false && parentProduct?.active !== false,
            includeInCatalogCount: parentSummary?.raw?.includeInCatalogCount !== false,
            code: parentSummary?.sku || parentSummary?.raw?.code || String(parentSummary?.id || normalizeEntityId(parentProduct) || ''),
            sku: parentSummary?.sku || parentSummary?.raw?.sku || '',
            description: parentSummary?.description || parentSummary?.raw?.description || '',
            notes: parentSummary?.raw?.notes || '',
            price: parentSummary?.price || toNumber(parentProduct?.price),
            salePrice: parentSummary?.price || toNumber(parentProduct?.price),
            erpUnit:
              parentSummary?.raw?.erpUnit ||
              parentSummary?.raw?.productUnit?.productUnit ||
              parentSummary?.raw?.productUnit?.unit ||
              'UN',
            erpProductType:
              parentSummary?.raw?.erpProductType ||
              parentSummary?.type ||
              parentProduct?.type ||
              'product',
            productFiles: parentSummary?.raw?.productFiles || parentProduct?.productFiles || [],
            extraData: parentSummary?.raw?.extraData || parentProduct?.extraData || {},
            components: [],
            addons: [],
          };
        }

        accumulator[parentId].components.push({
          relationId: normalizeEntityId(relation) || relation?.id || '',
          productIri: relation?.product?.['@id'] || relation?.product || (parentId ? `/products/${parentId}` : ''),
          productGroupIri: relation?.productGroup?.['@id'] || relation?.productGroup || '',
          productChildIri: relation?.productChild?.['@id'] || relation?.product_child?.['@id'] || (childIdRaw ? `/products/${childIdRaw}` : ''),
          productType: relation?.productType || relation?.product_type || 'package',
          price: toNumber(relation?.price),
          active: relation?.active !== false,
          refType: 'packaging',
          refId: Number(childId) || childId,
          qty: toNumber(relation?.quantity) || 1,
          unit:
            relation?.unit ||
            relation?.productChild?.productUnit?.productUnit ||
            relation?.productChild?.unit ||
            extractUnit(parentProduct) ||
            'UN',
          pricingMode: 'markup',
        });

        return accumulator;
      }, {}),
  ).sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR'));

const buildPackagingParentRows = (relations, rawIdToMasterId, packagingById) => {
  const parentRowsByPackagingId = new Map();

  safeArray(relations)
    .filter(relation => relation?.active !== false)
    .forEach(relation => {
      const parentProduct = relation?.product || null;
      const parentSummary = mapProductToCatalogItem(parentProduct || {}, {});
      const parentId = String(parentSummary?.id || normalizeEntityId(parentProduct)).trim();
      const childIdRaw = String(
        normalizeEntityId(
          relation?.productChild?.id ||
          relation?.product_child?.id ||
          relation?.productChild ||
          relation?.product_child ||
          '',
        ),
      ).trim();
      const childId = rawIdToMasterId.get(childIdRaw) || childIdRaw;

      if (!parentId || !childId) {
        return;
      }

      const masterPackaging = packagingById.get(String(childId));
      const unitCost = Number(masterPackaging?.purchaseQty || 1) > 0
        ? Number(masterPackaging?.purchaseCost || 0) / Number(masterPackaging?.purchaseQty || 1)
        : Number(masterPackaging?.purchaseCost || 0);
      const rowsByParentId = parentRowsByPackagingId.get(String(childId)) || new Map();
      const parentKey = String(parentSummary?.id || normalizeEntityId(parentProduct) || parentId);
      const currentRow = rowsByParentId.get(parentKey) || {
        productId: parentSummary?.id || normalizeEntityId(parentProduct) || parentId,
        productName: parentSummary?.name || parentProduct?.product || parentProduct?.name || '',
        productCode: parentSummary?.sku || parentSummary?.raw?.code || String(parentSummary?.id || normalizeEntityId(parentProduct) || ''),
        categoryId: parentSummary?.categoryId || extractCategoryId(parentProduct),
        qty: 0,
        unit:
          relation?.unit ||
          relation?.productChild?.productUnit?.productUnit ||
          relation?.productChild?.unit ||
          extractUnit(parentProduct) ||
          'UN',
        cost: 0,
      };

      const relationQty = toNumber(relation?.quantity) || 1;
      currentRow.qty += relationQty;
      currentRow.cost += relationQty * unitCost;
      rowsByParentId.set(parentKey, currentRow);
      parentRowsByPackagingId.set(String(childId), rowsByParentId);
    });

  return parentRowsByPackagingId;
};

export const buildLivePackagingDb = async ({
  companyId,
  companyIri,
  productsActions,
  productGroupProductActions,
  ordersActions,
  categoriesActions,
  includePurchaseHistory = true,
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

  const [packagingProducts, packagingRelations, categories] = await Promise.all([
    fetchAllPagedItems({
      actions: productsActions,
      params: {
        company: companyId,
        people: companyIri,
        active: 1,
        type: ['package'],
        'order[product]': 'ASC',
      },
      maxPages: 8,
    }),
    fetchAllPagedItems({
      actions: productGroupProductActions,
      params: {
        productType: 'package',
        'order[product.product]': 'ASC',
      },
      maxPages: 8,
    }),
    fetchAllPagedItems({
      actions: categoriesActions,
      params: {
        company: companyIri,
        'order[name]': 'ASC',
      },
      maxPages: 4,
    }),
  ]);

  const latestPurchasesByProductId = includePurchaseHistory
    ? await fetchLatestPurchasesByProductIds({
        companyId,
        ordersActions,
        productIds: packagingProducts.map(product => product?.id),
        limitPerProduct: 1,
        maxPages: 6,
      })
    : {};

  const groups = groupPackagingProducts(packagingProducts);
  const rawIdToMasterId = new Map();
  const packaging = groups
    .map(group => {
      const master = pickMasterProduct(group, latestPurchasesByProductId);
      const masterProduct = master.product || group.products[0] || {};
      const masterId = String(normalizeEntityId(masterProduct) || masterProduct?.id || '').trim();
      const latestPurchase = resolveLatestPurchaseForGroup(group, latestPurchasesByProductId);
      const purchaseQty = Math.max(1, toNumber(latestPurchase?.quantity) || 1);
      const purchaseCost = latestPurchase
        ? toNumber(latestPurchase?.totalPrice || latestPurchase?.unitPrice * purchaseQty)
        : toNumber(masterProduct?.price);
      const normalized = mapProductToCatalogItem(masterProduct || {}, {});
      const duplicateIds = group.products
        .map(product => String(normalizeEntityId(product) || product?.id || '').trim())
        .filter(id => id && id !== masterId);

      group.products.forEach(product => {
        const rawId = String(normalizeEntityId(product) || product?.id || '').trim();
        if (rawId) {
          rawIdToMasterId.set(rawId, masterId);
        }
      });

      return {
        id: normalized?.id || masterId,
        sourceIds: group.products
          .map(product => String(normalizeEntityId(product) || product?.id || '').trim())
          .filter(Boolean),
        sourceRecords: group.products.map(product => ({
          id: String(normalizeEntityId(product) || product?.id || '').trim(),
          name: product?.product || product?.name || '',
          product: product?.product || product?.name || '',
          code: product?.sku || product?.code || '',
          sku: product?.sku || '',
          description: product?.description || '',
          baseUnit: extractUnit(product),
          erpUnit: extractUnit(product),
          type: product?.type || 'package',
        })),
        duplicateCount: group.products.length,
        duplicateIds,
        name: normalized?.name || masterProduct?.product || masterProduct?.name || '',
        product: normalized?.name || masterProduct?.product || masterProduct?.name || '',
        code: normalized?.sku || masterProduct?.sku || masterProduct?.code || String(masterId || ''),
        sku: normalized?.sku || masterProduct?.sku || '',
        categoryId: normalized?.categoryId || extractCategoryId(masterProduct),
        type: 'package',
        active: group.products.some(product => product?.active !== false),
        description: normalized?.description || masterProduct?.description || '',
        notes: Array.from(
          new Set(
            group.products
              .map(product => String(product?.notes || '').trim())
              .filter(Boolean),
          ),
        ).join(' · '),
        baseUnit: extractUnit(masterProduct),
        erpUnit: extractUnit(masterProduct),
        purchaseQty,
        purchaseCost,
        supplier: latestPurchase?.supplierLabel || masterProduct?.supplier || '',
        supplierMode: latestPurchase ? 'single' : (masterProduct?.supplierMode || 'single'),
        scope: masterProduct?.scope || 'erp',
        sourceType: latestPurchase ? 'documented' : 'review',
        sourceReference: latestPurchase ? `Compra #${latestPurchase.orderId}` : (masterProduct?.sku || masterProduct?.code || ''),
        evidenceType: latestPurchase ? 'documented' : 'review',
        evidenceSource: latestPurchase ? `Pedido ${latestPurchase.orderId}` : (masterProduct?.description || ''),
        activeCostMode: latestPurchase ? 'latest' : 'manual',
        manualUnitCost: latestPurchase ? null : toNumber(masterProduct?.price),
        activeCostNote: latestPurchase ? 'Última compra importada do ERP' : 'Preço atual do ERP',
        productFiles: mergeProductFiles(group.products),
        extraData: mergeExtraData(group.products),
      };
    })
    .sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR'));

  const packagingById = new Map(packaging.map(item => [String(item.id), item]));
  const parentRowsByPackagingId = buildPackagingParentRows(packagingRelations, rawIdToMasterId, packagingById);
  const products = buildParentProducts(packagingRelations, rawIdToMasterId);
  const { purchaseOrders, purchaseItems } = includePurchaseHistory
    ? buildPurchaseCollections({
        groups,
        packagingById,
        latestPurchasesByProductId,
        rawIdToMasterId,
      })
    : { purchaseOrders: [], purchaseItems: [] };

  return {
    categories,
    ingredients: [],
    recipes: [],
    packaging: packaging.map(item => ({
      ...item,
      parentRows: Array.from(parentRowsByPackagingId.get(String(item.id))?.values() || []),
    })),
    products,
    purchaseOrders,
    purchaseItems,
    inputs: [],
    suppliers: [],
    settings: {},
  };
};

export const dedupePackagingProducts = groupPackagingProducts;
