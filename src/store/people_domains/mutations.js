export default {
  SET_DETAIL_LOADING(state, value = true) {
    state.detailLoading = value === true;
    return 'detailLoading';
  },
  SET_DETAIL_ERROR(state, value) {
    state.detailError = String(value || '').trim();
    return 'detailError';
  },
  SET_LINKED_ITEM(state, value) {
    state.linkedItem = value || null;
    return 'linkedItem';
  },
  SET_FRONT_ITEMS(state, value) {
    state.frontItems = Array.isArray(value) ? value : [];
    return 'frontItems';
  },
  SET_SERVER(state, value) {
    state.server = value || null;
    return 'server';
  },
  SET_TEST_DOMAIN(state, value) {
    state.testDomain = String(value || '').trim();
    return 'testDomain';
  },
};
