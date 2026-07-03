import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import { api } from '@controleonline/ui-common/src/api';
import useToastMessage from '@controleonline/ui-crm/src/react/hooks/useToastMessage';
import { resolveThemePalette, withOpacity } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import styles from './ThemeManagerPage.styles';

const COLOR_PRESETS = [
  '#0F172A',
  '#1D4ED8',
  '#2563EB',
  '#0EA5E9',
  '#14B8A6',
  '#10b981',
  '#84CC16',
  '#EAB308',
  '#F97316',
  '#c10015',
  '#EC4899',
  '#8B5CF6',
  '#FFFFFF',
  '#F8FAFC',
  '#E2E8F0',
  '#64748B',
];

const DEFAULT_THEME_FIELDS = [
  { key: 'primary', label: 'Primaria', helper: 'Botoes principais e destaques.' },
  { key: 'secondary', label: 'Secundaria', helper: 'Apoio visual e variacoes.' },
  { key: 'background', label: 'Fundo', helper: 'Plano principal das telas.' },
  { key: 'text', label: 'Texto', helper: 'Titulos e conteudo principal.' },
  { key: 'textSecondary', label: 'Texto secundario', helper: 'Legendas e informacoes de apoio.' },
  { key: 'border', label: 'Borda', helper: 'Linhas, contornos e divisores.' },
];

const DEFAULT_THEME_FIELD_MAP = Object.fromEntries(
  DEFAULT_THEME_FIELDS.map(field => [field.key, field]),
);

const AUTO_GENERATED_ALIAS_KEYS = new Set([
  'q-primary',
  'btn-primary',
  'q-btn-primary',
  'header-primary',
  'q-header-primary',
  'q-secondary',
  'q-bg-light',
  'q-bg-headers-light',
  'text-primary',
  'q-text-primary',
  'text-headers-light',
  'q-text-headers-light',
  'text-secondary',
  'q-text-secondary',
  'bg-even-light',
  'q-bg-even-light',
]);

const LEGACY_THEME_KEYS = [
  'info',
  'accent',
  'bg-dark',
  'primary',
  'bg-light',
  'negative',
  'positive',
  'secondary',
  'bg-odd-dark',
  'btn-primary',
  'bg-even-dark',
  'bg-menu-dark',
  'bg-odd-light',
  'text-primary',
  'bg-even-light',
  'bg-menu-light',
  'text-menu-dark',
  'text-secondary',
  'bg-headers-dark',
  'text-menu-light',
  'bg-headers-light',
  'text-headers-dark',
  'text-headers-light',
  'bg-menu-avatar-dark',
  'bg-menu-avatar-light',
  'scrollbar-thumb-dark',
  'scrollbar-track-dark',
  'scrollbar-thumb-light',
  'scrollbar-track-light',
  'scrollbar-thumb-hover-dark',
  'scrollbar-thumb-hover-light',
  'success',
  'warning',
  'error',
];

const LEGACY_THEME_KEY_SET = new Set(LEGACY_THEME_KEYS);

const COLOR_HINTS = {
  primary: 'cor principal da interface',
  secondary: 'cor secundaria de apoio',
  background: 'fundo principal das telas',
  text: 'texto principal da interface',
  textSecondary: 'texto secundario e legendas',
  border: 'bordas e divisores',
  info: 'informacoes e destaques leves',
  accent: 'acentos visuais e chamadas',
  warning: 'avisos e estados de atencao',
  negative: 'erros e estados negativos',
  positive: 'sucesso e estados positivos',
  'bg-dark': 'fundo escuro principal',
  'bg-light': 'fundo claro principal',
  'bg-menu-light': 'fundo claro do menu',
  'bg-menu-dark': 'fundo escuro de menu',
  'bg-odd-light': 'fundo claro de linhas impares',
  'bg-odd-dark': 'fundo escuro de linhas impares',
  'bg-even-dark': 'fundo escuro de linhas pares',
  'bg-headers-light': 'fundo claro de cabecalhos',
};

