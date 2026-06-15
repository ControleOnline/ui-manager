const safeArray = value => (Array.isArray(value) ? value : []);

const textValue = value => String(value ?? '').trim();

const entityId = value => textValue(value?.id || value?.['@id'] || value);

const relationRefType = targetType => (
  targetType === 'preparation' ? 'recipe' : targetType
);

const defaultTechnicalRole = targetType => (
  targetType === 'recipe' ? 'preparation' : targetType
);

const resolvePieceEntity = (technicalWorkspace, targetType, targetId) => (
  technicalWorkspace?.entityIndex?.[`${defaultTechnicalRole(targetType)}:${entityId(targetId)}`]
  || null
);

const resolveTechnicalRole = (technicalWorkspace, targetId, fallbackRole) => (
  technicalWorkspace?.technicalRoleByTargetId?.[entityId(targetId)] || fallbackRole
);

const resolveProductRecord = (technicalWorkspace, targetId) => (
  technicalWorkspace?.componentRecordIndex?.[entityId(targetId)] || null
);

const officialNodeMatchesDraft = (node, relation, entity) => {
  const linkedErpId = entityId(entity?.erpReference);
  if (!linkedErpId) return false;

  return relationRefType(relation.targetType) === textValue(node?.refType)
    && linkedErpId === entityId(node?.refId);
};

// A composicao e uma lista unica: o rascunho qualifica a origem do vinculo,
// enquanto o cadastro ERP continua sendo a fonte do item e de seu custo.
export const buildMenuCostsCompositionPieces = ({
  productId,
  officialNodes = [],
  technicalWorkspace,
} = {}) => {
  const nodes = safeArray(officialNodes)
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => ['ingredient', 'recipe'].includes(node?.refType));
  const consumedNodeKeys = new Set();
  const localRelations = safeArray(technicalWorkspace?.relations?.composition)
    .filter(relation => (
      relation.origin === 'draft'
      && String(relation.ownerId) === String(productId)
    ));

  const localPieces = localRelations.map(relation => {
    const entity = resolvePieceEntity(technicalWorkspace, relation.targetType, relation.targetId);
    const officialMatch = nodes.find(({ node }) => (
      !consumedNodeKeys.has(node.key)
      && officialNodeMatchesDraft(node, relation, entity)
    ));

    if (officialMatch) consumedNodeKeys.add(officialMatch.node.key);

    return {
      key: relation.key,
      origin: 'draft',
      targetType: relation.targetType,
      technicalRole: resolveTechnicalRole(
        technicalWorkspace,
        entity?.erpReference?.id || relation.targetId,
        relation.targetType,
      ),
      entity,
      productRecord: resolveProductRecord(
        technicalWorkspace,
        officialMatch?.node?.refId || entity?.erpReference?.id,
      ),
      node: officialMatch?.node || null,
      officialIndex: officialMatch?.index ?? -1,
      localRelationId: relation.id,
      quantity: relation.quantity,
      unit: relation.unit,
    };
  });

  const officialPieces = nodes
    .filter(({ node }) => !consumedNodeKeys.has(node.key))
    .map(({ node, index }) => {
      const targetType = defaultTechnicalRole(node.refType);
      const entity = resolvePieceEntity(technicalWorkspace, targetType, node.refId);

      return {
        key: node.key,
        origin: 'erp',
        targetType,
        technicalRole: resolveTechnicalRole(technicalWorkspace, node.refId, targetType),
        entity,
        productRecord: resolveProductRecord(technicalWorkspace, node.refId),
        node,
        officialIndex: index,
        localRelationId: '',
        quantity: node.qty,
        unit: node.unit,
      };
    });

  return [...localPieces, ...officialPieces].filter(piece => (
    ['ingredient', 'preparation'].includes(piece.technicalRole)
  ));
};

export const buildMenuCostsPackagingPieces = ({
  productId,
  officialNodes = [],
  technicalWorkspace,
} = {}) => {
  const reclassified = safeArray(officialNodes)
    .filter(node => ['ingredient', 'recipe', 'packaging'].includes(node?.refType))
    .map((node, index) => {
      const targetType = defaultTechnicalRole(node.refType);
      const technicalRole = resolveTechnicalRole(technicalWorkspace, node.refId, targetType);
      if (technicalRole !== 'packaging') return null;

      return {
        key: `packaging-role:${node.key}`,
        origin: 'erp',
        targetType,
        technicalRole,
        entity: resolvePieceEntity(technicalWorkspace, targetType, node.refId),
        productRecord: resolveProductRecord(technicalWorkspace, node.refId),
        node,
        officialIndex: index,
        localRelationId: '',
        quantity: node.qty,
        unit: node.unit,
      };
    })
    .filter(Boolean);
  const local = safeArray(technicalWorkspace?.relations?.packaging)
    .filter(relation => relation.origin === 'draft' && String(relation.ownerId) === String(productId))
    .map(relation => ({
      key: relation.key,
      origin: 'draft',
      targetType: 'packaging',
      technicalRole: 'packaging',
      entity: resolvePieceEntity(technicalWorkspace, 'packaging', relation.targetId),
      productRecord: resolveProductRecord(technicalWorkspace, relation.targetId),
      node: null,
      officialIndex: -1,
      localRelationId: relation.id,
      quantity: relation.quantity,
      unit: relation.unit,
    }));

  return [...local, ...reclassified];
};

export const updateMenuCostsCompositionLinkQuantity = (workspace, relationId, quantity) => ({
  ...workspace,
  compositionLinks: safeArray(workspace?.compositionLinks).map(relation => (
    String(relation.id) === String(relationId)
      ? { ...relation, quantity: Number(quantity) }
      : relation
  )),
});
