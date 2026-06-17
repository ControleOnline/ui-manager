import React, { useCallback, useMemo, useState } from 'react';
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
  const filteredEntries = Object.entries(themeColors || {})
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

const getThemeColorEntries = themeColors => {
  return Object.entries(themeColors || {})
    .map(([key, value]) => [key, normalizeHex(value)])
    .filter(([key, value]) => Boolean(value) && !AUTO_GENERATED_ALIAS_KEYS.has(key))
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => ({ key, value }));
};

const buildEditorFields = draft => {
  return Object.keys(draft || {})
    .sort((leftKey, rightKey) => leftKey.localeCompare(rightKey))
    .map(key => ({
      key,
      label: DEFAULT_THEME_FIELD_MAP[key]?.label || key,
      helper: DEFAULT_THEME_FIELD_MAP[key]?.helper || formatColorHint(key),
    }));
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
    () => resolveThemePalette({ ...themeColors, ...(currentCompany?.theme?.colors || {}) }, colors),
    [themeColors, currentCompany?.id],
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [themes, setThemes] = useState([]);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingTheme, setEditingTheme] = useState(null);
  const [themeName, setThemeName] = useState('');
  const [themeDraft, setThemeDraft] = useState(buildNewThemeDraft(palette));
  const [hoveredColorHelp, setHoveredColorHelp] = useState(null);

  const editorFields = useMemo(
    () => buildEditorFields(themeDraft),
    [themeDraft],
  );

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

      const nextThemes = normalizeCollection(themesResponse).sort(
        (a, b) => Number(a?.id || 0) - Number(b?.id || 0),
      );

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
    setThemeName('');
    setThemeDraft(buildNewThemeDraft(palette));
    setEditorVisible(true);
  }, [palette]);

  const openEditTheme = useCallback(themeItem => {
    setEditingTheme(themeItem);
    setThemeName(String(themeItem?.theme || '').trim());
    setThemeDraft(buildEditableDraft(themeItem?.colors || {}, palette));
    setEditorVisible(true);
  }, [palette]);

  const openDuplicateTheme = useCallback(themeItem => {
    setEditingTheme(null);
    setThemeName(buildDuplicateName(themeItem?.theme, themes));
    setThemeDraft(buildEditableDraft(themeItem?.colors || {}, palette));
    setEditorVisible(true);
  }, [palette, themes]);

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

      setEditorVisible(false);
      await loadData();
      await refreshCurrentThemeIfNeeded();
    } catch (error) {
      showError(formatApiError(error));
    } finally {
      setIsSaving(false);
    }
  }, [editingTheme, editorFields, loadData, refreshCurrentThemeIfNeeded, showError, showSuccess, themeDraft, themeName]);

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
              const colorEntries = getThemeColorEntries(themeItem?.colors || {});

              return (
                <View key={String(themeItem.id)} style={styles.themeCard}>
                  <View style={styles.themeRowTop}>
                    <View style={styles.themeTitleWrap}>
                      <Text style={styles.themeName}>
                        {themeItem?.theme || `Tema ${themeItem?.id}`}
                        {hoveredColorHelp?.themeId === String(themeItem.id)
                          ? ` (${hoveredColorHelp.hint})`
                          : ''}
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

                  <View style={styles.colorTileGrid}>
                    {colorEntries.length === 0 ? (
                      <Text style={styles.themeMetaText}>Sem cores validas cadastradas no banco.</Text>
                    ) : (
                      colorEntries.map(colorItem => (
                        <Pressable
                          key={`${themeItem.id}-${colorItem.key}`}
                          onHoverIn={() => setHoveredColorHelp({
                            themeId: String(themeItem.id),
                            hint: formatColorHint(colorItem.key),
                          })}
                          onHoverOut={() => setHoveredColorHelp(null)}
                          style={[
                            styles.colorTile,
                            {
                              backgroundColor: colorItem.value,
                              borderColor: withOpacity(getReadableTextColor(colorItem.value), 0.12),
                            },
                          ]}
                        >
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.colorTileLabel,
                              { color: getReadableTextColor(colorItem.value) },
                            ]}
                          >
                            {`${colorItem.key} (${colorItem.value})`}
                          </Text>
                        </Pressable>
                      ))
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={editorVisible} transparent animationType="slide" onRequestClose={() => setEditorVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setEditorVisible(false)}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheet}>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>
                      {editingTheme?.id ? 'Editar tema' : 'Novo tema'}
                    </Text>
                    <Text style={styles.modalSubtitle}>
                      Todas as cores reais do `theme.colors` aparecem aqui para edicao.
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.iconButton} onPress={() => setEditorVisible(false)}>
                    <Icon name="x" size={16} color="#334155" />
                  </TouchableOpacity>
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

                  {editorFields.map(field => (
                    <ColorEditor
                      key={field.key}
                      field={field}
                      value={themeDraft[field.key]}
                      onChange={value => setDraftColor(field.key, value)}
                    />
                  ))}
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => setEditorVisible(false)}>
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