const THEME_REFERENCE_GROUPS = [
  {
    label: 'estrutura da tela',
    tokens: [
      'appBackground',
      'containerBackground',
      'containerTransparentBackground',
      'containerBorder',
      'pageBackground',
      'pageBorder',
      'panelBackground',
      'panelBorder',
      'screenBackground',
      'sectionBackground',
      'sectionBorder',
      'sheetBackground',
      'sheetBorder',
      'surface',
    ],
  },
  {
    label: 'barra',
    tokens: [
      'navbarBackground',
      'navbarBorder',
      'tabBarBackground',
      'tabBarBorder',
      'toolbarBackground',
      'toolbarBorder',
    ],
  },
  {
    label: 'badge',
    tokens: [
      'badgeBackground',
      'badgeBorder',
      'badgeDisabledBackground',
      'badgeDisabledText',
      'badgeIcon',
      'badgeSelectedBackground',
      'badgeSelectedBorder',
      'badgeSelectedText',
      'badgeShadow',
      'badgeText',
    ],
  },
  {
    label: 'button',
    tokens: [
      'buttonBackground',
      'buttonBackgroundSecondary',
      'buttonBorder',
      'buttonBorderSecondary',
      'buttonDisabledBackground',
      'buttonDisabledOpacity',
      'buttonDisabledText',
      'buttonFocusBorder',
      'buttonHoverBackground',
      'buttonIcon',
      'buttonIconSecondary',
      'buttonPressedBackground',
      'buttonShadow',
      'buttonText',
      'buttonTextSecondary',
    ],
  },
  {
    label: 'card',
    tokens: [
      'cardBackground',
      'cardBorder',
      'cardDisabledBackground',
      'cardDisabledText',
      'cardHeaderBackground',
      'cardHeaderText',
      'cardIcon',
      'cardSelectedBackground',
      'cardSelectedBorder',
      'cardSelectedText',
      'cardShadow',
      'cardText',
    ],
  },
  {
    label: 'checkbox',
    tokens: [
      'checkboxBackground',
      'checkboxBorder',
      'checkboxDisabledBackground',
      'checkboxDisabledBorder',
      'checkboxDisabledMark',
      'checkboxSelectedBackground',
      'checkboxSelectedBorder',
      'checkboxSelectedMark',
      'checkboxText',
    ],
  },
  {
    label: 'chip',
    tokens: [
      'chipBackground',
      'chipBorder',
      'chipDisabledBackground',
      'chipDisabledText',
      'chipIcon',
      'chipSelectedBackground',
      'chipSelectedBorder',
      'chipSelectedText',
      'chipShadow',
      'chipText',
    ],
  },
  {
    label: 'divider',
    tokens: ['dividerBackground', 'dividerBorder', 'dividerText'],
  },
  {
    label: 'footer',
    tokens: [
      'footerBackground',
      'footerBorder',
      'footerIcon',
      'footerLink',
      'footerText',
    ],
  },
  {
    label: 'header',
    tokens: [
      'headerBackground',
      'headerBorder',
      'headerIcon',
      'headerLink',
      'headerText',
    ],
  },
  {
    label: 'icon',
    tokens: [
      'iconColor',
      'iconActive',
      'iconDanger',
      'iconDisabled',
      'iconInfo',
      'iconInverse',
      'iconMuted',
      'iconSuccess',
      'iconText',
      'iconWarning',
    ],
  },
  {
    label: 'input',
    tokens: [
      'inputBackground',
      'inputBorder',
      'inputFilledBorder',
      'inputDisabledBackground',
      'inputDisabledBorder',
      'inputDisabledText',
      'inputErrorBackground',
      'inputErrorBorder',
      'inputErrorText',
      'inputFocusBorder',
      'inputIcon',
      'inputPlaceholderText',
      'inputText',
    ],
  },
  {
    label: 'link',
    tokens: ['linkDisabledText', 'linkHoverText', 'linkText', 'linkVisitedText'],
  },
  {
    label: 'listItem',
    tokens: [
      'listItemActiveBackground',
      'listItemActiveBorder',
      'listItemBackground',
      'listItemBorder',
      'listItemDisabledText',
      'listItemIcon',
      'listItemSelectedBackground',
      'listItemSelectedBorder',
      'listItemSubtitleText',
      'listItemText',
    ],
  },
  {
    label: 'loading',
    tokens: [
      'loadingBackground',
      'loadingBorder',
      'loadingDisabledBackground',
      'loadingDisabledText',
      'loadingIcon',
      'loadingOverlay',
      'loadingShadow',
      'loadingSpinner',
      'loadingText',
    ],
  },
  {
    label: 'menu',
    tokens: [
      'menuActiveBackground',
      'menuActiveBorder',
      'menuActiveIcon',
      'menuActiveText',
      'menuBackground',
      'menuBorder',
      'menuDisabledBackground',
      'menuDisabledBorder',
      'menuDisabledIcon',
      'menuDisabledText',
      'menuIcon',
      'menuSelectedBackground',
      'menuSelectedBorder',
      'menuSelectedText',
      'menuShadow',
      'menuText',
    ],
  },
  {
    label: 'modal',
    tokens: [
      'modalBackground',
      'modalBorder',
      'modalCloseIcon',
      'modalHeaderText',
      'modalOverlay',
      'modalShadow',
      'modalText',
    ],
  },
  {
    label: 'select',
    tokens: [
      'selectBackground',
      'selectBorder',
      'selectIcon',
      'selectOptionBackground',
      'selectOptionBorder',
      'selectOptionSelectedBackground',
      'selectOptionSelectedText',
      'selectPlaceholderText',
      'selectText',
    ],
  },
  {
    label: 'navigation',
    tokens: [
      'navigationActiveBackground',
      'navigationActiveBorder',
      'navigationActiveIcon',
      'navigationActiveText',
      'navigationBackground',
      'navigationBorder',
      'navigationDisabledBackground',
      'navigationDisabledBorder',
      'navigationDisabledIcon',
      'navigationDisabledText',
      'navigationIcon',
      'navigationShadow',
      'navigationText',
    ],
  },
  {
    label: 'overlay',
    tokens: ['overlayBackground', 'overlayBorder', 'overlayShadow'],
  },
  {
    label: 'radio',
    tokens: [
      'radioBackground',
      'radioBorder',
      'radioDisabledBackground',
      'radioDisabledBorder',
      'radioDisabledDot',
      'radioSelectedBackground',
      'radioSelectedBorder',
      'radioSelectedDot',
      'radioText',
    ],
  },
  {
    label: 'switch',
    tokens: [
      'switchBorder',
      'switchDisabledThumb',
      'switchDisabledTrack',
      'switchFocusBorder',
      'switchOffThumb',
      'switchOffTrack',
      'switchOnThumb',
      'switchOnTrack',
    ],
  },
  {
    label: 'text',
    tokens: [
      'textDanger',
      'textDisabled',
      'textInverse',
      'textLink',
      'textMuted',
      'textPlaceholder',
      'textPrimary',
      'textSecondary',
      'textSuccess',
      'textWarning',
    ],
  },
  {
    label: 'toast',
    tokens: [
      'toastBackground',
      'toastBorder',
      'toastDangerBackground',
      'toastDangerBorder',
      'toastDangerIcon',
      'toastDangerText',
      'toastIcon',
      'toastInfoBackground',
      'toastInfoBorder',
      'toastInfoIcon',
      'toastInfoText',
      'toastShadow',
      'toastSuccessBackground',
      'toastSuccessBorder',
      'toastSuccessIcon',
      'toastSuccessText',
      'toastText',
      'toastWarningBackground',
      'toastWarningBorder',
      'toastWarningIcon',
      'toastWarningText',
    ],
  },
];

const THEME_PREVIEW_GROUPS = [
  {
    label: 'tokens base',
    tokens: [
      'background',
      'border',
      'googleLoading',
      'placeholderText',
      'shadow',
      'surface',
      'textPrimary',
      'textSecondary',
    ],
  },
  ...THEME_REFERENCE_GROUPS,
];

const UNIQUE_THEME_PREVIEW_GROUPS = (() => {
  const seenTokens = new Set();

  return THEME_PREVIEW_GROUPS.map(group => ({
    ...group,
    tokens: group.tokens.filter(token => {
      if (seenTokens.has(token)) return false;
      seenTokens.add(token);
      return true;
    }),
  })).filter(group => group.tokens.length > 0);
})();

const THEME_REFERENCE_TOKENS = Array.from(
  new Set(THEME_REFERENCE_GROUPS.flatMap(group => group.tokens)),
);
const THEME_REFERENCE_TOKEN_SET = new Set(THEME_REFERENCE_TOKENS);
const THEME_REFERENCE_GROUP_MAP = THEME_REFERENCE_GROUPS.reduce((accumulator, group) => {
  group.tokens.forEach(token => {
    accumulator[token] = group.label;
  });
  return accumulator;
}, {});

const findTokenGroupLabel = tokenKey => {
  return THEME_REFERENCE_GROUP_MAP[tokenKey] || 'tokens base';
};

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const normalizeCollection = payload => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.member)) return payload.member;
  if (Array.isArray(payload['hydra:member'])) return payload['hydra:member'];
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.response?.data)) return payload.response.data;
  return [];
};

const normalizeThemeColors = themeColors => {
  if (!themeColors) return {};
  if (typeof themeColors === 'object' && !Array.isArray(themeColors)) return themeColors;
  if (typeof themeColors !== 'string') return {};

  try {
    const parsedColors = JSON.parse(themeColors);
    return parsedColors && typeof parsedColors === 'object' && !Array.isArray(parsedColors)
      ? parsedColors
      : {};
  } catch (error) {
    return {};
  }
};

const normalizeHex = value => {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!HEX_COLOR_REGEX.test(raw)) return null;
  if (raw.length === 4) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toUpperCase();
  }
  return raw.toUpperCase();
};

const getId = value => {
  if (value == null) return '';
  if (typeof value === 'object') {
    return String(value.id || value['@id'] || '').replace(/\D/g, '');
  }
  return String(value).replace(/\D/g, '');
};

const getIri = (value, resourceName = '') => {
  if (!value) return resourceName ? `/${resourceName}/` : '';
  if (typeof value === 'string') {
    return value.startsWith('/') ? value : resourceName ? `/${resourceName}/${getId(value)}` : value;
  }
  if (typeof value === 'object' && typeof value['@id'] === 'string') {
    return value['@id'];
  }
  const id = getId(value);
  return id && resourceName ? `/${resourceName}/${id}` : '';
};

const formatApiError = error => {
  if (typeof error === 'string') return error;
  if (Array.isArray(error?.message)) {
    return error.message.map(item => item?.message || item).join('\n');
  }
  if (Array.isArray(error?.violations)) {
    return error.violations.map(item => item?.message || item?.propertyPath).join('\n');
  }
  return error?.message || error?.description || 'Nao foi possivel salvar o tema.';
};

