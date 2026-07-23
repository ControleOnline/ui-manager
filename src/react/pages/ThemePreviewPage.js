import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { api } from '@controleonline/ui-common/src/api';
import styles from './ThemePreviewPage.styles';

// ─── helpers ────────────────────────────────────────────────────────────────

const normalizeHex = value => {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(raw)) return null;
  if (raw.length === 4) return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toUpperCase();
  if (raw.length === 5) return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}${raw[4]}${raw[4]}`.toUpperCase();
  return raw.toUpperCase();
};

const isTransparent = v => typeof v === 'string' && v.trim().toLowerCase() === 'transparent';
const hasValue = v => Boolean(normalizeHex(v) || isTransparent(v));

const withOpacity = (hex, opacity) => {
  const n = normalizeHex(hex);
  if (!n) return hex || '';
  const base = n.length === 9 ? n.slice(0, 7) : n;
  if (opacity >= 1) return base;
  return `${base}${Math.round(opacity * 255).toString(16).padStart(2, '0').toUpperCase()}`;
};

const readableText = color => {
  if (!color || isTransparent(color)) return '#111111';
  const n = normalizeHex(color);
  if (!n) return '#111111';
  const r = parseInt(n.slice(1, 3), 16);
  const g = parseInt(n.slice(3, 5), 16);
  const b = parseInt(n.slice(5, 7), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 168 ? '#111111' : '#FFFFFF';
};

const formatApiError = e => e?.message || e?.description || 'Erro ao carregar tema.';

const normalizeColors = colors => {
  if (!colors) return {};
  if (typeof colors === 'object' && !Array.isArray(colors)) return colors;
  if (typeof colors !== 'string') return {};
  try { const p = JSON.parse(colors); return p && typeof p === 'object' && !Array.isArray(p) ? p : {}; }
  catch { return {}; }
};

// ─── fallbacks RNW ──────────────────────────────────────────────────────────

const RNW = {
  appBackground: '#F1F5F9', containerBackground: '#FFFFFF', containerTransparentBackground: 'transparent',
  containerBorder: '#E2E8F0', pageBackground: '#F8FAFC', pageBorder: '#E2E8F0',
  panelBackground: '#FFFFFF', panelBorder: '#E2E8F0', screenBackground: '#F8FAFC',
  sectionBackground: '#F8FAFC', sectionBorder: '#E2E8F0', sheetBackground: '#FFFFFF',
  sheetBorder: '#E2E8F0', surface: '#FFFFFF',
  navbarBackground: '#0F172A', navbarBorder: '#1E293B', tabBarBackground: '#FFFFFF',
  tabBarBorder: '#E2E8F0', toolbarBackground: '#F8FAFC', toolbarBorder: '#E2E8F0',
  badgeBackground: '#E2E8F0', badgeBorder: '#CBD5E1', badgeDisabledBackground: '#F1F5F9',
  badgeDisabledText: '#94A3B8', badgeIcon: '#64748B', badgeSelectedBackground: '#2563EB',
  badgeSelectedBorder: '#1D4ED8', badgeSelectedText: '#FFFFFF', badgeShadow: '#0000001A',
  badgeText: '#0F172A',
  buttonBackground: '#2563EB', buttonBackgroundSecondary: '#F8FAFC', buttonBorder: '#1D4ED8',
  buttonBorderSecondary: '#CBD5E1', buttonDisabledBackground: '#E2E8F0', buttonDisabledOpacity: '#00000033',
  buttonDisabledText: '#94A3B8', buttonFocusBorder: '#3B82F6', buttonHoverBackground: '#1D4ED8',
  buttonIcon: '#FFFFFF', buttonIconSecondary: '#0F172A', buttonPressedBackground: '#1E40AF',
  buttonShadow: '#2563EB33', buttonText: '#FFFFFF', buttonTextSecondary: '#0F172A',
  cardBackground: '#FFFFFF', cardBorder: '#E2E8F0', cardDisabledBackground: '#F8FAFC',
  cardDisabledText: '#94A3B8', cardHeaderBackground: '#F8FAFC', cardHeaderText: '#0F172A',
  cardIcon: '#64748B', cardIconColor: '#64748B', cardIconBackground: '#FFFFFF', cardSelectedBackground: '#EFF6FF', cardSelectedBorder: '#BFDBFE',
  cardSelectedText: '#1D4ED8', cardShadow: '#0000001A', cardText: '#0F172A',
  checkboxBackground: '#FFFFFF', checkboxBorder: '#94A3B8', checkboxDisabledBackground: '#F1F5F9',
  checkboxDisabledBorder: '#CBD5E1', checkboxDisabledMark: '#94A3B8', checkboxSelectedBackground: '#2563EB',
  checkboxSelectedBorder: '#1D4ED8', checkboxSelectedMark: '#FFFFFF', checkboxText: '#0F172A',
  chipBackground: '#E2E8F0', chipBorder: '#CBD5E1', chipDisabledBackground: '#F1F5F9',
  chipDisabledText: '#94A3B8', chipIcon: '#64748B', chipSelectedBackground: '#2563EB',
  chipSelectedBorder: '#1D4ED8', chipSelectedText: '#FFFFFF', chipShadow: '#0000001A', chipText: '#0F172A',
  dividerBackground: '#E2E8F0', dividerBorder: '#CBD5E1', dividerText: '#94A3B8',
  footerBackground: '#0F172A', footerBorder: '#1E293B', footerIcon: '#94A3B8',
  footerLink: '#60A5FA', footerText: '#CBD5E1',
  headerBackground: '#FFFFFF', headerBorder: '#E2E8F0', headerIcon: '#64748B',
  headerLink: '#2563EB', headerText: '#0F172A',
  iconBackground: '#FFFFFF', iconColor: '#2563EB', iconActive: '#1D4ED8', iconDanger: '#DC2626', iconDisabled: '#94A3B8',
  iconInfo: '#0EA5E9', iconInverse: '#FFFFFF', iconMuted: '#64748B', iconSuccess: '#16A34A',
  iconText: '#0F172A', iconWarning: '#D97706',
  inputBackground: '#FFFFFF', inputBorder: '#CBD5E1', inputFilledBorder: '#94A3B8',
  inputDisabledBackground: '#F1F5F9', inputDisabledBorder: '#E2E8F0', inputDisabledText: '#94A3B8',
  inputErrorBackground: '#FEF2F2', inputErrorBorder: '#DC2626', inputErrorText: '#B91C1C',
  inputFocusBorder: '#2563EB', inputIcon: '#64748B', inputPlaceholderText: '#94A3B8', inputText: '#0F172A',
  linkDisabledText: '#94A3B8', linkHoverText: '#1D4ED8', linkText: '#2563EB', linkVisitedText: '#7C3AED',
  listItemActiveBackground: '#EFF6FF', listItemActiveBorder: '#BFDBFE', listItemBackground: '#FFFFFF',
  listItemBorder: '#E2E8F0', listItemDisabledText: '#94A3B8', listItemEvenRow: '#F8FAFC',
  listItemIcon: '#64748B', listItemOddRow: '#FFFFFF', listItemSelectedBackground: '#EFF6FF',
  listItemSelectedBorder: '#BFDBFE', listItemSubtitleText: '#64748B', listItemText: '#0F172A',
  loadingBackground: '#FFFFFF', loadingBorder: '#E2E8F0', loadingDisabledBackground: '#F1F5F9',
  loadingDisabledText: '#94A3B8', loadingIcon: '#2563EB', loadingOverlay: '#0000007A',
  loadingShadow: '#0000001A', loadingSpinner: '#2563EB', loadingText: '#64748B',
  menuActiveBackground: '#EFF6FF', menuActiveBorder: '#BFDBFE', menuActiveIcon: '#1D4ED8',
  menuActiveText: '#1D4ED8', menuBackground: '#0F172A', menuBorder: '#1E293B',
  menuDisabledBackground: '#1E293B', menuDisabledBorder: '#334155', menuDisabledIcon: '#475569',
  menuDisabledText: '#475569', menuIcon: '#94A3B8', menuSelectedBackground: '#1E293B',
  menuSelectedBorder: '#334155', menuSelectedText: '#FFFFFF', menuShadow: '#00000033', menuText: '#CBD5E1',
  modalBackground: '#FFFFFF', modalBorder: '#E2E8F0', modalCloseIcon: '#64748B',
  modalHeaderText: '#0F172A', modalOverlay: '#0000007A', modalShadow: '#0000001A', modalText: '#334155',
  tableActionBackground: '#FFFFFF', tableActionBorder: '#E2E8F0', tableActionIcon: '#64748B',
  tableFilterBackground: '#FFFFFF', tableFilterBorder: '#CBD5E1', tableFilterText: '#0F172A',
  tableFooterBackground: '#F8FAFC', tableFooterBorder: '#E2E8F0', tableFooterText: '#64748B',
  tableHeaderBackground: '#F8FAFC', tableHeaderBorder: '#E2E8F0', tableHeaderIcon: '#64748B',
  tableHeaderText: '#0F172A', tableRowBackground: '#FFFFFF', tableRowBorder: '#E2E8F0',
  tableRowEvenBackground: '#F8FAFC', tableRowMutedText: '#64748B', tableRowOddBackground: '#FFFFFF',
  tableRowSelectedBackground: '#EFF6FF', tableRowSelectedBorder: '#BFDBFE', tableRowText: '#0F172A',
  tableToolbarBackground: '#FFFFFF', tableToolbarBorder: '#E2E8F0', tableToolbarText: '#0F172A',
  selectBackground: '#FFFFFF', selectBorder: '#CBD5E1', selectIcon: '#64748B',
  selectOptionBackground: '#FFFFFF', selectOptionBorder: '#E2E8F0', selectOptionSelectedBackground: '#EFF6FF',
  selectOptionSelectedText: '#1D4ED8', selectPlaceholderText: '#94A3B8', selectText: '#0F172A',
  navigationActiveBackground: '#EFF6FF', navigationActiveBorder: '#BFDBFE', navigationActiveIcon: '#1D4ED8',
  navigationActiveText: '#1D4ED8', navigationBackground: '#FFFFFF', navigationBorder: '#E2E8F0',
  navigationDisabledBackground: '#F8FAFC', navigationDisabledBorder: '#E2E8F0', navigationDisabledIcon: '#CBD5E1',
  navigationDisabledText: '#94A3B8', navigationIcon: '#64748B', navigationShadow: '#0000001A',
  navigationText: '#0F172A',
  overlayBackground: '#00000066', overlayBorder: 'transparent', overlayShadow: '#0000001A',
  radioBackground: '#FFFFFF', radioBorder: '#94A3B8', radioDisabledBackground: '#F1F5F9',
  radioDisabledBorder: '#CBD5E1', radioDisabledDot: '#94A3B8', radioSelectedBackground: '#FFFFFF',
  radioSelectedBorder: '#2563EB', radioSelectedDot: '#2563EB', radioText: '#0F172A',
  switchDisabledThumb: '#94A3B8', switchDisabledTrack: '#E2E8F0',
  switchOffThumb: '#FFFFFF', switchOffTrack: '#CBD5E1',
  switchOnThumb: '#FFFFFF', switchOnTrack: '#2563EB',
  textDanger: '#DC2626', textDisabled: '#94A3B8', textInverse: '#FFFFFF', textLink: '#2563EB',
  textMuted: '#64748B', textPlaceholder: '#94A3B8', textPrimary: '#0F172A',
  textSecondary: '#64748B', textSuccess: '#16A34A', textWarning: '#D97706',
  toastBackground: '#FFFFFF', toastBorder: '#E2E8F0', toastDangerBackground: '#FEF2F2',
  toastDangerBorder: '#FECACA', toastDangerIcon: '#DC2626', toastDangerText: '#B91C1C',
  toastIcon: '#64748B', toastInfoBackground: '#EFF6FF', toastInfoBorder: '#BFDBFE',
  toastInfoIcon: '#2563EB', toastInfoText: '#1D4ED8', toastShadow: '#0000001A',
  toastSuccessBackground: '#F0FDF4', toastSuccessBorder: '#BBF7D0', toastSuccessIcon: '#16A34A',
  toastSuccessText: '#15803D', toastText: '#0F172A', toastWarningBackground: '#FFFBEB',
  toastWarningBorder: '#FDE68A', toastWarningIcon: '#D97706', toastWarningText: '#B45309',
};

// ─── grupos de tokens (themes-map.md) ────────────────────────────────────────

const THEME_MAP_GROUPS = [
  {
    label: 'estrutura da tela',
    tokens: ['appBackground','containerBackground','containerTransparentBackground','containerBorder',
      'pageBackground','pageBorder','panelBackground','panelBorder','screenBackground',
      'sectionBackground','sectionBorder','sheetBackground','sheetBorder','surface'],
  },
  {
    label: 'barra',
    tokens: ['navbarBackground','navbarBorder','tabBarBackground','tabBarBorder','toolbarBackground','toolbarBorder'],
  },
  {
    label: 'badge',
    tokens: ['badgeBackground','badgeBorder','badgeDisabledBackground','badgeDisabledText','badgeIcon',
      'badgeSelectedBackground','badgeSelectedBorder','badgeSelectedText','badgeShadow','badgeText'],
  },
  {
    label: 'button',
    tokens: ['buttonBackground','buttonBackgroundSecondary','buttonBorder','buttonBorderSecondary',
      'buttonDisabledBackground','buttonDisabledOpacity','buttonDisabledText','buttonFocusBorder',
      'buttonHoverBackground','buttonIcon','buttonIconSecondary','buttonPressedBackground',
      'buttonShadow','buttonText','buttonTextSecondary'],
  },
  {
    label: 'card',
    tokens: ['cardBackground','cardBorder','cardDisabledBackground','cardDisabledText',
      'cardHeaderBackground','cardHeaderText','cardIcon','cardIconColor','cardSelectedBackground',
      'cardSelectedBorder','cardSelectedText','cardShadow','cardText'],
  },
  {
    label: 'checkbox',
    tokens: ['checkboxBackground','checkboxBorder','checkboxDisabledBackground','checkboxDisabledBorder',
      'checkboxDisabledMark','checkboxSelectedBackground','checkboxSelectedBorder',
      'checkboxSelectedMark','checkboxText'],
  },
  {
    label: 'chip',
    tokens: ['chipBackground','chipBorder','chipDisabledBackground','chipDisabledText','chipIcon',
      'chipSelectedBackground','chipSelectedBorder','chipSelectedText','chipShadow','chipText'],
  },
  {
    label: 'divider',
    tokens: ['dividerBackground','dividerBorder','dividerText'],
  },
  {
    label: 'footer',
    tokens: ['footerBackground','footerBorder','footerIcon','footerLink','footerText'],
  },
  {
    label: 'header',
    tokens: ['headerBackground','headerBorder','headerIcon','headerLink','headerText'],
  },
  {
    label: 'icon',
    tokens: ['iconColor','iconActive','iconDanger','iconDisabled','iconInfo',
      'iconInverse','iconMuted','iconSuccess','iconText','iconWarning'],
  },
  {
    label: 'input',
    tokens: ['inputBackground','inputBorder','inputFilledBorder','inputDisabledBackground',
      'inputDisabledBorder','inputDisabledText','inputErrorBackground','inputErrorBorder',
      'inputErrorText','inputFocusBorder','inputIcon','inputPlaceholderText','inputText'],
  },
  {
    label: 'link',
    tokens: ['linkDisabledText','linkHoverText','linkText','linkVisitedText'],
  },
  {
    label: 'listItem',
    tokens: ['listItemActiveBackground','listItemActiveBorder','listItemBackground','listItemBorder',
      'listItemDisabledText','listItemEvenRow','listItemIcon','listItemOddRow',
      'listItemSelectedBackground','listItemSelectedBorder','listItemSubtitleText','listItemText'],
  },
  {
    label: 'loading',
    tokens: ['loadingBackground','loadingBorder','loadingDisabledBackground','loadingDisabledText',
      'loadingIcon','loadingOverlay','loadingShadow','loadingSpinner','loadingText'],
  },
  {
    label: 'menu',
    tokens: ['menuActiveBackground','menuActiveBorder','menuActiveIcon','menuActiveText',
      'menuBackground','menuBorder','menuDisabledBackground','menuDisabledBorder',
      'menuDisabledIcon','menuDisabledText','menuIcon','menuSelectedBackground',
      'menuSelectedBorder','menuSelectedText','menuShadow','menuText'],
  },
  {
    label: 'modal',
    tokens: ['modalBackground','modalBorder','modalCloseIcon','modalHeaderText',
      'modalOverlay','modalShadow','modalText'],
  },
  {
    label: 'table',
    tokens: ['tableActionBackground','tableActionBorder','tableActionIcon',
      'tableFilterBackground','tableFilterBorder','tableFilterText',
      'tableFooterBackground','tableFooterBorder','tableFooterText',
      'tableHeaderBackground','tableHeaderBorder','tableHeaderIcon','tableHeaderText',
      'tableRowBackground','tableRowBorder','tableRowEvenBackground','tableRowMutedText',
      'tableRowOddBackground','tableRowSelectedBackground','tableRowSelectedBorder','tableRowText',
      'tableToolbarBackground','tableToolbarBorder','tableToolbarText'],
  },
  {
    label: 'select',
    tokens: ['selectBackground','selectBorder','selectIcon','selectOptionBackground',
      'selectOptionBorder','selectOptionSelectedBackground','selectOptionSelectedText',
      'selectPlaceholderText','selectText'],
  },
  {
    label: 'navigation',
    tokens: ['navigationActiveBackground','navigationActiveBorder','navigationActiveIcon',
      'navigationActiveText','navigationBackground','navigationBorder',
      'navigationDisabledBackground','navigationDisabledBorder','navigationDisabledIcon',
      'navigationDisabledText','navigationIcon','navigationShadow','navigationText'],
  },
  {
    label: 'overlay',
    tokens: ['overlayBackground','overlayBorder','overlayShadow'],
  },
  {
    label: 'radio',
    tokens: ['radioBackground','radioBorder','radioDisabledBackground','radioDisabledBorder',
      'radioDisabledDot','radioSelectedBackground','radioSelectedBorder',
      'radioSelectedDot','radioText'],
  },
  {
    label: 'switch',
    tokens: ['switchDisabledThumb','switchDisabledTrack','switchOffThumb',
      'switchOffTrack','switchOnThumb','switchOnTrack'],
  },
  {
    label: 'text',
    tokens: ['textDanger','textDisabled','textInverse','textLink','textMuted',
      'textPlaceholder','textPrimary','textSecondary','textSuccess','textWarning'],
  },
  {
    label: 'toast',
    tokens: ['toastBackground','toastBorder','toastDangerBackground','toastDangerBorder',
      'toastDangerIcon','toastDangerText','toastIcon','toastInfoBackground','toastInfoBorder',
      'toastInfoIcon','toastInfoText','toastShadow','toastSuccessBackground','toastSuccessBorder',
      'toastSuccessIcon','toastSuccessText','toastText','toastWarningBackground',
      'toastWarningBorder','toastWarningIcon','toastWarningText'],
  },
];

// ─── resolvers ───────────────────────────────────────────────────────────────

const resolveColor = (themeColors, key, rnwMode) => {
  const raw = themeColors?.[key];
  if (isTransparent(raw)) return 'transparent';
  const n = normalizeHex(raw);
  if (n) return n;
  return '';
};

const tokenHasOwnColor = (themeColors, key) => hasValue(themeColors?.[key]);

const hasUndefinedToken = (themeColors, tokenKeys) => {
  const keys = Array.isArray(tokenKeys) ? tokenKeys : [tokenKeys];
  return keys.some(key => !tokenHasOwnColor(themeColors, key));
};

const getTokenLabel = (themeColors, key, rnwMode) => {
  const raw = themeColors?.[key];
  if (raw) return normalizeHex(raw) || raw;
  return 'undefined';
};

const safeColor = color =>
  (color && !isTransparent(color)) ? color : undefined;

// ─── CheckboxToggle ──────────────────────────────────────────────────────────

const CheckboxToggle = ({ label, value, onChange, green = false }) => (
  <Pressable style={styles.toggleItem} onPress={() => onChange(!value)}>
    <View style={[styles.toggleBox, value && (green ? styles.toggleBoxGreen : styles.toggleBoxActive)]}>
      {value && <Text style={styles.toggleMark}>✓</Text>}
    </View>
    <Text style={[styles.toggleLabel, value && (green ? styles.toggleLabelGreen : styles.toggleLabelActive)]}>
      {label}
    </Text>
  </Pressable>
);

// ─── HoverZone ───────────────────────────────────────────────────────────────

const HoverZone = ({ tokenKeys, themeColors, rnwMode, showUndefined = false, style, children }) => {
  const [hovered, setHovered] = useState(false);
  const keys = Array.isArray(tokenKeys) ? tokenKeys : [tokenKeys];
  const isUndefined = showUndefined && hasUndefinedToken(themeColors, keys);

  return (
    <Pressable
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[style, isUndefined && styles.undefinedZone, { zIndex: hovered ? 200 : 1 }]}
    >
      {children}
      {hovered && (
        <View style={styles.tooltipWrap}>
          {keys.map(key => {
            const raw = themeColors?.[key];
            const resolved = resolveColor(themeColors, key, rnwMode);
            const displayColor = resolved && !isTransparent(resolved) ? resolved : null;
            const label = getTokenLabel(themeColors, key, rnwMode);
            return (
              <View key={key} style={styles.tooltipRow}>
                <View style={[styles.tooltipSwatch, displayColor ? { backgroundColor: displayColor } : { backgroundColor: '#475569' }]} />
                <Text style={styles.tooltipKey} numberOfLines={1}>{key}</Text>
                <Text style={styles.tooltipValue}>{label}</Text>
              </View>
            );
          })}
        </View>
      )}
    </Pressable>
  );
};

// ─── TokenSwatch ─────────────────────────────────────────────────────────────

const TokenSwatch = ({ tokenKey, themeColors, rnwMode, showUndefined }) => {
  const [hovered, setHovered] = useState(false);
  const raw = themeColors?.[tokenKey];
  const isDefined = hasValue(raw);
  const resolved = resolveColor(themeColors, tokenKey, rnwMode);
  const isHighlighted = showUndefined && !isDefined;
  const displayColor = resolved && !isTransparent(resolved) ? resolved : null;
  const shortKey = tokenKey.length > 14 ? tokenKey.slice(0, 13) + '…' : tokenKey;
  const labelRaw = getTokenLabel(themeColors, tokenKey, rnwMode);

  return (
    <Pressable
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[styles.swatchWrap, { zIndex: hovered ? 200 : 1 }]}
    >
      <View
        style={[
          styles.swatch,
          isHighlighted
            ? styles.swatchUndef
            : displayColor
              ? { backgroundColor: displayColor, borderColor: 'rgba(0,0,0,0.1)' }
              : isTransparent(resolved)
                ? styles.swatchTransparent
                : styles.swatchEmpty,
        ]}
      />
      <Text
        style={[styles.swatchLabel, isHighlighted && styles.swatchLabelUndef]}
        numberOfLines={1}
      >
        {shortKey}
      </Text>
      {hovered && (
        <View style={styles.tooltipWrap}>
          <View style={styles.tooltipRow}>
            <View style={[styles.tooltipSwatch, displayColor ? { backgroundColor: displayColor } : { backgroundColor: '#475569' }]} />
            <Text style={styles.tooltipKey} numberOfLines={1}>{tokenKey}</Text>
          </View>
          <Text style={styles.tooltipValue}>{labelRaw}</Text>
        </View>
      )}
    </Pressable>
  );
};

// ─── visual preview por grupo ─────────────────────────────────────────────────

const renderGroupVisual = (groupLabel, themeColors, rnwMode, showUndefined) => {
  const gc = key => resolveColor(themeColors, key, rnwMode);
  const sc = (key, fb) => safeColor(gc(key), fb);
  const Hz = ({ keys, style, children }) => (
    <HoverZone
      tokenKeys={keys}
      themeColors={themeColors}
      rnwMode={rnwMode}
      showUndefined={showUndefined}
      style={style}
    >
      {children}
    </HoverZone>
  );

  switch (groupLabel) {

    case 'estrutura da tela':
      return (
        <Hz keys={['appBackground', 'screenBackground']}
          style={[styles.miniSurface, { backgroundColor: sc('appBackground', '#F1F5F9'), borderColor: sc('containerBorder', '#E2E8F0') }]}>
          <Hz keys={['containerBackground', 'containerBorder']}
            style={[styles.miniSurface, { backgroundColor: sc('containerBackground', '#FFFFFF'), borderColor: sc('containerBorder', '#E2E8F0') }]}>
            <Hz keys={['sectionBackground', 'sectionBorder', 'surface']}
              style={[styles.miniSurface, { backgroundColor: sc('sectionBackground', '#F8FAFC'), borderColor: sc('sectionBorder', '#E2E8F0') }]}>
              <Text style={[styles.miniText, { color: sc('textPrimary', '#0F172A') }]}>section / surface</Text>
            </Hz>
          </Hz>
        </Hz>
      );

    case 'barra':
      return (
        <View style={styles.miniStack}>
          <Hz keys={['navbarBackground', 'navbarBorder']}
            style={[styles.miniBar, { backgroundColor: sc('navbarBackground', '#0F172A'), borderColor: sc('navbarBorder', '#1E293B') }]}>
            <Text style={[styles.miniBarText, { color: readableText(gc('navbarBackground')) }]}>navbar</Text>
            <Icon name="menu" size={10} color={readableText(gc('navbarBackground'))} />
          </Hz>
          <Hz keys={['toolbarBackground', 'toolbarBorder']}
            style={[styles.miniBar, { backgroundColor: sc('toolbarBackground', '#F8FAFC'), borderColor: sc('toolbarBorder', '#E2E8F0') }]}>
            <Text style={[styles.miniBarText, { color: readableText(gc('toolbarBackground')) }]}>toolbar</Text>
            <Icon name="sliders" size={10} color={readableText(gc('toolbarBackground'))} />
          </Hz>
          <Hz keys={['tabBarBackground', 'tabBarBorder']}
            style={[styles.miniBar, { backgroundColor: sc('tabBarBackground', '#FFFFFF'), borderColor: sc('tabBarBorder', '#E2E8F0') }]}>
            <Text style={[styles.miniBarText, { color: readableText(gc('tabBarBackground')) }]}>tabBar</Text>
          </Hz>
        </View>
      );

    case 'badge':
      return (
        <View style={styles.miniRow}>
          <Hz keys={['badgeBackground', 'badgeBorder', 'badgeText']}
            style={[styles.miniPill, { backgroundColor: sc('badgeBackground', '#E2E8F0'), borderColor: sc('badgeBorder', '#CBD5E1') }]}>
            <Text style={[styles.miniPillText, { color: sc('badgeText', '#0F172A') }]}>base</Text>
          </Hz>
          <Hz keys={['badgeSelectedBackground', 'badgeSelectedBorder', 'badgeSelectedText']}
            style={[styles.miniPill, { backgroundColor: sc('badgeSelectedBackground', '#2563EB'), borderColor: sc('badgeSelectedBorder', '#1D4ED8') }]}>
            <Text style={[styles.miniPillText, { color: sc('badgeSelectedText', '#FFFFFF') }]}>sel.</Text>
          </Hz>
          <Hz keys={['badgeDisabledBackground', 'badgeDisabledText']}
            style={[styles.miniPill, { backgroundColor: sc('badgeDisabledBackground', '#F1F5F9'), borderColor: sc('badgeBorder', '#CBD5E1') }]}>
            <Text style={[styles.miniPillText, { color: sc('badgeDisabledText', '#94A3B8') }]}>off</Text>
          </Hz>
        </View>
      );

    case 'button':
      return (
        <View style={styles.miniStack}>
          <View style={styles.miniRow}>
            <Hz keys={['buttonBackground', 'buttonBorder', 'buttonText', 'buttonIcon']}
              style={[styles.miniBtn, { backgroundColor: sc('buttonBackground', '#2563EB'), borderColor: sc('buttonBorder', '#1D4ED8') }]}>
              <Text style={[styles.miniBtnText, { color: sc('buttonText', '#FFFFFF') }]}>Primário</Text>
            </Hz>
            <Hz keys={['buttonBackgroundSecondary', 'buttonBorderSecondary', 'buttonTextSecondary', 'buttonIconSecondary']}
              style={[styles.miniBtn, { backgroundColor: sc('buttonBackgroundSecondary', '#F8FAFC'), borderColor: sc('buttonBorderSecondary', '#CBD5E1') }]}>
              <Text style={[styles.miniBtnText, { color: sc('buttonTextSecondary', '#0F172A') }]}>Sec.</Text>
            </Hz>
          </View>
          <Hz keys={['buttonDisabledBackground', 'buttonDisabledText', 'buttonDisabledOpacity']}
            style={[styles.miniBtn, { backgroundColor: sc('buttonDisabledBackground', '#E2E8F0'), borderColor: sc('buttonDisabledBackground', '#E2E8F0') }]}>
            <Text style={[styles.miniBtnText, { color: sc('buttonDisabledText', '#94A3B8') }]}>Desabilitado</Text>
          </Hz>
        </View>
      );

    case 'card':
      return (
        <Hz keys={['cardBackground', 'cardBorder']}
          style={[styles.miniCard, { backgroundColor: sc('cardBackground', '#FFFFFF'), borderColor: sc('cardBorder', '#E2E8F0') }]}>
          <Hz keys={['cardHeaderBackground', 'cardHeaderText', 'cardIcon', 'cardIconColor']}
            style={[styles.miniCardHeader, { backgroundColor: sc('cardHeaderBackground', '#F8FAFC'), borderBottomColor: sc('cardBorder', '#E2E8F0') }]}>
            <Text style={[styles.miniText, { fontWeight: '900', color: sc('cardHeaderText', '#0F172A') }]}>Card header</Text>
            <Icon name="more-horizontal" size={10} color={sc('cardIconColor', '#64748B')} />
          </Hz>
          <Hz keys={['cardText', 'cardBackground']}
            style={styles.miniCardBody}>
            <Text style={[styles.miniText, { color: sc('cardText', '#0F172A') }]}>Conteúdo do card</Text>
          </Hz>
        </Hz>
      );

    case 'checkbox':
      return (
        <View style={styles.miniStack}>
          <View style={styles.miniRow}>
            <Hz keys={['checkboxBackground', 'checkboxBorder', 'checkboxText']} style={styles.miniRow}>
              <View style={[styles.miniCheck, { backgroundColor: sc('checkboxBackground', '#FFFFFF'), borderColor: sc('checkboxBorder', '#94A3B8') }]} />
              <Text style={[styles.miniText, { color: sc('checkboxText', '#0F172A') }]}>Normal</Text>
            </Hz>
          </View>
          <View style={styles.miniRow}>
            <Hz keys={['checkboxSelectedBackground', 'checkboxSelectedBorder', 'checkboxSelectedMark']} style={styles.miniRow}>
              <View style={[styles.miniCheck, { backgroundColor: sc('checkboxSelectedBackground', '#2563EB'), borderColor: sc('checkboxSelectedBorder', '#1D4ED8') }]}>
                <Text style={[styles.miniCheckMark, { color: sc('checkboxSelectedMark', '#FFFFFF') }]}>✓</Text>
              </View>
              <Text style={[styles.miniText, { color: sc('checkboxText', '#0F172A') }]}>Selecionado</Text>
            </Hz>
          </View>
          <View style={styles.miniRow}>
            <Hz keys={['checkboxDisabledBackground', 'checkboxDisabledBorder', 'checkboxDisabledMark']} style={styles.miniRow}>
              <View style={[styles.miniCheck, { backgroundColor: sc('checkboxDisabledBackground', '#F1F5F9'), borderColor: sc('checkboxDisabledBorder', '#CBD5E1') }]} />
              <Text style={[styles.miniText, { color: sc('checkboxDisabledMark', '#94A3B8') }]}>Desabilitado</Text>
            </Hz>
          </View>
        </View>
      );

    case 'chip':
      return (
        <View style={styles.miniRow}>
          <Hz keys={['chipBackground', 'chipBorder', 'chipText']}
            style={[styles.miniPill, { backgroundColor: sc('chipBackground', '#E2E8F0'), borderColor: sc('chipBorder', '#CBD5E1') }]}>
            <Text style={[styles.miniPillText, { color: sc('chipText', '#0F172A') }]}>base</Text>
          </Hz>
          <Hz keys={['chipSelectedBackground', 'chipSelectedBorder', 'chipSelectedText']}
            style={[styles.miniPill, { backgroundColor: sc('chipSelectedBackground', '#2563EB'), borderColor: sc('chipSelectedBorder', '#1D4ED8') }]}>
            <Text style={[styles.miniPillText, { color: sc('chipSelectedText', '#FFFFFF') }]}>sel.</Text>
          </Hz>
          <Hz keys={['chipDisabledBackground', 'chipDisabledText']}
            style={[styles.miniPill, { backgroundColor: sc('chipDisabledBackground', '#F1F5F9'), borderColor: sc('chipBorder', '#CBD5E1') }]}>
            <Text style={[styles.miniPillText, { color: sc('chipDisabledText', '#94A3B8') }]}>off</Text>
          </Hz>
        </View>
      );

    case 'divider':
      return (
        <View style={styles.miniStack}>
          <Hz keys={['dividerText']}><Text style={[styles.miniText, { color: sc('dividerText', '#94A3B8') }]}>Seção acima</Text></Hz>
          <Hz keys={['dividerBackground', 'dividerBorder']}
            style={[styles.miniDivider, { backgroundColor: sc('dividerBackground', '#E2E8F0') }]} />
          <Hz keys={['dividerText']}><Text style={[styles.miniText, { color: sc('dividerText', '#94A3B8') }]}>Seção abaixo</Text></Hz>
        </View>
      );

    case 'footer':
      return (
        <Hz keys={['footerBackground', 'footerBorder']}
          style={[styles.miniBar, { backgroundColor: sc('footerBackground', '#0F172A'), borderColor: sc('footerBorder', '#1E293B') }]}>
          <Text style={[styles.miniBarText, { color: sc('footerText', '#CBD5E1') }]}>Footer</Text>
          <View style={styles.miniRow}>
            <Icon name="mail" size={10} color={sc('footerIcon', '#94A3B8')} />
            <Text style={[styles.miniBarText, { color: sc('footerLink', '#60A5FA') }]}>Link</Text>
          </View>
        </Hz>
      );

    case 'header':
      return (
        <Hz keys={['headerBackground', 'headerBorder']}
          style={[styles.miniBar, { backgroundColor: sc('headerBackground', '#FFFFFF'), borderColor: sc('headerBorder', '#E2E8F0') }]}>
          <Text style={[styles.miniBarText, { color: sc('headerText', '#0F172A') }]}>Header</Text>
          <View style={styles.miniRow}>
            <Icon name="bell" size={10} color={sc('headerIcon', '#64748B')} />
            <Text style={[styles.miniBarText, { color: sc('headerLink', '#2563EB') }]}>Link</Text>
          </View>
        </Hz>
      );

    case 'icon': {
      const iconData = [
        { key: 'iconColor', name: 'star' }, { key: 'iconActive', name: 'zap' },
        { key: 'iconDanger', name: 'alert-circle' }, { key: 'iconDisabled', name: 'slash' },
        { key: 'iconInfo', name: 'info' }, { key: 'iconMuted', name: 'minus-circle' },
        { key: 'iconSuccess', name: 'check-circle' }, { key: 'iconWarning', name: 'alert-triangle' },
        { key: 'iconText', name: 'type' }, { key: 'iconInverse', name: 'sun' },
      ];
      return (
        <View style={styles.miniRow}>
          {iconData.map(item => (
            <Hz key={item.key} tokenKeys={[item.key]} themeColors={themeColors} rnwMode={rnwMode}
              style={[styles.miniIconBubble, { backgroundColor: withOpacity(sc(item.key, '#64748B'), 0.12) }]}>
              <Icon name={item.name} size={11} color={sc(item.key, '#64748B')} />
            </Hz>
          ))}
        </View>
      );
    }

    case 'input':
      return (
        <View style={styles.miniStack}>
          <Hz keys={['inputBackground', 'inputBorder', 'inputPlaceholderText', 'inputIcon']}
            style={[styles.miniField, { backgroundColor: sc('inputBackground', '#FFFFFF'), borderColor: sc('inputBorder', '#CBD5E1') }]}>
            <Text style={[styles.miniFieldText, { color: sc('inputPlaceholderText', '#94A3B8') }]}>Placeholder</Text>
            <Icon name="search" size={9} color={sc('inputIcon', '#64748B')} />
          </Hz>
          <Hz keys={['inputBackground', 'inputFilledBorder', 'inputFocusBorder', 'inputText']}
            style={[styles.miniField, { backgroundColor: sc('inputBackground', '#FFFFFF'), borderColor: sc('inputFocusBorder', '#2563EB') }]}>
            <Text style={[styles.miniFieldText, { color: sc('inputText', '#0F172A') }]}>Preenchido</Text>
          </Hz>
          <Hz keys={['inputErrorBackground', 'inputErrorBorder', 'inputErrorText']}
            style={[styles.miniField, { backgroundColor: sc('inputErrorBackground', '#FEF2F2'), borderColor: sc('inputErrorBorder', '#DC2626') }]}>
            <Text style={[styles.miniFieldText, { color: sc('inputErrorText', '#B91C1C') }]}>Erro</Text>
          </Hz>
          <Hz keys={['inputDisabledBackground', 'inputDisabledBorder', 'inputDisabledText']}
            style={[styles.miniField, { backgroundColor: sc('inputDisabledBackground', '#F1F5F9'), borderColor: sc('inputDisabledBorder', '#E2E8F0') }]}>
            <Text style={[styles.miniFieldText, { color: sc('inputDisabledText', '#94A3B8') }]}>Desabilitado</Text>
          </Hz>
        </View>
      );

    case 'link':
      return (
        <View style={styles.miniRow}>
          <Hz keys={['linkText']}><Text style={[styles.miniLinkText, { color: sc('linkText', '#2563EB') }]}>Normal</Text></Hz>
          <Hz keys={['linkHoverText']}><Text style={[styles.miniLinkText, { color: sc('linkHoverText', '#1D4ED8') }]}>Hover</Text></Hz>
          <Hz keys={['linkVisitedText']}><Text style={[styles.miniLinkText, { color: sc('linkVisitedText', '#7C3AED') }]}>Visited</Text></Hz>
          <Hz keys={['linkDisabledText']}><Text style={[styles.miniLinkText, { color: sc('linkDisabledText', '#94A3B8') }]}>Off</Text></Hz>
        </View>
      );

    case 'listItem':
      return (
        <View style={styles.miniStack}>
          <Hz keys={['listItemOddRow', 'listItemBackground', 'listItemBorder', 'listItemText', 'listItemIcon']}
            style={[styles.miniListRow, { backgroundColor: sc('listItemOddRow', '#FFFFFF'), borderColor: sc('listItemBorder', '#E2E8F0') }]}>
            <Icon name="circle" size={8} color={sc('listItemIcon', '#64748B')} />
            <Text style={[styles.miniListText, { color: sc('listItemText', '#0F172A') }]}>Item base</Text>
          </Hz>
          <Hz keys={['listItemEvenRow', 'listItemBackground', 'listItemSubtitleText']}
            style={[styles.miniListRow, { backgroundColor: sc('listItemEvenRow', '#F8FAFC'), borderColor: sc('listItemBorder', '#E2E8F0') }]}>
            <Icon name="circle" size={8} color={sc('listItemIcon', '#64748B')} />
            <Text style={[styles.miniListText, { color: sc('listItemSubtitleText', '#64748B') }]}>Item par</Text>
          </Hz>
          <Hz keys={['listItemSelectedBackground', 'listItemSelectedBorder', 'listItemText']}
            style={[styles.miniListRow, { backgroundColor: sc('listItemSelectedBackground', '#EFF6FF'), borderColor: sc('listItemSelectedBorder', '#BFDBFE') }]}>
            <Icon name="check" size={8} color={sc('listItemText', '#0F172A')} />
            <Text style={[styles.miniListText, { color: sc('listItemText', '#0F172A') }]}>Selecionado</Text>
          </Hz>
        </View>
      );

    case 'loading':
      return (
        <View style={styles.miniOverlayShell}>
          <Hz keys={['loadingOverlay']}
            style={[styles.miniOverlayBackdrop, { backgroundColor: gc('loadingOverlay') || withOpacity('#000000', 0.35) }]} />
          <Hz keys={['loadingBackground', 'loadingBorder', 'loadingSpinner', 'loadingText']}
            style={[styles.miniOverlayCard, { backgroundColor: sc('loadingBackground', '#FFFFFF'), borderColor: sc('loadingBorder', '#E2E8F0') }]}>
            <ActivityIndicator size="small" color={sc('loadingSpinner', '#2563EB')} />
            <Text style={[styles.miniText, { color: sc('loadingText', '#64748B') }]}>Carregando…</Text>
          </Hz>
        </View>
      );

    case 'menu':
      return (
        <Hz keys={['menuBackground', 'menuBorder']}
          style={[styles.miniCard, { backgroundColor: sc('menuBackground', '#0F172A'), borderColor: sc('menuBorder', '#1E293B') }]}>
          <Hz keys={['menuSelectedBackground', 'menuSelectedBorder', 'menuSelectedText', 'menuActiveIcon']}
            style={[styles.miniCardHeader, { backgroundColor: sc('menuSelectedBackground', '#1E293B'), borderBottomColor: sc('menuBorder', '#1E293B') }]}>
            <View style={styles.miniRow}>
              <Icon name="layers" size={9} color={sc('menuActiveIcon', '#1D4ED8')} />
              <Text style={[styles.miniText, { color: sc('menuSelectedText', '#FFFFFF') }]}>Item ativo</Text>
            </View>
          </Hz>
          <View style={[styles.miniCardBody, { gap: 3 }]}>
            <Hz keys={['menuText', 'menuIcon']} style={styles.miniRow}>
              <Icon name="grid" size={9} color={sc('menuIcon', '#94A3B8')} />
              <Text style={[styles.miniText, { color: sc('menuText', '#CBD5E1') }]}>Item base</Text>
            </Hz>
            <Hz keys={['menuDisabledText', 'menuDisabledIcon']} style={styles.miniRow}>
              <Icon name="minus" size={9} color={sc('menuDisabledIcon', '#475569')} />
              <Text style={[styles.miniText, { color: sc('menuDisabledText', '#475569') }]}>Desabilitado</Text>
            </Hz>
          </View>
        </Hz>
      );

    case 'modal':
      return (
        <View style={styles.miniOverlayShell}>
          <Hz keys={['modalOverlay']}
            style={[styles.miniOverlayBackdrop, { backgroundColor: gc('modalOverlay') || withOpacity('#000000', 0.45) }]} />
          <Hz keys={['modalBackground', 'modalBorder', 'modalHeaderText', 'modalText', 'modalCloseIcon']}
            style={[styles.miniOverlayCard, { backgroundColor: sc('modalBackground', '#FFFFFF'), borderColor: sc('modalBorder', '#E2E8F0') }]}>
            <View style={styles.miniRow}>
              <Text style={[styles.miniText, { fontWeight: '900', color: sc('modalHeaderText', '#0F172A'), flex: 1 }]}>Modal</Text>
              <Icon name="x" size={9} color={sc('modalCloseIcon', '#64748B')} />
            </View>
            <Text style={[styles.miniText, { color: sc('modalText', '#334155') }]}>Conteúdo</Text>
          </Hz>
        </View>
      );

    case 'table':
      return (
        <View style={[styles.miniCard, { borderColor: sc('tableHeaderBorder', '#E2E8F0'), overflow: 'hidden' }]}>
          <Hz keys={['tableToolbarBackground', 'tableToolbarBorder', 'tableToolbarText']}
            style={[styles.miniTableHeader, { backgroundColor: sc('tableToolbarBackground', '#FFFFFF'), borderBottomColor: sc('tableToolbarBorder', '#E2E8F0') }]}>
            <Text style={[styles.miniTableCell, { color: sc('tableToolbarText', '#0F172A'), fontWeight: '900' }]}>Ações</Text>
          </Hz>
          <Hz keys={['tableHeaderBackground', 'tableHeaderBorder', 'tableHeaderText', 'tableHeaderIcon']}
            style={[styles.miniTableHeader, { backgroundColor: sc('tableHeaderBackground', '#F8FAFC'), borderBottomColor: sc('tableHeaderBorder', '#E2E8F0') }]}>
            <Text style={[styles.miniTableCell, { color: sc('tableHeaderText', '#0F172A'), fontWeight: '900' }]}>ID</Text>
            <Text style={[styles.miniTableCell, { color: sc('tableHeaderText', '#0F172A'), fontWeight: '900' }]}>STATUS</Text>
            <Icon name="chevron-down" size={8} color={sc('tableHeaderIcon', '#64748B')} />
          </Hz>
          <Hz keys={['tableFilterBackground', 'tableFilterBorder', 'tableFilterText']}
            style={[styles.miniTableRow, { backgroundColor: sc('tableFilterBackground', '#FFFFFF'), borderBottomColor: sc('tableRowBorder', '#E2E8F0') }]}>
            <Text style={[styles.miniTableCell, { color: sc('tableFilterText', '#94A3B8') }]}>Filtrar…</Text>
            <Icon name="search" size={8} color={sc('tableFilterText', '#94A3B8')} />
          </Hz>
          <Hz keys={['tableRowOddBackground', 'tableRowBorder', 'tableRowText']}
            style={[styles.miniTableRow, { backgroundColor: sc('tableRowOddBackground', '#FFFFFF'), borderBottomColor: sc('tableRowBorder', '#E2E8F0') }]}>
            <Text style={[styles.miniTableCell, { color: sc('tableRowText', '#0F172A') }]}>#001</Text>
            <Text style={[styles.miniTableCell, { color: sc('tableRowMutedText', '#64748B') }]}>paid</Text>
          </Hz>
          <Hz keys={['tableRowEvenBackground', 'tableRowBorder', 'tableRowText', 'tableActionBackground', 'tableActionIcon']}
            style={[styles.miniTableRow, { backgroundColor: sc('tableRowEvenBackground', '#F8FAFC'), borderBottomColor: sc('tableRowBorder', '#E2E8F0') }]}>
            <Text style={[styles.miniTableCell, { color: sc('tableRowText', '#0F172A') }]}>#002</Text>
            <Text style={[styles.miniTableCell, { color: sc('tableRowText', '#0F172A') }]}>paid</Text>
            <View style={[styles.miniIconBubble, { width: 18, height: 18, borderRadius: 4, borderWidth: 1, backgroundColor: sc('tableActionBackground', '#FFFFFF'), borderColor: sc('tableActionBorder', '#E2E8F0') }]}>
              <Icon name="edit-3" size={8} color={sc('tableActionIcon', '#64748B')} />
            </View>
          </Hz>
          <Hz keys={['tableFooterBackground', 'tableFooterBorder', 'tableFooterText']}
            style={[styles.miniTableRow, { backgroundColor: sc('tableFooterBackground', '#F8FAFC'), borderBottomColor: sc('tableFooterBorder', '#E2E8F0') }]}>
            <Text style={[styles.miniTableCell, { color: sc('tableFooterText', '#64748B'), fontWeight: '900' }]}>Total: 2</Text>
          </Hz>
        </View>
      );

    case 'select':
      return (
        <View style={styles.miniStack}>
          <Hz keys={['selectBackground', 'selectBorder', 'selectPlaceholderText', 'selectIcon']}
            style={[styles.miniField, { backgroundColor: sc('selectBackground', '#FFFFFF'), borderColor: sc('selectBorder', '#CBD5E1') }]}>
            <Text style={[styles.miniFieldText, { color: sc('selectPlaceholderText', '#94A3B8') }]}>Selecione</Text>
            <Icon name="chevron-down" size={9} color={sc('selectIcon', '#64748B')} />
          </Hz>
          <Hz keys={['selectOptionBackground', 'selectOptionBorder', 'selectText']}
            style={[styles.miniField, { backgroundColor: sc('selectOptionBackground', '#FFFFFF'), borderColor: sc('selectOptionBorder', '#E2E8F0') }]}>
            <Text style={[styles.miniFieldText, { color: sc('selectText', '#0F172A') }]}>Opção base</Text>
          </Hz>
          <Hz keys={['selectOptionSelectedBackground', 'selectOptionSelectedText']}
            style={[styles.miniField, { backgroundColor: sc('selectOptionSelectedBackground', '#EFF6FF'), borderColor: sc('selectOptionBorder', '#E2E8F0') }]}>
            <Text style={[styles.miniFieldText, { color: sc('selectOptionSelectedText', '#1D4ED8') }]}>Selecionada ✓</Text>
          </Hz>
        </View>
      );

    case 'navigation':
      return (
        <Hz keys={['navigationBackground', 'navigationBorder']}
          style={[styles.miniCard, { backgroundColor: sc('navigationBackground', '#FFFFFF'), borderColor: sc('navigationBorder', '#E2E8F0'), overflow: 'hidden' }]}>
          <Hz keys={['navigationActiveBackground', 'navigationActiveBorder', 'navigationActiveText', 'navigationActiveIcon']}
            style={[styles.miniNavItem, { backgroundColor: sc('navigationActiveBackground', '#EFF6FF'), borderColor: sc('navigationActiveBorder', '#BFDBFE') }]}>
            <Icon name="home" size={9} color={sc('navigationActiveIcon', '#1D4ED8')} />
            <Text style={[styles.miniNavText, { color: sc('navigationActiveText', '#1D4ED8') }]}>Dashboard</Text>
          </Hz>
          <Hz keys={['navigationText', 'navigationIcon']}
            style={[styles.miniNavItem, { backgroundColor: 'transparent', borderColor: 'transparent' }]}>
            <Icon name="box" size={9} color={sc('navigationIcon', '#64748B')} />
            <Text style={[styles.miniNavText, { color: sc('navigationText', '#0F172A') }]}>Pedidos</Text>
          </Hz>
          <Hz keys={['navigationDisabledText', 'navigationDisabledIcon', 'navigationDisabledBackground']}
            style={[styles.miniNavItem, { backgroundColor: sc('navigationDisabledBackground', '#F8FAFC'), borderColor: sc('navigationDisabledBorder', '#E2E8F0') }]}>
            <Icon name="lock" size={9} color={sc('navigationDisabledIcon', '#CBD5E1')} />
            <Text style={[styles.miniNavText, { color: sc('navigationDisabledText', '#94A3B8') }]}>Bloqueado</Text>
          </Hz>
        </Hz>
      );

    case 'overlay':
      return (
        <View style={styles.miniOverlayShell}>
          <Hz keys={['overlayBackground', 'overlayBorder', 'overlayShadow']}
            style={[styles.miniOverlayBackdrop, { backgroundColor: gc('overlayBackground') || withOpacity('#000000', 0.40) }]} />
          <View style={[styles.miniOverlayCard, { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }]}>
            <Text style={styles.miniText}>overlay</Text>
          </View>
        </View>
      );

    case 'radio':
      return (
        <View style={styles.miniStack}>
          <Hz keys={['radioBackground', 'radioBorder', 'radioText']} style={styles.miniRow}>
            <View style={[styles.miniRadio, { backgroundColor: sc('radioBackground', '#FFFFFF'), borderColor: sc('radioBorder', '#94A3B8') }]} />
            <Text style={[styles.miniText, { color: sc('radioText', '#0F172A') }]}>Normal</Text>
          </Hz>
          <Hz keys={['radioSelectedBackground', 'radioSelectedBorder', 'radioSelectedDot']} style={styles.miniRow}>
            <View style={[styles.miniRadio, { backgroundColor: sc('radioSelectedBackground', '#FFFFFF'), borderColor: sc('radioSelectedBorder', '#2563EB') }]}>
              <View style={[styles.miniRadioDot, { backgroundColor: sc('radioSelectedDot', '#2563EB') }]} />
            </View>
            <Text style={[styles.miniText, { color: sc('radioText', '#0F172A') }]}>Selecionado</Text>
          </Hz>
          <Hz keys={['radioDisabledBackground', 'radioDisabledBorder', 'radioDisabledDot']} style={styles.miniRow}>
            <View style={[styles.miniRadio, { backgroundColor: sc('radioDisabledBackground', '#F1F5F9'), borderColor: sc('radioDisabledBorder', '#CBD5E1') }]} />
            <Text style={[styles.miniText, { color: sc('radioDisabledDot', '#94A3B8') }]}>Desabilitado</Text>
          </Hz>
        </View>
      );

    case 'switch':
      return (
        <View style={styles.miniRow}>
          <Hz keys={['switchOffTrack', 'switchOffThumb']}
            style={[styles.miniSwitch, { backgroundColor: sc('switchOffTrack', '#CBD5E1') }]}>
            <View style={[styles.miniSwitchThumb, { backgroundColor: sc('switchOffThumb', '#FFFFFF'), alignSelf: 'flex-start' }]} />
          </Hz>
          <Hz keys={['switchOnTrack', 'switchOnThumb']}
            style={[styles.miniSwitch, { backgroundColor: sc('switchOnTrack', '#2563EB') }]}>
            <View style={[styles.miniSwitchThumb, { backgroundColor: sc('switchOnThumb', '#FFFFFF'), alignSelf: 'flex-end' }]} />
          </Hz>
          <Hz keys={['switchDisabledTrack', 'switchDisabledThumb']}
            style={[styles.miniSwitch, { backgroundColor: sc('switchDisabledTrack', '#E2E8F0') }]}>
            <View style={[styles.miniSwitchThumb, { backgroundColor: sc('switchDisabledThumb', '#94A3B8'), alignSelf: 'flex-start' }]} />
          </Hz>
        </View>
      );

    case 'text':
      return (
        <View style={styles.miniStack}>
          <View style={styles.miniRow}>
            <Hz keys={['textPrimary']}><Text style={[styles.miniText, { fontWeight: '900', color: sc('textPrimary', '#0F172A') }]}>Primário</Text></Hz>
            <Hz keys={['textSecondary']}><Text style={[styles.miniText, { color: sc('textSecondary', '#64748B') }]}>Secundário</Text></Hz>
            <Hz keys={['textMuted']}><Text style={[styles.miniText, { color: sc('textMuted', '#64748B') }]}>Muted</Text></Hz>
          </View>
          <View style={styles.miniRow}>
            <Hz keys={['textLink']}><Text style={[styles.miniText, { color: sc('textLink', '#2563EB') }]}>Link</Text></Hz>
            <Hz keys={['textSuccess']}><Text style={[styles.miniText, { color: sc('textSuccess', '#16A34A') }]}>Success</Text></Hz>
            <Hz keys={['textWarning']}><Text style={[styles.miniText, { color: sc('textWarning', '#D97706') }]}>Warning</Text></Hz>
            <Hz keys={['textDanger']}><Text style={[styles.miniText, { color: sc('textDanger', '#DC2626') }]}>Danger</Text></Hz>
          </View>
          <View style={styles.miniRow}>
            <Hz keys={['textDisabled']}><Text style={[styles.miniText, { color: sc('textDisabled', '#94A3B8') }]}>Disabled</Text></Hz>
            <Hz keys={['textPlaceholder']}><Text style={[styles.miniText, { color: sc('textPlaceholder', '#94A3B8') }]}>Placeholder</Text></Hz>
            <Hz keys={['textInverse']}
              style={{ backgroundColor: sc('textPrimary', '#0F172A'), paddingHorizontal: 3, borderRadius: 3 }}>
              <Text style={[styles.miniText, { color: sc('textInverse', '#FFFFFF') }]}>Inverse</Text>
            </Hz>
          </View>
        </View>
      );

    case 'toast':
      return (
        <View style={styles.miniStack}>
          <Hz keys={['toastBackground', 'toastBorder', 'toastText', 'toastIcon']}
            style={[styles.miniToastRow, { backgroundColor: sc('toastBackground', '#FFFFFF'), borderColor: sc('toastBorder', '#E2E8F0') }]}>
            <Icon name="info" size={9} color={sc('toastIcon', '#64748B')} />
            <Text style={[styles.miniToastText, { color: sc('toastText', '#0F172A') }]}>Base</Text>
          </Hz>
          <Hz keys={['toastInfoBackground', 'toastInfoBorder', 'toastInfoIcon', 'toastInfoText']}
            style={[styles.miniToastRow, { backgroundColor: sc('toastInfoBackground', '#EFF6FF'), borderColor: sc('toastInfoBorder', '#BFDBFE') }]}>
            <Icon name="bell" size={9} color={sc('toastInfoIcon', '#2563EB')} />
            <Text style={[styles.miniToastText, { color: sc('toastInfoText', '#1D4ED8') }]}>Info</Text>
          </Hz>
          <Hz keys={['toastSuccessBackground', 'toastSuccessBorder', 'toastSuccessIcon', 'toastSuccessText']}
            style={[styles.miniToastRow, { backgroundColor: sc('toastSuccessBackground', '#F0FDF4'), borderColor: sc('toastSuccessBorder', '#BBF7D0') }]}>
            <Icon name="check-circle" size={9} color={sc('toastSuccessIcon', '#16A34A')} />
            <Text style={[styles.miniToastText, { color: sc('toastSuccessText', '#15803D') }]}>Sucesso</Text>
          </Hz>
          <Hz keys={['toastWarningBackground', 'toastWarningBorder', 'toastWarningIcon', 'toastWarningText']}
            style={[styles.miniToastRow, { backgroundColor: sc('toastWarningBackground', '#FFFBEB'), borderColor: sc('toastWarningBorder', '#FDE68A') }]}>
            <Icon name="alert-triangle" size={9} color={sc('toastWarningIcon', '#D97706')} />
            <Text style={[styles.miniToastText, { color: sc('toastWarningText', '#B45309') }]}>Aviso</Text>
          </Hz>
          <Hz keys={['toastDangerBackground', 'toastDangerBorder', 'toastDangerIcon', 'toastDangerText']}
            style={[styles.miniToastRow, { backgroundColor: sc('toastDangerBackground', '#FEF2F2'), borderColor: sc('toastDangerBorder', '#FECACA') }]}>
            <Icon name="x-circle" size={9} color={sc('toastDangerIcon', '#DC2626')} />
            <Text style={[styles.miniToastText, { color: sc('toastDangerText', '#B91C1C') }]}>Erro</Text>
          </Hz>
        </View>
      );

    default:
      return (
        <View style={styles.miniRow}>
          {groupLabel && <Text style={[styles.miniText, { color: '#94A3B8' }]}>preview não disponível</Text>}
        </View>
      );
  }
};

// ─── GroupCard ────────────────────────────────────────────────────────────────

const GroupCard = ({ group, themeColors, rnwMode, showUndefined }) => {
  const filledCount = useMemo(
    () => group.tokens.filter(t => hasValue(themeColors?.[t])).length,
    [group.tokens, themeColors],
  );
  const hasMissing = useMemo(
    () => group.tokens.some(t => !hasValue(themeColors?.[t])),
    [group.tokens, themeColors],
  );

  return (
    <View style={[styles.groupCard, showUndefined && hasMissing && styles.undefinedZone]}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupLabel}>{group.label}</Text>
        <Text style={styles.groupMeta}>{filledCount}/{group.tokens.length}</Text>
      </View>
      <View style={styles.groupBody}>
        <View style={styles.previewArea}>
          {renderGroupVisual(group.label, themeColors, rnwMode, showUndefined)}
        </View>
        <View style={styles.tokenGrid}>
          {group.tokens.map(token => (
            <TokenSwatch
              key={token}
              tokenKey={token}
              themeColors={themeColors}
              rnwMode={rnwMode}
              showUndefined={showUndefined}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const ThemeLandingPreview = ({
  themeColors,
  rnwMode,
  showUndefined,
  themeItem,
  isWide,
  isTablet,
  filledTokenCount,
  totalTokenCount,
  filledGroupCount,
}) => {
  const gc = key => resolveColor(themeColors, key, rnwMode);
  const sc = (key, fallback) => safeColor(gc(key), fallback);
  const Zone = ({ keys, style, children }) => (
    <HoverZone
      tokenKeys={keys}
      themeColors={themeColors}
      rnwMode={rnwMode}
      showUndefined={showUndefined}
      style={style}
    >
      {children}
    </HoverZone>
  );

  const navReadable = readableText(gc('navbarBackground'));
  const footerReadable = readableText(gc('footerBackground'));

  const navItems = [
    { label: 'Overview', keys: ['headerLink'], colorKey: 'headerLink' },
    { label: 'Pricing', keys: ['linkText'], colorKey: 'linkText' },
    { label: 'Components', keys: ['linkHoverText'], colorKey: 'linkHoverText' },
    { label: 'Roadmap', keys: ['linkVisitedText'], colorKey: 'linkVisitedText' },
  ];

  const badgeItems = [
    {
      label: 'Base',
      icon: 'circle',
      keys: ['badgeBackground', 'badgeBorder', 'badgeText', 'badgeIcon'],
      style: {
        backgroundColor: sc('badgeBackground', '#E2E8F0'),
        borderColor: sc('badgeBorder', '#CBD5E1'),
      },
      textColor: sc('badgeText', '#0F172A'),
      iconColor: sc('badgeIcon', '#64748B'),
    },
    {
      label: 'Selected',
      icon: 'check',
      keys: ['badgeSelectedBackground', 'badgeSelectedBorder', 'badgeSelectedText'],
      style: {
        backgroundColor: sc('badgeSelectedBackground', '#2563EB'),
        borderColor: sc('badgeSelectedBorder', '#1D4ED8'),
      },
      textColor: sc('badgeSelectedText', '#FFFFFF'),
      iconColor: sc('badgeSelectedText', '#FFFFFF'),
    },
    {
      label: 'Disabled',
      icon: 'slash',
      keys: ['badgeDisabledBackground', 'badgeBorder', 'badgeDisabledText'],
      style: {
        backgroundColor: sc('badgeDisabledBackground', '#F1F5F9'),
        borderColor: sc('badgeBorder', '#CBD5E1'),
      },
      textColor: sc('badgeDisabledText', '#94A3B8'),
      iconColor: sc('badgeDisabledText', '#94A3B8'),
    },
  ];

  const chipItems = [
    {
      label: 'Tag base',
      icon: 'hash',
      keys: ['chipBackground', 'chipBorder', 'chipText', 'chipIcon'],
      style: {
        backgroundColor: sc('chipBackground', '#E2E8F0'),
        borderColor: sc('chipBorder', '#CBD5E1'),
      },
      textColor: sc('chipText', '#0F172A'),
      iconColor: sc('chipIcon', '#64748B'),
    },
    {
      label: 'Selecionado',
      icon: 'star',
      keys: ['chipSelectedBackground', 'chipSelectedBorder', 'chipSelectedText'],
      style: {
        backgroundColor: sc('chipSelectedBackground', '#2563EB'),
        borderColor: sc('chipSelectedBorder', '#1D4ED8'),
      },
      textColor: sc('chipSelectedText', '#FFFFFF'),
      iconColor: sc('chipSelectedText', '#FFFFFF'),
    },
    {
      label: 'Desligado',
      icon: 'moon',
      keys: ['chipDisabledBackground', 'chipBorder', 'chipDisabledText'],
      style: {
        backgroundColor: sc('chipDisabledBackground', '#F1F5F9'),
        borderColor: sc('chipBorder', '#CBD5E1'),
      },
      textColor: sc('chipDisabledText', '#94A3B8'),
      iconColor: sc('chipDisabledText', '#94A3B8'),
    },
  ];

  const textTokens = [
    { label: 'Primary', key: 'textPrimary', background: withOpacity(sc('textPrimary', '#0F172A'), 0.08) },
    { label: 'Secondary', key: 'textSecondary', background: withOpacity(sc('textSecondary', '#64748B'), 0.12) },
    { label: 'Muted', key: 'textMuted', background: withOpacity(sc('textMuted', '#64748B'), 0.12) },
    { label: 'Success', key: 'textSuccess', background: withOpacity(sc('textSuccess', '#16A34A'), 0.12) },
    { label: 'Warning', key: 'textWarning', background: withOpacity(sc('textWarning', '#D97706'), 0.12) },
    { label: 'Danger', key: 'textDanger', background: withOpacity(sc('textDanger', '#DC2626'), 0.12) },
  ];

  return (
    <View
      style={[
        styles.previewWindow,
        {
          backgroundColor: sc('pageBackground', '#F8FAFC'),
          borderColor: sc('pageBorder', '#E2E8F0'),
        },
      ]}
    >
      <Zone
        keys={['navbarBackground', 'navbarBorder']}
        style={[
          styles.topNav,
          {
            backgroundColor: sc('navbarBackground', '#0F172A'),
            borderBottomColor: sc('navbarBorder', '#1E293B'),
          },
        ]}
      >
        <View style={styles.topNavBrand}>
          <Zone
            keys={['buttonBackground', 'buttonText', 'iconInverse']}
            style={[
              styles.topNavBadge,
              { backgroundColor: sc('buttonBackground', '#2563EB') },
            ]}
          >
            <Icon name="sunrise" size={18} color={sc('iconInverse', '#FFFFFF')} />
          </Zone>
          <View style={styles.topNavTitleWrap}>
            <Text style={[styles.topNavEyebrow, { color: withOpacity(navReadable, 0.68) }]}>Theme Showcase</Text>
            <Text style={[styles.topNavTitle, { color: navReadable }]}>
              {themeItem?.theme || `Tema ${themeItem?.id}`}
            </Text>
          </View>
        </View>

        <View style={styles.topNavLinks}>
          {navItems.map(item => (
            <Zone key={item.label} keys={item.keys}>
              <Text style={[styles.topNavLink, { color: sc(item.colorKey, navReadable) }]}>{item.label}</Text>
            </Zone>
          ))}
          <Zone
            keys={['buttonBackgroundSecondary', 'buttonBorderSecondary', 'buttonTextSecondary']}
            style={[
              styles.tabPill,
              {
                minHeight: 40,
                backgroundColor: sc('buttonBackgroundSecondary', '#F8FAFC'),
                borderColor: sc('buttonBorderSecondary', '#CBD5E1'),
              },
            ]}
          >
            <Icon name="mouse-pointer" size={12} color={sc('buttonTextSecondary', '#0F172A')} />
            <Text style={[styles.tabText, { color: sc('buttonTextSecondary', '#0F172A') }]}>Hover para inspecionar</Text>
          </Zone>
        </View>
      </Zone>

      <View style={[styles.workspaceRow, isWide ? styles.workspaceRowWide : styles.workspaceRowStack]}>
        <View style={[styles.sidebarColumn, isWide ? styles.sidebarColumnWide : styles.sidebarColumnStack]}>
          <Zone
            keys={['containerBackground', 'containerBorder', 'surface']}
            style={[
              styles.sidebarSurface,
              {
                backgroundColor: sc('containerBackground', '#FFFFFF'),
                borderColor: sc('containerBorder', '#E2E8F0'),
              },
            ]}
          >
            <Text style={[styles.sidebarSectionLabel, { color: sc('textMuted', '#64748B') }]}>Reading Context</Text>
            <View style={styles.sidebarHero}>
              <Text style={[styles.sidebarHeroTitle, { color: sc('textPrimary', '#0F172A') }]}>
                Uma tela real para sentir o tema inteiro.
              </Text>
              <Text style={[styles.sidebarHeroText, { color: sc('textSecondary', '#64748B') }]}>
                Em vez de listar tokens isolados, a página distribui cada grupo em uma composição completa.
              </Text>
            </View>

            <View style={styles.sidebarMiniGrid}>
              <Zone
                keys={['badgeSelectedBackground', 'badgeSelectedBorder', 'badgeSelectedText']}
                style={[
                  styles.sidebarMetricPill,
                  {
                    backgroundColor: sc('badgeSelectedBackground', '#2563EB'),
                    borderColor: sc('badgeSelectedBorder', '#1D4ED8'),
                  },
                ]}
              >
                <Text style={[styles.sidebarMetricValue, { color: sc('badgeSelectedText', '#FFFFFF') }]}>
                  {filledTokenCount}
                </Text>
                <Text style={[styles.sidebarMetricLabel, { color: sc('badgeSelectedText', '#FFFFFF') }]}>cores definidas</Text>
              </Zone>
              <Zone
                keys={['chipBackground', 'chipBorder', 'chipText']}
                style={[
                  styles.sidebarMetricPill,
                  {
                    backgroundColor: sc('chipBackground', '#E2E8F0'),
                    borderColor: sc('chipBorder', '#CBD5E1'),
                  },
                ]}
              >
                <Text style={[styles.sidebarMetricValue, { color: sc('chipText', '#0F172A') }]}>
                  {totalTokenCount - filledTokenCount}
                </Text>
                <Text style={[styles.sidebarMetricLabel, { color: sc('chipText', '#0F172A') }]}>faltando</Text>
              </Zone>
              <Zone
                keys={['cardBackground', 'cardBorder', 'cardText']}
                style={[
                  styles.sidebarMetricPill,
                  {
                    backgroundColor: sc('cardBackground', '#FFFFFF'),
                    borderColor: sc('cardBorder', '#E2E8F0'),
                  },
                ]}
              >
                <Text style={[styles.sidebarMetricValue, { color: sc('cardText', '#0F172A') }]}>
                  {filledGroupCount}/{THEME_MAP_GROUPS.length}
                </Text>
                <Text style={[styles.sidebarMetricLabel, { color: sc('cardText', '#0F172A') }]}>objetos cobertos</Text>
              </Zone>
            </View>
          </Zone>

          <Zone
            keys={[
              'menuBackground', 'menuBorder', 'menuSelectedBackground', 'menuSelectedBorder', 'menuSelectedText',
              'menuText', 'menuIcon', 'menuDisabledBackground', 'menuDisabledBorder', 'menuDisabledText', 'menuDisabledIcon',
            ]}
            style={[
              styles.sidebarSurface,
              {
                backgroundColor: sc('menuBackground', '#0F172A'),
                borderColor: sc('menuBorder', '#1E293B'),
              },
            ]}
          >
            <Text style={[styles.sidebarSectionLabel, { color: sc('menuText', '#CBD5E1') }]}>Menu</Text>
            <View style={styles.sidebarMenuCard}>
              <Zone
                keys={['menuSelectedBackground', 'menuSelectedBorder', 'menuSelectedText', 'menuActiveIcon']}
                style={[
                  styles.sidebarMenuHeader,
                  {
                    backgroundColor: sc('menuSelectedBackground', '#1E293B'),
                    borderBottomColor: sc('menuSelectedBorder', '#334155'),
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="layers" size={14} color={sc('menuActiveIcon', '#1D4ED8')} />
                  <Text style={[styles.sidebarMenuText, { color: sc('menuSelectedText', '#FFFFFF'), flex: 0 }]}>Theme Library</Text>
                </View>
              </Zone>
              <View style={{ padding: 12, gap: 10 }}>
                <Zone
                  keys={['menuActiveBackground', 'menuActiveBorder', 'menuActiveText', 'menuActiveIcon']}
                  style={[
                    styles.sidebarMenuItem,
                    {
                      backgroundColor: sc('menuActiveBackground', '#EFF6FF'),
                      borderColor: sc('menuActiveBorder', '#BFDBFE'),
                    },
                  ]}
                >
                  <Icon name="star" size={14} color={sc('menuActiveIcon', '#1D4ED8')} />
                  <Text style={[styles.sidebarMenuText, { color: sc('menuActiveText', '#1D4ED8') }]}>Preview principal</Text>
                </Zone>
                <Zone
                  keys={['menuBackground', 'menuBorder', 'menuText', 'menuIcon']}
                  style={[
                    styles.sidebarMenuItem,
                    {
                      backgroundColor: sc('menuBackground', '#0F172A'),
                      borderColor: sc('menuBorder', '#1E293B'),
                    },
                  ]}
                >
                  <Icon name="grid" size={14} color={sc('menuIcon', '#94A3B8')} />
                  <Text style={[styles.sidebarMenuText, { color: sc('menuText', '#CBD5E1') }]}>Color atlas</Text>
                </Zone>
                <Zone
                  keys={['menuDisabledBackground', 'menuDisabledBorder', 'menuDisabledText', 'menuDisabledIcon']}
                  style={[
                    styles.sidebarMenuItem,
                    {
                      backgroundColor: sc('menuDisabledBackground', '#1E293B'),
                      borderColor: sc('menuDisabledBorder', '#334155'),
                    },
                  ]}
                >
                  <Icon name="lock" size={14} color={sc('menuDisabledIcon', '#475569')} />
                  <Text style={[styles.sidebarMenuText, { color: sc('menuDisabledText', '#475569') }]}>Deploy bloqueado</Text>
                </Zone>
              </View>
            </View>
          </Zone>

          <Zone
            keys={[
              'navigationBackground', 'navigationBorder', 'navigationText', 'navigationIcon',
              'navigationActiveBackground', 'navigationActiveBorder', 'navigationActiveText', 'navigationActiveIcon',
              'navigationDisabledBackground', 'navigationDisabledBorder', 'navigationDisabledText', 'navigationDisabledIcon',
            ]}
            style={[
              styles.sidebarSurface,
              {
                backgroundColor: sc('navigationBackground', '#FFFFFF'),
                borderColor: sc('navigationBorder', '#E2E8F0'),
              },
            ]}
          >
            <Text style={[styles.sidebarSectionLabel, { color: sc('textMuted', '#64748B') }]}>Navigation</Text>
            <Zone
              keys={['navigationActiveBackground', 'navigationActiveBorder', 'navigationActiveText', 'navigationActiveIcon']}
              style={[
                styles.sidebarMenuItem,
                {
                  backgroundColor: sc('navigationActiveBackground', '#EFF6FF'),
                  borderColor: sc('navigationActiveBorder', '#BFDBFE'),
                },
              ]}
            >
              <Icon name="home" size={14} color={sc('navigationActiveIcon', '#1D4ED8')} />
              <Text style={[styles.sidebarMenuText, { color: sc('navigationActiveText', '#1D4ED8') }]}>Dashboard</Text>
            </Zone>
            <Zone
              keys={['navigationBackground', 'navigationText', 'navigationIcon']}
              style={[styles.sidebarMenuItem, { backgroundColor: 'transparent', borderColor: 'transparent' }]}
            >
              <Icon name="package" size={14} color={sc('navigationIcon', '#64748B')} />
              <Text style={[styles.sidebarMenuText, { color: sc('navigationText', '#0F172A') }]}>Orders</Text>
            </Zone>
            <Zone
              keys={['navigationDisabledBackground', 'navigationDisabledBorder', 'navigationDisabledText', 'navigationDisabledIcon']}
              style={[
                styles.sidebarMenuItem,
                {
                  backgroundColor: sc('navigationDisabledBackground', '#F8FAFC'),
                  borderColor: sc('navigationDisabledBorder', '#E2E8F0'),
                },
              ]}
            >
              <Icon name="shield-off" size={14} color={sc('navigationDisabledIcon', '#CBD5E1')} />
              <Text style={[styles.sidebarMenuText, { color: sc('navigationDisabledText', '#94A3B8') }]}>Reports</Text>
            </Zone>
          </Zone>
        </View>

        <View style={styles.mainColumn}>
          <Zone
            keys={['headerBackground', 'headerBorder', 'headerText', 'headerIcon', 'headerLink']}
            style={[
              styles.headerCard,
              {
                backgroundColor: sc('headerBackground', '#FFFFFF'),
                borderColor: sc('headerBorder', '#E2E8F0'),
              },
            ]}
          >
            <View style={styles.headerTop}>
              <View style={styles.headerTitleWrap}>
                <Text style={[styles.headerEyebrow, { color: sc('textMuted', '#64748B') }]}>Human Preview</Text>
                <Text style={[styles.headerTitle, { color: sc('headerText', '#0F172A') }]}>
                  Composição editorial para leitura de cor em contexto.
                </Text>
                <Text style={[styles.headerSubtitle, { color: sc('textSecondary', '#64748B') }]}>
                  Os objetos aparecem juntos como uma landing page, não como uma lista de peças soltas.
                </Text>
              </View>
              <View style={styles.badgeRow}>
                <Zone
                  keys={['headerLink', 'headerIcon']}
                  style={[
                    styles.badgePill,
                    {
                      backgroundColor: withOpacity(sc('headerLink', '#2563EB'), 0.12),
                      borderColor: withOpacity(sc('headerLink', '#2563EB'), 0.22),
                    },
                  ]}
                >
                  <Icon name="bell" size={12} color={sc('headerIcon', '#64748B')} />
                  <Text style={[styles.badgeText, { color: sc('headerLink', '#2563EB') }]}>Preview em contexto</Text>
                </Zone>
              </View>
            </View>

            <View style={styles.toolbarRow}>
              <Zone
                keys={['toolbarBackground', 'toolbarBorder', 'textPrimary', 'textSecondary']}
                style={[
                  styles.toolbarMain,
                  {
                    backgroundColor: sc('toolbarBackground', '#F8FAFC'),
                    borderColor: sc('toolbarBorder', '#E2E8F0'),
                  },
                ]}
              >
                <View style={styles.toolbarMeta}>
                  <Icon name="sliders" size={13} color={sc('iconMuted', '#64748B')} />
                  <Text style={[styles.toolbarMetaText, { color: sc('textPrimary', '#0F172A') }]}>Realtime theme reading</Text>
                </View>
                <Text style={[styles.toolbarMetaText, { color: sc('textSecondary', '#64748B') }]}>
                  fallback RNW {rnwMode ? 'ativo' : 'inativo'}
                </Text>
              </Zone>

              <View style={styles.tabRow}>
                <Zone
                  keys={['tabBarBackground', 'tabBarBorder', 'textPrimary']}
                  style={[
                    styles.tabPill,
                    {
                      backgroundColor: sc('tabBarBackground', '#FFFFFF'),
                      borderColor: sc('tabBarBorder', '#E2E8F0'),
                    },
                  ]}
                >
                  <Text style={[styles.tabText, { color: sc('textPrimary', '#0F172A') }]}>Landing</Text>
                </Zone>
                <Zone
                  keys={['tabBarBackground', 'tabBarBorder', 'textSecondary']}
                  style={[
                    styles.tabPill,
                    {
                      backgroundColor: sc('tabBarBackground', '#FFFFFF'),
                      borderColor: sc('tabBarBorder', '#E2E8F0'),
                    },
                  ]}
                >
                  <Text style={[styles.tabText, { color: sc('textSecondary', '#64748B') }]}>States</Text>
                </Zone>
                <Zone
                  keys={['tabBarBackground', 'tabBarBorder', 'textSecondary']}
                  style={[
                    styles.tabPill,
                    {
                      backgroundColor: sc('tabBarBackground', '#FFFFFF'),
                      borderColor: sc('tabBarBorder', '#E2E8F0'),
                    },
                  ]}
                >
                  <Text style={[styles.tabText, { color: sc('textSecondary', '#64748B') }]}>Atlas</Text>
                </Zone>
              </View>
            </View>
          </Zone>

          <View style={[styles.heroGrid, isTablet ? styles.heroGridWide : styles.heroGridStack]}>
            <Zone
              keys={['panelBackground', 'panelBorder', 'textPrimary', 'textSecondary', 'surface']}
              style={[
                styles.heroCopyCard,
                {
                  backgroundColor: sc('panelBackground', '#FFFFFF'),
                  borderColor: sc('panelBorder', '#E2E8F0'),
                },
              ]}
            >
              <Zone
                keys={['containerTransparentBackground', 'containerBorder', 'badgeIcon', 'textPrimary']}
                style={[
                  styles.heroAnnouncement,
                  {
                    backgroundColor: gc('containerTransparentBackground') || withOpacity(sc('buttonBackground', '#2563EB'), 0.1),
                    borderColor: sc('containerBorder', '#E2E8F0'),
                  },
                ]}
              >
                <Icon name="aperture" size={12} color={sc('badgeIcon', '#64748B')} />
                <Text style={[styles.heroAnnouncementText, { color: sc('textPrimary', '#0F172A') }]}>
                  Passe o mouse e leia o token
                </Text>
              </Zone>

              <Text style={[styles.heroTitle, { color: sc('textPrimary', '#0F172A') }]}>
                Cores, estados e superfícies vivendo na mesma página.
              </Text>
              <Text style={[styles.heroText, { color: sc('textSecondary', '#64748B') }]}>
                O foco aqui é permitir decisão visual rápida: hero, navegação, formulários, listas, tabela, modal e toasts
                aparecem juntos para você validar equilíbrio, contraste e hierarquia.
              </Text>

              <View style={styles.heroActions}>
                <Zone
                  keys={['buttonBackground', 'buttonBorder', 'buttonText', 'buttonIcon']}
                  style={[
                    styles.heroButton,
                    {
                      backgroundColor: sc('buttonBackground', '#2563EB'),
                      borderColor: sc('buttonBorder', '#1D4ED8'),
                    },
                  ]}
                >
                  <Icon name="play" size={13} color={sc('buttonIcon', '#FFFFFF')} />
                  <Text style={[styles.heroButtonText, { color: sc('buttonText', '#FFFFFF') }]}>Ler preview completo</Text>
                </Zone>
                <Zone
                  keys={['buttonBackgroundSecondary', 'buttonBorderSecondary', 'buttonTextSecondary', 'buttonIconSecondary']}
                  style={[
                    styles.heroButton,
                    {
                      backgroundColor: sc('buttonBackgroundSecondary', '#F8FAFC'),
                      borderColor: sc('buttonBorderSecondary', '#CBD5E1'),
                    },
                  ]}
                >
                  <Icon name="eye" size={13} color={sc('buttonIconSecondary', '#0F172A')} />
                  <Text style={[styles.heroButtonText, { color: sc('buttonTextSecondary', '#0F172A') }]}>Comparar estados</Text>
                </Zone>
                <Zone
                  keys={['buttonDisabledBackground', 'buttonDisabledText', 'buttonDisabledOpacity']}
                  style={[
                    styles.heroButton,
                    {
                      backgroundColor: sc('buttonDisabledBackground', '#E2E8F0'),
                      borderColor: sc('buttonDisabledBackground', '#E2E8F0'),
                    },
                  ]}
                >
                  <Icon name="pause" size={13} color={sc('buttonDisabledText', '#94A3B8')} />
                  <Text style={[styles.heroButtonText, { color: sc('buttonDisabledText', '#94A3B8') }]}>Ação desabilitada</Text>
                </Zone>
              </View>

              <View style={styles.heroSubMeta}>
                <Zone keys={['linkText']}>
                  <Text style={[styles.heroLinkText, { color: sc('linkText', '#2563EB') }]}>Abrir documentação</Text>
                </Zone>
                <Zone keys={['linkHoverText']}>
                  <Text style={[styles.heroLinkText, { color: sc('linkHoverText', '#1D4ED8') }]}>Ler no hover</Text>
                </Zone>
                <Zone keys={['linkVisitedText']}>
                  <Text style={[styles.heroLinkText, { color: sc('linkVisitedText', '#7C3AED') }]}>Histórico visitado</Text>
                </Zone>
                <Zone keys={['linkDisabledText']}>
                  <Text style={[styles.heroLinkText, { color: sc('linkDisabledText', '#94A3B8') }]}>Link indisponível</Text>
                </Zone>
              </View>

              <View style={styles.badgeRow}>
                {badgeItems.map(item => (
                  <Zone key={item.label} keys={item.keys} style={[styles.badgePill, item.style]}>
                    <Icon name={item.icon} size={11} color={item.iconColor} />
                    <Text style={[styles.badgeText, { color: item.textColor }]}>{item.label}</Text>
                  </Zone>
                ))}
              </View>

              <View style={styles.badgeRow}>
                {chipItems.map(item => (
                  <Zone key={item.label} keys={item.keys} style={[styles.chipPill, item.style]}>
                    <Icon name={item.icon} size={11} color={item.iconColor} />
                    <Text style={[styles.chipText, { color: item.textColor }]}>{item.label}</Text>
                  </Zone>
                ))}
              </View>
            </Zone>

            <Zone
              keys={['cardBackground', 'cardBorder', 'cardText', 'cardHeaderBackground', 'cardHeaderText', 'cardIcon', 'cardIconColor']}
              style={[
                styles.heroVisualCard,
                {
                  backgroundColor: sc('cardBackground', '#FFFFFF'),
                  borderColor: sc('cardBorder', '#E2E8F0'),
                },
              ]}
            >
              <Zone
                keys={['cardHeaderBackground', 'cardBorder', 'cardHeaderText', 'cardIcon', 'cardIconColor']}
                style={[
                  styles.showcasePanel,
                  {
                    backgroundColor: sc('cardHeaderBackground', '#F8FAFC'),
                    borderColor: sc('cardBorder', '#E2E8F0'),
                  },
                ]}
              >
                <View style={styles.showcaseTop}>
                  <View>
                    <Text style={[styles.showcaseTitle, { color: sc('cardHeaderText', '#0F172A') }]}>Theme Pulse</Text>
                    <Text style={[styles.showcaseCaption, { color: sc('textSecondary', '#64748B') }]}>
                      Uma leitura rápida da sensação do tema.
                    </Text>
                  </View>
                  <Icon name="bar-chart-2" size={16} color={sc('cardIconColor', '#64748B')} />
                </View>

                <View style={styles.statsGrid}>
                  <Zone
                    keys={['cardSelectedBackground', 'cardSelectedBorder', 'cardSelectedText']}
                    style={[
                      styles.statCard,
                      {
                        backgroundColor: sc('cardSelectedBackground', '#EFF6FF'),
                        borderColor: sc('cardSelectedBorder', '#BFDBFE'),
                      },
                    ]}
                  >
                    <Text style={[styles.statValue, { color: sc('cardSelectedText', '#1D4ED8') }]}>92%</Text>
                    <Text style={[styles.statLabel, { color: sc('cardSelectedText', '#1D4ED8') }]}>harmonia visual</Text>
                  </Zone>
                  <Zone
                    keys={['cardBackground', 'cardBorder', 'cardText']}
                    style={[
                      styles.statCard,
                      {
                        backgroundColor: sc('cardBackground', '#FFFFFF'),
                        borderColor: sc('cardBorder', '#E2E8F0'),
                      },
                    ]}
                  >
                    <Text style={[styles.statValue, { color: sc('cardText', '#0F172A') }]}>{THEME_MAP_GROUPS.length}</Text>
                    <Text style={[styles.statLabel, { color: sc('cardText', '#0F172A') }]}>grupos mapeados</Text>
                  </Zone>
                </View>
              </Zone>

              <Zone
                keys={['surface', 'sectionBorder', 'textPrimary', 'textSecondary']}
                style={[
                  styles.miniInsight,
                  {
                    backgroundColor: sc('surface', '#FFFFFF'),
                    borderColor: sc('sectionBorder', '#E2E8F0'),
                  },
                ]}
              >
                <View style={styles.miniInsightRow}>
                  <Text style={[styles.miniInsightTitle, { color: sc('textPrimary', '#0F172A') }]}>Estados do botão</Text>
                  <Icon name="activity" size={14} color={sc('iconActive', '#1D4ED8')} />
                </View>
                <Text style={[styles.miniInsightText, { color: sc('textSecondary', '#64748B') }]}>
                  Os estados visuais ficam lado a lado para você perceber peso e contraste.
                </Text>
                <View style={styles.badgeRow}>
                  <Zone
                    keys={['buttonHoverBackground', 'buttonText']}
                    style={[
                      styles.chipPill,
                      {
                        backgroundColor: sc('buttonHoverBackground', '#1D4ED8'),
                        borderColor: sc('buttonHoverBackground', '#1D4ED8'),
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: sc('buttonText', '#FFFFFF') }]}>hover</Text>
                  </Zone>
                  <Zone
                    keys={['buttonPressedBackground', 'buttonText']}
                    style={[
                      styles.chipPill,
                      {
                        backgroundColor: sc('buttonPressedBackground', '#1E40AF'),
                        borderColor: sc('buttonPressedBackground', '#1E40AF'),
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: sc('buttonText', '#FFFFFF') }]}>pressed</Text>
                  </Zone>
                  <Zone
                    keys={['buttonFocusBorder', 'buttonBackgroundSecondary', 'buttonTextSecondary']}
                    style={[
                      styles.chipPill,
                      {
                        backgroundColor: sc('buttonBackgroundSecondary', '#F8FAFC'),
                        borderColor: sc('buttonFocusBorder', '#3B82F6'),
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: sc('buttonTextSecondary', '#0F172A') }]}>focus</Text>
                  </Zone>
                </View>
              </Zone>

              <Zone
                keys={['selectBackground', 'selectBorder', 'selectText', 'selectPlaceholderText', 'selectIcon']}
                style={[
                  styles.selectPreview,
                  {
                    backgroundColor: sc('selectBackground', '#FFFFFF'),
                    borderColor: sc('selectBorder', '#CBD5E1'),
                  },
                ]}
              >
                <Text style={[styles.selectPreviewText, { color: sc('selectText', '#0F172A') }]}>Tema aplicado</Text>
                <Icon name="chevron-down" size={14} color={sc('selectIcon', '#64748B')} />
              </Zone>
            </Zone>
          </View>

          <View style={[styles.featureGrid, isTablet ? styles.featureGridWide : styles.featureGridStack]}>
            <Zone
              keys={['cardBackground', 'cardBorder', 'textPrimary', 'textSecondary', 'iconColor', 'iconSuccess']}
              style={[
                styles.featureCard,
                {
                  backgroundColor: sc('cardBackground', '#FFFFFF'),
                  borderColor: sc('cardBorder', '#E2E8F0'),
                },
              ]}
            >
              <View style={styles.featureCardHeader}>
                <View style={[styles.featureIconBubble, { backgroundColor: withOpacity(sc('iconColor', '#2563EB'), 0.12) }]}>
                  <Icon name="globe" size={18} color={sc('iconColor', '#2563EB')} />
                </View>
                <Icon name="check-circle" size={18} color={sc('iconSuccess', '#16A34A')} />
              </View>
              <Text style={[styles.featureCardTitle, { color: sc('textPrimary', '#0F172A') }]}>Narrativa visual</Text>
              <Text style={[styles.featureCardText, { color: sc('textSecondary', '#64748B') }]}>
                Headline, CTA, métricas e navegação ajudam a entender a paleta como produto final.
              </Text>
              <Zone keys={['dividerBackground', 'dividerBorder']} style={[styles.dividerLine, { backgroundColor: sc('dividerBackground', '#E2E8F0') }]} />
              <View style={styles.badgeRow}>
                <Zone keys={['iconInfo']} style={[styles.chipPill, { backgroundColor: withOpacity(sc('iconInfo', '#0EA5E9'), 0.12), borderColor: 'transparent' }]}>
                  <Icon name="info" size={11} color={sc('iconInfo', '#0EA5E9')} />
                  <Text style={[styles.chipText, { color: sc('textPrimary', '#0F172A') }]}>info</Text>
                </Zone>
                <Zone keys={['iconWarning']} style={[styles.chipPill, { backgroundColor: withOpacity(sc('iconWarning', '#D97706'), 0.12), borderColor: 'transparent' }]}>
                  <Icon name="alert-triangle" size={11} color={sc('iconWarning', '#D97706')} />
                  <Text style={[styles.chipText, { color: sc('textPrimary', '#0F172A') }]}>warning</Text>
                </Zone>
                <Zone keys={['iconDanger']} style={[styles.chipPill, { backgroundColor: withOpacity(sc('iconDanger', '#DC2626'), 0.12), borderColor: 'transparent' }]}>
                  <Icon name="alert-circle" size={11} color={sc('iconDanger', '#DC2626')} />
                  <Text style={[styles.chipText, { color: sc('textPrimary', '#0F172A') }]}>danger</Text>
                </Zone>
              </View>
            </Zone>

            <Zone
              keys={['sectionBackground', 'sectionBorder', 'listItemSelectedBackground', 'listItemSelectedBorder', 'listItemText', 'listItemIcon']}
              style={[
                styles.featureCard,
                {
                  backgroundColor: sc('sectionBackground', '#F8FAFC'),
                  borderColor: sc('sectionBorder', '#E2E8F0'),
                },
              ]}
            >
              <View style={styles.featureCardHeader}>
                <Text style={[styles.featureCardTitle, { color: sc('textPrimary', '#0F172A') }]}>Seleção e foco</Text>
                <View style={[styles.featureIconBubble, { backgroundColor: withOpacity(sc('listItemSelectedBackground', '#EFF6FF'), 0.9) }]}>
                  <Icon name="target" size={18} color={sc('listItemIcon', '#64748B')} />
                </View>
              </View>
              <Zone
                keys={['listItemSelectedBackground', 'listItemSelectedBorder', 'listItemText', 'listItemSubtitleText']}
                style={[
                  styles.listRow,
                  {
                    backgroundColor: sc('listItemSelectedBackground', '#EFF6FF'),
                    borderColor: sc('listItemSelectedBorder', '#BFDBFE'),
                  },
                ]}
              >
                <Icon name="check" size={16} color={sc('listItemIcon', '#64748B')} />
                <View style={styles.listContent}>
                  <Text style={[styles.listTitle, { color: sc('listItemText', '#0F172A') }]}>Seção destacada</Text>
                  <Text style={[styles.listSubtitle, { color: sc('listItemSubtitleText', '#64748B') }]}>Fica fácil perceber tom, contraste e borda.</Text>
                </View>
              </Zone>
              <Text style={[styles.featureCardText, { color: sc('textSecondary', '#64748B') }]}>
                Cartões, listas e seleções compartilham ritmo visual para você testar coerência entre módulos.
              </Text>
            </Zone>

            <Zone
              keys={['surface', 'sectionBorder', 'textPrimary', 'textSecondary', 'textLink', 'textInverse', 'textDisabled', 'textPlaceholder']}
              style={[
                styles.featureCard,
                {
                  backgroundColor: sc('surface', '#FFFFFF'),
                  borderColor: sc('sectionBorder', '#E2E8F0'),
                },
              ]}
            >
              <Text style={[styles.featureCardTitle, { color: sc('textPrimary', '#0F172A') }]}>Paleta textual</Text>
              <Text style={[styles.featureCardText, { color: sc('textSecondary', '#64748B') }]}>
                Aqui ficam juntos os tons de texto para leitura rápida da hierarquia editorial.
              </Text>
              <View style={styles.textPaletteRow}>
                {textTokens.map(item => (
                  <Zone
                    key={item.key}
                    keys={[item.key]}
                    style={[styles.textTokenPill, { backgroundColor: item.background }]}
                  >
                    <Text style={[styles.textTokenLabel, { color: sc(item.key, '#0F172A') }]}>{item.label}</Text>
                  </Zone>
                ))}
                <Zone
                  keys={['textInverse', 'textPrimary']}
                  style={[styles.textTokenPill, { backgroundColor: sc('textPrimary', '#0F172A') }]}
                >
                  <Text style={[styles.textTokenLabel, { color: sc('textInverse', '#FFFFFF') }]}>Inverse</Text>
                </Zone>
                <Zone keys={['textDisabled']} style={[styles.textTokenPill, { backgroundColor: withOpacity(sc('textDisabled', '#94A3B8'), 0.18) }]}>
                  <Text style={[styles.textTokenLabel, { color: sc('textDisabled', '#94A3B8') }]}>Disabled</Text>
                </Zone>
                <Zone keys={['textPlaceholder']} style={[styles.textTokenPill, { backgroundColor: withOpacity(sc('textPlaceholder', '#94A3B8'), 0.14) }]}>
                  <Text style={[styles.textTokenLabel, { color: sc('textPlaceholder', '#94A3B8') }]}>Placeholder</Text>
                </Zone>
              </View>
            </Zone>
          </View>

          <View style={[styles.contentGrid, isWide ? styles.contentGridWide : styles.contentGridStack]}>
            <Zone
              keys={[
                'sectionBackground', 'sectionBorder', 'inputBackground', 'inputBorder', 'inputText', 'inputPlaceholderText',
                'inputIcon', 'inputFocusBorder', 'inputFilledBorder', 'inputErrorBackground', 'inputErrorBorder',
                'inputErrorText', 'inputDisabledBackground', 'inputDisabledBorder', 'inputDisabledText',
                'selectBackground', 'selectBorder', 'selectText', 'selectIcon', 'selectOptionBackground',
                'selectOptionBorder', 'selectOptionSelectedBackground', 'selectOptionSelectedText',
                'selectPlaceholderText', 'checkboxBackground', 'checkboxBorder', 'checkboxText',
                'checkboxSelectedBackground', 'checkboxSelectedBorder', 'checkboxSelectedMark',
                'checkboxDisabledBackground', 'checkboxDisabledBorder', 'checkboxDisabledMark',
                'radioBackground', 'radioBorder', 'radioText', 'radioSelectedBackground', 'radioSelectedBorder',
                'radioSelectedDot', 'radioDisabledBackground', 'radioDisabledBorder', 'radioDisabledDot',
                'switchOnTrack', 'switchOnThumb', 'switchOffTrack', 'switchOffThumb',
                'switchDisabledTrack', 'switchDisabledThumb',
              ]}
              style={[
                styles.formCard,
                {
                  backgroundColor: sc('sectionBackground', '#F8FAFC'),
                  borderColor: sc('sectionBorder', '#E2E8F0'),
                },
              ]}
            >
              <View style={styles.sectionHeaderRow}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.sectionTitle, { color: sc('textPrimary', '#0F172A') }]}>Form & controls</Text>
                  <Text style={[styles.sectionText, { color: sc('textSecondary', '#64748B') }]}>
                    Inputs, seleção e escolhas ficam visíveis ao mesmo tempo para você validar ritmo e contraste.
                  </Text>
                </View>
                <Icon name="sliders" size={18} color={sc('iconMuted', '#64748B')} />
              </View>

              <View style={styles.fieldStack}>
                <Text style={[styles.fieldLabel, { color: sc('textMuted', '#64748B') }]}>Input placeholder</Text>
                <Zone
                  keys={['inputBackground', 'inputBorder', 'inputPlaceholderText', 'inputIcon']}
                  style={[
                    styles.fieldBox,
                    {
                      backgroundColor: sc('inputBackground', '#FFFFFF'),
                      borderColor: sc('inputBorder', '#CBD5E1'),
                    },
                  ]}
                >
                  <Text style={[styles.fieldValue, { color: sc('inputPlaceholderText', '#94A3B8') }]}>Digite o nome do tema</Text>
                  <Icon name="search" size={14} color={sc('inputIcon', '#64748B')} />
                </Zone>
              </View>

              <View style={styles.fieldStack}>
                <Text style={[styles.fieldLabel, { color: sc('textMuted', '#64748B') }]}>Input focus</Text>
                <Zone
                  keys={['inputBackground', 'inputFocusBorder', 'inputText']}
                  style={[
                    styles.fieldBox,
                    {
                      backgroundColor: sc('inputBackground', '#FFFFFF'),
                      borderColor: sc('inputFocusBorder', '#2563EB'),
                    },
                  ]}
                >
                  <Text style={[styles.fieldValue, { color: sc('inputText', '#0F172A') }]}>Theme preview with hero layout</Text>
                </Zone>
              </View>

              <View style={styles.formTwoCols}>
                <View style={styles.formCol}>
                  <Text style={[styles.fieldLabel, { color: sc('textMuted', '#64748B') }]}>Select</Text>
                  <Zone
                    keys={['selectBackground', 'selectBorder', 'selectText', 'selectIcon']}
                    style={[
                      styles.fieldBox,
                      {
                        backgroundColor: sc('selectBackground', '#FFFFFF'),
                        borderColor: sc('selectBorder', '#CBD5E1'),
                      },
                    ]}
                  >
                    <Text style={[styles.fieldValue, { color: sc('selectText', '#0F172A') }]}>Apple-style layout</Text>
                    <Icon name="chevron-down" size={14} color={sc('selectIcon', '#64748B')} />
                  </Zone>
                  <Zone
                    keys={['selectOptionSelectedBackground', 'selectOptionBorder', 'selectOptionSelectedText']}
                    style={[
                      styles.fieldBox,
                      {
                        minHeight: 42,
                        backgroundColor: sc('selectOptionSelectedBackground', '#EFF6FF'),
                        borderColor: sc('selectOptionBorder', '#E2E8F0'),
                      },
                    ]}
                  >
                    <Text style={[styles.fieldValue, { color: sc('selectOptionSelectedText', '#1D4ED8') }]}>Opção selecionada</Text>
                  </Zone>
                </View>

                <View style={styles.formCol}>
                  <Text style={[styles.fieldLabel, { color: sc('textMuted', '#64748B') }]}>Select option</Text>
                  <Zone
                    keys={['selectOptionBackground', 'selectOptionBorder', 'selectText']}
                    style={[
                      styles.fieldBox,
                      {
                        minHeight: 42,
                        backgroundColor: sc('selectOptionBackground', '#FFFFFF'),
                        borderColor: sc('selectOptionBorder', '#E2E8F0'),
                      },
                    ]}
                  >
                    <Text style={[styles.fieldValue, { color: sc('selectText', '#0F172A') }]}>Opção base</Text>
                  </Zone>
                  <Text style={[styles.helperText, { color: sc('selectPlaceholderText', '#94A3B8') }]}>
                    Placeholder e estados da lista aparecem aqui lado a lado.
                  </Text>
                </View>
              </View>

              <View style={styles.formTwoCols}>
                <View style={styles.formCol}>
                  <Text style={[styles.fieldLabel, { color: sc('textMuted', '#64748B') }]}>Checkbox</Text>
                  <View style={{ gap: 10 }}>
                    <Zone keys={['checkboxBackground', 'checkboxBorder', 'checkboxText']} style={styles.controlRow}>
                      <View style={[styles.checkboxBox, { backgroundColor: sc('checkboxBackground', '#FFFFFF'), borderColor: sc('checkboxBorder', '#94A3B8') }]} />
                      <Text style={[styles.fieldValue, { color: sc('checkboxText', '#0F172A') }]}>Normal</Text>
                    </Zone>
                    <Zone keys={['checkboxSelectedBackground', 'checkboxSelectedBorder', 'checkboxSelectedMark', 'checkboxText']} style={styles.controlRow}>
                      <View style={[styles.checkboxBox, { backgroundColor: sc('checkboxSelectedBackground', '#2563EB'), borderColor: sc('checkboxSelectedBorder', '#1D4ED8') }]}>
                        <Text style={[styles.checkboxMark, { color: sc('checkboxSelectedMark', '#FFFFFF') }]}>✓</Text>
                      </View>
                      <Text style={[styles.fieldValue, { color: sc('checkboxText', '#0F172A') }]}>Selecionado</Text>
                    </Zone>
                    <Zone keys={['checkboxDisabledBackground', 'checkboxDisabledBorder', 'checkboxDisabledMark']} style={styles.controlRow}>
                      <View style={[styles.checkboxBox, { backgroundColor: sc('checkboxDisabledBackground', '#F1F5F9'), borderColor: sc('checkboxDisabledBorder', '#CBD5E1') }]} />
                      <Text style={[styles.fieldValue, { color: sc('checkboxDisabledMark', '#94A3B8') }]}>Desabilitado</Text>
                    </Zone>
                  </View>
                </View>

                <View style={styles.formCol}>
                  <Text style={[styles.fieldLabel, { color: sc('textMuted', '#64748B') }]}>Radio & switch</Text>
                  <View style={{ gap: 10 }}>
                    <Zone keys={['radioSelectedBackground', 'radioSelectedBorder', 'radioSelectedDot', 'radioText']} style={styles.controlRow}>
                      <View style={[styles.radioBox, { backgroundColor: sc('radioSelectedBackground', '#FFFFFF'), borderColor: sc('radioSelectedBorder', '#2563EB') }]}>
                        <View style={[styles.radioDot, { backgroundColor: sc('radioSelectedDot', '#2563EB') }]} />
                      </View>
                      <Text style={[styles.fieldValue, { color: sc('radioText', '#0F172A') }]}>Opção ativa</Text>
                    </Zone>
                    <Zone keys={['radioDisabledBackground', 'radioDisabledBorder', 'radioDisabledDot']} style={styles.controlRow}>
                      <View style={[styles.radioBox, { backgroundColor: sc('radioDisabledBackground', '#F1F5F9'), borderColor: sc('radioDisabledBorder', '#CBD5E1') }]} />
                      <Text style={[styles.fieldValue, { color: sc('radioDisabledDot', '#94A3B8') }]}>Opção bloqueada</Text>
                    </Zone>
                    <Zone keys={['switchOnTrack', 'switchOnThumb']} style={styles.controlRow}>
                      <View style={[styles.switchTrack, { backgroundColor: sc('switchOnTrack', '#2563EB') }]}>
                        <View style={[styles.switchThumb, { backgroundColor: sc('switchOnThumb', '#FFFFFF'), alignSelf: 'flex-end' }]} />
                      </View>
                      <Text style={[styles.fieldValue, { color: sc('textPrimary', '#0F172A') }]}>Switch ligado</Text>
                    </Zone>
                    <Zone keys={['switchDisabledTrack', 'switchDisabledThumb']} style={styles.controlRow}>
                      <View style={[styles.switchTrack, { backgroundColor: sc('switchDisabledTrack', '#E2E8F0') }]}>
                        <View style={[styles.switchThumb, { backgroundColor: sc('switchDisabledThumb', '#94A3B8'), alignSelf: 'flex-start' }]} />
                      </View>
                      <Text style={[styles.fieldValue, { color: sc('textSecondary', '#64748B') }]}>Switch desabilitado</Text>
                    </Zone>
                  </View>
                </View>
              </View>

              <Zone
                keys={['inputErrorBackground', 'inputErrorBorder', 'inputErrorText']}
                style={[
                  styles.fieldBox,
                  {
                    backgroundColor: sc('inputErrorBackground', '#FEF2F2'),
                    borderColor: sc('inputErrorBorder', '#DC2626'),
                  },
                ]}
              >
                <Text style={[styles.fieldValue, { color: sc('inputErrorText', '#B91C1C') }]}>Token ausente: contraste insuficiente</Text>
              </Zone>

              <Zone
                keys={['inputDisabledBackground', 'inputDisabledBorder', 'inputDisabledText']}
                style={[
                  styles.fieldBox,
                  {
                    backgroundColor: sc('inputDisabledBackground', '#F1F5F9'),
                    borderColor: sc('inputDisabledBorder', '#E2E8F0'),
                  },
                ]}
              >
                <Text style={[styles.fieldValue, { color: sc('inputDisabledText', '#94A3B8') }]}>Campo indisponível enquanto o tema carrega</Text>
              </Zone>
            </Zone>

            <View style={styles.contentStack}>
              <Zone
                keys={[
                  'sheetBackground', 'sheetBorder', 'listItemBackground', 'listItemBorder', 'listItemText',
                  'listItemSubtitleText', 'listItemIcon', 'listItemEvenRow', 'listItemOddRow',
                  'listItemSelectedBackground', 'listItemSelectedBorder', 'listItemActiveBackground',
                  'listItemActiveBorder', 'listItemDisabledText', 'dividerBackground', 'dividerText',
                ]}
                style={[
                  styles.listCard,
                  {
                    backgroundColor: sc('sheetBackground', '#FFFFFF'),
                    borderColor: sc('sheetBorder', '#E2E8F0'),
                  },
                ]}
              >
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: sc('textPrimary', '#0F172A') }]}>List & selection</Text>
                  <Text style={[styles.sectionText, { color: sc('dividerText', '#94A3B8') }]}>Estados lado a lado</Text>
                </View>
                <View style={styles.listStack}>
                  <Zone
                    keys={['listItemOddRow', 'listItemBorder', 'listItemText', 'listItemSubtitleText', 'listItemIcon']}
                    style={[
                      styles.listRow,
                      {
                        backgroundColor: sc('listItemOddRow', '#FFFFFF'),
                        borderColor: sc('listItemBorder', '#E2E8F0'),
                      },
                    ]}
                  >
                    <Icon name="circle" size={14} color={sc('listItemIcon', '#64748B')} />
                    <View style={styles.listContent}>
                      <Text style={[styles.listTitle, { color: sc('listItemText', '#0F172A') }]}>Linha ímpar</Text>
                      <Text style={[styles.listSubtitle, { color: sc('listItemSubtitleText', '#64748B') }]}>Hierarquia base da lista</Text>
                    </View>
                  </Zone>
                  <Zone
                    keys={['listItemEvenRow', 'listItemBorder', 'listItemText', 'listItemSubtitleText']}
                    style={[
                      styles.listRow,
                      {
                        backgroundColor: sc('listItemEvenRow', '#F8FAFC'),
                        borderColor: sc('listItemBorder', '#E2E8F0'),
                      },
                    ]}
                  >
                    <Icon name="circle" size={14} color={sc('listItemIcon', '#64748B')} />
                    <View style={styles.listContent}>
                      <Text style={[styles.listTitle, { color: sc('listItemText', '#0F172A') }]}>Linha par</Text>
                      <Text style={[styles.listSubtitle, { color: sc('listItemSubtitleText', '#64748B') }]}>Alternância de fundo</Text>
                    </View>
                  </Zone>
                  <Zone
                    keys={['listItemSelectedBackground', 'listItemSelectedBorder', 'listItemText']}
                    style={[
                      styles.listRow,
                      {
                        backgroundColor: sc('listItemSelectedBackground', '#EFF6FF'),
                        borderColor: sc('listItemSelectedBorder', '#BFDBFE'),
                      },
                    ]}
                  >
                    <Icon name="check" size={14} color={sc('listItemText', '#0F172A')} />
                    <View style={styles.listContent}>
                      <Text style={[styles.listTitle, { color: sc('listItemText', '#0F172A') }]}>Selecionado</Text>
                      <Text style={[styles.listSubtitle, { color: sc('listItemSubtitleText', '#64748B') }]}>Estado pronto para ação</Text>
                    </View>
                  </Zone>
                  <Zone
                    keys={['listItemActiveBackground', 'listItemActiveBorder', 'listItemText']}
                    style={[
                      styles.listRow,
                      {
                        backgroundColor: sc('listItemActiveBackground', '#EFF6FF'),
                        borderColor: sc('listItemActiveBorder', '#BFDBFE'),
                      },
                    ]}
                  >
                    <Icon name="zap" size={14} color={sc('listItemIcon', '#64748B')} />
                    <View style={styles.listContent}>
                      <Text style={[styles.listTitle, { color: sc('listItemText', '#0F172A') }]}>Ativo</Text>
                      <Text style={[styles.listSubtitle, { color: sc('listItemSubtitleText', '#64748B') }]}>Feedback de foco visual</Text>
                    </View>
                  </Zone>
                  <Zone keys={['dividerBackground', 'dividerText']} style={[styles.dividerLine, { backgroundColor: sc('dividerBackground', '#E2E8F0') }]} />
                  <Zone keys={['listItemDisabledText']}>
                    <Text style={[styles.helperText, { color: sc('listItemDisabledText', '#94A3B8') }]}>
                      Item desabilitado usa uma assinatura mais discreta para não competir com a ação principal.
                    </Text>
                  </Zone>
                </View>
              </Zone>

              <Zone
                keys={[
                  'tableToolbarBackground', 'tableToolbarBorder', 'tableToolbarText', 'tableHeaderBackground',
                  'tableHeaderBorder', 'tableHeaderText', 'tableHeaderIcon', 'tableFilterBackground',
                  'tableFilterBorder', 'tableFilterText', 'tableRowOddBackground', 'tableRowEvenBackground',
                  'tableRowSelectedBackground', 'tableRowSelectedBorder', 'tableRowText', 'tableRowMutedText',
                  'tableRowBorder', 'tableActionBackground', 'tableActionBorder', 'tableActionIcon',
                  'tableFooterBackground', 'tableFooterBorder', 'tableFooterText',
                ]}
                style={[
                  styles.tableCard,
                  {
                    backgroundColor: sc('surface', '#FFFFFF'),
                    borderColor: sc('sectionBorder', '#E2E8F0'),
                  },
                ]}
              >
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: sc('textPrimary', '#0F172A') }]}>Data table</Text>
                  <Text style={[styles.sectionText, { color: sc('textSecondary', '#64748B') }]}>Leitura de dados e ações</Text>
                </View>

                <View style={[styles.tableShell, { borderColor: sc('tableHeaderBorder', '#E2E8F0') }]}>
                  <Zone
                    keys={['tableToolbarBackground', 'tableToolbarBorder', 'tableToolbarText']}
                    style={[
                      styles.tableToolbar,
                      {
                        backgroundColor: sc('tableToolbarBackground', '#FFFFFF'),
                        borderBottomColor: sc('tableToolbarBorder', '#E2E8F0'),
                      },
                    ]}
                  >
                    <Text style={[styles.tableToolbarText, { color: sc('tableToolbarText', '#0F172A') }]}>Pedidos recentes</Text>
                    <View style={styles.badgeRow}>
                      <Zone
                        keys={['tableActionBackground', 'tableActionBorder', 'tableActionIcon']}
                        style={[
                          styles.actionButton,
                          {
                            backgroundColor: sc('tableActionBackground', '#FFFFFF'),
                            borderColor: sc('tableActionBorder', '#E2E8F0'),
                          },
                        ]}
                      >
                        <Icon name="download" size={12} color={sc('tableActionIcon', '#64748B')} />
                      </Zone>
                    </View>
                  </Zone>

                  <Zone
                    keys={['tableHeaderBackground', 'tableHeaderBorder', 'tableHeaderText', 'tableHeaderIcon']}
                    style={[
                      styles.tableHeader,
                      {
                        backgroundColor: sc('tableHeaderBackground', '#F8FAFC'),
                        borderBottomColor: sc('tableHeaderBorder', '#E2E8F0'),
                      },
                    ]}
                  >
                    <Text style={[styles.tableHeaderCell, { color: sc('tableHeaderText', '#0F172A') }]}>Pedido</Text>
                    <Text style={[styles.tableHeaderCell, { color: sc('tableHeaderText', '#0F172A') }]}>Status</Text>
                    <Text style={[styles.tableHeaderCell, { color: sc('tableHeaderText', '#0F172A') }]}>Owner</Text>
                    <Icon name="chevron-down" size={13} color={sc('tableHeaderIcon', '#64748B')} />
                  </Zone>

                  <Zone
                    keys={['tableFilterBackground', 'tableFilterBorder', 'tableFilterText']}
                    style={[
                      styles.tableRow,
                      {
                        backgroundColor: sc('tableFilterBackground', '#FFFFFF'),
                        borderBottomColor: sc('tableFilterBorder', '#CBD5E1'),
                      },
                    ]}
                  >
                    <Text style={[styles.tableCell, { color: sc('tableFilterText', '#0F172A') }]}>Filtrar por marca, owner ou contraste…</Text>
                    <Icon name="search" size={13} color={sc('tableFilterText', '#0F172A')} />
                  </Zone>

                  <Zone
                    keys={['tableRowOddBackground', 'tableRowBorder', 'tableRowText', 'tableRowMutedText']}
                    style={[
                      styles.tableRow,
                      {
                        backgroundColor: sc('tableRowOddBackground', '#FFFFFF'),
                        borderBottomColor: sc('tableRowBorder', '#E2E8F0'),
                      },
                    ]}
                  >
                    <Text style={[styles.tableCell, { color: sc('tableRowText', '#0F172A') }]}>#2039</Text>
                    <Text style={[styles.tableCell, { color: sc('tableRowText', '#0F172A') }]}>Revisando</Text>
                    <Text style={[styles.tableCell, { color: sc('tableRowMutedText', '#64748B') }]}>Design</Text>
                    <Zone
                      keys={['tableActionBackground', 'tableActionBorder', 'tableActionIcon']}
                      style={[
                        styles.actionButton,
                        {
                          backgroundColor: sc('tableActionBackground', '#FFFFFF'),
                          borderColor: sc('tableActionBorder', '#E2E8F0'),
                        },
                      ]}
                    >
                      <Icon name="edit-3" size={12} color={sc('tableActionIcon', '#64748B')} />
                    </Zone>
                  </Zone>

                  <Zone
                    keys={['tableRowEvenBackground', 'tableRowBorder', 'tableRowText', 'tableActionBackground', 'tableActionBorder', 'tableActionIcon']}
                    style={[
                      styles.tableRow,
                      {
                        backgroundColor: sc('tableRowEvenBackground', '#F8FAFC'),
                        borderBottomColor: sc('tableRowBorder', '#E2E8F0'),
                      },
                    ]}
                  >
                    <Text style={[styles.tableCell, { color: sc('tableRowText', '#0F172A') }]}>#2040</Text>
                    <Text style={[styles.tableCell, { color: sc('tableRowText', '#0F172A') }]}>Ajustes</Text>
                    <Text style={[styles.tableCell, { color: sc('tableRowMutedText', '#64748B') }]}>Theme team</Text>
                    <Zone
                      keys={['tableActionBackground', 'tableActionBorder', 'tableActionIcon']}
                      style={[
                        styles.actionButton,
                        {
                          backgroundColor: sc('tableActionBackground', '#FFFFFF'),
                          borderColor: sc('tableActionBorder', '#E2E8F0'),
                        },
                      ]}
                    >
                      <Icon name="more-horizontal" size={12} color={sc('tableActionIcon', '#64748B')} />
                    </Zone>
                  </Zone>

                  <Zone
                    keys={['tableRowSelectedBackground', 'tableRowSelectedBorder', 'tableRowText']}
                    style={[
                      styles.tableRow,
                      {
                        backgroundColor: sc('tableRowSelectedBackground', '#EFF6FF'),
                        borderBottomColor: sc('tableRowSelectedBorder', '#BFDBFE'),
                      },
                    ]}
                  >
                    <Text style={[styles.tableCell, { color: sc('tableRowText', '#0F172A') }]}>#2041</Text>
                    <Text style={[styles.tableCell, { color: sc('tableRowText', '#0F172A') }]}>Aprovado</Text>
                    <Text style={[styles.tableCell, { color: sc('tableRowText', '#0F172A') }]}>Product</Text>
                    <Icon name="check" size={13} color={sc('tableRowText', '#0F172A')} />
                  </Zone>

                  <Zone
                    keys={['tableFooterBackground', 'tableFooterBorder', 'tableFooterText']}
                    style={[
                      styles.footerRow,
                      {
                        backgroundColor: sc('tableFooterBackground', '#F8FAFC'),
                        borderBottomColor: sc('tableFooterBorder', '#E2E8F0'),
                      },
                    ]}
                  >
                    <Text style={[styles.tableCell, { color: sc('tableFooterText', '#64748B'), fontWeight: '900' }]}>Total visível: 3</Text>
                    <Text style={[styles.tableCell, { color: sc('tableFooterText', '#64748B'), textAlign: 'right' }]}>Atualizado agora</Text>
                  </Zone>
                </View>
              </Zone>
            </View>
          </View>

          <View style={[styles.statesGrid, isTablet ? styles.statesGridWide : styles.statesGridStack]}>
            <Zone
              keys={['overlayBackground', 'overlayBorder', 'overlayShadow', 'loadingOverlay', 'loadingBackground', 'loadingBorder', 'loadingSpinner', 'loadingText']}
              style={[
                styles.stateCanvas,
                {
                  backgroundColor: sc('surface', '#FFFFFF'),
                  borderColor: sc('sectionBorder', '#E2E8F0'),
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: sc('textPrimary', '#0F172A') }]}>Overlay & loading</Text>
              <View style={styles.overlayCanvas}>
                <Zone
                  keys={['overlayBackground', 'overlayBorder', 'overlayShadow']}
                  style={[
                    styles.overlayFill,
                    {
                      backgroundColor: gc('overlayBackground') || withOpacity('#000000', 0.44),
                    },
                  ]}
                />
                <Zone
                  keys={['loadingBackground', 'loadingBorder', 'loadingSpinner', 'loadingText']}
                  style={[
                    styles.loadingSheet,
                    {
                      backgroundColor: sc('loadingBackground', '#FFFFFF'),
                      borderColor: sc('loadingBorder', '#E2E8F0'),
                    },
                  ]}
                >
                  <ActivityIndicator size="small" color={sc('loadingSpinner', '#2563EB')} />
                  <Text style={[styles.fieldValue, { color: sc('loadingText', '#64748B') }]}>Gerando visual completo…</Text>
                </Zone>
              </View>
            </Zone>

            <Zone
              keys={['modalOverlay', 'modalBackground', 'modalBorder', 'modalHeaderText', 'modalText', 'modalCloseIcon', 'sheetBackground', 'sheetBorder']}
              style={[
                styles.stateCanvas,
                {
                  backgroundColor: sc('surface', '#FFFFFF'),
                  borderColor: sc('sectionBorder', '#E2E8F0'),
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: sc('textPrimary', '#0F172A') }]}>Modal & sheet</Text>
              <View style={styles.overlayCanvas}>
                <Zone
                  keys={['modalOverlay']}
                  style={[
                    styles.overlayFill,
                    {
                      backgroundColor: gc('modalOverlay') || withOpacity('#000000', 0.48),
                    },
                  ]}
                />
                <Zone
                  keys={['sheetBackground', 'sheetBorder', 'modalBackground', 'modalBorder', 'modalHeaderText', 'modalText', 'modalCloseIcon']}
                  style={[
                    styles.modalSheet,
                    {
                      backgroundColor: sc('sheetBackground', sc('modalBackground', '#FFFFFF')),
                      borderColor: sc('sheetBorder', sc('modalBorder', '#E2E8F0')),
                    },
                  ]}
                >
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: sc('modalHeaderText', '#0F172A') }]}>Confirmar alterações</Text>
                    <Icon name="x" size={16} color={sc('modalCloseIcon', '#64748B')} />
                  </View>
                  <Text style={[styles.sectionText, { color: sc('modalText', '#334155') }]}>
                    Você pode ler modal, overlay e container da sheet no mesmo recorte da página.
                  </Text>
                  <View style={styles.badgeRow}>
                    <Zone
                      keys={['buttonBackground', 'buttonBorder', 'buttonText']}
                      style={[
                        styles.chipPill,
                        {
                          backgroundColor: sc('buttonBackground', '#2563EB'),
                          borderColor: sc('buttonBorder', '#1D4ED8'),
                        },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: sc('buttonText', '#FFFFFF') }]}>Salvar tema</Text>
                    </Zone>
                    <Zone
                      keys={['buttonBackgroundSecondary', 'buttonBorderSecondary', 'buttonTextSecondary']}
                      style={[
                        styles.chipPill,
                        {
                          backgroundColor: sc('buttonBackgroundSecondary', '#F8FAFC'),
                          borderColor: sc('buttonBorderSecondary', '#CBD5E1'),
                        },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: sc('buttonTextSecondary', '#0F172A') }]}>Cancelar</Text>
                    </Zone>
                  </View>
                </Zone>
              </View>
            </Zone>

            <View style={styles.toastColumn}>
              <Zone
                keys={['toastBackground', 'toastBorder', 'toastIcon', 'toastText']}
                style={[
                  styles.toastCard,
                  {
                    backgroundColor: sc('toastBackground', '#FFFFFF'),
                    borderColor: sc('toastBorder', '#E2E8F0'),
                  },
                ]}
              >
                <Icon name="info" size={16} color={sc('toastIcon', '#64748B')} />
                <View style={styles.toastTextWrap}>
                  <Text style={[styles.toastTitle, { color: sc('toastText', '#0F172A') }]}>Toast base</Text>
                  <Text style={[styles.toastText, { color: sc('toastText', '#0F172A') }]}>Mensagem neutra de sistema.</Text>
                </View>
              </Zone>
              <Zone
                keys={['toastInfoBackground', 'toastInfoBorder', 'toastInfoIcon', 'toastInfoText']}
                style={[
                  styles.toastCard,
                  {
                    backgroundColor: sc('toastInfoBackground', '#EFF6FF'),
                    borderColor: sc('toastInfoBorder', '#BFDBFE'),
                  },
                ]}
              >
                <Icon name="bell" size={16} color={sc('toastInfoIcon', '#2563EB')} />
                <View style={styles.toastTextWrap}>
                  <Text style={[styles.toastTitle, { color: sc('toastInfoText', '#1D4ED8') }]}>Info</Text>
                  <Text style={[styles.toastText, { color: sc('toastInfoText', '#1D4ED8') }]}>Fallback RNW disponível para leitura rápida.</Text>
                </View>
              </Zone>
              <Zone
                keys={['toastSuccessBackground', 'toastSuccessBorder', 'toastSuccessIcon', 'toastSuccessText']}
                style={[
                  styles.toastCard,
                  {
                    backgroundColor: sc('toastSuccessBackground', '#F0FDF4'),
                    borderColor: sc('toastSuccessBorder', '#BBF7D0'),
                  },
                ]}
              >
                <Icon name="check-circle" size={16} color={sc('toastSuccessIcon', '#16A34A')} />
                <View style={styles.toastTextWrap}>
                  <Text style={[styles.toastTitle, { color: sc('toastSuccessText', '#15803D') }]}>Success</Text>
                  <Text style={[styles.toastText, { color: sc('toastSuccessText', '#15803D') }]}>Leitura do contexto visual concluída.</Text>
                </View>
              </Zone>
              <Zone
                keys={['toastWarningBackground', 'toastWarningBorder', 'toastWarningIcon', 'toastWarningText']}
                style={[
                  styles.toastCard,
                  {
                    backgroundColor: sc('toastWarningBackground', '#FFFBEB'),
                    borderColor: sc('toastWarningBorder', '#FDE68A'),
                  },
                ]}
              >
                <Icon name="alert-triangle" size={16} color={sc('toastWarningIcon', '#D97706')} />
                <View style={styles.toastTextWrap}>
                  <Text style={[styles.toastTitle, { color: sc('toastWarningText', '#B45309') }]}>Warning</Text>
                  <Text style={[styles.toastText, { color: sc('toastWarningText', '#B45309') }]}>Alguns tokens ainda usam fallback.</Text>
                </View>
              </Zone>
              <Zone
                keys={['toastDangerBackground', 'toastDangerBorder', 'toastDangerIcon', 'toastDangerText']}
                style={[
                  styles.toastCard,
                  {
                    backgroundColor: sc('toastDangerBackground', '#FEF2F2'),
                    borderColor: sc('toastDangerBorder', '#FECACA'),
                  },
                ]}
              >
                <Icon name="x-circle" size={16} color={sc('toastDangerIcon', '#DC2626')} />
                <View style={styles.toastTextWrap}>
                  <Text style={[styles.toastTitle, { color: sc('toastDangerText', '#B91C1C') }]}>Danger</Text>
                  <Text style={[styles.toastText, { color: sc('toastDangerText', '#B91C1C') }]}>A opção "show undefined" destaca o que falta em verde.</Text>
                </View>
              </Zone>
            </View>
          </View>

          <Zone
            keys={['footerBackground', 'footerBorder', 'footerText', 'footerLink', 'footerIcon']}
            style={[
              styles.footerBar,
              {
                backgroundColor: sc('footerBackground', '#0F172A'),
                borderColor: sc('footerBorder', '#1E293B'),
              },
            ]}
          >
            <View style={styles.footerBrand}>
              <Text style={[styles.footerTitle, { color: footerReadable }]}>Color system preview</Text>
              <Text style={[styles.footerCopy, { color: sc('footerText', '#CBD5E1') }]}>
                Landing page de referência para avaliar tema, contraste, estados e completude.
              </Text>
            </View>
            <View style={styles.footerLinks}>
              <Zone keys={['footerLink', 'footerIcon']} style={styles.controlRow}>
                <Icon name="mail" size={14} color={sc('footerIcon', '#94A3B8')} />
                <Text style={[styles.footerLinkText, { color: sc('footerLink', '#60A5FA') }]}>Support</Text>
              </Zone>
              <Zone keys={['footerLink', 'footerIcon']} style={styles.controlRow}>
                <Icon name="github" size={14} color={sc('footerIcon', '#94A3B8')} />
                <Text style={[styles.footerLinkText, { color: sc('footerLink', '#60A5FA') }]}>Repository</Text>
              </Zone>
            </View>
          </Zone>
        </View>
      </View>
    </View>
  );
};

// ─── ThemePreviewPage ─────────────────────────────────────────────────────────

export default function ThemePreviewPage() {
  const route = useRoute();
  const { width } = useWindowDimensions();
  const themeId = String(route.params?.themeId || '').trim();

  const [themeItem, setThemeItem] = useState(
    route.params?.theme ? route.params.theme : null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [rnwMode, setRnwMode] = useState(false);
  const [showUndefined, setShowUndefined] = useState(false);

  const loadTheme = useCallback(async () => {
    if (!themeId) return;
    setIsLoading(true);
    setLoadError('');
    try {
      const response = await api.fetch(`/themes/${themeId}`);
      setThemeItem(response || null);
    } catch (error) {
      setLoadError(formatApiError(error));
    } finally {
      setIsLoading(false);
    }
  }, [themeId]);

  useFocusEffect(
    useCallback(() => { loadTheme(); }, [loadTheme]),
  );

  const themeColors = useMemo(
    () => normalizeColors(themeItem?.colors),
    [themeItem?.colors],
  );
  const isWide = width >= 1180;
  const isTablet = width >= 860;
  const allTokens = useMemo(
    () => THEME_MAP_GROUPS.flatMap(group => group.tokens),
    [],
  );
  const filledTokenCount = useMemo(
    () => allTokens.filter(token => hasValue(themeColors?.[token])).length,
    [allTokens, themeColors],
  );
  const filledGroupCount = useMemo(
    () => THEME_MAP_GROUPS.filter(group => group.tokens.some(token => hasValue(themeColors?.[token]))).length,
    [themeColors],
  );

  const bgColor = useMemo(() => {
    const bg = resolveColor(themeColors, 'appBackground', rnwMode);
    return bg && !isTransparent(bg) ? bg : undefined;
  }, [themeColors, rnwMode]);

  const controlBarStyle = useMemo(() => ({
    backgroundColor: resolveColor(themeColors, 'containerBackground', rnwMode),
    borderBottomColor: resolveColor(themeColors, 'containerBorder', rnwMode),
  }), [themeColors, rnwMode]);

  if (isLoading && !themeItem) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: '#F8FAFC' }]} edges={['bottom']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  if ((loadError || !themeItem) && !isLoading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: '#F8FAFC' }]} edges={['bottom']}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            {loadError || 'Tema não encontrado.\nSelecione um tema para ver o preview.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
      <SafeAreaView style={[styles.root, { backgroundColor: bgColor }]} edges={['bottom']}>
      <View style={styles.ambientLayer} pointerEvents="none">
        <View style={[styles.ambientOrbA, { backgroundColor: withOpacity(resolveColor(themeColors, 'buttonBackground', rnwMode), 0.12) }]} />
        <View style={[styles.ambientOrbB, { backgroundColor: withOpacity(resolveColor(themeColors, 'chipSelectedBackground', rnwMode), 0.08) }]} />
        <View style={[styles.ambientOrbC, { backgroundColor: withOpacity(resolveColor(themeColors, 'badgeBackground', rnwMode), 0.18) }]} />
      </View>

      {/* ── barra de controles ── */}
      <View style={[styles.controlsBar, controlBarStyle]}>
        <View style={styles.controlsInfo}>
          <Text style={[styles.controlsName, { color: resolveColor(themeColors, 'textPrimary', rnwMode) }]}>
            {themeItem?.theme || `Tema ${themeItem?.id}`}
          </Text>
          <Text style={[styles.controlsId, { color: resolveColor(themeColors, 'textSecondary', rnwMode) }]}>
            #{themeItem?.id} · passe o mouse nos elementos para ver o token e a cor
          </Text>
        </View>
        <View style={styles.controlsToggles}>
          <CheckboxToggle
            label="RNW"
            value={rnwMode}
            onChange={setRnwMode}
          />
          <CheckboxToggle
            label="Show Undefined"
            value={showUndefined}
            onChange={setShowUndefined}
            green
          />
        </View>
      </View>

      {/* ── grid de grupos ── */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.shellFrame}>
          <ThemeLandingPreview
            themeColors={themeColors}
            rnwMode={rnwMode}
            showUndefined={showUndefined}
            themeItem={themeItem}
            isWide={isWide}
            isTablet={isTablet}
            filledTokenCount={filledTokenCount}
            totalTokenCount={allTokens.length}
            filledGroupCount={filledGroupCount}
          />

          <View
            style={[
              styles.paletteSection,
              {
                backgroundColor: resolveColor(themeColors, 'containerBackground', rnwMode),
                borderColor: resolveColor(themeColors, 'containerBorder', rnwMode),
              },
            ]}
          >
            <View style={styles.paletteHeader}>
              <Text style={[styles.paletteEyebrow, { color: resolveColor(themeColors, 'textMuted', rnwMode) }]}>
                Mapa Completo
              </Text>
              <Text style={[styles.paletteTitle, { color: resolveColor(themeColors, 'textPrimary', rnwMode) }]}>
                Todos os objetos do `themes-map.md` em um inspector único.
              </Text>
              <Text style={[styles.paletteText, { color: resolveColor(themeColors, 'textSecondary', rnwMode) }]}>
                Cada card abaixo preserva o preview visual do objeto e mantém os swatches hoveráveis para você ver
                nome do token e valor em hex. Com `Show Undefined`, qualquer objeto com alguma propriedade sem cor fica verde.
              </Text>
              <View style={styles.paletteSummaryRow}>
                <View
                  style={[
                    styles.paletteSummaryCard,
                    {
                      backgroundColor: resolveColor(themeColors, 'cardBackground', rnwMode),
                      borderColor: resolveColor(themeColors, 'cardBorder', rnwMode),
                    },
                  ]}
                >
                  <Text style={[styles.paletteSummaryValue, { color: resolveColor(themeColors, 'cardText', rnwMode) }]}>
                    {filledTokenCount}/{allTokens.length}
                  </Text>
                  <Text style={[styles.paletteSummaryLabel, { color: resolveColor(themeColors, 'cardText', rnwMode) }]}>
                    tokens definidos
                  </Text>
                </View>
                <View
                  style={[
                    styles.paletteSummaryCard,
                    {
                      backgroundColor: resolveColor(themeColors, 'badgeSelectedBackground', rnwMode),
                      borderColor: resolveColor(themeColors, 'badgeSelectedBorder', rnwMode),
                    },
                  ]}
                >
                  <Text style={[styles.paletteSummaryValue, { color: resolveColor(themeColors, 'badgeSelectedText', rnwMode) }]}>
                    {filledGroupCount}/{THEME_MAP_GROUPS.length}
                  </Text>
                  <Text style={[styles.paletteSummaryLabel, { color: resolveColor(themeColors, 'badgeSelectedText', rnwMode) }]}>
                    grupos com cor
                  </Text>
                </View>
                <View
                  style={[
                    styles.paletteSummaryCard,
                    {
                      backgroundColor: showUndefined ? '#22C55E' : resolveColor(themeColors, 'chipBackground', rnwMode),
                      borderColor: showUndefined ? '#15803D' : resolveColor(themeColors, 'chipBorder', rnwMode),
                    },
                  ]}
                >
                  <Text style={[styles.paletteSummaryValue, { color: showUndefined ? '#FFFFFF' : resolveColor(themeColors, 'chipText', rnwMode) }]}>
                    {allTokens.length - filledTokenCount}
                  </Text>
                  <Text style={[styles.paletteSummaryLabel, { color: showUndefined ? '#FFFFFF' : resolveColor(themeColors, 'chipText', rnwMode) }]}>
                    faltando agora
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.grid}>
              {THEME_MAP_GROUPS.map(group => (
                <GroupCard
                  key={group.label}
                  group={group}
                  themeColors={themeColors}
                  rnwMode={rnwMode}
                  showUndefined={showUndefined}
                />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
