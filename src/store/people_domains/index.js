import * as defaultActions from '@controleonline/ui-default/src/store/default/actions';
import * as defaultGetters from '@controleonline/ui-default/src/store/default/getters';
import defaultMutations from '@controleonline/ui-default/src/store/default/mutations';
import { peopleDomainColumns } from './columns';
import * as customActions from './actions';
import * as customGetters from './getters';
import customMutations from './mutations';

export default {
  namespaced: true,
  state: {
    item: {},
    items: [],
    linkedItem: null,
    frontItems: [],
    server: null,
    testDomain: '',
    resourceEndpoint: 'people_domains',
    isLoading: false,
    isSaving: false,
    detailLoading: false,
    detailError: '',
    error: '',
    totalItems: 0,
    summary: {},
    filters: {},
    add: true,
    columns: peopleDomainColumns,
  },
  actions: {
    ...defaultActions,
    ...customActions,
  },
  getters: {
    ...defaultGetters,
    ...customGetters,
  },
  mutations: {
    ...defaultMutations,
    ...customMutations,
  },
};
