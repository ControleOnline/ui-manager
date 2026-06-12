/* eslint-disable no-unused-vars */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  PanResponder,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import styles, { MENU_COLORS } from './index.styles';
import {
  resolveMenuCostsInitialSection,
  resolveMenuCostsTabRoute,
} from './navigation';
import {
  PRODUCT_DETAIL_TABS,
  RESOURCE_META,
  COST_ENGINE_ROUNDING_OPTIONS,
  activeCostOptionsForRef,
  activeCostSummary,
  buildDashboardRadar,
  buildCostEngineOverview,
  buildCostEngineChannelPreview,
  buildErpCatalogCsv,
  buildErpExportPayload,
  buildExportPayload,
  categoryName,
  comparableCostLabel,
  componentCost,
  computeAllProducts,
  computeEngineeringProducts,
  computeProduct,
  decimal,
  defaultMarkupPct,
  evidenceLabel,
  filterBySearch,
  formatDate,
  getById,
  groupBy,
  ingredientUnitCost,
  inputTypeLabel,
  linkedInputsForOrder,
  money,
  num,
  packagingUnitCost,
  paymentLabel,
  pendingItems,
  percent,
  preciseMoney,
  processRows,
  productPurchaseRows,
  productUsesForResource,
  buildSupplySyncRows,
  purchaseFamilyEntries,
  purchaseItemsForResource,
  recipeBatchCost,
  recipeUnitCost,
  resaleItems,
  resourceCollectionForRef,
  resourceName,
  resourceTypeLabel,
  safeArray,
  targetMarginPct,
  normalizeEntityId,
  normalizeCostEngineRules,
  validateImportedDb,
} from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/menuCostsShared';
import { fetchLatestPurchasesByProductIds } from '@controleonline/ui-products/src/react/domain/productCosting';
import {
  buildAddonsForProducts,
  buildLiveMenuCostsDb,
  buildRecipeComponentsByProductId,
  normalizeLiveProduct,
} from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/menuCostsLiveDb';
import {
  MENU_COSTS_PAGE_SIZE,
  fetchAllPagedItems,
} from '@controleonline/ui-products/src/react/domain/menuCostsPagination';
import { MAIN_TABS } from './tabs';
import {
  resolveCategoryCoverUrl,
  resolveEntityCoverUrl,
  resolveProductCoverUrl,
} from '@controleonline/ui-products/src/react/domain/productMedia';
import {
  buildPurchaseHistoryLoadedKey,
  buildPurchaseHistoryQuery,
  resolvePurchaseOrderDate,
  resolvePurchaseOrderLabel,
  resolvePurchaseSupplierLabel,
} from '@controleonline/ui-orders/src/react/utils/menuCostsPurchases';
import {
  buildCostEngineRulesCache,
  buildCostEngineRulesRequestConfig,
  isMethodNotAllowedError,
  resolveCostEngineRulesFromConfigs,
  resolveEffectiveConfigs,
  resolveErrorMessage,
  resolveMenuCostsSettingsFromConfigs,
} from '@controleonline/ui-manager/src/react/pages/MenuCostsParametersPage/viewModel';

const STORAGE_KEY = 'controleonline:menu-costs-page:engineering-live:v1';
const PRODUCT_CATEGORY_ORDER_STORAGE_KEY = 'controleonline:menu-costs-page:product-category-order:v1';
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

const applyOfficialMenuCostsSettings = (db, settings) => ({
  ...db,
  settings: {
    ...(db?.settings || {}),
    ...(settings || {}),
  },
});

const getSectionDefaultSelection = (db, tab) => {
  if (tab === 'products') return computeEngineeringProducts(db)[0]?.product?.id || null;
  if (tab === 'resale') return resaleItems(db)[0]?.id || null;
  if (tab === 'purchases') return safeArray(db.purchaseOrders)[0]?.id || null;
  if (tab === 'processes') return processRows(db)[0]?.key || null;
  if (tab === 'pending') return pendingItems(db)[0]?.id || null;
  return safeArray(db[tab])[0]?.id || null;
};

const resolveInitialProductTab = section =>
  section === 'products' ? 'composition' : 'summary';

const getToneStyle = tone => {
  if (tone === 'good') return styles.toneGood;
  if (tone === 'warn') return styles.toneWarn;
  if (tone === 'bad') return styles.toneBad;
  return styles.toneNeutral;
};

const Badge = ({ children, tone = 'neutral' }) => (
  <View style={[styles.badge, getToneStyle(tone)]}>
    <Text style={styles.badgeText}>{children}</Text>
  </View>
);

const IconButton = ({ icon, label, onPress, active, tone = 'neutral', disabled = false }) => (
  <TouchableOpacity
    style={[
      styles.iconButton,
      active && styles.iconButtonActive,
      tone === 'danger' && styles.iconButtonDanger,
      disabled && { opacity: 0.6 },
    ]}
    activeOpacity={disabled ? 1 : 0.82}
    onPress={disabled ? undefined : onPress}
    disabled={disabled}
  >
    <Icon name={icon} size={16} color={active ? MENU_COLORS.brandText : MENU_COLORS.muted} />
    {label ? <Text style={[styles.iconButtonText, active && styles.iconButtonTextActive]}>{label}</Text> : null}
  </TouchableOpacity>
);

const buildImageSource = url => (url ? { uri: url } : null);

const imageForProduct = (db, product) =>
  buildImageSource(
    resolveProductCoverUrl(product) ||
    resolveCategoryCoverUrl(getById(db, 'categories', product?.categoryId))
  );

const imageForResource = (db, refType, refId) => {
  const collection = resourceCollectionForRef(refType);
  const record = collection ? getById(db, collection, refId) : null;
  if (!record) return null;
  if (refType === 'product') return imageForProduct(db, record);
  return buildImageSource(resolveEntityCoverUrl(record));
};

const imageForAddon = (db, addon) => {
  const fromNode = safeArray(addon?.nodes)
    .map(node => imageForResource(db, node.refType, node.refId))
    .find(Boolean);
  return fromNode || null;
};

const ENGINEERING_UNCATEGORIZED_KEY = 'uncategorized';

const categorySortValue = category => {
  const rawOrder =
    category?.extraData?.sortOrder ??
    category?.sortOrder ??
    category?.groupOrder ??
    category?.order;
  const order = Number.parseInt(String(rawOrder ?? ''), 10);
  return Number.isFinite(order) ? order : 9999;
};

const buildEngineeringMenuCategoryRows = (db, products) => {
  const productRows = safeArray(products);
  const productsByCategoryId = productRows.reduce((map, item) => {
    const categoryId = normalizeEntityId(item?.product?.categoryId) || ENGINEERING_UNCATEGORIZED_KEY;
    if (!map.has(categoryId)) map.set(categoryId, []);
    map.get(categoryId).push(item);
    return map;
  }, new Map());

  const categories = safeArray(db?.categories)
    .filter(category => {
      const context = String(category?.context || 'products').trim().toLowerCase();
      return category?.active !== false && context === 'products';
    })
    .map(category => {
      const id = normalizeEntityId(category) || String(category?.name || category?.category || '');
      return {
        key: id,
        category,
        title: category?.name || category?.category || 'Categoria',
        order: categorySortValue(category),
        products: safeArray(productsByCategoryId.get(id)),
      };
    })
    .filter(row => row.key);

  const knownCategoryIds = new Set(categories.map(row => row.key));
  const uncategorizedProducts = [
    ...safeArray(productsByCategoryId.get(ENGINEERING_UNCATEGORIZED_KEY)),
    ...Array.from(productsByCategoryId.entries())
      .filter(([categoryId]) => categoryId !== ENGINEERING_UNCATEGORIZED_KEY && !knownCategoryIds.has(categoryId))
      .flatMap(([, rows]) => rows),
  ];

  if (uncategorizedProducts.length) {
    categories.push({
      key: ENGINEERING_UNCATEGORIZED_KEY,
      category: null,
      title: 'Sem categoria',
      order: 10000,
      products: uncategorizedProducts,
    });
  }

  return categories.sort((left, right) =>
    left.order - right.order ||
    String(left.title || '').localeCompare(String(right.title || ''), 'pt-BR')
  );
};

const applyLocalCategoryOrder = (rows, orderKeys) => {
  const orderMap = new Map(safeArray(orderKeys).map((key, index) => [String(key), index]));
  return [...safeArray(rows)].sort((left, right) => {
    const leftIndex = orderMap.has(String(left.key)) ? orderMap.get(String(left.key)) : 9999;
    const rightIndex = orderMap.has(String(right.key)) ? orderMap.get(String(right.key)) : 9999;
    return leftIndex - rightIndex || left.order - right.order || String(left.title).localeCompare(String(right.title), 'pt-BR');
  });
};

const VisualThumb = ({ source, label, size = 'md' }) => (
  <View style={[styles.visualThumb, size === 'lg' && styles.visualThumbLarge, size === 'sm' && styles.visualThumbSmall]}>
    {source ? (
      <Image source={source} style={styles.visualImage} resizeMode="cover" />
    ) : (
      <Text style={styles.visualInitial}>{String(label || 'GY').slice(0, 2).toUpperCase()}</Text>
    )}
  </View>
);

const MetricCard = ({ label, value, tone, helper }) => (
  <View style={styles.metricCard}>
    <Text style={[styles.metricValue, tone === 'warn' && styles.metricValueWarn, tone === 'good' && styles.metricValueGood, tone === 'bad' && styles.metricValueBad]}>
      {value}
    </Text>
    <Text style={styles.metricLabel}>{label}</Text>
    {helper ? <Text style={styles.metricHelper}>{helper}</Text> : null}
  </View>
);

const QuickAction = ({ icon, title, subtitle, onPress, tone = 'neutral' }) => (
  <TouchableOpacity
    style={[styles.quickAction, tone === 'primary' && styles.quickActionPrimary]}
    activeOpacity={0.82}
    onPress={onPress}
  >
    <View style={styles.quickActionIcon}>
      <Icon name={icon} size={17} color={MENU_COLORS.brandText} />
    </View>
    <View style={styles.quickActionText}>
      <Text style={[styles.quickActionTitle, tone === 'primary' && styles.quickActionTitlePrimary]}>{title}</Text>
      {subtitle ? <Text style={[styles.quickActionSubtitle, tone === 'primary' && styles.quickActionSubtitlePrimary]}>{subtitle}</Text> : null}
    </View>
  </TouchableOpacity>
);

