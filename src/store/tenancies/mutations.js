export default {
  SET_ITEMS(state, items = []) {
    state.items = Array.isArray(items) ? items : [];
    return 'items';
  },
  UPSERT_ITEM(state, item = {}) {
    const id = String(item?.id || '');
    if (!id) {
      return 'items';
    }

    const currentItems = Array.isArray(state.items) ? state.items : [];
    const index = currentItems.findIndex(currentItem => String(currentItem?.id || '') === id);
    if (index >= 0) {
      state.items = currentItems.map((currentItem, currentIndex) =>
        currentIndex === index ? item : currentItem,
      );
    } else {
      state.items = [item, ...currentItems];
    }

    return 'items';
  },
  SET_LOADING(state, value = true) {
    state.isLoading = value === true;
    return 'isLoading';
  },
  SET_SAVING(state, value = true) {
    state.isSaving = value === true;
    return 'isSaving';
  },
  SET_ERROR(state, value = '') {
    state.error = String(value || '').trim();
    return 'error';
  },
};
