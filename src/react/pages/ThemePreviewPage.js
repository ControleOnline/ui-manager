import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { api } from '@controleonline/ui-common/src/api';
import { resolveThemePalette, withOpacity } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import styles from './ThemePreviewPage.styles';

const THEME_ALIASES = {
  primary: ['primary'],
  secondary: ['secondary'],
  background: ['background', 'bg-light'],
  text: ['text'],
  textSecondary: ['textSecondary', 'text-secondary'],
  border: ['border'],
  info: ['info'],
  accent: ['accent'],
  warning: ['warning'],
  positive: ['positive'],
  negative: ['negative'],
  bgDark: ['bg-dark'],
  bgMenuDark: ['bg-menu-dark'],
  bgMenuLight: ['bg-menu-light'],
  bgOddLight: ['bg-odd-light'],
  bgOddDark: ['bg-odd-dark'],
  bgEvenDark: ['bg-even-dark'],
  bgHeadersLight: ['bg-headers-light'],
};

const COLOR_USAGE_HINTS = {
  primary: 'botoes principais, destaques e foco',
  secondary: 'acoes de apoio e elementos secundarios',
  background: 'plano principal das telas',
  text: 'titulos e conteudo principal',
  textSecondary: 'legendas, placeholders e apoio visual',
  border: 'linhas, campos e divisores',
  info: 'avisos informativos e destaques neutros',
  accent: 'chamadas visuais e pontos de enfase',
  warning: 'estados de atencao',
  positive: 'sucesso e confirmacoes',
  negative: 'erros e estados criticos',
  bgDark: 'fundos escuros principais',
  bgMenuDark: 'fundo de menu escuro',
  bgMenuLight: 'fundo de menu claro',
  bgOddLight: 'listras claras de listas/tabelas',
  bgOddDark: 'listras escuras de listas/tabelas',
  bgEvenDark: 'linhas pares em tema escuro',
  bgHeadersLight: 'cabecalhos claros',
};

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

const normalizeHex = value => {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw)) return null;
  if (raw.length === 4) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toUpperCase();
  }
  return raw.toUpperCase();
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

const pickThemeColor = (themeColors = {}, fallbackValue = '', keys = []) => {
  for (const key of keys) {
    const normalized = normalizeHex(themeColors?.[key]);
    if (normalized) return normalized;
  }
  return normalizeHex(fallbackValue) || '#000000';
};

const buildPreviewPalette = themeColors => ({
  primary: pickThemeColor(themeColors, colors.primary, THEME_ALIASES.primary),
  secondary: pickThemeColor(themeColors, colors.secondary, THEME_ALIASES.secondary),
  background: pickThemeColor(themeColors, colors.background, THEME_ALIASES.background),
  text: pickThemeColor(themeColors, colors.text, THEME_ALIASES.text),
  textSecondary: pickThemeColor(themeColors, colors.textSecondary, THEME_ALIASES.textSecondary),
  border: pickThemeColor(themeColors, colors.border, THEME_ALIASES.border),
  info: pickThemeColor(themeColors, colors.info, THEME_ALIASES.info),
  accent: pickThemeColor(themeColors, colors.info, THEME_ALIASES.accent),
  warning: pickThemeColor(themeColors, colors.warning, THEME_ALIASES.warning),
  positive: pickThemeColor(themeColors, colors.success, THEME_ALIASES.positive),
  negative: pickThemeColor(themeColors, colors.error, THEME_ALIASES.negative),
  bgDark: pickThemeColor(themeColors, '#111827', THEME_ALIASES.bgDark),
  bgMenuDark: pickThemeColor(themeColors, '#0F172A', THEME_ALIASES.bgMenuDark),
  bgMenuLight: pickThemeColor(themeColors, '#F8FAFC', THEME_ALIASES.bgMenuLight),
  bgOddLight: pickThemeColor(themeColors, '#FFFFFF', THEME_ALIASES.bgOddLight),
  bgOddDark: pickThemeColor(themeColors, '#1F2937', THEME_ALIASES.bgOddDark),
  bgEvenDark: pickThemeColor(themeColors, '#111827', THEME_ALIASES.bgEvenDark),
  bgHeadersLight: pickThemeColor(themeColors, '#F8FAFC', THEME_ALIASES.bgHeadersLight),
});

const getThemeColorEntries = themeColors => {
  return Object.entries(themeColors || {})
    .map(([key, value]) => [key, normalizeHex(value)])
    .filter(([key, value]) => Boolean(value) && !AUTO_GENERATED_ALIAS_KEYS.has(key))
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => ({ key, value }));
};

const formatApiError = error =>
  error?.message || error?.description || 'Nao foi possivel carregar o preview do tema.';

