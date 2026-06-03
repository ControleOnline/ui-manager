import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

import { api } from '@controleonline/ui-common/src/api';
import CompactFilterSelector from '@controleonline/ui-default/src/react/components/filters/CompactFilterSelector';
import useToastMessage from '@controleonline/ui-crm/src/react/hooks/useToastMessage';
import { useStore } from '@store';
import { colors } from '@controleonline/../../src/styles/colors';
import {
  resolveThemePalette,
} from '@controleonline/../../src/styles/branding';
import styles from './TranslationsReviewPage.styles';

const { resolveConfiguredLanguage } = require('@controleonline/ui-common/src/react/utils/runtimeLanguage');
const {
  buildOverviewFromTranslateCollections,
  isNotFoundError,
  normalizeCollectionItems,
  normalizeCollectionTotalItems,
} = require('./TranslationsReviewPage.data');

const shadowStyle = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  android: { elevation: 3 },
  web: { boxShadow: '0 10px 24px rgba(15,23,42,0.08)' },
});

const getStoredJson = storageKey => {
  try {
    if (typeof localStorage === 'undefined') return {};
    return JSON.parse(localStorage.getItem(storageKey) || '{}');
  } catch {
    return {};
  }
};

const getConfigLanguage = ({ currentCompany, defaultCompany } = {}) =>
  resolveConfiguredLanguage({
    currentCompany,
    defaultCompany,
    currentConfig: getStoredJson('config'),
    sessionData: getStoredJson('session'),
  });

const formatApiError = error => {
  if (!error) return 'Não foi possível carregar as traduções.';
  if (typeof error === 'string') return error;
  return error?.message || error?.description || error?.errmsg || 'Não foi possível carregar as traduções.';
};

const normalizeOptions = (values, activeValue = '') => {
  const normalizedValues = Array.isArray(values) ? values : [];
  const uniqueValues = new Map();

  if (activeValue) {
    uniqueValues.set(String(activeValue), String(activeValue));
  }

  normalizedValues
    .filter(value => value !== null && value !== undefined && String(value).trim() !== '')
    .forEach(value => {
      uniqueValues.set(String(value), String(value));
    });

  return Array.from(uniqueValues.values());
};

function SummaryCard({ label, value, accent }) {
  return (
    <View style={[styles.summaryCard, shadowStyle]}>
      <View style={[styles.summaryAccent, { backgroundColor: accent }]} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value || 0}</Text>
    </View>
  );
}

