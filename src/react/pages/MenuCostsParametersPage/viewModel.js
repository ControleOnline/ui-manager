export const MENU_COSTS_PARAMETER_CONFIG_KEYS = {
  markupPct: 'menu-costs-default-markup-pct',
  marginPct: 'menu-costs-target-margin-pct',
  monthlyUnits: 'menu-costs-estimated-monthly-units',
};

export const MENU_COSTS_PARAMETER_DEFAULTS = {
  markupPct: 200,
  marginPct: 68,
  monthlyUnits: 1200,
};

const isPlainObject = value =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export const normalizeNumericValue = (value, fallback) => {
  const normalized = Number.parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(normalized) ? normalized : Number(fallback || 0);
};

export const normalizeTextValue = (value, fallback) => {
  const normalized = String(value ?? '').trim();
  return normalized !== '' ? normalized : String(fallback ?? '');
};

export const resolveEffectiveConfigs = (companyConfigs, currentCompanyConfigs) => {
  const mergedConfigs = {
    ...(isPlainObject(currentCompanyConfigs) ? currentCompanyConfigs : {}),
    ...(isPlainObject(companyConfigs) ? companyConfigs : {}),
  };

  return mergedConfigs;
};

export const resolveParameterDraft = configs => ({
  markupPct: normalizeTextValue(
    configs?.[MENU_COSTS_PARAMETER_CONFIG_KEYS.markupPct],
    MENU_COSTS_PARAMETER_DEFAULTS.markupPct,
  ),
  marginPct: normalizeTextValue(
    configs?.[MENU_COSTS_PARAMETER_CONFIG_KEYS.marginPct],
    MENU_COSTS_PARAMETER_DEFAULTS.marginPct,
  ),
  monthlyUnits: normalizeTextValue(
    configs?.[MENU_COSTS_PARAMETER_CONFIG_KEYS.monthlyUnits],
    MENU_COSTS_PARAMETER_DEFAULTS.monthlyUnits,
  ),
});

export const buildParameterRequestConfigs = draft => [
  {
    configKey: MENU_COSTS_PARAMETER_CONFIG_KEYS.markupPct,
    configValue: JSON.stringify(
      normalizeNumericValue(
        draft?.markupPct,
        MENU_COSTS_PARAMETER_DEFAULTS.markupPct,
      ),
    ),
  },
  {
    configKey: MENU_COSTS_PARAMETER_CONFIG_KEYS.marginPct,
    configValue: JSON.stringify(
      normalizeNumericValue(
        draft?.marginPct,
        MENU_COSTS_PARAMETER_DEFAULTS.marginPct,
      ),
    ),
  },
  {
    configKey: MENU_COSTS_PARAMETER_CONFIG_KEYS.monthlyUnits,
    configValue: JSON.stringify(
      normalizeNumericValue(
        draft?.monthlyUnits,
        MENU_COSTS_PARAMETER_DEFAULTS.monthlyUnits,
      ),
    ),
  },
];

export const buildParameterCache = draft => ({
  [MENU_COSTS_PARAMETER_CONFIG_KEYS.markupPct]: String(
    normalizeNumericValue(
      draft?.markupPct,
      MENU_COSTS_PARAMETER_DEFAULTS.markupPct,
    ),
  ),
  [MENU_COSTS_PARAMETER_CONFIG_KEYS.marginPct]: String(
    normalizeNumericValue(
      draft?.marginPct,
      MENU_COSTS_PARAMETER_DEFAULTS.marginPct,
    ),
  ),
  [MENU_COSTS_PARAMETER_CONFIG_KEYS.monthlyUnits]: String(
    normalizeNumericValue(
      draft?.monthlyUnits,
      MENU_COSTS_PARAMETER_DEFAULTS.monthlyUnits,
    ),
  ),
});

export const resolveErrorMessage = error =>
  String(
    error?.response?.data?.['hydra:description'] ||
      error?.response?.data?.message ||
      error?.detail ||
      error?.message ||
      'Não foi possível salvar os parâmetros.',
  );

export const isMethodNotAllowedError = error => {
  const status = Number(
    error?.status || error?.response?.status || error?.data?.status || 0,
  );

  if (status === 405) {
    return true;
  }

  const details = String(
    error?.detail || error?.message || JSON.stringify(error || {}),
  ).toLowerCase();

  return details.includes('method not allowed') || details.includes('405');
};
