import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
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

const STANDARD_COLOR_SWATCHES = [
  { value: '#FFFFFF', name: 'white' },
  { value: '#0000001A', name: 'black 10%' },
  { value: '#00000033', name: 'black 20%' },
  { value: '#0000004D', name: 'black 30%' },
  { value: '#00000066', name: 'black 40%' },
  { value: '#00000080', name: 'black 50%' },
  { value: '#00000099', name: 'black 60%' },
  { value: '#000000B3', name: 'black 70%' },
  { value: '#000000CC', name: 'black 80%' },
  { value: '#000000E6', name: 'black 90%' },
  { value: '#000000', name: 'black 100%' },
  { value: '#FF0000', name: 'red' },
  { value: '#00FF00', name: 'green' },
  { value: '#0000FF', name: 'blue' },
  { value: '#00FFFF', name: 'cyan' },
  { value: '#FF00FF', name: 'magenta' },
  { value: '#FFFF00', name: 'yellow' },
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

const THEME_MEDIA_FIELDS = [
  { key: 'logo', label: 'Logo' },
  { key: 'icon', label: 'Icon' },
  { key: 'pin', label: 'Pin' },
];

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
    label: 'tokens base',
    tokens: ['googleLoading'],
  },
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
      'buttonPressedBorder',
      'buttonPressedIcon',
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
      'listItemEvenRow',
      'listItemIcon',
      'listItemOddRow',
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
	  label: 'table',
	  tokens: [
		'tableActionBackground',
		'tableActionBorder',
		'tableActionIcon',
		'tableFilterBackground',
		'tableFilterBorder',
		'tableFilterText',
		'tableFooterBackground',
		'tableFooterBorder',
		'tableFooterText',
		'tableHeaderBackground',
		'tableHeaderBorder',
		'tableHeaderIcon',
		'tableHeaderText',
		'tableRowBackground',
		'tableRowBorder',
		'tableRowEvenBackground',
		'tableRowMutedText',
		'tableRowOddBackground',
		'tableRowSelectedBackground',
		'tableRowSelectedBorder',
		'tableRowText',
		'tableToolbarBackground',
		'tableToolbarBorder',
		'tableToolbarText',
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

const THEME_PREVIEW_GROUPS = THEME_REFERENCE_GROUPS;

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

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGB_COLOR_FUNCTION_REGEX = /^rgba?\((.*)\)$/i;
const TRANSPARENT_COLOR_VALUE = 'transparent';
const THEME_COLOR_DRAG_TYPE = 'application/x-controleonline-theme-color';

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
  if (raw.length === 5) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}${raw[4]}${raw[4]}`.toUpperCase();
  }
  return raw.toUpperCase();
};

const parseAlphaPercent = value => {
  if (typeof value !== 'string') return null;

  const raw = value.trim().replace(/\s+/g, '');
  if (!raw) return null;

  if (raw.endsWith('%')) {
    const percentage = Number.parseFloat(raw.slice(0, -1));
    if (!Number.isFinite(percentage)) return null;
    return clampNumber(percentage, 0, 100);
  }

  const numeric = Number.parseFloat(raw);
  if (!Number.isFinite(numeric)) return null;

  if (numeric <= 1) {
    return clampNumber(numeric * 100, 0, 100);
  }

  return clampNumber(numeric, 0, 100);
};

const normalizeRgbColorInput = value => {
  if (typeof value !== 'string') return '';

  const raw = value.trim();
  if (!raw) return '';

  const functionMatch = raw.match(RGB_COLOR_FUNCTION_REGEX);
  const innerValue = functionMatch?.[1] || raw;
  const parts = innerValue
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

  if (parts.length < 3 || parts.length > 4) return '';

  const channels = parts.slice(0, 3).map(part => Number.parseFloat(part));
  if (channels.some(channel => !Number.isFinite(channel))) return '';

  const [red, green, blue] = channels.map(channel => clampNumber(Math.round(channel), 0, 255));
  const alphaPercent = parts.length === 4 ? parseAlphaPercent(parts[3]) : 100;
  if (alphaPercent == null) return '';

  const baseHex = `#${[red, green, blue]
    .map(channel => channel.toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();

  return composeHexWithAlpha(baseHex, alphaPercent);
};

const isTransparentColor = value => {
  return typeof value === 'string' && value.trim().toLowerCase() === TRANSPARENT_COLOR_VALUE;
};

const normalizeThemeColorValue = value => {
  const normalized = normalizeHex(value);
  if (normalized) return normalized;
  if (isTransparentColor(value)) return TRANSPARENT_COLOR_VALUE;
  const normalizedRgb = normalizeRgbColorInput(value);
  if (normalizedRgb) return normalizedRgb;
  return '';
};

const hasThemeColorValue = value => {
  return Boolean(normalizeThemeColorValue(value));
};

const clampNumber = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

const snapToStep = (value, step = 10) => {
  if (!Number.isFinite(value) || step <= 0) return value;
  return Math.round(value / step) * step;
};

const getHexBaseColor = value => {
  const normalized = normalizeHex(value);
  if (!normalized) return '';
  return normalized.length === 9 ? normalized.slice(0, 7) : normalized;
};

const getHexAlphaPercent = value => {
  if (isTransparentColor(value)) return 0;

  const normalized = normalizeHex(value);
  if (!normalized || normalized.length !== 9) return 100;

  const alpha = Number.parseInt(normalized.slice(7, 9), 16);
  return Math.round((alpha / 255) * 100);
};

const formatRgbaColor = value => {
  if (isTransparentColor(value)) {
    return 'rgba(0, 0, 0, 0)';
  }

  const normalized = normalizeHex(value);
  if (!normalized) {
    return '';
  }

  const baseColor = getHexBaseColor(normalized);
  if (!baseColor || baseColor.length !== 7) {
    return '';
  }

  const red = Number.parseInt(baseColor.slice(1, 3), 16);
  const green = Number.parseInt(baseColor.slice(3, 5), 16);
  const blue = Number.parseInt(baseColor.slice(5, 7), 16);
  const alpha = normalized.length === 9
    ? Number((Number.parseInt(normalized.slice(7, 9), 16) / 255).toFixed(2))
    : 1;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const parseDraggedThemeColorPayload = rawPayload => {
  if (typeof rawPayload !== 'string') return null;

  const trimmedPayload = rawPayload.trim();
  if (!trimmedPayload) return null;

  try {
    const parsedPayload = JSON.parse(trimmedPayload);
    const normalizedValue = normalizeThemeColorValue(parsedPayload?.value);
    if (!normalizedValue) return null;

    return {
      value: normalizedValue,
      sourceKey: String(parsedPayload?.sourceKey || '').trim(),
      sourceThemeId: String(parsedPayload?.sourceThemeId || '').trim(),
    };
  } catch (error) {
    const normalizedValue = normalizeThemeColorValue(trimmedPayload);
    if (!normalizedValue) return null;

    return {
      value: normalizedValue,
      sourceKey: '',
      sourceThemeId: '',
    };
  }
};

const composeHexWithAlpha = (value, alphaPercent = 100) => {
  const baseColor = getHexBaseColor(value);
  if (!baseColor) return '';

  const normalizedAlpha = clampNumber(Math.round(alphaPercent), 0, 100);
  if (normalizedAlpha >= 100) return baseColor;

  const alphaHex = Math.round((normalizedAlpha / 100) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();

  return `${baseColor}${alphaHex}`;
};

const getHexLightnessScore = value => {
  const normalized = normalizeHex(value);
  if (!normalized) return -1;

  const baseColor = getHexBaseColor(normalized);
  if (!baseColor || baseColor.length !== 7) return -1;

  const red = Number.parseInt(baseColor.slice(1, 3), 16);
  const green = Number.parseInt(baseColor.slice(3, 5), 16);
  const blue = Number.parseInt(baseColor.slice(5, 7), 16);
  const alpha = normalized.length === 9
    ? Number.parseInt(normalized.slice(7, 9), 16) / 255
    : 1;

  const mixedRed = Math.round((red * alpha) + (255 * (1 - alpha)));
  const mixedGreen = Math.round((green * alpha) + (255 * (1 - alpha)));
  const mixedBlue = Math.round((blue * alpha) + (255 * (1 - alpha)));

  return (mixedRed * 299 + mixedGreen * 587 + mixedBlue * 114) / 1000;
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
  if (isTransparentColor(color)) return '#111111';

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
  return '';
};

const pickThemeColor = (themeColors = {}, fallbackValue = '', keys = []) => {
  for (const key of keys) {
    const value = themeColors?.[key];
    if (isTransparentColor(value)) return TRANSPARENT_COLOR_VALUE;

    const normalized = normalizeHex(value);
    if (normalized) return normalized;
  }

  if (isTransparentColor(fallbackValue)) return TRANSPARENT_COLOR_VALUE;
  return normalizeHex(fallbackValue) || '#000000';
};

const pickThemeColorExact = (themeColors = {}, key = '') => {
  const value = themeColors?.[key];
  if (isTransparentColor(value)) return TRANSPARENT_COLOR_VALUE;
  return normalizeHex(value) || '';
};

const pickThemeColorExactFromKeys = (themeColors = {}, keys = []) => {
  for (const key of Array.isArray(keys) ? keys : [keys]) {
    const normalized = pickThemeColorExact(themeColors, key);
    if (normalized) return normalized;
  }

  return '';
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
    .map(([key, value]) => [key, normalizeThemeColorValue(value)])
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
      .map(([key, value]) => {
        const normalizedKey = String(key).trim();
        const rawValue = typeof value === 'string' ? value.trim() : value;

        if (!rawValue) return [normalizedKey, ''];

        if (isTransparentColor(rawValue)) return [normalizedKey, TRANSPARENT_COLOR_VALUE];

        const normalizedRgb = normalizeRgbColorInput(rawValue);
        if (normalizedRgb) return [normalizedKey, normalizedRgb];

        return [normalizedKey, normalizeHex(rawValue) || ''];
      })
      .filter(([key]) => Boolean(key) && !AUTO_GENERATED_ALIAS_KEYS.has(key)),
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

const sortThemesById = themes => {
  return [...themes].sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0));
};

const getThemeMediaValue = (themeItem, mediaKey) => {
  if (!themeItem || !mediaKey) return null;
  return themeItem?.[mediaKey] ?? themeItem?.media?.[mediaKey] ?? null;
};

const normalizeThemeEntity = themeItem => {
  if (!themeItem || typeof themeItem !== 'object') {
    return themeItem;
  }

  const nextTheme = {
    ...themeItem,
    colors: normalizeThemeColors(themeItem?.colors),
  };

  THEME_MEDIA_FIELDS.forEach(field => {
    nextTheme[field.key] = getThemeMediaValue(themeItem, field.key);
  });

  return nextTheme;
};

const buildThemeMediaPayload = (themeItem = {}, mediaOverrides = {}) => {
  return THEME_MEDIA_FIELDS.reduce((accumulator, field) => {
    const nextValue = Object.prototype.hasOwnProperty.call(mediaOverrides, field.key)
      ? mediaOverrides[field.key]
      : getThemeMediaValue(themeItem, field.key);

    accumulator[field.key] = getId(nextValue) ? Number(getId(nextValue)) : null;
    return accumulator;
  }, {});
};

const buildThemePayload = ({
  themeItem = null,
  themeName = '',
  background = null,
  colors: draftColors = {},
  mediaOverrides = {},
}) => ({
  theme: String(themeName || '').trim(),
  background: getId(background) ? Number(getId(background)) : null,
  colors: buildThemeColorsPayload(draftColors),
  ...buildThemeMediaPayload(themeItem, mediaOverrides),
});

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
  const legacyFilledCount = legacyEntries.filter(item => hasThemeColorValue(item.value)).length;

  const newEntries = THEME_REFERENCE_TOKENS.map(key => ({
      key,
      value: rawMap[key] ?? '',
      groupLabel: findTokenGroupLabel(key),
    }));
  const newFilledCount = newEntries.filter(item => hasThemeColorValue(item.value)).length;

  const previewGroups = UNIQUE_THEME_PREVIEW_GROUPS.map(group => ({
    ...group,
    filledCount: group.tokens.filter(token => (
      hasThemeColorValue(themeColors?.[token])
    )).length,
  }));
  const previewFilledGroupCount = previewGroups.filter(group => group.filledCount > 0).length;

  const newEntriesByGroup = previewGroups.reduce((accumulator, group) => {
    const groupEntries = newEntries.filter(item => item.groupLabel === group.label);
    if (groupEntries.length > 0) accumulator[group.label] = groupEntries;
    return accumulator;
  }, {});

  return {
    legacyEntries,
    legacyFilledCount,
    newEntries,
    newEntriesByGroup,
    newCount: newEntries.length,
    newFilledCount,
    previewGroups,
    previewFilledGroupCount,
  };
};

const extractUniqueNormalizedColors = entries => {
  const seen = new Set();

  const normalizedColors = (entries || []).reduce((accumulator, entry) => {
    const normalized = normalizeHex(entry?.value);
    if (!normalized || seen.has(normalized)) return accumulator;

    seen.add(normalized);
    accumulator.push({
      value: normalized,
      key: entry?.key || '',
      label: entry?.name || entry?.key || '',
    });
    return accumulator;
  }, []);

  return normalizedColors.sort((left, right) => {
    const lightnessDifference = getHexLightnessScore(right.value) - getHexLightnessScore(left.value);
    if (lightnessDifference !== 0) return lightnessDifference;
    return left.value.localeCompare(right.value);
  });
};

const buildEditorField = key => ({
  key,
  label: DEFAULT_THEME_FIELD_MAP[key]?.label || key,
  helper: DEFAULT_THEME_FIELD_MAP[key]?.helper || formatColorHint(key),
});

const buildThemeEditorPaletteColors = themeColors => {
  const { newEntries } = buildThemeColumns(themeColors);
  return extractUniqueNormalizedColors(newEntries);
};

const resolveEditorHighlightRowId = fieldKey => {
  const normalizedFieldKey = String(fieldKey || '').trim();
  if (!normalizedFieldKey) return '';
  return THEME_REFERENCE_TOKEN_SET.has(normalizedFieldKey) ? 'new' : 'legacy';
};

const replaceThemeDraftFieldValue = (themeDraft = {}, fieldKey, sourceValue) => {
  const normalizedFieldKey = String(fieldKey || '').trim();
  const normalizedSource = normalizeThemeColorValue(sourceValue);
  if (!normalizedFieldKey || !normalizedSource) {
    return themeDraft;
  }

  return {
    ...themeDraft,
    [normalizedFieldKey]: normalizedSource,
  };
};

const buildOverwriteThemeColors = (sourceThemeColors = {}, targetThemeColors = {}) => {
  const sourceColors = normalizeThemeColors(sourceThemeColors);
  const targetColors = normalizeThemeColors(targetThemeColors);

  const preservedLegacyEntries = Object.entries(targetColors)
    .filter(([key]) => !THEME_REFERENCE_TOKEN_SET.has(key) && !AUTO_GENERATED_ALIAS_KEYS.has(key));
  const nextNewEntries = THEME_REFERENCE_TOKENS.map(key => [
    key,
    normalizeThemeColorValue(sourceColors[key]) || '',
  ]);

  return Object.fromEntries([
    ...preservedLegacyEntries,
    ...nextNewEntries,
  ]);
};

const getPreviewColor = (themeColors, keys, fallbackValue) => {
  return pickThemeColor(themeColors, fallbackValue, Array.isArray(keys) ? keys : [keys]);
};

const getPreviewColorMode = (themeColors, keys, fallbackValue, useRnwPreview = false) => {
  if (useRnwPreview) {
    return getPreviewColor(themeColors, keys, fallbackValue);
  }

  return pickThemeColorExactFromKeys(themeColors, keys);
};

const resolvePreviewValue = (value, fallbackValue, useRnwPreview = false) => {
  if (useRnwPreview) return value || fallbackValue;
  return value || undefined;
};

const PreviewPressTarget = ({ tokenKeys = [], onSelectTokens, style, children }) => {
  const keys = Array.isArray(tokenKeys) ? tokenKeys.filter(Boolean) : [];

  if (!onSelectTokens || keys.length === 0) {
    return <View style={style}>{children}</View>;
  }

  return (
    <Pressable
      onPress={event => {
        event.stopPropagation?.();
        onSelectTokens(keys);
      }}
      style={style}
    >
      {children}
    </Pressable>
  );
};

const renderGenericPreview = (group, themeColors, onSelectTokens) => {
  return (
    <View style={styles.previewTokenGrid}>
      {group.tokens.slice(0, 6).map(token => {
        const colorValue = normalizeHex(themeColors?.[token]);
        const isTransparentValue = isTransparentColor(themeColors?.[token]);

        return (
          <PreviewPressTarget
            key={`${group.label}-${token}`}
            tokenKeys={[token]}
            onSelectTokens={onSelectTokens}
            style={styles.previewTokenCard}
          >
            <View
              style={[
                styles.previewTokenSwatch,
                colorValue
                  ? {
                    backgroundColor: colorValue,
                    borderColor: withOpacity(getReadableTextColor(colorValue), 0.18),
                  }
                  : isTransparentValue
                    ? styles.transparentPreviewTokenSwatch
                  : styles.previewTokenSwatchEmpty,
              ]}
            />
            <Text numberOfLines={1} style={styles.previewTokenLabel}>
              {token}
            </Text>
          </PreviewPressTarget>
        );
      })}
    </View>
  );
};

