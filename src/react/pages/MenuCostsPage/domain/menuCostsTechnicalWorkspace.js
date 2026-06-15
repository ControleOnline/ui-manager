import { buildEngineeringResaleRows } from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/engineeringCatalogAdapter';
import {
  MENU_COSTS_DRAFT_ENTITY_TYPES,
  createEmptyMenuCostsDraftWorkspace,
  normalizeMenuCostsDraftWorkspace,
} from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/menuCostsDraftWorkspace';
import { indexMenuCostsComponentRecords } from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/menuCostsComponentRecords';

export const MENU_COSTS_TECHNICAL_ORIGINS = Object.freeze({
  ERP: 'erp',
  DRAFT: 'draft',
  ERP_AND_DRAFT: 'erp_and_draft',
});

const safeArray = value => (Array.isArray(value) ? value : []);

const textValue = value => String(value ?? '').trim();

const numberValue = value => {
  const parsed = Number.parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const entityId = value => textValue(value?.id || value?.['@id'] || value);

const entityName = value => textValue(
  value?.name || value?.product || value?.title || value?.label,
);

const erpEntity = (record, type) => ({
  key: `erp:${type}:${entityId(record)}`,
  id: entityId(record),
  type,
  name: entityName(record),
  description: textValue(record?.description),
  origin: MENU_COSTS_TECHNICAL_ORIGINS.ERP,
  origins: [MENU_COSTS_TECHNICAL_ORIGINS.ERP],
  erpReference: {
    id: entityId(record),
    iri: textValue(record?.['@id']),
  },
  draftReference: null,
  record,
});

const draftEntity = entity => ({
  key: `draft:${entity.type}:${entity.id}`,
  id: entity.id,
  type: entity.type,
  name: entity.name,
  description: entity.description,
  origin: MENU_COSTS_TECHNICAL_ORIGINS.DRAFT,
  origins: [MENU_COSTS_TECHNICAL_ORIGINS.DRAFT],
  erpReference: entity.erpReference,
  draftReference: { id: entity.id },
  source: entity.source,
  record: entity,
});

// Um rascunho vinculado enriquece a leitura, mas nunca substitui o registro oficial.
const mergeLinkedDraft = (official, draft) => ({
  ...official,
  origin: MENU_COSTS_TECHNICAL_ORIGINS.ERP_AND_DRAFT,
  origins: [MENU_COSTS_TECHNICAL_ORIGINS.ERP, MENU_COSTS_TECHNICAL_ORIGINS.DRAFT],
  draftReference: { id: draft.id },
  draftName: draft.name,
  draftDescription: draft.description,
  draftSource: draft.source,
  draftRecord: draft,
});

const mergeEntityCollection = ({ erpRecords, draftRecords, type }) => {
  const officialById = new Map(
    safeArray(erpRecords)
      .map(record => erpEntity(record, type))
      .filter(entity => entity.id)
      .map(entity => [entity.id, entity]),
  );
  const combined = Array.from(officialById.values());

  safeArray(draftRecords).forEach(draft => {
    const linkedErpId = entityId(draft?.erpReference);
    const official = linkedErpId ? officialById.get(linkedErpId) : null;
    if (!official) {
      combined.push(draftEntity(draft));
      return;
    }

    const officialIndex = combined.findIndex(entity => entity.key === official.key);
    combined[officialIndex] = mergeLinkedDraft(official, draft);
  });

  return combined.sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
};

const relationOrigin = origin => ({
  origin,
  origins: [origin],
});

const normalizeErpRelation = ({ relation, ownerId, ownerType, targetType }) => ({
  key: `erp:relation:${entityId(relation) || `${ownerType}:${ownerId}:${targetType}:${entityId(relation?.refId)}`}`,
  id: entityId(relation?.relationId || relation),
  ownerId: textValue(ownerId),
  ownerType,
  targetId: entityId(relation?.refId),
  targetType,
  quantity: numberValue(relation?.qty),
  unit: textValue(relation?.unit),
  pricingMode: textValue(relation?.pricingMode),
  ...relationOrigin(MENU_COSTS_TECHNICAL_ORIGINS.ERP),
  record: relation,
});

const normalizeDraftRelation = ({ relation, ownerId, ownerType }) => ({
  key: `draft:relation:${relation.id}`,
  id: relation.id,
  ownerId: textValue(ownerId),
  ownerType,
  targetId: relation.targetId,
  targetType: relation.targetType,
  quantity: relation.quantity,
  unit: relation.unit,
  ...relationOrigin(MENU_COSTS_TECHNICAL_ORIGINS.DRAFT),
  source: relation.source,
  record: relation,
});

const emptyRelations = () => ({
  composition: [],
  preparationComponents: [],
  packaging: [],
  resale: [],
  choiceGroups: [],
  choiceOptions: [],
  unresolved: [],
});

const unresolvedRelation = ({ relation, ownerId, ownerType, reason }) => ({
  ...normalizeErpRelation({
    relation,
    ownerId,
    ownerType,
    targetType: textValue(relation?.refType || 'unknown'),
  }),
  reason,
});

const collectErpFixedRelations = ({ erpDb, resaleIds }) => {
  const relations = emptyRelations();

  safeArray(erpDb?.products).forEach(product => {
    safeArray(product?.components).forEach(component => {
      const refType = textValue(component?.refType);
      const targetId = entityId(component?.refId);
      const common = { relation: component, ownerId: entityId(product), ownerType: 'sale_product' };

      if (refType === 'ingredient' || refType === 'recipe') {
        relations.composition.push(normalizeErpRelation({ ...common, targetType: refType === 'recipe' ? 'preparation' : 'ingredient' }));
      } else if (refType === 'packaging') {
        relations.packaging.push(normalizeErpRelation({ ...common, targetType: 'packaging' }));
      } else if (refType === 'product' && resaleIds.has(targetId)) {
        relations.resale.push(normalizeErpRelation({ ...common, targetType: 'resale' }));
      } else {
        relations.unresolved.push(unresolvedRelation({
          ...common,
          reason: 'unsupported_fixed_component_type',
        }));
      }
    });
  });

  safeArray(erpDb?.recipes).forEach(preparation => {
    safeArray(preparation?.components).forEach(component => {
      const refType = textValue(component?.refType);
      const common = { relation: component, ownerId: entityId(preparation), ownerType: 'preparation' };

      if (refType === 'ingredient' || refType === 'recipe') {
        relations.preparationComponents.push(normalizeErpRelation({
          ...common,
          targetType: refType === 'recipe' ? 'preparation' : 'ingredient',
        }));
      } else {
        relations.unresolved.push(unresolvedRelation({
          ...common,
          reason: 'unsupported_preparation_component_type',
        }));
      }
    });
  });

  return relations;
};

const collectErpChoiceRelations = (erpDb, relations) => {
  safeArray(erpDb?.products).forEach(product => {
    const groups = new Map();

    safeArray(product?.addons).forEach((addon, optionIndex) => {
      const groupId = entityId(addon?.groupId) || `${entityId(product)}:${textValue(addon?.group || 'Adicionais')}`;
      if (!groups.has(groupId)) {
        const group = {
          key: `erp:choice-group:${groupId}`,
          id: groupId,
          productId: entityId(product),
          name: textValue(addon?.group || 'Adicionais'),
          minimum: numberValue(addon?.minimum ?? (addon?.required ? 1 : 0)),
          maximum: numberValue(addon?.maximum),
          ...relationOrigin(MENU_COSTS_TECHNICAL_ORIGINS.ERP),
          record: addon,
        };
        groups.set(groupId, group);
        relations.choiceGroups.push(group);
      }

      const optionId = entityId(addon) || `${groupId}:${optionIndex}`;
      relations.choiceOptions.push({
        key: `erp:choice-option:${optionId}`,
        id: optionId,
        groupId,
        name: textValue(addon?.name || `Opcao ${optionIndex + 1}`),
        priceDelta: numberValue(addon?.salePriceDelta),
        targets: safeArray(addon?.components).map(component => ({
          targetId: entityId(component?.refId),
          targetType: component?.refType === 'recipe' ? 'preparation' : textValue(component?.refType),
          quantity: numberValue(component?.qty),
          unit: textValue(component?.unit),
          record: component,
        })),
        ...relationOrigin(MENU_COSTS_TECHNICAL_ORIGINS.ERP),
        record: addon,
      });
    });
  });
};

const collectDraftRelations = (workspace, relations) => {
  safeArray(workspace?.compositionLinks).forEach(relation => {
    relations.composition.push(normalizeDraftRelation({
      relation,
      ownerId: relation.productId,
      ownerType: 'sale_product',
    }));
  });
  safeArray(workspace?.preparationComponents).forEach(relation => {
    relations.preparationComponents.push(normalizeDraftRelation({
      relation,
      ownerId: relation.preparationId,
      ownerType: 'preparation',
    }));
  });
  safeArray(workspace?.packagingLinks).forEach(relation => {
    relations.packaging.push(normalizeDraftRelation({
      relation,
      ownerId: relation.productId,
      ownerType: 'sale_product',
    }));
  });
  safeArray(workspace?.resaleLinks).forEach(relation => {
    relations.resale.push(normalizeDraftRelation({
      relation,
      ownerId: relation.productId,
      ownerType: 'sale_product',
    }));
  });
  safeArray(workspace?.choiceGroups).forEach(group => {
    relations.choiceGroups.push({
      key: `draft:choice-group:${group.id}`,
      ...group,
      ...relationOrigin(MENU_COSTS_TECHNICAL_ORIGINS.DRAFT),
      record: group,
    });
  });
  safeArray(workspace?.choiceOptions).forEach(option => {
    relations.choiceOptions.push({
      key: `draft:choice-option:${option.id}`,
      ...option,
      targets: [{
        targetId: option.targetId,
        targetType: option.targetType,
        quantity: option.quantity,
        unit: option.unit,
      }],
      ...relationOrigin(MENU_COSTS_TECHNICAL_ORIGINS.DRAFT),
      record: option,
    });
  });
};

export const buildMenuCostsTechnicalWorkspace = ({ companyId, erpDb = {}, draftWorkspace = {} } = {}) => {
  const workspace = normalizeMenuCostsDraftWorkspace(draftWorkspace, companyId);
  const erpResale = buildEngineeringResaleRows({
    products: erpDb?.products,
    categories: erpDb?.categories,
  });
  const resaleIds = new Set(erpResale.map(entity => entityId(entity)));
  const relations = collectErpFixedRelations({ erpDb, resaleIds });

  collectErpChoiceRelations(erpDb, relations);
  collectDraftRelations(workspace, relations);

  const entities = {
    products: mergeEntityCollection({
      erpRecords: erpDb?.products,
      draftRecords: workspace.products,
      type: MENU_COSTS_DRAFT_ENTITY_TYPES.SALE_PRODUCT,
    }),
    ingredients: mergeEntityCollection({
      erpRecords: erpDb?.ingredients,
      draftRecords: workspace.ingredients,
      type: MENU_COSTS_DRAFT_ENTITY_TYPES.INGREDIENT,
    }),
    preparations: mergeEntityCollection({
      erpRecords: erpDb?.recipes,
      draftRecords: workspace.preparations,
      type: MENU_COSTS_DRAFT_ENTITY_TYPES.PREPARATION,
    }),
    packaging: mergeEntityCollection({
      erpRecords: erpDb?.packaging,
      draftRecords: workspace.packaging,
      type: MENU_COSTS_DRAFT_ENTITY_TYPES.PACKAGING,
    }),
    resale: mergeEntityCollection({
      erpRecords: erpResale,
      draftRecords: workspace.resale,
      type: MENU_COSTS_DRAFT_ENTITY_TYPES.RESALE,
    }),
  };
  const allEntities = Object.values(entities).flat();
  const entityIndex = Object.fromEntries(allEntities.flatMap(entity => {
    const aliases = safeArray(entity?.record?.sourceRecords).map(sourceRecord => {
      const aliasId = entityId(sourceRecord);
      return [`${entity.type}:${aliasId}`, {
        ...entity,
        id: aliasId,
        name: entityName(sourceRecord) || entity.name,
        erpReference: { id: aliasId, iri: '' },
        record: {
          ...entity.record,
          ...sourceRecord,
          costRecordId: entity.record?.id,
          sourceIds: entity.record?.sourceIds,
          sourceRecords: entity.record?.sourceRecords,
        },
      }];
    });

    return [
      [`${entity.type}:${entity.id}`, entity],
      ...(entity.draftReference?.id ? [[`${entity.type}:${entity.draftReference.id}`, entity]] : []),
      ...aliases,
    ];
  }));
  const technicalRoleByTargetId = Object.fromEntries(
    safeArray(workspace?.technicalRoles).map(assignment => [String(assignment.targetId), assignment.role]),
  );
  const componentRecordIndex = indexMenuCostsComponentRecords(erpDb?.componentProducts);

  return {
    companyId: textValue(companyId),
    draftUpdatedAt: workspace.updatedAt,
    entities,
    entityIndex,
    componentRecordIndex,
    technicalRoleByTargetId,
    relations,
    summary: {
      entityCount: allEntities.length,
      erpEntityCount: allEntities.filter(entity => entity.origins.includes(MENU_COSTS_TECHNICAL_ORIGINS.ERP)).length,
      draftEntityCount: allEntities.filter(entity => entity.origins.includes(MENU_COSTS_TECHNICAL_ORIGINS.DRAFT)).length,
      unlinkedDraftCount: allEntities.filter(entity => entity.origin === MENU_COSTS_TECHNICAL_ORIGINS.DRAFT).length,
      unresolvedRelationCount: relations.unresolved.length,
    },
  };
};

export const collectMenuCostsTechnicalWorkspace = async ({
  companyId,
  erpDb,
  draftRepository,
} = {}) => {
  const draftWorkspace = draftRepository
    ? await draftRepository.load(companyId)
    : createEmptyMenuCostsDraftWorkspace(companyId);

  return buildMenuCostsTechnicalWorkspace({ companyId, erpDb, draftWorkspace });
};
