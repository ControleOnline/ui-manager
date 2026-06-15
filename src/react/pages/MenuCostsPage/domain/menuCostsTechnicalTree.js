const safeArray = value => (Array.isArray(value) ? value : []);

const numberValue = value => {
  const parsed = Number.parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const TECHNICAL_ROLE_META = {
  ingredient: { label: 'Ingrediente direto', shortLabel: 'Ingrediente' },
  preparation: { label: 'Preparo produzido', shortLabel: 'Preparo' },
  packaging: { label: 'Embalagem', shortLabel: 'Embalagem' },
  linked_product: { label: 'Produto vinculado', shortLabel: 'Produto' },
  resale: { label: 'Item de revenda', shortLabel: 'Revenda' },
  choice_group: { label: 'Grupo de escolha', shortLabel: 'Grupo' },
  choice_option: { label: 'Opção de escolha', shortLabel: 'Opção' },
  unknown: { label: 'Papel não classificado', shortLabel: 'Revisar' },
};

export const TECHNICAL_AUDIT_META = {
  confirmed: { label: 'Confirmado no ERP', tone: 'good' },
  review: { label: 'Revisar vínculo', tone: 'warn' },
  suggested: { label: 'Sugestão', tone: 'warn' },
  missing: { label: 'Referência ausente', tone: 'bad' },
};

const normalizeRole = value => String(value || '').trim().toLowerCase();

const explicitRoleForRecord = record => normalizeRole(
  record?.extraData?.menuCostsRole ||
  record?.menuCostsRole ||
  record?.technicalRole,
);

export const resolveTechnicalNodeRole = node => {
  const explicitRole = explicitRoleForRecord(node?.record);
  if (['recipe', 'preparation', 'preparo'].includes(explicitRole)) return 'preparation';
  if (['ingredient', 'feedstock', 'insumo'].includes(explicitRole)) return 'ingredient';
  if (['package', 'packaging', 'embalagem'].includes(explicitRole)) return 'packaging';
  if (['resale', 'revenda'].includes(explicitRole)) return 'resale';

  if (node?.refType === 'ingredient') return 'ingredient';
  if (node?.refType === 'recipe') return 'preparation';
  if (node?.refType === 'packaging') return 'packaging';
  if (node?.refType === 'product') return 'linked_product';
  return 'unknown';
};

const issue = (code, severity, label) => ({ code, severity, label });

const buildNodeIssues = ({ node, role, context, cycle }) => {
  const issues = [];
  const quantity = numberValue(node?.qty);

  if (!node?.record) issues.push(issue('missing_reference', 'error', 'O item vinculado não foi encontrado no cadastro técnico.'));
  if (cycle) issues.push(issue('cycle', 'error', 'A composição possui uma referência circular.'));
  if (quantity <= 0) issues.push(issue('invalid_quantity', 'error', 'Informe uma quantidade maior que zero.'));
  if (!String(node?.unit || '').trim()) issues.push(issue('missing_unit', 'warning', 'A unidade de consumo precisa ser confirmada.'));

  if (role === 'preparation' && node?.record) {
    if (numberValue(node.record.yieldQty) <= 0) {
      issues.push(issue('missing_yield', 'error', 'O preparo não possui rendimento válido.'));
    }
    if (!safeArray(node.record.components).length) {
      issues.push(issue('missing_recipe_components', 'warning', 'O preparo ainda não possui receita detalhada.'));
    }
  }

  if (context === 'fixed' && node?.record && numberValue(node?.cost) <= 0) {
    issues.push(issue('zero_cost', 'warning', 'O custo desta quantidade ainda está zerado.'));
  }

  if (!node?.relationId) {
    issues.push(issue('unconfirmed_relation', 'warning', 'O vínculo ainda não possui identificação persistida no ERP.'));
  }

  return issues;
};

const auditStatusFor = ({ node, issues }) => {
  if (!node?.record || issues.some(item => item.code === 'missing_reference')) return 'missing';
  if (issues.length) return 'review';
  return 'confirmed';
};

const buildTechnicalNode = ({ node, context, parentPath = [], ancestorRefs = [] }) => {
  const role = resolveTechnicalNodeRole(node);
  const refKey = `${node?.refType || 'unknown'}:${node?.refId || 'missing'}`;
  const cycle = ancestorRefs.includes(refKey);
  const path = [...parentPath, node?.name || String(node?.refId || 'Item sem nome')];
  const issues = buildNodeIssues({ node, role, context, cycle });
  const children = cycle
    ? []
    : safeArray(node?.children).map(child => buildTechnicalNode({
      node: child,
      context: 'nested',
      parentPath: path,
      ancestorRefs: [...ancestorRefs, refKey],
    }));

  return {
    key: `technical:${context}:${node?.key || refKey}:${path.join('>')}`,
    sourceKey: node?.key || refKey,
    relationId: node?.relationId || '',
    refType: node?.refType || '',
    refId: node?.refId || '',
    name: node?.name || String(node?.refId || 'Item sem nome'),
    role,
    roleLabel: TECHNICAL_ROLE_META[role]?.label || TECHNICAL_ROLE_META.unknown.label,
    context,
    path,
    pathLabel: path.join(' › '),
    qty: numberValue(node?.qty),
    unit: node?.unit || '',
    cost: numberValue(node?.cost),
    pricingMode: node?.pricingMode || 'markup',
    source: node?.relationId ? 'ERP' : 'Leitura local',
    status: auditStatusFor({ node, issues }),
    issues,
    children,
  };
};

const flattenTechnicalNodes = nodes => safeArray(nodes).flatMap(node => [
  node,
  ...flattenTechnicalNodes(node.children),
]);

const countBy = (items, keyResolver) => safeArray(items).reduce((counts, item) => {
  const key = keyResolver(item);
  return { ...counts, [key]: (counts[key] || 0) + 1 };
}, {});

const buildChoiceGroups = addons => {
  const grouped = safeArray(addons).reduce((groups, addon) => {
    const groupName = addon?.group || 'Adicionais';
    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push(addon);
    return groups;
  }, {});

  return Object.entries(grouped).map(([name, options], groupIndex) => {
    const firstOption = options[0] || {};
    const technicalOptions = options.map((option, optionIndex) => {
      const nodes = safeArray(option?.nodes).map(node => buildTechnicalNode({
        node,
        context: 'choice',
        parentPath: [name, option?.name || `Opção ${optionIndex + 1}`],
      }));
      const issues = flattenTechnicalNodes(nodes).flatMap(node => node.issues);

      return {
        key: `choice-option:${option?.id || optionIndex}`,
        sourceKey: String(option?.id || optionIndex),
        name: option?.name || `Opção ${optionIndex + 1}`,
        role: 'choice_option',
        roleLabel: TECHNICAL_ROLE_META.choice_option.label,
        status: issues.length ? 'review' : 'confirmed',
        required: option?.required === true,
        minimum: numberValue(option?.minimum),
        maximum: numberValue(option?.maximum),
        salePriceDelta: numberValue(option?.salePriceDelta),
        cost: numberValue(option?.directCost),
        issues,
        children: nodes,
      };
    });
    const optionIssues = technicalOptions.flatMap(option => option.issues);

    return {
      key: `choice-group:${name}:${groupIndex}`,
      name,
      role: 'choice_group',
      roleLabel: TECHNICAL_ROLE_META.choice_group.label,
      status: optionIssues.length ? 'review' : 'confirmed',
      required: firstOption.required === true,
      minimum: numberValue(firstOption.minimum ?? (firstOption.required ? 1 : 0)),
      maximum: numberValue(firstOption.maximum),
      optionCount: technicalOptions.length,
      issues: optionIssues,
      children: technicalOptions,
    };
  });
};

const buildSuggestedNodes = suggestions => safeArray(suggestions).map((suggestion, index) => ({
  key: `suggestion:${suggestion?.id || index}`,
  sourceKey: String(suggestion?.id || index),
  refType: 'recipe',
  refId: suggestion?.id || '',
  name: suggestion?.name || 'Preparo sugerido',
  role: 'preparation',
  roleLabel: TECHNICAL_ROLE_META.preparation.label,
  context: 'suggestion',
  path: [suggestion?.name || 'Preparo sugerido'],
  pathLabel: suggestion?.name || 'Preparo sugerido',
  qty: 0,
  unit: '',
  cost: 0,
  source: suggestion?.reason || 'Descrição comercial',
  status: 'suggested',
  issues: [issue('unconfirmed_suggestion', 'warning', 'Confirme o vínculo, a quantidade e a unidade antes de usar no custo.')],
  children: [],
}));

export const buildProductTechnicalTreeAudit = ({ computed, preparationSuggestions = [] } = {}) => {
  const fixed = safeArray(computed?.nodes).map(node => buildTechnicalNode({ node, context: 'fixed' }));
  const groups = buildChoiceGroups(computed?.addons);
  const suggestions = buildSuggestedNodes(preparationSuggestions);
  const fixedFlat = flattenTechnicalNodes(fixed);
  const groupTechnicalNodes = groups.flatMap(group => group.children.flatMap(option => flattenTechnicalNodes(option.children)));
  const mappedTechnicalNodes = [...fixedFlat, ...groupTechnicalNodes];
  const allTechnicalNodes = [...mappedTechnicalNodes, ...suggestions];
  const statusCounts = countBy(allTechnicalNodes, node => node.status);
  const roleCounts = countBy(allTechnicalNodes, node => node.role);
  const issues = mappedTechnicalNodes.flatMap(node => node.issues.map(item => ({
    ...item,
    nodeKey: node.key,
    nodeName: node.name,
    pathLabel: node.pathLabel,
  })));
  const nodeBySourceKey = Object.fromEntries(fixedFlat.map(node => [node.sourceKey, node]));
  const blockingCount = issues.filter(item => item.severity === 'error').length;
  const reviewCount = issues.filter(item => item.severity === 'warning').length;

  return {
    productId: computed?.product?.id || '',
    productName: computed?.product?.name || '',
    fixed,
    groups,
    suggestions,
    nodeBySourceKey,
    issues,
    summary: {
      fixedCount: fixed.length,
      technicalNodeCount: allTechnicalNodes.length,
      groupCount: groups.length,
      optionCount: groups.reduce((sum, group) => sum + group.optionCount, 0),
      confirmedCount: statusCounts.confirmed || 0,
      reviewCount,
      blockingCount,
      suggestionCount: suggestions.length,
      statusCounts,
      roleCounts,
      fixedRoleCounts: countBy(fixed, node => node.role),
      isComplete: fixed.length > 0 && blockingCount === 0 && reviewCount === 0 && suggestions.length === 0,
    },
  };
};