const renderThemeObjectPreview = (group, themeColors, onSelectTokens, useRnwPreview = false) => {
  const sectionBackground = getPreviewColorMode(themeColors, ['sectionBackground', 'surface', 'background'], '#F8FAFC', useRnwPreview);
  const sectionBorder = getPreviewColorMode(themeColors, ['sectionBorder', 'border'], '#E2E8F0', useRnwPreview);
  const textPrimary = getPreviewColorMode(themeColors, ['textPrimary', 'text'], '#0F172A', useRnwPreview);
  const textSecondary = getPreviewColorMode(themeColors, ['textSecondary', 'placeholderText'], '#64748B', useRnwPreview);

  switch (group.label) {
    case 'button': {
      const primaryBackground = getPreviewColorMode(themeColors, ['buttonBackground'], '', useRnwPreview);
      const primaryBorder = getPreviewColorMode(themeColors, ['buttonBorder'], '', useRnwPreview);
      const primaryText = getPreviewColorMode(themeColors, ['buttonText'], '', useRnwPreview);
      const primaryIcon = getPreviewColorMode(themeColors, ['buttonIcon'], '', useRnwPreview);
      const pressedBackground = getPreviewColorMode(themeColors, ['buttonPressedBackground'], '', useRnwPreview);
      const pressedBorder = getPreviewColorMode(themeColors, ['buttonPressedBorder'], '', useRnwPreview);
      const pressedIcon = getPreviewColorMode(themeColors, ['buttonPressedIcon'], '', useRnwPreview);
      const secondaryBackground = getPreviewColorMode(themeColors, ['buttonBackgroundSecondary'], '', useRnwPreview);
      const secondaryBorder = getPreviewColorMode(themeColors, ['buttonBorderSecondary'], '', useRnwPreview);
      const secondaryText = getPreviewColorMode(themeColors, ['buttonTextSecondary'], '', useRnwPreview);
      const disabledBackground = getPreviewColorMode(themeColors, ['buttonDisabledBackground'], '', useRnwPreview);
      const disabledText = getPreviewColorMode(themeColors, ['buttonDisabledText'], '', useRnwPreview);

      const primaryBaseBackground = '#F3F4F6';
      const primaryBaseBorder = '#D1D5DB';
      const primaryBaseText = '#111827';
      const primaryBaseIcon = '#111827';
      const pressedBaseBackground = '#1E40AF';
      const pressedBaseBorder = '#1E3A8A';
      const pressedBaseIcon = '#FFFFFF';
      const secondaryBaseBackground = '#FFFFFF';
      const secondaryBaseBorder = '#D1D5DB';
      const secondaryBaseText = '#111827';
      const disabledBaseBackground = '#E5E7EB';
      const disabledBaseText = '#9CA3AF';

      return (
        <View style={styles.previewStack}>
          <View style={styles.previewRow}>
            <PreviewPressTarget
              tokenKeys={['buttonBackground', 'buttonBorder', 'buttonText', 'buttonIcon']}
              onSelectTokens={onSelectTokens}
              style={[
                styles.previewButton,
                {
                  backgroundColor: resolvePreviewValue(primaryBackground, primaryBaseBackground, useRnwPreview),
                  borderColor: resolvePreviewValue(primaryBorder, primaryBaseBorder, useRnwPreview),
                  borderWidth: useRnwPreview ? 1 : primaryBorder ? 1 : 0,
                },
              ]}
            >
              <Icon name="check" size={12} color={resolvePreviewValue(primaryIcon, primaryBaseIcon, useRnwPreview)} />
              <Text style={[styles.previewButtonText, { color: resolvePreviewValue(primaryText, primaryBaseText, useRnwPreview) }]}>Primario</Text>
            </PreviewPressTarget>
            <PreviewPressTarget
              tokenKeys={['buttonBackgroundSecondary', 'buttonBorderSecondary', 'buttonTextSecondary', 'buttonIconSecondary']}
              onSelectTokens={onSelectTokens}
              style={[
                styles.previewButton,
                {
                  backgroundColor: resolvePreviewValue(secondaryBackground, secondaryBaseBackground, useRnwPreview),
                  borderColor: resolvePreviewValue(secondaryBorder, secondaryBaseBorder, useRnwPreview),
                  borderWidth: useRnwPreview ? 1 : secondaryBorder ? 1 : 0,
                },
              ]}
            >
              <Text style={[styles.previewButtonText, { color: resolvePreviewValue(secondaryText, secondaryBaseText, useRnwPreview) }]}>Secundario</Text>
            </PreviewPressTarget>
          </View>
          <View style={styles.previewRow}>
            <PreviewPressTarget
              tokenKeys={['buttonBackground', 'buttonBorder', 'buttonIcon']}
              onSelectTokens={onSelectTokens}
              style={[
                styles.previewButton,
                {
                  flex: 0,
                  minWidth: 40,
                  width: 40,
                  paddingHorizontal: 0,
                  backgroundColor: resolvePreviewValue(primaryBackground, primaryBaseBackground, useRnwPreview),
                  borderColor: resolvePreviewValue(primaryBorder, primaryBaseBorder, useRnwPreview),
                  borderWidth: useRnwPreview ? 1 : primaryBorder ? 1 : 0,
                },
              ]}
            >
              <Icon name="filter" size={13} color={resolvePreviewValue(primaryIcon, primaryBaseIcon, useRnwPreview)} />
            </PreviewPressTarget>
            <PreviewPressTarget
              tokenKeys={['buttonPressedBackground', 'buttonPressedBorder', 'buttonPressedIcon']}
              onSelectTokens={onSelectTokens}
              style={[
                styles.previewButton,
                {
                  flex: 0,
                  minWidth: 40,
                  width: 40,
                  paddingHorizontal: 0,
                  backgroundColor: resolvePreviewValue(pressedBackground, pressedBaseBackground, useRnwPreview),
                  borderColor: resolvePreviewValue(pressedBorder, pressedBaseBorder, useRnwPreview),
                  borderWidth: useRnwPreview ? 1 : pressedBorder ? 1 : 0,
                },
              ]}
            >
              <Icon name="grid" size={13} color={resolvePreviewValue(pressedIcon, pressedBaseIcon, useRnwPreview)} />
            </PreviewPressTarget>
          </View>
          <PreviewPressTarget
            tokenKeys={['buttonDisabledBackground', 'buttonDisabledText', 'buttonDisabledOpacity']}
            onSelectTokens={onSelectTokens}
            style={[
              styles.previewButton,
              styles.previewButtonDisabled,
              {
                backgroundColor: resolvePreviewValue(disabledBackground, disabledBaseBackground, useRnwPreview),
                borderColor: resolvePreviewValue(disabledBackground, disabledBaseBackground, useRnwPreview),
                borderWidth: useRnwPreview ? 1 : disabledBackground ? 1 : 0,
              },
            ]}
          >
            <Text style={[styles.previewButtonText, { color: resolvePreviewValue(disabledText, disabledBaseText, useRnwPreview) }]}>Desabilitado</Text>
          </PreviewPressTarget>
        </View>
      );
    }
    case 'icon': {
      const iconColor = getPreviewColorMode(themeColors, ['iconColor', 'iconText'], '#2563EB', useRnwPreview);
      const iconInfo = getPreviewColorMode(themeColors, ['iconInfo', 'textSecondary'], '#64748B', useRnwPreview);
      const iconMuted = getPreviewColorMode(themeColors, ['iconMuted', 'textSecondary'], '#64748B', useRnwPreview);
      const iconWarning = getPreviewColorMode(themeColors, ['iconWarning', 'textWarning'], '#FEBC1D', useRnwPreview);
      const iconDanger = getPreviewColorMode(themeColors, ['iconDanger', 'textDanger'], '#DC2626', useRnwPreview);
      const iconSuccess = getPreviewColorMode(themeColors, ['iconSuccess', 'textSuccess'], '#16A34A', useRnwPreview);

      return (
        <View style={styles.previewIconRow}>
          {[
            { name: 'star', color: iconColor, tokens: ['iconColor'] },
            { name: 'info', color: iconInfo, tokens: ['iconInfo'] },
            { name: 'settings', color: iconMuted, tokens: ['iconMuted'] },
            { name: 'alert-triangle', color: iconWarning, tokens: ['iconWarning'] },
            { name: 'alert-triangle', color: iconDanger, tokens: ['iconDanger'] },
            { name: 'check-circle', color: iconSuccess, tokens: ['iconSuccess'] },

            
          ].map(item => (
            <PreviewPressTarget
              key={`${group.label}-${item.tokens[0]}`}
              tokenKeys={item.tokens}
              onSelectTokens={onSelectTokens}
              style={[
                styles.previewIconBubble,
                {
                  backgroundColor: useRnwPreview
                    ? withOpacity(item.color, 0.12)
                    : undefined,
                },
              ]}
            >
              <Icon name={item.name} size={16} color={item.color} />
            </PreviewPressTarget>
          ))}
        </View>
      );
    }
    case 'checkbox': {
      const checkboxBackground = getPreviewColorMode(themeColors, ['checkboxBackground', 'surface', 'background'], '#FFFFFF', useRnwPreview);
      const checkboxBorder = getPreviewColorMode(themeColors, ['checkboxBorder', 'border'], '#94A3B8', useRnwPreview);
      const checkboxSelectedBackground = getPreviewColorMode(themeColors, ['checkboxSelectedBackground', 'primary'], '#2563EB', useRnwPreview);
      const checkboxSelectedBorder = getPreviewColorMode(themeColors, ['checkboxSelectedBorder', 'primary'], checkboxSelectedBackground, useRnwPreview);
      const checkboxSelectedMark = getPreviewColorMode(themeColors, ['checkboxSelectedMark', 'textInverse'], '#FFFFFF', useRnwPreview);
      const checkboxDisabledBackground = getPreviewColorMode(themeColors, ['checkboxDisabledBackground'], '#E2E8F0', useRnwPreview);
      const checkboxDisabledBorder = getPreviewColorMode(themeColors, ['checkboxDisabledBorder'], '#CBD5E1', useRnwPreview);
      const checkboxText = getPreviewColorMode(themeColors, ['checkboxText', 'textPrimary', 'text'], '#0F172A', useRnwPreview);

      return (
        <View style={styles.previewStack}>
          <View style={styles.previewChoiceRow}>
            <PreviewPressTarget
              tokenKeys={['checkboxBackground', 'checkboxBorder']}
              onSelectTokens={onSelectTokens}
              style={styles.previewChoiceTarget}
            >
              <View
                style={[
                styles.previewCheckbox,
                {
                    backgroundColor: resolvePreviewValue(checkboxBackground, '#FFFFFF', useRnwPreview),
                    borderColor: resolvePreviewValue(checkboxBorder, '#94A3B8', useRnwPreview),
                    borderWidth: useRnwPreview ? 1 : checkboxBorder ? 1 : 0,
                  },
                ]}
              />
            </PreviewPressTarget>
            <PreviewPressTarget
              tokenKeys={['checkboxText']}
              onSelectTokens={onSelectTokens}
              style={styles.previewChoiceTextTarget}
            >
              <Text style={[styles.previewChoiceText, { color: resolvePreviewValue(checkboxText, '#0F172A', useRnwPreview) }]}>Normal</Text>
            </PreviewPressTarget>
          </View>
          <View style={styles.previewChoiceRow}>
            <PreviewPressTarget
              tokenKeys={['checkboxSelectedBackground', 'checkboxSelectedBorder', 'checkboxSelectedMark']}
              onSelectTokens={onSelectTokens}
              style={styles.previewChoiceTarget}
            >
              <View
                style={[
                  styles.previewCheckbox,
                  {
                    backgroundColor: resolvePreviewValue(checkboxSelectedBackground, '#2563EB', useRnwPreview),
                    borderColor: resolvePreviewValue(checkboxSelectedBorder, '#2563EB', useRnwPreview),
                    borderWidth: useRnwPreview ? 1 : checkboxSelectedBorder ? 1 : 0,
                  },
                ]}
              >
                <Icon name="check" size={12} color={checkboxSelectedMark || undefined} />
              </View>
            </PreviewPressTarget>
            <PreviewPressTarget
              tokenKeys={['checkboxText']}
              onSelectTokens={onSelectTokens}
              style={styles.previewChoiceTextTarget}
            >
              <Text style={[styles.previewChoiceText, { color: resolvePreviewValue(checkboxText, '#0F172A', useRnwPreview) }]}>Selecionado</Text>
            </PreviewPressTarget>
          </View>
          <View style={styles.previewChoiceRow}>
            <PreviewPressTarget
              tokenKeys={['checkboxDisabledBackground', 'checkboxDisabledBorder']}
              onSelectTokens={onSelectTokens}
              style={styles.previewChoiceTarget}
            >
              <View
                style={[
                  styles.previewCheckbox,
                  {
                    backgroundColor: resolvePreviewValue(checkboxDisabledBackground, '#E2E8F0', useRnwPreview),
                    borderColor: resolvePreviewValue(checkboxDisabledBorder, '#CBD5E1', useRnwPreview),
                    borderWidth: useRnwPreview ? 1 : checkboxDisabledBorder ? 1 : 0,
                  },
                ]}
              />
            </PreviewPressTarget>
            <PreviewPressTarget
              tokenKeys={['checkboxText']}
              onSelectTokens={onSelectTokens}
              style={styles.previewChoiceTextTarget}
            >
              <Text style={[styles.previewChoiceText, { color: resolvePreviewValue(textSecondary, '#64748B', useRnwPreview) }]}>Desabilitado</Text>
            </PreviewPressTarget>
          </View>
        </View>
      );
    }
    case 'header':
    case 'footer':
    case 'barra': {
      const containerTokenKeys = group.label === 'footer'
        ? ['footerBackground', 'footerBorder']
        : group.label === 'barra'
          ? ['navbarBackground', 'navbarBorder', 'tabBarBackground', 'tabBarBorder', 'toolbarBackground', 'toolbarBorder']
          : ['headerBackground', 'headerBorder'];
      const textTokenKeys = group.label === 'footer'
        ? ['footerText']
        : group.label === 'barra'
          ? containerTokenKeys
          : ['headerText'];
      const iconTokenKeys = group.label === 'footer'
        ? ['footerIcon', 'footerLink']
        : group.label === 'barra'
          ? containerTokenKeys
          : ['headerIcon', 'headerLink'];
      const barBackground = getPreviewColorMode(
        themeColors,
        group.label === 'footer'
          ? ['footerBackground', 'toolbarBackground', 'navbarBackground']
          : group.label === 'barra'
            ? ['toolbarBackground', 'navbarBackground', 'tabBarBackground']
            : ['headerBackground', 'toolbarBackground', 'navbarBackground'],
        '#0F172A',
        useRnwPreview,
      );
      const barBorder = getPreviewColorMode(
        themeColors,
        group.label === 'footer'
          ? ['footerBorder', 'toolbarBorder', 'navbarBorder']
          : group.label === 'barra'
            ? ['toolbarBorder', 'navbarBorder', 'tabBarBorder']
            : ['headerBorder', 'toolbarBorder', 'navbarBorder'],
        withOpacity(barBackground, 0.24),
        useRnwPreview,
      );
      const barText = getPreviewColorMode(
        themeColors,
        group.label === 'footer'
          ? ['footerText', 'footerLink', 'textInverse']
          : group.label === 'barra'
            ? ['headerText', 'footerText', 'textInverse']
            : ['headerText', 'headerLink', 'textInverse'],
        getReadableTextColor(barBackground),
        useRnwPreview,
      );

      return (
        <View
          style={[
            styles.previewBar,
            {
              backgroundColor: resolvePreviewValue(barBackground, '#0F172A', useRnwPreview),
              borderColor: resolvePreviewValue(barBorder, withOpacity(barBackground, 0.24), useRnwPreview),
              borderWidth: useRnwPreview ? 1 : barBorder ? 1 : 0,
            },
          ]}
        >
          <PreviewPressTarget
            tokenKeys={textTokenKeys}
            onSelectTokens={onSelectTokens}
            style={styles.previewBarSide}
          >
            <Icon name="menu" size={15} color={resolvePreviewValue(barText, getReadableTextColor(barBackground), useRnwPreview)} />
            <Text style={[styles.previewBarTitle, { color: resolvePreviewValue(barText, getReadableTextColor(barBackground), useRnwPreview) }]}>
              {group.label === 'footer' ? 'Footer' : group.label === 'barra' ? 'Barra' : 'Header'}
            </Text>
          </PreviewPressTarget>
          <PreviewPressTarget
            tokenKeys={iconTokenKeys}
            onSelectTokens={onSelectTokens}
            style={styles.previewBarSide}
          >
            <Icon name="bell" size={14} color={barText || undefined} />
            <Icon name="user" size={14} color={barText || undefined} />
          </PreviewPressTarget>
        </View>
      );
    }
    case 'card': {
      const cardBackground = getPreviewColorMode(themeColors, ['cardBackground', 'surface', 'background'], '#FFFFFF', useRnwPreview);
      const cardBorder = getPreviewColorMode(themeColors, ['cardBorder', 'border'], '#E2E8F0', useRnwPreview);
      const cardHeaderBackground = getPreviewColorMode(themeColors, ['cardHeaderBackground', 'sectionBackground'], '#F8FAFC', useRnwPreview);
      const cardHeaderText = getPreviewColorMode(themeColors, ['cardHeaderText', 'textPrimary', 'text'], '#0F172A', useRnwPreview);
      const cardText = getPreviewColorMode(themeColors, ['cardText', 'textPrimary', 'text'], '#0F172A', useRnwPreview);

      return (
        <View
          style={[
            styles.previewInnerCard,
            {
              backgroundColor: resolvePreviewValue(cardBackground, '#FFFFFF', useRnwPreview),
              borderColor: resolvePreviewValue(cardBorder, '#E2E8F0', useRnwPreview),
              borderWidth: useRnwPreview ? 1 : cardBorder ? 1 : 0,
            },
          ]}
        >
          <PreviewPressTarget
            tokenKeys={['cardHeaderBackground', 'cardHeaderText', 'cardIcon']}
            onSelectTokens={onSelectTokens}
            style={[
              styles.previewInnerCardHeader,
              { backgroundColor: resolvePreviewValue(cardHeaderBackground, '#F8FAFC', useRnwPreview) },
            ]}
          >
            <Text style={[styles.previewInnerCardTitle, { color: resolvePreviewValue(cardHeaderText, '#0F172A', useRnwPreview) }]}>Resumo</Text>
            <Icon name="more-horizontal" size={14} color={resolvePreviewValue(cardHeaderText, '#0F172A', useRnwPreview)} />
          </PreviewPressTarget>
          <PreviewPressTarget
            tokenKeys={['cardBackground', 'cardBorder', 'cardText']}
            onSelectTokens={onSelectTokens}
            style={styles.previewInnerCardContent}
          >
            <Text style={[styles.previewParagraph, { color: resolvePreviewValue(cardText, '#0F172A', useRnwPreview) }]}>
              Card com titulo, texto e estrutura visual do grupo.
            </Text>
          </PreviewPressTarget>
        </View>
      );
    }
    case 'chip':
    case 'badge': {
      const pillBackground = getPreviewColorMode(
        themeColors,
        group.label === 'chip' ? ['chipBackground', 'surface'] : ['badgeBackground', 'surface'],
        '#E2E8F0',
        useRnwPreview,
      );
      const pillBorder = getPreviewColorMode(
        themeColors,
        group.label === 'chip' ? ['chipBorder', 'border'] : ['badgeBorder', 'border'],
        pillBackground,
        useRnwPreview,
      );
      const pillText = getPreviewColorMode(
        themeColors,
        group.label === 'chip' ? ['chipText', 'textPrimary', 'text'] : ['badgeText', 'textPrimary', 'text'],
        '#0F172A',
        useRnwPreview,
      );
      const selectedBackground = getPreviewColorMode(
        themeColors,
        group.label === 'chip' ? ['chipSelectedBackground', 'primary'] : ['badgeSelectedBackground', 'primary'],
        '#2563EB',
        useRnwPreview,
      );
      const selectedText = getPreviewColorMode(
        themeColors,
        group.label === 'chip' ? ['chipSelectedText', 'textInverse'] : ['badgeSelectedText', 'textInverse'],
        '#FFFFFF',
        useRnwPreview,
      );

      return (
        <View style={styles.previewRowWrap}>
          <PreviewPressTarget
            tokenKeys={group.label === 'chip'
              ? ['chipBackground', 'chipBorder', 'chipText', 'chipIcon', 'chipShadow']
              : ['badgeBackground', 'badgeBorder', 'badgeText', 'badgeIcon', 'badgeShadow']}
            onSelectTokens={onSelectTokens}
            style={[
              styles.previewPill,
              {
                backgroundColor: resolvePreviewValue(pillBackground, '#E2E8F0', useRnwPreview),
                borderColor: resolvePreviewValue(pillBorder, pillBackground, useRnwPreview),
                borderWidth: useRnwPreview ? 1 : pillBorder ? 1 : 0,
              },
            ]}
          >
            <Text style={[styles.previewPillText, { color: resolvePreviewValue(pillText, '#0F172A', useRnwPreview) }]}>Base</Text>
          </PreviewPressTarget>
          <PreviewPressTarget
            tokenKeys={group.label === 'chip'
              ? ['chipSelectedBackground', 'chipSelectedBorder', 'chipSelectedText']
              : ['badgeSelectedBackground', 'badgeSelectedBorder', 'badgeSelectedText']}
            onSelectTokens={onSelectTokens}
            style={[
              styles.previewPill,
              {
                backgroundColor: resolvePreviewValue(selectedBackground, '#2563EB', useRnwPreview),
                borderColor: resolvePreviewValue(selectedBackground, '#2563EB', useRnwPreview),
                borderWidth: useRnwPreview ? 1 : selectedBackground ? 1 : 0,
              },
            ]}
          >
            <Text style={[styles.previewPillText, { color: resolvePreviewValue(selectedText, '#FFFFFF', useRnwPreview) }]}>Selecionado</Text>
          </PreviewPressTarget>
        </View>
      );
    }
    case 'input':
    case 'select': {
      const fieldBackground = getPreviewColorMode(
        themeColors,
        group.label === 'select' ? ['selectBackground', 'inputBackground', 'surface'] : ['inputBackground', 'surface', 'background'],
        '#FFFFFF',
        useRnwPreview,
      );
      const fieldBorder = getPreviewColorMode(
        themeColors,
        group.label === 'select' ? ['selectBorder', 'inputBorder', 'border'] : ['inputBorder', 'border'],
        '#CBD5E1',
        useRnwPreview,
      );
      const fieldText = getPreviewColorMode(
        themeColors,
        group.label === 'select' ? ['selectText', 'inputText', 'textPrimary', 'text'] : ['inputText', 'textPrimary', 'text'],
        '#0F172A',
        useRnwPreview,
      );
      const placeholderColor = getPreviewColorMode(
        themeColors,
        group.label === 'select' ? ['selectPlaceholderText', 'inputPlaceholderText', 'textSecondary'] : ['inputPlaceholderText', 'textSecondary'],
        '#94A3B8',
        useRnwPreview,
      );
      const focusBorder = getPreviewColorMode(themeColors, ['inputFocusBorder', 'selectOptionSelectedBackground', 'primary'], '#2563EB', useRnwPreview);
      const errorBorder = getPreviewColorMode(themeColors, ['inputErrorBorder', 'textDanger'], '#DC2626', useRnwPreview);

      return (
        <View style={styles.previewStack}>
          <PreviewPressTarget
            tokenKeys={group.label === 'select'
              ? ['selectBackground', 'selectBorder', 'selectPlaceholderText', 'selectIcon', 'selectOptionBackground', 'selectOptionBorder']
              : ['inputBackground', 'inputBorder', 'inputPlaceholderText', 'inputIcon']}
            onSelectTokens={onSelectTokens}
            style={[
              styles.previewField,
              {
                backgroundColor: resolvePreviewValue(fieldBackground, '#FFFFFF', useRnwPreview),
                borderColor: resolvePreviewValue(fieldBorder, '#CBD5E1', useRnwPreview),
                borderWidth: useRnwPreview ? 1 : fieldBorder ? 1 : 0,
              },
            ]}
          >
            <Text style={[styles.previewFieldText, { color: resolvePreviewValue(placeholderColor, '#94A3B8', useRnwPreview) }]}>
              {group.label === 'select' ? 'Selecione uma opcao' : 'Placeholder'}
            </Text>
            {group.label === 'select' ? <Icon name="chevron-down" size={14} color={resolvePreviewValue(placeholderColor, '#94A3B8', useRnwPreview)} /> : null}
          </PreviewPressTarget>
          <PreviewPressTarget
            tokenKeys={group.label === 'select'
              ? ['selectText', 'selectOptionSelectedBackground', 'selectOptionSelectedText']
              : ['inputText', 'inputFilledBorder', 'inputFocusBorder']}
            onSelectTokens={onSelectTokens}
            style={[
              styles.previewField,
              {
                backgroundColor: resolvePreviewValue(fieldBackground, '#FFFFFF', useRnwPreview),
                borderColor: resolvePreviewValue(focusBorder, '#2563EB', useRnwPreview),
                borderWidth: useRnwPreview ? 1 : focusBorder ? 1 : 0,
              },
            ]}
          >
            <Text style={[styles.previewFieldText, { color: resolvePreviewValue(fieldText, '#0F172A', useRnwPreview) }]}>
              {group.label === 'select' ? 'Opcao ativa' : 'Valor preenchido'}
            </Text>
          </PreviewPressTarget>
          {group.label === 'input' ? (
            <PreviewPressTarget
              tokenKeys={['inputErrorBackground', 'inputErrorBorder', 'inputErrorText']}
              onSelectTokens={onSelectTokens}
              style={[
                styles.previewField,
                {
                  backgroundColor: resolvePreviewValue(fieldBackground, '#FFFFFF', useRnwPreview),
                  borderColor: resolvePreviewValue(errorBorder, '#DC2626', useRnwPreview),
                  borderWidth: useRnwPreview ? 1 : errorBorder ? 1 : 0,
                },
              ]}
            >
              <Text style={[styles.previewFieldText, { color: resolvePreviewValue(textSecondary, '#64748B', useRnwPreview) }]}>Estado com erro</Text>
            </PreviewPressTarget>
          ) : null}
        </View>
      );
    }
    case 'link':
    case 'text': {
      const linkColor = getPreviewColorMode(themeColors, ['linkText', 'textLink', 'primary'], '#2563EB', useRnwPreview);
      const dangerColor = getPreviewColorMode(themeColors, ['textDanger'], '#DC2626', useRnwPreview);
      const successColor = getPreviewColorMode(themeColors, ['textSuccess'], '#16A34A', useRnwPreview);

      return (
        <View style={styles.previewStack}>
          <PreviewPressTarget tokenKeys={['textPrimary']} onSelectTokens={onSelectTokens}>
            <Text style={[styles.previewHeadline, { color: resolvePreviewValue(textPrimary, '#0F172A', useRnwPreview) }]}>Titulo principal</Text>
          </PreviewPressTarget>
          <PreviewPressTarget tokenKeys={['textSecondary']} onSelectTokens={onSelectTokens}>
            <Text style={[styles.previewParagraph, { color: resolvePreviewValue(textSecondary, '#64748B', useRnwPreview) }]}>
              Texto secundario para validar contraste e leitura.
            </Text>
          </PreviewPressTarget>
          <View style={styles.previewRowWrap}>
            <PreviewPressTarget tokenKeys={['linkText', 'textLink']} onSelectTokens={onSelectTokens}>
              <Text style={[styles.previewInlineLink, { color: resolvePreviewValue(linkColor, '#2563EB', useRnwPreview) }]}>Link</Text>
            </PreviewPressTarget>
            <PreviewPressTarget tokenKeys={['textSuccess']} onSelectTokens={onSelectTokens}>
              <Text style={[styles.previewInlineLink, { color: resolvePreviewValue(successColor, '#16A34A', useRnwPreview) }]}>Sucesso</Text>
            </PreviewPressTarget>
            <PreviewPressTarget tokenKeys={['textDanger']} onSelectTokens={onSelectTokens}>
              <Text style={[styles.previewInlineLink, { color: resolvePreviewValue(dangerColor, '#DC2626', useRnwPreview) }]}>Erro</Text>
            </PreviewPressTarget>
          </View>
        </View>
      );
    }


case 'table': {
      const tableHeaderBackground = getPreviewColorMode(
        themeColors,
        ['tableHeaderBackground', 'headerBackground', 'surface', 'background'],
        '#F8FAFC',
        useRnwPreview,
      );
      const tableHeaderBorder = getPreviewColorMode(
        themeColors,
        ['tableHeaderBorder', 'headerBorder', 'border'],
        '#E2E8F0',
        useRnwPreview,
      );
      const tableHeaderText = getPreviewColorMode(
        themeColors,
        ['tableHeaderText', 'headerText', 'textPrimary', 'text'],
        '#0F172A',
        useRnwPreview,
      );
      const tableHeaderIcon = getPreviewColorMode(
        themeColors,
        ['tableHeaderIcon', 'headerIcon', 'iconMuted', 'textSecondary'],
        '#64748B',
        useRnwPreview,
      );

      const tableFilterBackground = getPreviewColorMode(
        themeColors,
        ['tableFilterBackground', 'inputBackground', 'surface', 'background'],
        '#FFFFFF',
        useRnwPreview,
      );
      const tableFilterBorder = getPreviewColorMode(
        themeColors,
        ['tableFilterBorder', 'inputBorder', 'border'],
        '#CBD5E1',
        useRnwPreview,
      );
      const tableFilterText = getPreviewColorMode(
        themeColors,
        ['tableFilterText', 'inputText', 'textPrimary', 'text'],
        '#0F172A',
        useRnwPreview,
      );

      const tableRowOddBackground = getPreviewColorMode(
        themeColors,
        ['tableRowOddBackground', 'tableRowBackground', 'listItemOddRow', 'listItemBackground', 'surface', 'background'],
        '#FFFFFF',
        useRnwPreview,
      );
      const tableRowEvenBackground = getPreviewColorMode(
        themeColors,
        ['tableRowEvenBackground', 'tableRowBackground', 'listItemEvenRow', 'listItemBackground', 'surface', 'background'],
        '#F8FAFC',
        useRnwPreview,
      );
      const tableRowBorder = getPreviewColorMode(
        themeColors,
        ['tableRowBorder', 'listItemBorder', 'border'],
        '#E2E8F0',
        useRnwPreview,
      );
      const tableRowText = getPreviewColorMode(
        themeColors,
        ['tableRowText', 'listItemText', 'textPrimary', 'text'],
        '#0F172A',
        useRnwPreview,
      );
      const tableRowMutedText = getPreviewColorMode(
        themeColors,
        ['tableRowMutedText', 'textSecondary', 'listItemSubtitleText'],
        '#64748B',
        useRnwPreview,
      );

      const tableActionBackground = getPreviewColorMode(
        themeColors,
        ['tableActionBackground', 'surface', 'background'],
        '#FFFFFF',
        useRnwPreview,
      );
      const tableActionBorder = getPreviewColorMode(
        themeColors,
        ['tableActionBorder', 'border'],
        '#E2E8F0',
        useRnwPreview,
      );
      const tableActionIcon = getPreviewColorMode(
        themeColors,
        ['tableActionIcon', 'iconMuted', 'textSecondary'],
        '#64748B',
        useRnwPreview,
      );

      const tableFooterBackground = getPreviewColorMode(
        themeColors,
        ['tableFooterBackground', 'surface', 'background'],
        '#FFFFFF',
        useRnwPreview,
      );
      const tableFooterBorder = getPreviewColorMode(
        themeColors,
        ['tableFooterBorder', 'border'],
        '#E2E8F0',
        useRnwPreview,
      );
      const tableFooterText = getPreviewColorMode(
        themeColors,
        ['tableFooterText', 'textPrimary', 'text'],
        '#0F172A',
        useRnwPreview,
      );
      const tableToolbarBackground = getPreviewColorMode(
        themeColors,
        ['tableToolbarBackground', 'tableHeaderBackground', 'surface', 'background'],
        '#FFFFFF',
        useRnwPreview,
      );
      const tableToolbarBorder = getPreviewColorMode(
        themeColors,
        ['tableToolbarBorder', 'tableHeaderBorder', 'border'],
        '#E2E8F0',
        useRnwPreview,
      );
      const tableToolbarText = getPreviewColorMode(
        themeColors,
        ['tableToolbarText', 'tableHeaderText', 'textPrimary', 'text'],
        '#0F172A',
        useRnwPreview,
      );

      return (
        <View style={styles.previewStack}>
          <PreviewPressTarget
            tokenKeys={['tableToolbarBackground', 'tableToolbarBorder', 'tableToolbarText']}
            onSelectTokens={onSelectTokens}
            style={[
              styles.previewBar,
              {
                minHeight: 36,
                backgroundColor: resolvePreviewValue(tableToolbarBackground, '#FFFFFF', useRnwPreview),
                borderColor: resolvePreviewValue(tableToolbarBorder, '#E2E8F0', useRnwPreview),
                borderWidth: useRnwPreview ? 1 : tableToolbarBorder ? 1 : 0,
              },
            ]}
          >
            <Text style={[styles.previewBarTitle, { color: resolvePreviewValue(tableToolbarText, '#0F172A', useRnwPreview) }]}>
              Acoes
            </Text>
            <Text style={[styles.previewBarTitle, { color: resolvePreviewValue(tableToolbarText, '#0F172A', useRnwPreview) }]}>
              Exportar
            </Text>
          </PreviewPressTarget>

          <PreviewPressTarget
            tokenKeys={['tableHeaderBackground', 'tableHeaderBorder', 'tableHeaderText', 'tableHeaderIcon']}
            onSelectTokens={onSelectTokens}
            style={[
              styles.previewListItem,
              {
                backgroundColor: resolvePreviewValue(tableHeaderBackground, '#F8FAFC', useRnwPreview),
                borderColor: resolvePreviewValue(tableHeaderBorder, '#E2E8F0', useRnwPreview),
                borderWidth: useRnwPreview ? 1 : tableHeaderBorder ? 1 : 0,
              },
            ]}
          >
            <Text style={[styles.previewListText, { color: resolvePreviewValue(tableHeaderText, '#0F172A', useRnwPreview) }]}>
              ID
            </Text>
            <Text style={[styles.previewListText, { flex: 1, color: resolvePreviewValue(tableHeaderText, '#0F172A', useRnwPreview) }]}>
              STATUS
            </Text>
            <Icon name="chevron-down" size={13} color={resolvePreviewValue(tableHeaderIcon, '#64748B', useRnwPreview)} />
          </PreviewPressTarget>

          <PreviewPressTarget
            tokenKeys={['tableFilterBackground', 'tableFilterBorder', 'tableFilterText']}
            onSelectTokens={onSelectTokens}
            style={[
              styles.previewField,
              {
                minHeight: 34,
                backgroundColor: resolvePreviewValue(tableFilterBackground, '#FFFFFF', useRnwPreview),
                borderColor: resolvePreviewValue(tableFilterBorder, '#CBD5E1', useRnwPreview),
                borderWidth: useRnwPreview ? 1 : tableFilterBorder ? 1 : 0,
              },
            ]}
          >
            <Text style={[styles.previewFieldText, { color: resolvePreviewValue(tableFilterText, '#0F172A', useRnwPreview) }]}>
              Filtro de coluna
            </Text>
            <Icon name="search" size={13} color={resolvePreviewValue(tableFilterText, '#0F172A', useRnwPreview)} />
          </PreviewPressTarget>

          <PreviewPressTarget
            tokenKeys={['tableRowOddBackground', 'tableRowBorder', 'tableRowText', 'tableRowMutedText']}
            onSelectTokens={onSelectTokens}
            style={[
              styles.previewListItem,
              {
                backgroundColor: resolvePreviewValue(tableRowOddBackground, '#FFFFFF', useRnwPreview),
                borderColor: resolvePreviewValue(tableRowBorder, '#E2E8F0', useRnwPreview),
                borderWidth: useRnwPreview ? 1 : tableRowBorder ? 1 : 0,
              },
            ]}
          >
            <Text style={[styles.previewListText, { color: resolvePreviewValue(tableRowText, '#0F172A', useRnwPreview) }]}>
              #242557
            </Text>
            <Text style={[styles.previewListText, { flex: 1, color: resolvePreviewValue(tableRowMutedText, '#64748B', useRnwPreview) }]}>
              paid
            </Text>
          </PreviewPressTarget>

          <PreviewPressTarget
            tokenKeys={['tableRowEvenBackground', 'tableRowBorder', 'tableRowText', 'tableActionBackground', 'tableActionBorder', 'tableActionIcon']}
            onSelectTokens={onSelectTokens}
            style={[
              styles.previewListItem,
              {
                backgroundColor: resolvePreviewValue(tableRowEvenBackground, '#F8FAFC', useRnwPreview),
                borderColor: resolvePreviewValue(tableRowBorder, '#E2E8F0', useRnwPreview),
                borderWidth: useRnwPreview ? 1 : tableRowBorder ? 1 : 0,
              },
            ]}
          >
            <Text style={[styles.previewListText, { color: resolvePreviewValue(tableRowText, '#0F172A', useRnwPreview) }]}>
              #242558
            </Text>
            <Text style={[styles.previewListText, { flex: 1, color: resolvePreviewValue(tableRowText, '#0F172A', useRnwPreview) }]}>
              paid
            </Text>
            <View
              style={[
                styles.previewIconBubble,
                {
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: resolvePreviewValue(tableActionBackground, '#FFFFFF', useRnwPreview),
                  borderColor: resolvePreviewValue(tableActionBorder, '#E2E8F0', useRnwPreview),
                  borderWidth: useRnwPreview ? 1 : tableActionBorder ? 1 : 0,
                },
              ]}
            >
              <Icon name="edit-3" size={12} color={resolvePreviewValue(tableActionIcon, '#64748B', useRnwPreview)} />
            </View>
          </PreviewPressTarget>

          <PreviewPressTarget
            tokenKeys={['tableFooterBackground', 'tableFooterBorder', 'tableFooterText']}
            onSelectTokens={onSelectTokens}
            style={[
              styles.previewBar,
              {
                minHeight: 36,
                backgroundColor: resolvePreviewValue(tableFooterBackground, '#FFFFFF', useRnwPreview),
                borderColor: resolvePreviewValue(tableFooterBorder, '#E2E8F0', useRnwPreview),
                borderWidth: useRnwPreview ? 1 : tableFooterBorder ? 1 : 0,
              },
            ]}
          >
            <Text style={[styles.previewBarTitle, { color: resolvePreviewValue(tableFooterText, '#0F172A', useRnwPreview) }]}>
              Total
            </Text>
            <Text style={[styles.previewBarTitle, { color: resolvePreviewValue(tableFooterText, '#0F172A', useRnwPreview) }]}>
              24 registros
            </Text>
          </PreviewPressTarget>
        </View>
      );
    }



    case 'listItem':
    case 'menu':
    case 'navigation': {
      const baseTokenKeys = group.label === 'listItem'
        ? ['listItemBackground', 'listItemBorder', 'listItemText', 'listItemIcon', 'listItemOddRow', 'listItemEvenRow']
        : group.label === 'menu'
          ? ['menuBackground', 'menuBorder', 'menuText', 'menuIcon']
          : ['navigationBackground', 'navigationBorder', 'navigationText', 'navigationIcon'];
      const activeTokenKeys = group.label === 'listItem'
        ? ['listItemActiveBackground', 'listItemActiveBorder', 'listItemSelectedBackground', 'listItemSelectedBorder', 'listItemText', 'listItemOddRow', 'listItemEvenRow']
        : group.label === 'menu'
          ? ['menuActiveBackground', 'menuActiveBorder', 'menuActiveText', 'menuActiveIcon']
          : ['navigationActiveBackground', 'navigationActiveBorder', 'navigationActiveText', 'navigationActiveIcon'];
      const itemOddBackground = getPreviewColorMode(
        themeColors,
        ['listItemOddRow', 'listItemBackground', 'surface', 'background'],
        '#FFFFFF',
        useRnwPreview,
      );
      const itemEvenBackground = getPreviewColorMode(
        themeColors,
        ['listItemEvenRow', 'listItemBackground', 'surface', 'background'],
        '#F8FAFC',
        useRnwPreview,
      );
      const itemBorder = getPreviewColorMode(
        themeColors,
        group.label === 'listItem' ? ['listItemBorder', 'border'] : ['menuBorder', 'navigationBorder', 'border'],
        '#E2E8F0',
        useRnwPreview,
      );
      const activeBackground = getPreviewColorMode(
        themeColors,
        group.label === 'listItem' ? ['listItemSelectedBackground', 'listItemActiveBackground', 'primary'] : ['menuActiveBackground', 'navigationActiveBackground', 'primary'],
        '#DBEAFE',
        useRnwPreview,
      );
      const itemText = getPreviewColorMode(
        themeColors,
        group.label === 'listItem' ? ['listItemText', 'textPrimary', 'text'] : ['menuText', 'navigationText', 'textPrimary', 'text'],
        '#0F172A',
        useRnwPreview,
      );
      const activeText = getPreviewColorMode(
        themeColors,
        group.label === 'listItem' ? ['listItemText', 'textPrimary'] : ['menuActiveText', 'navigationActiveText', 'textInverse'],
        group.label === 'listItem' ? itemText : getReadableTextColor(activeBackground),
        useRnwPreview,
      );

      return (
        <View style={styles.previewStack}>
          <PreviewPressTarget
            tokenKeys={baseTokenKeys}
            onSelectTokens={onSelectTokens}
            style={[
              styles.previewListItem,
              {
                backgroundColor: resolvePreviewValue(itemOddBackground, '#FFFFFF', useRnwPreview),
                borderColor: resolvePreviewValue(itemBorder, '#E2E8F0', useRnwPreview),
                borderWidth: useRnwPreview ? 1 : itemBorder ? 1 : 0,
              },
            ]}
          >
            <Icon name="circle" size={12} color={resolvePreviewValue(textSecondary, '#64748B', useRnwPreview)} />
            <Text style={[styles.previewListText, { color: resolvePreviewValue(itemText, '#0F172A', useRnwPreview) }]}>Item base</Text>
          </PreviewPressTarget>
          <PreviewPressTarget
            tokenKeys={activeTokenKeys}
            onSelectTokens={onSelectTokens}
            style={[
              styles.previewListItem,
              {
                backgroundColor: resolvePreviewValue(itemEvenBackground, '#F8FAFC', useRnwPreview),
                borderColor: resolvePreviewValue(activeBackground, '#DBEAFE', useRnwPreview),
                borderWidth: useRnwPreview ? 1 : activeBackground ? 1 : 0,
              },
            ]}
          >
            <Icon name="check-circle" size={12} color={resolvePreviewValue(activeText, '#0F172A', useRnwPreview)} />
            <Text style={[styles.previewListText, { color: resolvePreviewValue(activeText, '#0F172A', useRnwPreview) }]}>Item ativo</Text>
          </PreviewPressTarget>
        </View>
      );
    }
    case 'loading':
    case 'modal':
    case 'overlay': {
      const backdropTokenKeys = group.label === 'modal'
        ? ['modalOverlay']
        : group.label === 'loading'
          ? ['loadingOverlay']
          : ['overlayBackground', 'overlayBorder', 'overlayShadow'];
      const shellTokenKeys = group.label === 'modal'
        ? ['modalBackground', 'modalBorder', 'modalHeaderText', 'modalText', 'modalShadow', 'modalCloseIcon']
        : group.label === 'loading'
          ? ['loadingBackground', 'loadingBorder', 'loadingText']
          : ['overlayBackground', 'overlayBorder', 'overlayShadow'];
      const spinnerTokenKeys = group.label === 'loading'
        ? ['loadingSpinner', 'loadingIcon']
        : [];
      const shellBackground = getPreviewColorMode(
        themeColors,
        group.label === 'modal' ? ['modalBackground', 'surface', 'background'] : ['loadingBackground', 'surface', 'background'],
        '#FFFFFF',
        useRnwPreview,
      );
      const shellBorder = getPreviewColorMode(
        themeColors,
        group.label === 'modal' ? ['modalBorder', 'border'] : ['loadingBorder', 'border'],
        '#E2E8F0',
        useRnwPreview,
      );
      const overlayBackground = getPreviewColorMode(themeColors, ['modalOverlay', 'loadingOverlay', 'overlayBackground'], '#CBD5E1', useRnwPreview);
      const spinnerColor = getPreviewColorMode(themeColors, ['loadingSpinner', 'loadingIcon', 'primary'], '#2563EB', useRnwPreview);

      return (
        <View style={styles.previewOverlayShell}>
          <PreviewPressTarget
            tokenKeys={backdropTokenKeys}
            onSelectTokens={onSelectTokens}
            style={[
              styles.previewOverlayBackdrop,
              {
                backgroundColor: useRnwPreview
                  ? overlayBackground || undefined
                  : withOpacity(overlayBackground, 0.28),
              },
            ]}
          />
          <PreviewPressTarget
            tokenKeys={shellTokenKeys}
            onSelectTokens={onSelectTokens}
            style={[
              styles.previewOverlayCard,
              {
                backgroundColor: resolvePreviewValue(shellBackground, '#FFFFFF', useRnwPreview),
                borderColor: resolvePreviewValue(shellBorder, '#E2E8F0', useRnwPreview),
                borderWidth: useRnwPreview ? 1 : shellBorder ? 1 : 0,
              },
            ]}
          >
            {group.label === 'loading' ? (
              <>
                <PreviewPressTarget tokenKeys={spinnerTokenKeys} onSelectTokens={onSelectTokens}>
                  <ActivityIndicator size="small" color={spinnerColor || undefined} />
                </PreviewPressTarget>
                <Text style={[styles.previewParagraph, { color: resolvePreviewValue(textPrimary, '#0F172A', useRnwPreview) }]}>Carregando...</Text>
              </>
            ) : (
              <>
                <Text style={[styles.previewInnerCardTitle, { color: resolvePreviewValue(textPrimary, '#0F172A', useRnwPreview) }]}>
                  {group.label === 'modal' ? 'Modal' : 'Overlay'}
                </Text>
                <Text style={[styles.previewParagraph, { color: resolvePreviewValue(textSecondary, '#64748B', useRnwPreview) }]}>Bloco de visualizacao</Text>
              </>
            )}
          </PreviewPressTarget>
        </View>
      );
    }
    case 'radio': {
      const radioTextTokenKeys = ['radioText', 'textPrimary', 'text'];
      const radioBorder = getPreviewColorMode(themeColors, ['radioBorder', 'border'], '#94A3B8', useRnwPreview);
      const radioSelectedBorder = getPreviewColorMode(themeColors, ['radioSelectedBorder', 'primary'], '#2563EB', useRnwPreview);
      const radioSelectedDot = getPreviewColorMode(themeColors, ['radioSelectedDot', 'primary'], '#2563EB', useRnwPreview);
      const radioText = getPreviewColorMode(themeColors, radioTextTokenKeys, '#0F172A', useRnwPreview);

      return (
        <View style={styles.previewStack}>
          <View style={styles.previewChoiceRow}>
            <PreviewPressTarget tokenKeys={['radioBackground', 'radioBorder']} onSelectTokens={onSelectTokens} style={styles.previewChoiceTarget}>
              <View style={[styles.previewRadio, { borderColor: resolvePreviewValue(radioBorder, '#94A3B8', useRnwPreview), borderWidth: useRnwPreview ? 1 : radioBorder ? 1 : 0 }]} />
            </PreviewPressTarget>
            <PreviewPressTarget tokenKeys={radioTextTokenKeys} onSelectTokens={onSelectTokens} style={styles.previewChoiceTextTarget}>
              <Text style={[styles.previewChoiceText, { color: resolvePreviewValue(radioText, '#0F172A', useRnwPreview) }]}>Opcao base</Text>
            </PreviewPressTarget>
          </View>
          <View style={styles.previewChoiceRow}>
            <PreviewPressTarget tokenKeys={['radioSelectedBackground', 'radioSelectedBorder', 'radioSelectedDot']} onSelectTokens={onSelectTokens} style={styles.previewChoiceTarget}>
              <View style={[styles.previewRadio, { borderColor: resolvePreviewValue(radioSelectedBorder, '#2563EB', useRnwPreview), borderWidth: useRnwPreview ? 1 : radioSelectedBorder ? 1 : 0 }]}>
                <View style={[styles.previewRadioDot, { backgroundColor: resolvePreviewValue(radioSelectedDot, '#2563EB', useRnwPreview) }]} />
              </View>
            </PreviewPressTarget>
            <PreviewPressTarget tokenKeys={radioTextTokenKeys} onSelectTokens={onSelectTokens} style={styles.previewChoiceTextTarget}>
              <Text style={[styles.previewChoiceText, { color: resolvePreviewValue(radioText, '#0F172A', useRnwPreview) }]}>Opcao ativa</Text>
            </PreviewPressTarget>
          </View>
        </View>
      );
    }
    case 'switch': {
      const offTrack = getPreviewColorMode(themeColors, ['switchOffTrack', 'border'], '#CBD5E1', useRnwPreview);
      const offThumb = getPreviewColorMode(themeColors, ['switchOffThumb', 'surface'], '#FFFFFF', useRnwPreview);
      const onTrack = getPreviewColorMode(themeColors, ['switchOnTrack', 'primary'], '#2563EB', useRnwPreview);
      const onThumb = getPreviewColorMode(themeColors, ['switchOnThumb', 'textInverse'], '#FFFFFF', useRnwPreview);

      return (
        <View style={styles.previewRowWrap}>
          <PreviewPressTarget
            tokenKeys={['switchOffTrack', 'switchOffThumb', 'switchBorder']}
            onSelectTokens={onSelectTokens}
            style={[styles.previewSwitch, { backgroundColor: resolvePreviewValue(offTrack, '#CBD5E1', useRnwPreview), borderWidth: useRnwPreview ? 1 : offTrack ? 0 : 0 }]}
          >
            <View style={[styles.previewSwitchThumb, { backgroundColor: resolvePreviewValue(offThumb, '#FFFFFF', useRnwPreview), alignSelf: 'flex-start' }]} />
          </PreviewPressTarget>
          <PreviewPressTarget
            tokenKeys={['switchOnTrack', 'switchOnThumb', 'switchBorder']}
            onSelectTokens={onSelectTokens}
            style={[styles.previewSwitch, { backgroundColor: resolvePreviewValue(onTrack, '#2563EB', useRnwPreview), borderWidth: useRnwPreview ? 1 : onTrack ? 0 : 0 }]}
          >
            <View style={[styles.previewSwitchThumb, { backgroundColor: resolvePreviewValue(onThumb, '#FFFFFF', useRnwPreview), alignSelf: 'flex-end' }]} />
          </PreviewPressTarget>
        </View>
      );
    }
    case 'toast': {
      const toastBackground = getPreviewColorMode(themeColors, ['toastBackground', 'surface', 'background'], '#FFFFFF', useRnwPreview);
      const toastBorder = getPreviewColorMode(themeColors, ['toastBorder', 'border'], '#E2E8F0', useRnwPreview);
      const toastInfoBackground = getPreviewColorMode(themeColors, ['toastInfoBackground', 'info', 'primary'], '#DBEAFE', useRnwPreview);
      const toastSuccessBackground = getPreviewColorMode(themeColors, ['toastSuccessBackground', 'positive'], '#DCFCE7', useRnwPreview);
      const toastWarningBackground = getPreviewColorMode(themeColors, ['toastWarningBackground', 'warning'], '#FEF3C7', useRnwPreview);
      const toastDangerBackground = getPreviewColorMode(themeColors, ['toastDangerBackground', 'negative'], '#FEE2E2', useRnwPreview);

      return (
        <View style={styles.previewStack}>
          <PreviewPressTarget
            tokenKeys={['toastBackground', 'toastBorder', 'toastIcon', 'toastText', 'toastShadow']}
            onSelectTokens={onSelectTokens}
            style={[styles.previewToast, { backgroundColor: resolvePreviewValue(toastBackground, '#FFFFFF', useRnwPreview), borderColor: resolvePreviewValue(toastBorder, '#E2E8F0', useRnwPreview), borderWidth: useRnwPreview ? 1 : toastBorder ? 1 : 0 }]}
          >
            <Icon name="info" size={13} color={resolvePreviewValue(textPrimary, '#0F172A', useRnwPreview)} />
            <Text style={[styles.previewToastText, { color: resolvePreviewValue(textPrimary, '#0F172A', useRnwPreview) }]}>Toast base</Text>
          </PreviewPressTarget>
          <PreviewPressTarget
            tokenKeys={['toastInfoBackground', 'toastInfoBorder', 'toastInfoIcon', 'toastInfoText']}
            onSelectTokens={onSelectTokens}
            style={[styles.previewToast, { backgroundColor: resolvePreviewValue(toastInfoBackground, '#DBEAFE', useRnwPreview), borderColor: resolvePreviewValue(toastInfoBackground, '#DBEAFE', useRnwPreview), borderWidth: useRnwPreview ? 1 : toastInfoBackground ? 1 : 0 }]}
          >
            <Icon name="bell" size={13} color={resolvePreviewValue(textPrimary, '#0F172A', useRnwPreview)} />
            <Text style={[styles.previewToastText, { color: resolvePreviewValue(textPrimary, '#0F172A', useRnwPreview) }]}>Toast info</Text>
          </PreviewPressTarget>
          <PreviewPressTarget
            tokenKeys={['toastSuccessBackground', 'toastSuccessBorder', 'toastSuccessIcon', 'toastSuccessText']}
            onSelectTokens={onSelectTokens}
            style={[styles.previewToast, { backgroundColor: resolvePreviewValue(toastSuccessBackground, '#DCFCE7', useRnwPreview), borderColor: resolvePreviewValue(toastSuccessBackground, '#DCFCE7', useRnwPreview), borderWidth: useRnwPreview ? 1 : toastSuccessBackground ? 1 : 0 }]}
          >
            <Icon name="check-circle" size={13} color={resolvePreviewValue(textPrimary, '#0F172A', useRnwPreview)} />
            <Text style={[styles.previewToastText, { color: resolvePreviewValue(textPrimary, '#0F172A', useRnwPreview) }]}>Toast sucesso</Text>
          </PreviewPressTarget>
          <PreviewPressTarget
            tokenKeys={['toastWarningBackground', 'toastWarningBorder', 'toastWarningIcon', 'toastWarningText']}
            onSelectTokens={onSelectTokens}
            style={[styles.previewToast, { backgroundColor: resolvePreviewValue(toastWarningBackground, '#FEF3C7', useRnwPreview), borderColor: resolvePreviewValue(toastWarningBackground, '#FEF3C7', useRnwPreview), borderWidth: useRnwPreview ? 1 : toastWarningBackground ? 1 : 0 }]}
          >
            <Icon name="alert-triangle" size={13} color={resolvePreviewValue(textPrimary, '#0F172A', useRnwPreview)} />
            <Text style={[styles.previewToastText, { color: resolvePreviewValue(textPrimary, '#0F172A', useRnwPreview) }]}>Toast aviso</Text>
          </PreviewPressTarget>
          <PreviewPressTarget
            tokenKeys={['toastDangerBackground', 'toastDangerBorder', 'toastDangerIcon', 'toastDangerText']}
            onSelectTokens={onSelectTokens}
            style={[styles.previewToast, { backgroundColor: resolvePreviewValue(toastDangerBackground, '#FEE2E2', useRnwPreview), borderColor: resolvePreviewValue(toastDangerBackground, '#FEE2E2', useRnwPreview), borderWidth: useRnwPreview ? 1 : toastDangerBackground ? 1 : 0 }]}
          >
            <Icon name="x-circle" size={13} color={resolvePreviewValue(textPrimary, '#0F172A', useRnwPreview)} />
            <Text style={[styles.previewToastText, { color: resolvePreviewValue(textPrimary, '#0F172A', useRnwPreview) }]}>Toast erro</Text>
          </PreviewPressTarget>
        </View>
      );
    }
    case 'divider': {
      const dividerColor = getPreviewColorMode(themeColors, ['dividerBackground', 'dividerBorder', 'border'], '#CBD5E1', useRnwPreview);

      return (
        <View style={styles.previewStack}>
          <PreviewPressTarget tokenKeys={['dividerText']} onSelectTokens={onSelectTokens}>
            <Text style={[styles.previewParagraph, { color: resolvePreviewValue(textSecondary, '#64748B', useRnwPreview) }]}>Secao acima</Text>
          </PreviewPressTarget>
          <PreviewPressTarget
            tokenKeys={['dividerBackground', 'dividerBorder']}
            onSelectTokens={onSelectTokens}
            style={[styles.previewDivider, { backgroundColor: resolvePreviewValue(dividerColor, '#CBD5E1', useRnwPreview) }]}
          />
          <PreviewPressTarget tokenKeys={['dividerText']} onSelectTokens={onSelectTokens}>
            <Text style={[styles.previewParagraph, { color: resolvePreviewValue(textPrimary, '#0F172A', useRnwPreview) }]}>Secao abaixo</Text>
          </PreviewPressTarget>
        </View>
      );
    }
    case 'tokens base':
      return (
        <View style={styles.previewOverlayShell}>
          <PreviewPressTarget
            tokenKeys={['googleLoading']}
            onSelectTokens={onSelectTokens}
            style={[
              styles.previewOverlayBackdrop,
              {
                backgroundColor: useRnwPreview
                  ? withOpacity(getPreviewColorMode(themeColors, ['googleLoading', 'loadingSpinner', 'primary'], '#2563EB', true), 0.12)
                  : undefined,
              },
            ]}
          />
          <PreviewPressTarget
            tokenKeys={['googleLoading']}
            onSelectTokens={onSelectTokens}
            style={[
              styles.previewOverlayCard,
              {
                backgroundColor: resolvePreviewValue(sectionBackground, '#FFFFFF', useRnwPreview),
                borderColor: resolvePreviewValue(sectionBorder, '#E2E8F0', useRnwPreview),
                borderWidth: useRnwPreview ? 1 : sectionBorder ? 1 : 0,
              },
            ]}
          >
            <ActivityIndicator
              size="small"
              color={resolvePreviewValue(
                getPreviewColorMode(themeColors, ['googleLoading', 'loadingSpinner', 'primary'], '#2563EB', useRnwPreview),
                '#2563EB',
                useRnwPreview,
              )}
            />
            <Text style={[styles.previewParagraph, { color: resolvePreviewValue(textPrimary, '#0F172A', useRnwPreview) }]}>
              Google loading
            </Text>
          </PreviewPressTarget>
        </View>
      );
    case 'estrutura da tela': {
      const surfaceTokenKeys = group.tokens.filter(token => (
          token.toLowerCase().includes('background') ||
          token.toLowerCase().includes('border') ||
          token === 'surface'
        ));
      return (
        <PreviewPressTarget
          tokenKeys={surfaceTokenKeys}
          onSelectTokens={onSelectTokens}
            style={[
              styles.previewSurfaceCard,
              {
                backgroundColor: resolvePreviewValue(sectionBackground, '#F8FAFC', useRnwPreview),
                borderColor: resolvePreviewValue(sectionBorder, '#E2E8F0', useRnwPreview),
                borderWidth: useRnwPreview ? 1 : sectionBorder ? 1 : 0,
              },
            ]}
        >
          <PreviewPressTarget tokenKeys={['textPrimary']} onSelectTokens={onSelectTokens}>
            <Text style={[styles.previewHeadline, { color: resolvePreviewValue(textPrimary, '#0F172A', useRnwPreview) }]}>Base da tela</Text>
          </PreviewPressTarget>
          <PreviewPressTarget tokenKeys={['textSecondary']} onSelectTokens={onSelectTokens}>
            <Text style={[styles.previewParagraph, { color: resolvePreviewValue(textSecondary, '#64748B', useRnwPreview) }]}>
              Fundo, superficie, borda e contraste principal.
            </Text>
          </PreviewPressTarget>
        </PreviewPressTarget>
      );
    }
    default:
      return renderGenericPreview(group, themeColors, onSelectTokens);
  }
};

