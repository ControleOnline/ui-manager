export const detailLoading = state => state.detailLoading === true;
export const detailError = state => state.detailError || '';
export const linkedItem = state => state.linkedItem || null;
export const frontItems = state => (Array.isArray(state.frontItems) ? state.frontItems : []);
export const server = state => state.server || null;
export const testDomain = state => String(state.testDomain || '').trim();
