export const items = state => (Array.isArray(state.items) ? state.items : []);
export const isLoading = state => state.isLoading === true;
export const isSaving = state => state.isSaving === true;
export const error = state => String(state.error || '').trim();
