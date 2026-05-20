const normalizeLanguageCode = value =>
  String(value || '')
    .trim()
    .replace('_', '-')
    .toLowerCase();

const resolveActiveCompany = (currentCompany, defaultCompany) =>
  currentCompany || defaultCompany || null;

const resolveFallbackLanguage = (languageItems, configLanguage) =>
  languageItems[0]?.language || configLanguage || '';

const resolveInitialLanguage = ({
  previousLanguage,
  languageItems,
  configLanguage,
}) => {
  const normalizedCurrentLanguage = normalizeLanguageCode(previousLanguage);
  const fallbackLanguage = resolveFallbackLanguage(languageItems, configLanguage);
  const normalizedAvailableLanguages = new Set(
    (Array.isArray(languageItems) ? languageItems : [])
      .map(language => normalizeLanguageCode(language?.language))
      .filter(Boolean),
  );

  if (!normalizedCurrentLanguage) {
    return fallbackLanguage || previousLanguage || '';
  }

  if (
    normalizedAvailableLanguages.size > 0
    && !normalizedAvailableLanguages.has(normalizedCurrentLanguage)
    && fallbackLanguage
  ) {
    return fallbackLanguage;
  }

  return previousLanguage;
};

module.exports = {
  normalizeLanguageCode,
  resolveActiveCompany,
  resolveInitialLanguage,
};