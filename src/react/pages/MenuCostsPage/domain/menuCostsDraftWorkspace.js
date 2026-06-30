// O workspace local descreve rascunhos tecnicos sem alterar registros oficiais do ERP.
export const MENU_COSTS_DRAFT_VERSION = 1;

export const MENU_COSTS_DRAFT_ENTITY_TYPES = Object.freeze({
  SALE_PRODUCT: 'sale_product',
  INGREDIENT: 'ingredient',
  PREPARATION: 'preparation',
  PACKAGING: 'packaging',
  RESALE: 'resale',
});

export const MENU_COSTS_TECHNICAL_ROLES = Object.freeze({
  INGREDIENT: 'ingredient',
  PREPARATION: 'preparation',
  PACKAGING: 'packaging',
  RESALE: 'resale',
  SALE_PRODUCT: 'sale_product',
});

export const MENU_COSTS_DRAFT_SOURCES = Object.freeze({
  MANUAL: 'manual',
  ASSISTED_IMPORT: 'assisted_import',
  LEGACY_PWA: 'legacy_pwa',
});

export const MENU_COSTS_DRAFT_COLLECTIONS = Object.freeze({
  sale_product: 'products',
  ingredient: 'ingredients',
  preparation: 'preparations',
  packaging: 'packaging',
  resale: 'resale',
});

const ENTITY_TYPES = Object.values(MENU_COSTS_DRAFT_ENTITY_TYPES);
const TECHNICAL_ROLES = Object.values(MENU_COSTS_TECHNICAL_ROLES);
const ENTITY_SOURCES = Object.values(MENU_COSTS_DRAFT_SOURCES);
const COMPOSITION_TARGET_TYPES = new Set([
  MENU_COSTS_DRAFT_ENTITY_TYPES.INGREDIENT,
  MENU_COSTS_DRAFT_ENTITY_TYPES.PREPARATION,
]);
const CHOICE_TARGET_TYPES = new Set(ENTITY_TYPES);

const safeArray = value => (Array.isArray(value) ? value : []);

const textValue = value => String(value ?? '').trim();