export default function ThemePreviewPage() {
  const route = useRoute();
  const themeId = String(route.params?.themeId || '').trim();
  const [themeItem, setThemeItem] = useState(
    route.params?.theme ? route.params.theme : null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

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
    useCallback(() => {
      loadTheme();
    }, [loadTheme]),
  );

  const previewPalette = useMemo(
    () => resolveThemePalette(
      { ...buildPreviewPalette(themeItem?.colors || {}), ...(themeItem?.colors || {}) },
      colors,
    ),
    [themeItem?.colors],
  );

  const colorEntries = useMemo(
    () => getThemeColorEntries(themeItem?.colors || {}),
    [themeItem?.colors],
  );

  const tokenPreviewList = useMemo(
    () => [
      { key: 'primary', value: previewPalette.primary },
      { key: 'secondary', value: previewPalette.secondary },
      { key: 'background', value: previewPalette.background },
      { key: 'text', value: previewPalette.text },
      { key: 'textSecondary', value: previewPalette.textSecondary },
      { key: 'border', value: previewPalette.border },
      { key: 'info', value: previewPalette.info },
      { key: 'accent', value: previewPalette.accent },
      { key: 'warning', value: previewPalette.warning },
      { key: 'positive', value: previewPalette.positive },
      { key: 'negative', value: previewPalette.negative },
      { key: 'bgDark', value: previewPalette.bgDark },
      { key: 'bgMenuDark', value: previewPalette.bgMenuDark },
      { key: 'bgMenuLight', value: previewPalette.bgMenuLight },
      { key: 'bgOddLight', value: previewPalette.bgOddLight },
      { key: 'bgOddDark', value: previewPalette.bgOddDark },
      { key: 'bgEvenDark', value: previewPalette.bgEvenDark },
      { key: 'bgHeadersLight', value: previewPalette.bgHeadersLight },
    ],
    [previewPalette],
  );

  const financialTabs = useMemo(
    () => [
      { label: 'Receber', iconColor: previewPalette.positive, active: true },
      { label: 'Pagar', iconColor: previewPalette.negative, active: false },
      { label: 'Transferencias', iconColor: previewPalette.info, active: false },
    ],
    [previewPalette.info, previewPalette.negative, previewPalette.positive],
  );

  const compactFilters = useMemo(
    () => [
      { caption: 'Tipo', label: 'Todos os tipos', accent: previewPalette.primary, active: true },
      { caption: 'Categoria', label: 'Financeiro', accent: previewPalette.accent, active: false },
      { caption: 'Periodo', label: 'Ultimos 30 dias', accent: previewPalette.info, active: false },
    ],
    [previewPalette.accent, previewPalette.info, previewPalette.primary],
  );

  const menuTextColor = getReadableTextColor(previewPalette.bgMenuDark);
  const sectionSurface = withOpacity(previewPalette.text, 0.04);
  const sectionBorder = withOpacity(previewPalette.text, 0.08);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: previewPalette.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {isLoading && !themeItem ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={previewPalette.primary} />
          </View>
        ) : loadError && !themeItem ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nao foi possivel abrir o preview.</Text>
            <Text style={styles.emptyText}>{loadError}</Text>
          </View>
        ) : !themeItem ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Tema nao encontrado.</Text>
            <Text style={styles.emptyText}>Selecione um tema para visualizar o preview completo.</Text>
          </View>
        ) : (
          <>
            <View style={[styles.heroCard, { backgroundColor: previewPalette.bgDark }]}>
              <View style={styles.heroTop}>
                <View style={styles.heroMeta}>
                  <Text style={[styles.heroTitle, { color: getReadableTextColor(previewPalette.bgDark) }]}>
                    {themeItem?.theme || `Tema ${themeItem?.id}`}
                  </Text>
                  <Text style={[styles.heroSubtitle, { color: withOpacity(getReadableTextColor(previewPalette.bgDark), 0.8) }]}>
                    Pagina de preview com pequenas partes reais do app para mostrar onde cada cor aparece.
                  </Text>
                </View>
                <View
                  style={[
                    styles.heroPill,
                    {
                      backgroundColor: withOpacity(previewPalette.primary, 0.18),
                      borderColor: withOpacity(previewPalette.primary, 0.34),
                    },
                  ]}
                >
                  <Text style={[styles.heroPillText, { color: getReadableTextColor(previewPalette.primary) }]}>
                    #{themeItem?.id}
                  </Text>
                </View>
              </View>

              <View style={[styles.topNav, { backgroundColor: previewPalette.bgMenuDark }]}>
                <Text style={[styles.topNavBrand, { color: menuTextColor }]}>Controle Online</Text>
                <View style={styles.topNavItems}>
                  {['Dashboard', 'Pedidos', 'Financeiro', 'Configuracoes'].map(label => (
                    <View
                      key={label}
                      style={[
                        styles.topNavItem,
                        {
                          backgroundColor: label === 'Configuracoes'
                            ? previewPalette.primary
                            : withOpacity(previewPalette.bgMenuLight, 0.08),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.topNavItemText,
                          { color: label === 'Configuracoes' ? getReadableTextColor(previewPalette.primary) : menuTextColor },
                        ]}
                      >
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: sectionSurface, borderColor: sectionBorder }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Chips e filtros do app</Text>
                <Text style={styles.sectionText}>
                  Pequenas partes inspiradas no FinancialHub e no CompactFilterSelector.
                </Text>
              </View>
              <View style={styles.financeChipRow}>
                {financialTabs.map(tab => (
                  <View
                    key={tab.label}
                    style={[
                      styles.financeChip,
                      {
                        backgroundColor: tab.active
                          ? withOpacity(tab.iconColor, 0.12)
                          : previewPalette.bgOddLight,
                        borderColor: tab.active
                          ? withOpacity(tab.iconColor, 0.28)
                          : previewPalette.border,
                      },
                    ]}
                  >
                    <View style={[styles.financeChipDot, { backgroundColor: tab.iconColor }]} />
                    <Text
                      style={[
                        styles.financeChipText,
                        { color: tab.active ? tab.iconColor : previewPalette.textSecondary },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.filterRow}>
                {compactFilters.map(filter => (
                  <View
                    key={filter.caption}
                    style={[
                      styles.filterTrigger,
                      {
                        backgroundColor: filter.active
                          ? withOpacity(filter.accent, 0.12)
                          : previewPalette.bgOddLight,
                        borderColor: filter.active
                          ? withOpacity(filter.accent, 0.26)
                          : previewPalette.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.filterIconWrap,
                        {
                          backgroundColor: filter.active
                            ? withOpacity(filter.accent, 0.18)
                            : previewPalette.border,
                        },
                      ]}
                    />
                    <View style={styles.filterTextWrap}>
                      <Text
                        style={[
                          styles.filterCaption,
                          { color: filter.active ? filter.accent : previewPalette.textSecondary },
                        ]}
                      >
                        {filter.caption}
                      </Text>
                      <Text style={[styles.filterLabel, { color: previewPalette.text }]}>
                        {filter.label}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: sectionSurface, borderColor: sectionBorder }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Botoes e badges</Text>
                <Text style={styles.sectionText}>
                  Aqui voce enxerga como as cores fortes entram em botoes, CTA e badges de status.
                </Text>
              </View>
              <View style={styles.buttonRow}>
                {[
                  { label: 'Salvar', color: previewPalette.primary },
                  { label: 'Secundario', color: previewPalette.secondary },
                  { label: 'Info', color: previewPalette.info },
                  { label: 'Accent', color: previewPalette.accent },
                  { label: 'Atencao', color: previewPalette.warning },
                  { label: 'Sucesso', color: previewPalette.positive },
                  { label: 'Erro', color: previewPalette.negative },
                ].map(button => (
                  <View
                    key={button.label}
                    style={[
                      styles.sampleButton,
                      {
                        backgroundColor: button.color,
                        borderColor: withOpacity(getReadableTextColor(button.color), 0.12),
                      },
                    ]}
                  >
                    <Text style={[styles.sampleButtonText, { color: getReadableTextColor(button.color) }]}>
                      {button.label}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.badgeRow}>
                {[
                  { label: 'Novo', color: previewPalette.primary },
                  { label: 'Aprovado', color: previewPalette.positive },
                  { label: 'Aguardando', color: previewPalette.warning },
                  { label: 'Falhou', color: previewPalette.negative },
                ].map(badge => (
                  <View
                    key={badge.label}
                    style={[
                      styles.badge,
                      {
                        backgroundColor: withOpacity(badge.color, 0.14),
                        borderColor: withOpacity(badge.color, 0.3),
                      },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: sectionSurface, borderColor: sectionBorder }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Campos no estilo DefaultInput</Text>
                <Text style={styles.sectionText}>
                  Campos, labels, placeholders, bordas e leitura proxima do DefaultInput e dos formularios do app.
                </Text>
              </View>
              <View style={styles.formGrid}>
                {[
                  { label: 'Nome da empresa', value: 'Controle Online', help: 'Campo de texto normal.' },
                  { label: 'Email', value: 'contato@controleonline.com', help: 'Texto principal e borda.' },
                  { label: 'Plano', value: 'ERP Premium', help: 'Caixa de selecao simulada.' },
                ].map(field => (
                  <View key={field.label} style={styles.inputWrap}>
                    <Text style={styles.inputLabel}>{field.label}</Text>
                    <View
                      style={[
                        styles.inputBox,
                        {
                          backgroundColor: previewPalette.background,
                          borderColor: previewPalette.border,
                        },
                      ]}
                    >
                      <Text style={[styles.inputText, { color: previewPalette.text }]}>{field.value}</Text>
                    </View>
                    <Text style={styles.inputHelp}>{field.help}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: sectionSurface, borderColor: sectionBorder }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Alertas e mensagens</Text>
                <Text style={styles.sectionText}>
                  Blocos para sucesso, erro, atencao e informacao.
                </Text>
              </View>
              <View style={styles.alertStack}>
                {[
                  { title: 'Informacao', text: 'Um aviso neutro para orientar o usuario.', color: previewPalette.info },
                  { title: 'Sucesso', text: 'Configuracao salva com sucesso.', color: previewPalette.positive },
                  { title: 'Atencao', text: 'Revise os campos antes de continuar.', color: previewPalette.warning },
                  { title: 'Erro', text: 'Nao foi possivel concluir a operacao.', color: previewPalette.negative },
                ].map(alert => (
                  <View
                    key={alert.title}
                    style={[
                      styles.alertCard,
                      {
                        backgroundColor: withOpacity(alert.color, 0.12),
                        borderColor: withOpacity(alert.color, 0.28),
                      },
                    ]}
                  >
                    <Text style={[styles.alertTitle, { color: alert.color }]}>{alert.title}</Text>
                    <Text style={[styles.alertText, { color: previewPalette.text }]}>{alert.text}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: sectionSurface, borderColor: sectionBorder }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Tabela e padrao de linhas</Text>
                <Text style={styles.sectionText}>
                  Exemplo de cabecalho e linhas alternadas, para ajudar a ler fundos e bordas.
                </Text>
              </View>
              <View style={[styles.tableWrap, { borderColor: previewPalette.border }]}>
                <View style={[styles.tableHeader, { backgroundColor: previewPalette.bgHeadersLight }]}>
                  <Text style={[styles.tableHeaderCell, { color: previewPalette.text }]}>Item</Text>
                  <Text style={[styles.tableHeaderCell, { color: previewPalette.text }]}>Status</Text>
                  <Text style={[styles.tableHeaderCell, { color: previewPalette.text }]}>Total</Text>
                </View>
                {[
                  ['Pedido #1201', 'Em preparo', 'R$ 48,90'],
                  ['Pedido #1202', 'Saiu para entrega', 'R$ 89,40'],
                  ['Pedido #1203', 'Finalizado', 'R$ 32,00'],
                ].map((row, index) => (
                  <View
                    key={row[0]}
                    style={[
                      styles.tableRow,
                      {
                        backgroundColor: index % 2 === 0 ? previewPalette.bgOddLight : previewPalette.bgMenuLight,
                        borderTopColor: previewPalette.border,
                      },
                    ]}
                  >
                    <Text style={[styles.tableCell, { color: previewPalette.text }]}>{row[0]}</Text>
                    <Text style={[styles.tableCell, { color: previewPalette.textSecondary }]}>{row[1]}</Text>
                    <Text style={[styles.tableCell, { color: previewPalette.text }]}>{row[2]}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: sectionSurface, borderColor: sectionBorder }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Mapa de cores do tema</Text>
                <Text style={styles.sectionText}>
                  Cada token abaixo mostra a cor final e a ideia de uso na interface.
                </Text>
              </View>
              <View style={styles.tokenGrid}>
                {tokenPreviewList.map(token => (
                  <View
                    key={token.key}
                    style={[
                      styles.tokenCard,
                      {
                        backgroundColor: token.value,
                        borderColor: withOpacity(getReadableTextColor(token.value), 0.12),
                      },
                    ]}
                  >
                    <Text style={[styles.tokenName, { color: getReadableTextColor(token.value) }]}>
                      {token.key}
                    </Text>
                    <Text style={[styles.tokenValue, { color: getReadableTextColor(token.value) }]}>
                      {token.value}
                    </Text>
                    <Text style={[styles.tokenUsage, { color: getReadableTextColor(token.value) }]}>
                      {COLOR_USAGE_HINTS[token.key] || 'uso customizado do tema'}
                    </Text>
                  </View>
                ))}
                {colorEntries
                  .filter(entry => !tokenPreviewList.some(token => token.key === entry.key))
                  .map(entry => (
                    <View
                      key={entry.key}
                      style={[
                        styles.tokenCard,
                        {
                          backgroundColor: entry.value,
                          borderColor: withOpacity(getReadableTextColor(entry.value), 0.12),
                        },
                      ]}
                    >
                      <Text style={[styles.tokenName, { color: getReadableTextColor(entry.value) }]}>
                        {entry.key}
                      </Text>
                      <Text style={[styles.tokenValue, { color: getReadableTextColor(entry.value) }]}>
                        {entry.value}
                      </Text>
                      <Text style={[styles.tokenUsage, { color: getReadableTextColor(entry.value) }]}>
                        chave adicional vinda do banco
                      </Text>
                    </View>
                  ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
