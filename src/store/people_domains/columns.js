import {
  PEOPLE_DOMAIN_TYPES,
  formatApiPeopleDomainValue,
  formatDomainTypeValue,
  formatPeopleValue,
  formatThemeValue,
  saveApiPeopleDomainValue,
  saveDomainTypeValue,
  savePeopleValue,
  saveThemeValue,
} from './formatters';

const domainTypeOptions = PEOPLE_DOMAIN_TYPES.map(value => ({
  value,
  label: value === 'SHOP' ? 'Loja' : value === 'APP' ? 'App' : value === 'WEBSITE' ? 'Website' : value,
}));

export const peopleDomainColumns = [
  {
    editable: false,
    isIdentity: true,
    sortable: true,
    name: 'id',
    align: 'left',
    label: 'ID',
    format: value => `#${value}`,
  },
  {
    editable: true,
    sortable: true,
    name: 'domain',
    align: 'left',
    label: 'Domínio',
    format: value => String(value ?? '').trim(),
  },
  {
    editable: true,
    sortable: true,
    name: 'domainType',
    align: 'left',
    label: 'Tipo',
    defaultValue: 'ERP',
    list: domainTypeOptions,
    format: formatDomainTypeValue,
    saveFormat: saveDomainTypeValue,
  },
  {
    editable: true,
    sortable: true,
    name: 'people',
    align: 'left',
    label: 'Empresa',
    list: 'people/getItems',
    searchParam: 'alias',
    listRequestParams: ({ currentCompanyId }) =>
      currentCompanyId ? { id: currentCompanyId } : { peopleType: 'J' },
    formatList: item => ({
      value: item?.id,
      label: String(item?.alias || item?.name || `Pessoa ${item?.id || ''}`).trim(),
    }),
    format: formatPeopleValue,
    saveFormat: savePeopleValue,
  },
  {
    editable: true,
    sortable: true,
    name: 'theme',
    align: 'left',
    label: 'Tema',
    list: 'themes/getItems',
    searchParam: 'theme',
    formatList: item => ({
      value: item?.id,
      label: String(item?.theme || `Tema ${item?.id || ''}`).trim(),
    }),
    format: formatThemeValue,
    saveFormat: saveThemeValue,
  },
  {
    editable: true,
    sortable: true,
    name: 'apiPeopleDomain',
    align: 'left',
    label: 'API vinculada',
    list: 'people_domains_api/getItems',
    listRequestParams: ({ requestParams }) => ({
      ...(requestParams?.people ? { people: requestParams.people } : {}),
      domainType: 'API',
    }),
    searchParam: 'domain',
    formatList: item => ({
      value: item?.id,
      label: String(item?.domain || item?.apiPeopleDomainLabel || `Domínio ${item?.id || ''}`).trim(),
    }),
    format: formatApiPeopleDomainValue,
    saveFormat: saveApiPeopleDomainValue,
  },
];
