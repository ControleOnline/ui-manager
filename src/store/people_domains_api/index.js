import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';

export default {
  namespaced: true,
  state: {
    item: {},
    items: [],
    resourceEndpoint: 'people_domains',
    isLoading: false,
    isSaving: false,
    error: '',
    totalItems: 0,
    summary: {},
    filters: {},
    columns: [],
  },
  actions,
  getters,
  mutations,
};
