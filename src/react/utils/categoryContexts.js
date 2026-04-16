const DOCUMENT_CATEGORY_CONTEXTS = {
  proposal: 'proposal-category',
  contract: 'contract-category',
  email: 'email-category',
  menu: 'menu-category',
};

export const normalizeCategoryContext = value => String(value || '').trim();

export const getCategoryContextForDocument = documentContext => {
  const normalizedContext = normalizeCategoryContext(documentContext);
  if (!normalizedContext) {
    return '';
  }

  return DOCUMENT_CATEGORY_CONTEXTS[normalizedContext] || `${normalizedContext}-category`;
};

export const getCategoryContextCandidates = documentContext => {
  const normalizedContext = normalizeCategoryContext(documentContext);
  if (!normalizedContext) {
    return [];
  }

  const preferredContext = getCategoryContextForDocument(normalizedContext);
  const legacyContext = `${normalizedContext}-model`;

  if (preferredContext === legacyContext) {
    return [preferredContext];
  }

  return [preferredContext, legacyContext];
};

export const humanizeCategoryContext = value => {
  const normalizedContext = normalizeCategoryContext(value);
  if (!normalizedContext) {
    return 'Sem contexto';
  }

  return normalizedContext
    .split(/[-_]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};
