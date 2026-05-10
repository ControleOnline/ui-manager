const normalizeCollectionItems = response => {
  if (Array.isArray(response?.member)) {
    return response.member;
  }

  if (Array.isArray(response?.['hydra:member'])) {
    return response['hydra:member'];
  }

  if (Array.isArray(response)) {
    return response;
  }

  return [];
};

const normalizeCollectionTotalItems = response => {
  const rawTotal = response?.totalItems ?? response?.['hydra:totalItems'];
  const normalizedTotal = Number(rawTotal);

  if (Number.isFinite(normalizedTotal) && normalizedTotal >= 0) {
    return normalizedTotal;
  }

  return normalizeCollectionItems(response).length;
};

const normalizeId = value => {
  if (value == null) return null;

  const match = String(value).match(/\d+/);
  return match?.[0] || null;
};

const normalizeText = value => String(value || '').trim();

const buildOverviewKey = translation =>
  [
    normalizeId(translation?.language?.id || translation?.language?.['@id']) || '',
    normalizeText(translation?.store),
    normalizeText(translation?.type),
    normalizeText(translation?.key),
  ].join('|');

const resolveLanguagePayload = ({ companyTranslation, fallbackTranslation, activeLanguage }) => {
  const translationLanguage = companyTranslation?.language || fallbackTranslation?.language;

  if (translationLanguage && typeof translationLanguage === 'object') {
    return {
      '@id': translationLanguage['@id']
        || (translationLanguage.id ? `/languages/${translationLanguage.id}` : undefined),
      id: translationLanguage.id ? Number(translationLanguage.id) : undefined,
      language: translationLanguage.language || activeLanguage,
    };
  }

  return {
    language: activeLanguage,
  };
};

const resolveCompanyLabel = company =>
  company?.alias || company?.name || '';

const formatOverviewItem = ({
  companyTranslation,
  fallbackTranslation,
  selectedCompany,
  mainCompany,
  activeLanguage,
}) => {
  const effectiveTranslation = companyTranslation || fallbackTranslation;

  return {
    rowId: companyTranslation?.id
      ? `translate-${companyTranslation.id}`
      : `fallback-${fallbackTranslation?.id}`,
    translateId: companyTranslation?.id || null,
    fallbackId: fallbackTranslation?.id || null,
    language: resolveLanguagePayload({
      companyTranslation,
      fallbackTranslation,
      activeLanguage,
    }),
    people: {
      '@id': selectedCompany?.id ? `/people/${selectedCompany.id}` : undefined,
      id: selectedCompany?.id,
      name: resolveCompanyLabel(selectedCompany),
    },
    mainCompany: {
      '@id': mainCompany?.id ? `/people/${mainCompany.id}` : undefined,
      id: mainCompany?.id,
      name: resolveCompanyLabel(mainCompany),
    },
    store: effectiveTranslation?.store || '',
    type: effectiveTranslation?.type || '',
    key: effectiveTranslation?.key || '',
    translate: effectiveTranslation?.translate || '',
    revised: Boolean(effectiveTranslation?.revised),
    pendingReview: !Boolean(effectiveTranslation?.revised),
    hasOverride: Boolean(companyTranslation),
    source: companyTranslation ? 'company' : 'main_company',
    companyTranslate: companyTranslation?.translate || null,
    companyRevised: companyTranslation?.revised ?? null,
    mainTranslate: fallbackTranslation?.translate || null,
    mainRevised: fallbackTranslation?.revised ?? null,
  };
};

const filterOverviewItems = (items, search) => {
  const needle = normalizeText(search).toLowerCase();
  if (!needle) {
    return items;
  }

  return items.filter(item => {
    const haystack = [
      item.store,
      item.type,
      item.key,
      item.translate,
      item.companyTranslate,
      item.mainTranslate,
    ]
      .filter(value => normalizeText(value) !== '')
      .join(' ')
      .toLowerCase();

    return haystack.includes(needle);
  });
};

const sortOverviewItems = items =>
  [...items].sort((left, right) =>
    `${left.store}|${left.type}|${left.key}`.localeCompare(
      `${right.store}|${right.type}|${right.key}`,
    ));

const buildOverviewSummary = ({
  items,
  selectedCompany,
  mainCompany,
  activeLanguage,
}) => ({
  total: items.length,
  pendingReview: items.filter(item => item.pendingReview).length,
  reviewed: items.filter(item => !item.pendingReview).length,
  overrides: items.filter(item => item.hasOverride).length,
  fallbacks: items.filter(item => !item.hasOverride).length,
  selectedCompany: {
    id: selectedCompany?.id,
    name: resolveCompanyLabel(selectedCompany),
  },
  mainCompany: {
    id: mainCompany?.id,
    name: resolveCompanyLabel(mainCompany),
  },
  language: {
    language: activeLanguage,
  },
});

const buildOverviewFromTranslateCollections = ({
  companyTranslations,
  fallbackTranslations,
  selectedCompany,
  mainCompany,
  activeLanguage,
  search = '',
  pendingOnly = false,
}) => {
  const itemsByKey = new Map();

  fallbackTranslations.forEach(translation => {
    itemsByKey.set(buildOverviewKey(translation), {
      companyTranslation: null,
      fallbackTranslation: translation,
    });
  });

  companyTranslations.forEach(translation => {
    const key = buildOverviewKey(translation);
    const currentRow = itemsByKey.get(key) || {
      companyTranslation: null,
      fallbackTranslation: null,
    };

    itemsByKey.set(key, {
      ...currentRow,
      companyTranslation: translation,
    });
  });

  const formattedItems = sortOverviewItems(
    Array.from(itemsByKey.values()).map(row =>
      formatOverviewItem({
        ...row,
        selectedCompany,
        mainCompany,
        activeLanguage,
      })),
  );

  const searchedItems = filterOverviewItems(formattedItems, search);

  return {
    member: pendingOnly
      ? searchedItems.filter(item => item.pendingReview)
      : searchedItems,
    summary: buildOverviewSummary({
      items: searchedItems,
      selectedCompany,
      mainCompany,
      activeLanguage,
    }),
  };
};

const isNotFoundError = error =>
  Number(error?.status || error?.code) === 404;

module.exports = {
  buildOverviewFromTranslateCollections,
  isNotFoundError,
  normalizeCollectionItems,
  normalizeCollectionTotalItems,
};