export default function TranslationsReviewPage() {
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const { currentCompany, defaultCompany } = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;
  const { showError, showSuccess } = useToastMessage();

  const currentCompanyId = currentCompany?.id;
  const resolvedLanguage = useMemo(
    () => getConfigLanguage({ currentCompany, defaultCompany }),
    [currentCompany, defaultCompany],
  );
  const syncedCompanyIdRef = useRef(currentCompanyId || null);
  const lastSyncedLanguageRef = useRef(resolvedLanguage);
  const overviewLoadModeRef = useRef('overview');

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        {
          ...themeColors,
          ...(currentCompany?.theme?.colors || {}),
        },
        colors,
      ),
    [themeColors, currentCompany?.id],
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [languages, setLanguages] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [savingRows, setSavingRows] = useState({});
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState(() => ({
    language: resolvedLanguage,
    store: '',
    type: '',
    search: '',
    pendingOnly: true,
  }));

  useEffect(() => {
    const normalizedCompanyId = currentCompanyId || null;
    const companyChanged = syncedCompanyIdRef.current !== normalizedCompanyId;

    // Keep the review language aligned with the active company unless the user changed it manually.
    setFilters(previous => {
      if (!resolvedLanguage) return previous;
      const canSyncLanguage =
        companyChanged
        || !previous.language
        || previous.language === lastSyncedLanguageRef.current;
      if (!canSyncLanguage) return previous;

      lastSyncedLanguageRef.current = resolvedLanguage;
      if (previous.language === resolvedLanguage) return previous;

      return {
        ...previous,
        language: resolvedLanguage,
      };
    });

    syncedCompanyIdRef.current = normalizedCompanyId;
  }, [currentCompanyId, resolvedLanguage]);

  const languageOptions = useMemo(() => {
    const uniqueLanguages = new Map();

    if (filters.language) {
      uniqueLanguages.set(filters.language, {
        value: filters.language,
        label: String(filters.language).toUpperCase(),
      });
    }

    (languages || []).forEach(language => {
      const value = String(language?.language || '').trim();
      if (!value) return;

      uniqueLanguages.set(value, {
        value,
        label: value.toUpperCase(),
      });
    });

    return Array.from(uniqueLanguages.values());
  }, [filters.language, languages]);

  const storeOptions = useMemo(
    () => normalizeOptions(items.map(item => item.store), filters.store),
    [items, filters.store],
  );

  const typeOptions = useMemo(
    () => normalizeOptions(items.map(item => item.type), filters.type),
    [items, filters.type],
  );

  const hasMainFallback = useMemo(() => {
    const mainCompanyId = summary?.mainCompany?.id || defaultCompany?.id;
    return Boolean(currentCompanyId && mainCompanyId && String(currentCompanyId) !== String(mainCompanyId));
  }, [currentCompanyId, defaultCompany?.id, summary?.mainCompany?.id]);

  const mainCompanyLabel =
    summary?.mainCompany?.name
    || defaultCompany?.name
    || defaultCompany?.alias
    || 'empresa principal';
  const languageFilterOptions = useMemo(
    () => languageOptions.map(language => ({
      key: language.value,
      label: language.label,
    })),
    [languageOptions],
  );
  const storeFilterOptions = useMemo(
    () => [
      { key: '', label: 'Todas as stores' },
      ...storeOptions.map(store => ({
        key: store,
        label: store,
      })),
    ],
    [storeOptions],
  );
  const typeFilterOptions = useMemo(
    () => [
      { key: '', label: 'Todos os tipos' },
      ...typeOptions.map(type => ({
        key: type,
        label: type,
      })),
    ],
    [typeOptions],
  );
  const reviewFilterOptions = useMemo(
    () => [
      { key: 'all', label: 'Todas as traduções' },
      {
        key: 'pending',
        label: summary?.pendingReview > 0
          ? `Pendentes (${summary.pendingReview})`
          : 'Pendentes',
      },
    ],
    [summary?.pendingReview],
  );
  const selectedLanguageLabel = useMemo(
    () => languageFilterOptions.find(option => option.key === filters.language)?.label || 'Idioma',
    [filters.language, languageFilterOptions],
  );
  const selectedStoreLabel = useMemo(
    () => storeFilterOptions.find(option => option.key === filters.store)?.label || 'Todas as stores',
    [filters.store, storeFilterOptions],
  );
  const selectedTypeLabel = useMemo(
    () => typeFilterOptions.find(option => option.key === filters.type)?.label || 'Todos os tipos',
    [filters.type, typeFilterOptions],
  );
  const selectedReviewLabel = useMemo(
    () => reviewFilterOptions.find(option => option.key === (filters.pendingOnly ? 'pending' : 'all'))?.label || 'Todas as traduções',
    [filters.pendingOnly, reviewFilterOptions],
  );

  const loadLanguages = useCallback(async () => {
    try {
      const response = await api.fetch('/languages', {
        params: { itemsPerPage: 200 },
      });
      const languageItems = Array.isArray(response?.member) ? response.member : [];
      setLanguages(languageItems);

      if (!filters.language) {
        const fallbackLanguage = resolvedLanguage || languageItems[0]?.language || 'pt-br';
        if (fallbackLanguage) {
          setFilters(previous => (
            previous.language
              ? previous
              : { ...previous, language: fallbackLanguage }
          ));
        }
      }
    } catch {
      setLanguages([]);
      if (!filters.language) {
        setFilters(previous => (
          previous.language
            ? previous
            : { ...previous, language: resolvedLanguage || 'pt-br' }
        ));
      }
    }
  }, [filters.language, resolvedLanguage]);

  const loadOverview = useCallback(async () => {
    const activeLanguage = filters.language || resolvedLanguage;
    const mainCompany = defaultCompany || currentCompany;
    const mainCompanyId = mainCompany?.id;

    if (!currentCompanyId || !activeLanguage) {
      setItems([]);
      setSummary({});
      setDrafts({});
      setLoading(false);
      return;
    }

    const overviewParams = {
      people: currentCompanyId,
      'language.language': activeLanguage,
      ...(filters.store ? { store: filters.store } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.pendingOnly ? { pendingReview: 1 } : {}),
    };

    const loadAllTranslates = async peopleId => {
      const collectedItems = [];
      const itemsPerPage = 200;
      let page = 1;
      let totalItems = null;

      while (page <= 1000) {
        const response = await api.fetch('/translates', {
          params: {
            people: peopleId,
            'language.language': activeLanguage,
            itemsPerPage,
            page,
            ...(filters.store ? { store: filters.store } : {}),
            ...(filters.type ? { type: filters.type } : {}),
          },
        });

        const pageItems = normalizeCollectionItems(response);
        if (pageItems.length === 0) {
          break;
        }

        collectedItems.push(...pageItems);

        if (totalItems == null) {
          totalItems = normalizeCollectionTotalItems(response);
        }

        if (
          pageItems.length < itemsPerPage
          || (totalItems != null && collectedItems.length >= totalItems)
        ) {
          break;
        }

        page += 1;
      }

      return collectedItems;
    };

    const loadOverviewFromCollections = async () => {
      const shouldLoadMainFallback =
        Boolean(mainCompanyId)
        && String(mainCompanyId) !== String(currentCompanyId);

      const [companyTranslations, fallbackTranslations] = await Promise.all([
        loadAllTranslates(currentCompanyId),
        shouldLoadMainFallback ? loadAllTranslates(mainCompanyId) : Promise.resolve([]),
      ]);

      return buildOverviewFromTranslateCollections({
        companyTranslations,
        fallbackTranslations,
        selectedCompany: currentCompany,
        mainCompany,
        activeLanguage,
        search: filters.search,
        pendingOnly: filters.pendingOnly,
      });
    };

    try {
      const response = overviewLoadModeRef.current === 'collection'
        ? await loadOverviewFromCollections()
        : await api.fetch('/translates/overview', {
          params: overviewParams,
        }).catch(async error => {
          if (!isNotFoundError(error)) {
            throw error;
          }

          overviewLoadModeRef.current = 'collection';
          return loadOverviewFromCollections();
        });

      const nextItems = normalizeCollectionItems(response);
      setItems(nextItems);
      setSummary(response?.summary || {});
      setDrafts(
        nextItems.reduce((accumulator, item) => {
          accumulator[item.rowId] = item.companyTranslate || item.translate || '';
          return accumulator;
        }, {}),
      );
    } catch (error) {
      showError(formatApiError(error));
      setItems([]);
      setSummary({});
      setDrafts({});
    } finally {
      setLoading(false);
    }
  }, [
    currentCompany,
    currentCompanyId,
    defaultCompany,
    filters.language,
    filters.pendingOnly,
    filters.search,
    filters.store,
    filters.type,
    resolvedLanguage,
    showError,
  ]);

  useFocusEffect(
    useCallback(() => {
      loadLanguages();
    }, [loadLanguages]),
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadOverview();
    }, [loadOverview]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadLanguages(), loadOverview()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadLanguages, loadOverview]);

  const setFilterValue = useCallback((field, value) => {
    setFilters(previous => ({
      ...previous,
      [field]: value,
    }));
  }, []);

  const applySearch = useCallback(() => {
    setFilters(previous => ({
      ...previous,
      search: searchInput.trim(),
    }));
  }, [searchInput]);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setFilters(previous => ({
      ...previous,
      store: '',
      type: '',
      search: '',
      pendingOnly: true,
    }));
  }, []);

  const handleDraftChange = useCallback((rowId, value) => {
    setDrafts(previous => ({
      ...previous,
      [rowId]: value,
    }));
  }, []);

  const handleSave = useCallback(async row => {
    const draftValue = drafts[row.rowId];
    if (!String(draftValue || '').trim()) return;

    setSavingRows(previous => ({
      ...previous,
      [row.rowId]: true,
    }));

    try {
      await api.fetch(
        row.translateId ? `/translates/${row.translateId}` : '/translates',
        {
          method: row.translateId ? 'PUT' : 'POST',
          body: {
            people: `/people/${currentCompanyId}`,
            language: row.language?.['@id'] || `/languages/${row.language?.id}`,
            store: row.store,
            type: row.type,
            key: row.key,
            translate: draftValue,
            revised: true,
          },
        },
      );

      showSuccess(row.pendingReview ? 'Traducao revisada.' : 'Traducao salva.');
      await loadOverview();
    } catch (error) {
      showError(formatApiError(error));
    } finally {
      setSavingRows(previous => ({
        ...previous,
        [row.rowId]: false,
      }));
    }
  }, [currentCompanyId, drafts, loadOverview, showError, showSuccess]);

  if (!currentCompanyId) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerState}>
          <Icon name="building" size={32} color="#94A3B8" />
          <Text style={styles.centerStateTitle}>Selecione uma empresa</Text>
          <Text style={styles.centerStateText}>
            A revisão de traduções depende da empresa ativa.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: brandColors.background }]} edges={['bottom']}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={brandColors.primary} />
          <Text style={styles.centerStateTitle}>Carregando traduções</Text>
          <Text style={styles.centerStateText}>
            Buscando pendências, fallback e sobrescritas da empresa ativa.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: brandColors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brandColors.primary} />
        )}>
        <View style={[styles.heroCard, shadowStyle, { backgroundColor: brandColors.primary }]}>
          <View style={styles.heroBadge}>
            <Icon name="type" size={22} color={brandColors.primary} />
          </View>
          <Text style={styles.heroEyebrow}>TRADUÇÕES</Text>
          <Text style={styles.heroTitle}>Revisão de textos</Text>
          <Text style={styles.heroText}>
            Revise o que entrou automaticamente, compare com a empresa principal e grave a sobrescrita da empresa ativa quando precisar.
          </Text>
        </View>

        <View style={styles.summaryGrid}>
          <SummaryCard label="Total" value={summary?.total} accent="#0EA5E9" />
          <SummaryCard label="Pendentes" value={summary?.pendingReview} accent="#EF4444" />
          <SummaryCard label="Sobrescritas" value={summary?.overrides} accent="#10B981" />
          <SummaryCard label="Fallbacks" value={summary?.fallbacks} accent="#F59E0B" />
        </View>

        <View style={[styles.filtersCard, shadowStyle]}>
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrap}>
              <Icon name="search" size={16} color="#64748B" />
              <TextInput
                value={searchInput}
                onChangeText={setSearchInput}
                onSubmitEditing={applySearch}
                placeholder="Buscar por store, tipo, chave ou texto"
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
                returnKeyType="search"
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={applySearch}
              style={[styles.searchButton, { backgroundColor: brandColors.primary }]}>
              <Text style={styles.searchButtonText}>Aplicar</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.9} onPress={clearFilters} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Limpar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterSelectorsRow}>
            <CompactFilterSelector
              icon="globe"
              label={selectedLanguageLabel}
              title="Idioma"
              accentColor={brandColors.primary}
              active={Boolean(filters.language)}
              options={languageFilterOptions}
              selectedKey={filters.language}
              onSelect={optionKey => {
                setFilterValue('language', optionKey);
                return true;
              }}
            />

            <CompactFilterSelector
              icon="alert-triangle"
              label={selectedReviewLabel}
              title="Revisao"
              accentColor={filters.pendingOnly ? '#DC2626' : (brandColors.primary)}
              active={filters.pendingOnly}
              options={reviewFilterOptions}
              selectedKey={filters.pendingOnly ? 'pending' : 'all'}
              onSelect={optionKey => {
                setFilterValue('pendingOnly', optionKey === 'pending');
                return true;
              }}
            />

            {storeOptions.length > 0 ? (
              <CompactFilterSelector
                icon="database"
                label={selectedStoreLabel}
                title="Store"
                accentColor={brandColors.primary}
                active={Boolean(filters.store)}
                options={storeFilterOptions}
                selectedKey={filters.store}
                onSelect={optionKey => {
                  setFilterValue('store', optionKey);
                  return true;
                }}
              />
            ) : null}

            {typeOptions.length > 0 ? (
              <CompactFilterSelector
                icon="tag"
                label={selectedTypeLabel}
                title="Tipo"
                accentColor={brandColors.primary}
                active={Boolean(filters.type)}
                options={typeFilterOptions}
                selectedKey={filters.type}
                onSelect={optionKey => {
                  setFilterValue('type', optionKey);
                  return true;
                }}
              />
            ) : null}
          </View>

          {hasMainFallback ? (
            <View style={styles.infoBanner}>
              <Icon name="git-merge" size={16} color="#1D4ED8" />
              <Text style={styles.infoBannerText}>
                A traducao da empresa principal fica visivel como referencia. Ao salvar aqui, a empresa ativa cria sua propria sobrescrita.
              </Text>
            </View>
          ) : null}
        </View>

        {items.length === 0 ? (
          <View style={[styles.emptyCard, shadowStyle]}>
            <Icon name="inbox" size={28} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Nenhuma traducao encontrada</Text>
            <Text style={styles.emptyText}>
              Ajuste os filtros ou revise a empresa selecionada para carregar outros textos.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map(row => {
              const rowDraft = drafts[row.rowId] || '';
              const isSaving = Boolean(savingRows[row.rowId]);
              const isFallbackOnly = !row.hasOverride;
              const footerHint = isFallbackOnly
                ? row.mainRevised
                  ? `Fallback da ${mainCompanyLabel} ja revisado manualmente.`
                  : `Fallback da ${mainCompanyLabel} ainda pendente na empresa principal.`
                : row.companyRevised
                  ? 'Entrada revisada manualmente nesta empresa.'
                  : 'Entrada criada automaticamente pelo front nesta empresa.';
              const buttonLabel = row.pendingReview
                ? 'Revisar'
                : isFallbackOnly
                  ? 'Criar sobrescrita'
                  : 'Salvar';

              return (
                <View
                  key={row.rowId}
                  style={[
                    styles.itemCard,
                    shadowStyle,
                    row.pendingReview ? styles.itemCardPending : styles.itemCardReviewed,
                  ]}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemBadges}>
                      <View style={[styles.badge, row.pendingReview ? styles.badgePending : styles.badgeReviewed]}>
                        <Text style={[styles.badgeText, row.pendingReview ? styles.badgeTextPending : styles.badgeTextReviewed]}>
                          {row.pendingReview ? 'Pendente' : 'Revisada'}
                        </Text>
                      </View>

                      <View style={[styles.badge, isFallbackOnly ? styles.badgeFallback : styles.badgeOverride]}>
                        <Text style={[styles.badgeText, isFallbackOnly ? styles.badgeTextFallback : styles.badgeTextOverride]}>
                          {isFallbackOnly ? 'Fallback principal' : 'Sobrescrita da empresa'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.itemMetaWrap}>
                      <Text style={styles.itemMetaText}>{row.store}</Text>
                      <Text style={styles.itemMetaDivider}>/</Text>
                      <Text style={styles.itemMetaText}>{row.type}</Text>
                    </View>
                  </View>

                  <Text style={styles.itemKey}>{row.key}</Text>

                  {hasMainFallback ? (
                    <View style={styles.referenceCard}>
                      <Text style={styles.referenceLabel}>{mainCompanyLabel}</Text>
                      <Text style={styles.referenceText}>
                        {row.mainTranslate || 'Sem traducao cadastrada na empresa principal.'}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.editorCard}>
                    <Text style={styles.referenceLabel}>
                      {isFallbackOnly ? 'Traducao da empresa ativa' : 'Sobrescrita da empresa ativa'}
                    </Text>
                    <TextInput
                      multiline
                      value={rowDraft}
                      onChangeText={value => handleDraftChange(row.rowId, value)}
                      style={styles.editorInput}
                      placeholder={row.mainTranslate || 'Digite a traducao'}
                      placeholderTextColor="#94A3B8"
                      textAlignVertical="top"
                    />
                    {isFallbackOnly && hasMainFallback ? (
                      <Text style={styles.editorHint}>
                        Sem sobrescrita propria ainda. Salvar aqui grava a traducao desta empresa.
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.itemFooter}>
                    <Text style={styles.footerHint}>{footerHint}</Text>

                    <TouchableOpacity
                      activeOpacity={0.9}
                      disabled={isSaving || !String(rowDraft).trim()}
                      onPress={() => handleSave(row)}
                      style={[
                        styles.saveButton,
                        { backgroundColor: brandColors.primary },
                        (isSaving || !String(rowDraft).trim()) && styles.saveButtonDisabled,
                      ]}>
                      {isSaving ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Icon name="save" size={16} color="#FFFFFF" />
                          <Text style={styles.saveButtonText}>{buttonLabel}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
