/**
 * Local-only onboarding draft (no ERP persistence).
 * Isolated by companyId + userId in localStorage.
 */

const STORAGE_PREFIX = 'co.onboarding.draft.v1';

export function draftStorageKey(companyId, userId) {
  return `${STORAGE_PREFIX}:${companyId ?? 'none'}:${userId ?? 'anon'}`;
}

export function createEmptyDraft() {
  return {
    version: 1,
    step: 0,
    establishment: {
      name: '',
      responsible: '',
      zDay: '',
    },
    activity: {
      structure: '',
      notes: '',
    },
    operations: {
      salon: false,
      counter: false,
      pickup: false,
      deliveryOwn: false,
      deliveryThird: false,
      pcp: false,
    },
    floor: {
      tables: false,
      tabs: false,
      waiters: false,
      tabletOnTable: false,
    },
    team: {
      notes: '',
      devicesInventory: '',
    },
    catalog: {
      menuSource: '',
      salesChannels: [],
    },
    updatedAt: null,
  };
}

export function loadDraft(companyId, userId) {
  try {
    if (typeof localStorage === 'undefined') return createEmptyDraft();
    const raw = localStorage.getItem(draftStorageKey(companyId, userId));
    if (!raw) return createEmptyDraft();
    const parsed = JSON.parse(raw);
    return { ...createEmptyDraft(), ...parsed, operations: { ...createEmptyDraft().operations, ...(parsed.operations || {}) }, floor: { ...createEmptyDraft().floor, ...(parsed.floor || {}) }, establishment: { ...createEmptyDraft().establishment, ...(parsed.establishment || {}) }, activity: { ...createEmptyDraft().activity, ...(parsed.activity || {}) }, team: { ...createEmptyDraft().team, ...(parsed.team || {}) }, catalog: { ...createEmptyDraft().catalog, ...(parsed.catalog || {}) } };
  } catch {
    return createEmptyDraft();
  }
}

export function saveDraft(companyId, userId, draft) {
  try {
    if (typeof localStorage === 'undefined') return false;
    const payload = { ...draft, updatedAt: new Date().toISOString() };
    localStorage.setItem(draftStorageKey(companyId, userId), JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(companyId, userId) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(draftStorageKey(companyId, userId));
  } catch {
    /* ignore */
  }
}
