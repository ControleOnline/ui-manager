import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
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
  '#22C55E',
  '#84CC16',
  '#EAB308',
  '#F97316',
  '#EF4444',
  '#EC4899',
  '#8B5CF6',
  '#FFFFFF',
  '#F8FAFC',
  '#E2E8F0',
  '#64748B',
];

const COLOR_FIELDS = [
  { key: 'primary', label: 'Primaria', helper: 'Botoes principais e destaques.' },
  { key: 'secondary', label: 'Secundaria', helper: 'Apoio visual e variacoes.' },
  { key: 'background', label: 'Fundo', helper: 'Plano principal das telas.' },
  { key: 'text', label: 'Texto', helper: 'Titulos e conteudo principal.' },
  { key: 'textSecondary', label: 'Texto secundario', helper: 'Legendas e informacoes de apoio.' },
  { key: 'border', label: 'Borda', helper: 'Linhas, contornos e divisores.' },
];

const THEME_ALIASES = {
  primary: ['primary', 'q-primary', 'btn-primary', 'q-btn-primary', 'header-primary', 'q-header-primary'],
  secondary: ['secondary', 'q-secondary'],
  background: ['background', 'bg-light', 'q-bg-light', 'bg-headers-light', 'q-bg-headers-light'],
  text: ['text', 'text-primary', 'q-text-primary', 'text-headers-light', 'q-text-headers-light'],
  textSecondary: ['textSecondary', 'text-secondary', 'q-text-secondary'],
  border: ['border', 'bg-even-light', 'q-bg-even-light'],
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

const pickThemeColor = (themeColors = {}, fallbackValue = '', keys = []) => {
  for (const key of keys) {
    const normalized = normalizeHex(themeColors?.[key]);
    if (normalized) return normalized;
  }
  return normalizeHex(fallbackValue) || '#000000';
};

const buildEditableDraft = (themeColors = {}, fallbackPalette = colors) => ({
  primary: pickThemeColor(themeColors, fallbackPalette.primary, THEME_ALIASES.primary),
  secondary: pickThemeColor(themeColors, fallbackPalette.secondary, THEME_ALIASES.secondary),
  background: pickThemeColor(themeColors, fallbackPalette.background, THEME_ALIASES.background),
  text: pickThemeColor(themeColors, fallbackPalette.text, THEME_ALIASES.text),
  textSecondary: pickThemeColor(themeColors, fallbackPalette.textSecondary, THEME_ALIASES.textSecondary),
  border: pickThemeColor(themeColors, fallbackPalette.border, THEME_ALIASES.border),
});

const buildThemeColorsPayload = (draft, existingColors = {}) => {
  const nextColors = { ...(existingColors || {}) };

  Object.entries(THEME_ALIASES).forEach(([field, aliases]) => {
    const value = normalizeHex(draft[field]);
    if (!value) return;
    aliases.forEach(alias => {
      nextColors[alias] = value;
    });
  });

  return nextColors;
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

const ColorEditor = ({ field, value, onChange }) => {
  const normalizedValue = normalizeHex(value) || value;

  return (
    <View style={styles.colorEditor}>
      <View style={styles.colorEditorHeader}>
        <View>
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
  const [assignmentSavingId, setAssignmentSavingId] = useState(null);
  const [themes, setThemes] = useState([]);
  const [domains, setDomains] = useState([]);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingTheme, setEditingTheme] = useState(null);
  const [themeName, setThemeName] = useState('');
  const [themeDraft, setThemeDraft] = useState(buildEditableDraft({}, palette));
  const [assignmentDomain, setAssignmentDomain] = useState(null);

  const themesById = useMemo(
    () => Object.fromEntries(themes.map(item => [String(item.id), item])),
    [themes],
  );

  const themeUsageCount = useMemo(() => {
    return domains.reduce((accumulator, domain) => {
      const themeId = getId(domain?.theme);
      if (!themeId) return accumulator;
      accumulator[themeId] = (accumulator[themeId] || 0) + 1;
      return accumulator;
    }, {});
  }, [domains]);

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
    if (!currentCompany?.id) {
      setThemes([]);
      setDomains([]);
      return;
    }

    setIsLoading(true);
    try {
      const [themesResponse, domainsResponse] = await Promise.all([
        api.fetch('/themes', { params: { itemsPerPage: 200, page: 1 } }),
        api.fetch('/people_domains', {
          params: {
            people: `/people/${currentCompany.id}`,
            itemsPerPage: 200,
            page: 1,
          },
        }),
      ]);

      const nextThemes = normalizeCollection(themesResponse).sort((a, b) =>
        String(a?.theme || '').localeCompare(String(b?.theme || '')),
      );
      const nextDomains = normalizeCollection(domainsResponse).sort((a, b) =>
        String(a?.domain || '').localeCompare(String(b?.domain || '')),
      );

      setThemes(nextThemes);
      setDomains(nextDomains);
    } catch (error) {
      showError(formatApiError(error));
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany?.id, showError]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const openCreateTheme = useCallback(() => {
    setEditingTheme(null);
    setThemeName('');
    setThemeDraft(buildEditableDraft({}, palette));
    setEditorVisible(true);
  }, [palette]);

  const openEditTheme = useCallback((themeItem) => {
    setEditingTheme(themeItem);
    setThemeName(String(themeItem?.theme || '').trim());
    setThemeDraft(buildEditableDraft(themeItem?.colors || {}, palette));
    setEditorVisible(true);
  }, [palette]);

  const openDuplicateTheme = useCallback((themeItem) => {
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

    for (const field of COLOR_FIELDS) {
      if (!normalizeHex(themeDraft[field.key])) {
        showError(`A cor "${field.label}" precisa estar em formato HEX, por exemplo #0EA5E9.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const baseColors = editingTheme?.colors || {};
      const payload = {
        theme: normalizedName,
        background: getId(editingTheme?.background) ? Number(getId(editingTheme.background)) : null,
        colors: buildThemeColorsPayload(themeDraft, baseColors),
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
  }, [editingTheme, loadData, refreshCurrentThemeIfNeeded, showError, showSuccess, themeDraft, themeName]);

  const assignThemeToDomain = useCallback(async (domainItem, themeItem) => {
    if (!domainItem?.id || !themeItem?.id) return;

    setAssignmentSavingId(String(domainItem.id));
    try {
      await api.fetch(getIri(domainItem, 'people_domains'), {
        method: 'PUT',
        body: {
          people: getIri(domainItem?.people, 'people') || `/people/${currentCompany.id}`,
          domain: domainItem.domain,
          domainType: domainItem.domainType || domainItem.domain_type || 'ERP',
          theme: getIri(themeItem, 'themes'),
        },
      });

      setDomains(current =>
        current.map(item =>
          String(item.id) === String(domainItem.id)
            ? { ...item, theme: getIri(themeItem, 'themes') }
            : item,
        ),
      );
      setAssignmentDomain(null);
      showSuccess('Tema associado ao dominio.');
      await refreshCurrentThemeIfNeeded();
    } catch (error) {
      showError(formatApiError(error));
    } finally {
      setAssignmentSavingId(null);
    }
  }, [currentCompany?.id, refreshCurrentThemeIfNeeded, showError, showSuccess]);

  if (!currentCompany?.id) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: palette.background }]}>
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyTitle}>Selecione uma empresa para gerenciar temas.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: palette.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: palette.primary }]}>
          <Text style={styles.heroEyebrow}>Temas e dominios</Text>
          <Text style={styles.heroTitle}>Aparencia por empresa</Text>
          <Text style={styles.heroText}>
            Escolha uma paleta, edite as cores em HEX, duplique temas existentes e associe cada dominio da empresa ativa ao tema certo.
          </Text>

          <View style={styles.heroActionRow}>
            <TouchableOpacity style={styles.createButton} onPress={openCreateTheme}>
              <Icon name="plus" size={16} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Novo tema</Text>
            </TouchableOpacity>

            <View style={styles.heroBadge}>
              <Icon name="droplet" size={22} color={palette.primary} />
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Dominios da empresa</Text>
            <Text style={styles.sectionText}>
              O tema passa a valer quando for associado a um registro de `people_domain`.
            </Text>
          </View>
          <View style={styles.sectionStat}>
            <Text style={styles.sectionStatValue}>{domains.length}</Text>
            <Text style={styles.sectionStatLabel}>Dominios</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={palette.primary} />
          </View>
        ) : domains.length === 0 ? (
          <View style={styles.emptyCard}>
            <Icon name="globe" size={20} color={palette.primary} />
            <Text style={styles.emptyTitle}>Nenhum dominio encontrado para esta empresa.</Text>
            <Text style={styles.emptyText}>
              Assim que houver registros em `people_domain`, voce podera associar um tema a cada um deles aqui.
            </Text>
          </View>
        ) : (
          <View style={styles.domainsList}>
            {domains.map(domainItem => {
              const themeId = getId(domainItem?.theme);
              const activeTheme = themesById[themeId];
              const themeLabel = activeTheme?.theme || (themeId ? `Tema #${themeId}` : 'Sem tema');
              const isAssigning = assignmentSavingId === String(domainItem.id);

              return (
                <View key={String(domainItem.id)} style={styles.domainCard}>
                  <View style={styles.domainTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.domainLabel}>{domainItem?.domain || 'Dominio sem nome'}</Text>
                      <Text style={styles.domainMeta}>
                        Tipo: {domainItem?.domainType || domainItem?.domain_type || 'ERP'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.domainThemePill,
                        {
                          backgroundColor: withOpacity(palette.primary, 0.1),
                          borderColor: withOpacity(palette.primary, 0.18),
                        },
                      ]}
                    >
                      <Text style={[styles.domainThemeText, { color: palette.primary }]}>
                        {themeLabel}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.domainAction}
                    onPress={() => setAssignmentDomain(domainItem)}
                    disabled={isAssigning || themes.length === 0}
                  >
                    {isAssigning ? (
                      <ActivityIndicator size="small" color={palette.primary} />
                    ) : (
                      <Icon name="refresh-cw" size={14} color="#334155" />
                    )}
                    <Text style={styles.domainActionText}>
                      {themes.length === 0 ? 'Crie um tema primeiro' : 'Escolher tema'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Biblioteca de temas</Text>
            <Text style={styles.sectionText}>
              Edite as cores principais do sistema e reaproveite a mesma paleta em quantos dominios quiser.
            </Text>
          </View>
          <View style={styles.sectionStat}>
            <Text style={styles.sectionStatValue}>{themes.length}</Text>
            <Text style={styles.sectionStatLabel}>Temas</Text>
          </View>
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
          <View style={styles.themesGrid}>
            {themes.map(themeItem => {
              const previewPalette = buildEditableDraft(themeItem?.colors || {}, palette);
              const usageCount = themeUsageCount[String(themeItem.id)] || 0;

              return (
                <View key={String(themeItem.id)} style={styles.themeCard}>
                  <View
                    style={[
                      styles.themePreview,
                      { backgroundColor: previewPalette.primary },
                    ]}
                  >
                    <View style={styles.themePreviewHeader}>
                      <Text
                        numberOfLines={2}
                        style={[styles.themeName, { color: previewPalette.background }]}
                      >
                        {themeItem?.theme || `Tema ${themeItem?.id}`}
                      </Text>
                      <View style={styles.themeBadge}>
                        <Text style={styles.themeBadgeText}>{usageCount} dominios</Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.previewSurface,
                        {
                          backgroundColor: previewPalette.background,
                          borderColor: withOpacity(previewPalette.text, 0.08),
                        },
                      ]}
                    >
                      <Text style={[styles.previewTitle, { color: previewPalette.text }]}>
                        Visual do sistema
                      </Text>
                      <Text style={[styles.previewText, { color: previewPalette.textSecondary }]}>
                        Botoes, fundos, textos e bordas desta paleta.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.swatchRow}>
                    {COLOR_FIELDS.map(field => (
                      <View
                        key={`${themeItem.id}-${field.key}`}
                        style={[
                          styles.swatchItem,
                          { backgroundColor: previewPalette[field.key] },
                        ]}
                      />
                    ))}
                  </View>

                  <View style={styles.themeMetaRow}>
                    <Text style={styles.themeMetaText}>
                      {usageCount > 0 ? `Em uso em ${usageCount} dominio(s)` : 'Disponivel para associacao'}
                    </Text>
                    <View style={styles.themeActions}>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => openDuplicateTheme(themeItem)}
                      >
                        <Icon name="copy" size={16} color="#334155" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => openEditTheme(themeItem)}
                      >
                        <Icon name="edit-3" size={16} color="#334155" />
                      </TouchableOpacity>
                    </View>
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
                      Ajuste as cores principais do sistema usando HEX ou uma das amostras rapidas.
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

                  {COLOR_FIELDS.map(field => (
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

      <Modal
        visible={Boolean(assignmentDomain)}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignmentDomain(null)}
      >
        <TouchableWithoutFeedback onPress={() => setAssignmentDomain(null)}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheet}>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Associar tema ao dominio</Text>
                    <Text style={styles.modalSubtitle}>
                      {assignmentDomain?.domain || 'Dominio selecionado'}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.iconButton} onPress={() => setAssignmentDomain(null)}>
                    <Icon name="x" size={16} color="#334155" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pickerList}>
                  {themes.map(themeItem => {
                    const previewPalette = buildEditableDraft(themeItem?.colors || {}, palette);
                    const selected = String(getId(assignmentDomain?.theme)) === String(themeItem?.id);

                    return (
                      <TouchableOpacity
                        key={`assign-${themeItem.id}`}
                        style={[
                          styles.pickerThemeCard,
                          selected && styles.pickerThemeCardActive,
                        ]}
                        onPress={() => assignThemeToDomain(assignmentDomain, themeItem)}
                        disabled={assignmentSavingId === String(assignmentDomain?.id)}
                      >
                        <View style={styles.pickerThemeTop}>
                          <Text style={styles.pickerThemeName}>{themeItem?.theme || `Tema ${themeItem?.id}`}</Text>
                          {selected ? (
                            <Icon name="check-circle" size={18} color={palette.primary} />
                          ) : null}
                        </View>

                        <View style={styles.swatchRow}>
                          {COLOR_FIELDS.map(field => (
                            <View
                              key={`${themeItem.id}-picker-${field.key}`}
                              style={[
                                styles.swatchItem,
                                { backgroundColor: previewPalette[field.key] },
                              ]}
                            />
                          ))}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}