const CountTile = ({ label, value, icon }) => (
  <View style={styles.countTile}>
    <Icon name={icon} size={16} color={MENU_COLORS.brandStrong} />
    <View>
      <Text style={styles.countValue}>{value}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  </View>
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

const EmptyState = ({ text = 'Nenhum registro encontrado.' }) => (
  <View style={styles.emptyState}>
    <Icon name="inbox" size={24} color={MENU_COLORS.muted} />
    <Text style={styles.emptyStateText}>{text}</Text>
  </View>
);

const Field = ({ label, value, inputProps, onChangeText, multiline }) => (
  <View style={[styles.modalField, multiline && styles.modalFieldWide]}>
    <Text style={styles.modalLabel}>{label}</Text>
    <TextInput
      value={String(value ?? '')}
      onChangeText={onChangeText}
      style={[styles.modalInput, multiline && styles.modalTextarea]}
      multiline={multiline}
      placeholderTextColor={MENU_COLORS.muted}
      {...inputProps}
    />
  </View>
);

const QuantityField = ({ value, unit, onChangeText, onCommitText, compact }) => {
  const [draft, setDraft] = useState(String(value ?? ''));
  const lastCommittedRef = useRef(String(value ?? ''));

  useEffect(() => {
    const nextValue = String(value ?? '');
    setDraft(nextValue);
  }, [value]);

  const commit = useCallback(() => {
    if (lastCommittedRef.current === draft) return;
    lastCommittedRef.current = draft;
    onCommitText?.(draft);
  }, [draft, onCommitText]);

  return (
    <View style={[styles.quantityField, compact && styles.quantityFieldCompact]}>
      <TextInput
        value={draft}
        onChangeText={nextValue => {
          setDraft(nextValue);
          onChangeText?.(nextValue);
        }}
        onBlur={commit}
        onEndEditing={commit}
        onSubmitEditing={commit}
        keyboardType="numeric"
        style={styles.quantityInput}
        placeholderTextColor={MENU_COLORS.muted}
      />
      <Text style={styles.quantityUnit}>{unit}</Text>
    </View>
  );
};

const RowCard = ({ title, subtitle, meta, selected, onPress, right, badges, imageSource }) => (
  <TouchableOpacity style={[styles.rowCard, selected && styles.rowCardActive]} activeOpacity={0.84} onPress={onPress}>
    {imageSource ? <VisualThumb source={imageSource} label={title} size="sm" /> : null}
    <View style={styles.rowContent}>
      <Text style={styles.rowTitle} numberOfLines={2}>{title}</Text>
      {subtitle ? <Text style={styles.rowSubtitle} numberOfLines={2}>{subtitle}</Text> : null}
      {badges?.length ? <View style={styles.badgeLine}>{badges.map(badge => <Badge key={badge.label} tone={badge.tone}>{badge.label}</Badge>)}</View> : null}
      {meta ? <Text style={styles.rowMeta} numberOfLines={2}>{meta}</Text> : null}
    </View>
    {right ? <View style={styles.rowRight}>{right}</View> : null}
  </TouchableOpacity>
);

const DetailShell = ({ title, subtitle, badges, actions, children }) => (
  <View style={styles.detailPanel}>
    <View style={styles.detailHeader}>
      <View style={styles.detailHeaderText}>
        <View style={styles.badgeLine}>{safeArray(badges).map(badge => <Badge key={badge.label} tone={badge.tone}>{badge.label}</Badge>)}</View>
        <Text style={styles.detailTitle}>{title}</Text>
        {subtitle ? <Text style={styles.detailSubtitle}>{subtitle}</Text> : null}
      </View>
      {actions ? <View style={styles.detailActions}>{actions}</View> : null}
    </View>
    {children}
  </View>
);

const InfoGrid = ({ rows }) => (
  <View style={styles.infoGrid}>
    {safeArray(rows).map(row => (
      <View key={`${row.label}-${row.value}`} style={styles.infoCell}>
        <Text style={styles.infoLabel}>{row.label}</Text>
        <Text style={styles.infoValue} numberOfLines={2}>{row.value}</Text>
        {row.helper ? <Text style={styles.infoHelper} numberOfLines={3}>{row.helper}</Text> : null}
      </View>
    ))}
  </View>
);

const evidenceTone = value => {
  const normalized = String(value || '').toLowerCase();
  if (['documented', 'selected', 'latest', 'calculated'].includes(normalized)) return 'good';
  if (['manual', 'average'].includes(normalized)) return 'warn';
  if (['review', 'estimated'].includes(normalized)) return 'bad';
  return 'neutral';
};

const activeCostAudit = (db, refType, record = {}) => {
  const summary = activeCostSummary(db, refType, record);
  const selected = summary.selected || null;
  const latest = summary.latest || null;
  const evidence = selected || latest;
  const mode = summary.mode;
  const label =
    mode === 'selected' && selected
      ? 'Compra escolhida'
      : mode === 'latest' && latest
        ? 'Comprovado'
        : mode === 'average' && summary.purchaseCount
          ? 'Média de compras'
          : mode === 'manual'
            ? 'Manual'
            : evidenceLabel(record.evidenceType || record.sourceType);
  const linkLabel = evidence
    ? `${formatDate(evidence.date)} · ${evidence.supplierName || evidence.orderLabel || evidence.evidenceSource || evidence.id}`
    : mode === 'manual'
      ? 'Valor manual'
      : summary.purchaseCount
        ? `${summary.purchaseCount} evidência(s)`
        : 'Sem evidência';

  return {
    label,
    tone: evidenceTone(mode === 'selected' || mode === 'latest' ? 'documented' : mode),
    linkLabel,
    evidence,
    summary,
  };
};

const recipeComponentAuditRows = (db, recipe) =>
  safeArray(recipe?.components).map(component => {
    const record = getById(db, resourceCollectionForRef(component.refType), component.refId);
    const audit = record ? activeCostAudit(db, component.refType, record) : null;
    return {
      component,
      record,
      audit,
      name: resourceName(db, component.refType, component.refId),
      cost: componentCost(db, component),
    };
  });

const recipeAuditSummary = (db, recipe) => {
  const rows = recipeComponentAuditRows(db, recipe);
  if (!rows.length) {
    return {
      label: 'Revisar',
      tone: 'warn',
      linkLabel: 'Sem ficha técnica',
      source: 'Nenhum componente vinculado',
      missingCount: 1,
      manualCount: 0,
      documentedCount: 0,
    };
  }

  const missingCount = rows.filter(row => !row.record || !row.audit?.summary?.activePrimaryCost).length;
  const manualCount = rows.filter(row => row.audit?.summary?.mode === 'manual').length;
  const documentedCount = rows.filter(row => ['selected', 'latest'].includes(row.audit?.summary?.mode)).length;
  const selectedEvidence = rows.find(row => row.audit?.evidence)?.audit?.evidence;

  if (missingCount) {
    return {
      label: 'Revisar custos',
      tone: 'warn',
      linkLabel: `${missingCount} item(ns) sem custo`,
      source: `${rows.length} componente(s) · ${missingCount} pendência(s)`,
      missingCount,
      manualCount,
      documentedCount,
    };
  }

  return {
    label: manualCount ? 'Receita calculada / manual' : 'Receita calculada',
    tone: manualCount ? 'warn' : 'good',
    linkLabel: selectedEvidence
      ? `${formatDate(selectedEvidence.date)} · ${selectedEvidence.supplierName || selectedEvidence.orderLabel || selectedEvidence.id}`
      : `${rows.length} custo(s) herdado(s)`,
    source: `${rows.length} componente(s) · ${documentedCount} comprovado(s) · ${manualCount} manual(is)`,
    missingCount,
    manualCount,
    documentedCount,
  };
};

const ComponentNode = ({ db, node, depth = 0, onQtyChange, onQtyCommit }) => {
  const costSummary = node.record && ['ingredient', 'recipe', 'packaging'].includes(node.refType)
    ? activeCostSummary(db, node.refType, node.record)
    : null;
  const baseCostLabel = costSummary
    ? `${money(costSummary.activePrimaryCost)} / ${costSummary.primaryUnit}`
    : money(node.cost);
  const readingLabel = costSummary
    ? `${preciseMoney(costSummary.activeBaseCost)} / ${costSummary.baseUnit}`
    : node.unit || 'UN';

  return (
  <View style={[styles.nodeCard, depth > 0 && styles.nodeCardChild]}>
    <View style={styles.nodeHeader}>
      <VisualThumb source={imageForResource(db, node.refType, node.refId)} label={node.name} size="sm" />
      <View style={styles.nodeTitleWrap}>
        <Text style={styles.nodeTitle}>{node.name}</Text>
        <Text style={styles.nodeMeta}>
          {resourceTypeLabel(node.refType)} · {decimal(node.qty, 3)} {node.unit} · {node.pricingMode}
        </Text>
      </View>
      <Text style={styles.nodeCost}>{money(node.cost)}</Text>
    </View>
    {onQtyChange ? (
      <View style={styles.componentCostGrid}>
        <View style={styles.componentCostCell}>
          <Text style={styles.infoLabel}>Quantidade na ficha</Text>
          <QuantityField
            value={node.qty}
            unit={node.unit}
            onChangeText={value => onQtyChange(value)}
            onCommitText={value => onQtyCommit?.(value)}
          />
        </View>
        <View style={styles.componentCostCell}>
          <Text style={styles.infoLabel}>Custo-base</Text>
          <Text style={styles.infoValue}>{baseCostLabel}</Text>
          {costSummary?.source ? <Text style={styles.infoHelper} numberOfLines={2}>{costSummary.source}</Text> : null}
        </View>
        <View style={styles.componentCostCell}>
          <Text style={styles.infoLabel}>Base do cálculo</Text>
          <Text style={styles.infoValue}>{readingLabel}</Text>
          <Text style={styles.infoHelper}>{node.pricingMode}</Text>
        </View>
        <View style={styles.componentCostCell}>
          <Text style={styles.infoLabel}>Custo desta quantidade</Text>
          <Text style={styles.infoValue}>{money(node.cost)}</Text>
        </View>
      </View>
    ) : null}
    {safeArray(node.children).length ? (
      <View style={styles.nodeChildren}>
        {node.children.map(child => <ComponentNode key={child.key} db={db} node={child} depth={depth + 1} />)}
      </View>
    ) : null}
  </View>
  );
};

const AddonCostCells = ({ db, node }) => {
  const costSummary = node.record && ['ingredient', 'recipe', 'packaging'].includes(node.refType)
    ? activeCostSummary(db, node.refType, node.record)
    : null;
  const baseCostLabel = costSummary
    ? `${money(costSummary.activePrimaryCost)} / ${costSummary.primaryUnit}`
    : money(node.cost);
  const readingLabel = costSummary
    ? `${preciseMoney(costSummary.activeBaseCost)} / ${costSummary.baseUnit}`
    : node.unit || 'UN';

  return (
    <>
      <View style={styles.componentCostCell}>
        <Text style={styles.infoLabel}>Custo-base</Text>
        <Text style={styles.infoValue}>{baseCostLabel}</Text>
        {costSummary?.source ? <Text style={styles.infoHelper} numberOfLines={2}>{costSummary.source}</Text> : null}
      </View>
      <View style={styles.componentCostCell}>
        <Text style={styles.infoLabel}>Base do cálculo</Text>
        <Text style={styles.infoValue}>{readingLabel}</Text>
        <Text style={styles.infoHelper}>{node.pricingMode}</Text>
      </View>
      <View style={styles.componentCostCell}>
        <Text style={styles.infoLabel}>Custo desta quantidade</Text>
        <Text style={styles.infoValue}>{money(node.cost)}</Text>
      </View>
    </>
  );
};

export default function MenuCostsPage({ navigation, route }) {
  const messageApi = useMessage() || {};
  const { showError, showSuccess } = messageApi;
  const peopleStore = useStore('people');
  const ordersStore = useStore('orders');
  const productsStore = useStore('products');
  const productGroupProductStore = useStore('product_group_product');
  const productGroupStore = useStore('product_group');
  const categoriesStore = useStore('categories');
  const configsStore = useStore('configs');
  const { currentCompany } = peopleStore.getters || {};
  const ordersActions = ordersStore.actions || {};
  const configActions = configsStore.actions || {};
  const { width } = useWindowDimensions();
  const isWide = width >= 1060;
  const routeSection = route?.params?.section;
  const initialSection = resolveMenuCostsInitialSection(route);
  const loadRequestRef = useRef(0);
  const dashboardPurchasesLoadKeyRef = useRef('');
  const [db, setDb] = useState(() => EMPTY_DB);
  const [activeTab, setActiveTab] = useState(initialSection);
  const [activeProductTab, setActiveProductTab] = useState(
    resolveInitialProductTab(initialSection),
  );
  const [dashboardPurchases, setDashboardPurchases] = useState([]);
  const [dashboardPurchasesLoading, setDashboardPurchasesLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(null);
  const effectiveConfigs = useMemo(
    () => resolveEffectiveConfigs(configsStore.getters?.items, currentCompany?.configs),
    [configsStore.getters?.items, currentCompany?.configs],
  );

  const loadLiveDb = useCallback(async () => {
    const companyId = currentCompany?.id;
    const companyIri = companyId ? `/people/${companyId}` : '';
    const requestId = ++loadRequestRef.current;

    if (!companyId) {
      setDb(EMPTY_DB);
      setSelectedId(null);
      return;
    }

    try {
      const liveDb = await buildLiveMenuCostsDb({
        companyId,
        companyIri,
        peopleActions: peopleStore.actions,
        productsActions: productsStore.actions,
        productGroupProductActions: productGroupProductStore.actions,
        productGroupActions: productGroupStore.actions,
        categoriesActions: categoriesStore.actions,
        includePurchaseHistory: false,
      });

      if (requestId !== loadRequestRef.current) return;

      const validatedDb = validateImportedDb(liveDb);
      const nextDb = applyOfficialMenuCostsSettings(
        validatedDb,
        resolveMenuCostsSettingsFromConfigs(effectiveConfigs, validatedDb.settings),
      );
      setDb(nextDb);
      setSelectedId(getSectionDefaultSelection(nextDb, resolveMenuCostsInitialSection(route)));
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextDb)).catch(() => null);
    } catch (error) {
      const cachedValue = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
      if (cachedValue) {
        try {
          const validatedCachedDb = validateImportedDb(JSON.parse(cachedValue));
          const cachedDb = applyOfficialMenuCostsSettings(
            validatedCachedDb,
            resolveMenuCostsSettingsFromConfigs(effectiveConfigs, validatedCachedDb.settings),
          );
          if (requestId !== loadRequestRef.current) return;
          setDb(cachedDb);
          setSelectedId(getSectionDefaultSelection(cachedDb, resolveMenuCostsInitialSection(route)));
          return;
        } catch (cacheError) {
          // ignore cached fallback parse issues and surface the live error below
        }
      }
      const message =
        error?.response?.data?.['hydra:description'] ||
        error?.response?.data?.detail ||
        error?.message ||
        'Não foi possível ler os dados da Engenharia no ERP.';
      if (requestId === loadRequestRef.current) {
        setDb(EMPTY_DB);
        setSelectedId(null);
      }
      showError?.(message);
    }
  }, [
    categoriesStore.actions,
    currentCompany?.id,
    peopleStore.actions,
    productGroupStore.actions,
    productGroupProductStore.actions,
    productsStore.actions,
    route,
    showError,
    effectiveConfigs,
  ]);

  useFocusEffect(
    useCallback(() => {
      loadLiveDb();
      return undefined;
    }, [loadLiveDb]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!currentCompany?.id || typeof configActions.discoveryMainConfigs !== 'function') {
        return undefined;
      }

      let alive = true;
      configActions
        .discoveryMainConfigs({ people: `/people/${currentCompany.id}` })
        .catch(error => {
          if (alive) {
            showError?.(resolveErrorMessage(error));
          }
        });

      return () => {
        alive = false;
      };
    }, [configActions, currentCompany?.id, showError]),
  );

  useEffect(() => {
    setDb(currentDb => applyOfficialMenuCostsSettings(
      currentDb,
      resolveMenuCostsSettingsFromConfigs(effectiveConfigs, currentDb.settings),
    ));
  }, [effectiveConfigs]);

  const loadDashboardPurchases = useCallback(async ({ force = false } = {}) => {
    const companyId = currentCompany?.id;
    if (!companyId || typeof ordersActions.fetchHistoryPage !== 'function') {
      setDashboardPurchases([]);
      return;
    }

    const loadedKey = buildPurchaseHistoryLoadedKey({
      companyId,
      searchText: '',
      orderField: 'id',
      orderDirection: 'desc',
    });

    if (!force && dashboardPurchasesLoadKeyRef.current === loadedKey) {
      return;
    }

    const queryParams = buildPurchaseHistoryQuery({
      companyId,
      searchText: '',
      page: 1,
      orderField: 'id',
      orderDirection: 'desc',
    });

    if (!queryParams) {
      setDashboardPurchases([]);
      return;
    }

    dashboardPurchasesLoadKeyRef.current = loadedKey;
    setDashboardPurchasesLoading(true);

    try {
      const response = await ordersActions.fetchHistoryPage({
        query: queryParams,
        append: false,
        loadedKey,
      });

      setDashboardPurchases(safeArray(response?.items).slice(0, 8));
    } catch (error) {
      setDashboardPurchases([]);
      const message =
        error?.response?.data?.['hydra:description'] ||
        error?.response?.data?.detail ||
        error?.message ||
        'Não foi possível ler as últimas compras do dashboard.';
      showError?.(message);
    } finally {
      setDashboardPurchasesLoading(false);
    }
  }, [currentCompany?.id, ordersActions, showError]);

  useEffect(() => {
    if (activeTab !== 'dashboard') {
      return undefined;
    }

    void loadDashboardPurchases();
    return undefined;
  }, [activeTab, currentCompany?.id, loadDashboardPurchases]);

  const persistDb = useCallback(async nextDb => {
    setDb(nextDb);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextDb));
    } catch {
      showError?.('Não foi possível salvar os dados locais desta tela.');
    }
  }, [showError]);

  useEffect(() => {
    const nextSection = resolveMenuCostsInitialSection(route);
    setActiveTab(nextSection);
    setActiveProductTab(resolveInitialProductTab(nextSection));
    setSelectedId(getSectionDefaultSelection(db, nextSection));
  }, [routeSection]);

  const switchTab = useCallback(tab => {
    const { routeName, params } = resolveMenuCostsTabRoute(tab);

    if (routeName !== 'MenuCostsPage' && navigation?.navigate) {
      navigation.navigate(routeName, params || {});
      return;
    }

    setActiveTab(tab);
    setActiveProductTab(resolveInitialProductTab(tab));
    setQuery('');
    setSelectedId(getSectionDefaultSelection(db, tab));
  }, [db, navigation]);

  const patchCollectionItem = useCallback((collection, id, patch) => {
    const nextDb = {
      ...db,
      [collection]: safeArray(db[collection]).map(item =>
        String(item.id) === String(id) ? { ...item, ...patch } : item
      ),
    };
    persistDb(nextDb);
    showSuccess?.('Registro atualizado nesta tela.');
  }, [db, persistDb, showSuccess]);

  const resetLocalData = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await loadLiveDb();
    showSuccess?.('Base local recarregada a partir do ERP.');
  }, [loadLiveDb, showSuccess]);

  const patchProductComponent = useCallback((productId, componentIndex, patch) => {
    const nextDb = {
      ...db,
      products: safeArray(db.products).map(product => {
        if (String(product.id) !== String(productId)) return product;
        return {
          ...product,
          components: safeArray(product.components).map((component, index) =>
            index === componentIndex ? { ...component, ...patch } : component
          ),
        };
      }),
    };
    persistDb(nextDb);
  }, [db, persistDb]);

  const saveProductComponentQuantity = useCallback(async (productId, componentIndex, node, quantity) => {
    const relationId = normalizeEntityId(node?.relationId);
    if (!relationId) {
      return;
    }

    const product = safeArray(db.products).find(item => String(item.id) === String(productId));
    const component = safeArray(product?.components)[componentIndex] || {};
    const nextQuantity = num(quantity) || 0;

    if (nextQuantity <= 0) {
      showError?.('Informe uma quantidade maior que zero para esta ficha.');
      loadLiveDb();
      return;
    }

    try {
      const productType = node?.productType || component.productType || (node?.refType === 'packaging' ? 'package' : 'feedstock');
      const productIri = node?.productIri || component.productIri || '';
      await productGroupProductStore.actions.save({
        id: relationId,
        ...(productType === 'feedstock' && productIri ? { product: productIri } : {}),
        ...(productType !== 'feedstock' ? { product: null } : {}),
        ...(node?.productGroupIri || component.productGroupIri ? { productGroup: node.productGroupIri || component.productGroupIri } : {}),
        ...(node?.productChildIri || component.productChildIri ? { productChild: node.productChildIri || component.productChildIri } : {}),
        productType,
        price: num(node?.price ?? component.price),
        quantity: nextQuantity,
        active: node?.active ?? component.active ?? true,
      });
      showSuccess?.('Quantidade da ficha atualizada no ERP.');
    } catch (error) {
      const message =
        error?.response?.data?.['hydra:description'] ||
        error?.response?.data?.detail ||
        error?.message ||
        'Não foi possível salvar a quantidade desta ficha no ERP.';
      showError?.(message);
      loadLiveDb();
    }
  }, [db.products, loadLiveDb, productGroupProductStore.actions, showError, showSuccess]);

  const patchProductAddonComponent = useCallback((productId, addonId, componentIndex, patch) => {
    const nextDb = {
      ...db,
      products: safeArray(db.products).map(product => {
        if (String(product.id) !== String(productId)) return product;
        return {
          ...product,
          addons: safeArray(product.addons).map(addon => {
            if (String(addon.id) !== String(addonId)) return addon;
            return {
              ...addon,
              components: safeArray(addon.components).map((component, index) =>
                index === componentIndex ? { ...component, ...patch } : component
              ),
            };
          }),
        };
      }),
    };
    persistDb(nextDb);
  }, [db, persistDb]);

  const patchRecipeComponent = useCallback((recipeId, componentIndex, patch) => {
    const nextDb = {
      ...db,
      recipes: safeArray(db.recipes).map(recipe => {
        if (String(recipe.id) !== String(recipeId)) return recipe;
        return {
          ...recipe,
          components: safeArray(recipe.components).map((component, index) =>
            index === componentIndex ? { ...component, ...patch } : component
          ),
        };
      }),
    };
    persistDb(nextDb);
  }, [db, persistDb]);

  const saveRecipeComponentQuantity = useCallback(async (recipeId, componentIndex, node, quantity) => {
    const relationId = normalizeEntityId(node?.relationId);
    if (!relationId) {
      return;
    }

    const recipe = safeArray(db.recipes).find(item => String(item.id) === String(recipeId));
    const component = safeArray(recipe?.components)[componentIndex] || {};
    const nextQuantity = num(quantity) || 0;

    if (nextQuantity <= 0) {
      showError?.('Informe uma quantidade maior que zero para a receita.');
      loadLiveDb();
      return;
    }

    try {
      const productType = node?.productType || component.productType || 'feedstock';
      const productIri = node?.productIri || component.productIri || '';
      await productGroupProductStore.actions.save({
        id: relationId,
        ...(productIri ? { product: productIri } : {}),
        ...(node?.productGroupIri || component.productGroupIri ? { productGroup: node.productGroupIri || component.productGroupIri } : {}),
        ...(node?.productChildIri || component.productChildIri ? { productChild: node.productChildIri || component.productChildIri } : {}),
        productType,
        price: num(node?.price ?? component.price),
        quantity: nextQuantity,
        active: node?.active ?? component.active ?? true,
      });
      showSuccess?.('Quantidade da receita atualizada no ERP.');
    } catch (error) {
      const message =
        error?.response?.data?.['hydra:description'] ||
        error?.response?.data?.detail ||
        error?.message ||
        'Não foi possível salvar a quantidade desta receita no ERP.';
      showError?.(message);
      loadLiveDb();
    }
  }, [db.recipes, loadLiveDb, productGroupProductStore.actions, showError, showSuccess]);

  const patchActiveCost = useCallback((collection, id, patch) => {
    const nextDb = {
      ...db,
      [collection]: safeArray(db[collection]).map(item =>
        String(item.id) === String(id) ? { ...item, ...patch } : item
      ),
    };
    persistDb(nextDb);
  }, [db, persistDb]);

  const downloadTextFile = useCallback((content, filename, type) => {
    if (typeof document === 'undefined') {
      showSuccess?.('Exportação preparada para ambiente web.');
      return;
    }
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }, [showSuccess]);

  const exportJson = useCallback(() => {
    downloadTextFile(
      JSON.stringify(buildExportPayload(db), null, 2),
      'gyros-custos-cardapio-erp.json',
      'application/json'
    );
  }, [db, downloadTextFile]);

  const exportErpJson = useCallback(() => {
    downloadTextFile(
      JSON.stringify(buildErpExportPayload(db), null, 2),
      'gyros-engenharia-export-erp.json',
      'application/json'
    );
  }, [db, downloadTextFile]);

  const exportErpCsv = useCallback(() => {
    downloadTextFile(
      buildErpCatalogCsv(db),
      'gyros-catalogo-erp.csv',
      'text/csv;charset=utf-8'
    );
  }, [db, downloadTextFile]);

  const importJson = useCallback(() => {
    if (typeof document === 'undefined') {
      showError?.('Importação local disponível apenas no navegador.');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = event => {
      const file = event.target?.files?.[0];
      if (!file) return;
      const reader = new window.FileReader();
      reader.onload = async readerEvent => {
        try {
          const imported = validateImportedDb(JSON.parse(String(readerEvent.target?.result || '{}')));
          await persistDb(imported);
          setSelectedId(getSectionDefaultSelection(imported, activeTab));
          showSuccess?.('JSON importado para a base local da Engenharia.');
        } catch (error) {
          showError?.(error?.message || 'Não foi possível importar este JSON.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [activeTab, persistDb, showError, showSuccess]);

  const activeTabMeta = MAIN_TABS.find(tab => tab.key === activeTab) || MAIN_TABS[0];

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
                    active={activeTab === tab.key}
                    onPress={() => switchTab(tab.key)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.content}>
            <View style={styles.sectionTop}>
              <View>
                <Text style={styles.sectionEyebrow}>{activeTabMeta.label}</Text>
                <Text style={styles.sectionTitle}>{getSectionTitle(activeTab)}</Text>
              </View>
              {activeTab !== 'dashboard' && activeTab !== 'cost_engine' && activeTab !== 'settings' ? (
                <SearchBox value={query} onChangeText={setQuery} placeholder="Buscar na engenharia" />
              ) : null}
            </View>
            <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentScrollBody}>
              {renderContent({
                activeTab,
                db,
                dashboardPurchases,
                dashboardPurchasesLoading,
                query,
                selectedId,
                setSelectedId,
                activeProductTab,
                setActiveProductTab,
                openModal: setModal,
                patchCollectionItem,
                patchProductComponent,
                saveProductComponentQuantity,
                patchProductAddonComponent,
                patchRecipeComponent,
                saveRecipeComponentQuantity,
                patchActiveCost,
                persistDb,
                switchTab,
                effectiveConfigs,
                productsActions: productsStore.actions,
                productGroupActions: productGroupStore.actions,
                productGroupProductActions: productGroupProductStore.actions,
                showError,
                showSuccess,
              })}
            </ScrollView>
          </View>
        </View>
      </View>
      <StateStore stores={['products', 'product_group', 'product_group_product', 'product_unit', 'configs']} />
      <EditModal
        modal={modal}
        db={db}
        onClose={() => setModal(null)}
        onSave={(collection, id, patch) => {
          patchCollectionItem(collection, id, patch);
          setModal(null);
        }}
      />
    </SafeAreaView>
  );
}

function getSectionTitle(activeTab) {
  if (activeTab === 'dashboard') return 'Resumo técnico da operação';
  if (activeTab === 'cost_engine') return 'Como o ERP calcula custo, margem e preço';
  if (activeTab === 'purchases') return 'Mapa auditável de compras, notas e comprovantes';
  if (activeTab === 'processes') return 'Matriz de processo operacional';
  if (activeTab === 'pending') return 'Itens que pedem revisão';
  if (activeTab === 'settings') return 'Premissas de preço e rateio da engenharia';
  return RESOURCE_META[activeTab]?.description || 'Engenharia';
}

function renderContent(props) {
  const { activeTab } = props;
  if (activeTab === 'dashboard') return <Dashboard {...props} />;
  if (activeTab === 'cost_engine') return <CostEngineView {...props} />;
  if (activeTab === 'products') return <ProductsView {...props} />;
  if (['ingredients', 'packaging'].includes(activeTab)) return <SupplyResourceView {...props} collection={activeTab} />;
  if (activeTab === 'recipes') return <RecipesView {...props} />;
  if (activeTab === 'resale') return <ResaleView {...props} />;
  if (activeTab === 'purchases') return <PurchasesView {...props} />;
  if (activeTab === 'processes') return <ProcessesView {...props} />;
  if (activeTab === 'suppliers') return <SuppliersView {...props} />;
  if (activeTab === 'pending') return <PendingView {...props} />;
  if (activeTab === 'settings') return <SettingsView {...props} />;
  return <EmptyState />;
}

function Dashboard({
  db,
  setSelectedId,
  switchTab,
  dashboardPurchases = [],
  dashboardPurchasesLoading = false,
}) {
  const mergedPurchases = [
    ...safeArray(db.purchaseOrders),
    ...safeArray(dashboardPurchases),
  ].reduce((accumulator, order) => {
    const key = String(order?.id || `${resolvePurchaseOrderDate(order)}:${order?.totalAmount || order?.price || order?.total || ''}`);
    if (!key || accumulator.seen.has(key)) return accumulator;
    accumulator.seen.add(key);
    accumulator.items.push(order);
    return accumulator;
  }, { seen: new Set(), items: [] }).items;
  const radar = buildDashboardRadar(db, { purchaseOrders: mergedPurchases });
  const purchases = safeArray(dashboardPurchases)
    .filter(order => resolvePurchaseOrderDate(order))
    .sort((left, right) => String(resolvePurchaseOrderDate(right) || '').localeCompare(String(resolvePurchaseOrderDate(left) || '')))
    .slice(0, 5);
  const showPurchasePanel = dashboardPurchasesLoading || purchases.length > 0;
  const openProduct = productId => {
    switchTab?.('products');
    setSelectedId?.(productId);
  };

  return (
    <View style={styles.dashboardStack}>
      <View style={[styles.dashboardHero, radar.diagnosis.tone === 'bad' && styles.dashboardHeroBad, radar.diagnosis.tone === 'warn' && styles.dashboardHeroWarn]}>
        <View style={styles.dashboardHeroMain}>
          <Badge tone={radar.diagnosis.tone === 'bad' ? 'bad' : radar.diagnosis.tone === 'warn' ? 'warn' : 'good'}>
            Radar da operação
          </Badge>
          <Text style={styles.dashboardHeroTitle}>{radar.diagnosis.title}</Text>
          <Text style={styles.dashboardHeroText}>{radar.diagnosis.description}</Text>
          <View style={styles.quickActionGrid}>
            <QuickAction
              icon="book-open"
              title="Abrir cardápio técnico"
              subtitle="Produtos, ficha e margem"
              tone="primary"
              onPress={() => switchTab?.('products')}
            />
            <QuickAction
              icon="sliders"
              title="Ajustar premissas e rateio"
              subtitle="Markup, meta e volume"
              onPress={() => switchTab?.('settings')}
            />
            <QuickAction
              icon="cpu"
              title="Entender motor de custo"
              subtitle="Fórmulas e leitura atual"
              onPress={() => switchTab?.('cost_engine')}
            />
            <QuickAction
              icon="file-text"
              title="Revisar compras"
              subtitle="Notas, evidências e histórico"
              onPress={() => switchTab?.('purchases')}
            />
          </View>
        </View>
        <View style={styles.dashboardHeroSide}>
          <CountTile label="Ingredientes" value={radar.counts.ingredients} icon="package" />
          <CountTile label="Preparos" value={radar.counts.recipes} icon="git-branch" />
          <CountTile label="Categorias" value={radar.counts.categories} icon="grid" />
          <CountTile label="Pendências" value={radar.counts.pending} icon="alert-circle" />
        </View>
      </View>

      <View style={styles.metricGrid}>
        {radar.primaryMetrics.map(metric => (
          <MetricCard
            key={metric.key}
            label={metric.label}
            value={metric.value}
            tone={metric.tone}
            helper={metric.helper}
          />
        ))}
      </View>

      <View style={styles.gridTwo}>
        <View style={styles.panel}>
          <View style={styles.panelIntro}>
            <Text style={styles.panelTitle}>Alertas de margem</Text>
            <Text style={styles.panelSubtitle}>Itens que mais precisam de decisão de preço, ficha ou compra.</Text>
          </View>
          {radar.marginAlerts.length ? radar.marginAlerts.map(item => (
            <RowCard
              key={item.product.id}
              title={item.product.name}
              subtitle={categoryName(db, item.product.categoryId)}
              meta={`Custo ${money(item.directCost)} · Preço ${money(item.salePrice)}`}
              onPress={() => openProduct(item.product.id)}
              badges={[{ label: percent(item.marginPct), tone: item.marginPct >= radar.finance.targetMarginPct ? 'good' : 'warn' }]}
            />
          )) : <EmptyState text="Nenhum produto ativo para analisar." />}
        </View>
        <View style={styles.panel}>
          <View style={styles.panelIntro}>
            <Text style={styles.panelTitle}>Maior impacto de custo</Text>
            <Text style={styles.panelSubtitle}>Itens mais caros para produzir hoje, mesmo quando a margem está saudável.</Text>
          </View>
          {radar.highCostItems.length ? radar.highCostItems.map(item => (
            <RowCard
              key={item.product.id}
              title={item.product.name}
              subtitle={categoryName(db, item.product.categoryId)}
              meta={`Preço pela regra ${money(item.autoSalePrice)} · Margem ${percent(item.marginPct)}`}
              onPress={() => openProduct(item.product.id)}
              right={<Text style={styles.rowMoney}>{money(item.directCost)}</Text>}
            />
          )) : <EmptyState text="Nenhum custo técnico calculado ainda." />}
        </View>
      </View>

      <View style={styles.gridTwo}>
        <View style={styles.panel}>
          <View style={styles.panelIntro}>
            <Text style={styles.panelTitle}>Resumo por categoria</Text>
            <Text style={styles.panelSubtitle}>Quantidade de itens, custo médio e margem média por grupo do cardápio.</Text>
          </View>
          <View style={styles.categorySummaryGrid}>
            {radar.categorySummaries.length ? radar.categorySummaries.map(category => (
              <View key={category.name} style={styles.categorySummaryCard}>
                <Text style={styles.categorySummaryTitle}>{category.name}</Text>
                <Text style={styles.categorySummaryValue}>{category.count} item(ns)</Text>
                <View style={styles.categorySummaryMeta}>
                  <Badge tone="neutral">{money(category.averageCost)} méd.</Badge>
                  <Badge tone={category.marginPct >= radar.finance.targetMarginPct ? 'good' : 'warn'}>{percent(category.marginPct)}</Badge>
                </View>
              </View>
            )) : <EmptyState text="Nenhuma categoria ativa encontrada." />}
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelIntro}>
            <Text style={styles.panelTitle}>Base técnica carregada</Text>
            <Text style={styles.panelSubtitle}>Tamanho atual da engenharia usada neste radar.</Text>
          </View>
          <View style={styles.operationalSummaryGrid}>
            <CountTile label="Produtos de venda" value={radar.counts.products} icon="shopping-bag" />
            <CountTile label="Embalagens" value={radar.counts.packaging} icon="archive" />
            <CountTile label="Evidências" value={radar.counts.evidences} icon="paperclip" />
            <CountTile label="Compras no histórico" value={mergedPurchases.length} icon="file-text" />
          </View>
          <View style={styles.costLogicNote}>
            <Text style={styles.costLogicTitle}>Leitura de CMV, margem e markup</Text>
            <Text style={styles.costLogicText}>
              O radar usa custo técnico direto para margem do item, compara o CMV estimado com a faixa de referência da alimentação e mantém o rateio fixo como leitura gerencial quando a base mensal estiver cadastrada.
            </Text>
          </View>
        </View>
      </View>

      {showPurchasePanel ? (
        <View style={styles.panel}>
          <View style={styles.panelIntro}>
            <Text style={styles.panelTitle}>Últimas compras</Text>
            <Text style={styles.panelSubtitle}>Amostra recente usada para orientar revisão de custos e evidências.</Text>
          </View>
          {dashboardPurchasesLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={MENU_COLORS.brandStrong} />
              <Text style={styles.emptyStateText}>Carregando últimas compras...</Text>
            </View>
          ) : null}
          {purchases.map(order => (
            <RowCard
              key={order.id}
              title={resolvePurchaseOrderLabel(order) || 'Compra'}
              subtitle={`${formatDate(resolvePurchaseOrderDate(order))} · ${resolvePurchaseSupplierLabel(order)}`}
              meta={order.evidenceSource || order.notes}
              right={<Text style={styles.rowMoney}>{money(order.price || order.totalAmount || order.total || 0)}</Text>}
              badges={[{ label: paymentLabel(order.paymentStatus), tone: order.paymentStatus === 'paid' ? 'good' : 'warn' }]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function CostEngineView({
  db,
  effectiveConfigs,
  switchTab,
  persistDb,
  showError,
  showSuccess,
}) {
  const peopleStore = useStore('people');
  const configsStore = useStore('configs');
  const configActions = configsStore.actions || {};
  const { currentCompany } = peopleStore.getters || {};
  const overview = buildCostEngineOverview(db);
  const officialRules = useMemo(
    () => resolveCostEngineRulesFromConfigs(effectiveConfigs, db?.settings?.costEngineRules),
    [effectiveConfigs, db?.settings?.costEngineRules],
  );
  const [draftRules, setDraftRules] = useState(() => officialRules);

  useEffect(() => {
    setDraftRules(officialRules);
  }, [officialRules]);

  const draftPreviews = draftRules.channels.map(channel =>
    buildCostEngineChannelPreview(db, channel)
  );

  const updateChannel = (channelId, patch) => {
    setDraftRules(current => ({
      ...current,
      channels: current.channels.map(channel =>
        channel.id === channelId ? { ...channel, ...patch } : channel
      ),
    }));
  };

  const cycleRoundingMode = channel => {
    const currentIndex = COST_ENGINE_ROUNDING_OPTIONS.findIndex(option => option.value === channel.roundingMode);
    const nextOption = COST_ENGINE_ROUNDING_OPTIONS[(currentIndex + 1) % COST_ENGINE_ROUNDING_OPTIONS.length];
    updateChannel(channel.id, { roundingMode: nextOption.value });
  };

  const saveRules = async () => {
    if (!currentCompany?.id) {
      showError?.('Selecione uma empresa para salvar as regras do motor de custo.');
      return;
    }

    const normalizedRules = normalizeCostEngineRules(draftRules);
    const requestConfig = buildCostEngineRulesRequestConfig(normalizedRules);
    const companyRef = `/people/${currentCompany.id}`;

    try {
      try {
        await configActions.addManyConfigs({
          configs: [requestConfig],
          people: companyRef,
          module: 4,
          visibility: 'public',
        });
      } catch (error) {
        if (!isMethodNotAllowedError(error)) {
          throw error;
        }

        await configActions.addConfigs({
          configKey: requestConfig.configKey,
          configValue: requestConfig.configValue,
          people: companyRef,
          module: 4,
          visibility: 'public',
        });
      }

      configActions.setItems({
        ...(effectiveConfigs || {}),
        ...buildCostEngineRulesCache(normalizedRules),
      });
      persistDb?.({
        ...db,
        settings: {
          ...(db.settings || {}),
          costEngineRules: normalizedRules,
        },
      });
      showSuccess?.('Regras do motor de custo salvas na empresa.');
    } catch (error) {
      showError?.(resolveErrorMessage(error));
    }
  };

  return (
    <View style={styles.dashboardStack}>
      <View style={styles.costEngineHero}>
        <View style={styles.dashboardHeroMain}>
          <Badge tone="neutral">Regra atual</Badge>
          <Text style={styles.dashboardHeroTitle}>{overview.headline.title}</Text>
          <Text style={styles.dashboardHeroText}>{overview.headline.description}</Text>
          <View style={styles.quickActionGrid}>
            <QuickAction
              icon="sliders"
              title="Editar premissas"
              subtitle="Markup, meta e volume"
              tone="primary"
              onPress={() => switchTab?.('settings')}
            />
            <QuickAction
              icon="shopping-bag"
              title="Ver produtos"
              subtitle="Ficha, preço e margem"
              onPress={() => switchTab?.('products')}
            />
          </View>
        </View>
        <View style={styles.dashboardHeroSide}>
          {overview.ruleCards.map(card => (
            <MetricCard
              key={card.key}
              label={card.label}
              value={card.value}
              tone={card.tone}
              helper={card.helper}
            />
          ))}
        </View>
      </View>

      <View style={styles.gridTwo}>
        <View style={styles.panel}>
          <View style={styles.panelIntro}>
            <Text style={styles.panelTitle}>Fluxo de cálculo</Text>
            <Text style={styles.panelSubtitle}>Etapas usadas hoje para sair da ficha técnica até a leitura de margem e rateio.</Text>
          </View>
          <View style={styles.costEngineTimeline}>
            {overview.steps.map(step => (
              <View key={step.key} style={styles.costEngineStep}>
                <View style={styles.costEngineStepIcon}>
                  <Icon name="arrow-down" size={15} color={MENU_COLORS.brandText} />
                </View>
                <View style={styles.costEngineStepText}>
                  <Text style={styles.costEngineStepTitle}>{step.title}</Text>
                  <Text style={styles.costEngineFormula}>{step.formula}</Text>
                  <Text style={styles.costEngineDescription}>{step.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelIntro}>
            <Text style={styles.panelTitle}>Regras por canal</Text>
            <Text style={styles.panelSubtitle}>Margem, taxas, comissão, repasse e arredondamento usados para simular preço sugerido por canal.</Text>
          </View>
          <View style={styles.channelRuleList}>
            {draftPreviews.map(channel => (
              <View key={channel.id} style={styles.channelRuleCard}>
                <View style={styles.channelRuleHeader}>
                  <View style={styles.channelRuleTitleBlock}>
                    <Text style={styles.channelRuleTitle}>{channel.name}</Text>
                    <Text style={styles.channelRuleSubtitle}>
                      Preço sugerido {money(channel.suggestedPrice)} · base {money(channel.pricingBase)}
                    </Text>
                  </View>
                  <Badge tone={channel.totalPct >= 85 ? 'bad' : channel.totalPct >= 65 ? 'warn' : 'good'}>
                    {percent(channel.totalPct)}
                  </Badge>
                </View>
                <View style={styles.channelFieldGrid}>
                  <View style={styles.channelField}>
                    <Text style={styles.modalLabel}>Margem (%)</Text>
                    <TextInput
                      value={String(channel.marginPct)}
                      onChangeText={value => updateChannel(channel.id, { marginPct: value })}
                      style={styles.modalInput}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.channelField}>
                    <Text style={styles.modalLabel}>Taxa (%)</Text>
                    <TextInput
                      value={String(channel.feePct)}
                      onChangeText={value => updateChannel(channel.id, { feePct: value })}
                      style={styles.modalInput}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.channelField}>
                    <Text style={styles.modalLabel}>Comissão (%)</Text>
                    <TextInput
                      value={String(channel.commissionPct)}
                      onChangeText={value => updateChannel(channel.id, { commissionPct: value })}
                      style={styles.modalInput}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.channelField}>
                    <Text style={styles.modalLabel}>Imposto (%)</Text>
                    <TextInput
                      value={String(channel.taxPct)}
                      onChangeText={value => updateChannel(channel.id, { taxPct: value })}
                      style={styles.modalInput}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.channelField}>
                    <Text style={styles.modalLabel}>Repasse (R$)</Text>
                    <TextInput
                      value={String(channel.passThroughAmount)}
                      onChangeText={value => updateChannel(channel.id, { passThroughAmount: value })}
                      style={styles.modalInput}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.channelField}>
                    <Text style={styles.modalLabel}>Arredondamento</Text>
                    <TouchableOpacity
                      style={styles.roundingButton}
                      activeOpacity={0.82}
                      onPress={() => cycleRoundingMode(channel)}
                    >
                      <Text style={styles.roundingButtonText}>{channel.roundingLabel}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.channelResultGrid}>
                  <Badge tone="neutral">Custo médio {money(channel.averageDirectCost)}</Badge>
                  <Badge tone="neutral">Taxas {money(channel.feesAmount + channel.commissionAmount + channel.taxAmount)}</Badge>
                  <Badge tone={channel.contributionAmount > 0 ? 'good' : 'bad'}>Contribuição {money(channel.contributionAmount)}</Badge>
                </View>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={saveRules}>
            <Icon name="save" size={16} color={MENU_COLORS.white} />
            <Text style={styles.primaryButtonText}>Salvar regras do motor</Text>
          </TouchableOpacity>
          <View style={styles.costLogicNote}>
            <Text style={styles.costLogicTitle}>Separação importante</Text>
            <Text style={styles.costLogicText}>
              Custo técnico, CMV, markup, margem e rateio fixo não são a mesma coisa. Esta aba deixa essa leitura explícita antes de permitir regras editáveis por canal.
            </Text>
          </View>
          <View style={styles.nextRuleList}>
            {overview.nextRules.map(rule => (
              <View key={rule} style={styles.nextRuleItem}>
                <Icon name="plus-circle" size={16} color={MENU_COLORS.brandStrong} />
                <Text style={styles.nextRuleText}>{rule}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function ProductsView({
  db,
  query,
  selectedId,
  setSelectedId,
  activeProductTab,
  setActiveProductTab,
  openModal,
  patchProductComponent,
  saveProductComponentQuantity,
  patchProductAddonComponent,
  persistDb,
  productsActions,
  productGroupActions,
  productGroupProductActions,
  showError,
}) {
  const allProducts = useMemo(() => computeEngineeringProducts(db), [db]);
  const products = useMemo(() => filterBySearch(allProducts, query, [
    item => item.product.name,
    item => item.product.code,
    item => categoryName(db, item.product.categoryId),
  ]), [allProducts, db, query]);
  const peopleStore = useStore('people');
  const { currentCompany } = peopleStore.getters || {};
  const [expandedCategories, setExpandedCategories] = useState({});
  const [categoryOrder, setCategoryOrder] = useState([]);
  const [draggingCategoryKey, setDraggingCategoryKey] = useState('');
  const categoryOrderLoadedRef = useRef(false);
  const selectedProduct = products.find(item => String(item.product.id) === String(selectedId)) || products[0] || null;
  const selected = selectedProduct ? computeProduct(db, selectedProduct.product.id) : null;
  const [selectedPurchaseRows, setSelectedPurchaseRows] = useState([]);
  const selectedPurchaseCacheRef = useRef(new Map());
  const selectedPurchaseRequestRef = useRef(0);
  const selectedAddonsCacheRef = useRef(new Map());
  const selectedAddonsRequestRef = useRef(0);
  const selectedRecipeComponentsCacheRef = useRef(new Map());
  const selectedRecipeComponentsRequestRef = useRef(0);
  const categoryProductsCacheRef = useRef(new Map());
  const categoryProductsRequestRef = useRef({});
  const categoryDragRef = useRef({ key: '', startIndex: 0, lastIndex: 0 });
  const categoryRows = useMemo(
    () => buildEngineeringMenuCategoryRows(db, products),
    [db, products],
  );
  const visibleCategoryRows = useMemo(
    () => query ? categoryRows.filter(row => row.products.length > 0) : categoryRows,
    [categoryRows, query],
  );
  const orderedCategoryRows = useMemo(
    () => applyLocalCategoryOrder(visibleCategoryRows, categoryOrder),
    [visibleCategoryRows, categoryOrder],
  );
  const expandedCount = orderedCategoryRows.filter(row => expandedCategories[row.key]).length;
  const allExpanded = orderedCategoryRows.length > 0 && expandedCount === orderedCategoryRows.length;

  useEffect(() => {
    categoryOrderLoadedRef.current = false;
    const companyId = normalizeEntityId(currentCompany);
    if (!companyId) {
      setCategoryOrder([]);
      categoryOrderLoadedRef.current = true;
      return undefined;
    }

    let alive = true;
    AsyncStorage
      .getItem(`${PRODUCT_CATEGORY_ORDER_STORAGE_KEY}:${companyId}`)
      .then(value => {
        if (!alive) return;
        try {
          const parsed = JSON.parse(value || '[]');
          setCategoryOrder(Array.isArray(parsed) ? parsed.map(String) : []);
        } catch {
          setCategoryOrder([]);
        }
      })
      .finally(() => {
        if (alive) categoryOrderLoadedRef.current = true;
      });

    return () => {
      alive = false;
    };
  }, [currentCompany?.id]);

  useEffect(() => {
    const companyId = normalizeEntityId(currentCompany);
    if (!companyId || !categoryOrderLoadedRef.current) return;
    AsyncStorage
      .setItem(`${PRODUCT_CATEGORY_ORDER_STORAGE_KEY}:${companyId}`, JSON.stringify(categoryOrder))
      .catch(() => null);
  }, [categoryOrder, currentCompany?.id]);

  useEffect(() => {
    const currentKeys = new Set(categoryRows.map(row => String(row.key)));
    setCategoryOrder(currentOrder => {
      const keptKeys = currentOrder.filter(key => currentKeys.has(String(key)));
      const missingKeys = categoryRows
        .map(row => String(row.key))
        .filter(key => !keptKeys.includes(key));
      return [...keptKeys, ...missingKeys];
    });
    setExpandedCategories(current => {
      const next = {};
      categoryRows.forEach(row => {
        const key = String(row.key);
        next[key] = query ? row.products.length > 0 : Boolean(current[key]);
      });
      return next;
    });
  }, [categoryRows, query]);

  const toggleCategory = useCallback(categoryKey => {
    setExpandedCategories(current => ({
      ...current,
      [categoryKey]: !current[categoryKey],
    }));
  }, []);

  const mergeCategoryProducts = useCallback((categoryRow, remoteProducts) => {
    const categoryId = normalizeEntityId(categoryRow?.category);
    const normalizedProducts = safeArray(remoteProducts)
      .map(product => ({
        ...normalizeLiveProduct(product),
        categoryId: normalizeLiveProduct(product).categoryId || categoryId,
      }))
      .filter(product => product.id);

    if (!normalizedProducts.length) return;

    const loadedById = new Map(normalizedProducts.map(product => [String(product.id), product]));
    const existingIds = new Set(safeArray(db.products).map(product => String(product.id)));
    persistDb?.({
      ...db,
      products: [
        ...safeArray(db.products).map(product => {
          const loaded = loadedById.get(String(product.id));
          if (!loaded) return product;
          return {
            ...product,
            ...loaded,
            components: safeArray(product.components).length ? product.components : safeArray(loaded.components),
            addons: safeArray(product.addons).length ? product.addons : safeArray(loaded.addons),
            extraData: {
              ...(loaded.extraData || {}),
              ...(product.extraData || {}),
            },
          };
        }),
        ...normalizedProducts.filter(product => !existingIds.has(String(product.id))),
      ],
    });
  }, [db, persistDb]);

  const loadProductsForCategory = useCallback(async categoryRow => {
    const categoryId = normalizeEntityId(categoryRow?.category);
    if (
      !categoryId ||
      categoryRow?.key === ENGINEERING_UNCATEGORIZED_KEY ||
      !productsActions?.getItems
    ) {
      return;
    }

    const cacheKey = String(categoryId);
    if (categoryProductsCacheRef.current.has(cacheKey)) {
      mergeCategoryProducts(categoryRow, categoryProductsCacheRef.current.get(cacheKey));
      return;
    }

    const requestId = `${cacheKey}:${Date.now()}`;
    categoryProductsRequestRef.current = {
      ...categoryProductsRequestRef.current,
      [cacheKey]: requestId,
    };

    try {
      const remoteProducts = await productsActions.getItems({
        active: 1,
        company: currentCompany?.id,
        type: ['product', 'custom', 'drink', 'manufactured'],
        itemsPerPage: 100,
        'order[product]': 'ASC',
        'order[description]': 'ASC',
        'productCategory.category': categoryRow?.category?.['@id'] || `/categories/${categoryId}`,
      });

      if (categoryProductsRequestRef.current?.[cacheKey] !== requestId) return;

      const rows = safeArray(remoteProducts);
      categoryProductsCacheRef.current.set(cacheKey, rows);
      mergeCategoryProducts(categoryRow, rows);
    } catch (error) {
      showError?.(
        error?.response?.data?.['hydra:description'] ||
        error?.response?.data?.detail ||
        error?.message ||
        'Não foi possível carregar os produtos desta categoria.',
      );
    }
  }, [
    currentCompany?.id,
    mergeCategoryProducts,
    productsActions,
    showError,
  ]);

  const toggleCategoryRow = useCallback(categoryRow => {
    const willExpand = !expandedCategories[categoryRow.key];
    toggleCategory(categoryRow.key);
    if (willExpand && categoryRow.products.length === 0) {
      void loadProductsForCategory(categoryRow);
    }
  }, [expandedCategories, loadProductsForCategory, toggleCategory]);

  const toggleAllCategories = useCallback(() => {
    setExpandedCategories(() => {
      const nextExpanded = !allExpanded;
      if (nextExpanded) {
        orderedCategoryRows.forEach(row => {
          if (row.products.length === 0) {
            void loadProductsForCategory(row);
          }
        });
      }
      return Object.fromEntries(orderedCategoryRows.map(row => [row.key, nextExpanded]));
    });
  }, [allExpanded, loadProductsForCategory, orderedCategoryRows]);

  const reorderCategoryToIndex = useCallback((categoryKey, nextIndex) => {
    setCategoryOrder(current => {
      const keys = current.length ? current.map(String) : orderedCategoryRows.map(row => String(row.key));
      const fromIndex = keys.indexOf(String(categoryKey));
      const boundedIndex = Math.max(0, Math.min(keys.length - 1, nextIndex));
      if (fromIndex < 0 || fromIndex === boundedIndex) return keys;
      const nextKeys = [...keys];
      const [item] = nextKeys.splice(fromIndex, 1);
      nextKeys.splice(boundedIndex, 0, item);
      return nextKeys;
    });
  }, [orderedCategoryRows]);

  const startCategoryMouseDrag = useCallback((event, categoryKey, index) => {
    const startY = event?.nativeEvent?.clientY ?? event?.clientY;
    if (typeof window === 'undefined' || !Number.isFinite(startY)) return;

    const dragState = {
      key: String(categoryKey),
      startIndex: index,
      lastIndex: index,
      startY,
    };
    categoryDragRef.current = dragState;
    setDraggingCategoryKey(categoryKey);

    const handleMove = moveEvent => {
      const currentY = moveEvent?.clientY ?? moveEvent?.touches?.[0]?.clientY;
      if (!Number.isFinite(currentY)) return;

      const rowStep = 62;
      const nextIndex = Math.max(
        0,
        Math.min(
          orderedCategoryRows.length - 1,
          dragState.startIndex + Math.round((currentY - dragState.startY) / rowStep),
        ),
      );

      if (nextIndex !== dragState.lastIndex) {
        dragState.lastIndex = nextIndex;
        reorderCategoryToIndex(categoryKey, nextIndex);
      }
    };

    const finishDrag = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', finishDrag);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', finishDrag);
      setDraggingCategoryKey('');
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', finishDrag);
    window.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('touchend', finishDrag);
  }, [orderedCategoryRows.length, reorderCategoryToIndex]);

  const createCategoryDragHandlers = useCallback((categoryKey, index) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        categoryDragRef.current = {
          key: String(categoryKey),
          startIndex: index,
          lastIndex: index,
        };
        setDraggingCategoryKey(categoryKey);
      },
      onPanResponderMove: (event, gestureState) => {
        const rowStep = 62;
        const nextIndex = Math.max(
          0,
          Math.min(
            orderedCategoryRows.length - 1,
            categoryDragRef.current.startIndex + Math.round(gestureState.dy / rowStep),
          ),
        );

        if (nextIndex !== categoryDragRef.current.lastIndex) {
          categoryDragRef.current.lastIndex = nextIndex;
          reorderCategoryToIndex(categoryKey, nextIndex);
        }
      },
      onPanResponderRelease: () => setDraggingCategoryKey(''),
      onPanResponderTerminate: () => setDraggingCategoryKey(''),
    }).panHandlers, [orderedCategoryRows.length, reorderCategoryToIndex]);


  useEffect(() => {
    const productId = String(selectedProduct?.product?.id || '').trim();
    if (!productId || !currentCompany?.id) {
      setSelectedPurchaseRows([]);
      return undefined;
    }

    const cachedRows = selectedPurchaseCacheRef.current.get(productId);
    if (cachedRows) {
      setSelectedPurchaseRows(cachedRows);
      return undefined;
    }

    const requestId = ++selectedPurchaseRequestRef.current;
    setSelectedPurchaseRows([]);

    const loadPurchases = async () => {
      try {
        const latestPurchasesByProductId = await fetchLatestPurchasesByProductIds({
          companyId: currentCompany.id,
          productIds: [productId],
          limitPerProduct: 3,
          maxPages: 1,
        });

        if (requestId !== selectedPurchaseRequestRef.current) return;

        const rows = safeArray(latestPurchasesByProductId?.[productId]);
        selectedPurchaseCacheRef.current.set(productId, rows);
        setSelectedPurchaseRows(rows);
      } catch {
        if (requestId === selectedPurchaseRequestRef.current) {
          setSelectedPurchaseRows([]);
        }
      }
    };

    loadPurchases();
  }, [currentCompany?.id, selectedProduct?.product?.id]);

  useEffect(() => {
    if (
      activeProductTab !== 'composition' ||
      !selected?.nodes?.length ||
      !productGroupProductActions?.getItems
    ) {
      return undefined;
    }

    const recipeIds = Array.from(new Set(
      selected.nodes
        .filter(node => node.refType === 'recipe' && node.record)
        .filter(node => !node.record?.extraData?.menuCostsComponentsLoaded)
        .map(node => String(node.refId || '').trim())
        .filter(Boolean),
    ));

    if (!recipeIds.length) {
      return undefined;
    }

    const cachedEntries = recipeIds.filter(recipeId =>
      selectedRecipeComponentsCacheRef.current.has(recipeId)
    );
    const missingIds = recipeIds.filter(recipeId =>
      !selectedRecipeComponentsCacheRef.current.has(recipeId)
    );

    const applyRecipeComponents = componentsByRecipeId => {
      persistDb?.({
        ...db,
        recipes: safeArray(db.recipes).map(recipe => {
          const recipeId = String(recipe.id || '').trim();
          if (!recipeIds.includes(recipeId)) return recipe;
          return {
            ...recipe,
            components: safeArray(componentsByRecipeId[recipeId]),
            extraData: {
              ...(recipe.extraData || {}),
              menuCostsComponentsLoaded: true,
            },
          };
        }),
      });
    };

    if (!missingIds.length) {
      applyRecipeComponents(Object.fromEntries(
        cachedEntries.map(recipeId => [
          recipeId,
          selectedRecipeComponentsCacheRef.current.get(recipeId),
        ]),
      ));
      return undefined;
    }

    const requestId = ++selectedRecipeComponentsRequestRef.current;

    const loadRecipeComponents = async () => {
      try {
        const recipesToLoad = safeArray(db.recipes).filter(recipe =>
          missingIds.includes(String(recipe.id || '').trim())
        );
        const loadedComponentsByRecipeId = await buildRecipeComponentsByProductId({
          recipes: recipesToLoad,
          productGroupProductActions,
        });
        const componentsByRecipeId = {
          ...Object.fromEntries(
            cachedEntries.map(recipeId => [
              recipeId,
              selectedRecipeComponentsCacheRef.current.get(recipeId),
            ]),
          ),
          ...Object.fromEntries(
            missingIds.map(recipeId => {
              const components = safeArray(loadedComponentsByRecipeId[recipeId]);
              selectedRecipeComponentsCacheRef.current.set(recipeId, components);
              return [recipeId, components];
            }),
          ),
        };

        if (requestId !== selectedRecipeComponentsRequestRef.current) return;

        applyRecipeComponents(componentsByRecipeId);
      } catch (error) {
        if (requestId === selectedRecipeComponentsRequestRef.current) {
          showError?.(
            error?.response?.data?.['hydra:description'] ||
            error?.response?.data?.detail ||
            error?.message ||
            'Não foi possível carregar os componentes dos preparos desta ficha.',
          );
        }
      }
    };

    loadRecipeComponents();
    return undefined;
  }, [
    activeProductTab,
    db,
    persistDb,
    productGroupProductActions,
    selected?.nodes,
    showError,
  ]);

  useEffect(() => {
    const product = selectedProduct?.product;
    const productId = String(product?.id || '').trim();

    if (
      activeProductTab !== 'addons' ||
      !productId ||
      product?.extraData?.menuCostsAddonsLoaded ||
      !productGroupActions?.getItems ||
      !productGroupProductActions?.getItems
    ) {
      return undefined;
    }

    const cachedAddons = selectedAddonsCacheRef.current.get(productId);
    if (cachedAddons) {
      persistDb?.({
        ...db,
        products: safeArray(db.products).map(item => (
          String(item.id) === productId
            ? {
              ...item,
              addons: cachedAddons,
              extraData: {
                ...(item.extraData || {}),
                menuCostsAddonsLoaded: true,
              },
            }
            : item
        )),
      });
      return undefined;
    }

    const requestId = ++selectedAddonsRequestRef.current;

    const loadSelectedAddons = async () => {
      try {
        const addonsByProductId = await buildAddonsForProducts({
          products: [product],
          productGroupActions,
          productGroupProductActions,
        });

        if (requestId !== selectedAddonsRequestRef.current) return;

        const addons = safeArray(addonsByProductId[productId]);
        selectedAddonsCacheRef.current.set(productId, addons);
        persistDb?.({
          ...db,
          products: safeArray(db.products).map(item => (
            String(item.id) === productId
              ? {
                ...item,
                addons,
                extraData: {
                  ...(item.extraData || {}),
                  menuCostsAddonsLoaded: true,
                },
              }
              : item
          )),
        });
      } catch (error) {
        if (requestId === selectedAddonsRequestRef.current) {
          showError?.(
            error?.response?.data?.['hydra:description'] ||
            error?.response?.data?.detail ||
            error?.message ||
            'Não foi possível carregar os grupos deste produto.',
          );
        }
      }
    };

    loadSelectedAddons();
    return undefined;
  }, [
    activeProductTab,
    db,
    persistDb,
    productGroupActions,
    productGroupProductActions,
    selectedProduct?.product,
    showError,
  ]);

  return (
    <View style={styles.splitLayout}>
      <ScrollView style={styles.listPanel} nestedScrollEnabled>
        <View style={styles.menuCatalogToolbar}>
          <View style={styles.menuCatalogTitleBlock}>
            <Text style={styles.panelTitle}>Cardápio de engenharia</Text>
            <Text style={styles.panelSubtitle}>
              {orderedCategoryRows.length} categoria(s) · {allProducts.length} produto(s) no cardápio carregado
            </Text>
          </View>
          <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.82} onPress={toggleAllCategories}>
            <Icon name={allExpanded ? 'minimize-2' : 'maximize-2'} size={15} color={MENU_COLORS.brandText} />
            <Text style={styles.secondaryButtonText}>{allExpanded ? 'Recolher todas' : 'Expandir todas'}</Text>
          </TouchableOpacity>
        </View>
        {orderedCategoryRows.length ? orderedCategoryRows.map((categoryRow, index) => {
          const expanded = Boolean(expandedCategories[categoryRow.key]);
          const categoryCost = categoryRow.products.reduce((sum, item) => sum + num(item.directCost), 0);
          const categoryPrice = categoryRow.products.reduce((sum, item) => sum + num(item.salePrice), 0);
          const categoryMargin = categoryPrice ? ((categoryPrice - categoryCost) / categoryPrice) * 100 : 0;

          return (
            <View
              key={categoryRow.key}
              testID={`menu-category-card-${categoryRow.key}`}
              style={[
                styles.menuCategoryCard,
                draggingCategoryKey === categoryRow.key && styles.menuCategoryCardDragging,
              ]}
            >
              <TouchableOpacity
                style={styles.menuCategoryHeader}
                activeOpacity={0.82}
                onMouseDown={event => startCategoryMouseDrag(event, categoryRow.key, index)}
                onPress={() => toggleCategoryRow(categoryRow)}
                {...createCategoryDragHandlers(categoryRow.key, index)}
              >
                <View style={styles.menuCategoryOrderBadge}>
                  <Text style={styles.menuCategoryOrderText}>{index + 1}</Text>
                </View>
                <View style={styles.menuCategoryHeaderText}>
                  <Text style={styles.menuCategoryTitle}>{categoryRow.title}</Text>
                  <Text style={styles.menuCategoryMeta}>
                    {categoryRow.products.length} produto(s) · custo {money(categoryCost)} · margem {percent(categoryMargin)}
                  </Text>
                </View>
                <View style={styles.menuCategoryActions}>
                  <Pressable
                    style={styles.menuCategoryDragHandle}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={`Reordenar ${categoryRow.title}`}
                    onMouseDown={event => startCategoryMouseDrag(event, categoryRow.key, index)}
                    {...createCategoryDragHandlers(categoryRow.key, index)}
                  >
                    <Icon name="move" size={15} color={MENU_COLORS.brandText} />
                  </Pressable>
                  <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={MENU_COLORS.brandText} />
                </View>
              </TouchableOpacity>
              {expanded ? (
                <View style={styles.menuCategoryProducts}>
                  {categoryRow.products.length ? categoryRow.products.map(item => (
                    <RowCard
                      key={item.product.id}
                      title={item.product.name}
                      subtitle={item.product.description || item.product.notes}
                      imageSource={imageForProduct(db, item.product)}
                      selected={selected?.product?.id === item.product.id}
                      onPress={() => {
                        setSelectedId(item.product.id);
                        setActiveProductTab('composition');
                      }}
                      right={<Text style={styles.rowMoney}>{money(item.salePrice)}</Text>}
                      badges={[
                        { label: `Custo ${money(item.directCost)}`, tone: 'neutral' },
                        { label: percent(item.marginPct), tone: item.marginPct >= targetMarginPct(db) ? 'good' : 'warn' },
                      ]}
                    />
                  )) : <EmptyState text="Categoria sem produtos de venda carregados." />}
                </View>
              ) : null}
            </View>
          );
        }) : (
          <EmptyState text={query ? 'Nenhum produto encontrado para a busca.' : 'Nenhuma categoria do cardápio encontrada.'} />
        )}
      </ScrollView>
      <ProductDetail
        db={db}
        computed={selected}
        purchaseRows={selectedPurchaseRows}
        activeProductTab={activeProductTab}
        setActiveProductTab={setActiveProductTab}
        openModal={openModal}
        patchProductComponent={patchProductComponent}
        saveProductComponentQuantity={saveProductComponentQuantity}
        patchProductAddonComponent={patchProductAddonComponent}
        canEditComposition
        canEditAddons
        readOnly
      />
    </View>
  );
}

function ProductDetail({
  db,
  computed,
  purchaseRows = null,
  activeProductTab,
  setActiveProductTab,
  openModal,
  patchProductComponent,
  saveProductComponentQuantity,
  patchProductAddonComponent,
  canEditComposition = false,
  canEditAddons = false,
  readOnly = false,
}) {
  if (!computed) return <EmptyState text="Selecione um produto para ver a ficha." />;
  const product = computed.product;
  const purchases = purchaseRows || productPurchaseRows(db, computed);
  const addonGroupEntries = Object.entries(groupBy(safeArray(computed.addons), addon => addon.group || 'Adicional'));
  const compositionCounts = safeArray(computed.nodes).reduce((accumulator, node) => ({
    ...accumulator,
    [node.refType]: (accumulator[node.refType] || 0) + 1,
  }), {});

  return (
    <DetailShell
      title={product.name}
      subtitle={product.description || product.notes}
      badges={[
        { label: 'Produto de venda', tone: 'neutral' },
        { label: categoryName(db, product.categoryId), tone: 'neutral' },
        { label: product.active === false ? 'Inativo' : 'Ativo', tone: product.active === false ? 'warn' : 'good' },
      ]}
      actions={readOnly ? null : <IconButton icon="edit-3" label="Editar" onPress={() => openModal({ collection: 'products', id: product.id })} />}
    >
      <View style={styles.productHero}>
        <VisualThumb source={imageForProduct(db, product)} label={product.name} size="lg" />
        <View style={styles.productHeroText}>
          <Text style={styles.productHeroTitle}>{categoryName(db, product.categoryId)}</Text>
          <Text style={styles.productHeroSubtitle}>
            {safeArray(product.components).length} componente(s) base · {addonGroupEntries.length} grupo(s) · {safeArray(computed.addons).length} adicional(is) · {product.includeInCatalogCount === false ? 'fora da contagem' : 'conta no cardápio'}
          </Text>
        </View>
      </View>
      <View style={styles.detailTabs}>
        {PRODUCT_DETAIL_TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.detailTabButton, activeProductTab === tab.key && styles.detailTabButtonActive]}
            onPress={() => setActiveProductTab(tab.key)}
          >
            <Text style={[styles.detailTabText, activeProductTab === tab.key && styles.detailTabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {activeProductTab === 'summary' ? (
        <InfoGrid rows={[
          { label: 'Preço praticado', value: money(computed.salePrice), helper: `iFood ${money(computed.ifoodSalePrice)}` },
          { label: 'Custo técnico', value: money(computed.directCost), helper: `Base ${money(computed.baseDirectCost)}` },
          { label: 'Obrigatórios mínimos', value: money(computed.requiredCost), helper: 'Menor combinação obrigatória' },
          { label: 'Margem', value: percent(computed.marginPct), helper: `Meta ${percent(targetMarginPct(db))}` },
          { label: 'Regra', value: product.pricingMode || 'auto', helper: `${defaultMarkupPct(db)}% sobre custo` },
          { label: 'ERP', value: product.erpUnit || 'UN', helper: product.erpProductType || product.type || 'produto' },
        ]} />
      ) : null}
      {activeProductTab === 'composition' ? (
        <View style={styles.stack}>
          <View style={styles.panelNested}>
            <Text style={styles.panelTitle}>Composição técnica do produto</Text>
            <Text style={styles.panelSubtitle}>
              Ingredientes diretos, preparos/receitas e embalagens que formam a ficha fixa deste item do cardápio.
            </Text>
            <View style={styles.badgeLine}>
              <Badge tone={compositionCounts.ingredient ? 'good' : 'neutral'}>{compositionCounts.ingredient || 0} ingrediente(s)</Badge>
              <Badge tone={compositionCounts.recipe ? 'good' : 'neutral'}>{compositionCounts.recipe || 0} preparo(s)</Badge>
              <Badge tone={compositionCounts.packaging ? 'good' : 'neutral'}>{compositionCounts.packaging || 0} embalagem(ns)</Badge>
            </View>
            {computed.nodes.length ? computed.nodes.map((node, index) => (
              <ComponentNode
                key={node.key}
                db={db}
                node={node}
                onQtyChange={!canEditComposition ? undefined : value => patchProductComponent?.(product.id, index, { qty: num(value) })}
                onQtyCommit={!canEditComposition ? undefined : value => saveProductComponentQuantity?.(product.id, index, node, num(value))}
              />
            )) : <EmptyState text="Produto sem composição técnica mapeada." />}
          </View>
        </View>
      ) : null}
      {activeProductTab === 'addons' ? (
        <View style={styles.stack}>
          <View style={styles.costLogicNote}>
            <Text style={styles.costLogicTitle}>Grupos comerciais do cardápio</Text>
            <Text style={styles.costLogicText}>
              Estes grupos vêm dos adicionais/modificadores do produto. O preço adicional é comercial; o custo técnico vem dos ingredientes, preparos e embalagens carregados por cada opção.
            </Text>
          </View>
          {addonGroupEntries.length ? addonGroupEntries.map(([groupName, addons]) => {
            const firstAddon = addons[0] || {};
            return (
              <View key={groupName} style={styles.addonGroupCard}>
                <View style={styles.addonGroupHeader}>
                  <View style={styles.nodeTitleWrap}>
                    <Text style={styles.addonGroupTitle}>{groupName}</Text>
                    <Text style={styles.addonGroupMeta}>
                      {firstAddon.required ? 'obrigatório' : 'opcional'} · min {firstAddon.minimum || 0} · max {firstAddon.maximum || 'livre'} · {addons.length} opção(ões)
                    </Text>
                  </View>
                  <Text style={styles.nodeCost}>{money(addons.reduce((sum, addon) => sum + num(addon.directCost), 0))}</Text>
                </View>
                {addons.map(addon => {
                  const addonNodes = safeArray(addon.nodes);
                  const singleNode = addonNodes.length === 1 ? addonNodes[0] : null;
                  return (
                    <View key={addon.id || addon.name} style={styles.addonOptionCard}>
                      <View style={styles.nodeHeader}>
                        <VisualThumb source={imageForAddon(db, addon)} label={addon.name} size="sm" />
                        <View style={styles.nodeTitleWrap}>
                          <Text style={styles.nodeTitle}>{addon.name}</Text>
                          <Text style={styles.nodeMeta}>{addon.required ? 'entra no obrigatório' : 'opção vendida à parte'}</Text>
                        </View>
                        <Text style={styles.nodeCost}>{money(addon.directCost)} / + {money(addon.salePriceDelta)}</Text>
                      </View>
                      {addon.notes ? <Text style={styles.infoHelper}>{addon.notes}</Text> : null}
                      {singleNode ? (
                        <View style={styles.componentCostGrid}>
                          <View style={styles.componentCostCell}>
                            <Text style={styles.infoLabel}>Quantidade na ficha</Text>
                            <QuantityField
                              value={singleNode.qty}
                              unit={singleNode.unit}
                              onChangeText={!canEditAddons ? undefined : value => patchProductAddonComponent?.(product.id, addon.id, 0, { qty: num(value) })}
                              onCommitText={!canEditAddons ? undefined : value => saveProductComponentQuantity?.(product.id, -1, singleNode, num(value))}
                            />
                          </View>
                          <AddonCostCells db={db} node={singleNode} />
                        </View>
                      ) : addonNodes.length ? addonNodes.map((node, index) => (
                        <ComponentNode
                          key={node.key}
                          db={db}
                          node={node}
                          onQtyChange={!canEditAddons ? undefined : value => patchProductAddonComponent?.(product.id, addon.id, index, { qty: num(value) })}
                          onQtyCommit={!canEditAddons ? undefined : value => saveProductComponentQuantity?.(product.id, -1, node, num(value))}
                        />
                      )) : <Text style={styles.infoHelper}>Opção sem custo direto. Obrigatoriedade e regra continuam preservadas.</Text>}
                    </View>
                  );
                })}
              </View>
            );
          }) : <EmptyState text="Produto sem grupos ou adicionais." />}
        </View>
      ) : null}
      {activeProductTab === 'packaging' ? (
        <View style={styles.stack}>
          {computed.nodes.filter(node => node.refType === 'packaging').length ? computed.nodes
            .filter(node => node.refType === 'packaging')
            .map(node => <ComponentNode key={node.key} db={db} node={node} />) : <EmptyState text="Nenhuma embalagem mapeada neste produto." />}
        </View>
      ) : null}
      {activeProductTab === 'purchases' ? (
        <PurchaseRows rows={purchases} />
      ) : null}
      {activeProductTab === 'operation' ? (
        <InfoGrid rows={[
          { label: 'Compra', value: `${computed.nodes.length} vínculo(s)`, helper: 'Custo vem da composição técnica' },
          { label: 'Recebimento', value: 'Conferir componentes', helper: 'Produto vendido não vira compra sozinho' },
          { label: 'Estoque', value: categoryName(db, product.categoryId), helper: 'Camada comercial do cardápio' },
          { label: 'Manipulação', value: safeArray(product.addons).length ? `${safeArray(product.addons).length} grupo(s)` : 'Ficha base', helper: 'Grupos obrigatórios e opcionais preservados' },
          { label: 'Embalagem', value: computed.nodes.some(node => node.refType === 'packaging') ? 'Vinculada' : 'Revisar', helper: 'Precisa estar na ficha para entrar no custo' },
          { label: 'Evidências', value: String(purchases.length), helper: 'Compras herdadas dos componentes' },
        ]} />
      ) : null}
    </DetailShell>
  );
}

function ResourceView({
  db,
  query,
  selectedId,
  setSelectedId,
  collection,
  openModal,
  patchActiveCost,
  patchRecipeComponent,
}) {
  const rows = filterBySearch(safeArray(db[collection]), query, [
    item => item.name,
    item => item.code,
    item => item.description,
    item => item.notes,
    item => item.sourceReference,
    item => item.supplier,
  ]);
  const selected = getById(db, collection, selectedId) || rows[0] || null;

  return (
    <View style={styles.splitLayout}>
      <View style={styles.resourceTablePanel}>
        <TechnicalSectionSummary
          db={db}
          collection={collection}
          rows={rows}
          selectedId={selected?.id}
          onSelect={setSelectedId}
          onPatch={patchActiveCost}
        />
      </View>
      <ResourceDetail
        db={db}
        collection={collection}
        item={selected}
        openModal={openModal}
        patchActiveCost={patchActiveCost}
        patchRecipeComponent={patchRecipeComponent}
      />
    </View>
  );
}

function RecipesView({
  db,
  query,
  selectedId,
  setSelectedId,
  patchRecipeComponent,
  saveRecipeComponentQuantity,
}) {
  const rows = filterBySearch(safeArray(db.recipes), query, [
    item => item.name,
    item => item.code,
    item => item.description,
    item => item.notes,
    item => categoryName(db, item.categoryId),
  ]);
  const selected = getById(db, 'recipes', selectedId) || rows[0] || null;

  return (
    <View style={styles.splitLayout}>
      <View style={styles.resourceTablePanel}>
        <RecipesTable db={db} rows={rows} selectedId={selected?.id} onSelect={setSelectedId} />
      </View>
      <RecipeDetail
        db={db}
        item={selected}
        patchRecipeComponent={patchRecipeComponent}
        saveRecipeComponentQuantity={saveRecipeComponentQuantity}
      />
    </View>
  );
}

const recipeGroupEntries = (db, rows) =>
  Object.entries(groupBy(rows, item => categoryName(db, item.categoryId) || 'Sem categoria'))
    .sort(([left], [right]) => String(left).localeCompare(String(right), 'pt-BR'));

function RecipesTable({ db, rows, selectedId, onSelect }) {
  const calculatedCount = safeArray(rows).filter(item => safeArray(item.components).length > 0).length;
  const reviewCount = safeArray(rows).filter(item => safeArray(item.components).length === 0).length;

  return (
    <View style={styles.panel}>
      <View style={styles.activeCostHeader}>
        <View>
          <Text style={styles.panelTitle}>Preparos</Text>
          <Text style={styles.panelSubtitle}>Receitas internas com rendimento, componentes e custo calculado.</Text>
        </View>
        <Badge>{rows.length} item(ns)</Badge>
      </View>
      <View style={styles.badgeLine}>
        <Badge tone="good">{calculatedCount} calculado(s)</Badge>
        <Badge tone={reviewCount ? 'warn' : 'good'}>{reviewCount} para revisar</Badge>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.activeCostTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.tableHeaderTextWide]}>Preparo</Text>
          <Text style={styles.tableHeaderText}>Rendimento</Text>
          <Text style={styles.tableHeaderText}>Custo ativo</Text>
          <Text style={styles.tableHeaderText}>Base do cálculo</Text>
          <Text style={[styles.tableHeaderText, styles.tableHeaderTextWide]}>Origem resumida</Text>
          <Text style={styles.tableHeaderText}>Auditoria</Text>
            <Text style={styles.tableHeaderText}>Vínculos</Text>
          </View>
          {recipeGroupEntries(db, rows).map(([groupName, groupRows]) => (
            <View key={groupName}>
              <View style={styles.tableGroupHeader}>
                <Text style={styles.tableGroupTitle}>{groupName}</Text>
                <Text style={styles.tableGroupSubtitle}>{groupRows.length} item(ns) nesta família operacional.</Text>
              </View>
              {groupRows.map(item => {
                const summary = activeCostSummary(db, 'recipe', item);
                const audit = recipeAuditSummary(db, item);
                const selected = String(selectedId) === String(item.id);

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.tableRow,
                      audit.tone === 'good' && styles.tableRowGood,
                      audit.tone === 'warn' && styles.tableRowWarn,
                      audit.tone === 'bad' && styles.tableRowBad,
                      selected && styles.tableRowActive,
                    ]}
                    activeOpacity={0.82}
                    onPress={() => onSelect?.(item.id)}
                  >
                    <View style={styles.tableIdentity}>
                      <VisualThumb source={imageForProduct(db, item)} label={item.name} size="sm" />
                      <View style={styles.tableIdentityText}>
                        <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.rowSubtitle} numberOfLines={2}>
                          {[item.code || item.sku, item.description].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.tableCell}>{decimal(item.yieldQty, 3)} {item.yieldUnit || 'un'}</Text>
                    <Text style={styles.tableCell}>{money(summary.activePrimaryCost)} / {summary.primaryUnit}</Text>
                    <Text style={styles.tableCell}>{preciseMoney(summary.activeBaseCost)} / {summary.baseUnit}</Text>
                    <Text style={[styles.tableCell, styles.tableCellWide]}>
                      Receita proporcional{'\n'}{audit.source}
                    </Text>
                    <View style={styles.tableCell}>
                      <Badge tone={audit.tone}>{audit.label}</Badge>
                    </View>
                    <View style={styles.tableCell}>
                      {audit.evidence ? (
                        <View style={styles.evidenceLinkGroup}>
                          <TouchableOpacity
                            style={styles.sourceLinkButton}
                            activeOpacity={0.82}
                            onPress={() => onSelect?.(item.id)}
                          >
                            <Text style={styles.sourceLinkText}>Mapa</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.sourceLinkButton}
                            activeOpacity={0.82}
                            onPress={() => onSelect?.(item.id)}
                          >
                            <Text style={styles.sourceLinkText} numberOfLines={1}>{audit.linkLabel}</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <Text style={styles.tableCellText} numberOfLines={2}>{audit.linkLabel}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function RecipeDetail({ db, item, patchRecipeComponent, saveRecipeComponentQuantity }) {
  if (!item) return <EmptyState />;
  const summary = activeCostSummary(db, 'recipe', item);
  const batchCost = recipeBatchCost(db, item);
  const audit = recipeAuditSummary(db, item);

  return (
    <DetailShell
      title={item.name}
      subtitle={item.description || item.notes || 'Receita interna da engenharia'}
      badges={[
        { label: 'Preparo', tone: 'neutral' },
        { label: audit.label, tone: audit.tone },
        { label: item.code || item.id, tone: 'neutral' },
      ]}
    >
      <View style={styles.costSummaryHero}>
        <View>
          <Text style={styles.infoLabel}>Custo ativo</Text>
          <Text style={styles.costSummaryValue}>{money(summary.activePrimaryCost)} / {summary.primaryUnit}</Text>
          <Text style={styles.infoHelper}>{preciseMoney(summary.activeBaseCost)} / {summary.baseUnit}</Text>
        </View>
        <View style={styles.costSummaryMeta}>
          <Text style={styles.infoLabel}>Origem</Text>
          <Text style={styles.rowTitle}>Receita proporcional</Text>
          <Text style={styles.infoHelper} numberOfLines={2}>
            {audit.source}
          </Text>
        </View>
      </View>

      <InfoGrid rows={[
        { label: 'Custo do lote', value: money(batchCost), helper: 'Soma dos componentes' },
        { label: 'Rendimento', value: `${decimal(item.yieldQty, 3)} ${item.yieldUnit || 'un'}`, helper: 'Base da divisão do lote' },
        { label: 'Unidade ERP', value: item.erpUnit || item.yieldUnit || 'UN', helper: item.erpProductType || 'preparation' },
        { label: 'Vínculos herdados', value: audit.linkLabel, helper: 'Vêm dos ingredientes e preparos usados' },
      ]} />

      <View style={styles.panelNested}>
        <Text style={styles.panelTitle}>Receita e rendimento</Text>
        <Text style={styles.panelSubtitle}>
          Altere as quantidades dos componentes para recalcular o custo do lote e da unidade técnica.
        </Text>
        {safeArray(item.components).length ? safeArray(item.components).map((component, index) => {
          const componentRecord = getById(db, resourceCollectionForRef(component.refType), component.refId);
          const componentAudit = componentRecord ? activeCostAudit(db, component.refType, componentRecord) : null;
          const node = {
            key: `${component.relationId || ''}:${component.refType}:${component.refId}:${component.qty}`,
            relationId: component.relationId || '',
            productIri: component.productIri || '',
            productGroupIri: component.productGroupIri || '',
            productChildIri: component.productChildIri || '',
            productType: component.productType || '',
            price: component.price,
            active: component.active !== false,
            refType: component.refType,
            refId: component.refId,
            record: componentRecord,
            name: resourceName(db, component.refType, component.refId),
            qty: component.qty,
            unit: component.unit || baseUnitForNode(db, component),
            cost: componentCost(db, component),
            pricingMode: 'receita',
            children: [],
          };

          return (
            <View key={node.key} style={styles.recipeComponentBlock}>
              <View style={styles.recipeComponentAudit}>
                <Badge tone={componentAudit?.tone || 'warn'}>{componentAudit?.label || 'Revisar'}</Badge>
                <Text style={styles.infoHelper} numberOfLines={2}>
                  {componentAudit?.linkLabel || 'Sem evidência de custo'}
                </Text>
              </View>
              <ComponentNode
                db={db}
                node={node}
                onQtyChange={value => patchRecipeComponent?.(item.id, index, { qty: num(value) })}
                onQtyCommit={value => saveRecipeComponentQuantity?.(item.id, index, node, value)}
              />
            </View>
          );
        }) : <EmptyState text="Nenhum componente vinculado a este preparo." />}
      </View>
    </DetailShell>
  );
}

function TechnicalSectionSummary({ db, collection, rows, selectedId, onSelect, onPatch }) {
  const meta = RESOURCE_META[collection];
  const refType = meta.refType;
  const summaries = safeArray(rows).map(item => activeCostSummary(db, refType, item));
  const reviewCount = safeArray(rows).filter(item => ['review', 'estimated', 'manual'].includes(item.evidenceType || item.sourceType)).length;
  const purchaseCount = summaries.reduce((sum, item) => sum + item.purchaseCount, 0);
  const documentedCount = safeArray(rows).filter(item => (item.evidenceType || item.sourceType) === 'documented').length;

  return (
    <View style={styles.panel}>
      <View style={styles.activeCostHeader}>
        <View>
          <Text style={styles.panelTitle}>Resumo técnico de {meta.plural.toLowerCase()}</Text>
          <Text style={styles.panelSubtitle}>A lista escolhe o item. A ficha ao lado concentra custo ativo, usos, compras e composição.</Text>
        </View>
        <Badge>{rows.length} item(ns)</Badge>
      </View>
      <View style={styles.metricGrid}>
        <MetricCard label="Itens técnicos" value={String(rows.length)} />
        <MetricCard label="Comprovados" value={String(documentedCount)} tone="good" />
        <MetricCard label="Compras vinculadas" value={String(purchaseCount)} />
        <MetricCard label="Revisões" value={String(reviewCount)} tone={reviewCount ? 'warn' : 'good'} />
      </View>
      <ActiveCostTable
        db={db}
        collection={collection}
        refType={refType}
        rows={rows}
        selectedId={selectedId}
        onSelect={onSelect}
        onPatch={onPatch}
      />
    </View>
  );
}

function ActiveCostTable({ db, collection, refType, rows, selectedId, onSelect, onPatch }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.activeCostTable}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.tableHeaderTextWide]}>Item</Text>
          <Text style={styles.tableHeaderText}>Unidade</Text>
          <Text style={styles.tableHeaderText}>Custo ativo</Text>
          <Text style={styles.tableHeaderText}>Base do cálculo</Text>
          <Text style={[styles.tableHeaderText, styles.tableHeaderTextWide]}>Origem resumida</Text>
          <Text style={styles.tableHeaderText}>Auditoria</Text>
          <Text style={styles.tableHeaderText}>Vínculos</Text>
        </View>
        {Object.entries(groupBy(safeArray(rows), item => categoryName(db, item.categoryId) || 'Sem categoria'))
          .sort(([left], [right]) => String(left).localeCompare(String(right), 'pt-BR'))
          .map(([groupName, groupRows]) => (
            <View key={groupName}>
              <View style={styles.tableGroupHeader}>
                <Text style={styles.tableGroupTitle}>{groupName}</Text>
                <Text style={styles.tableGroupSubtitle}>{groupRows.length} item(ns) nesta família operacional.</Text>
              </View>
              {groupRows.map(item => {
                const summary = activeCostSummary(db, refType, item);
                const audit = activeCostAudit(db, refType, item);
                const selected = String(selectedId) === String(item.id);

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.tableRow,
                      audit.tone === 'good' && styles.tableRowGood,
                      audit.tone === 'warn' && styles.tableRowWarn,
                      audit.tone === 'bad' && styles.tableRowBad,
                      selected && styles.tableRowActive,
                    ]}
                    activeOpacity={0.82}
                    onPress={() => onSelect?.(item.id)}
                  >
                    <View style={styles.tableIdentity}>
                      <VisualThumb source={buildImageSource(resolveEntityCoverUrl(item))} label={item.name} size="sm" />
                      <View style={styles.tableIdentityText}>
                        <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.rowSubtitle} numberOfLines={2}>
                          {[resourceTypeLabel(refType), item.code || item.sku].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.tableCell}>{summary.primaryUnit}{'\n'}<Text style={styles.infoHelper}>ERP {item.erpUnit || item.baseUnit || 'UN'}</Text></Text>
                    <View style={styles.tableCell}>
                      {selected && onPatch ? (
                        <View style={styles.tableEditableCost}>
                          <TextInput
                            value={String(item.manualUnitCost ?? item.fixedUnitCost ?? item.overrideUnitCost ?? summary.activePrimaryCost)}
                            onChangeText={value => onPatch(collection, item.id, { activeCostMode: 'manual', manualUnitCost: num(value), evidenceType: 'manual' })}
                            keyboardType="numeric"
                            style={styles.tableInput}
                          />
                          <Text style={styles.quantityUnit}>/{summary.primaryUnit}</Text>
                        </View>
                      ) : (
                        <Text style={styles.tableCellText}>{money(summary.activePrimaryCost)} / {summary.primaryUnit}</Text>
                      )}
                    </View>
                    <Text style={styles.tableCell}>{preciseMoney(summary.activeBaseCost)} / {summary.baseUnit}</Text>
                    <Text style={[styles.tableCell, styles.tableCellWide]} numberOfLines={3}>{summary.source}</Text>
                    <View style={styles.tableCell}>
                      <Badge tone={audit.tone}>{audit.label}</Badge>
                    </View>
                    <View style={styles.tableCell}>
                      <Text style={styles.tableCellText} numberOfLines={2}>{audit.linkLabel}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
      </View>
    </ScrollView>
  );
}

function ResourceDetail({ db, collection, item, openModal, patchActiveCost, patchRecipeComponent }) {
  if (!item) return <EmptyState />;
  const meta = RESOURCE_META[collection];
  const refType = meta.refType;
  const uses = productUsesForResource(db, refType, item.id);
  const purchases = ['ingredients', 'packaging'].includes(collection)
    ? purchaseItemsForResource(db, refType, item.id)
    : [];

  const costSummary = activeCostSummary(db, refType, item);
  const rows = collection === 'ingredients'
    ? [
      { label: 'Compra', value: `${money(item.purchaseCost)} / ${decimal(item.purchaseQty)} ${item.baseUnit || 'un'}`, helper: item.supplier },
      { label: 'Custo unitário', value: preciseMoney(ingredientUnitCost(item)), helper: `por ${item.baseUnit || 'un'}` },
      { label: 'Custo canônico', value: comparableCostLabel('ingredient', item), helper: `Perda ${percent(item.wastePct)}` },
      { label: 'Fonte ativa', value: costSummary.modeLabel, helper: costSummary.source },
    ]
    : collection === 'recipes'
      ? [
        { label: 'Rendimento', value: `${decimal(item.yieldQty)} ${item.yieldUnit || 'un'}`, helper: item.storage },
        { label: 'Custo do lote', value: money(recipeBatchCost(db, item)), helper: `${safeArray(item.components).length} componente(s)` },
        { label: 'Custo unitário', value: preciseMoney(recipeUnitCost(db, item)), helper: `por ${item.yieldUnit || 'un'}` },
        { label: 'Fonte ativa', value: costSummary.modeLabel, helper: costSummary.source },
      ]
      : [
        { label: 'Pacote', value: `${money(item.purchaseCost)} / ${decimal(item.purchaseQty)} un`, helper: item.supplier },
        { label: 'Custo unitário', value: money(packagingUnitCost(item)), helper: item.costImpact || 'CMV/repasse' },
        { label: 'ERP', value: item.erpUnit || 'UN', helper: item.sourceReference },
        { label: 'Fonte ativa', value: costSummary.modeLabel, helper: costSummary.source },
      ];

  return (
    <DetailShell
      title={item.name}
      subtitle={item.description || item.notes}
      badges={[
        { label: meta.singular, tone: 'neutral' },
        { label: evidenceLabel(item.evidenceType || item.sourceType), tone: (item.evidenceType || item.sourceType) === 'documented' ? 'good' : 'warn' },
        { label: item.code || item.id, tone: 'neutral' },
      ]}
      actions={<IconButton icon="edit-3" label="Editar" onPress={() => openModal({ collection, id: item.id })} />}
    >
      <ActiveCostPanel db={db} collection={collection} refType={refType} item={item} onPatch={patchActiveCost} />
      <InfoGrid rows={rows} />
      {collection === 'recipes' ? (
        <View style={styles.panelNested}>
          <Text style={styles.panelTitle}>Componentes do preparo</Text>
          <Text style={styles.panelSubtitle}>Ajustes de quantidade recalculam o custo do lote e a leitura unitária do preparo.</Text>
          {safeArray(item.components).map((component, index) => (
            <ComponentNode
              key={`${component.refType}-${component.refId}-${component.qty}`}
              db={db}
              node={{
                key: `${component.refType}:${component.refId}:${component.qty}`,
                refType: component.refType,
                refId: component.refId,
                record: getById(db, resourceCollectionForRef(component.refType), component.refId),
                name: resourceName(db, component.refType, component.refId),
                qty: component.qty,
                unit: component.unit || baseUnitForNode(db, component),
                cost: componentCost(db, component),
                pricingMode: 'receita',
                children: [],
              }}
              onQtyChange={value => patchRecipeComponent?.(item.id, index, { qty: num(value) })}
            />
          ))}
        </View>
      ) : null}
      <View style={styles.panelNested}>
        <Text style={styles.panelTitle}>Usos diretos e indiretos</Text>
        {uses.length ? uses.map(use => (
          <RowCard key={use.key} title={use.title} subtitle={use.meta} badges={[{ label: use.type, tone: 'neutral' }]} />
        )) : <EmptyState text="Nenhum uso encontrado ainda." />}
      </View>
      {purchases.length ? <PurchaseRows rows={purchases} /> : null}
    </DetailShell>
  );
}

const SUPPLY_PARENT_PRODUCT_TYPES = ['product', 'manufactured', 'custom', 'service'];

const normalizeUnitToken = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '')
    .trim()
    .toLowerCase();

const productLabel = product =>
  String(product?.product || product?.name || product?.description || '').trim();

const resolveProductUnitId = (units, token) => {
  const normalizedTarget = normalizeUnitToken(token);
  if (!normalizedTarget) return '';

  const match = safeArray(units).find(unit => {
    const candidates = [
      unit?.productUnit,
      unit?.unit,
      unit?.label,
      unit?.code,
      unit?.name,
      unit?.id,
    ];

    return candidates.some(candidate => normalizeUnitToken(candidate) === normalizedTarget);
  });

  return match?.id ? String(match.id) : '';
};

const supplyStatusLabel = status => ({
  synced: 'Sincronizado',
  divergent: 'Preço diferente',
  missing: 'Sem ERP',
  duplicate: 'Duplicado',
  type_conflict: 'Tipo divergente',
}[status] || 'Pendente');

const supplyStatusTone = status => {
  if (status === 'synced') return 'good';
  if (status === 'duplicate') return 'bad';
  if (status === 'divergent' || status === 'missing' || status === 'type_conflict') return 'warn';
  return 'neutral';
};

const supplyParentStatusLabel = status => ({
  synced: 'Vínculo pronto',
  missing: 'Pai ausente',
  duplicate: 'Pai duplicado',
  type_conflict: 'Pai em tipo errado',
}[status] || 'Pendente');

export function SupplyResourceView({
  db,
  query,
  selectedId,
  setSelectedId,
  collection,
  patchActiveCost,
  showError,
  showSuccess,
}) {
  const peopleStore = useStore('people');
  const productsStore = useStore('products');
  const productUnitStore = useStore('product_unit');
  const productGroupProductStore = useStore('product_group_product');

  const { currentCompany } = peopleStore.getters;
  const companyId = currentCompany?.id || '';
  const companyIri = companyId ? `/people/${normalizeEntityId(companyId)}` : '';

  const [catalogProducts, setCatalogProducts] = useState([]);
  const [unitItems, setUnitItems] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [syncingId, setSyncingId] = useState('');
  const [syncingAll, setSyncingAll] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState(null);

  const loadCatalog = useCallback(async () => {
    if (!companyId) {
      setCatalogProducts([]);
      setUnitItems([]);
      setLastRefreshAt(null);
      return;
    }

    setLoadingCatalog(true);
    try {
      const [allProducts, allUnits] = await Promise.all([
        fetchAllPagedItems({
          actions: productsStore.actions,
          params: {
          company: companyId,
          people: companyIri,
          active: 1,
          'order[product]': 'ASC',
          },
          maxPages: 6,
        }),
        fetchAllPagedItems({
          actions: productUnitStore.actions,
          params: {
          people: companyIri,
          },
          maxPages: 3,
        }),
      ]);

      setCatalogProducts(allProducts);
      setUnitItems(allUnits);
      setLastRefreshAt(new Date());
    } catch (error) {
      const message =
        error?.response?.data?.['hydra:description'] ||
        error?.response?.data?.detail ||
        error?.message ||
        'Nao foi possivel ler o catalogo do ERP para sincronizar os insumos.';
      setCatalogProducts([]);
      setUnitItems([]);
      showError?.(message);
    } finally {
      setLoadingCatalog(false);
    }
  }, [companyId, companyIri, productUnitStore.actions, productsStore.actions, showError]);

  useFocusEffect(
    useCallback(() => {
      loadCatalog();
    }, [loadCatalog]),
  );

  const rows = useMemo(
    () => buildSupplySyncRows(db, collection, catalogProducts),
    [catalogProducts, collection, db],
  );

  const filteredRows = useMemo(
    () => filterBySearch(rows, query, [
      item => item.name,
      item => item.code,
      item => item.description,
      item => item.notes,
      item => item.supplier,
      item => item.localCostLabel,
      item => safeArray(item.parentRows).map(parent => parent.productName).join(' '),
      item => supplyStatusLabel(item.remoteSupplyStatus),
    ]),
    [query, rows],
  );

  const selected = filteredRows.find(item => String(item.id) === String(selectedId)) || filteredRows[0] || rows[0] || null;

  const metrics = useMemo(() => {
    const synced = rows.filter(row => row.remoteSupplyStatus === 'synced').length;
    const divergent = rows.filter(row => row.remoteSupplyStatus === 'divergent').length;
    const missing = rows.filter(row => row.remoteSupplyStatus === 'missing' || row.remoteSupplyStatus === 'type_conflict').length;
    const duplicate = rows.filter(row => row.remoteSupplyStatus === 'duplicate').length;
    return {
      total: rows.length,
      synced,
      divergent,
      missing,
      duplicate,
    };
  }, [rows]);

  const syncSupplyRow = useCallback(async (row, options = {}) => {
    const { silent = false, reload = true } = options;

    if (!row) {
      return { ok: false, warningCount: 1 };
    }

    if (!companyId) {
      if (!silent) showError?.('Selecione uma empresa antes de persistir os insumos.');
      return { ok: false, warningCount: 1 };
    }

    if (row.remoteSupplyStatus === 'duplicate' || row.remoteSupplyStatus === 'type_conflict') {
      if (!silent) {
        showError?.(`${row.name}: já existe cadastro conflitante no ERP para este código.`);
      }
      return { ok: false, warningCount: 1 };
    }

    const unitId = resolveProductUnitId(unitItems, row.unitToken);
    if (!unitId) {
      if (!silent) {
        showError?.(`${row.name}: unidade ${row.unitToken} nao encontrada no ERP.`);
      }
      return { ok: false, warningCount: 1 };
    }

    setSyncingId(String(row.id));

    try {
      const savedProduct = await productsStore.actions.save({
        ...(row.remoteSupplyId ? { id: row.remoteSupplyId } : {}),
        product: row.name,
        sku: row.code || row.id,
        type: row.productType,
        company: companyIri,
        productUnit: `/product_unities/${unitId}`,
        description: row.description || row.notes || '',
        price: num(row.localCost),
        featured: false,
        productCondition: 'new',
        active: true,
      });

      const savedProductId = normalizeEntityId(
        savedProduct?.id ||
        savedProduct?.['@id'] ||
        row.remoteSupplyId ||
        row.remoteSupplyProduct?.id,
      );
      const childIri = savedProductId ? `/products/${savedProductId}` : row.remoteSupplyIri;
      if (!childIri) {
        throw new Error('Nao foi possivel resolver o produto persistido no ERP.');
      }
      const parentRows = safeArray(row.parentRows).filter(parentRow => parentRow.remoteParentIri);
      const unresolvedCount = safeArray(row.parentRows).length - parentRows.length;
      let duplicateLinkCount = 0;

      for (const parentRow of parentRows) {
        const relationItems = await fetchAllPagedItems({
          actions: productGroupProductStore.actions,
          params: {
            product: parentRow.remoteParentIri,
            productChild: childIri,
            productType: row.productType,
          },
          maxPages: 3,
        }).catch(() => []);
        if (relationItems.length > 1) {
          duplicateLinkCount += relationItems.length - 1;
        }
        const existingRelation = relationItems[0] || null;

        await productGroupProductStore.actions.save({
          ...(existingRelation?.id ? { id: existingRelation.id } : {}),
          ...(existingRelation?.productGroup ? {
            productGroup: existingRelation.productGroup?.['@id'] || existingRelation.productGroup,
          } : {}),
          product: parentRow.remoteParentIri,
          productChild: childIri,
          productType: row.productType,
          quantity: num(parentRow.qty) || 1,
          price: num(row.localCost),
          active: true,
        });
      }

      if (reload) {
        await loadCatalog();
      }

      const messageParts = [`${row.name} persistido no ERP.`];
      if (row.remoteSupplyStatus === 'divergent') {
        messageParts.push(`Preco ajustado de ${money(row.remoteSupplyPrice)} para ${money(row.localCost)}.`);
      }
      if (unresolvedCount > 0) {
        messageParts.push(`${unresolvedCount} pai(s) sem vínculo no ERP.`);
      }
      if (duplicateLinkCount > 0) {
        messageParts.push(`${duplicateLinkCount} vínculo(s) duplicado(s) identificados.`);
      }

      if (!silent) {
        if (unresolvedCount > 0 || duplicateLinkCount > 0) {
          showError?.(messageParts.join(' '));
        } else {
          showSuccess?.(messageParts.join(' '));
        }
      }

      return {
        ok: true,
        unresolvedCount,
        duplicateLinkCount,
      };
    } catch (error) {
      const message =
        error?.response?.data?.['hydra:description'] ||
        error?.response?.data?.detail ||
        error?.message ||
        'Falha ao persistir o item no ERP.';
      if (!silent) showError?.(message);
      return { ok: false, warningCount: 1 };
    } finally {
      setSyncingId('');
    }
  }, [companyId, companyIri, loadCatalog, productGroupProductStore.actions, productsStore.actions, showError, showSuccess, unitItems]);

  const syncVisibleRows = useCallback(async () => {
    if (!filteredRows.length) return;

    setSyncingAll(true);
    try {
      let synced = 0;
      let warnings = 0;

      for (const row of filteredRows) {
        const result = await syncSupplyRow(row, { silent: true, reload: false });
        if (result?.ok) synced += 1;
        if (!result?.ok || (result?.unresolvedCount || 0) > 0 || (result?.duplicateLinkCount || 0) > 0) {
          warnings += 1;
        }
      }

      await loadCatalog();

      if (warnings > 0) {
        showError?.(`${synced} item(ns) persistidos com ${warnings} alerta(s).`);
      } else {
        showSuccess?.(`${synced} item(ns) persistidos no ERP.`);
      }
    } finally {
      setSyncingAll(false);
    }
  }, [filteredRows, loadCatalog, showError, showSuccess, syncSupplyRow]);

  const selectedParentRows = safeArray(selected?.parentRows);
  const selectedParentResolved = selectedParentRows.filter(parent => parent.remoteParentIri);
  const selectedWarnings = [
    selected?.remoteSupplyStatus === 'divergent' ? 'Preço local diferente do ERP atual.' : '',
    selected?.remoteSupplyStatus === 'missing' ? 'Insumo ainda nao existe no ERP.' : '',
    selected?.remoteSupplyStatus === 'type_conflict' ? 'Existe um cadastro com este código em outro tipo.' : '',
    selected?.remoteSupplyStatus === 'duplicate' ? 'Existe mais de um cadastro com este código.' : '',
    selected?.unresolvedParentCount > 0 ? `${selected.unresolvedParentCount} pai(s) sem vínculo no ERP.` : '',
  ].filter(Boolean);

  return (
    <View style={styles.splitLayout}>
      <View style={styles.panel}>
        <View style={styles.activeCostHeader}>
          <View style={styles.detailHeaderText}>
            <Text style={styles.panelTitle}>
              {RESOURCE_META[collection]?.plural || 'Insumos'}
            </Text>
            <Text style={styles.panelSubtitle}>
              Persiste somente {collection === 'ingredients' ? 'matérias-primas' : 'embalagens'}.
              Produtos de venda e componentes continuam somente leitura.
            </Text>
          </View>
          <View style={styles.detailActions}>
            <IconButton
              icon="refresh-cw"
              label="Atualizar ERP"
              onPress={loadCatalog}
              disabled={loadingCatalog || syncingAll}
            />
            <IconButton
              icon="save"
              label={syncingAll ? 'Sincronizando...' : 'Sincronizar visíveis'}
              onPress={syncVisibleRows}
              disabled={loadingCatalog || syncingAll || !filteredRows.length}
            />
          </View>
        </View>
        <View style={styles.metricGrid}>
          <MetricCard label="Itens" value={String(metrics.total)} />
          <MetricCard label="Sincronizados" value={String(metrics.synced)} tone="good" />
          <MetricCard label="Divergentes" value={String(metrics.divergent)} tone="warn" />
          <MetricCard label="Sem ERP" value={String(metrics.missing)} tone="warn" />
          <MetricCard label="Duplicados" value={String(metrics.duplicate)} tone="bad" />
        </View>
        {lastRefreshAt ? (
          <Text style={styles.infoHelper}>
            Última leitura do ERP: {lastRefreshAt.toLocaleString('pt-BR')}
          </Text>
        ) : null}
      </View>

      <View style={styles.splitLayout}>
        <View style={styles.listPanel}>
          {filteredRows.map(item => (
            <RowCard
              key={item.id}
              title={item.name}
              subtitle={item.description || item.notes || item.supplier || ''}
              selected={selected?.id === item.id}
              onPress={() => setSelectedId(item.id)}
              right={<Text style={styles.rowMoney}>{money(item.localCost)}</Text>}
              badges={[
                { label: item.localCostLabel, tone: 'neutral' },
                { label: `${item.parentCount} pai(s)`, tone: item.parentCount ? 'good' : 'warn' },
                { label: supplyStatusLabel(item.remoteSupplyStatus), tone: supplyStatusTone(item.remoteSupplyStatus) },
              ]}
            />
          ))}
        </View>

        {selected ? (
          <DetailShell
            title={selected.name}
            subtitle={selected.description || selected.notes || selected.supplier || ''}
            badges={[
              { label: RESOURCE_META[collection]?.singular || 'Insumo', tone: 'neutral' },
              { label: selected.code || selected.id, tone: 'neutral' },
              { label: supplyStatusLabel(selected.remoteSupplyStatus), tone: supplyStatusTone(selected.remoteSupplyStatus) },
            ]}
            actions={(
              <View style={styles.detailActions}>
                <IconButton
                  icon="refresh-cw"
                  label="Recarregar"
                  onPress={loadCatalog}
                  disabled={loadingCatalog || syncingAll}
                />
                <IconButton
                  icon="save"
                  label={syncingId === String(selected.id) ? 'Salvando...' : 'Persistir'}
                  onPress={() => syncSupplyRow(selected)}
                  disabled={loadingCatalog || syncingAll || syncingId === String(selected.id)}
                />
              </View>
            )}
          >
            {selectedWarnings.length ? (
              <View style={styles.activeCostPanel}>
                <Text style={styles.panelTitle}>Atenção</Text>
                {selectedWarnings.map(message => (
                  <Text key={message} style={styles.infoHelper}>{message}</Text>
                ))}
              </View>
            ) : null}
            <ActiveCostPanel
              db={db}
              collection={collection}
              refType={selected.refType}
              item={selected}
              onPatch={patchActiveCost}
            />
            <InfoGrid rows={[
              { label: 'Custo local', value: `${money(selected.localCost)} / ${selected.unitToken}`, helper: selected.localCostLabel },
              { label: 'ERP atual', value: selected.remoteSupplyProduct ? productLabel(selected.remoteSupplyProduct) : 'Sem cadastro', helper: selected.remoteSupplyProduct?.sku || selected.code },
              { label: 'Preço ERP', value: selected.remoteSupplyProduct ? money(selected.remoteSupplyPrice) : '—', helper: selected.remoteSupplyStatus === 'divergent' ? `Diferença ${money(selected.supplyPriceDelta)}` : supplyStatusLabel(selected.remoteSupplyStatus) },
              { label: 'Pais', value: String(selected.parentCount), helper: `${selected.resolvedParentCount} resolvido(s) · ${selected.unresolvedParentCount} sem vínculo` },
              { label: 'Custo total dos pais', value: money(selected.totalParentCost), helper: 'Soma do uso local na engenharia' },
              { label: 'Leitura do ERP', value: selected.remoteSupplyIri || 'Ainda não existe', helper: selected.remoteSupplyId ? `ID ${selected.remoteSupplyId}` : 'Será criado no sync' },
            ]} />
            <View style={styles.panelNested}>
              <Text style={styles.panelTitle}>Pais vinculados</Text>
              <Text style={styles.panelSubtitle}>
                Somente produtos de venda já encontrados no ERP serão vinculados automaticamente.
              </Text>
              {selectedParentRows.length ? selectedParentRows.map(parentRow => (
                <RowCard
                  key={parentRow.productId}
                  title={parentRow.productName}
                  subtitle={parentRow.category}
                  meta={`${decimal(parentRow.qty, 3)} ${parentRow.unit || 'un'} · ${money(parentRow.cost)}`}
                  right={<Text style={styles.rowMoney}>{parentRow.remoteParentIri || 'Sem ERP'}</Text>}
                  badges={[
                    { label: supplyParentStatusLabel(parentRow.remoteParentStatus), tone: supplyStatusTone(parentRow.remoteParentStatus) },
                    { label: parentRow.productCode, tone: 'neutral' },
                  ]}
                />
              )) : <EmptyState text="Nenhum pai técnico encontrado nesta base local." />}
            </View>
            {selectedParentResolved.length ? (
              <View style={styles.panelNested}>
                <Text style={styles.panelTitle}>Pais prontos para vínculo</Text>
                {selectedParentResolved.map(parentRow => (
                  <RowCard
                    key={`${parentRow.productId}-erp`}
                    title={parentRow.productName}
                    subtitle={parentRow.remoteParentProduct?.product || parentRow.remoteParentProduct?.name || parentRow.category}
                    meta={`${decimal(parentRow.qty, 3)} ${parentRow.unit || 'un'} · ${money(parentRow.cost)}`}
                    badges={[{ label: supplyParentStatusLabel(parentRow.remoteParentStatus), tone: supplyStatusTone(parentRow.remoteParentStatus) }]}
                  />
                ))}
              </View>
            ) : null}
            {selected.refType === 'ingredient' || selected.refType === 'packaging' ? (
              <PurchaseRows rows={purchaseItemsForResource(db, selected.refType, selected.id)} />
            ) : null}
          </DetailShell>
        ) : <EmptyState text="Selecione um item para ver os vínculos e a persistência no ERP." />}
      </View>
    </View>
  );
}

function baseUnitForNode(db, component) {
  const record = getById(db, resourceCollectionForRef(component.refType), component.refId);
  if (component.refType === 'recipe') return record?.yieldUnit || 'un';
  return record?.baseUnit || record?.erpUnit || 'un';
}

function ActiveCostPanel({ db, collection, refType, item, onPatch }) {
  const summary = activeCostSummary(db, refType, item);
  const options = activeCostOptionsForRef(refType);
  const selectedLabel = options.find(option => option.value === summary.mode)?.label || summary.modeLabel;
  const canEdit = Boolean(onPatch && collection && item?.id);
  const manualValue = item.manualUnitCost ?? item.fixedUnitCost ?? item.overrideUnitCost ?? summary.activePrimaryCost;

  const patch = patchValue => onPatch?.(collection, item.id, patchValue);

  return (
    <View style={styles.activeCostPanel}>
      <View style={styles.activeCostHeader}>
        <View>
          <Text style={styles.panelTitle}>Custo ativo da Engenharia</Text>
          <Text style={styles.panelSubtitle}>Valor que alimenta produtos, preparos, grupos e adicionais nesta base local.</Text>
        </View>
        <Badge tone={summary.mode === 'review' ? 'warn' : 'good'}>{selectedLabel}</Badge>
      </View>
      {canEdit ? (
        <View style={styles.costControlPanel}>
          <View style={styles.costModeList}>
            {options.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[styles.costModeButton, summary.mode === option.value && styles.costModeButtonActive]}
                onPress={() => patch({ activeCostMode: option.value })}
              >
                <Text style={[styles.costModeText, summary.mode === option.value && styles.costModeTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.costManualRow}>
            <Field
              label={`Valor fixado por ${summary.primaryUnit}`}
              value={manualValue}
              inputProps={{ keyboardType: 'numeric' }}
              onChangeText={value => patch({ activeCostMode: 'manual', manualUnitCost: num(value), evidenceType: 'manual' })}
            />
            <Field
              label="Nota da decisão"
              value={item.activeCostNote || ''}
              onChangeText={value => patch({ activeCostNote: value })}
            />
          </View>
        </View>
      ) : null}
      <InfoGrid rows={[
        { label: 'Custo canônico ativo', value: `${money(summary.activePrimaryCost)} / ${summary.primaryUnit}`, helper: summary.source },
        { label: 'Leitura de cálculo', value: `${preciseMoney(summary.activeBaseCost)} / ${summary.baseUnit}`, helper: 'Usado ao multiplicar quantidades da ficha' },
        { label: 'Cadastro atual', value: `${money(summary.registeredPrimaryCost)} / ${summary.primaryUnit}`, helper: 'Valor base antes da decisão ativa' },
        { label: 'Histórico vinculado', value: `${summary.purchaseCount} compra(s)`, helper: summary.latest ? `${formatDate(summary.latest.date)} · ${summary.latest.supplierName}` : 'Sem compra vinculada' },
      ]} />
    </View>
  );
}

function PurchaseRows({ rows }) {
  if (!safeArray(rows).length) return <EmptyState text="Nenhuma compra vinculada." />;
  return (
    <View style={styles.panelNested}>
      <Text style={styles.panelTitle}>Histórico de compra</Text>
      {rows.map(row => (
        <RowCard
          key={row.id}
          title={row.description || row.resourceName || 'Item comprado'}
          subtitle={`${formatDate(row.date)} · ${row.supplierName || 'Fornecedor'}`}
          meta={`${decimal(row.qty, 3)} ${row.unit || 'un'} · unit ${money(row.unitPrice)} · ${paymentLabel(row.paymentStatus)}`}
          right={<Text style={styles.rowMoney}>{money(row.totalPrice || row.totalAmount)}</Text>}
          badges={[{ label: `${safeArray(row.inputs).length} evid.`, tone: safeArray(row.inputs).length ? 'good' : 'warn' }]}
        />
      ))}
    </View>
  );
}

function ResaleView(props) {
  const { db, query, selectedId, setSelectedId, openModal } = props;
  const rows = filterBySearch(resaleItems(db), query, [item => item.name, item => item.description, item => item.notes]);
  const selected = getById(db, 'products', selectedId) || rows[0] || null;
  return (
    <View style={styles.splitLayout}>
      <View style={styles.listPanel}>
        {rows.map(item => {
          const computed = computeProduct(db, item.id);
          return (
            <RowCard
              key={item.id}
              title={item.name}
              subtitle={categoryName(db, item.categoryId)}
              imageSource={imageForProduct(db, item)}
              selected={selected?.id === item.id}
              onPress={() => setSelectedId(item.id)}
              right={<Text style={styles.rowMoney}>{money(computed?.salePrice || item.salePrice)}</Text>}
              badges={[{ label: 'Revenda', tone: 'neutral' }]}
            />
          );
        })}
      </View>
      <ProductDetail db={db} computed={computeProduct(db, selected?.id)} activeProductTab="summary" setActiveProductTab={() => {}} openModal={openModal} readOnly />
    </View>
  );
}

function PurchasesView({ db, query, selectedId, setSelectedId, openModal }) {
  const rows = filterBySearch(safeArray(db.purchaseOrders), query, [
    item => item.label,
    item => item.documentNumber,
    item => getById(db, 'suppliers', item.supplierId)?.name,
    item => item.notes,
  ]).sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));
  const selected = getById(db, 'purchaseOrders', selectedId) || rows[0] || null;
  const items = safeArray(db.purchaseItems).filter(item => item.orderId === selected?.id);
  const inputs = linkedInputsForOrder(db, selected);
  const families = filterBySearch(purchaseFamilyEntries(db), query, [
    item => item.familyName,
    item => item.supplierSummary,
    item => item.latest?.description,
    item => item.latest?.documentNumber,
    item => item.latest?.orderLabel,
  ]);
  const totalFamilyAmount = families.reduce((sum, family) => sum + num(family.totalAmount), 0);
  const suppliersCount = new Set(families.flatMap(family => safeArray(family.rows).map(row => row.supplierName).filter(Boolean))).size;

  return (
    <View style={styles.stack}>
      <View style={styles.panel}>
        <View style={styles.activeCostHeader}>
          <View>
            <Text style={styles.panelTitle}>Mapa auditável de compras</Text>
            <Text style={styles.panelSubtitle}>Resumo por família comparável. A compra selecionada abaixo mostra nota, itens e arquivos.</Text>
          </View>
          <Badge>{families.length} família(s)</Badge>
        </View>
        <View style={styles.metricGrid}>
          <MetricCard label="Valor histórico filtrado" value={money(totalFamilyAmount)} />
          <MetricCard label="Fornecedores no recorte" value={String(suppliersCount)} />
          <MetricCard label="Compras visíveis" value={String(rows.length)} />
        </View>
        <View style={styles.familyPreviewGrid}>
          {families.slice(0, 6).map(family => (
            <View key={family.key} style={styles.familyPreviewCard}>
              <View style={styles.familyPreviewHeader}>
                <Text style={styles.nodeTitle}>{family.familyName}</Text>
                <Text style={styles.rowMoney}>{money(family.avgUnitPrice)} / {family.unit}</Text>
              </View>
              <Text style={styles.rowSubtitle}>
                {family.occurrenceCount} ocorrência(s) · {family.supplierSummary || 'Fornecedor não vinculado'}
              </Text>
              <View style={styles.badgeLine}>
                <Badge tone={family.evidenceCount ? 'good' : 'warn'}>{family.evidenceCount} evid.</Badge>
                <Badge>{family.latest?.date ? formatDate(family.latest.date) : 'Sem data'}</Badge>
              </View>
            </View>
          ))}
          {!families.length ? <EmptyState text="Nenhuma família de compra encontrada." /> : null}
        </View>
      </View>
      <View style={styles.splitLayout}>
        <View style={styles.listPanel}>
          {rows.map(order => (
            <RowCard
              key={order.id}
              title={order.label || 'Compra'}
              subtitle={`${formatDate(order.date)} · ${getById(db, 'suppliers', order.supplierId)?.name || 'Fornecedor não vinculado'}`}
              selected={selected?.id === order.id}
              onPress={() => setSelectedId(order.id)}
              right={<Text style={styles.rowMoney}>{money(order.totalAmount)}</Text>}
              badges={[{ label: paymentLabel(order.paymentStatus), tone: order.paymentStatus === 'paid' ? 'good' : 'warn' }]}
            />
          ))}
        </View>
        {selected ? (
          <DetailShell
            title={selected.label || 'Compra'}
            subtitle={selected.notes || selected.evidenceSource}
            badges={[
              { label: 'Compra/evidência', tone: 'neutral' },
              { label: paymentLabel(selected.paymentStatus), tone: selected.paymentStatus === 'paid' ? 'good' : 'warn' },
              { label: formatDate(selected.date), tone: 'neutral' },
            ]}
            actions={<IconButton icon="edit-3" label="Editar" onPress={() => openModal({ collection: 'purchaseOrders', id: selected.id })} />}
          >
            <InfoGrid rows={[
              { label: 'Fornecedor', value: getById(db, 'suppliers', selected.supplierId)?.name || selected.supplierName || 'Não vinculado' },
              { label: 'Documento', value: selected.documentNumber || 'Sem documento' },
              { label: 'Total', value: money(selected.totalAmount) },
              { label: 'Itens', value: String(items.length) },
              { label: 'Evidências', value: String(inputs.length) },
              { label: 'Fonte', value: evidenceLabel(selected.evidenceType), helper: selected.evidenceSource },
            ]} />
            <View style={styles.panelNested}>
              <Text style={styles.panelTitle}>Itens comprados</Text>
              {items.map(item => (
                <RowCard
                  key={item.id}
                  title={item.description || resourceName(db, item.resourceType, item.resourceId)}
                  subtitle={resourceTypeLabel(item.resourceType)}
                  meta={`${decimal(item.qty, 3)} ${item.unit || 'un'} · unit ${money(item.unitPrice)}`}
                  right={<Text style={styles.rowMoney}>{money(item.totalPrice)}</Text>}
                />
              ))}
            </View>
            <View style={styles.panelNested}>
              <Text style={styles.panelTitle}>Arquivos e inputs vinculados</Text>
              {inputs.length ? inputs.map(input => (
                <RowCard
                  key={input.id}
                  title={input.title}
                  subtitle={`${inputTypeLabel(input.inputType)} · ${formatDate(input.date)}`}
                  meta={input.fileLabel || input.filePath || input.fileUrl || input.evidenceSource}
                  right={<Text style={styles.rowMoney}>{input.totalAmount ? money(input.totalAmount) : '—'}</Text>}
                />
              )) : <EmptyState text="Nenhuma evidência vinculada automaticamente." />}
            </View>
          </DetailShell>
        ) : <EmptyState />}
      </View>
    </View>
  );
}

function ProcessesView({ db, query, selectedId, setSelectedId }) {
  const rows = filterBySearch(processRows(db), query, [
    item => item.title,
    item => item.typeLabel,
    item => item.purchase,
    item => item.handling,
    item => item.evidence,
  ]);
  const selected = rows.find(item => item.key === selectedId) || rows[0] || null;
  return (
    <View style={styles.splitLayout}>
      <View style={styles.listPanel}>
        <View style={styles.panelIntro}>
          <Text style={styles.panelTitle}>Matriz operacional</Text>
          <Text style={styles.panelSubtitle}>Fluxo físico separado do custo técnico.</Text>
        </View>
        {rows.map(row => (
          <RowCard
            key={row.key}
            title={row.title}
            subtitle={`${row.typeLabel} · ${row.storage}`}
            selected={selected?.key === row.key}
            onPress={() => setSelectedId(row.key)}
            right={<Text style={styles.rowMoney}>{row.usage}</Text>}
            badges={[
              { label: row.purchase, tone: 'neutral' },
              { label: row.evidence ? 'Evidência' : 'Revisar', tone: row.evidence ? 'good' : 'warn' },
            ]}
          />
        ))}
      </View>
      <ProcessDetail db={db} row={selected} />
    </View>
  );
}

function ProcessDetail({ db, row }) {
  if (!row) return <EmptyState />;
  const collection = row.refType === 'product' ? 'products' : resourceCollectionForRef(row.refType);
  const item = getById(db, collection, row.refId);
  const computed = row.refType === 'product' ? computeProduct(db, row.refId) : null;
  const uses = row.refType === 'product' ? [] : productUsesForResource(db, row.refType, row.refId);
  const requiredAddonCount = safeArray(computed?.addons).filter(addon => addon.required || num(addon.minimum) > 0).length;

  return (
    <DetailShell
      title={row.title}
      subtitle={row.handling || row.evidence}
      badges={[
        { label: row.typeLabel, tone: 'neutral' },
        { label: row.evidence ? 'Evidência mapeada' : 'Sem evidência visual', tone: row.evidence ? 'good' : 'warn' },
      ]}
    >
      <InfoGrid rows={[
        { label: 'Compra', value: row.purchase },
        { label: 'Recebimento', value: row.receiving },
        { label: 'Estoque', value: row.storage },
        { label: 'Manipulação', value: row.handling },
        { label: 'Porção/uso', value: row.portion, helper: row.usage },
        { label: 'Evidência', value: row.evidence || 'Pendente' },
      ]} />
      {computed ? (
        <View style={styles.panelNested}>
          <Text style={styles.panelTitle}>Leitura operacional do produto</Text>
          <View style={styles.productHero}>
            <VisualThumb source={imageForProduct(db, computed.product)} label={computed.product.name} size="lg" />
            <View style={styles.productHeroText}>
              <Text style={styles.productHeroTitle}>{computed.product.name}</Text>
              <Text style={styles.productHeroSubtitle}>{computed.product.description || categoryName(db, computed.product.categoryId)}</Text>
            </View>
          </View>
          <InfoGrid rows={[
            { label: 'Preço', value: money(computed.salePrice), helper: categoryName(db, computed.product.categoryId) },
            { label: 'Custo direto', value: money(computed.directCost), helper: `${computed.nodes.length} componente(s)` },
            { label: 'Obrigatórios', value: money(computed.requiredCost), helper: `${requiredAddonCount} linha(s)` },
          ]} />
        </View>
      ) : null}
      {row.refType === 'ingredient' && item ? <ActiveCostPanel db={db} refType="ingredient" item={item} /> : null}
      {row.refType === 'recipe' && item ? (
        <View style={styles.panelNested}>
          <Text style={styles.panelTitle}>Componentes do preparo</Text>
          {safeArray(item.components).map(component => (
            <ComponentNode
              key={`${component.refType}-${component.refId}-${component.qty}`}
              db={db}
              node={{
                key: `${component.refType}:${component.refId}:${component.qty}`,
                refType: component.refType,
                refId: component.refId,
                record: getById(db, resourceCollectionForRef(component.refType), component.refId),
                name: resourceName(db, component.refType, component.refId),
                qty: component.qty,
                unit: component.unit || baseUnitForNode(db, component),
                cost: componentCost(db, component),
                pricingMode: 'receita',
                children: [],
              }}
            />
          ))}
        </View>
      ) : null}
      {uses.length ? (
        <View style={styles.panelNested}>
          <Text style={styles.panelTitle}>Usos ligados ao processo</Text>
          {uses.slice(0, 8).map(use => (
            <RowCard key={use.key} title={use.title} subtitle={use.meta} badges={[{ label: use.type, tone: 'neutral' }]} />
          ))}
        </View>
      ) : null}
    </DetailShell>
  );
}

function SuppliersView({ db, query, selectedId, setSelectedId, openModal }) {
  const rows = filterBySearch(safeArray(db.suppliers), query, [
    item => item.name,
    item => item.legalName,
    item => item.cnpj,
    item => item.sellerName,
    item => item.notes,
  ]);
  const selected = getById(db, 'suppliers', selectedId) || rows[0] || null;
  const orders = safeArray(db.purchaseOrders).filter(order => order.supplierId === selected?.id);
  const inputs = safeArray(db.inputs).filter(input => input.supplierId === selected?.id);

  return (
    <View style={styles.splitLayout}>
      <View style={styles.listPanel}>
        {rows.map(item => (
          <RowCard
            key={item.id}
            title={item.name}
            subtitle={item.legalName || item.cnpj}
            selected={selected?.id === item.id}
            onPress={() => setSelectedId(item.id)}
            badges={[{ label: evidenceLabel(item.evidenceType), tone: item.evidenceType === 'documented' ? 'good' : 'warn' }]}
          />
        ))}
      </View>
      {selected ? (
        <DetailShell
          title={selected.name}
          subtitle={selected.notes || selected.evidenceSource}
          badges={[{ label: 'Fornecedor', tone: 'neutral' }, { label: evidenceLabel(selected.evidenceType), tone: selected.evidenceType === 'documented' ? 'good' : 'warn' }]}
          actions={<IconButton icon="edit-3" label="Editar" onPress={() => openModal({ collection: 'suppliers', id: selected.id })} />}
        >
          <InfoGrid rows={[
            { label: 'Razão social', value: selected.legalName || '—' },
            { label: 'CNPJ', value: selected.cnpj || '—' },
            { label: 'Contato', value: selected.sellerPhone || selected.sellerEmail || '—', helper: selected.sellerName },
            { label: 'PIX', value: selected.pixKey || '—', helper: selected.pixKeyType },
            { label: 'Compras', value: String(orders.length) },
            { label: 'Inputs', value: String(inputs.length) },
          ]} />
          <PurchaseRows rows={orders.map(order => ({
            ...order,
            date: order.date,
            supplierName: selected.name,
            totalPrice: order.totalAmount,
            description: order.label,
          }))} />
        </DetailShell>
      ) : <EmptyState />}
    </View>
  );
}

function PendingView({ db, query, selectedId, setSelectedId }) {
  const rows = filterBySearch(pendingItems(db), query, [
    item => item.name,
    item => item.kind,
    item => item.notes,
    item => item.sourceReference,
  ]);
  const selected = rows.find(item => item.id === selectedId) || rows[0] || null;
  return (
    <View style={styles.splitLayout}>
      <View style={styles.listPanel}>
        {rows.map(item => (
          <RowCard
            key={`${item.refType}-${item.id}`}
            title={item.name}
            subtitle={item.notes || item.sourceReference}
            selected={selected?.id === item.id}
            onPress={() => setSelectedId(item.id)}
            badges={[
              { label: item.kind, tone: 'neutral' },
              { label: evidenceLabel(item.evidenceType || item.sourceType), tone: 'warn' },
            ]}
          />
        ))}
      </View>
      {selected ? (
        <DetailShell
          title={selected.name}
          subtitle={selected.notes || selected.description}
          badges={[{ label: selected.kind, tone: 'neutral' }, { label: 'Revisar', tone: 'warn' }]}
        >
          <InfoGrid rows={[
            { label: 'Fonte atual', value: evidenceLabel(selected.evidenceType || selected.sourceType), helper: selected.sourceReference || selected.evidenceSource },
            { label: 'Código', value: selected.code || selected.id },
            { label: 'Custo', value: selected.refType === 'ingredient' ? comparableCostLabel('ingredient', selected) : selected.refType === 'packaging' ? comparableCostLabel('packaging', selected) : 'Calculado pela ficha' },
            { label: 'Usos', value: String(productUsesForResource(db, selected.refType, selected.id).length) },
          ]} />
        </DetailShell>
      ) : <EmptyState />}
    </View>
  );
}

function SettingsView({ db, persistDb }) {
  const [draft, setDraft] = useState(() => ({
    defaultMarkupPct: String(defaultMarkupPct(db)),
    targetMarginPct: String(targetMarginPct(db)),
    customMonthlyUnits: String(db.settings?.customMonthlyUnits || ''),
  }));

  useEffect(() => {
    setDraft({
      defaultMarkupPct: String(defaultMarkupPct(db)),
      targetMarginPct: String(targetMarginPct(db)),
      customMonthlyUnits: String(db.settings?.customMonthlyUnits || ''),
    });
  }, [db]);

  const save = () => {
    persistDb({
      ...db,
      settings: {
        ...(db.settings || {}),
        defaultMarkupPct: num(draft.defaultMarkupPct),
        targetMarginPct: num(draft.targetMarginPct),
        customMonthlyUnits: num(draft.customMonthlyUnits),
      },
    });
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Premissas e rateio</Text>
      <Text style={styles.panelSubtitle}>Nesta primeira etapa, estes valores atualizam apenas a base local da rota.</Text>
      <View style={styles.modalGrid}>
        <Field label="Markup padrão (%)" value={draft.defaultMarkupPct} onChangeText={value => setDraft(prev => ({ ...prev, defaultMarkupPct: value }))} inputProps={{ keyboardType: 'numeric' }} />
        <Field label="Margem alvo (%)" value={draft.targetMarginPct} onChangeText={value => setDraft(prev => ({ ...prev, targetMarginPct: value }))} inputProps={{ keyboardType: 'numeric' }} />
        <Field label="Unidades mensais estimadas" value={draft.customMonthlyUnits} onChangeText={value => setDraft(prev => ({ ...prev, customMonthlyUnits: value }))} inputProps={{ keyboardType: 'numeric' }} />
      </View>
      <TouchableOpacity style={styles.primaryButton} onPress={save}>
        <Icon name="save" size={16} color={MENU_COLORS.white} />
        <Text style={styles.primaryButtonText}>Salvar premissas</Text>
      </TouchableOpacity>
    </View>
  );
}

function EditModal({ modal, db, onClose, onSave }) {
  const record = modal ? getById(db, modal.collection, modal.id) : null;
  const [draft, setDraft] = useState({});

  useEffect(() => {
    setDraft(record ? { ...record } : {});
  }, [record]);

  if (!modal || !record) return null;

  const fields = editableFieldsFor(modal.collection, draft);
  const updateField = (field, value) => setDraft(prev => ({ ...prev, [field]: value }));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Editar dados técnicos</Text>
              <Text style={styles.modalSubtitle}>{record.name || record.label || record.title}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Icon name="x" size={18} color={MENU_COLORS.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <View style={styles.modalGrid}>
              {fields.map(field => (
                <Field
                  key={field.key}
                  label={field.label}
                  value={draft[field.key]}
                  multiline={field.multiline}
                  inputProps={field.inputProps}
                  onChangeText={value => updateField(field.key, value)}
                />
              ))}
            </View>
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={() => onSave(modal.collection, modal.id, normalizeDraft(modal.collection, draft))}>
              <Icon name="save" size={16} color={MENU_COLORS.white} />
              <Text style={styles.primaryButtonText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function editableFieldsFor(collection) {
  const common = [
    { key: 'name', label: 'Nome' },
    { key: 'code', label: 'SKU interno' },
    { key: 'description', label: 'Descrição', multiline: true },
    { key: 'notes', label: 'Observações', multiline: true },
  ];
  if (collection === 'products') {
    return [
      { key: 'name', label: 'Nome' },
      { key: 'code', label: 'SKU interno' },
      { key: 'salePrice', label: 'Preço de venda', inputProps: { keyboardType: 'numeric' } },
      { key: 'description', label: 'Descrição', multiline: true },
      { key: 'notes', label: 'Observações', multiline: true },
    ];
  }
  if (collection === 'ingredients') {
    return [
      ...common,
      { key: 'purchaseQty', label: 'Quantidade de compra', inputProps: { keyboardType: 'numeric' } },
      { key: 'purchaseCost', label: 'Custo de compra', inputProps: { keyboardType: 'numeric' } },
      { key: 'wastePct', label: 'Perda (%)', inputProps: { keyboardType: 'numeric' } },
      { key: 'supplier', label: 'Fornecedor' },
      { key: 'sourceReference', label: 'Fonte/referência', multiline: true },
    ];
  }
  if (collection === 'recipes') {
    return [
      ...common,
      { key: 'yieldQty', label: 'Rendimento', inputProps: { keyboardType: 'numeric' } },
      { key: 'yieldUnit', label: 'Unidade do rendimento' },
      { key: 'storage', label: 'Armazenamento' },
    ];
  }
  if (collection === 'packaging') {
    return [
      ...common,
      { key: 'purchaseQty', label: 'Quantidade de compra', inputProps: { keyboardType: 'numeric' } },
      { key: 'purchaseCost', label: 'Custo de compra', inputProps: { keyboardType: 'numeric' } },
      { key: 'supplier', label: 'Fornecedor' },
      { key: 'sourceReference', label: 'Fonte/referência', multiline: true },
    ];
  }
  if (collection === 'suppliers') {
    return [
      { key: 'name', label: 'Nome' },
      { key: 'legalName', label: 'Razão social' },
      { key: 'cnpj', label: 'CNPJ' },
      { key: 'sellerName', label: 'Vendedor' },
      { key: 'sellerPhone', label: 'Telefone' },
      { key: 'sellerEmail', label: 'E-mail' },
      { key: 'notes', label: 'Observações', multiline: true },
    ];
  }
  return [
    { key: 'label', label: 'Título' },
    { key: 'documentNumber', label: 'Documento' },
    { key: 'date', label: 'Data' },
    { key: 'totalAmount', label: 'Valor total', inputProps: { keyboardType: 'numeric' } },
    { key: 'notes', label: 'Observações', multiline: true },
    { key: 'evidenceSource', label: 'Fonte/referência', multiline: true },
  ];
}

function normalizeDraft(collection, draft) {
  const numericFields = ['salePrice', 'purchaseQty', 'purchaseCost', 'wastePct', 'yieldQty', 'totalAmount'];
  return Object.entries(draft).reduce((accumulator, [key, value]) => {
    accumulator[key] = numericFields.includes(key) ? num(value) : value;
    return accumulator;
  }, {});
}