const ThemeObjectPreviewCard = ({ group, themeColors, onPress, onLayout, onSelectTokens, useRnwPreview = false }) => {
  const Container = onPress ? Pressable : View;
  const hasFilledColor = group.filledCount > 0;

  return (
    <Container
      style={[
        styles.objectPreviewCard,
        hasFilledColor && styles.objectPreviewCardFilled,
      ]}
      onPress={onPress}
      onLayout={onLayout}
    >
      <View style={styles.objectPreviewHeader}>
        <Text style={styles.objectPreviewTitle}>{group.label}</Text>
        <Text style={styles.objectPreviewMeta}>
          {group.filledCount}/{group.tokens.length}
        </Text>
      </View>

      <View style={styles.objectPreviewBody}>
        {renderThemeObjectPreview(group, themeColors, onSelectTokens, useRnwPreview)}
      </View>
    </Container>
  );
};

const buildEditorFields = draft => {
  return Object.keys(draft || {})
    .sort((leftKey, rightKey) => leftKey.localeCompare(rightKey))
    .map(buildEditorField);
};

const OpacitySlider = ({
  value = 100,
  onChange,
  disabled = false,
  compact = false,
  previewColor = '',
  onApplyPreview,
}) => {
  const [trackWidth, setTrackWidth] = useState(0);

  const resolvedPreviewColor = normalizeHex(previewColor) || '';

  const handlePointer = useCallback(locationX => {
    if (disabled || trackWidth <= 0) return;

    const ratio = clampNumber(locationX / trackWidth, 0, 1);
    onChange(clampNumber(Math.round(ratio * 100), 0, 100));
  }, [disabled, onChange, trackWidth]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderGrant: event => handlePointer(event.nativeEvent.locationX),
    onPanResponderMove: event => handlePointer(event.nativeEvent.locationX),
  }), [disabled, handlePointer]);

  const normalizedValue = clampNumber(value, 0, 100);

  if (compact) {
    return (
      <View style={[styles.opacityEditorInline, disabled && styles.opacityEditorDisabled]}>
        <View
          style={styles.opacitySliderAreaInline}
          onLayout={event => setTrackWidth(event.nativeEvent.layout.width)}
          {...(disabled ? {} : panResponder.panHandlers)}
        >
          <View style={styles.opacitySliderTrack} />
          <View
            style={[
              styles.opacitySliderFill,
              { width: `${normalizedValue}%` },
            ]}
          />
          <View
            style={[
              styles.opacitySliderThumb,
              { left: trackWidth > 0 ? (trackWidth * normalizedValue) / 100 - 10 : -10 },
              disabled && styles.opacitySliderThumbDisabled,
            ]}
          />
        </View>

        <Pressable
          disabled={disabled || !resolvedPreviewColor}
          onPress={() => {
            if (disabled || !resolvedPreviewColor || !onApplyPreview) return;
            onApplyPreview(resolvedPreviewColor);
          }}
          style={[
            styles.toneEditorPreviewButton,
            resolvedPreviewColor
              ? {
                  backgroundColor: resolvedPreviewColor,
                  borderColor: '#000000',
                }
              : null,
          ]}
        />
      </View>
    );
  }

  return (
    <View style={[styles.opacityEditor, disabled && styles.opacityEditorDisabled]}>
      <View style={styles.opacityEditorHeader}>
        <Text style={styles.opacityEditorLabel}>Opacidade</Text>
        <Text style={styles.opacityEditorValue}>{normalizedValue}%</Text>
      </View>

      <View
        style={styles.opacitySliderArea}
        onLayout={event => setTrackWidth(event.nativeEvent.layout.width)}
        {...(disabled ? {} : panResponder.panHandlers)}
      >
        <View style={styles.opacitySliderTrack} />
        <View
          style={[
            styles.opacitySliderFill,
            { width: `${normalizedValue}%` },
          ]}
        />
        <View
          style={[
            styles.opacitySliderThumb,
            { left: trackWidth > 0 ? (trackWidth * normalizedValue) / 100 - 10 : -10 },
            disabled && styles.opacitySliderThumbDisabled,
          ]}
        />
      </View>
    </View>
  );
};
const mixHexColors = (firstColor, secondColor, ratio = 0.5) => {
  const left = getHexBaseColor(firstColor);
  const right = getHexBaseColor(secondColor);
  if (!left || !right) return left || right || '';

  const normalizedRatio = clampNumber(ratio, 0, 1);
  const leftWeight = 1 - normalizedRatio;
  const rightWeight = normalizedRatio;

  const red = Math.round(
    (Number.parseInt(left.slice(1, 3), 16) * leftWeight)
    + (Number.parseInt(right.slice(1, 3), 16) * rightWeight),
  );
  const green = Math.round(
    (Number.parseInt(left.slice(3, 5), 16) * leftWeight)
    + (Number.parseInt(right.slice(3, 5), 16) * rightWeight),
  );
  const blue = Math.round(
    (Number.parseInt(left.slice(5, 7), 16) * leftWeight)
    + (Number.parseInt(right.slice(5, 7), 16) * rightWeight),
  );

  return `#${[red, green, blue]
    .map(channel => channel.toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
};

const adjustHexTone = (value, tonePercent = 0) => {
  const baseColor = getHexBaseColor(value);
  if (!baseColor) return '';

  const normalizedTone = clampNumber(tonePercent, -100, 100);

  if (normalizedTone === 0) return baseColor;

  if (normalizedTone < 0) {
    return mixHexColors(baseColor, '#000000', Math.abs(normalizedTone) / 100);
  }

  return mixHexColors(baseColor, '#FFFFFF', normalizedTone / 100);
};

const ToneSlider = ({
  value = 0,
  onChange,
  disabled = false,
  previewColor = '',
  onApplyPreview,
}) => {
  const [trackWidth, setTrackWidth] = useState(0);

  const resolvedPreviewColor = getHexBaseColor(previewColor) || '';

  const handlePointer = useCallback(locationX => {
    if (disabled || trackWidth <= 0) return;

    const ratio = clampNumber(locationX / trackWidth, 0, 1);
    const rawValue = (ratio * 200) - 100;
    const snappedValue = snapToStep(rawValue, 5);

    onChange(clampNumber(snappedValue, -100, 100));
  }, [disabled, onChange, trackWidth]);
    
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderGrant: event => handlePointer(event.nativeEvent.locationX),
    onPanResponderMove: event => handlePointer(event.nativeEvent.locationX),
  }), [disabled, handlePointer]);

  const normalizedValue = clampNumber(value, -100, 100);
  const thumbLeft = trackWidth > 0
    ? ((normalizedValue + 100) / 200) * trackWidth - 10
    : -10;

  return (
    <View style={[styles.toneEditorInline, disabled && styles.toneEditorInlineDisabled]}>
      <View
        style={styles.toneEditorTrackWrap}
        onLayout={event => setTrackWidth(event.nativeEvent.layout.width)}
        {...(disabled ? {} : panResponder.panHandlers)}
      >
        <View style={styles.toneEditorTrack} />
        <View style={styles.toneEditorCenterMark} />
        <View
          style={[
            styles.toneEditorThumb,
            { left: thumbLeft },
            disabled && styles.toneEditorThumbDisabled,
          ]}
        />
      </View>

      <Pressable
        disabled={disabled || !resolvedPreviewColor}
        onPress={() => {
          if (disabled || !resolvedPreviewColor || !onApplyPreview) return;
          onApplyPreview(resolvedPreviewColor);
        }}
        style={[
          styles.toneEditorPreviewButton,
          resolvedPreviewColor
            ? {
                backgroundColor: resolvedPreviewColor,
                borderColor: '#000000',
              }
            : null,
        ]}
      />
    </View>
  );
};
const ColorEditor = ({
  field,
  value,
  onChange,
  swatchRows = [],
  selectedSwatchValue,
  onSelectSwatchValue,
  swatchDropSourceRowIds = [],
  swatchDropTargetRowIds = [],
  highlightedSwatchRowId = '',
  onApplySwatchDrop,
  showCloseButton = false,
  onClose,
  emphasizeLabel = false,
}) => {
  const normalizedValue = normalizeHex(value)
    || (isTransparentColor(value) ? TRANSPARENT_COLOR_VALUE : (typeof value === 'string' ? value : ''));
  const isExplicitTransparent = isTransparentColor(normalizedValue);
  const currentBaseHexColor = getHexBaseColor(normalizedValue);
  const [lastBaseHexColor, setLastBaseHexColor] = useState(currentBaseHexColor);
  const alphaPercent = getHexAlphaPercent(normalizedValue);
  const baseHexColor = currentBaseHexColor || lastBaseHexColor || '';
  const hasEditableBaseHex = Boolean(baseHexColor);
  const [hoveredSwatchKey, setHoveredSwatchKey] = useState('');
  const [dragOverSwatchKey, setDragOverSwatchKey] = useState('');
  const [draftInputValue, setDraftInputValue] = useState(normalizedValue);
  const [toneValue, setToneValue] = useState(0);
  const [tonePreviewColor, setTonePreviewColor] = useState(baseHexColor);
  const [opacityPreviewPercent, setOpacityPreviewPercent] = useState(alphaPercent);
  const draggedSwatchColorRef = useRef(null);
  const sourceRowIdSet = useMemo(() => new Set(swatchDropSourceRowIds), [swatchDropSourceRowIds]);
  const targetRowIdSet = useMemo(() => new Set(swatchDropTargetRowIds), [swatchDropTargetRowIds]);

  useEffect(() => {
    if (currentBaseHexColor) {
      setLastBaseHexColor(currentBaseHexColor);
    }
  }, [currentBaseHexColor]);
  useEffect(() => {
    setToneValue(0);
    setTonePreviewColor(baseHexColor);
  }, [baseHexColor]);

  useEffect(() => {
    setOpacityPreviewPercent(alphaPercent);
  }, [alphaPercent, baseHexColor]);

  useEffect(() => {
    setDraftInputValue(normalizedValue);
  }, [normalizedValue]);

  const applyColorInputValue = useCallback(nextValue => {
    const normalizedText = normalizeThemeColorValue(nextValue);
    if (normalizedText) {
      setToneValue(0);
      setTonePreviewColor(getHexBaseColor(normalizedText) || '');
      setOpacityPreviewPercent(getHexAlphaPercent(normalizedText));
      setDraftInputValue(normalizedText);
      onChange(normalizedText);
      return;
    }

    setDraftInputValue(nextValue);
    onChange(nextValue);
  }, [onChange]);

  const handleColorInputPaste = useCallback(event => {
    const pastedText = event?.clipboardData?.getData?.('text')
      || event?.nativeEvent?.clipboardData?.getData?.('text')
      || '';

    if (!pastedText) return;

    event.preventDefault?.();
    applyColorInputValue(pastedText);
  }, [applyColorInputValue]);

  const readDraggedSwatchColor = useCallback(event => {
    const refPayload = draggedSwatchColorRef.current;
    if (refPayload?.value) return refPayload;

    const customPayload = event?.dataTransfer?.getData?.(THEME_COLOR_DRAG_TYPE);
    const parsedCustomPayload = parseDraggedThemeColorPayload(customPayload);
    if (parsedCustomPayload?.value) return parsedCustomPayload;

    const plainTextPayload = event?.dataTransfer?.getData?.('text/plain');
    return parseDraggedThemeColorPayload(plainTextPayload);
  }, []);

  const handleSwatchDragStart = useCallback((event, rowId, colorValue) => {
    const normalizedValue = normalizeThemeColorValue(colorValue);
    if (!normalizedValue) {
      event.preventDefault?.();
      return;
    }

    const dragPayload = {
      value: normalizedValue,
      sourceKey: String(rowId || '').trim(),
      sourceThemeId: String(field?.key || '').trim(),
    };

    draggedSwatchColorRef.current = dragPayload;

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData(THEME_COLOR_DRAG_TYPE, JSON.stringify(dragPayload));
      event.dataTransfer.setData('text/plain', normalizedValue);
    }
  }, [field?.key]);

  const handleSwatchDragEnd = useCallback(() => {
    draggedSwatchColorRef.current = null;
    setDragOverSwatchKey('');
  }, []);

  const handleSwatchDragOver = useCallback((event, rowId, colorValue) => {
    if (!targetRowIdSet.has(rowId)) return;
    if (!readDraggedSwatchColor(event)?.value) return;

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }, [readDraggedSwatchColor, targetRowIdSet]);

  const handleSwatchDragEnter = useCallback((event, swatchKey, rowId, colorValue) => {
    if (!targetRowIdSet.has(rowId)) return;

    const draggedColor = readDraggedSwatchColor(event);
    if (!draggedColor?.value) {
      return;
    }

    event.preventDefault();
    setDragOverSwatchKey(swatchKey);
  }, [readDraggedSwatchColor, targetRowIdSet]);

  const handleSwatchDragLeave = useCallback((event, swatchKey) => {
    event.preventDefault();

    const relatedTarget = event.relatedTarget;
    if (relatedTarget && event.currentTarget?.contains?.(relatedTarget)) {
      return;
    }

    setDragOverSwatchKey(current => (current === swatchKey ? '' : current));
  }, []);

  const handleSwatchDrop = useCallback((event, swatchKey, rowId, colorValue) => {
    if (!targetRowIdSet.has(rowId)) return;

    event.preventDefault();
    setDragOverSwatchKey(current => (current === swatchKey ? '' : current));

    const draggedColor = readDraggedSwatchColor(event);
    draggedSwatchColorRef.current = null;

    if (
      !draggedColor?.value
      || typeof onApplySwatchDrop !== 'function'
    ) {
      return;
    }

    onApplySwatchDrop(draggedColor.value, field.key);
  }, [field.key, onApplySwatchDrop, readDraggedSwatchColor, targetRowIdSet]);

  return (
    <View style={styles.colorEditor}>
      <View style={styles.colorEditorHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.colorEditorLabel, emphasizeLabel && styles.colorEditorLabelLarge]}>
            {field.label}
          </Text>
          <Text style={styles.helperText}>{field.helper}</Text>
        </View>
        {showCloseButton && onClose ? (
          <TouchableOpacity style={styles.editorCloseButton} onPress={onClose}>
            <Icon name="x" size={16} color="#334155" />
          </TouchableOpacity>
        ) : null}
      </View>

      {swatchRows.map(row => (
        <View
          key={`${field.key}-${row.id}`}
          style={[
            styles.swatchPickerCard,
            highlightedSwatchRowId === row.id && styles.swatchPickerCardActive,
          ]}
        >
          <Text style={styles.swatchPickerLabel}>{row.label}</Text>
          {row.colors.length === 0 ? (
            <Text style={styles.swatchPickerEmpty}>Sem cores</Text>
          ) : (
            <View style={styles.swatchPickerSection}>
              <View style={styles.swatchPicker}>
                {row.colors.map((colorItem, index) => {
                  const selected = (selectedSwatchValue || normalizedValue) === colorItem.value;
                  const swatchKey = `${field.key}-${row.id}-${colorItem.value}`;
                  const isFirstColor = index === 0;
                  const isLastColor = index === row.colors.length - 1;
                  const rgbaValue = formatRgbaColor(colorItem.value);
                  const canDragSwatch = Platform.OS === 'web'
                    && sourceRowIdSet.has(row.id)
                    && Boolean(normalizeThemeColorValue(colorItem.value));
                  const isDropTarget = Platform.OS === 'web'
                    && targetRowIdSet.has(row.id)
                    && dragOverSwatchKey === swatchKey;
                  const tooltipLines = [
                    colorItem.label || '',
                    colorItem.value || '',
                    rgbaValue || '',
                  ].filter(Boolean);

                  return (
                    <View key={swatchKey} style={styles.pickerButtonWrap}>
                      {hoveredSwatchKey === swatchKey ? (
                        <View
                          style={[
                            styles.pickerTooltip,
                            isFirstColor && !isLastColor && styles.pickerTooltipFirst,
                            isLastColor && !isFirstColor && styles.pickerTooltipLast,
                          ]}
                        >
                          <Text style={[styles.pickerTooltipText, styles.pickerTooltipTitle]}>
                            {tooltipLines[0]}
                          </Text>
                          {tooltipLines.length > 1 ? (
                            <View style={styles.pickerTooltipSpacer} />
                          ) : null}
                          {tooltipLines.slice(1).map(line => (
                            <Text key={line} style={styles.pickerTooltipText}>
                              {line}
                            </Text>
                          ))}
                        </View>
                      ) : null}

                      {Platform.OS === 'web' ? React.createElement(
                        'div',
                        {
                          draggable: canDragSwatch,
                          onDragStart: canDragSwatch
                            ? event => handleSwatchDragStart(event, row.id, colorItem.value)
                            : undefined,
                          onDragEnd: canDragSwatch ? handleSwatchDragEnd : undefined,
                          onDragOver: event => handleSwatchDragOver(event, row.id, colorItem.value),
                          onDragEnter: event => handleSwatchDragEnter(
                            event,
                            swatchKey,
                            row.id,
                            colorItem.value,
                          ),
                          onDragLeave: event => handleSwatchDragLeave(event, swatchKey),
                          onDrop: event => handleSwatchDrop(
                            event,
                            swatchKey,
                            row.id,
                            colorItem.value,
                          ),
                          style: {
                            display: 'inline-block',
                            cursor: canDragSwatch ? 'grab' : 'default',
                          },
                        },
                        <Pressable
                          style={[
                            styles.pickerButton,
                            {
                              backgroundColor: colorItem.value,
                              borderColor: '#000000',
                            },
                            selected && styles.pickerButtonActive,
                            isDropTarget && styles.pickerButtonDropTarget,
                          ]}
                          onPress={() => {
                            const nextColor = colorItem.value;
                            const normalizedNextBase = getHexBaseColor(nextColor) || '';

                            setToneValue(0);
                            setTonePreviewColor(normalizedNextBase);

                            if (onSelectSwatchValue) {
                              onSelectSwatchValue(nextColor);
                              return;
                            }

                            onChange(nextColor);
                          }}
                          onHoverIn={() => setHoveredSwatchKey(swatchKey)}
                          onHoverOut={() => setHoveredSwatchKey(current => (
                            current === swatchKey ? '' : current
                          ))}
                        />,
                      ) : (
                        <Pressable
                          style={[
                            styles.pickerButton,
                            {
                              backgroundColor: colorItem.value,
                              borderColor: '#000000',
                            },
                            selected && styles.pickerButtonActive,
                          ]}
                          onPress={() => {
                            const nextColor = colorItem.value;
                            const normalizedNextBase = getHexBaseColor(nextColor) || '';

                            setToneValue(0);
                            setTonePreviewColor(normalizedNextBase);

                            if (onSelectSwatchValue) {
                              onSelectSwatchValue(nextColor);
                              return;
                            }

                            onChange(nextColor);
                          }}
                          onHoverIn={() => setHoveredSwatchKey(swatchKey)}
                          onHoverOut={() => setHoveredSwatchKey(current => (
                            current === swatchKey ? '' : current
                          ))}
                        />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      ))}

      <View style={styles.colorControlsRow}>
        <View
          style={[
            styles.editorControlCard,
            styles.editorControlCardFixed,
          ]}
        >
          <View style={styles.editorControlCardHeader}>
            <Text style={styles.editorControlCardTitle}>Cor</Text>
          </View>

          <View style={styles.colorInputRow}>
            <View style={styles.colorInputShell}>
              <TextInput
                value={draftInputValue}
                onChangeText={setDraftInputValue}
                onBlur={() => applyColorInputValue(draftInputValue)}
                onPaste={Platform.OS === 'web' ? handleColorInputPaste : undefined}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="#000000"
                placeholderTextColor="#94A3B8"
                style={styles.colorInput}
              />
            </View>
          </View>

          <View style={styles.editorControlCardFooter}>
            <Text style={[styles.editorControlCardFooterText, { opacity: 0 }]}>
              000%
            </Text>
          </View>
        </View>

        <View style={[styles.editorControlCard, styles.editorControlCardFlexible]}>
          <View style={[styles.editorControlCardHeader, styles.editorControlCardHeaderSplit]}>
            <Text style={styles.editorControlCardTitle}>Brilho</Text>
            <View style={styles.editorControlCardHeaderPreviewValue}>
              <Text style={styles.editorControlCardHeaderValue}>
                {toneValue > 0 ? `+${toneValue}%` : `${toneValue}%`}
              </Text>
            </View>
          </View>

          <ToneSlider
            value={toneValue}
            previewColor={tonePreviewColor}
            disabled={!hasEditableBaseHex || isExplicitTransparent}
            onChange={nextToneValue => {
              setToneValue(nextToneValue);
              const adjustedBaseColor = adjustHexTone(baseHexColor, nextToneValue);
              setTonePreviewColor(adjustedBaseColor || baseHexColor);
            }}
            onApplyPreview={appliedColor => {
              onChange(composeHexWithAlpha(appliedColor, alphaPercent));
            }}
          />

          <View style={[styles.editorControlCardFooter, styles.editorControlCardFooterSliderAligned]}>
            <Text style={[styles.editorControlCardFooterText, { opacity: 0 }]}>
              +100%
            </Text>
          </View>
        </View>

        <View style={[styles.editorControlCard, styles.editorControlCardFlexible]}>
          <View style={[styles.editorControlCardHeader, styles.editorControlCardHeaderSplit]}>
            <Text style={styles.editorControlCardTitle}>Opacidade</Text>
            <View style={styles.editorControlCardHeaderPreviewValue}>
              <Text style={styles.editorControlCardHeaderValue}>
                {opacityPreviewPercent}%
              </Text>
            </View>
          </View>

          <OpacitySlider
            compact
            value={opacityPreviewPercent}
            previewColor={composeHexWithAlpha(baseHexColor, opacityPreviewPercent)}
            disabled={!hasEditableBaseHex}
            onChange={nextValue => {
              setOpacityPreviewPercent(nextValue);

              if (nextValue === 0) {
                onChange(TRANSPARENT_COLOR_VALUE);
              }
            }}
            onApplyPreview={appliedColor => {
              if (opacityPreviewPercent === 0) {
                onChange(TRANSPARENT_COLOR_VALUE);
                return;
              }

              onChange(appliedColor);
            }}
          />

          <View style={[styles.editorControlCardFooter, styles.editorControlCardFooterSliderAligned]}>
            <Text style={[styles.editorControlCardFooterText, { opacity: 0 }]}>
              100%
            </Text>
          </View>
        </View>
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
  const [objectEditorVisible, setObjectEditorVisible] = useState(false);
  const [themeEditorVisible, setThemeEditorVisible] = useState(false);
  const [duplicateEditorVisible, setDuplicateEditorVisible] = useState(false);
  const [editingTheme, setEditingTheme] = useState(null);
  const [editingFieldKey, setEditingFieldKey] = useState(null);
  const [duplicateSourceTheme, setDuplicateSourceTheme] = useState(null);
  const [duplicateThemeName, setDuplicateThemeName] = useState('');
  const [duplicateOverwriteExisting, setDuplicateOverwriteExisting] = useState(false);
  const [duplicateTargetThemeId, setDuplicateTargetThemeId] = useState('');
  const [duplicateTargetDropdownOpen, setDuplicateTargetDropdownOpen] = useState(false);
  const [selectedThemeEditorColor, setSelectedThemeEditorColor] = useState('');
  const [selectedPreviewTokenKeysByTheme, setSelectedPreviewTokenKeysByTheme] = useState({});
  const [themeName, setThemeName] = useState('');
  const [themeDraft, setThemeDraft] = useState(buildNewThemeDraft(palette));
  const [showOnlyFilledLegacyByTheme, setShowOnlyFilledLegacyByTheme] = useState({});
  const [showOnlyFilledNewByTheme, setShowOnlyFilledNewByTheme] = useState({});
  const [showOnlyFilledPreviewByTheme, setShowOnlyFilledPreviewByTheme] = useState({});
  const [showRnwPreviewByTheme, setShowRnwPreviewByTheme] = useState({});
  const [newSearchByTheme, setNewSearchByTheme] = useState({});
  const [previewSearchByTheme, setPreviewSearchByTheme] = useState({});
  const [savingColorKeys, setSavingColorKeys] = useState({});
  const [dragOverColorKey, setDragOverColorKey] = useState('');
  const newColumnRefs = useRef({});
  const newEntryLayouts = useRef({});
  const previewColumnRefs = useRef({});
  const previewGroupLayouts = useRef({});
  const draggedThemeColorRef = useRef(null);
  const editorFields = useMemo(
    () => buildEditorFields(themeDraft),
    [themeDraft],
  );
  const objectEditorFields = useMemo(() => {
    if (!editingFieldKey) return editorFields;
    return [buildEditorField(editingFieldKey)];
  }, [editingFieldKey, editorFields]);
  const objectEditorHighlightedRowId = useMemo(
    () => resolveEditorHighlightRowId(editingFieldKey),
    [editingFieldKey],
  );
  const objectEditorSwatchRows = useMemo(() => {
    const { legacyEntries, newEntries } = buildThemeColumns(themeDraft);

    return [
      {
        id: 'standard',
        label: 'Comuns',
        colors: STANDARD_COLOR_SWATCHES,
      },
      {
        id: 'legacy',
        label: 'Legado',
        colors: extractUniqueNormalizedColors(legacyEntries),
      },
      {
        id: 'new',
        label: 'Novo',
        colors: extractUniqueNormalizedColors(newEntries),
      },
    ];
  }, [themeDraft]);
  const themeEditorSwatchRows = useMemo(() => {
    return [
      {
        id: 'theme-draft',
        label: 'ThemeDraft',
        colors: buildThemeEditorPaletteColors(themeDraft),
      },
    ];
  }, [themeDraft]);
  const themeEditorPaletteColors = themeEditorSwatchRows[0]?.colors || [];
  const activeThemeEditorColor = useMemo(() => {
    if (themeEditorPaletteColors.length === 0) return '';

    return themeEditorPaletteColors.some(colorItem => colorItem.value === selectedThemeEditorColor)
      ? selectedThemeEditorColor
      : themeEditorPaletteColors[0].value;
  }, [selectedThemeEditorColor, themeEditorPaletteColors]);
  const themeEditorField = useMemo(() => ({
    key: 'themeDraftPalette',
    label: 'ThemeDraft',
    helper: 'Mostra apenas as cores em uso naquele tema.',
  }), []);
  const duplicateTargetThemes = useMemo(() => {
    const sourceThemeId = String(duplicateSourceTheme?.id || '');
    return themes.filter(item => String(item?.id || '') !== sourceThemeId);
  }, [duplicateSourceTheme?.id, themes]);

  useEffect(() => {
    if (!themeEditorVisible) return;

    if (!activeThemeEditorColor && selectedThemeEditorColor) {
      setSelectedThemeEditorColor('');
      return;
    }

    if (activeThemeEditorColor && activeThemeEditorColor !== selectedThemeEditorColor) {
      setSelectedThemeEditorColor(activeThemeEditorColor);
    }
  }, [activeThemeEditorColor, selectedThemeEditorColor, themeEditorVisible]);

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
        .map(item => normalizeThemeEntity(item))
        .sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0));

      setThemes(nextThemes);
      return nextThemes;
    } catch (error) {
      showError(formatApiError(error));
      return [];
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
    const nextDraft = buildNewThemeDraft(palette);
    setEditingTheme(null);
    setEditingFieldKey(null);
    setObjectEditorVisible(false);
    setThemeEditorVisible(true);
    setDuplicateEditorVisible(false);
    setThemeName('');
    setThemeDraft(nextDraft);
    setSelectedThemeEditorColor(buildThemeEditorPaletteColors(nextDraft)[0]?.value || '');
  }, [palette]);

  const openEditTheme = useCallback(themeItem => {
    const nextDraft = buildEditableDraft(themeItem?.colors || {}, palette);
    setEditingTheme(normalizeThemeEntity(themeItem));
    setEditingFieldKey(null);
    setObjectEditorVisible(false);
    setThemeEditorVisible(true);
    setDuplicateEditorVisible(false);
    setThemeName(String(themeItem?.theme || '').trim());
    setThemeDraft(nextDraft);
    setSelectedThemeEditorColor(buildThemeEditorPaletteColors(nextDraft)[0]?.value || '');
  }, [palette]);

  const openDuplicateTheme = useCallback(themeItem => {
    setEditingTheme(null);
    setEditingFieldKey(null);
    setObjectEditorVisible(false);
    setThemeEditorVisible(false);
    setDuplicateSourceTheme(normalizeThemeEntity(themeItem));
    setDuplicateThemeName(buildDuplicateName(themeItem?.theme, themes));
    setDuplicateOverwriteExisting(false);
    setDuplicateTargetThemeId('');
    setDuplicateTargetDropdownOpen(false);
    setDuplicateEditorVisible(true);
  }, [themes]);

  const openSingleColorEditor = useCallback((themeItem, fieldKey) => {
    setEditingTheme(normalizeThemeEntity(themeItem));
    setEditingFieldKey(fieldKey);
    setDuplicateEditorVisible(false);
    setThemeEditorVisible(false);
    setObjectEditorVisible(true);
    setThemeName(String(themeItem?.theme || '').trim());
    setThemeDraft({
      ...buildEditableDraft(themeItem?.colors || {}, palette),
      [fieldKey]: themeItem?.colors?.[fieldKey] || '',
    });
  }, [palette]);

  const closeEditor = useCallback(() => {
    setObjectEditorVisible(false);
    setThemeEditorVisible(false);
    setEditingFieldKey(null);
    setSelectedThemeEditorColor('');
  }, []);
  const closeDuplicateEditor = useCallback(() => {
    setDuplicateEditorVisible(false);
    setDuplicateSourceTheme(null);
    setDuplicateThemeName('');
    setDuplicateOverwriteExisting(false);
    setDuplicateTargetThemeId('');
    setDuplicateTargetDropdownOpen(false);
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

  const jumpToFirstNewEntryByKeys = useCallback((themeId, tokenKeys = []) => {
    const scrollRef = newColumnRefs.current[themeId];
    if (!scrollRef?.scrollTo) return;

    const firstKeyWithLayout = tokenKeys.find(tokenKey => (
      Number.isFinite(newEntryLayouts.current[`${themeId}:${tokenKey}`])
    ));
    if (!firstKeyWithLayout) return;

    const targetY = newEntryLayouts.current[`${themeId}:${firstKeyWithLayout}`];
    scrollRef.scrollTo({ y: Math.max(targetY - 10, 0), animated: true });
  }, []);

  const handlePreviewGroupPress = useCallback((themeId, groupLabel, newEntriesByGroup = {}) => {
    const tokenKeys = (newEntriesByGroup[groupLabel] || []).map(item => item.key);

    setSelectedPreviewTokenKeysByTheme(current => ({
      ...current,
      [themeId]: tokenKeys,
    }));

    jumpToFirstNewEntryByKeys(themeId, tokenKeys);
  }, [jumpToFirstNewEntryByKeys]);

  const handlePreviewTokenPress = useCallback((themeId, tokenKeys = [], groupLabel, newEntriesByGroup = {}) => {
    if (!Array.isArray(tokenKeys) || tokenKeys.length === 0) {
      handlePreviewGroupPress(themeId, groupLabel, newEntriesByGroup);
      return;
    }

    setSelectedPreviewTokenKeysByTheme(current => ({
      ...current,
      [themeId]: tokenKeys,
    }));

    jumpToFirstNewEntryByKeys(themeId, tokenKeys);
  }, [handlePreviewGroupPress, jumpToFirstNewEntryByKeys]);

  const handleNewEntryPress = useCallback((themeId, itemKey, groupLabel) => {
    setSelectedPreviewTokenKeysByTheme(current => ({
      ...current,
      [themeId]: itemKey ? [itemKey] : [],
    }));

    jumpToPreviewGroup(themeId, groupLabel);
  }, [jumpToPreviewGroup]);

  const setDraftColor = useCallback((fieldKey, value) => {
    setThemeDraft(current => ({
      ...current,
      [fieldKey]: value,
    }));
  }, []);
  const applyDraftPaletteDrop = useCallback((sourceValue, fieldKey) => {
    setThemeDraft(current => replaceThemeDraftFieldValue(current, fieldKey, sourceValue));
  }, []);
  const setThemeDraftPaletteColor = useCallback(value => {
    const nextSelectedColor = normalizeThemeColorValue(value) || value;
    const replacementValue = nextSelectedColor || value;

    setThemeDraft(current => {
      const activeColor = activeThemeEditorColor;
      if (!activeColor) return current;

      return Object.fromEntries(
        Object.entries(current).map(([key, currentValue]) => {
          const normalizedCurrentValue = normalizeThemeColorValue(currentValue);
          if (normalizedCurrentValue !== activeColor) return [key, currentValue];
          return [key, replacementValue];
        }),
      );
    });

    setSelectedThemeEditorColor(nextSelectedColor);
  }, [activeThemeEditorColor]);

  const toggleShowOnlyFilledLegacy = useCallback(themeId => {
    setShowOnlyFilledLegacyByTheme(current => ({
      ...current,
      [themeId]: !current[themeId],
    }));
  }, []);

  const toggleShowOnlyFilledNew = useCallback(themeId => {
    setShowOnlyFilledNewByTheme(current => ({
      ...current,
      [themeId]: !current[themeId],
    }));
  }, []);

  const toggleShowOnlyFilledPreview = useCallback(themeId => {
    setShowOnlyFilledPreviewByTheme(current => ({
      ...current,
      [themeId]: !current[themeId],
    }));
  }, []);

  const toggleShowRnwPreview = useCallback(themeId => {
    setShowRnwPreviewByTheme(current => ({
      ...current,
      [themeId]: !current[themeId],
    }));
  }, []);

  const setPreviewSearch = useCallback((themeId, value) => {
    setPreviewSearchByTheme(current => ({
      ...current,
      [themeId]: value,
    }));
  }, []);

  const setNewSearch = useCallback((themeId, value) => {
    setNewSearchByTheme(current => ({
      ...current,
      [themeId]: value,
    }));
  }, []);

  const readDraggedThemeColor = useCallback(event => {
    const refPayload = draggedThemeColorRef.current;
    if (refPayload?.value) return refPayload;

    const customPayload = event?.dataTransfer?.getData?.(THEME_COLOR_DRAG_TYPE);
    const parsedCustomPayload = parseDraggedThemeColorPayload(customPayload);
    if (parsedCustomPayload?.value) return parsedCustomPayload;

    const plainTextPayload = event?.dataTransfer?.getData?.('text/plain');
    return parseDraggedThemeColorPayload(plainTextPayload);
  }, []);

  const handleNewColorDragStart = useCallback((event, payload) => {
    const normalizedValue = normalizeThemeColorValue(payload?.value);
    if (!normalizedValue) {
      event.preventDefault?.();
      return;
    }

    const dragPayload = {
      value: normalizedValue,
      sourceKey: String(payload?.sourceKey || '').trim(),
      sourceThemeId: String(payload?.sourceThemeId || '').trim(),
    };

    draggedThemeColorRef.current = dragPayload;

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData(THEME_COLOR_DRAG_TYPE, JSON.stringify(dragPayload));
      event.dataTransfer.setData('text/plain', normalizedValue);
    }
  }, []);

  const handleNewColorDragEnd = useCallback(() => {
    draggedThemeColorRef.current = null;
    setDragOverColorKey('');
  }, []);

  const handleNewColorDragOver = useCallback(event => {
    if (!readDraggedThemeColor(event)?.value) return;

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }, [readDraggedThemeColor]);

  const handleNewColorDragEnter = useCallback((event, themeId, itemKey) => {
    const draggedColor = readDraggedThemeColor(event);
    if (!draggedColor?.value) return;
    if (
      draggedColor.sourceKey
      && draggedColor.sourceThemeId
      && draggedColor.sourceKey === itemKey
      && draggedColor.sourceThemeId === String(themeId)
    ) {
      return;
    }

    event.preventDefault();
    setDragOverColorKey(`${themeId}:${itemKey}`);
  }, [readDraggedThemeColor]);

  const handleNewColorDragLeave = useCallback((event, themeId, itemKey) => {
    event.preventDefault();

    const relatedTarget = event.relatedTarget;
    if (relatedTarget && event.currentTarget?.contains?.(relatedTarget)) {
      return;
    }

    const stateKey = `${themeId}:${itemKey}`;
    setDragOverColorKey(current => (current === stateKey ? '' : current));
  }, []);

  const updateSingleThemeColor = useCallback(async (themeItem, fieldKey, nextValue = '') => {
    const themeId = String(themeItem?.id || '').trim();
    const savingKey = `${themeId}:${fieldKey}`;

    setSavingColorKeys(current => ({
      ...current,
      [savingKey]: true,
    }));

    try {
      const payload = buildThemePayload({
        themeItem,
        themeName: String(themeItem?.theme || '').trim(),
        background: themeItem?.background,
        colors: {
          ...normalizeThemeColors(themeItem?.colors || {}),
          [fieldKey]: nextValue,
        },
      });

      const updatedThemeResponse = await api.fetch(getIri(themeItem, 'themes'), {
        method: 'PUT',
        body: payload,
      });

      const nextTheme = normalizeThemeEntity(
        updatedThemeResponse && typeof updatedThemeResponse === 'object'
          ? {
            ...themeItem,
            ...updatedThemeResponse,
            colors: normalizeThemeColors(updatedThemeResponse?.colors ?? payload.colors),
          }
          : {
            ...themeItem,
            theme: payload.theme,
            background: payload.background,
            colors: payload.colors,
            ...buildThemeMediaPayload(themeItem),
          },
      );

      setThemes(currentThemes => currentThemes.map(item => (
        String(item?.id) === themeId
          ? { ...item, ...nextTheme }
          : item
      )));

      showSuccess(nextValue ? 'Cor atualizada.' : 'Cor removida.');
      await refreshCurrentThemeIfNeeded();
      return true;
    } catch (error) {
      showError(formatApiError(error));
      return false;
    } finally {
      setSavingColorKeys(current => {
        const nextState = { ...current };
        delete nextState[savingKey];
        return nextState;
      });
    }
  }, [refreshCurrentThemeIfNeeded, showError, showSuccess]);

  const handleNewColorDrop = useCallback(async (event, themeItem, themeId, itemKey) => {
    event.preventDefault();
    setDragOverColorKey('');

    const draggedColor = readDraggedThemeColor(event);
    draggedThemeColorRef.current = null;
    if (!draggedColor?.value) return;
    if (
      draggedColor.sourceKey
      && draggedColor.sourceThemeId
      && draggedColor.sourceKey === itemKey
      && draggedColor.sourceThemeId === String(themeId)
    ) {
      return;
    }

    await updateSingleThemeColor(themeItem, itemKey, draggedColor.value);
  }, [readDraggedThemeColor, updateSingleThemeColor]);

  const confirmClearThemeColor = useCallback((themeItem, fieldKey) => {
    const confirmAction = () => {
      updateSingleThemeColor(themeItem, fieldKey, '');
    };

    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      const shouldClear = window.confirm(`Deseja apagar a cor "${fieldKey}"?`);
      if (shouldClear) confirmAction();
      return;
    }

    Alert.alert(
      'Apagar cor?',
      `Deseja apagar a cor "${fieldKey}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Apagar', style: 'destructive', onPress: confirmAction },
      ],
    );
  }, [updateSingleThemeColor]);

  const requestDuplicateOverwriteConfirmation = useCallback((targetTheme, onConfirm) => {
    const sourceThemeName = String(duplicateSourceTheme?.theme || '').trim() || 'tema de origem';
    const targetThemeName = String(targetTheme?.theme || '').trim() || 'tema de destino';
    const firstMessage = `Voce vai sobrescrever o tema "${targetThemeName}" com as cores novas de "${sourceThemeName}".`;
    const secondMessage = `Tem certeza? Essa acao nao tem volta.\n\nSomente as cores novas serao sobrescritas. As cores antigas serao mantidas.`;

    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      const firstConfirmation = window.confirm(`${firstMessage}\n\nAs cores antigas nao serao alteradas.`);
      if (!firstConfirmation) return;

      const secondConfirmation = window.confirm(secondMessage);
      if (!secondConfirmation) return;

      onConfirm();
      return;
    }

    Alert.alert(
      'Sobrescrever tema?',
      `${firstMessage}\n\nAs cores antigas nao serao alteradas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Sem volta',
              secondMessage,
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Sobrescrever', style: 'destructive', onPress: onConfirm },
              ],
            );
          },
        },
      ],
    );
  }, [duplicateSourceTheme?.theme]);

  const saveDuplicateTheme = useCallback(async () => {
    const normalizedName = String(duplicateThemeName || '').trim();
    if (!normalizedName) {
      showError('Informe um nome para o tema.');
      return;
    }

    if (!duplicateSourceTheme?.id) {
      showError('Nao foi possivel identificar o tema de origem.');
      return;
    }

    const sourceThemeColors = normalizeThemeColors(duplicateSourceTheme?.colors || {});
    const persistDuplicate = async () => {
      setIsSaving(true);

      try {
        if (duplicateOverwriteExisting) {
          const targetTheme = themes.find(item => String(item?.id || '') === String(duplicateTargetThemeId || ''));
          if (!targetTheme?.id) {
            showError('Escolha qual tema existente sera sobrescrito.');
            return;
          }

          const payload = {
            ...buildThemePayload({
              themeItem: targetTheme,
              themeName: normalizedName,
              background: targetTheme?.background,
              colors: buildOverwriteThemeColors(sourceThemeColors, targetTheme?.colors || {}),
            }),
          };

          const updatedThemeResponse = await api.fetch(getIri(targetTheme, 'themes'), {
            method: 'PUT',
            body: payload,
          });

          const nextTheme = normalizeThemeEntity(
            updatedThemeResponse && typeof updatedThemeResponse === 'object'
              ? {
                ...targetTheme,
                ...updatedThemeResponse,
                colors: normalizeThemeColors(updatedThemeResponse?.colors ?? payload.colors),
              }
              : {
                ...targetTheme,
                theme: payload.theme,
                background: payload.background,
                colors: payload.colors,
                ...buildThemeMediaPayload(targetTheme),
              },
          );

          setThemes(currentThemes => currentThemes.map(item => (
            String(item?.id) === String(targetTheme.id)
              ? { ...item, ...nextTheme }
              : item
          )));

          showSuccess('Tema sobrescrito com as cores novas.');
        } else {
          const payload = {
            ...buildThemePayload({
              themeItem: duplicateSourceTheme,
              themeName: normalizedName,
              background: duplicateSourceTheme?.background,
              colors: sourceThemeColors,
            }),
          };

          const createdThemeResponse = await api.post('/themes', payload);

          if (createdThemeResponse && typeof createdThemeResponse === 'object' && createdThemeResponse?.id) {
            const nextTheme = normalizeThemeEntity({
              ...createdThemeResponse,
              colors: normalizeThemeColors(createdThemeResponse?.colors ?? payload.colors),
              ...buildThemeMediaPayload(duplicateSourceTheme),
            });

            setThemes(currentThemes => sortThemesById([
              ...currentThemes.filter(item => String(item?.id) !== String(nextTheme.id)),
              nextTheme,
            ]));
          } else {
            await loadData();
          }

          showSuccess('Tema duplicado.');
        }

        closeDuplicateEditor();
        await refreshCurrentThemeIfNeeded();
      } catch (error) {
        showError(formatApiError(error));
      } finally {
        setIsSaving(false);
      }
    };

    if (duplicateOverwriteExisting) {
      const targetTheme = themes.find(item => String(item?.id || '') === String(duplicateTargetThemeId || ''));
      if (!targetTheme?.id) {
        showError('Escolha qual tema existente sera sobrescrito.');
        return;
      }

      requestDuplicateOverwriteConfirmation(targetTheme, persistDuplicate);
      return;
    }

    await persistDuplicate();
  }, [
    closeDuplicateEditor,
    duplicateOverwriteExisting,
    duplicateSourceTheme,
    duplicateTargetThemeId,
    duplicateThemeName,
    loadData,
    refreshCurrentThemeIfNeeded,
    requestDuplicateOverwriteConfirmation,
    showError,
    showSuccess,
    themes,
  ]);

  const saveTheme = useCallback(async () => {
    const normalizedName = String(themeName || '').trim();
    if (!normalizedName) {
      showError('Informe um nome para o tema.');
      return;
    }

    const invalidField = editorFields.find(field => {
      const fieldValue = themeDraft[field.key];
      if (fieldValue == null) return false;

      const normalizedValue = typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue;
      if (normalizedValue === '') return false;

      return !normalizeHex(normalizedValue) && !isTransparentColor(normalizedValue);
    });
    if (invalidField) {
      showError(`A cor "${invalidField.label}" precisa estar em HEX, por exemplo #0EA5E9, ou usar "transparent".`);
      return;
    }

    setIsSaving(true);
    try {
      const payload = buildThemePayload({
        themeItem: editingTheme,
        themeName: normalizedName,
        background: editingTheme?.background,
        colors: themeDraft,
      });

      if (editingTheme?.id) {
        const updatedThemeResponse = await api.fetch(getIri(editingTheme, 'themes'), {
          method: 'PUT',
          body: payload,
        });

        const nextTheme = normalizeThemeEntity(
          updatedThemeResponse && typeof updatedThemeResponse === 'object'
            ? {
              ...editingTheme,
              ...updatedThemeResponse,
              colors: normalizeThemeColors(updatedThemeResponse?.colors ?? payload.colors),
            }
            : {
              ...editingTheme,
              theme: payload.theme,
              background: payload.background,
              colors: payload.colors,
              ...buildThemeMediaPayload(editingTheme),
            },
        );

        setThemes(currentThemes => currentThemes.map(item => (
          String(item?.id) === String(editingTheme.id)
            ? { ...item, ...nextTheme }
            : item
        )));
        setEditingTheme(nextTheme);

        showSuccess('Tema atualizado.');
      } else {
        const createdThemeResponse = await api.post('/themes', payload);

        if (createdThemeResponse && typeof createdThemeResponse === 'object' && createdThemeResponse?.id) {
          const nextTheme = normalizeThemeEntity({
            ...createdThemeResponse,
            colors: normalizeThemeColors(createdThemeResponse?.colors ?? payload.colors),
            ...buildThemeMediaPayload(editingTheme),
          });

          setThemes(currentThemes => sortThemesById([
            ...currentThemes.filter(item => String(item?.id) !== String(nextTheme.id)),
            nextTheme,
          ]));
          setEditingTheme(nextTheme);
        } else {
          const refreshedThemes = await loadData();
          const persistedTheme = [...refreshedThemes]
            .reverse()
            .find(item => String(item?.theme || '').trim() === normalizedName);

          if (persistedTheme) {
            setEditingTheme(persistedTheme);
          }
        }

        showSuccess('Tema criado.');
      }

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
              Crie o primeiro tema para começar a configurar a identidade visual da empresa.
            </Text>
          </View>
        ) : (
          <View style={styles.themeList}>
            {themes.map(themeItem => {
              const {
                legacyEntries,
                legacyFilledCount,
                newEntries,
                newEntriesByGroup,
                newCount,
                newFilledCount,
                previewGroups,
                previewFilledGroupCount,
              } = buildThemeColumns(
                themeItem?.colors || {},
              );
              const themeId = String(themeItem.id);
              const showOnlyFilledLegacy = Boolean(showOnlyFilledLegacyByTheme[themeId]);
              const showOnlyFilledNew = Boolean(showOnlyFilledNewByTheme[themeId]);
              const showOnlyFilledPreview = Boolean(showOnlyFilledPreviewByTheme[themeId]);
              const showRnwPreview = Boolean(showRnwPreviewByTheme[themeId]);
              const newSearch = String(newSearchByTheme[themeId] || '').trim().toLowerCase();
              const previewSearch = String(previewSearchByTheme[themeId] || '').trim().toLowerCase();
              const visibleLegacyEntries = showOnlyFilledLegacy
                ? legacyEntries.filter(item => hasThemeColorValue(item.value))
                : legacyEntries;
              const visibleNewEntries = showOnlyFilledNew
                ? newEntries.filter(item => hasThemeColorValue(item.value))
                : newEntries;
              const searchFilteredNewEntries = newSearch
                ? visibleNewEntries.filter(item => (
                  item.key.toLowerCase().includes(newSearch)
                  || String(item.value || '').toLowerCase().includes(newSearch)
                  || String(item.groupLabel || '').toLowerCase().includes(newSearch)
                ))
                : visibleNewEntries;
              const searchFilteredPreviewGroups = previewSearch
                ? previewGroups.filter(group => group.label.toLowerCase().includes(previewSearch))
                : previewGroups;
              const visiblePreviewGroups = showOnlyFilledPreview
                ? searchFilteredPreviewGroups.filter(group => group.filledCount > 0)
                : searchFilteredPreviewGroups;

              return (
                <View key={themeId} style={styles.themeCard}>
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
                        <View style={styles.columnMetaWrap}>
                          <TouchableOpacity
                            style={[
                              styles.columnFilterButton,
                              showOnlyFilledLegacy && styles.columnFilterButtonActive,
                            ]}
                            onPress={() => toggleShowOnlyFilledLegacy(themeId)}
                          >
                            <Icon
                              name="filter"
                              size={12}
                              color={showOnlyFilledLegacy ? '#FFFFFF' : '#64748B'}
                            />
                          </TouchableOpacity>
                          <Text style={styles.columnMeta}>{`${legacyFilledCount}/${legacyEntries.length}`}</Text>
                        </View>
                      </View>

                      <ScrollView
                        style={styles.columnScroll}
                        contentContainerStyle={styles.columnBody}
                        nestedScrollEnabled
                      >
                        {visibleLegacyEntries.length === 0 ? (
                          <Text style={styles.themeMetaText}>
                            {showOnlyFilledLegacy
                              ? 'Nenhum item com cor nesta coluna.'
                              : 'Nenhuma chave fora da referência.'}
                          </Text>
                        ) : (
                          visibleLegacyEntries.map(colorItem => {
                            const normalizedValue = normalizeHex(colorItem.value);
                            const isTransparentValue = isTransparentColor(colorItem.value);
                            const rgbaValue = formatRgbaColor(colorItem.value);

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
                                        borderColor: '#000000',
                                      }
                                      : isTransparentValue
                                        ? styles.transparentColorSwatch
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
                                  {colorItem.value ? (
                                    <Text numberOfLines={1} style={styles.colorListValueSecondary}>
                                      {rgbaValue}
                                    </Text>
                                  ) : null}
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
                        <View style={styles.columnHeaderTools}>
                          <View style={[styles.columnHeaderSearchWrap, styles.columnHeaderSearchWrapCompact]}>
                            <Icon name="search" size={14} color="#64748B" />
                            <TextInput
                              value={newSearchByTheme[themeId] || ''}
                              onChangeText={value => setNewSearch(themeId, value)}
                              placeholder=""
                              style={styles.columnHeaderSearchInput}
                            />
                          </View>
                          <View style={styles.columnMetaWrap}>
                            <TouchableOpacity
                              style={[
                                styles.columnFilterButton,
                                showOnlyFilledNew && styles.columnFilterButtonActive,
                              ]}
                              onPress={() => toggleShowOnlyFilledNew(themeId)}
                            >
                              <Icon
                                name="filter"
                                size={12}
                                color={showOnlyFilledNew ? '#FFFFFF' : '#64748B'}
                              />
                            </TouchableOpacity>
                            <Text style={styles.columnMeta}>{`${newFilledCount}/${newCount}`}</Text>
                          </View>
                        </View>
                      </View>

                      <ScrollView
                        ref={ref => {
                          newColumnRefs.current[themeId] = ref;
                        }}
                        style={styles.columnScroll}
                        contentContainerStyle={styles.columnBody}
                        nestedScrollEnabled
                      >
                        {searchFilteredNewEntries.length === 0 ? (
                          <Text style={styles.themeMetaText}>
                            {newSearch
                              ? 'Nenhuma cor encontrada para esta busca.'
                              : showOnlyFilledNew
                              ? 'Nenhuma cor preenchida neste tema.'
                              : 'Sem cores novas cadastradas no banco.'}
                          </Text>
                        ) : (
                          searchFilteredNewEntries.map(item => {
                            const normalizedValue = normalizeHex(item.value);
                            const isTransparentValue = isTransparentColor(item.value);
                            const isRelatedToSelectedPreview =
                              selectedPreviewTokenKeysByTheme[themeId]?.includes(item.key);
                            const isSavingColor = Boolean(savingColorKeys[`${themeId}:${item.key}`]);
                            const canDragColor = Platform.OS === 'web'
                              && Boolean(normalizeThemeColorValue(item.value))
                              && !isSavingColor;
                            const isDragOverTarget = dragOverColorKey === `${themeId}:${item.key}`;
                            const colorSwatchStyle = StyleSheet.flatten([
                              styles.colorSwatch,
                              normalizedValue
                                ? {
                                  backgroundColor: normalizedValue,
                                  borderColor: '#000000',
                                }
                                : isTransparentValue
                                  ? styles.transparentColorSwatch
                                  : styles.missingColorSwatch,
                            ]);
                            const colorCard = (
                              <Pressable
                                onLayout={event => registerNewEntryLayout(
                                  themeId,
                                  item.key,
                                  event.nativeEvent.layout.y,
                                )}
                                onPress={() => handleNewEntryPress(
                                  themeId,
                                  item.key,
                                  item.groupLabel,
                                )}
                                style={[
                                  styles.colorListItem,
                                  isRelatedToSelectedPreview && styles.relatedColorListItem,
                                  isDragOverTarget && styles.colorDropTargetListItem,
                                ]}
                              >
                                <TouchableOpacity
                                  style={styles.colorDeleteButton}
                                  onPress={event => {
                                    event.stopPropagation?.();
                                    if (isSavingColor) return;
                                    confirmClearThemeColor(themeItem, item.key);
                                  }}
                                  disabled={isSavingColor}
                                >
                                  {isSavingColor ? (
                                    <ActivityIndicator size="small" color="#334155" />
                                  ) : (
                                    <Icon name="trash-2" size={12} color="#334155" />
                                  )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.colorEditButton}
                                  onPress={event => {
                                    event.stopPropagation?.();
                                    if (isSavingColor) return;
                                    openSingleColorEditor(themeItem, item.key);
                                  }}
                                  disabled={isSavingColor}
                                >
                                  <Icon name="edit-3" size={12} color="#334155" />
                                </TouchableOpacity>
                                {canDragColor ? React.createElement(
                                  'div',
                                  {
                                    draggable: true,
                                    onDragStart: event => handleNewColorDragStart(event, {
                                      value: item.value,
                                      sourceKey: item.key,
                                      sourceThemeId: themeId,
                                    }),
                                    onDragEnd: handleNewColorDragEnd,
                                    style: {
                                      ...colorSwatchStyle,
                                      cursor: 'grab',
                                      flexShrink: 0,
                                    },
                                    title: `Arraste a cor ${item.key}`,
                                  },
                                ) : (
                                  <View style={colorSwatchStyle} />
                                )}
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

                            if (Platform.OS !== 'web') {
                              return (
                                <React.Fragment key={`${themeItem.id}-new-${item.key}`}>
                                  {colorCard}
                                </React.Fragment>
                              );
                            }

                            return React.createElement(
                              'div',
                              {
                                key: `${themeItem.id}-new-${item.key}`,
                                onDragOver: handleNewColorDragOver,
                                onDragEnter: event => handleNewColorDragEnter(event, themeId, item.key),
                                onDragLeave: event => handleNewColorDragLeave(event, themeId, item.key),
                                onDrop: event => handleNewColorDrop(event, themeItem, themeId, item.key),
                                style: { display: 'block' },
                              },
                              colorCard,
                            );
                          })
                        )}
                      </ScrollView>
                    </View>

                    <View style={[styles.themeColumn, styles.themeColumnHalf]}>
                      <View style={styles.columnHeader}>
                        <View style={styles.columnHeaderTitleWrap}>
                          <Text style={styles.columnTitle}>Preview</Text>
                          <TouchableOpacity
                            style={[
                              styles.columnRnwToggle,
                              showRnwPreview && styles.columnRnwToggleActive,
                            ]}
                            onPress={() => toggleShowRnwPreview(themeId)}
                          >
                            <View
                              style={[
                                styles.columnRnwCheckbox,
                                showRnwPreview && styles.columnRnwCheckboxActive,
                              ]}
                            >
                              {showRnwPreview ? (
                                <Icon name="check" size={10} color="#FFFFFF" />
                              ) : null}
                            </View>
                            <Text
                              style={[
                                styles.columnRnwLabel,
                                showRnwPreview && styles.columnRnwLabelActive,
                              ]}
                            >
                              RNW
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.columnHeaderTools}>
                          <View style={styles.columnHeaderSearchWrap}>
                            <Icon name="search" size={14} color="#64748B" />
                            <TextInput
                              value={previewSearchByTheme[themeId] || ''}
                              onChangeText={value => setPreviewSearch(themeId, value)}
                              placeholder=""
                              style={styles.columnHeaderSearchInput}
                            />
                          </View>
                          <View style={styles.columnMetaWrap}>
                            <TouchableOpacity
                              style={[
                                styles.columnFilterButton,
                                showOnlyFilledPreview && styles.columnFilterButtonActive,
                              ]}
                              onPress={() => toggleShowOnlyFilledPreview(themeId)}
                            >
                              <Icon
                                name="filter"
                                size={12}
                                color={showOnlyFilledPreview ? '#FFFFFF' : '#64748B'}
                              />
                            </TouchableOpacity>
                            <Text style={styles.columnMeta}>{`${previewFilledGroupCount}/${previewGroups.length}`}</Text>
                          </View>
                        </View>
                      </View>

                      <ScrollView
                        ref={ref => {
                          previewColumnRefs.current[themeId] = ref;
                        }}
                        style={styles.columnScroll}
                        contentContainerStyle={styles.previewColumnBody}
                        nestedScrollEnabled
                      >
                        {visiblePreviewGroups.length === 0 ? (
                          <Text style={styles.themeMetaText}>
                            {previewSearch
                              ? 'Nenhum objeto encontrado para esta busca.'
                              : showOnlyFilledPreview
                                ? 'Nenhum objeto com cor neste tema.'
                                : 'Sem objetos para visualizar.'}
                          </Text>
                        ) : visiblePreviewGroups.map(group => (
                          <ThemeObjectPreviewCard
                            key={`${themeItem.id}-preview-${group.label}`}
                            group={group}
                            themeColors={themeItem?.colors || {}}
                            useRnwPreview={showRnwPreview}
                            onLayout={event => registerPreviewGroupLayout(
                              themeId,
                              group.label,
                              event.nativeEvent.layout.y,
                            )}
                            onPress={() => handlePreviewGroupPress(
                              themeId,
                              group.label,
                              newEntriesByGroup,
                            )}
                            onSelectTokens={tokenKeys => handlePreviewTokenPress(
                              themeId,
                              tokenKeys,
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

      <Modal visible={duplicateEditorVisible} transparent animationType="slide" onRequestClose={closeDuplicateEditor}>
        <TouchableWithoutFeedback onPress={closeDuplicateEditor}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheet}>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Duplicar tema</Text>
                    <Text style={styles.modalSubtitle}>
                      {`Origem: ${duplicateSourceTheme?.theme || 'Tema selecionado'}`}
                    </Text>
                  </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 8 }}>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Nome do tema</Text>
                    <TextInput
                      value={duplicateThemeName}
                      onChangeText={setDuplicateThemeName}
                      placeholder="Ex.: Copia do tema"
                      placeholderTextColor="#94A3B8"
                      style={styles.textInput}
                    />
                  </View>

                  <Pressable
                    style={[
                      styles.duplicateOptionCard,
                      duplicateOverwriteExisting && styles.duplicateOptionCardActive,
                    ]}
                    onPress={() => {
                      const nextValue = !duplicateOverwriteExisting;
                      setDuplicateOverwriteExisting(nextValue);

                      if (!nextValue) {
                        setDuplicateTargetThemeId('');
                        setDuplicateTargetDropdownOpen(false);
                        setDuplicateThemeName(buildDuplicateName(duplicateSourceTheme?.theme, themes));
                      }
                    }}
                  >
                    <View
                      style={[
                        styles.duplicateOptionCheckbox,
                        duplicateOverwriteExisting && styles.duplicateOptionCheckboxActive,
                      ]}
                    >
                      {duplicateOverwriteExisting ? <Icon name="check" size={12} color="#0F172A" /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.duplicateOptionTitle}>Sobrescrever tema existente</Text>
                      <Text style={styles.duplicateOptionText}>
                        Substitui somente as cores novas do tema escolhido. As cores antigas permanecem.
                      </Text>
                    </View>
                  </Pressable>

                  {duplicateOverwriteExisting ? (
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>Tema de destino</Text>
                      {duplicateTargetThemes.length === 0 ? (
                        <Text style={styles.helperText}>Nao existe outro tema disponivel para sobrescrever.</Text>
                      ) : (
                        <View style={styles.duplicateDropdownWrap}>
                          <Pressable
                            style={[
                              styles.duplicateDropdownButton,
                              duplicateTargetDropdownOpen && styles.duplicateDropdownButtonActive,
                            ]}
                            onPress={() => setDuplicateTargetDropdownOpen(current => !current)}
                          >
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.duplicateDropdownButtonText,
                                !duplicateTargetThemeId && styles.duplicateDropdownPlaceholder,
                              ]}
                            >
                              {duplicateTargetThemes.find(item => String(item?.id || '') === String(duplicateTargetThemeId || ''))?.theme
                                || 'Escolha um tema'}
                            </Text>
                            <Icon
                              name={duplicateTargetDropdownOpen ? 'chevron-up' : 'chevron-down'}
                              size={16}
                              color="#64748B"
                            />
                          </Pressable>

                          {duplicateTargetDropdownOpen ? (
                            <View style={styles.duplicateDropdownList}>
                              {duplicateTargetThemes.map(themeItem => {
                                const isSelected = String(themeItem?.id || '') === String(duplicateTargetThemeId || '');

                                return (
                                  <Pressable
                                    key={`duplicate-target-${themeItem?.id}`}
                                    style={[
                                      styles.duplicateDropdownItem,
                                      isSelected && styles.duplicateDropdownItemActive,
                                    ]}
                                    onPress={() => {
                                      setDuplicateTargetThemeId(String(themeItem?.id || ''));
                                      setDuplicateThemeName(String(themeItem?.theme || '').trim());
                                      setDuplicateTargetDropdownOpen(false);
                                    }}
                                  >
                                    <Text style={styles.duplicateDropdownItemText}>
                                      {themeItem?.theme || `Tema ${themeItem?.id}`}
                                    </Text>
                                    <Text style={styles.themeMetaText}>#{themeItem?.id}</Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          ) : null}
                        </View>
                      )}
                      <Text style={styles.duplicateWarningText}>
                        A confirmacao sera pedida 2 vezes e a sobrescrita nao tem volta.
                      </Text>
                    </View>
                  ) : null}
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.secondaryButton} onPress={closeDuplicateEditor}>
                    <Text style={styles.secondaryButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      { backgroundColor: palette.primary },
                      isSaving && { opacity: 0.6 },
                    ]}
                    onPress={saveDuplicateTheme}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        {duplicateOverwriteExisting ? 'Sobrescrever tema' : 'Duplicar tema'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={objectEditorVisible} transparent animationType="slide" onRequestClose={closeEditor}>
        <TouchableWithoutFeedback onPress={closeEditor}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheet}>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Editor de objetos</Text>
                    <Text style={styles.modalSubtitle}>Mostra as cores do objeto selecionado para edição.</Text>
                  </View>
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

                  {objectEditorFields.map(field => (
                    <ColorEditor
                      key={field.key}
                      field={field}
                      value={themeDraft[field.key]}
                      onChange={value => setDraftColor(field.key, value)}
                      swatchRows={objectEditorSwatchRows}
                      swatchDropSourceRowIds={['standard', 'legacy', 'new']}
                      swatchDropTargetRowIds={objectEditorHighlightedRowId ? [objectEditorHighlightedRowId] : []}
                      highlightedSwatchRowId={objectEditorHighlightedRowId}
                      onApplySwatchDrop={applyDraftPaletteDrop}
                      showCloseButton={Boolean(editingFieldKey)}
                      onClose={editingFieldKey ? closeEditor : undefined}
                      emphasizeLabel={Boolean(editingFieldKey)}
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

      <Modal visible={themeEditorVisible} transparent animationType="slide" onRequestClose={closeEditor}>
        <TouchableWithoutFeedback onPress={closeEditor}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheet}>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Editor de tema</Text>
                    <Text style={styles.modalSubtitle}>Mostra apenas as cores em uso naquele tema.</Text>
                  </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 8 }}>
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

                  <ColorEditor
                    field={themeEditorField}
                    value={activeThemeEditorColor}
                    onChange={setThemeDraftPaletteColor}
                    swatchRows={themeEditorSwatchRows}
                    selectedSwatchValue={activeThemeEditorColor}
                    onSelectSwatchValue={setSelectedThemeEditorColor}
                    showCloseButton={false}
                    emphasizeLabel={false}
                  />
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
