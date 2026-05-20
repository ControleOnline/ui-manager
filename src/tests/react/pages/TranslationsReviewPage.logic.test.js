const assert = require('node:assert/strict');
const test = require('node:test');

const {
  normalizeLanguageCode,
  resolveActiveCompany,
  resolveInitialLanguage,
} = require('../../../react/pages/TranslationsReviewPage.logic');

test('resolveActiveCompany prefers the selected company', () => {
  const currentCompany = { id: 7, name: 'Atual' };
  const defaultCompany = { id: 3, name: 'Padrao' };

  assert.deepEqual(resolveActiveCompany(currentCompany, defaultCompany), currentCompany);
});

test('resolveActiveCompany falls back to the default company', () => {
  const defaultCompany = { id: 3, name: 'Padrao' };

  assert.deepEqual(resolveActiveCompany(null, defaultCompany), defaultCompany);
  assert.equal(resolveActiveCompany(null, null), null);
});

test('normalizeLanguageCode keeps language comparisons stable', () => {
  assert.equal(normalizeLanguageCode(' pt_BR '), 'pt-br');
  assert.equal(normalizeLanguageCode('en-us'), 'en-us');
  assert.equal(normalizeLanguageCode(''), '');
});

test('resolveInitialLanguage keeps the current language when it still exists', () => {
  const result = resolveInitialLanguage({
    previousLanguage: 'pt-br',
    languageItems: [
      { language: 'en-us' },
      { language: 'pt_BR' },
    ],
    configLanguage: 'es-es',
  });

  assert.equal(result, 'pt-br');
});

test('resolveInitialLanguage replaces a stale language with the first available option', () => {
  const result = resolveInitialLanguage({
    previousLanguage: 'fr-fr',
    languageItems: [
      { language: 'pt-br' },
      { language: 'en-us' },
    ],
    configLanguage: 'es-es',
  });

  assert.equal(result, 'pt-br');
});

test('resolveInitialLanguage uses config language when there is no current language', () => {
  const result = resolveInitialLanguage({
    previousLanguage: '',
    languageItems: [],
    configLanguage: 'es-es',
  });

  assert.equal(result, 'es-es');
});