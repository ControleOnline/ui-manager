import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';
import { resolveThemePalette, withOpacity } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import styles from './ManagerCategoriesPage.styles';
import {
  humanizeCategoryContext,
  normalizeCategoryContext,
} from '@controleonline/ui-manager/src/react/utils/categoryContexts';

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
  },
  android: { elevation: 3 },
  web: { boxShadow: '0 4px 14px rgba(15,23,42,0.06)' },
});

const COLOR_PRESETS = [
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#14B8A6',
  '#0EA5E9',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#64748B',
  '#0F172A',
];

const normalizeEntityId = value => {
  if (value == null) {
    return '';
  }

  const rawValue =
    typeof value === 'object'
      ? value?.['@id'] || value?.id || value?.value || ''
      : value;

  return String(rawValue || '').replace(/\D+/g, '').trim();
};

const buildCompanyIri = companyId => {
  const normalizedCompanyId = normalizeEntityId(companyId);
  return normalizedCompanyId ? `/people/${normalizedCompanyId}` : '';
};

const buildCategoryIri = categoryId => {
  const normalizedCategoryId = normalizeEntityId(categoryId);
  return normalizedCategoryId ? `/categories/${normalizedCategoryId}` : '';
};

const sortContextValues = values =>
  [...values].sort((left, right) =>
    humanizeCategoryContext(left).localeCompare(humanizeCategoryContext(right), 'pt-BR', {
      sensitivity: 'base',
    }),
  );