const numberValue = value => {
  const parsed = Number.parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeId = value => textValue(value);

const normalizeErpReference = value => {
  const id = normalizeId(value?.id || value?.['@id'] || value);
  if (!id) return null;

  return {
    id,
    iri: textValue(value?.iri || value?.['@id']),
  };
};

const normalizeEntity = (entity, expectedType) => {
  const type = textValue(entity?.type || expectedType);
  const source = textValue(entity?.source || MENU_COSTS_DRAFT_SOURCES.MANUAL);

  return {
    id: normalizeId(entity?.id),
    type,
    name: textValue(entity?.name),
    description: textValue(entity?.description),
    source: ENTITY_SOURCES.includes(source) ? source : MENU_COSTS_DRAFT_SOURCES.MANUAL,
    erpReference: normalizeErpReference(entity?.erpReference),
    unit: textValue(entity?.unit),
    yieldQuantity: numberValue(entity?.yieldQuantity),
    yieldUnit: textValue(entity?.yieldUnit),
    metadata: entity?.metadata && typeof entity.metadata === 'object' ? entity.metadata : {},
  };
};

const normalizeQuantityLink = link => ({
  id: normalizeId(link?.id),
  productId: normalizeId(link?.productId),
  targetId: normalizeId(link?.targetId),
  targetType: textValue(link?.targetType),
  quantity: numberValue(link?.quantity),
  unit: textValue(link?.unit),
  source: ENTITY_SOURCES.includes(link?.source)
    ? link.source
    : MENU_COSTS_DRAFT_SOURCES.MANUAL,
});

const normalizePreparationComponent = link => ({
  id: normalizeId(link?.id),
  preparationId: normalizeId(link?.preparationId),
  targetId: normalizeId(link?.targetId),
  targetType: textValue(link?.targetType),
  quantity: numberValue(link?.quantity),
  unit: textValue(link?.unit),
  source: ENTITY_SOURCES.includes(link?.source)
    ? link.source
    : MENU_COSTS_DRAFT_SOURCES.MANUAL,
});

const normalizeChoiceGroup = group => ({
  id: normalizeId(group?.id),
  productId: normalizeId(group?.productId),
  name: textValue(group?.name),
  minimum: Math.max(0, numberValue(group?.minimum)),
  maximum: Math.max(0, numberValue(group?.maximum)),
  source: ENTITY_SOURCES.includes(group?.source)
    ? group.source
    : MENU_COSTS_DRAFT_SOURCES.MANUAL,
});

const normalizeChoiceOption = option => ({
  id: normalizeId(option?.id),
  groupId: normalizeId(option?.groupId),
  name: textValue(option?.name),
  targetId: normalizeId(option?.targetId),
  targetType: textValue(option?.targetType),
  quantity: numberValue(option?.quantity),
  unit: textValue(option?.unit),
  priceDelta: numberValue(option?.priceDelta),
  source: ENTITY_SOURCES.includes(option?.source)
    ? option.source
    : MENU_COSTS_DRAFT_SOURCES.MANUAL,
});

const normalizeTechnicalRole = assignment => ({
  id: normalizeId(assignment?.id || assignment?.targetId),
  targetId: normalizeId(assignment?.targetId),
  role: textValue(assignment?.role),
  source: ENTITY_SOURCES.includes(assignment?.source)
    ? assignment.source
    : MENU_COSTS_DRAFT_SOURCES.MANUAL,
});

const normalizeWorkspaceCollections = workspace => Object.fromEntries(
  Object.entries(MENU_COSTS_DRAFT_COLLECTIONS).map(([type, collection]) => [
    collection,
    safeArray(workspace?.[collection]).map(entity => normalizeEntity(entity, type)),
  ]),
);

export const createEmptyMenuCostsDraftWorkspace = companyId => ({
  version: MENU_COSTS_DRAFT_VERSION,
  companyId: normalizeId(companyId),
  updatedAt: '',
  imports: {},
  products: [],
  ingredients: [],
  preparations: [],
  packaging: [],
  resale: [],
  compositionLinks: [],
  preparationComponents: [],
  packagingLinks: [],
  resaleLinks: [],
  choiceGroups: [],
  choiceOptions: [],
  technicalRoles: [],
});

export const normalizeMenuCostsDraftWorkspace = (workspace, companyId) => ({
  ...createEmptyMenuCostsDraftWorkspace(companyId),
  ...normalizeWorkspaceCollections(workspace),
  companyId: normalizeId(companyId),
  updatedAt: textValue(workspace?.updatedAt),
  imports: workspace?.imports && typeof workspace.imports === 'object' ? workspace.imports : {},
  compositionLinks: safeArray(workspace?.compositionLinks).map(normalizeQuantityLink),
  preparationComponents: safeArray(workspace?.preparationComponents).map(normalizePreparationComponent),
  packagingLinks: safeArray(workspace?.packagingLinks).map(normalizeQuantityLink),
  resaleLinks: safeArray(workspace?.resaleLinks).map(normalizeQuantityLink),
  choiceGroups: safeArray(workspace?.choiceGroups).map(normalizeChoiceGroup),
  choiceOptions: safeArray(workspace?.choiceOptions).map(normalizeChoiceOption),
  technicalRoles: safeArray(workspace?.technicalRoles).map(normalizeTechnicalRole),
});

const validationIssue = (code, path) => ({ code, path });

const validateEntity = (entity, path, expectedType) => {
  const issues = [];
  if (!entity.id) issues.push(validationIssue('missing_id', path));
  if (!entity.name) issues.push(validationIssue('missing_name', path));
  if (entity.type !== expectedType) issues.push(validationIssue('invalid_entity_type', path));
  return issues;
};

const validateQuantityLink = ({ link, path, targetTypes }) => {
  const issues = [];
  if (!link.id) issues.push(validationIssue('missing_id', path));
  if (!link.productId) issues.push(validationIssue('missing_product', path));
  if (!link.targetId) issues.push(validationIssue('missing_target', path));
  if (!targetTypes.has(link.targetType)) issues.push(validationIssue('invalid_target_type', path));
  if (link.quantity <= 0) issues.push(validationIssue('invalid_quantity', path));
  if (!link.unit) issues.push(validationIssue('missing_unit', path));
  return issues;
};

const validatePreparationComponent = (link, path) => {
  const issues = [];
  if (!link.id) issues.push(validationIssue('missing_id', path));
  if (!link.preparationId) issues.push(validationIssue('missing_preparation', path));
  if (!link.targetId) issues.push(validationIssue('missing_target', path));
  if (!COMPOSITION_TARGET_TYPES.has(link.targetType)) {
    issues.push(validationIssue('invalid_target_type', path));
  }
  if (link.quantity <= 0) issues.push(validationIssue('invalid_quantity', path));
  if (!link.unit) issues.push(validationIssue('missing_unit', path));
  return issues;
};

// A validacao impede que papeis operacionais diferentes sejam fundidos no rascunho.
export const validateMenuCostsDraftWorkspace = workspace => {
  const issues = [];

  Object.entries(MENU_COSTS_DRAFT_COLLECTIONS).forEach(([type, collection]) => {
    safeArray(workspace?.[collection]).forEach((entity, index) => {
      issues.push(...validateEntity(entity, `${collection}.${index}`, type));
    });
  });

  safeArray(workspace?.compositionLinks).forEach((link, index) => {
    issues.push(...validateQuantityLink({
      link,
      path: `compositionLinks.${index}`,
      targetTypes: COMPOSITION_TARGET_TYPES,
    }));
  });

  safeArray(workspace?.preparationComponents).forEach((link, index) => {
    issues.push(...validatePreparationComponent(link, `preparationComponents.${index}`));
  });

  safeArray(workspace?.packagingLinks).forEach((link, index) => {
    issues.push(...validateQuantityLink({
      link,
      path: `packagingLinks.${index}`,
      targetTypes: new Set([MENU_COSTS_DRAFT_ENTITY_TYPES.PACKAGING]),
    }));
  });

  safeArray(workspace?.resaleLinks).forEach((link, index) => {
    issues.push(...validateQuantityLink({
      link,
      path: `resaleLinks.${index}`,
      targetTypes: new Set([MENU_COSTS_DRAFT_ENTITY_TYPES.RESALE]),
    }));
  });

  safeArray(workspace?.choiceGroups).forEach((group, index) => {
    const path = `choiceGroups.${index}`;
    if (!group.id) issues.push(validationIssue('missing_id', path));
    if (!group.productId) issues.push(validationIssue('missing_product', path));
    if (!group.name) issues.push(validationIssue('missing_name', path));
    if (group.maximum > 0 && group.maximum < group.minimum) {
      issues.push(validationIssue('invalid_choice_range', path));
    }
  });

  safeArray(workspace?.choiceOptions).forEach((option, index) => {
    const path = `choiceOptions.${index}`;
    if (!option.id) issues.push(validationIssue('missing_id', path));
    if (!option.groupId) issues.push(validationIssue('missing_group', path));
    if (!option.name) issues.push(validationIssue('missing_name', path));
    if (!option.targetId) issues.push(validationIssue('missing_target', path));
    if (!CHOICE_TARGET_TYPES.has(option.targetType)) {
      issues.push(validationIssue('invalid_target_type', path));
    }
    if (option.quantity <= 0) issues.push(validationIssue('invalid_quantity', path));
    if (!option.unit) issues.push(validationIssue('missing_unit', path));
  });

  safeArray(workspace?.technicalRoles).forEach((assignment, index) => {
    const path = `technicalRoles.${index}`;
    if (!assignment.id) issues.push(validationIssue('missing_id', path));
    if (!assignment.targetId) issues.push(validationIssue('missing_target', path));
    if (!TECHNICAL_ROLES.includes(assignment.role)) {
      issues.push(validationIssue('invalid_technical_role', path));
    }
  });

  return issues;
};

export const setMenuCostsTechnicalRole = (workspace, targetId, role) => {
  const normalizedTargetId = normalizeId(targetId);
  const normalizedRole = textValue(role);
  const current = safeArray(workspace?.technicalRoles);

  if (!normalizedTargetId || !TECHNICAL_ROLES.includes(normalizedRole)) return workspace;

  return {
    ...workspace,
    technicalRoles: [
      ...current.filter(assignment => assignment.targetId !== normalizedTargetId),
      {
        id: `technical-role:${normalizedTargetId}`,
        targetId: normalizedTargetId,
        role: normalizedRole,
        source: MENU_COSTS_DRAFT_SOURCES.MANUAL,
      },
    ],
  };
};

export const assertValidMenuCostsDraftWorkspace = workspace => {
  const issues = validateMenuCostsDraftWorkspace(workspace);
  if (!issues.length) return workspace;

  const error = new Error('O rascunho tecnico possui dados invalidos.');
  error.code = 'MENU_COSTS_INVALID_DRAFT_WORKSPACE';
  error.issues = issues;
  throw error;
};
