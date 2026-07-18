const normalizeValue = value => String(value ?? '').trim();

export const PEOPLE_DOMAIN_TYPES = ['API', 'APP', 'ERP', 'SHOP', 'WEBSITE'];

export const formatPeopleValue = (value, column, row) =>
  normalizeValue(row?.peopleLabel || value?.alias || value?.name || value?.peopleName || value);

export const savePeopleValue = value => {
  const rawValue = normalizeValue(value?.value ?? value?.id ?? value);

  return rawValue ? `/people/${rawValue}` : null;
};

export const formatApiPeopleDomainValue = (value, column, row) =>
  normalizeValue(row?.apiPeopleDomainLabel || value?.domain || value?.apiPeopleDomainLabel || value?.label || value);

export const saveApiPeopleDomainValue = value => {
  const rawValue = normalizeValue(value?.value ?? value?.id ?? value);

  return rawValue ? `/people_domains/${rawValue}` : null;
};

export const formatThemeValue = (value, column, row) =>
  normalizeValue(row?.themeLabel || value?.theme || value?.label || value);

export const saveThemeValue = value => {
  const rawValue = normalizeValue(value?.value ?? value?.id ?? value);

  return rawValue ? `/themes/${rawValue}` : null;
};

export const formatDomainTypeValue = value => normalizeValue(value).toUpperCase() || 'ERP';

export const saveDomainTypeValue = value => {
  const normalized = normalizeValue(value?.value ?? value).toUpperCase();

  return PEOPLE_DOMAIN_TYPES.includes(normalized) ? normalized : 'ERP';
};
