/* eslint-disable no-unused-vars */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import styles, { MENU_COLORS } from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/index.styles';
import {
  MAIN_TABS,
} from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/tabs';
import {
  RESOURCE_META,
  activeCostSummary,
  categoryName,
  decimal,
  evidenceLabel,
  filterBySearch,
  formatDate,
  getById,
  money,
  preciseMoney,
  safeArray,
} from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/menuCostsShared';
import { fetchLatestPurchasesByProductIds } from '@controleonline/ui-products/src/react/domain/productCosting';
import { MENU_COSTS_PAGE_SIZE } from '@controleonline/ui-products/src/react/domain/menuCostsPagination';
import { resolveMenuCostsTabRoute } from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/navigation';
import {
  resolveCategoryCoverUrl,
  resolveProductCoverUrl,
} from '@controleonline/ui-products/src/react/domain/productMedia';
import { buildLiveIngredientsDb } from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/menuCostsIngredients';

const EMPTY_DB = {
  categories: [],
  ingredients: [],
  recipes: [],
  packaging: [],
  products: [],
  purchaseOrders: [],
  purchaseItems: [],
  inputs: [],
  suppliers: [],
  settings: {},
};

const IconButton = ({ icon, label, onPress, active, disabled = false }) => (
  <TouchableOpacity
    style={[
      styles.iconButton,
      active && styles.iconButtonActive,
      disabled && { opacity: 0.6 },
    ]}
    activeOpacity={disabled ? 1 : 0.82}
    onPress={disabled ? undefined : onPress}
    disabled={disabled}
  >
    <Icon
      name={icon}
      size={16}
      color={active ? MENU_COLORS.brandText : MENU_COLORS.muted}
    />
    {label ? (
      <Text style={[styles.iconButtonText, active && styles.iconButtonTextActive]}>
        {label}
      </Text>
    ) : null}
  </TouchableOpacity>
);

const SearchBox = ({ value, onChangeText, placeholder }) => (
  <View style={styles.searchBox}>
    <Icon name="search" size={16} color={MENU_COLORS.muted} />
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={MENU_COLORS.muted}
      style={styles.searchInput}
    />
  </View>
);

const Field = ({ label, value, onCommitText, inputProps }) => {
  const [draft, setDraft] = useState(String(value ?? ''));

  useEffect(() => {
    setDraft(String(value ?? ''));
  }, [value]);

  const commit = () => onCommitText?.(draft);

  return (
    <View style={styles.infoCell}>
      <Text style={styles.infoLabel}>{label}</Text>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onEndEditing={commit}
        onSubmitEditing={commit}
        placeholderTextColor={MENU_COLORS.muted}
        style={[styles.quantityInput, { minHeight: 34, marginTop: 4 }]}
        {...(inputProps || {})}
      />
    </View>
  );
};

const Badge = ({ label, children, tone = 'neutral' }) => {
  const toneStyle =
    tone === 'good'
      ? styles.toneGood
      : tone === 'warn'
        ? styles.toneWarn
        : tone === 'bad'
          ? styles.toneBad
          : styles.toneNeutral;

  return (
    <View style={[styles.badge, toneStyle]}>
      <Text style={styles.badgeText}>{label || children}</Text>
    </View>
  );
};

const EmptyState = ({ text = 'Nenhum registro encontrado.' }) => (
  <View style={styles.emptyState}>
    <Icon name="inbox" size={24} color={MENU_COLORS.muted} />
    <Text style={styles.emptyStateText}>{text}</Text>
  </View>
);

const buildImageSource = url => (url ? { uri: url } : null);

const imageForIngredient = (db, ingredient) =>
  buildImageSource(
    resolveProductCoverUrl(ingredient) ||
    resolveCategoryCoverUrl(getById(db, 'categories', ingredient?.categoryId)),
  );

const VisualThumb = ({ source, label, size = 'md' }) => (
  <View
    style={[
      styles.visualThumb,
      size === 'lg' && styles.visualThumbLarge,
      size === 'sm' && styles.visualThumbSmall,
    ]}
  >
    {source ? (
      <Image source={source} style={styles.visualImage} resizeMode="cover" />
    ) : (
      <Text style={styles.visualInitial}>{String(label || 'GY').slice(0, 2).toUpperCase()}</Text>
    )}
  </View>
);