const getReadableTextColor = color => {
  const normalized = normalizeHex(color);
  if (!normalized) return '#111111';

  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  const luminance = (red * 0.299) + (green * 0.587) + (blue * 0.114);

  return luminance > 168 ? '#111111' : '#FFFFFF';
};

const resolveColorHintKey = key => {
  if (COLOR_HINTS[key]) return key;
  if (key.startsWith('q-') && COLOR_HINTS[key.slice(2)]) return key.slice(2);
  return null;
};

const formatColorHint = key => {
  const resolvedKey = resolveColorHintKey(key);
  if (resolvedKey) return COLOR_HINTS[resolvedKey];
  return `chave de cor "${key}"`;
};

const pickThemeColor = (themeColors = {}, fallbackValue = '', keys = []) => {
  for (const key of keys) {
    const normalized = normalizeHex(themeColors?.[key]);
    if (normalized) return normalized;
  }
  return normalizeHex(fallbackValue) || '#000000';
};

const buildNewThemeDraft = fallbackPalette => ({
  primary: normalizeHex(fallbackPalette.primary) || '#2563EB',
  secondary: normalizeHex(fallbackPalette.secondary) || '#0F172A',
  background: normalizeHex(fallbackPalette.background) || '#F8FAFC',
  text: normalizeHex(fallbackPalette.text) || '#0F172A',
  textSecondary: normalizeHex(fallbackPalette.textSecondary) || '#64748B',
  border: normalizeHex(fallbackPalette.border) || '#E2E8F0',
});

const buildEditableDraft = (themeColors = {}, fallbackPalette = colors) => {
  const filteredEntries = Object.entries(normalizeThemeColors(themeColors))
    .map(([key, value]) => [key, normalizeHex(value)])
    .filter(([key, value]) => Boolean(value) && !AUTO_GENERATED_ALIAS_KEYS.has(key))
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

  if (filteredEntries.length === 0) {
    return buildNewThemeDraft(fallbackPalette);
  }

  return Object.fromEntries(filteredEntries);
};

const buildThemeColorsPayload = draft => {
  return Object.fromEntries(
    Object.entries(draft || {})
      .map(([key, value]) => [String(key).trim(), normalizeHex(value)])
      .filter(([key, value]) => Boolean(key) && Boolean(value) && !AUTO_GENERATED_ALIAS_KEYS.has(key)),
  );
};

const buildDuplicateName = (baseName, themes = []) => {
  const normalizedBase = String(baseName || 'TEMA').trim() || 'TEMA';
  const existingNames = new Set(
    themes.map(item => String(item?.theme || '').trim().toUpperCase()).filter(Boolean),
  );

  let attempt = `${normalizedBase} COPY`;
  let counter = 2;
  while (existingNames.has(attempt.toUpperCase())) {
    attempt = `${normalizedBase} COPY ${counter}`;
    counter += 1;
  }

  return attempt;
};

const buildThemeColumns = themeColors => {
  const rawEntries = Object.entries(normalizeThemeColors(themeColors))
    .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
    .filter(([key]) => Boolean(key) && !AUTO_GENERATED_ALIAS_KEYS.has(key))
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

  const rawMap = Object.fromEntries(rawEntries);

  const legacyEntries = rawEntries
    .filter(([key]) => !THEME_REFERENCE_TOKEN_SET.has(key))
    .map(([key, value]) => ({
    key,
      value,
      isUnexpected: !LEGACY_THEME_KEY_SET.has(key),
    }));

  const newEntries = THEME_REFERENCE_TOKENS.map(key => ({
      key,
      value: rawMap[key] ?? '',
      groupLabel: findTokenGroupLabel(key),
    }));

  const previewGroups = UNIQUE_THEME_PREVIEW_GROUPS.map(group => ({
    ...group,
    filledCount: group.tokens.filter(token => Boolean(normalizeHex(themeColors?.[token]))).length,
  }));

  const newEntriesByGroup = previewGroups.reduce((accumulator, group) => {
    const groupEntries = newEntries.filter(item => item.groupLabel === group.label);
    if (groupEntries.length > 0) accumulator[group.label] = groupEntries;
    return accumulator;
  }, {});

  return {
    legacyEntries,
    newEntries,
    newEntriesByGroup,
    newCount: newEntries.length,
    previewGroups,
  };
};

const buildEditorField = key => ({
  key,
  label: DEFAULT_THEME_FIELD_MAP[key]?.label || key,
  helper: DEFAULT_THEME_FIELD_MAP[key]?.helper || formatColorHint(key),
});

const getPreviewColor = (themeColors, keys, fallbackValue) => {
  return pickThemeColor(themeColors, fallbackValue, Array.isArray(keys) ? keys : [keys]);
};

