import {
  createEmptyDraft,
  draftStorageKey,
  loadDraft,
  saveDraft,
  clearDraft,
} from '../../../../react/pages/onboarding/onboardingDraft';

describe('onboardingDraft isolation', () => {
  const store = {};
  beforeAll(() => {
    global.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => {
        store[k] = String(v);
      },
      removeItem: (k) => {
        delete store[k];
      },
    };
  });

  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
  });

  test('keys are isolated by company and user', () => {
    expect(draftStorageKey(1, 'a')).not.toBe(draftStorageKey(2, 'a'));
    expect(draftStorageKey(1, 'a')).not.toBe(draftStorageKey(1, 'b'));
  });

  test('save and load round-trip', () => {
    const draft = createEmptyDraft();
    draft.establishment.name = 'Loja A';
    draft.operations.salon = true;
    saveDraft(1, 'u1', draft);
    const loaded = loadDraft(1, 'u1');
    expect(loaded.establishment.name).toBe('Loja A');
    expect(loaded.operations.salon).toBe(true);
  });

  test('other company does not see draft', () => {
    const draft = createEmptyDraft();
    draft.establishment.name = 'Secret';
    saveDraft(1, 'u1', draft);
    expect(loadDraft(2, 'u1').establishment.name).toBe('');
  });

  test('clearDraft removes only that key', () => {
    saveDraft(1, 'u1', { ...createEmptyDraft(), step: 3 });
    saveDraft(1, 'u2', { ...createEmptyDraft(), step: 2 });
    clearDraft(1, 'u1');
    expect(loadDraft(1, 'u1').step).toBe(0);
    expect(loadDraft(1, 'u2').step).toBe(2);
  });
});
