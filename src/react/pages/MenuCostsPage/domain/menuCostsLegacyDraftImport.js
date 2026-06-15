import {
  MENU_COSTS_DRAFT_ENTITY_TYPES,
  MENU_COSTS_DRAFT_SOURCES,
  normalizeMenuCostsDraftWorkspace,
} from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/menuCostsDraftWorkspace';

export const GYROS_LEGACY_IMPORT_VERSION = 3;

// Correcao operacional temporaria da Gyros. O tipo oficial do produto no ERP
// permanece intacto; estes papeis existem apenas no workspace local da engenharia.
const GYROS_TECHNICAL_ROLE_OVERRIDES = Object.freeze({
  1882: 'ingredient',
  1883: 'preparation',
  1887: 'ingredient',
  1888: 'preparation',
  1894: 'packaging',
  1895: 'packaging',
});

const safeArray = value => (Array.isArray(value) ? value : []);

const textValue = value => String(value ?? '').trim();

const normalizeText = value => textValue(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\b(de|da|do|das|dos|com|e)\b/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const entityId = value => textValue(value?.id || value?.['@id'] || value);

const entityName = value => textValue(value?.name || value?.product || value?.title);

const entityCode = value => normalizeText(value?.code || value?.sku);

const stableId = (kind, value) => `legacy-pwa:${kind}:${textValue(value)}`;

const uniqueById = items => Array.from(new Map(
  safeArray(items).filter(item => item?.id).map(item => [String(item.id), item]),
).values());

const mergeById = (current, imported) => uniqueById([
  ...safeArray(current),
  ...safeArray(imported).filter(candidate => !safeArray(current).some(item => String(item.id) === String(candidate.id))),
]);

export const isGyrosLegacyCompany = company => {
  const identity = normalizeText([
    company?.name,
    company?.alias,
    company?.businessName,
    company?.tradeName,
  ].filter(Boolean).join(' '));
  return identity.includes('gyros');
};

const productTokens = value => normalizeText(value).split(' ').filter(Boolean);

const productSimilarity = (left, right) => {
  const leftTokens = productTokens(left);
  const rightTokens = productTokens(right);
  if (!leftTokens.length || !rightTokens.length) return 0;
  const rightSet = new Set(rightTokens);
  const shared = leftTokens.filter(token => rightSet.has(token)).length;
  return (2 * shared) / (leftTokens.length + rightTokens.length);
};

const findSafeProductMatch = (legacyProduct, erpProducts) => {
  const code = entityCode(legacyProduct);
  if (code) {
    const codeMatches = safeArray(erpProducts).filter(product => entityCode(product) === code);
    if (codeMatches.length === 1) return codeMatches[0];
  }

  const legacyName = entityName(legacyProduct);
  const candidates = safeArray(erpProducts)
    .map(product => ({ product, score: productSimilarity(legacyName, entityName(product)) }))
    .filter(candidate => candidate.score >= 0.72)
    .sort((left, right) => right.score - left.score);

  if (!candidates.length) return null;
  if (candidates[1] && candidates[0].score - candidates[1].score < 0.12) return null;
  return candidates[0].product;
};

const findExactTechnicalMatch = (legacyEntity, erpEntities) => {
  const code = entityCode(legacyEntity);
  const normalizedName = normalizeText(entityName(legacyEntity));
  const matches = safeArray(erpEntities).filter(entity => (
    (code && entityCode(entity) === code) ||
    (normalizedName && normalizeText(entityName(entity)) === normalizedName)
  ));
  return matches.length === 1 ? matches[0] : null;
};

const entityUnit = (entity, type) => {
  if (type === MENU_COSTS_DRAFT_ENTITY_TYPES.PREPARATION) {
    return textValue(entity?.yieldUnit || entity?.erpUnit || 'un').toLowerCase();
  }
  if (type === MENU_COSTS_DRAFT_ENTITY_TYPES.PACKAGING) return 'un';
  return textValue(entity?.baseUnit || entity?.erpUnit || 'un').toLowerCase();
};

const buildLegacyEntity = ({ entity, type, erpMatch }) => ({
  id: stableId(type, entity.id),
  type,
  name: entityName(entity),
  description: textValue(entity?.description || entity?.notes),
  source: MENU_COSTS_DRAFT_SOURCES.LEGACY_PWA,
  erpReference: erpMatch ? {
    id: entityId(erpMatch),
    iri: textValue(erpMatch?.['@id']),
  } : null,
  unit: entityUnit(entity, type),
  yieldQuantity: Number(entity?.yieldQty || 0) || 0,
  yieldUnit: textValue(entity?.yieldUnit).toLowerCase(),
  metadata: {
    legacyId: entity.id,
    code: entity.code || '',
    notes: entity.notes || '',
    storage: entity.storage || '',
    importStatus: erpMatch ? 'linked' : 'needs_registration',
  },
});

const createLegacyLookup = legacyDb => ({
  ingredient: new Map(safeArray(legacyDb?.ingredients).map(item => [String(item.id), item])),
  preparation: new Map(safeArray(legacyDb?.recipes).map(item => [String(item.id), item])),
  packaging: new Map(safeArray(legacyDb?.packaging).map(item => [String(item.id), item])),
});

const resolveLegacyTarget = (lookup, component) => {
  const type = component?.refType === 'recipe'
    ? MENU_COSTS_DRAFT_ENTITY_TYPES.PREPARATION
    : component?.refType === 'packaging'
      ? MENU_COSTS_DRAFT_ENTITY_TYPES.PACKAGING
      : component?.refType === 'ingredient'
        ? MENU_COSTS_DRAFT_ENTITY_TYPES.INGREDIENT
        : '';
  const entity = type ? lookup[type]?.get(String(component?.refId)) : null;
  return entity ? { type, entity } : null;
};

export const buildGyrosLegacyDraftImport = ({ companyId, erpDb = {}, legacyDb = {} } = {}) => {
  const lookup = createLegacyLookup(legacyDb);
  const products = [];
  const ingredients = [];
  const preparations = [];
  const packaging = [];
  const compositionLinks = [];
  const preparationComponents = [];
  const packagingLinks = [];
  const technicalRoles = Object.entries(GYROS_TECHNICAL_ROLE_OVERRIDES).map(([targetId, role]) => ({
    id: `technical-role:${targetId}`,
    targetId,
    role,
    source: MENU_COSTS_DRAFT_SOURCES.LEGACY_PWA,
  }));
  const importedTechnicalIds = new Set();
  const importedPreparationIds = new Set();

  const technicalCollection = type => {
    if (type === MENU_COSTS_DRAFT_ENTITY_TYPES.INGREDIENT) return erpDb?.ingredients;
    if (type === MENU_COSTS_DRAFT_ENTITY_TYPES.PREPARATION) return erpDb?.recipes;
    if (type === MENU_COSTS_DRAFT_ENTITY_TYPES.PACKAGING) return erpDb?.packaging;
    return [];
  };

  const importTechnicalEntity = (type, entity) => {
    const key = `${type}:${entity.id}`;
    const erpMatch = findExactTechnicalMatch(entity, technicalCollection(type));
    const targetId = erpMatch ? entityId(erpMatch) : stableId(type, entity.id);

    if (!importedTechnicalIds.has(key)) {
      importedTechnicalIds.add(key);
      const draft = buildLegacyEntity({ entity, type, erpMatch });
      if (type === MENU_COSTS_DRAFT_ENTITY_TYPES.INGREDIENT) ingredients.push(draft);
      if (type === MENU_COSTS_DRAFT_ENTITY_TYPES.PREPARATION) preparations.push(draft);
      if (type === MENU_COSTS_DRAFT_ENTITY_TYPES.PACKAGING) packaging.push(draft);
    }

    if (type === MENU_COSTS_DRAFT_ENTITY_TYPES.PREPARATION && !importedPreparationIds.has(entity.id)) {
      importedPreparationIds.add(entity.id);
      safeArray(entity.components).forEach((component, index) => {
        const target = resolveLegacyTarget(lookup, component);
        if (!target || target.type === MENU_COSTS_DRAFT_ENTITY_TYPES.PACKAGING) return;
        const componentTargetId = importTechnicalEntity(target.type, target.entity);
        preparationComponents.push({
          id: stableId('recipe-component', `${entity.id}:${index}:${component.refId}`),
          preparationId: targetId,
          targetId: componentTargetId,
          targetType: target.type,
          quantity: Number(component.qty || 0) || 0,
          unit: entityUnit(target.entity, target.type),
          source: MENU_COSTS_DRAFT_SOURCES.LEGACY_PWA,
        });
      });
    }

    return targetId;
  };

  safeArray(legacyDb?.products)
    .filter(product => product?.active !== false && product?.includeInCatalogCount !== false)
    .forEach(legacyProduct => {
      const erpProduct = findSafeProductMatch(legacyProduct, erpDb?.products);
      if (!erpProduct) return;

      const productId = entityId(erpProduct);
      products.push({
        ...buildLegacyEntity({
          entity: legacyProduct,
          type: MENU_COSTS_DRAFT_ENTITY_TYPES.SALE_PRODUCT,
          erpMatch: erpProduct,
        }),
        metadata: {
          legacyId: legacyProduct.id,
          code: legacyProduct.code || '',
          notes: legacyProduct.notes || '',
          importStatus: 'linked',
        },
      });

      safeArray(legacyProduct.components).forEach((component, index) => {
        const target = resolveLegacyTarget(lookup, component);
        if (!target) return;
        const targetId = importTechnicalEntity(target.type, target.entity);
        const relation = {
          id: stableId('product-component', `${legacyProduct.id}:${index}:${component.refId}`),
          productId,
          targetId,
          targetType: target.type,
          quantity: Number(component.qty || 0) || 0,
          unit: entityUnit(target.entity, target.type),
          source: MENU_COSTS_DRAFT_SOURCES.LEGACY_PWA,
        };

        if (target.type === MENU_COSTS_DRAFT_ENTITY_TYPES.PACKAGING) packagingLinks.push(relation);
        else compositionLinks.push(relation);
      });
    });

  return normalizeMenuCostsDraftWorkspace({
    products: uniqueById(products),
    ingredients: uniqueById(ingredients),
    preparations: uniqueById(preparations),
    packaging: uniqueById(packaging),
    compositionLinks: uniqueById(compositionLinks),
    preparationComponents: uniqueById(preparationComponents),
    packagingLinks: uniqueById(packagingLinks),
    technicalRoles,
    choiceGroups: [],
    choiceOptions: [],
  }, companyId);
};

export const ensureGyrosLegacyDraftImport = async ({
  company,
  erpDb,
  legacyDb,
  draftRepository,
} = {}) => {
  const companyId = entityId(company);
  const current = await draftRepository.load(companyId);
  if (!isGyrosLegacyCompany(company)) return current;
  if (Number(current?.imports?.legacyPwa?.version || 0) >= GYROS_LEGACY_IMPORT_VERSION) return current;

  const imported = buildGyrosLegacyDraftImport({ companyId, erpDb, legacyDb });
  return draftRepository.save(companyId, {
    ...current,
    products: mergeById(current.products, imported.products),
    ingredients: mergeById(current.ingredients, imported.ingredients),
    preparations: mergeById(current.preparations, imported.preparations),
    packaging: mergeById(current.packaging, imported.packaging),
    compositionLinks: mergeById(current.compositionLinks, imported.compositionLinks),
    preparationComponents: mergeById(current.preparationComponents, imported.preparationComponents),
    packagingLinks: mergeById(current.packagingLinks, imported.packagingLinks),
    technicalRoles: mergeById(current.technicalRoles, imported.technicalRoles),
    imports: {
      ...(current.imports || {}),
      legacyPwa: {
        version: GYROS_LEGACY_IMPORT_VERSION,
        source: MENU_COSTS_DRAFT_SOURCES.LEGACY_PWA,
      },
    },
  });
};