const ParentPickerModal = ({
  visible,
  onClose,
  categories,
  selectedParentId,
  onSelect,
}) => {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!visible) {
      setSearch('');
    }
  }, [visible]);

  const filteredCategories = useMemo(() => {
    const term = String(search || '').trim().toLowerCase();

    return (Array.isArray(categories) ? categories : []).filter(category => {
      if (!term) {
        return true;
      }

      return String(category?.name || '').toLowerCase().includes(term);
    });
  }, [categories, search]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Categoria pai</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Icon name="x" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View style={styles.searchBar}>
                <Icon name="search" size={16} color="#94A3B8" />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  style={styles.searchInput}
                  placeholder="Buscar categoria pai..."
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <ScrollView style={styles.parentList} keyboardShouldPersistTaps="handled">
                <TouchableOpacity
                  style={styles.parentRow}
                  onPress={() => {
                    onSelect(null);
                    onClose();
                  }}>
                  <View style={[styles.parentColorDot, { backgroundColor: '#CBD5E1' }]} />
                  <Text style={[styles.parentRowText, !selectedParentId && styles.parentRowTextActive]}>
                    Nenhuma
                  </Text>
                  {!selectedParentId ? <Icon name="check-circle" size={18} color="#22C55E" /> : null}
                </TouchableOpacity>

                {filteredCategories.map(category => {
                  const categoryId = normalizeEntityId(category?.id || category?.['@id']);
                  const isActive = categoryId === normalizeEntityId(selectedParentId);

                  return (
                    <TouchableOpacity
                      key={category?.['@id'] || categoryId || category?.name}
                      style={styles.parentRow}
                      onPress={() => {
                        onSelect(categoryId);
                        onClose();
                      }}>
                      <View
                        style={[
                          styles.parentColorDot,
                          { backgroundColor: category?.color || '#CBD5E1' },
                        ]}
                      />
                      <Text style={[styles.parentRowText, isActive && styles.parentRowTextActive]}>
                        {category?.name || 'Categoria'}
                      </Text>
                      {isActive ? <Icon name="check-circle" size={18} color="#2563EB" /> : null}
                    </TouchableOpacity>
                  );
                })}

                {filteredCategories.length === 0 ? (
                  <View style={styles.parentEmptyState}>
                    <Text style={styles.parentEmptyText}>Nenhuma categoria encontrada</Text>
                  </View>
                ) : null}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default function ManagerCategoriesPage({ navigation, route }) {
  const categoriesStore = useStore('categories');
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const messageApi = useMessage() || {};

  const categoryActions = categoriesStore.actions;
  const { items: storeCategories = [], isLoading } = categoriesStore.getters;
  const { currentCompany } = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;

  const palette = useMemo(
    () =>
      resolveThemePalette(
        { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
        colors,
      ),
    [themeColors, currentCompany?.id],
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContext, setSelectedContext] = useState('all');
  const [formVisible, setFormVisible] = useState(false);
  const [parentPickerVisible, setParentPickerVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formName, setFormName] = useState('');
  const [formContext, setFormContext] = useState('');
  const [isFormContextLocked, setIsFormContextLocked] = useState(false);
  const [formColor, setFormColor] = useState(COLOR_PRESETS[5]);
  const [formIcon, setFormIcon] = useState('');
  const [formParentId, setFormParentId] = useState(null);

  const safeCategories = useMemo(
    () => (Array.isArray(storeCategories) ? storeCategories : []),
    [storeCategories],
  );

  const currentCompanyIri = useMemo(
    () => buildCompanyIri(currentCompany?.id || currentCompany?.['@id']),
    [currentCompany?.id, currentCompany?.['@id']],
  );

  const loadCategories = useCallback(async () => {
    if (!currentCompanyIri) {
      return [];
    }

    return categoryActions.getItems({
      company: currentCompanyIri,
      itemsPerPage: 500,
      'order[name]': 'ASC',
    });
  }, [categoryActions, currentCompanyIri]);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [loadCategories]),
  );

  const allContexts = useMemo(() => {
    const contextsFromDatabase = safeCategories
      .map(category => normalizeCategoryContext(category?.context))
      .filter(Boolean);

    const routePresetContext = normalizeCategoryContext(route?.params?.presetContext);
    const currentFormContext = normalizeCategoryContext(formContext);

    return sortContextValues(
      Array.from(new Set([...contextsFromDatabase, routePresetContext, currentFormContext].filter(Boolean))),
    );
  }, [formContext, route?.params?.presetContext, safeCategories]);

  const contextDisplayByValue = useMemo(() => {
    const displayMap = {};

    safeCategories.forEach(category => {
      const normalizedContext = normalizeCategoryContext(category?.context);
      if (!normalizedContext || displayMap[normalizedContext]) {
        return;
      }

      displayMap[normalizedContext] = String(category?.context || '');
    });

    const presetContext = normalizeCategoryContext(route?.params?.presetContext);
    if (presetContext && !displayMap[presetContext]) {
      displayMap[presetContext] = String(route?.params?.presetContext || presetContext);
    }

    const currentContext = normalizeCategoryContext(formContext);
    if (currentContext && !displayMap[currentContext]) {
      displayMap[currentContext] = String(formContext || currentContext);
    }

    return displayMap;
  }, [formContext, route?.params?.presetContext, safeCategories]);

  const filteredContextOptions = useMemo(() => {
    const normalizedSearch = String(searchTerm || '').trim().toLowerCase();
    if (!normalizedSearch) {
      return allContexts;
    }

    return allContexts.filter(contextValue => {
      const normalizedContextValue = normalizeCategoryContext(contextValue).toLowerCase();
      const humanizedContext = humanizeCategoryContext(contextValue).toLowerCase();

      return (
        normalizedContextValue.includes(normalizedSearch) ||
        humanizedContext.includes(normalizedSearch)
      );
    });
  }, [allContexts, searchTerm]);

  const filteredCategories = useMemo(() => {
    const normalizedSearch = String(searchTerm || '').trim().toLowerCase();

    return safeCategories.filter(category => {
      const categoryContext = normalizeCategoryContext(category?.context);
      const matchesContext = selectedContext === 'all' || categoryContext === selectedContext;

      if (!matchesContext) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const categoryName = String(category?.name || '').toLowerCase();
      const rawContext = categoryContext.toLowerCase();
      const friendlyContext = humanizeCategoryContext(categoryContext).toLowerCase();

      return (
        categoryName.includes(normalizedSearch) ||
        rawContext.includes(normalizedSearch) ||
        friendlyContext.includes(normalizedSearch)
      );
    });
  }, [safeCategories, searchTerm, selectedContext]);

  const parentOptions = useMemo(() => {
    const currentContext = normalizeCategoryContext(formContext);
    const editingId = normalizeEntityId(editingCategory?.id || editingCategory?.['@id']);

    return safeCategories.filter(category => {
      const categoryId = normalizeEntityId(category?.id || category?.['@id']);
      if (editingId && categoryId === editingId) {
        return false;
      }

      return normalizeCategoryContext(category?.context) === currentContext;
    });
  }, [editingCategory?.['@id'], editingCategory?.id, formContext, safeCategories]);

  const selectedParent = useMemo(
    () =>
      safeCategories.find(category => normalizeEntityId(category?.id || category?.['@id']) === normalizeEntityId(formParentId)) ||
      null,
    [formParentId, safeCategories],
  );

  const openCreateModal = useCallback(
    (presetContext, options = {}) => {
      const normalizedPresetContext =
        normalizeCategoryContext(presetContext) ||
        (selectedContext !== 'all' ? selectedContext : '');

      setEditingCategory(null);
      setFormName('');
      setFormContext(normalizedPresetContext);
      setIsFormContextLocked(Boolean(options.lockContext && normalizedPresetContext));
      setFormColor(COLOR_PRESETS[5]);
      setFormIcon('');
      setFormParentId(null);
      setFormVisible(true);
    },
    [selectedContext],
  );

  const openEditModal = useCallback(category => {
    setEditingCategory(category);
    setFormName(String(category?.name || ''));
    setFormContext(normalizeCategoryContext(category?.context));
    setIsFormContextLocked(false);
    setFormColor(category?.color || COLOR_PRESETS[5]);
    setFormIcon(String(category?.icon || ''));
    setFormParentId(normalizeEntityId(category?.parent?.id || category?.parent?.['@id']));
    setFormVisible(true);
  }, []);

  const closeFormModal = useCallback(() => {
    setFormVisible(false);
    setEditingCategory(null);
    setFormName('');
    setFormContext('');
    setIsFormContextLocked(false);
    setFormColor(COLOR_PRESETS[5]);
    setFormIcon('');
    setFormParentId(null);
  }, []);

  useEffect(() => {
    const actionKey = route?.params?.categoryAction;
    if (!actionKey) {
      return;
    }

    const presetContext = normalizeCategoryContext(route?.params?.presetContext);
    if (presetContext) {
      setSelectedContext(presetContext);
    }

    if (route?.params?.startNew) {
      openCreateModal(presetContext, {
        lockContext: Boolean(route?.params?.lockContext && presetContext),
      });
    }
    navigation?.setParams?.({
      categoryAction: undefined,
      presetContext,
      lockContext: undefined,
      startNew: false,
    });
  }, [
    route?.params?.lockContext,
    navigation,
    openCreateModal,
    route?.params?.categoryAction,
    route?.params?.presetContext,
    route?.params?.startNew,
  ]);

  const handleSaveCategory = useCallback(async () => {
    const normalizedName = String(formName || '').trim();
    const normalizedContext = normalizeCategoryContext(formContext);

    if (!normalizedName) {
      messageApi.showError?.('Informe o nome da categoria.');
      return;
    }

    if (!normalizedContext) {
      messageApi.showError?.('Informe o contexto da categoria.');
      return;
    }

    if (!currentCompanyIri) {
      messageApi.showError?.('Selecione uma empresa antes de salvar categorias.');
      return;
    }

    setIsSubmitting(true);
    try {
      await categoryActions.save({
        ...(editingCategory?.id ? { id: editingCategory.id } : {}),
        name: normalizedName,
        context: normalizedContext,
        color: String(formColor || '').trim() || null,
        icon: String(formIcon || '').trim() || null,
        company: currentCompanyIri,
        parent: buildCategoryIri(formParentId) || null,
      });

      await loadCategories();
      setSelectedContext(normalizedContext);
      closeFormModal();
      messageApi.showSuccess?.(
        editingCategory?.id ? 'Categoria atualizada com sucesso.' : 'Categoria criada com sucesso.',
      );
    } catch (error) {
      messageApi.showError?.(
        error?.message || error?.description || 'Nao foi possivel salvar a categoria.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    categoryActions,
    closeFormModal,
    currentCompanyIri,
    editingCategory?.id,
    formColor,
    formContext,
    formIcon,
    formName,
    formParentId,
    loadCategories,
    messageApi,
  ]);

  const handleDeleteCategory = useCallback(async () => {
    const categoryId = normalizeEntityId(deleteTarget?.id);
    if (!categoryId) {
      setDeleteTarget(null);
      return;
    }

    setIsSubmitting(true);
    try {
      await categoryActions.remove(categoryId);
      await loadCategories();
      setDeleteTarget(null);
      messageApi.showSuccess?.('Categoria removida com sucesso.');
    } catch (error) {
      messageApi.showError?.(
        error?.message || error?.description || 'Nao foi possivel remover a categoria.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [categoryActions, deleteTarget?.id, loadCategories, messageApi]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background || '#F8FAFC' }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Categorias</Text>
          <Text style={styles.headerSubtitle}>
            Edite as categorias da tabela `category` e filtre por nome ou contexto.
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: palette.primary || '#2563EB' }]}
          activeOpacity={0.88}
          onPress={() => openCreateModal()}>
          <Icon name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Nova categoria</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.filterCard, cardShadow]}>
        <View style={styles.searchBar}>
          <Icon name="search" size={16} color="#94A3B8" />
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={styles.searchInput}
            placeholder="Buscar categoria ou contexto..."
            placeholderTextColor="#94A3B8"
          />
          {searchTerm ? (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Icon name="x" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.filterLabel}>Contextos vindos do banco</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.contextRow}>
          <TouchableOpacity
            style={[
              styles.contextChip,
              selectedContext === 'all' && {
                backgroundColor: palette.primary || '#2563EB',
                borderColor: palette.primary || '#2563EB',
              },
            ]}
            onPress={() => setSelectedContext('all')}>
            <Text
              style={[
                styles.contextChipText,
                selectedContext === 'all' && styles.contextChipTextActive,
              ]}>
              Todos
            </Text>
          </TouchableOpacity>

          {filteredContextOptions.map(contextValue => {
            const isActive = selectedContext === contextValue;

            return (
              <TouchableOpacity
                key={contextValue}
                style={[
                  styles.contextChip,
                  isActive && {
                    backgroundColor: palette.primary || '#2563EB',
                    borderColor: palette.primary || '#2563EB',
                  },
                ]}
                onPress={() => setSelectedContext(contextValue)}>
                <Text style={[styles.contextChipText, isActive && styles.contextChipTextActive]}>
                  {contextDisplayByValue[contextValue] || contextValue}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={palette.primary || '#2563EB'} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}>
          {filteredCategories.length === 0 ? (
            <View style={[styles.emptyCard, cardShadow]}>
              <Icon name="tag" size={36} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Nenhuma categoria encontrada</Text>
              <Text style={styles.emptySubtitle}>
                Ajuste o filtro ou crie uma nova categoria para este contexto.
              </Text>
            </View>
          ) : null}

          {filteredCategories.map(category => {
            const categoryId = normalizeEntityId(category?.id || category?.['@id']);

            return (
              <View key={category?.['@id'] || categoryId || category?.name} style={[styles.categoryCard, cardShadow]}>
                <View style={styles.categoryCardTop}>
                  <View style={[styles.categoryColorDot, { backgroundColor: category?.color || '#CBD5E1' }]} />
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{category?.name || 'Categoria sem nome'}</Text>
                    <Text style={styles.categoryMeta}>
                      {category?.parent?.name
                        ? `Pai: ${category.parent.name}`
                        : 'Sem categoria pai'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.contextBadge,
                      { backgroundColor: withOpacity(palette.primary || '#2563EB', 0.1) },
                    ]}>
                    <Text style={[styles.contextBadgeText, { color: palette.primary || '#2563EB' }]}>
                      {String(category?.context || 'Sem contexto')}
                    </Text>
                  </View>
                </View>

                <View style={styles.categoryCardBottom}>
                  <Text style={styles.categoryMeta}>
                    {category?.icon ? `Icone: ${category.icon}` : 'Sem icone'}
                  </Text>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.cardActionButton}
                      onPress={() => openEditModal(category)}>
                      <Icon name="edit-2" size={16} color="#475569" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.cardActionButton, styles.cardActionDanger]}
                      onPress={() =>
                        setDeleteTarget({
                          id: categoryId,
                          label: category?.name || 'Categoria',
                        })
                      }>
                      <Icon name="trash-2" size={16} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <Modal transparent visible={formVisible} animationType="fade" onRequestClose={closeFormModal}>
        <TouchableWithoutFeedback onPress={closeFormModal}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheet}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {editingCategory?.id ? 'Editar categoria' : 'Nova categoria'}
                  </Text>
                  <TouchableOpacity onPress={closeFormModal} style={styles.closeButton}>
                    <Icon name="x" size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView keyboardShouldPersistTaps="handled" style={styles.formBody}>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Nome *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formName}
                      onChangeText={setFormName}
                      placeholder="Ex: Propostas comerciais"
                      placeholderTextColor="#94A3B8"
                      autoFocus
                    />
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Contexto *</Text>
                    <TextInput
                      style={[styles.textInput, isFormContextLocked && styles.textInputDisabled]}
                      value={formContext}
                      onChangeText={setFormContext}
                      placeholder="Ex: proposal-category"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                      editable={!isFormContextLocked}
                    />
                    {isFormContextLocked ? (
                      <Text style={styles.lockedContextHint}>
                        Contexto fixo para esta origem.
                      </Text>
                    ) : allContexts.length > 0 ? (
                      <View style={styles.suggestionRow}>
                        {allContexts.map(contextValue => {
                          const isActive = normalizeCategoryContext(formContext) === contextValue;

                          return (
                            <TouchableOpacity
                              key={`suggestion-${contextValue}`}
                              style={[
                                styles.suggestionChip,
                                isActive && {
                                  backgroundColor: withOpacity(palette.primary || '#2563EB', 0.12),
                                  borderColor: palette.primary || '#2563EB',
                                },
                              ]}
                              onPress={() => setFormContext(contextValue)}>
                              <Text
                                style={[
                                  styles.suggestionChipText,
                                  isActive && { color: palette.primary || '#2563EB' },
                                ]}>
                                {contextValue}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Categoria pai</Text>
                    <TouchableOpacity
                      style={styles.selectButton}
                      onPress={() => setParentPickerVisible(true)}>
                      <Text style={[styles.selectButtonText, !selectedParent && styles.placeholderText]}>
                        {selectedParent?.name || 'Nenhuma'}
                      </Text>
                      <Icon name="chevron-down" size={18} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Cor</Text>
                    <View style={styles.colorPalette}>
                      {COLOR_PRESETS.map(colorValue => {
                        const isActive = String(formColor || '').toLowerCase() === colorValue.toLowerCase();

                        return (
                          <TouchableOpacity
                            key={colorValue}
                            style={[
                              styles.colorSwatch,
                              { backgroundColor: colorValue },
                              isActive && styles.colorSwatchActive,
                            ]}
                            onPress={() => setFormColor(colorValue)}>
                            {isActive ? <Icon name="check" size={14} color="#FFFFFF" /> : null}
                          </TouchableOpacity>
                        );
                      })}
                      <TextInput
                        style={styles.colorInput}
                        value={formColor}
                        onChangeText={setFormColor}
                        placeholder="#2563EB"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Icone</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formIcon}
                      onChangeText={setFormIcon}
                      placeholder="Ex: tag, file-text, briefcase"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                    />
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.cancelButton} onPress={closeFormModal}>
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      { backgroundColor: palette.primary || '#2563EB' },
                      isSubmitting && { opacity: 0.7 },
                    ]}
                    disabled={isSubmitting}
                    onPress={handleSaveCategory}>
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveButtonText}>
                        {editingCategory?.id ? 'Salvar' : 'Criar'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <ParentPickerModal
        visible={parentPickerVisible}
        onClose={() => setParentPickerVisible(false)}
        categories={parentOptions}
        selectedParentId={formParentId}
        onSelect={setFormParentId}
      />

      <Modal transparent visible={!!deleteTarget} animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <TouchableWithoutFeedback onPress={() => setDeleteTarget(null)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.confirmSheet}>
                <Text style={styles.modalTitle}>Excluir categoria</Text>
                <Text style={styles.confirmText}>
                  Deseja excluir <Text style={styles.confirmStrong}>{deleteTarget?.label}</Text>?
                </Text>

                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setDeleteTarget(null)}>
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: '#DC2626' }]}
                    disabled={isSubmitting}
                    onPress={handleDeleteCategory}>
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveButtonText}>Excluir</Text>
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
