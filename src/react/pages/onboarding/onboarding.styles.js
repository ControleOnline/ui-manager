import { StyleSheet } from 'react-native';

export function createOnboardingStyles(colors = {}) {
  const text = colors.textPrimary || colors.text || '#111';
  const muted = colors.textMuted || colors.mutedText || '#666';
  const cardBg = colors.cardBackground || '#fff';
  const border = colors.cardBorder || '#e5e5e5';
  const primary = colors.buttonBackground || colors.primary || '#2563eb';
  const primaryText = colors.buttonText || '#fff';
  const danger = colors.iconDanger || '#b91c1c';
  const surface = colors.background || colors.pageBackground || '#f8fafc';

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: surface,
      padding: 16,
    },
    banner: {
      backgroundColor: '#fef3c7',
      borderColor: '#f59e0b',
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    },
    bannerText: {
      color: '#92400e',
      fontSize: 13,
      lineHeight: 18,
    },
    previewBadge: {
      alignSelf: 'flex-start',
      backgroundColor: '#e0e7ff',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      marginBottom: 8,
    },
    previewBadgeText: {
      color: '#3730a3',
      fontSize: 12,
      fontWeight: '600',
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: muted,
      marginBottom: 16,
    },
    card: {
      backgroundColor: cardBg,
      borderColor: border,
      borderWidth: 1,
      borderRadius: 10,
      padding: 14,
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: text,
      marginBottom: 8,
    },
    label: {
      fontSize: 13,
      color: muted,
      marginBottom: 4,
      marginTop: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      color: text,
      backgroundColor: cardBg,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    rowLabel: {
      flex: 1,
      fontSize: 14,
      color: text,
      paddingRight: 8,
    },
    stepTabs: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 12,
      gap: 6,
    },
    stepChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: border,
      marginRight: 6,
      marginBottom: 6,
    },
    stepChipActive: {
      backgroundColor: primary,
      borderColor: primary,
    },
    stepChipText: {
      fontSize: 12,
      color: muted,
    },
    stepChipTextActive: {
      color: primaryText,
      fontWeight: '600',
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
      marginBottom: 24,
      gap: 8,
    },
    button: {
      flex: 1,
      backgroundColor: primary,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    buttonSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: border,
    },
    buttonText: {
      color: primaryText,
      fontWeight: '600',
      fontSize: 14,
    },
    buttonTextSecondary: {
      color: text,
    },
    muted: {
      color: muted,
      fontSize: 13,
      lineHeight: 18,
    },
    capabilityRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: border,
    },
    statusAvailable: { color: '#15803d', fontWeight: '600', fontSize: 12 },
    statusEvolving: { color: '#a16207', fontWeight: '600', fontSize: 12 },
    statusNot: { color: danger, fontWeight: '600', fontSize: 12 },
    denied: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    deniedTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: text,
      marginBottom: 8,
      textAlign: 'center',
    },
  });
}
