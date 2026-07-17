import * as defaultActions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';
import {cronJobColumns} from './columns';

export default {
  namespaced: true,
  state: {
    item: {},
    items: [],
    resourceEndpoint: 'cron_jobs',
    isLoading: false,
    isSaving: false,
    error: '',
    totalItems: 0,
    summary: {},
    filters: {},
    add: true,
    columns: cronJobColumns,
  },
  actions: defaultActions,
  getters,
  mutations,
};