const DetailShell = ({ title, subtitle, badges, children }) => (
  <View style={styles.detailPanel}>
    <View style={styles.detailHeader}>
      <View style={styles.detailHeaderText}>
        <View style={styles.badgeLine}>
          {safeArray(badges).map(badge => (
            <Badge key={badge.label} tone={badge.tone}>{badge.label}</Badge>
          ))}
        </View>
        <Text style={styles.detailTitle}>{title}</Text>
        {subtitle ? <Text style={styles.detailSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
    {children}
  </View>
);

const parseCostInput = value => {
  const parsed = Number.parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeText = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const compactEvidenceLabel = (purchase, item = {}) => {
  if (purchase) {
    const date = formatDate(purchase.date || purchase.orderDate);
    const id = purchase.orderId ? `#${purchase.orderId}` : 'compra';
    return [date, id].filter(Boolean).join(' · ');
  }

  const reference = item.evidenceSource || item.sourceReference || item.activeCostNote || '';
  return reference ? String(reference).slice(0, 28) : 'Sem evidência';
};

const operationalGroupName = (db, item = {}) => {
  const category = categoryName(db, item.categoryId);
  if (category && category !== 'Sem categoria') return category;

  const haystack = normalizeText([
    item.name,
    item.code,
    item.sku,
    item.description,
    item.notes,
    item.supplier,
    item.sourceReference,
    item.evidenceSource,
  ].filter(Boolean).join(' '));

  if (/\b(fraldinha|frango|linguica|bacon|carne|acougue|bovina|suina|peito|sobrecoxa)\b/.test(haystack)) {
    return 'Carnes / açougue';
  }
  if (/\b(queijo|mucarela|mussarela|catupiry|cheddar|maionese|requeijao|laticinio|frios|manteiga)\b/.test(haystack)) {
    return 'Laticínios e frios';
  }
  if (/\b(tomate|cebola|alho|limao|cheiro|verde|louro|manjericao|berinjela|hortifruti|verdura|legume)\b/.test(haystack)) {
    return 'Hortifruti';
  }
  if (/\b(azeite|oleo|vinagre|molho|barbecue|ketchup|mostarda|pimenta|sal|acucar|tempero|sache)\b/.test(haystack)) {
    return 'Mercearia e temperos';
  }
  if (/\b(batata|congelado|churros|base pronta)\b/.test(haystack)) {
    return 'Congelados e bases prontas';
  }
  if (/\b(agua|cerveja|refrigerante|suco|budweiser|guarana|coca|fanta)\b/.test(haystack)) {
    return 'Bebidas';
  }

  return 'Sem categoria';
};

const groupedOperationalRows = (db, rows, resolveOperationalGroup) =>
  Object.entries(safeArray(rows).reduce((groups, item) => {
    const groupName = typeof resolveOperationalGroup === 'function'
      ? resolveOperationalGroup(item, db, { categoryName: categoryName(db, item.categoryId) })
      : operationalGroupName(db, item);
    return {
      ...groups,
      [groupName]: [...safeArray(groups[groupName]), item],
    };
  }, {})).sort(([left], [right]) => String(left).localeCompare(String(right), 'pt-BR'));

const orderOperationalGroupEntries = (entries = [], emptyGroups = [], includeEmpty = false) => {
  const entryMap = new Map(entries);
  const names = new Set([
    ...(includeEmpty ? safeArray(emptyGroups) : []),
    ...Array.from(entryMap.keys()),
  ]);
  const orderMap = new Map(safeArray(emptyGroups).map((groupName, index) => [groupName, index]));

  return Array.from(names)
    .map(groupName => [groupName, safeArray(entryMap.get(groupName))])
    .filter(([, groupRows]) => includeEmpty || groupRows.length > 0)
    .sort(([left], [right]) => {
      const leftOrder = orderMap.has(left) ? orderMap.get(left) : Number.MAX_SAFE_INTEGER;
      const rightOrder = orderMap.has(right) ? orderMap.get(right) : Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return String(left).localeCompare(String(right), 'pt-BR');
    });
};

const costSourceState = (summary, item = {}) => {
  if (summary.mode === 'manual') {
    return {
      label: 'Manual',
      tone: 'warn',
      origin: item.activeCostNote || summary.source || 'Valor informado manualmente',
      linkLabel: 'Valor manual',
      hasEvidence: false,
    };
  }

  if (['selected', 'latest'].includes(summary.mode) && (summary.selected || summary.latest)) {
    const purchase = summary.selected || summary.latest;
    return {
      label: 'Comprovado',
      tone: 'good',
      origin: `${formatDate(purchase.date)} · ${purchase.supplierName}`,
      linkLabel: compactEvidenceLabel(purchase, item),
      hasEvidence: true,
    };
  }

  if ((item.evidenceType || item.sourceType) === 'documented' && summary.latest) {
    return {
      label: 'Comprovado',
      tone: 'good',
      origin: `${formatDate(summary.latest.date)} · ${summary.latest.supplierName}`,
      linkLabel: compactEvidenceLabel(summary.latest, item),
      hasEvidence: true,
    };
  }

  if ((item.evidenceType || item.sourceType) === 'documented') {
    return {
      label: 'Comprovado',
      tone: 'good',
      origin: item.sourceReference || item.evidenceSource || summary.source || 'Fonte comprovada',
      linkLabel: compactEvidenceLabel(null, item),
      hasEvidence: true,
    };
  }

  return {
    label: 'Revisar',
    tone: 'warn',
    origin: summary.source || 'Sem fonte comprovada',
    linkLabel: 'Sem evidência',
    hasEvidence: false,
  };
};

const purchaseItemIdForRow = (row, ingredient) => {
  const orderId = String(row?.orderId || '').trim();
  const ingredientId = String(ingredient?.id || '').trim();
  return orderId && ingredientId ? `${orderId}:${ingredientId}` : '';
};

const IngredientCostInput = ({ value, unit, disabled, onCommit }) => {
  const [draft, setDraft] = useState(String(value ?? ''));

  useEffect(() => {
    setDraft(String(value ?? ''));
  }, [value]);

  const commit = () => {
    onCommit?.(parseCostInput(draft));
  };

  return (
    <View style={styles.tableEditableCost}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onEndEditing={commit}
        onSubmitEditing={commit}
        keyboardType="numeric"
        editable={!disabled}
        style={styles.tableInput}
      />
      <Text style={styles.quantityUnit}>/{unit}</Text>
    </View>
  );
};

const IngredientCostRow = ({ db, item, selected, saving, onSelect, onManualCostCommit, onOpenEvidence }) => {
  const summary = activeCostSummary(db, 'ingredient', item);
  const category = categoryName(db, item.categoryId);
  const sourceState = costSourceState(summary, item);
  const unitLabel = `${summary.primaryUnit}${summary.primaryUnit !== summary.baseUnit ? ` / ${summary.baseUnit}` : ''}`;

  return (
    <TouchableOpacity
      style={[
        styles.tableRow,
        sourceState.tone === 'good' && styles.tableRowGood,
        sourceState.tone === 'warn' && styles.tableRowWarn,
        sourceState.tone === 'bad' && styles.tableRowBad,
        selected && styles.tableRowActive,
      ]}
      activeOpacity={0.84}
      onPress={() => onSelect?.(item.id)}
    >
      <View style={[styles.tableIdentity, styles.tableIdentityCompact]}>
        <VisualThumb source={imageForIngredient(db, item)} label={item.name} size="sm" />
        <View style={styles.tableIdentityText}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.rowSubtitle} numberOfLines={2}>
            {[item.code || item.sku, category].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>
      <Text style={[styles.tableCell, styles.tableCellCompactUnit]}>{unitLabel}</Text>
      <View style={[styles.tableCell, styles.tableCellCompactCost]}>
        <IngredientCostInput
          value={item.manualUnitCost ?? item.fixedUnitCost ?? item.overrideUnitCost ?? summary.activePrimaryCost}
          unit={summary.primaryUnit}
          disabled={saving}
          onCommit={value => onManualCostCommit?.(item, value)}
        />
      </View>
      <Text style={[styles.tableCell, styles.tableCellCompactBase]}>{preciseMoney(summary.activeBaseCost)} / {summary.baseUnit}</Text>
      <View style={[styles.tableCell, styles.tableCellCompactAudit]}>
        <Badge tone={sourceState.tone}>{sourceState.label}</Badge>
      </View>
      <View style={[styles.tableCell, styles.tableCellCompactLink]}>
        {sourceState.hasEvidence ? (
          <View style={styles.evidenceLinkGroup}>
            <TouchableOpacity
              style={styles.sourceLinkButton}
              activeOpacity={0.82}
              onPress={() => onOpenEvidence?.(item)}
            >
              <Text style={styles.sourceLinkText}>Mapa</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sourceLinkButton}
              activeOpacity={0.82}
              onPress={() => onOpenEvidence?.(item)}
            >
              <Text style={styles.sourceLinkText} numberOfLines={1}>
                {sourceState.linkLabel}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.tableCellText}>{sourceState.linkLabel}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const IngredientsCostTable = ({
  db,
  rows,
  selectedId,
  savingCostId,
  expandAllByDefault = false,
  includeEmptyOperationalGroups = false,
  emptyOperationalGroups = [],
  resolveOperationalGroup,
  onSelect,
  onManualCostCommit,
  onOpenEvidence,
}) => {
  const groups = useMemo(
    () => orderOperationalGroupEntries(
      groupedOperationalRows(db, rows, resolveOperationalGroup),
      emptyOperationalGroups,
      includeEmptyOperationalGroups,
    ),
    [db, emptyOperationalGroups, includeEmptyOperationalGroups, resolveOperationalGroup, rows],
  );
  const groupNames = useMemo(() => groups.map(([groupName]) => groupName), [groups]);
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  useEffect(() => {
    setExpandedGroups(expandAllByDefault ? new Set(groupNames) : new Set());
  }, [expandAllByDefault, groupNames.join('|')]);

  const allExpanded = groupNames.length > 0 && expandedGroups.size >= groupNames.length;
  const toggleAllGroups = useCallback(() => {
    setExpandedGroups(allExpanded ? new Set() : new Set(groupNames));
  }, [allExpanded, groupNames]);
  const toggleGroup = useCallback(groupName => {
    setExpandedGroups(current => {
      const next = new Set(current);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  }, []);

  return (
    <View>
      <View style={styles.badgeLine}>
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.82} onPress={toggleAllGroups}>
          <Icon name={allExpanded ? 'minimize-2' : 'maximize-2'} size={14} color={MENU_COLORS.muted} />
          <Text style={styles.iconButtonText}>{allExpanded ? 'Recolher todas' : 'Expandir todas'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.activeCostTable, styles.ingredientsCostTable]}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.tableHeaderTextCompactName]}>Ingrediente</Text>
            <Text style={[styles.tableHeaderText, styles.tableHeaderTextCompactUnit]}>Unidade</Text>
            <Text style={[styles.tableHeaderText, styles.tableHeaderTextCompactCost]}>Custo ativo</Text>
            <Text style={[styles.tableHeaderText, styles.tableHeaderTextCompactBase]}>Base</Text>
            <Text style={[styles.tableHeaderText, styles.tableHeaderTextCompactAudit]}>Auditoria</Text>
            <Text style={[styles.tableHeaderText, styles.tableHeaderTextCompactLink]}>Vínculo</Text>
          </View>
          {groups.map(([groupName, groupRows]) => {
            const expanded = expandedGroups.has(groupName);
            const documented = groupRows.filter(item => (item.evidenceType || item.sourceType) === 'documented').length;
            const review = groupRows.filter(item => ['review', 'estimated', 'manual'].includes(item.evidenceType || item.sourceType)).length;

            return (
              <View key={groupName}>
                <TouchableOpacity
                  style={styles.tableGroupHeader}
                  activeOpacity={0.82}
                  onPress={() => toggleGroup(groupName)}
                >
                  <View style={styles.lineRow}>
                    <Text style={styles.tableGroupTitle}>{groupName}</Text>
                    <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={MENU_COLORS.muted} />
                  </View>
                  <Text style={styles.tableGroupSubtitle}>
                    {groupRows.length} item(ns) nesta família operacional · {documented} comprovado(s) · {review} para revisar
                  </Text>
                </TouchableOpacity>
                {expanded ? groupRows.map(item => (
                  <IngredientCostRow
                    key={item.id}
                    db={db}
                    item={item}
                    selected={String(selectedId) === String(item.id)}
                    saving={String(savingCostId || '') === String(item.id)}
                    onSelect={onSelect}
                    onManualCostCommit={onManualCostCommit}
                    onOpenEvidence={onOpenEvidence}
                  />
                )) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const CostSourcePanel = ({
  db,
  item,
  purchaseRows,
  saving,
  onPatchCost,
  onUsePurchase,
  onOpenEvidence,
}) => {
  const summary = activeCostSummary(db, 'ingredient', item);
  const sourceState = costSourceState(summary, item);
  const manualValue = item.manualUnitCost ?? item.fixedUnitCost ?? item.overrideUnitCost ?? summary.activePrimaryCost;
  const latestPurchase = safeArray(purchaseRows)[0] || summary.latest;
  const [showPurchaseChoices, setShowPurchaseChoices] = useState(false);
  const purchaseChoices = safeArray(purchaseRows).slice(0, 10);

  return (
    <View style={styles.activeCostPanel}>
      <View style={styles.activeCostHeader}>
        <View>
          <Text style={styles.panelTitle}>Custo ativo</Text>
          <Text style={styles.panelSubtitle}>
            Valor que alimenta fichas, grupos e adicionais.
          </Text>
        </View>
        <Badge tone={sourceState.tone}>{sourceState.label}</Badge>
      </View>

      <View style={styles.costSummaryHero}>
        <View>
          <Text style={styles.infoLabel}>Valor atual</Text>
          <Text style={styles.costSummaryValue}>{money(summary.activePrimaryCost)} / {summary.primaryUnit}</Text>
          <Text style={styles.infoHelper}>{preciseMoney(summary.activeBaseCost)} / {summary.baseUnit}</Text>
        </View>
        <View style={styles.costSummaryMeta}>
          <Text style={styles.infoLabel}>Origem</Text>
          <Text style={styles.rowTitle}>{sourceState.label}</Text>
          <Text style={styles.infoHelper} numberOfLines={2}>{sourceState.origin}</Text>
        </View>
      </View>

      <View style={styles.costControlPanel}>
        <View style={styles.sourceDecisionHeader}>
          <View>
            <Text style={styles.panelTitle}>Usar valor manual</Text>
            <Text style={styles.panelSubtitle}>Informe um valor combinado e registre o motivo.</Text>
          </View>
          <Badge tone={summary.mode === 'manual' ? 'warn' : 'neutral'}>
            {summary.mode === 'manual' ? 'Em uso' : 'Opcional'}
          </Badge>
        </View>
        <View style={styles.costManualRow}>
          <Field
            label={`Valor manual por ${summary.primaryUnit}`}
            value={manualValue}
            inputProps={{ keyboardType: 'numeric' }}
            onCommitText={value => onPatchCost?.(item, {
              activeCostMode: 'manual',
              manualUnitCost: parseCostInput(value),
              evidenceType: 'manual',
            })}
          />
          <Field
            label="Motivo do valor manual"
            value={item.activeCostNote || ''}
            onCommitText={value => onPatchCost?.(item, { activeCostNote: value })}
          />
        </View>
      </View>

      <View style={styles.panelNested}>
        <View style={styles.activeCostHeader}>
          <View>
            <Text style={styles.panelTitle}>Usar compra comprovada</Text>
            <Text style={styles.panelSubtitle}>Escolha uma compra recente para alimentar o custo deste ingrediente.</Text>
          </View>
          <TouchableOpacity style={styles.sourceLinkButton} onPress={() => setShowPurchaseChoices(current => !current)}>
            <Text style={styles.sourceLinkText}>
              {showPurchaseChoices ? 'Ocultar compras' : 'Ver compras'}
            </Text>
          </TouchableOpacity>
        </View>
        {showPurchaseChoices && latestPurchase && !purchaseChoices.length ? (
          <View style={styles.sourceChoiceCard}>
            <View style={styles.sourceChoiceHeader}>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle} numberOfLines={1}>Última compra comprovada</Text>
                <Text style={styles.rowSubtitle} numberOfLines={2}>
                  {formatDate(latestPurchase.date || latestPurchase.orderDate)} · {latestPurchase.supplierName || latestPurchase.supplierLabel || 'Fornecedor'}
                </Text>
              </View>
              <Text style={styles.rowMoney}>{money(latestPurchase.totalPrice || latestPurchase.totalAmount)}</Text>
            </View>
            <View style={styles.sourceChoiceActions}>
              <TouchableOpacity
                style={styles.costModeButton}
                activeOpacity={0.82}
                onPress={() => onUsePurchase?.(item, latestPurchase)}
                disabled={saving}
              >
                <Text style={styles.costModeText}>Usar esta compra</Text>
              </TouchableOpacity>
              <Badge tone="good">Comprovado</Badge>
            </View>
          </View>
        ) : null}
        {showPurchaseChoices ? purchaseChoices.map(row => {
          const purchaseItemId = purchaseItemIdForRow(row, item);
          const active = String(item.activePurchaseItemId || item.selectedPurchaseItemId || '') === purchaseItemId;
          return (
            <View
              key={row.id || purchaseItemId}
              style={[styles.sourceChoiceCard, active && styles.sourceChoiceCardActive]}
            >
              <View style={styles.sourceChoiceHeader}>
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {formatDate(row.date || row.orderDate)} · {row.supplierName || row.supplierLabel || 'Fornecedor'}
                  </Text>
                  <Text style={styles.rowSubtitle} numberOfLines={2}>
                    {decimal(row.quantity, 3)} {row.unit || item.baseUnit || 'un'} · unit {money(row.unitPrice)}
                  </Text>
                </View>
                <Text style={styles.rowMoney}>{money(row.totalPrice || row.totalAmount)}</Text>
              </View>
              <View style={styles.sourceChoiceActions}>
                <TouchableOpacity
                  style={[styles.costModeButton, active && styles.costModeButtonActive]}
                  activeOpacity={0.82}
                  onPress={() => onUsePurchase?.(item, row)}
                  disabled={saving}
                >
                  <Text style={[styles.costModeText, active && styles.costModeTextActive]}>
                    Usar esta compra
                  </Text>
                </TouchableOpacity>
                <Badge tone={safeArray(row.inputs).length ? 'good' : 'warn'}>
                  {safeArray(row.inputs).length ? 'Comprovado' : 'Compra do ERP'}
                </Badge>
              </View>
            </View>
          );
        }) : null}
        {showPurchaseChoices && !latestPurchase && !purchaseChoices.length ? (
          <EmptyState text="Nenhuma compra comprovada encontrada para este ingrediente." />
        ) : null}
      </View>
    </View>
  );
};

const resolveSectionTitle = () => 'Ingredientes cadastrados no ERP';

export default function MenuCostsIngredientsPage({
  navigation,
  filterIngredients,
  resolveOperationalGroup,
  emptyOperationalGroups = [],
}) {
  const messageApi = useMessage() || {};
  const { showError } = messageApi;
  const peopleStore = useStore('people');
  const productsStore = useStore('products');
  const productGroupProductStore = useStore('product_group_product');
  const categoriesStore = useStore('categories');
  const ordersStore = useStore('orders');
  const { currentCompany } = peopleStore.getters || {};
  const { width } = useWindowDimensions();
  const isWide = width >= 1060;

  const [db, setDb] = useState(EMPTY_DB);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [visibleCount, setVisibleCount] = useState(MENU_COSTS_PAGE_SIZE);
  const [selectedPurchaseRows, setSelectedPurchaseRows] = useState([]);
  const [savingCostId, setSavingCostId] = useState(null);
  const requestIdRef = useRef(0);
  const purchaseRequestIdRef = useRef(0);
  const purchaseCacheRef = useRef(new Map());

  const loadLiveDb = useCallback(async () => {
    const companyId = currentCompany?.id;
    const companyIri = companyId ? `/people/${companyId}` : '';

    if (!companyId) {
      setDb(EMPTY_DB);
      setSelectedId(null);
      setLoadError('');
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoadingDb(true);
    setLoadError('');

    try {
      const nextDb = await buildLiveIngredientsDb({
        companyId,
        companyIri,
        productsActions: productsStore.actions,
        productGroupProductActions: productGroupProductStore.actions,
        categoriesActions: categoriesStore.actions,
        ordersActions: ordersStore.actions,
        includePurchaseHistory: true,
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      setDb(nextDb);
      setSelectedId(currentSelected =>
        currentSelected && safeArray(nextDb.ingredients).some(item => String(item.id) === String(currentSelected))
          ? currentSelected
          : safeArray(nextDb.ingredients)[0]?.id || null,
      );
    } catch (error) {
      const message =
        error?.response?.data?.['hydra:description'] ||
        error?.response?.data?.detail ||
        error?.message ||
        'Falha ao carregar os ingredientes do ERP.';
      setDb(EMPTY_DB);
      setSelectedId(null);
      setLoadError(message);
      showError?.(message);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoadingDb(false);
      }
    }
  }, [
    categoriesStore.actions,
    currentCompany?.id,
    ordersStore.actions,
    productGroupProductStore.actions,
    productsStore.actions,
    showError,
  ]);

  useFocusEffect(
    useCallback(() => {
      setQuery('');
      setVisibleCount(MENU_COSTS_PAGE_SIZE);
      void loadLiveDb();
      return undefined;
    }, [loadLiveDb]),
  );

  useEffect(() => {
    if (!safeArray(db.ingredients).length) return;
    if (!selectedId || !safeArray(db.ingredients).some(item => String(item.id) === String(selectedId))) {
      setSelectedId(safeArray(db.ingredients)[0]?.id || null);
    }
  }, [db, selectedId]);

  const rows = useMemo(
    () => {
      const sourceIngredients = typeof filterIngredients === 'function'
        ? safeArray(filterIngredients(safeArray(db.ingredients), db))
        : safeArray(db.ingredients);

      return filterBySearch(sourceIngredients, query, [
        item => item.name,
        item => item.code,
        item => item.description,
        item => item.notes,
        item => item.supplier,
        item => categoryName(db, item.categoryId),
        item => item.sourceReference,
      ]).sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR'));
    },
    [db, filterIngredients, query],
  );

  const selected = useMemo(
    () => rows.find(item => String(item.id) === String(selectedId)) || rows[0] || null,
    [rows, selectedId],
  );

  useEffect(() => {
    const ingredientId = String(selected?.id || '').trim();
    if (!ingredientId || !currentCompany?.id) {
      setSelectedPurchaseRows([]);
      return undefined;
    }

    const cachedRows = purchaseCacheRef.current.get(ingredientId);
    if (cachedRows) {
      setSelectedPurchaseRows(cachedRows);
      return undefined;
    }

    const requestId = ++purchaseRequestIdRef.current;
    setSelectedPurchaseRows([]);

    const loadPurchaseHistory = async () => {
      try {
        const latestPurchasesByProductId = await fetchLatestPurchasesByProductIds({
          companyId: currentCompany.id,
          productIds: [ingredientId],
          limitPerProduct: 10,
          maxPages: 1,
        });

        if (requestId !== purchaseRequestIdRef.current) {
          return;
        }

        const rowsForIngredient = safeArray(latestPurchasesByProductId?.[ingredientId]);
        purchaseCacheRef.current.set(ingredientId, rowsForIngredient);
        setSelectedPurchaseRows(rowsForIngredient);
      } catch {
        if (requestId === purchaseRequestIdRef.current) {
          setSelectedPurchaseRows([]);
        }
      }
    };

    loadPurchaseHistory();
  }, [currentCompany?.id, selected?.id]);

  const visibleRows = useMemo(
    () => rows.slice(0, visibleCount),
    [rows, visibleCount],
  );

  const hasMoreRows = visibleCount < rows.length;

  const loadMoreRows = useCallback(() => {
    if (!hasMoreRows) return;
    setVisibleCount(current => Math.min(current + MENU_COSTS_PAGE_SIZE, rows.length));
  }, [hasMoreRows, rows.length]);

  const handleContentScroll = useCallback(event => {
    if (isLoadingDb || !hasMoreRows) return;

    const layoutHeight = event?.nativeEvent?.layoutMeasurement?.height || 0;
    const contentOffsetY = event?.nativeEvent?.contentOffset?.y || 0;
    const contentHeight = event?.nativeEvent?.contentSize?.height || 0;

    if (layoutHeight + contentOffsetY >= contentHeight - 360) {
      loadMoreRows();
    }
  }, [hasMoreRows, isLoadingDb, loadMoreRows]);

  const handleTabPress = useCallback(
    tab => {
      const { routeName, params } = resolveMenuCostsTabRoute(tab);

      if (routeName === 'MenuCostsIngredientsPage') {
        return;
      }

      navigation?.navigate?.(routeName, params || {});
    },
    [navigation],
  );

  const patchIngredientInDb = useCallback((ingredientId, patch) => {
    setDb(currentDb => ({
      ...currentDb,
      ingredients: safeArray(currentDb.ingredients).map(item =>
        String(item.id) === String(ingredientId)
          ? {
              ...item,
              ...patch,
              extraData: {
                ...(item.extraData || {}),
                ...(patch.extraData || {}),
              },
            }
          : item,
      ),
    }));
  }, []);

  const saveIngredientCost = useCallback(async (ingredient, patch) => {
    const productId = String(ingredient?.rawProduct?.id || ingredient?.id || '').replace(/\D+/g, '');
    if (!productId || !productsStore.actions?.save) {
      return;
    }

    const nextMode = patch.activeCostMode || ingredient.activeCostMode || 'manual';
    const nextManualCost =
      patch.manualUnitCost ?? ingredient.manualUnitCost ?? ingredient.fixedUnitCost ?? ingredient.overrideUnitCost ?? 0;
    const nextNote = patch.activeCostNote ?? ingredient.activeCostNote ?? '';
    const nextPurchaseItemId =
      patch.activePurchaseItemId || patch.selectedPurchaseItemId || ingredient.activePurchaseItemId || ingredient.selectedPurchaseItemId || '';
    const rawProduct = ingredient.rawProduct || {};
    const companyId = currentCompany?.id || rawProduct?.company?.id || rawProduct?.company;
    const nextExtraData = {
      ...(rawProduct.extraData || {}),
      ...(ingredient.extraData || {}),
      engineeringCost: {
        ...((rawProduct.extraData || {}).engineeringCost || {}),
        ...((ingredient.extraData || {}).engineeringCost || {}),
        mode: nextMode,
        manualUnitCost: nextMode === 'manual' ? nextManualCost : (patch.manualUnitCost ?? ingredient.manualUnitCost ?? null),
        purchaseItemId: nextPurchaseItemId,
        note: nextNote,
      },
    };

    setSavingCostId(ingredient.id);
    patchIngredientInDb(ingredient.id, {
      ...patch,
      activeCostMode: nextMode,
      manualUnitCost: nextMode === 'manual' ? nextManualCost : ingredient.manualUnitCost,
      activeCostNote: nextNote,
      activePurchaseItemId: nextPurchaseItemId,
      selectedPurchaseItemId: nextPurchaseItemId,
      evidenceType: nextMode === 'manual' ? 'manual' : (patch.evidenceType || ingredient.evidenceType),
      sourceType: nextMode === 'manual' ? 'manual' : (patch.sourceType || ingredient.sourceType),
      extraData: nextExtraData,
    });

    try {
      await productsStore.actions.save({
        id: productId,
        product: rawProduct.product || ingredient.product || ingredient.name,
        type: rawProduct.type || 'feedstock',
        price: nextMode === 'manual' ? nextManualCost : Number(rawProduct.price || ingredient.purchaseCost || 0),
        description: rawProduct.description || ingredient.description || '',
        sku: rawProduct.sku || ingredient.sku || ingredient.code || null,
        active: rawProduct.active !== false && ingredient.active !== false,
        company: companyId ? `/people/${String(companyId).replace(/\D+/g, '')}` : undefined,
        extraData: nextExtraData,
      });
      await loadLiveDb();
    } catch (error) {
      const message =
        error?.response?.data?.['hydra:description'] ||
        error?.response?.data?.detail ||
        error?.message ||
        'Falha ao salvar a fonte de custo do ingrediente.';
      showError?.(message);
      await loadLiveDb();
    } finally {
      setSavingCostId(null);
    }
  }, [
    currentCompany?.id,
    loadLiveDb,
    patchIngredientInDb,
    productsStore.actions,
    showError,
  ]);

  const handleManualCostCommit = useCallback((ingredient, value) => {
    if (!ingredient || value <= 0) {
      return;
    }

    void saveIngredientCost(ingredient, {
      activeCostMode: 'manual',
      manualUnitCost: value,
      evidenceType: 'manual',
      sourceType: 'manual',
    });
  }, [saveIngredientCost]);

  const handlePatchCost = useCallback((ingredient, patch) => {
    if (!ingredient) return;
    void saveIngredientCost(ingredient, patch);
  }, [saveIngredientCost]);

  const handleUsePurchase = useCallback((ingredient, row) => {
    const purchaseItemId = purchaseItemIdForRow(row, ingredient);
    if (!ingredient || !purchaseItemId) return;

    void saveIngredientCost(ingredient, {
      activeCostMode: 'selected',
      activePurchaseItemId: purchaseItemId,
      selectedPurchaseItemId: purchaseItemId,
      activeCostNote: `Compra #${row.orderId || ''}`,
      evidenceType: 'documented',
      sourceType: 'documented',
    });
  }, [saveIngredientCost]);

  const handleOpenEvidence = useCallback(ingredient => {
    navigation?.navigate?.('MenuCostsPurchasesPage', {
      productId: ingredient?.id,
      productName: ingredient?.name,
    });
  }, [navigation]);

  const duplicateCount = rows.reduce(
    (sum, item) => sum + Math.max(0, Number(item.duplicateCount || 1) - 1),
    0,
  );
  const reviewCount = rows.filter(item => ['review', 'estimated', 'manual'].includes(item.evidenceType || item.sourceType)).length;
  const documentedCount = rows.filter(item => (item.evidenceType || item.sourceType) === 'documented').length;

  const selectedWarnings = selected
    ? [
        selected.duplicateCount > 1
          ? `Este item consolida ${selected.duplicateCount} registros com o mesmo código ou nome.`
          : '',
        (selected.evidenceType || selected.sourceType) === 'review'
          ? 'Ainda não existe compra vinculada recente para este item.'
          : '',
        !selected.purchaseCost ? 'Sem custo de compra carregado.' : '',
      ].filter(Boolean)
    : [];

  const shouldShowIngredientTable = rows.length > 0 || isLoadingDb;
  const content = loadError ? (
    <View style={styles.emptyState}>
      <Icon name="alert-circle" size={24} color={MENU_COLORS.muted} />
      <Text style={styles.emptyStateText}>{loadError}</Text>
    </View>
  ) : !shouldShowIngredientTable ? (
    <EmptyState text="Nenhum ingrediente encontrado no ERP." />
  ) : (
    <View style={styles.splitLayout}>
      <View style={[styles.resourceTablePanel, styles.ingredientsTablePanel]}>
        <View style={styles.activeCostHeader}>
          <View>
            <Text style={styles.panelTitle}>
              {RESOURCE_META.ingredients?.plural || 'Ingredientes'}
            </Text>
            <Text style={styles.panelSubtitle}>
              Itens comprados ou controlados como insumo de estoque e custo.
            </Text>
          </View>
          <Badge>{rows.length} item(ns)</Badge>
        </View>
        <View style={styles.badgeLine}>
          <Badge tone="good">{documentedCount} comprovado(s)</Badge>
          <Badge tone={reviewCount ? 'warn' : 'good'}>{reviewCount} para revisar</Badge>
          <Badge tone={duplicateCount ? 'warn' : 'good'}>{duplicateCount} duplicidade(s)</Badge>
        </View>
        <IngredientsCostTable
          db={db}
          rows={visibleRows}
          selectedId={selected?.id}
          savingCostId={savingCostId}
          expandAllByDefault={Boolean(String(query || '').trim())}
          includeEmptyOperationalGroups={isLoadingDb && !visibleRows.length}
          emptyOperationalGroups={emptyOperationalGroups}
          resolveOperationalGroup={resolveOperationalGroup}
          onSelect={setSelectedId}
          onManualCostCommit={handleManualCostCommit}
          onOpenEvidence={handleOpenEvidence}
        />
        {isLoadingDb && !visibleRows.length ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="small" color={MENU_COLORS.brand} />
            <Text style={styles.emptyStateText}>Carregando ingredientes do ERP...</Text>
          </View>
        ) : hasMoreRows ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="small" color={MENU_COLORS.brand} />
            <Text style={styles.emptyStateText}>Carregando mais ingredientes...</Text>
          </View>
        ) : null}
      </View>

      {selected ? (
        <DetailShell
          title={selected.name}
          subtitle={[selected.description || selected.notes, selected.supplier].filter(Boolean).join(' · ')}
          badges={[
            { label: RESOURCE_META.ingredients?.singular || 'Ingrediente', tone: 'neutral' },
            { label: categoryName(db, selected.categoryId), tone: 'neutral' },
            { label: evidenceLabel(selected.evidenceType || selected.sourceType), tone: (selected.evidenceType || selected.sourceType) === 'documented' ? 'good' : 'warn' },
            selected.duplicateCount > 1
              ? { label: `Consolidado x${selected.duplicateCount}`, tone: 'warn' }
              : { label: selected.code || selected.id, tone: 'neutral' },
          ]}
        >
          <CostSourcePanel
            db={db}
            item={selected}
            purchaseRows={selectedPurchaseRows}
            saving={String(savingCostId || '') === String(selected.id)}
            onPatchCost={handlePatchCost}
            onUsePurchase={handleUsePurchase}
            onOpenEvidence={handleOpenEvidence}
          />

          {selectedWarnings.length ? (
            <View style={styles.panelNested}>
              <Text style={styles.panelTitle}>Atenção</Text>
              {selectedWarnings.map(message => (
                <Text key={message} style={styles.infoHelper}>{message}</Text>
              ))}
            </View>
          ) : null}
        </DetailShell>
      ) : (
        <EmptyState text="Selecione um ingrediente para ver a fonte de custo." />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={styles.page}>
        <View style={styles.toolbar}>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>Custos do cardápio</Text>
            <Text style={styles.pageTitle}>Engenharia de Produtos e Processos</Text>
          </View>
          <View style={styles.toolbarActions} />
        </View>

        <View style={[styles.body, !isWide && styles.bodyCompact]}>
          <View style={[styles.sidebar, !isWide && styles.sidebarCompact]}>
            <ScrollView horizontal={!isWide} showsHorizontalScrollIndicator={false}>
              <View style={[styles.menuList, !isWide && styles.menuListHorizontal]}>
                {MAIN_TABS.map(tab => (
                  <IconButton
                    key={tab.key}
                    icon={tab.icon}
                    label={tab.label}
                    active={tab.key === 'ingredients'}
                    onPress={() => handleTabPress(tab.key)}
                    disabled={tab.key === 'ingredients'}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.content}>
            <View style={styles.sectionTop}>
              <View>
                <Text style={styles.sectionEyebrow}>Ingredientes</Text>
                <Text style={styles.sectionTitle}>{resolveSectionTitle()}</Text>
              </View>
              <SearchBox
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar ingrediente, fornecedor ou código"
              />
            </View>

            <ScrollView
              style={styles.contentScroll}
              contentContainerStyle={styles.contentScrollBody}
              onScroll={handleContentScroll}
              scrollEventThrottle={200}
            >
              {content}
            </ScrollView>
          </View>
        </View>
      </View>
      <StateStore stores={['people', 'products', 'product_group_product', 'orders', 'categories']} />
    </SafeAreaView>
  );
}
