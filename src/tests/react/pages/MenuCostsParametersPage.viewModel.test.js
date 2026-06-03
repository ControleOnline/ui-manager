/* global test */

const assert = require('node:assert/strict');

const {
  buildParameterCache,
  buildParameterRequestConfigs,
  isMethodNotAllowedError,
  resolveEffectiveConfigs,
  resolveParameterDraft,
} = require('@controleonline/ui-manager/src/react/pages/MenuCostsParametersPage/viewModel');

test('parameters view model resolves defaults when configs are empty', () => {
  const draft = resolveParameterDraft({});

  assert.equal(draft.markupPct, '200');
  assert.equal(draft.marginPct, '68');
  assert.equal(draft.monthlyUnits, '1200');
});

test('parameters view model keeps company configs and serializes save payloads', () => {
  const merged = resolveEffectiveConfigs(
    {
      'menu-costs-default-markup-pct': 215,
    },
    {
      'menu-costs-target-margin-pct': 72,
      'menu-costs-estimated-monthly-units': '1500',
    },
  );
  const draft = resolveParameterDraft(merged);
  const request = buildParameterRequestConfigs(draft);
  const cache = buildParameterCache(draft);

  assert.equal(draft.markupPct, '215');
  assert.equal(draft.marginPct, '72');
  assert.equal(draft.monthlyUnits, '1500');
  assert.deepEqual(
    request.map(item => item.configValue),
    ['215', '72', '1500'],
  );
  assert.deepEqual(cache, {
    'menu-costs-default-markup-pct': '215',
    'menu-costs-target-margin-pct': '72',
    'menu-costs-estimated-monthly-units': '1500',
  });
});

test('parameters view model detects method not allowed fallback', () => {
  assert.equal(
    isMethodNotAllowedError({
      response: { status: 405 },
    }),
    true,
  );
  assert.equal(
    isMethodNotAllowedError({
      message: 'Method not allowed',
    }),
    true,
  );
});
