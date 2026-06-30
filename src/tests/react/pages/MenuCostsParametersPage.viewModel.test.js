/* global test */

const assert = require('node:assert/strict');

const {
  buildCostEngineRulesCache,
  buildCostEngineRulesRequestConfig,
  buildParameterCache,
  buildParameterRequestConfigs,
  isMethodNotAllowedError,
  resolveCostEngineRulesFromConfigs,
  resolveEffectiveConfigs,
  resolveMenuCostsSettingsFromConfigs,
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

test('parameters view model resolves official cost engine rules config', () => {
  const rules = {
    channels: [
      {
        id: 'marketplace',
        name: 'Marketplace',
        marginPct: '32',
        feePct: '3',
        commissionPct: '27',
        taxPct: '4',
        passThroughAmount: '1.5',
        roundingMode: 'up_99',
      },
    ],
  };
  const request = buildCostEngineRulesRequestConfig(rules);
  const cache = buildCostEngineRulesCache(rules);
  const resolvedRules = resolveCostEngineRulesFromConfigs(cache);
  const settings = resolveMenuCostsSettingsFromConfigs({
    ...cache,
    'menu-costs-default-markup-pct': '220',
    'menu-costs-target-margin-pct': '65',
    'menu-costs-estimated-monthly-units': '1800',
  });

  assert.equal(request.configKey, 'menu-costs-cost-engine-rules');
  assert.equal(resolvedRules.channels[0].marginPct, 32);
  assert.equal(resolvedRules.channels[0].commissionPct, 27);
  assert.equal(resolvedRules.channels[0].roundingMode, 'up_99');
  assert.equal(settings.defaultMarkupPct, 220);
  assert.equal(settings.targetMarginPct, 65);
  assert.equal(settings.monthlyUnits, 1800);
  assert.equal(settings.costEngineRules.channels[0].passThroughAmount, 1.5);
});