const renderGenericPreview = (group, themeColors) => {
  return (
    <View style={styles.previewTokenGrid}>
      {group.tokens.slice(0, 6).map(token => {
        const colorValue = normalizeHex(themeColors?.[token]);

        return (
          <View key={`${group.label}-${token}`} style={styles.previewTokenCard}>
            <View
              style={[
                styles.previewTokenSwatch,
                colorValue
                  ? {
                    backgroundColor: colorValue,
                    borderColor: withOpacity(getReadableTextColor(colorValue), 0.18),
                  }
                  : styles.previewTokenSwatchEmpty,
              ]}
            />
            <Text numberOfLines={1} style={styles.previewTokenLabel}>
              {token}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const renderThemeObjectPreview = (group, themeColors) => {
  const sectionBackground = getPreviewColor(themeColors, ['sectionBackground', 'surface', 'background'], '#F8FAFC');
  const sectionBorder = getPreviewColor(themeColors, ['sectionBorder', 'border'], '#E2E8F0');
  const textPrimary = getPreviewColor(themeColors, ['textPrimary', 'text'], '#0F172A');
  const textSecondary = getPreviewColor(themeColors, ['textSecondary', 'placeholderText'], '#64748B');

  switch (group.label) {
    case 'button': {
      const primaryBackground = getPreviewColor(themeColors, ['buttonBackground', 'primary'], '#2563EB');
      const primaryBorder = getPreviewColor(themeColors, ['buttonBorder', 'primary'], primaryBackground);
      const primaryText = getPreviewColor(themeColors, ['buttonText', 'textInverse'], getReadableTextColor(primaryBackground));
      const secondaryBackground = getPreviewColor(themeColors, ['buttonBackgroundSecondary', 'surface', 'background'], '#FFFFFF');
      const secondaryBorder = getPreviewColor(themeColors, ['buttonBorderSecondary', 'buttonBorder', 'border'], '#CBD5E1');
      const secondaryText = getPreviewColor(themeColors, ['buttonTextSecondary', 'textPrimary', 'text'], '#0F172A');
      const disabledBackground = getPreviewColor(themeColors, ['buttonDisabledBackground'], '#E2E8F0');
      const disabledText = getPreviewColor(themeColors, ['buttonDisabledText', 'textDisabled'], '#94A3B8');

      return (
        <View style={styles.previewStack}>
          <View style={styles.previewRow}>
            <View style={[styles.previewButton, { backgroundColor: primaryBackground, borderColor: primaryBorder }]}>
              <Icon name="check" size={12} color={primaryText} />
              <Text style={[styles.previewButtonText, { color: primaryText }]}>Primario</Text>
            </View>
            <View style={[styles.previewButton, { backgroundColor: secondaryBackground, borderColor: secondaryBorder }]}>
              <Text style={[styles.previewButtonText, { color: secondaryText }]}>Secundario</Text>
            </View>
          </View>
          <View style={[styles.previewButton, styles.previewButtonDisabled, { backgroundColor: disabledBackground, borderColor: disabledBackground }]}>
            <Text style={[styles.previewButtonText, { color: disabledText }]}>Desabilitado</Text>
          </View>
        </View>
      );
    }
    case 'icon': {
      const iconColor = getPreviewColor(themeColors, ['iconColor', 'iconText'], '#2563EB');
      const iconMuted = getPreviewColor(themeColors, ['iconMuted', 'textSecondary'], '#64748B');
      const iconDanger = getPreviewColor(themeColors, ['iconDanger', 'textDanger'], '#DC2626');
      const iconSuccess = getPreviewColor(themeColors, ['iconSuccess', 'textSuccess'], '#16A34A');

      return (
        <View style={styles.previewIconRow}>
          {[
            { name: 'star', color: iconColor },
            { name: 'settings', color: iconMuted },
            { name: 'alert-triangle', color: iconDanger },
            { name: 'check-circle', color: iconSuccess },
          ].map(item => (
            <View key={`${group.label}-${item.name}`} style={[styles.previewIconBubble, { backgroundColor: withOpacity(item.color, 0.12) }]}>
              <Icon name={item.name} size={16} color={item.color} />
            </View>
          ))}
        </View>
      );
    }
    case 'checkbox': {
      const checkboxBackground = getPreviewColor(themeColors, ['checkboxBackground', 'surface', 'background'], '#FFFFFF');
      const checkboxBorder = getPreviewColor(themeColors, ['checkboxBorder', 'border'], '#94A3B8');
      const checkboxSelectedBackground = getPreviewColor(themeColors, ['checkboxSelectedBackground', 'primary'], '#2563EB');
      const checkboxSelectedBorder = getPreviewColor(themeColors, ['checkboxSelectedBorder', 'primary'], checkboxSelectedBackground);
      const checkboxSelectedMark = getPreviewColor(themeColors, ['checkboxSelectedMark', 'textInverse'], '#FFFFFF');
      const checkboxDisabledBackground = getPreviewColor(themeColors, ['checkboxDisabledBackground'], '#E2E8F0');
      const checkboxDisabledBorder = getPreviewColor(themeColors, ['checkboxDisabledBorder'], '#CBD5E1');
      const checkboxText = getPreviewColor(themeColors, ['checkboxText', 'textPrimary', 'text'], '#0F172A');

      return (
        <View style={styles.previewStack}>
          <View style={styles.previewChoiceRow}>
            <View style={[styles.previewCheckbox, { backgroundColor: checkboxBackground, borderColor: checkboxBorder }]} />
            <Text style={[styles.previewChoiceText, { color: checkboxText }]}>Normal</Text>
          </View>
          <View style={styles.previewChoiceRow}>
            <View style={[styles.previewCheckbox, { backgroundColor: checkboxSelectedBackground, borderColor: checkboxSelectedBorder }]}>
              <Icon name="check" size={12} color={checkboxSelectedMark} />
            </View>
            <Text style={[styles.previewChoiceText, { color: checkboxText }]}>Selecionado</Text>
          </View>
          <View style={styles.previewChoiceRow}>
            <View style={[styles.previewCheckbox, { backgroundColor: checkboxDisabledBackground, borderColor: checkboxDisabledBorder }]} />
            <Text style={[styles.previewChoiceText, { color: textSecondary }]}>Desabilitado</Text>
          </View>
        </View>
      );
    }
    case 'header':
    case 'footer':
    case 'barra': {
      const barBackground = getPreviewColor(
        themeColors,
        group.label === 'footer'
          ? ['footerBackground', 'toolbarBackground', 'navbarBackground']
          : group.label === 'barra'
            ? ['toolbarBackground', 'navbarBackground', 'tabBarBackground']
            : ['headerBackground', 'toolbarBackground', 'navbarBackground'],
        '#0F172A',
      );
      const barBorder = getPreviewColor(
        themeColors,
        group.label === 'footer'
          ? ['footerBorder', 'toolbarBorder', 'navbarBorder']
          : group.label === 'barra'
            ? ['toolbarBorder', 'navbarBorder', 'tabBarBorder']
            : ['headerBorder', 'toolbarBorder', 'navbarBorder'],
        withOpacity(barBackground, 0.24),
      );
      const barText = getPreviewColor(
        themeColors,
        group.label === 'footer'
          ? ['footerText', 'footerLink', 'textInverse']
          : group.label === 'barra'
            ? ['headerText', 'footerText', 'textInverse']
            : ['headerText', 'headerLink', 'textInverse'],
        getReadableTextColor(barBackground),
      );

      return (
        <View style={[styles.previewBar, { backgroundColor: barBackground, borderColor: barBorder }]}>
          <View style={styles.previewBarSide}>
            <Icon name="menu" size={15} color={barText} />
            <Text style={[styles.previewBarTitle, { color: barText }]}>
              {group.label === 'footer' ? 'Footer' : group.label === 'barra' ? 'Barra' : 'Header'}
            </Text>
          </View>
          <View style={styles.previewBarSide}>
            <Icon name="bell" size={14} color={barText} />
            <Icon name="user" size={14} color={barText} />
          </View>
        </View>
      );
    }
    case 'card': {
      const cardBackground = getPreviewColor(themeColors, ['cardBackground', 'surface', 'background'], '#FFFFFF');
      const cardBorder = getPreviewColor(themeColors, ['cardBorder', 'border'], '#E2E8F0');
      const cardHeaderBackground = getPreviewColor(themeColors, ['cardHeaderBackground', 'sectionBackground'], '#F8FAFC');
      const cardHeaderText = getPreviewColor(themeColors, ['cardHeaderText', 'textPrimary', 'text'], '#0F172A');
      const cardText = getPreviewColor(themeColors, ['cardText', 'textPrimary', 'text'], '#0F172A');

      return (
        <View style={[styles.previewInnerCard, { backgroundColor: cardBackground, borderColor: cardBorder }]}>
          <View style={[styles.previewInnerCardHeader, { backgroundColor: cardHeaderBackground }]}>
            <Text style={[styles.previewInnerCardTitle, { color: cardHeaderText }]}>Resumo</Text>
            <Icon name="more-horizontal" size={14} color={cardHeaderText} />
          </View>
          <View style={styles.previewInnerCardContent}>
            <Text style={[styles.previewParagraph, { color: cardText }]}>
              Card com titulo, texto e estrutura visual do grupo.
            </Text>
          </View>
        </View>
      );
    }
    case 'chip':
    case 'badge': {
      const pillBackground = getPreviewColor(
        themeColors,
        group.label === 'chip' ? ['chipBackground', 'surface'] : ['badgeBackground', 'surface'],
        '#E2E8F0',
      );
      const pillBorder = getPreviewColor(
        themeColors,
        group.label === 'chip' ? ['chipBorder', 'border'] : ['badgeBorder', 'border'],
        pillBackground,
      );
      const pillText = getPreviewColor(
        themeColors,
        group.label === 'chip' ? ['chipText', 'textPrimary', 'text'] : ['badgeText', 'textPrimary', 'text'],
        '#0F172A',
      );
      const selectedBackground = getPreviewColor(
        themeColors,
        group.label === 'chip' ? ['chipSelectedBackground', 'primary'] : ['badgeSelectedBackground', 'primary'],
        '#2563EB',
      );
      const selectedText = getPreviewColor(
        themeColors,
        group.label === 'chip' ? ['chipSelectedText', 'textInverse'] : ['badgeSelectedText', 'textInverse'],
        '#FFFFFF',
      );

      return (
        <View style={styles.previewRowWrap}>
          <View style={[styles.previewPill, { backgroundColor: pillBackground, borderColor: pillBorder }]}>
            <Text style={[styles.previewPillText, { color: pillText }]}>Base</Text>
          </View>
          <View style={[styles.previewPill, { backgroundColor: selectedBackground, borderColor: selectedBackground }]}>
            <Text style={[styles.previewPillText, { color: selectedText }]}>Selecionado</Text>
          </View>
        </View>
      );
    }
    case 'input':
    case 'select': {
      const fieldBackground = getPreviewColor(
        themeColors,
        group.label === 'select' ? ['selectBackground', 'inputBackground', 'surface'] : ['inputBackground', 'surface', 'background'],
        '#FFFFFF',
      );
      const fieldBorder = getPreviewColor(
        themeColors,
        group.label === 'select' ? ['selectBorder', 'inputBorder', 'border'] : ['inputBorder', 'border'],
        '#CBD5E1',
      );
      const fieldText = getPreviewColor(
        themeColors,
        group.label === 'select' ? ['selectText', 'inputText', 'textPrimary', 'text'] : ['inputText', 'textPrimary', 'text'],
        '#0F172A',
      );
      const placeholderColor = getPreviewColor(
        themeColors,
        group.label === 'select' ? ['selectPlaceholderText', 'inputPlaceholderText', 'textSecondary'] : ['inputPlaceholderText', 'textSecondary'],
        '#94A3B8',
      );
      const focusBorder = getPreviewColor(themeColors, ['inputFocusBorder', 'selectOptionSelectedBackground', 'primary'], '#2563EB');
      const errorBorder = getPreviewColor(themeColors, ['inputErrorBorder', 'textDanger'], '#DC2626');

      return (
        <View style={styles.previewStack}>
          <View style={[styles.previewField, { backgroundColor: fieldBackground, borderColor: fieldBorder }]}>
            <Text style={[styles.previewFieldText, { color: placeholderColor }]}>
              {group.label === 'select' ? 'Selecione uma opcao' : 'Placeholder'}
            </Text>
            {group.label === 'select' ? <Icon name="chevron-down" size={14} color={placeholderColor} /> : null}
          </View>
          <View style={[styles.previewField, { backgroundColor: fieldBackground, borderColor: focusBorder }]}>
            <Text style={[styles.previewFieldText, { color: fieldText }]}>
              {group.label === 'select' ? 'Opcao ativa' : 'Valor preenchido'}
            </Text>
          </View>
          {group.label === 'input' ? (
            <View style={[styles.previewField, { backgroundColor: fieldBackground, borderColor: errorBorder }]}>
              <Text style={[styles.previewFieldText, { color: textSecondary }]}>Estado com erro</Text>
            </View>
          ) : null}
        </View>
      );
    }
    case 'link':
    case 'text': {
      const linkColor = getPreviewColor(themeColors, ['linkText', 'textLink', 'primary'], '#2563EB');
      const dangerColor = getPreviewColor(themeColors, ['textDanger'], '#DC2626');
      const successColor = getPreviewColor(themeColors, ['textSuccess'], '#16A34A');

      return (
        <View style={styles.previewStack}>
          <Text style={[styles.previewHeadline, { color: textPrimary }]}>Titulo principal</Text>
          <Text style={[styles.previewParagraph, { color: textSecondary }]}>
            Texto secundario para validar contraste e leitura.
          </Text>
          <View style={styles.previewRowWrap}>
            <Text style={[styles.previewInlineLink, { color: linkColor }]}>Link</Text>
            <Text style={[styles.previewInlineLink, { color: successColor }]}>Sucesso</Text>
            <Text style={[styles.previewInlineLink, { color: dangerColor }]}>Erro</Text>
          </View>
        </View>
      );
    }
    case 'listItem':
    case 'menu':
    case 'navigation': {
      const itemBackground = getPreviewColor(
        themeColors,
        group.label === 'listItem' ? ['listItemBackground', 'surface', 'background'] : ['menuBackground', 'navigationBackground', 'surface'],
        '#FFFFFF',
      );
      const itemBorder = getPreviewColor(
        themeColors,
        group.label === 'listItem' ? ['listItemBorder', 'border'] : ['menuBorder', 'navigationBorder', 'border'],
        '#E2E8F0',
      );
      const activeBackground = getPreviewColor(
        themeColors,
        group.label === 'listItem' ? ['listItemSelectedBackground', 'listItemActiveBackground', 'primary'] : ['menuActiveBackground', 'navigationActiveBackground', 'primary'],
        '#DBEAFE',
      );
      const itemText = getPreviewColor(
        themeColors,
        group.label === 'listItem' ? ['listItemText', 'textPrimary', 'text'] : ['menuText', 'navigationText', 'textPrimary', 'text'],
        '#0F172A',
      );
      const activeText = getPreviewColor(
        themeColors,
        group.label === 'listItem' ? ['listItemText', 'textPrimary'] : ['menuActiveText', 'navigationActiveText', 'textInverse'],
        group.label === 'listItem' ? itemText : getReadableTextColor(activeBackground),
      );

      return (
        <View style={styles.previewStack}>
          <View style={[styles.previewListItem, { backgroundColor: itemBackground, borderColor: itemBorder }]}>
            <Icon name="circle" size={12} color={textSecondary} />
            <Text style={[styles.previewListText, { color: itemText }]}>Item base</Text>
          </View>
          <View style={[styles.previewListItem, { backgroundColor: activeBackground, borderColor: activeBackground }]}>
            <Icon name="check-circle" size={12} color={activeText} />
            <Text style={[styles.previewListText, { color: activeText }]}>Item ativo</Text>
          </View>
        </View>
      );
    }
    case 'loading':
    case 'modal':
    case 'overlay': {
      const shellBackground = getPreviewColor(
        themeColors,
        group.label === 'modal' ? ['modalBackground', 'surface', 'background'] : ['loadingBackground', 'surface', 'background'],
        '#FFFFFF',
      );
      const shellBorder = getPreviewColor(
        themeColors,
        group.label === 'modal' ? ['modalBorder', 'border'] : ['loadingBorder', 'border'],
        '#E2E8F0',
      );
      const overlayBackground = getPreviewColor(themeColors, ['modalOverlay', 'loadingOverlay', 'overlayBackground'], '#CBD5E1');
      const spinnerColor = getPreviewColor(themeColors, ['loadingSpinner', 'loadingIcon', 'primary'], '#2563EB');

      return (
        <View style={styles.previewOverlayShell}>
          <View style={[styles.previewOverlayBackdrop, { backgroundColor: withOpacity(overlayBackground, 0.28) }]} />
          <View style={[styles.previewOverlayCard, { backgroundColor: shellBackground, borderColor: shellBorder }]}>
            {group.label === 'loading' ? (
              <>
                <ActivityIndicator size="small" color={spinnerColor} />
                <Text style={[styles.previewParagraph, { color: textPrimary }]}>Carregando...</Text>
              </>
            ) : (
              <>
                <Text style={[styles.previewInnerCardTitle, { color: textPrimary }]}>
                  {group.label === 'modal' ? 'Modal' : 'Overlay'}
                </Text>
                <Text style={[styles.previewParagraph, { color: textSecondary }]}>Bloco de visualizacao</Text>
              </>
            )}
          </View>
        </View>
      );
    }
    case 'radio': {
      const radioBorder = getPreviewColor(themeColors, ['radioBorder', 'border'], '#94A3B8');
      const radioSelectedBorder = getPreviewColor(themeColors, ['radioSelectedBorder', 'primary'], '#2563EB');
      const radioSelectedDot = getPreviewColor(themeColors, ['radioSelectedDot', 'primary'], '#2563EB');

      return (
        <View style={styles.previewStack}>
          <View style={styles.previewChoiceRow}>
            <View style={[styles.previewRadio, { borderColor: radioBorder }]} />
            <Text style={[styles.previewChoiceText, { color: textPrimary }]}>Opcao base</Text>
          </View>
          <View style={styles.previewChoiceRow}>
            <View style={[styles.previewRadio, { borderColor: radioSelectedBorder }]}>
              <View style={[styles.previewRadioDot, { backgroundColor: radioSelectedDot }]} />
            </View>
            <Text style={[styles.previewChoiceText, { color: textPrimary }]}>Opcao ativa</Text>
          </View>
        </View>
      );
    }
    case 'switch': {
      const offTrack = getPreviewColor(themeColors, ['switchOffTrack', 'border'], '#CBD5E1');
      const offThumb = getPreviewColor(themeColors, ['switchOffThumb', 'surface'], '#FFFFFF');
      const onTrack = getPreviewColor(themeColors, ['switchOnTrack', 'primary'], '#2563EB');
      const onThumb = getPreviewColor(themeColors, ['switchOnThumb', 'textInverse'], '#FFFFFF');

      return (
        <View style={styles.previewRowWrap}>
          <View style={[styles.previewSwitch, { backgroundColor: offTrack }]}>
            <View style={[styles.previewSwitchThumb, { backgroundColor: offThumb, alignSelf: 'flex-start' }]} />
          </View>
          <View style={[styles.previewSwitch, { backgroundColor: onTrack }]}>
            <View style={[styles.previewSwitchThumb, { backgroundColor: onThumb, alignSelf: 'flex-end' }]} />
          </View>
        </View>
      );
    }
    case 'toast': {
      const toastBackground = getPreviewColor(themeColors, ['toastBackground', 'surface', 'background'], '#FFFFFF');
      const toastBorder = getPreviewColor(themeColors, ['toastBorder', 'border'], '#E2E8F0');
      const toastInfoBackground = getPreviewColor(themeColors, ['toastInfoBackground', 'info', 'primary'], '#DBEAFE');
      const toastSuccessBackground = getPreviewColor(themeColors, ['toastSuccessBackground', 'positive'], '#DCFCE7');

      return (
        <View style={styles.previewStack}>
          <View style={[styles.previewToast, { backgroundColor: toastBackground, borderColor: toastBorder }]}>
            <Icon name="info" size={13} color={textPrimary} />
            <Text style={[styles.previewToastText, { color: textPrimary }]}>Toast base</Text>
          </View>
          <View style={[styles.previewToast, { backgroundColor: toastInfoBackground, borderColor: toastInfoBackground }]}>
            <Icon name="bell" size={13} color={textPrimary} />
            <Text style={[styles.previewToastText, { color: textPrimary }]}>Toast info</Text>
          </View>
          <View style={[styles.previewToast, { backgroundColor: toastSuccessBackground, borderColor: toastSuccessBackground }]}>
            <Icon name="check-circle" size={13} color={textPrimary} />
            <Text style={[styles.previewToastText, { color: textPrimary }]}>Toast sucesso</Text>
          </View>
        </View>
      );
    }
    case 'divider': {
      const dividerColor = getPreviewColor(themeColors, ['dividerBackground', 'dividerBorder', 'border'], '#CBD5E1');

      return (
        <View style={styles.previewStack}>
          <Text style={[styles.previewParagraph, { color: textSecondary }]}>Secao acima</Text>
          <View style={[styles.previewDivider, { backgroundColor: dividerColor }]} />
          <Text style={[styles.previewParagraph, { color: textPrimary }]}>Secao abaixo</Text>
        </View>
      );
    }
    case 'tokens base':
    case 'estrutura da tela': {
      return (
        <View style={[styles.previewSurfaceCard, { backgroundColor: sectionBackground, borderColor: sectionBorder }]}>
          <Text style={[styles.previewHeadline, { color: textPrimary }]}>Base da tela</Text>
          <Text style={[styles.previewParagraph, { color: textSecondary }]}>
            Fundo, superficie, borda e contraste principal.
          </Text>
        </View>
      );
    }
    default:
      return renderGenericPreview(group, themeColors);
  }
};

const ThemeObjectPreviewCard = ({ group, themeColors, onPress, onLayout }) => {
  const Container = onPress ? Pressable : View;

  return (
    <Container style={styles.objectPreviewCard} onPress={onPress} onLayout={onLayout}>
      <View style={styles.objectPreviewHeader}>
        <Text style={styles.objectPreviewTitle}>{group.label}</Text>
        <Text style={styles.objectPreviewMeta}>
          {group.filledCount}/{group.tokens.length}
        </Text>
      </View>

      <View style={styles.objectPreviewBody}>
        {renderThemeObjectPreview(group, themeColors)}
      </View>
    </Container>
  );
};

const buildEditorFields = draft => {
  return Object.keys(draft || {})
    .sort((leftKey, rightKey) => leftKey.localeCompare(rightKey))
    .map(buildEditorField);
};

const ColorEditor = ({ field, value, onChange }) => {
  const normalizedValue = normalizeHex(value) || value;

  return (
    <View style={styles.colorEditor}>
      <View style={styles.colorEditorHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.colorEditorLabel}>{field.label}</Text>
          <Text style={styles.helperText}>{field.helper}</Text>
        </View>
        <View
          style={[
            styles.colorPreview,
            { backgroundColor: normalizeHex(normalizedValue) || '#FFFFFF' },
          ]}
        />
      </View>

      <View style={styles.swatchPicker}>
        {COLOR_PRESETS.map(color => {
          const selected = normalizeHex(normalizedValue) === color;
          return (
            <TouchableOpacity
              key={`${field.key}-${color}`}
              style={[
                styles.pickerButton,
                { backgroundColor: color },
                selected && styles.pickerButtonActive,
              ]}
              onPress={() => onChange(color)}
            />
          );
        })}
      </View>

      <View style={styles.colorInputRow}>
        <TextInput
          value={normalizedValue}
          onChangeText={text => onChange(text.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={7}
          placeholder="#000000"
          placeholderTextColor="#94A3B8"
          style={styles.colorInput}
        />
        <Text style={styles.colorHint}>HEX</Text>
      </View>
    </View>
  );
};

export default function ThemeManagerPage() {
  const navigation = useNavigation();
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const { showError, showSuccess } = useToastMessage();

  const peopleActions = peopleStore.actions;
  const peopleGetters = peopleStore.getters;
  const themeGetters = themeStore.getters;

  const { currentCompany, defaultCompany } = peopleGetters;
  const { colors: themeColors } = themeGetters;

  const palette = useMemo(
    () => resolveThemePalette(
      {
        ...normalizeThemeColors(themeColors),
        ...normalizeThemeColors(currentCompany?.theme?.colors),
      },
      colors,
    ),
    [themeColors, currentCompany?.id, currentCompany?.theme?.colors],
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [themes, setThemes] = useState([]);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingTheme, setEditingTheme] = useState(null);
  const [editingFieldKey, setEditingFieldKey] = useState(null);
  const [themeName, setThemeName] = useState('');
  const [themeDraft, setThemeDraft] = useState(buildNewThemeDraft(palette));
  const newColumnRefs = useRef({});
  const newEntryLayouts = useRef({});
  const previewColumnRefs = useRef({});
  const previewGroupLayouts = useRef({});
  const editorFields = useMemo(
    () => buildEditorFields(themeDraft),
    [themeDraft],
  );
  const visibleEditorFields = useMemo(() => {
    if (!editingFieldKey) return editorFields;
    return [buildEditorField(editingFieldKey)];
  }, [editingFieldKey, editorFields]);

  const refreshCurrentThemeIfNeeded = useCallback(async () => {
    if (!currentCompany?.id || String(currentCompany.id) !== String(defaultCompany?.id)) {
      return;
    }

    try {
      const refreshedDefaultCompany = await peopleActions.defaultCompany();
      peopleActions.setCurrentCompany({
        ...currentCompany,
        theme: refreshedDefaultCompany?.theme || currentCompany?.theme,
        logo: currentCompany?.logo || refreshedDefaultCompany?.logo,
        alias: currentCompany?.alias || refreshedDefaultCompany?.alias,
        name: currentCompany?.name || refreshedDefaultCompany?.name,
        configs: currentCompany?.configs || refreshedDefaultCompany?.configs,
      });
    } catch (error) {
      // The manager page still works even if the active brand preview refresh fails.
    }
  }, [currentCompany, defaultCompany?.id, peopleActions]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const themesResponse = await api.fetch('/themes', { params: { page: 1 } });

      const nextThemes = normalizeCollection(themesResponse)
        .map(item => ({
          ...item,
          colors: normalizeThemeColors(item?.colors),
        }))
        .sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0));

      setThemes(nextThemes);
    } catch (error) {
      showError(formatApiError(error));
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const openCreateTheme = useCallback(() => {
    setEditingTheme(null);
    setEditingFieldKey(null);
    setThemeName('');
    setThemeDraft(buildNewThemeDraft(palette));
    setEditorVisible(true);
  }, [palette]);

  const openEditTheme = useCallback(themeItem => {
    setEditingTheme(themeItem);
    setEditingFieldKey(null);
    setThemeName(String(themeItem?.theme || '').trim());
    setThemeDraft(buildEditableDraft(themeItem?.colors || {}, palette));
    setEditorVisible(true);
  }, [palette]);

  const openDuplicateTheme = useCallback(themeItem => {
    setEditingTheme(null);
    setEditingFieldKey(null);
    setThemeName(buildDuplicateName(themeItem?.theme, themes));
    setThemeDraft(buildEditableDraft(themeItem?.colors || {}, palette));
    setEditorVisible(true);
  }, [palette, themes]);

  const openSingleColorEditor = useCallback((themeItem, fieldKey) => {
    setEditingTheme(themeItem);
    setEditingFieldKey(fieldKey);
    setThemeName(String(themeItem?.theme || '').trim());
    setThemeDraft({
      ...buildEditableDraft(themeItem?.colors || {}, palette),
      [fieldKey]: themeItem?.colors?.[fieldKey] || '',
    });
    setEditorVisible(true);
  }, [palette]);

  const closeEditor = useCallback(() => {
    setEditorVisible(false);
    setEditingFieldKey(null);
  }, []);

  const registerNewEntryLayout = useCallback((themeId, itemKey, layoutY) => {
    newEntryLayouts.current[`${themeId}:${itemKey}`] = layoutY;
  }, []);

  const registerPreviewGroupLayout = useCallback((themeId, groupLabel, layoutY) => {
    previewGroupLayouts.current[`${themeId}:${groupLabel}`] = layoutY;
  }, []);

  const jumpToPreviewGroup = useCallback((themeId, groupLabel) => {
    const scrollRef = previewColumnRefs.current[themeId];
    const targetY = previewGroupLayouts.current[`${themeId}:${groupLabel}`];

    if (scrollRef?.scrollTo && Number.isFinite(targetY)) {
      scrollRef.scrollTo({ y: Math.max(targetY - 10, 0), animated: true });
    }
  }, []);

  const jumpToFirstNewEntryOfGroup = useCallback((themeId, groupLabel, newEntriesByGroup = {}) => {
    const firstEntry = newEntriesByGroup[groupLabel]?.[0];
    if (!firstEntry) return;

    const scrollRef = newColumnRefs.current[themeId];
    const targetY = newEntryLayouts.current[`${themeId}:${firstEntry.key}`];

    if (scrollRef?.scrollTo && Number.isFinite(targetY)) {
      scrollRef.scrollTo({ y: Math.max(targetY - 10, 0), animated: true });
    }
  }, []);

  const setDraftColor = useCallback((fieldKey, value) => {
    setThemeDraft(current => ({
      ...current,
      [fieldKey]: value,
    }));
  }, []);

  const saveTheme = useCallback(async () => {
    const normalizedName = String(themeName || '').trim();
    if (!normalizedName) {
      showError('Informe um nome para o tema.');
      return;
    }

    const invalidField = editorFields.find(field => !normalizeHex(themeDraft[field.key]));
    if (invalidField) {
      showError(`A cor "${invalidField.label}" precisa estar em formato HEX, por exemplo #0EA5E9.`);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        theme: normalizedName,
        background: getId(editingTheme?.background) ? Number(getId(editingTheme.background)) : null,
        colors: buildThemeColorsPayload(themeDraft),
      };

      if (editingTheme?.id) {
        await api.fetch(getIri(editingTheme, 'themes'), {
          method: 'PUT',
          body: payload,
        });
        showSuccess('Tema atualizado.');
      } else {
        await api.post('/themes', payload);
        showSuccess('Tema criado.');
      }

      closeEditor();
      await loadData();
      await refreshCurrentThemeIfNeeded();
    } catch (error) {
      showError(formatApiError(error));
    } finally {
      setIsSaving(false);
    }
  }, [closeEditor, editingTheme, editorFields, loadData, refreshCurrentThemeIfNeeded, showError, showSuccess, themeDraft, themeName]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: palette.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.toolbar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Temas</Text>
            <Text style={styles.sectionText}>
              Um tema por linha, com as cores reais do banco logo abaixo.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: palette.primary }]}
            onPress={openCreateTheme}
          >
            <Icon name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Novo tema</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={palette.primary} />
          </View>
        ) : themes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Icon name="droplet" size={20} color={palette.primary} />
            <Text style={styles.emptyTitle}>Nenhum tema cadastrado.</Text>
            <Text style={styles.emptyText}>
              Crie o primeiro tema para comecar a configurar a identidade visual da empresa.
            </Text>
          </View>
        ) : (
          <View style={styles.themeList}>
            {themes.map(themeItem => {
              const { legacyEntries, newEntries, newEntriesByGroup, newCount, previewGroups } = buildThemeColumns(
                themeItem?.colors || {},
              );

              return (
                <View key={String(themeItem.id)} style={styles.themeCard}>
                  <View style={styles.themeRowTop}>
                    <View style={styles.themeTitleWrap}>
                      <Text style={styles.themeName}>
                        {themeItem?.theme || `Tema ${themeItem?.id}`}
                      </Text>
                      <Text style={styles.themeMetaText}>#{themeItem?.id}</Text>
                    </View>
                    <View style={styles.themeActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate('ThemePreviewPage', {
                          themeId: themeItem?.id,
                          theme: themeItem,
                        })}
                      >
                        <Icon name="eye" size={14} color="#334155" />
                        <Text style={styles.actionButtonText}>Preview</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => openEditTheme(themeItem)}
                      >
                        <Icon name="edit-3" size={14} color="#334155" />
                        <Text style={styles.actionButtonText}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => openDuplicateTheme(themeItem)}
                      >
                        <Icon name="copy" size={14} color="#334155" />
                        <Text style={styles.actionButtonText}>Duplicar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.columnsRow}>
                    <View style={[styles.themeColumn, styles.themeColumnQuarter]}>
                      <View style={styles.columnHeader}>
                        <Text style={styles.columnTitle}>Atual</Text>
                        <Text style={styles.columnMeta}>{legacyEntries.length}</Text>
                      </View>

                      <ScrollView
                        style={styles.columnScroll}
                        contentContainerStyle={styles.columnBody}
                        nestedScrollEnabled
                      >
                        {legacyEntries.length === 0 ? (
                          <Text style={styles.themeMetaText}>Nenhuma chave fora da referencia.</Text>
                        ) : (
                          legacyEntries.map(colorItem => {
                            const normalizedValue = normalizeHex(colorItem.value);

                            return (
                              <View
                                key={`${themeItem.id}-legacy-${colorItem.key}`}
                                style={[
                                  styles.colorListItem,
                                  colorItem.isUnexpected && styles.unexpectedColorListItem,
                                ]}
                              >
                                <TouchableOpacity
                                  style={styles.colorEditButton}
                                  onPress={event => {
                                    event.stopPropagation?.();
                                    openSingleColorEditor(themeItem, colorItem.key);
                                  }}
                                >
                                  <Icon name="edit-3" size={12} color="#334155" />
                                </TouchableOpacity>
                                <View
                                  style={[
                                    styles.colorSwatch,
                                    normalizedValue
                                      ? {
                                        backgroundColor: normalizedValue,
                                        borderColor: withOpacity(getReadableTextColor(normalizedValue), 0.2),
                                      }
                                      : styles.missingColorSwatch,
                                  ]}
                                />
                                <View style={{ flex: 1 }}>
                                  <Text numberOfLines={1} style={styles.colorListKey}>
                                    {colorItem.key}
                                  </Text>
                                  <Text numberOfLines={1} style={styles.colorListValue}>
                                    {colorItem.value || 'Sem valor no banco'}
                                  </Text>
                                </View>
                              </View>
                            );
                          })
                        )}
                      </ScrollView>
                    </View>

                    <View style={[styles.themeColumn, styles.themeColumnQuarter]}>
                      <View style={styles.columnHeader}>
                        <Text style={styles.columnTitle}>Novo</Text>
                        <Text style={styles.columnMeta}>{newCount}</Text>
                      </View>

                      <ScrollView
                        ref={ref => {
                          newColumnRefs.current[String(themeItem.id)] = ref;
                        }}
                        style={styles.columnScroll}
                        contentContainerStyle={styles.columnBody}
                        nestedScrollEnabled
                      >
                        {newEntries.length === 0 ? (
                          <Text style={styles.themeMetaText}>Sem cores novas cadastradas no banco.</Text>
                        ) : (
                          newEntries.map(item => {
                            const normalizedValue = normalizeHex(item.value);

                            return (
                              <Pressable
                                key={`${themeItem.id}-new-${item.key}`}
                                onLayout={event => registerNewEntryLayout(
                                  String(themeItem.id),
                                  item.key,
                                  event.nativeEvent.layout.y,
                                )}
                                onPress={() => jumpToPreviewGroup(String(themeItem.id), item.groupLabel)}
                                style={styles.colorListItem}
                              >
                                <TouchableOpacity
                                  style={styles.colorEditButton}
                                  onPress={event => {
                                    event.stopPropagation?.();
                                    openSingleColorEditor(themeItem, item.key);
                                  }}
                                >
                                  <Icon name="edit-3" size={12} color="#334155" />
                                </TouchableOpacity>
                                <View
                                  style={[
                                    styles.colorSwatch,
                                    normalizedValue
                                      ? {
                                        backgroundColor: normalizedValue,
                                        borderColor: withOpacity(getReadableTextColor(normalizedValue), 0.2),
                                      }
                                      : styles.missingColorSwatch,
                                  ]}
                                />
                                <View style={{ flex: 1 }}>
                                  <Text numberOfLines={1} style={styles.colorListKey}>
                                    {item.key}
                                  </Text>
                                  <Text numberOfLines={1} style={styles.colorListValue}>
                                    {item.value || `Sem valor no banco · ${item.groupLabel}`}
                                  </Text>
                                </View>
                              </Pressable>
                            );
                          })
                        )}
                      </ScrollView>
                    </View>

                    <View style={[styles.themeColumn, styles.themeColumnHalf]}>
                      <View style={styles.columnHeader}>
                        <Text style={styles.columnTitle}>Preview</Text>
                        <Text style={styles.columnMeta}>{previewGroups.length}</Text>
                      </View>

                      <ScrollView
                        ref={ref => {
                          previewColumnRefs.current[String(themeItem.id)] = ref;
                        }}
                        style={styles.columnScroll}
                        contentContainerStyle={styles.previewColumnBody}
                        nestedScrollEnabled
                      >
                        {previewGroups.map(group => (
                          <ThemeObjectPreviewCard
                            key={`${themeItem.id}-preview-${group.label}`}
                            group={group}
                            themeColors={themeItem?.colors || {}}
                            onLayout={event => registerPreviewGroupLayout(
                              String(themeItem.id),
                              group.label,
                              event.nativeEvent.layout.y,
                            )}
                            onPress={() => jumpToFirstNewEntryOfGroup(
                              String(themeItem.id),
                              group.label,
                              newEntriesByGroup,
                            )}
                          />
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={editorVisible} transparent animationType="slide" onRequestClose={closeEditor}>
        <TouchableWithoutFeedback onPress={closeEditor}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheet}>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>
                      {editingFieldKey
                        ? `Editar cor: ${editingFieldKey}`
                        : editingTheme?.id
                          ? 'Editar tema'
                          : 'Novo tema'}
                    </Text>
                    <Text style={styles.modalSubtitle}>
                      {editingFieldKey
                        ? 'Edicao rapida somente do campo selecionado.'
                        : 'Todas as cores reais do `theme.colors` aparecem aqui para edicao.'}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.iconButton} onPress={closeEditor}>
                    <Icon name="x" size={16} color="#334155" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 8 }}>
                  {!editingFieldKey ? (
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>Nome do tema</Text>
                      <TextInput
                        value={themeName}
                        onChangeText={setThemeName}
                        placeholder="Ex.: Verde institucional"
                        placeholderTextColor="#94A3B8"
                        style={styles.textInput}
                      />
                    </View>
                  ) : null}

                  {visibleEditorFields.map(field => (
                    <ColorEditor
                      key={field.key}
                      field={field}
                      value={themeDraft[field.key]}
                      onChange={value => setDraftColor(field.key, value)}
                    />
                  ))}
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.secondaryButton} onPress={closeEditor}>
                    <Text style={styles.secondaryButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      { backgroundColor: palette.primary },
                      isSaving && { opacity: 0.6 },
                    ]}
                    onPress={saveTheme}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        {editingTheme?.id ? 'Salvar tema' : 'Criar tema'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores, remover api.fetch e evitar repassar dados em objetos quando o store ja resolver isso.
