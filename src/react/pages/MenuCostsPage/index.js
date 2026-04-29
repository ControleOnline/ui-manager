import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
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
import { api } from '@controleonline/ui-common/src/api';
import AddCompanyModal from '@controleonline/ui-people/src/react/components/AddCompanyModal';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors as baseColors } from '@controleonline/../../src/styles/colors';
import styles, { SCREEN_COLORS } from './index.styles';
import {
  CATALOG_SEGMENTS,
  LEDGER_MODES,
  MISSING_TEXT,
  SOURCE_STATUS,
  TAB_DEFINITIONS,
  createSourceState,
  formatDate,
  formatMoney,
  formatQuantity,
  loadMenuCostsViewModel,
  loadProductComposition,
} from './viewModel';

const alpha = (hex, opacity) => {
  const sanitizedHex = String(hex || '').replace('#', '');

  if (sanitizedHex.length !== 6) return hex;

  const normalizedOpacity = Math.max(0, Math.min(1, opacity));
  const alphaHex = Math.round(normalizedOpacity * 255).toString(16).padStart(2, '0');
  return `#${sanitizedHex}${alphaHex}`;
};

const MissingInfo = ({ label, message = MISSING_TEXT }) => (
  <View style={[styles.missingBlock, { borderColor: alpha(SCREEN_COLORS.bad, 0.55) }]}>
    <Text style={[styles.missingLabel, { color: '#FCA5A5' }]}>{label}</Text>
    <Text style={[styles.missingText, { color: '#FECACA' }]}>{message}</Text>
  </View>
);

const EmptyState = ({ message }) => (
  <View style={styles.emptyBlock}>
    <Text style={styles.emptyText}>{message}</Text>
  </View>
);

const MetricCard = ({ label, value, accent, missing, message }) => (
  <View style={[styles.metricCard, missing && { borderColor: alpha(SCREEN_COLORS.bad, 0.55) }]}>
    {missing ? (
      <MissingInfo label={label} message={message} />
    ) : (
      <>
        <Text style={[styles.metricValue, accent ? { color: accent } : null]}>{value || '—'}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
        {message ? <Text style={styles.metricHelperText}>{message}</Text> : null}
      </>
    )}
  </View>
);

const Badge = ({ label, accent = SCREEN_COLORS.brand, outline = true }) => (
  <View style={[
    styles.badge,
    {
      borderColor: outline ? alpha(accent, 0.55) : 'transparent',
      backgroundColor: alpha(accent, 0.14),
    },
  ]}>
    <Text style={[styles.badgeText, { color: accent }]}>{label}</Text>
  </View>
);

const FieldCard = ({ label, value, missing }) => (
  <View style={styles.fieldCard}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {missing ? <MissingInfo label={label} /> : <Text style={styles.fieldValue}>{value}</Text>}
  </View>
);

const ListState = ({ source }) => {
  if (!source || source.status === SOURCE_STATUS.AVAILABLE) return null;
  if (source.status === SOURCE_STATUS.MISSING) return <MissingInfo label="Fonte" message={source.message} />;
  return <EmptyState message={source.message} />;
};

const getStatusAccent = statusColor => {
  if (statusColor) return statusColor;
  return SCREEN_COLORS.brand;
};

const getPreviewText = items => items.filter(Boolean).slice(0, 3).join(' • ');

const ActionButton = ({ label, onPress, accent = SCREEN_COLORS.brand }) => (
  <TouchableOpacity
    style={[styles.actionButton, { borderColor: alpha(accent, 0.55) }]}
    activeOpacity={0.84}
    onPress={onPress}
  >
    <Icon name="plus" size={15} color={accent} />
    {label ? <Text style={[styles.actionButtonText, { color: accent }]}>{label}</Text> : null}
  </TouchableOpacity>
);

export default function MenuCostsPage({ navigation }) {
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const { width } = useWindowDimensions();
  const { currentCompany } = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;

  const brandColors = useMemo(
    () => resolveThemePalette({ ...themeColors, ...(currentCompany?.theme?.colors || {}) }, baseColors),
    [themeColors, currentCompany?.id],
  );

  const isWide = width >= 1080;

  const [activeTab, setActiveTab] = useState('dashboard');
  const [ledgerMode, setLedgerMode] = useState('timeline');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogSegment, setCatalogSegment] = useState('all');
  const [ledgerQuery, setLedgerQuery] = useState('');
  const [state, setState] = useState({
    loading: true,
    refreshing: false,
    error: '',
    viewModel: null,
  });
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedMapKey, setSelectedMapKey] = useState(null);
  const [compositionCache, setCompositionCache] = useState({});
  const [loadingCompositionId, setLoadingCompositionId] = useState(null);
  const [showProviderModal, setShowProviderModal] = useState(false);

  const providerContext = useMemo(() => ({
    context: 'provider',
    title: global.t?.t('people', 'title', 'providers'),
    searchPlaceholder: global.t?.t('people', 'searchPlaceholder', 'searchProvider'),
    modalTitle: 'Cadastro de Fornecedor',
    emptyTitle: global.t?.t('people', 'title', 'emptyProvider'),
    emptySearchTitle: global.t?.t('people', 'title', 'emptySearchProvider'),
    emptySubtitle: global.t?.t('people', 'title', 'addFirstProvider'),
  }), []);

  const loadScreen = useCallback(async (refreshing = false) => {
    if (!currentCompany?.id) return;

    setState(previous => ({
      ...previous,
      loading: refreshing ? previous.loading : true,
      refreshing,
      error: '',
    }));

    try {
      const viewModel = await loadMenuCostsViewModel(api, currentCompany);

      setState({
        loading: false,
        refreshing: false,
        error: '',
        viewModel,
      });
    } catch {
      setState(previous => ({
        ...previous,
        loading: false,
        refreshing: false,
        error: 'Não foi possível carregar os dados desta tela com as fontes atuais.',
      }));
    }
  }, [currentCompany]);

  useFocusEffect(useCallback(() => {
    loadScreen(false);
  }, [loadScreen]));

  const viewModel = state.viewModel;

  const openProductCreator = useCallback(initialProductType => {
    const supplyTypes = ['feedstock', 'component', 'package'];
    const context = supplyTypes.includes(initialProductType) ? 'supplies' : 'products';
    navigation.push('ProductDetails', {
      context,
      initialProductType,
    });
  }, [navigation]);

  const openPurchaseCreator = useCallback(() => {
    navigation.push('PurchaseFormPage');
  }, [navigation]);

  const openProviderCreator = useCallback(() => {
    setShowProviderModal(true);
  }, []);

  const catalogPrimaryAction = useMemo(() => {
    switch (catalogSegment) {
      case 'ingredients':
        return { label: 'Ingrediente', onPress: () => openProductCreator('feedstock') };
      case 'recipes':
        return { label: 'Preparo', onPress: () => openProductCreator('manufactured') };
      case 'packaging':
        return { label: 'Embalagem', onPress: () => openProductCreator('package') };
      case 'finalItems':
      case 'all':
      default:
        return { label: 'Item', onPress: () => openProductCreator('product') };
    }
  }, [catalogSegment, openProductCreator]);

  const resourceActions = useMemo(() => ({
    ingredients: { label: '', onPress: () => openProductCreator('feedstock'), accent: SCREEN_COLORS.good },
    recipes: { label: '', onPress: () => openProductCreator('manufactured'), accent: SCREEN_COLORS.warn },
    packaging: { label: '', onPress: () => openProductCreator('package'), accent: '#38BDF8' },
    suppliers: { label: '', onPress: openProviderCreator, accent: SCREEN_COLORS.brand },
    purchases: { label: '', onPress: openPurchaseCreator, accent: SCREEN_COLORS.brand },
  }), [openProductCreator, openProviderCreator, openPurchaseCreator]);

  const filteredCatalogItems = useMemo(() => {
    const items = viewModel?.catalog?.items || [];
    const normalizedQuery = String(catalogQuery || '').trim().toLowerCase();

    return items.filter(item => {
      const matchesSegment = catalogSegment === 'all' || item.segmentKey === catalogSegment;
      if (!matchesSegment) return false;

      if (!normalizedQuery) return true;

      return [
        item.name,
        item.sku,
        item.typeLabel,
        item.segmentLabel,
        item.description,
        item.categoryNames.join(' '),
      ].join(' ').toLowerCase().includes(normalizedQuery);
    });
  }, [catalogQuery, catalogSegment, viewModel?.catalog?.items]);

  const filteredLedgerOrders = useMemo(() => {
    const orders = viewModel?.ledger?.orders || [];
    const normalizedQuery = String(ledgerQuery || '').trim().toLowerCase();

    if (!normalizedQuery) return orders;

    return orders.filter(order => [
      order.id,
      order.supplierLabel,
      order.comments,
      order.items.map(item => item.productName).join(' '),
      order.items.map(item => item.sku).join(' '),
    ].join(' ').toLowerCase().includes(normalizedQuery));
  }, [ledgerQuery, viewModel?.ledger?.orders]);

  const filteredPurchaseMap = useMemo(() => {
    const source = viewModel?.ledger?.purchaseMap || [];
    const normalizedQuery = String(ledgerQuery || '').trim().toLowerCase();

    if (!normalizedQuery) return source;

    return source.filter(row => [
      row.productName,
      row.productTypeLabel,
      row.sku,
      row.suppliers.join(' '),
    ].join(' ').toLowerCase().includes(normalizedQuery));
  }, [ledgerQuery, viewModel?.ledger?.purchaseMap]);

  useEffect(() => {
    if (!filteredCatalogItems.length) {
      setSelectedProductId(null);
      return;
    }

    const hasCurrentSelection = filteredCatalogItems.some(item => item.id === selectedProductId);
    if (!hasCurrentSelection) {
      setSelectedProductId(filteredCatalogItems[0].id);
    }
  }, [filteredCatalogItems, selectedProductId]);

  useEffect(() => {
    if (!filteredLedgerOrders.length) {
      setSelectedOrderId(null);
      return;
    }

    const hasCurrentSelection = filteredLedgerOrders.some(order => order.id === selectedOrderId);
    if (!hasCurrentSelection) {
      setSelectedOrderId(filteredLedgerOrders[0].id);
    }
  }, [filteredLedgerOrders, selectedOrderId]);

  useEffect(() => {
    if (!filteredPurchaseMap.length) {
      setSelectedMapKey(null);
      return;
    }

    const hasCurrentSelection = filteredPurchaseMap.some(row => row.key === selectedMapKey);
    if (!hasCurrentSelection) {
      setSelectedMapKey(filteredPurchaseMap[0].key);
    }
  }, [filteredPurchaseMap, selectedMapKey]);

  const selectedProduct = useMemo(
    () => filteredCatalogItems.find(item => item.id === selectedProductId) || filteredCatalogItems[0] || null,
    [filteredCatalogItems, selectedProductId],
  );

  const selectedOrder = useMemo(
    () => filteredLedgerOrders.find(item => item.id === selectedOrderId) || filteredLedgerOrders[0] || null,
    [filteredLedgerOrders, selectedOrderId],
  );

  const selectedMapRow = useMemo(
    () => filteredPurchaseMap.find(item => item.key === selectedMapKey) || filteredPurchaseMap[0] || null,
    [filteredPurchaseMap, selectedMapKey],
  );

  const ensureCompositionLoaded = useCallback(async product => {
    if (!product?.id || !product.groupCount || compositionCache[product.id] || loadingCompositionId === product.id) {
      return;
    }

    setLoadingCompositionId(product.id);
    try {
      const composition = await loadProductComposition(api, product.groups || []);
      setCompositionCache(previous => ({
        ...previous,
        [product.id]: composition,
      }));
    } catch {
      setCompositionCache(previous => ({
        ...previous,
        [product.id]: createSourceState([], 'Não foi possível carregar a composição'),
      }));
    } finally {
      setLoadingCompositionId(null);
    }
  }, [compositionCache, loadingCompositionId]);

  useEffect(() => {
    if (activeTab === 'catalog' && selectedProduct) {
      ensureCompositionLoaded(selectedProduct);
    }
  }, [activeTab, ensureCompositionLoaded, selectedProduct]);

  const renderHero = () => (
    <View style={styles.heroCard}>
      <View style={[styles.heroAccent, { backgroundColor: alpha(brandColors.primary || SCREEN_COLORS.brand, 0.75) }]} />
      <Text style={styles.heroEyebrow}>Manager / Compras</Text>
      <Text style={styles.heroTitle}>{viewModel?.dashboard?.heroTitle || 'Custos do Cardápio'}</Text>
      <Text style={styles.heroSubtitle}>
        {viewModel?.company?.label ? `${viewModel.company.label} • ` : ''}
        {viewModel?.dashboard?.heroSubtitle}
      </Text>
      <Text style={styles.companyLine}>Fontes reais: products, orders, product groups, product categories e purchasing suggestion.</Text>
      <View style={styles.heroBadgeRow}>
        <View style={[styles.heroBadge, { borderColor: alpha(brandColors.primary || SCREEN_COLORS.brand, 0.55) }]}>
          <Text style={[styles.heroBadgeText, { color: brandColors.primary || SCREEN_COLORS.brand }]}>Somente leitura</Text>
        </View>
        <View style={[styles.heroBadge, { borderColor: alpha(SCREEN_COLORS.bad, 0.55) }]}>
          <Text style={[styles.heroBadgeText, { color: '#FCA5A5' }]}>{MISSING_TEXT}</Text>
        </View>
        <View style={[styles.heroBadge, { borderColor: alpha(SCREEN_COLORS.good, 0.45) }]}>
          <Text style={[styles.heroBadgeText, { color: SCREEN_COLORS.good }]}>Composição atual mantida no backend</Text>
        </View>
      </View>
    </View>
  );

  const renderTabs = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
      <View style={styles.tabRow}>
        {TAB_DEFINITIONS.map(tab => {
          const isActive = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              activeOpacity={0.82}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={styles.tabLabel}>{tab.label}</Text>
              <Text style={styles.tabDescription}>{tab.description}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );

  const renderDashboard = () => (
    (() => {
      const actualMetrics = viewModel?.dashboard?.actualMetrics || [];
      const configMetrics = viewModel?.dashboard?.configMetrics || [];
      const suggestionSource = viewModel?.dashboard?.suggestionSource || createSourceState([], 'Sem itens com reposição sugerida');
      const recentPurchaseSource = viewModel?.dashboard?.recentPurchaseSource || createSourceState([], 'Sem compras registradas');

      return (
        <>
          <View style={styles.metricGrid}>
            {actualMetrics.map(metric => (
              <MetricCard
                key={metric.key}
                label={metric.label}
                value={metric.value}
                accent={metric.key === 'suggestions' ? SCREEN_COLORS.brand : SCREEN_COLORS.text}
              />
            ))}
            {configMetrics.map(metric => (
              <MetricCard
                key={metric.key}
                label={metric.label}
                value={metric.value}
                missing={metric.missing}
                message={metric.message}
                accent={metric.accent}
              />
            ))}
          </View>

          <View style={styles.twoColumnRow}>
            <View style={styles.sidePanel}>
              <Text style={styles.panelTitle}>Reposição sugerida</Text>
              <ListState source={suggestionSource} />
              {suggestionSource.status === SOURCE_STATUS.AVAILABLE
                ? suggestionSource.items.slice(0, 6).map(item => (
                  <View key={`${item.id}-${item.productName}`} style={styles.listItemCard}>
                    <View style={styles.listItemHeader}>
                      <Text style={styles.listItemTitle}>{item.productName || `Produto #${item.id || '-'}`}</Text>
                      <Badge label={item.productTypeLabel} accent={SCREEN_COLORS.good} />
                    </View>
                    <Text style={styles.listItemMeta}>
                      Estoque {item.stockLabel} • Mínimo {item.minimumLabel} • Repor {item.neededLabel} {item.unity || ''}
                    </Text>
                  </View>
                ))
                : null}
            </View>

            <View style={styles.sidePanel}>
              <Text style={styles.panelTitle}>Últimas compras</Text>
              <ListState source={recentPurchaseSource} />
              {recentPurchaseSource.status === SOURCE_STATUS.AVAILABLE
                ? recentPurchaseSource.items.map(order => (
                  <View key={order.id} style={styles.listItemCard}>
                    <View style={styles.listItemHeader}>
                      <Text style={styles.listItemTitle}>Pedido #{order.id}</Text>
                      <Badge
                        label={order.statusLabel || 'Compra'}
                        accent={getStatusAccent(order.statusColor)}
                      />
                    </View>
                    <Text style={styles.listItemMeta}>
                      {order.dateLabel || MISSING_TEXT} • {order.supplierLabel || MISSING_TEXT}
                    </Text>
                    <Text style={styles.listItemMeta}>
                      {order.itemsPreview.length ? getPreviewText(order.itemsPreview) : 'Sem itens detalhados'}
                    </Text>
                  </View>
                ))
                : null}
            </View>
          </View>
        </>
      );
    })()
  );

  const renderCatalogTable = () => (
    <View style={styles.tableWrap}>
      <View style={styles.tableHeaderRow}>
        <View style={{ flex: 1.8 }}>
          <Text style={styles.tableHeaderCell}>Item</Text>
        </View>
        <View style={{ flex: 0.9 }}>
          <Text style={styles.tableHeaderCell}>Tipo</Text>
        </View>
        <View style={{ flex: 0.8 }}>
          <Text style={styles.tableHeaderCell}>Fornec.</Text>
        </View>
        <View style={{ flex: 0.8 }}>
          <Text style={styles.tableHeaderCell}>Grupos</Text>
        </View>
        <View style={{ flex: 0.9 }}>
          <Text style={styles.tableHeaderCell}>Preço</Text>
        </View>
      </View>

      {filteredCatalogItems.map(item => {
        const isActive = item.id === selectedProduct?.id;
        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.tableRow, isActive && styles.tableRowActive]}
            activeOpacity={0.84}
            onPress={() => setSelectedProductId(item.id)}
          >
            <View style={{ flex: 1.8, paddingRight: 10 }}>
              <Text style={styles.tableCellText}>{item.name}</Text>
              <Text style={styles.mutedText}>{item.sku || item.segmentLabel}</Text>
            </View>
            <View style={{ flex: 0.9, paddingRight: 10 }}>
              <Text style={styles.tableCellText}>{item.typeLabel}</Text>
            </View>
            <View style={{ flex: 0.8, paddingRight: 10 }}>
              <Text style={styles.tableCellText}>{String(item.supplierCount)}</Text>
            </View>
            <View style={{ flex: 0.8, paddingRight: 10 }}>
              <Text style={styles.tableCellText}>{String(item.groupCount)}</Text>
            </View>
            <View style={{ flex: 0.9 }}>
              {item.priceLabel ? <Text style={styles.tableCellText}>{item.priceLabel}</Text> : <Text style={[styles.tableCellText, { color: '#FCA5A5' }]}>{MISSING_TEXT}</Text>}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderCatalogDetail = () => {
    if (!selectedProduct) {
      return <EmptyState message="Sem item selecionado." />;
    }

    const compositionState = compositionCache[selectedProduct.id];
    const isCompositionLoading = loadingCompositionId === selectedProduct.id;
    const pricing = selectedProduct.pricing || null;
    const suggestedPriceLabel = pricing?.simulatedByMarginLabel || pricing?.suggestedByMarginWithFeesLabel || '';

    return (
      <View style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailTitle}>{selectedProduct.name}</Text>
          <Text style={styles.detailSubtitle}>
            {selectedProduct.description || 'Sem descrição cadastrada'}
          </Text>
          <View style={styles.badgesWrap}>
            <Badge label={selectedProduct.segmentLabel} accent={selectedProduct.segmentAccent} />
            <Badge label={selectedProduct.typeLabel} accent={SCREEN_COLORS.brand} />
            {selectedProduct.active ? <Badge label="Ativo" accent={SCREEN_COLORS.good} /> : <Badge label="Inativo" accent={SCREEN_COLORS.bad} />}
            {selectedProduct.featured ? <Badge label="Destaque" accent={SCREEN_COLORS.warn} /> : null}
          </View>
        </View>

        <View style={styles.fieldGrid}>
          <FieldCard label="SKU" value={selectedProduct.sku || MISSING_TEXT} missing={!selectedProduct.sku} />
          <FieldCard label="Preço base" value={selectedProduct.priceLabel || MISSING_TEXT} missing={!selectedProduct.priceLabel} />
          <FieldCard label="Unidade" value={selectedProduct.unitLabel || MISSING_TEXT} missing={!selectedProduct.unitLabel} />
          <FieldCard label="Fila" value={selectedProduct.queueLabel || MISSING_TEXT} missing={!selectedProduct.queueLabel} />
          <FieldCard label="Estoque entrada" value={selectedProduct.defaultInInventory || MISSING_TEXT} missing={!selectedProduct.defaultInInventory} />
          <FieldCard label="Estoque saida" value={selectedProduct.defaultOutInventory || MISSING_TEXT} missing={!selectedProduct.defaultOutInventory} />
        </View>

        <View style={styles.divider} />

        <Text style={styles.detailSectionTitle}>Categorias</Text>
        {selectedProduct.categories.length
          ? selectedProduct.categories.map(category => (
            <View key={`${selectedProduct.id}-${category.id || category.name}`} style={styles.smallListItem}>
              <Text style={styles.smallListTitle}>{category.name}</Text>
              <Text style={styles.smallListMeta}>{category.color || 'Sem cor cadastrada'}</Text>
            </View>
          ))
          : <EmptyState message="Sem categorias vinculadas." />}

        <View style={styles.divider} />

        <Text style={styles.detailSectionTitle}>Fornecedores vinculados</Text>
        {selectedProduct.suppliers.length
          ? selectedProduct.suppliers.map(supplier => (
            <View key={`${selectedProduct.id}-${supplier.id}`} style={styles.smallListItem}>
              <Text style={styles.smallListTitle}>{supplier.label}</Text>
              <Text style={styles.smallListMeta}>
                {supplier.role || 'supplier'}
                {supplier.costPriceLabel ? ` • ${supplier.costPriceLabel}` : ` • ${MISSING_TEXT}`}
                {supplier.leadTimeDays ? ` • ${supplier.leadTimeDays} dias` : ''}
              </Text>
            </View>
          ))
          : <EmptyState message="Sem fornecedores vinculados." />}

        <View style={styles.divider} />

        <Text style={styles.detailSectionTitle}>Composição por grupos</Text>
        {!selectedProduct.groupCount ? <EmptyState message="Sem grupos de composição cadastrados." /> : null}
        {isCompositionLoading ? (
          <ActivityIndicator size="small" color={brandColors.primary || SCREEN_COLORS.brand} />
        ) : null}
        {compositionState?.status === SOURCE_STATUS.AVAILABLE
          ? compositionState.items.map(group => (
            <View key={`${selectedProduct.id}-${group.id}`} style={styles.smallListItem}>
              <Text style={styles.smallListTitle}>{group.name}</Text>
              <Text style={styles.smallListMeta}>
                {group.required ? 'Obrigatório' : 'Opcional'}
                {typeof group.minimum === 'number' ? ` • Min ${group.minimum}` : ''}
                {typeof group.maximum === 'number' ? ` • Max ${group.maximum}` : ''}
                {group.priceCalculation ? ` • ${group.priceCalculation}` : ''}
              </Text>
              <View style={{ marginTop: 8 }}>
                {group.componentsState.status === SOURCE_STATUS.AVAILABLE
                  ? group.components.map(component => (
                    <View key={`${group.id}-${component.id}`} style={styles.smallListItem}>
                      <Text style={styles.smallListTitle}>{component.productName}</Text>
                      <Text style={styles.smallListMeta}>
                        {component.typeLabel} • Qtde {component.quantityLabel}
                        {component.priceLabel ? ` • ${component.priceLabel}` : ` • ${MISSING_TEXT}`}
                      </Text>
                    </View>
                  ))
                  : <ListState source={group.componentsState} />}
              </View>
            </View>
          ))
          : compositionState?.status === SOURCE_STATUS.EMPTY ? <EmptyState message={compositionState.message} /> : null}

        <View style={styles.divider} />

        <Text style={styles.detailSectionTitle}>Precificação atual</Text>
        <View style={styles.fieldGrid}>
          <FieldCard label="Margem alvo" value={pricing?.marginTargetLabel || MISSING_TEXT} missing={!pricing?.marginTargetLabel} />
          <FieldCard label="Custo consolidado por rendimento" value={pricing?.totalUnitCostLabel || MISSING_TEXT} missing={!pricing?.totalUnitCostLabel} />
          <FieldCard label="Preço sugerido por margem/CMV" value={suggestedPriceLabel || MISSING_TEXT} missing={!suggestedPriceLabel} />
          <FieldCard label="Perda estimada" value={pricing?.lossPctLabel || MISSING_TEXT} missing={!pricing?.lossPctLabel} />
          <FieldCard label="Custo operacional" value={pricing?.operationalCostLabel || MISSING_TEXT} missing={!pricing?.operationalCostLabel} />
          <FieldCard label="Custo de embalagem" value={pricing?.packagingCostLabel || MISSING_TEXT} missing={!pricing?.packagingCostLabel} />
          <FieldCard label="Custo logístico" value={pricing?.logisticsCostLabel || MISSING_TEXT} missing={!pricing?.logisticsCostLabel} />
          <FieldCard label="Origem da precificação" value={pricing?.source || MISSING_TEXT} missing={!pricing?.source} />
        </View>
      </View>
    );
  };

  const renderCatalog = () => {
    const catalog = viewModel?.catalog || {
      segmentSummary: [],
      source: createSourceState([], 'Sem produtos cadastrados'),
    };

    return (
      <>
        <View style={styles.metricGrid}>
          {catalog.segmentSummary.map(metric => (
            <MetricCard
              key={metric.key}
              label={metric.label}
              value={metric.value}
              accent={metric.accent}
            />
          ))}
        </View>

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWrap}>
              <Text style={styles.sectionTitle}>Catálogo</Text>
              <Text style={styles.sectionDescription}>
                Produtos já cadastrados com atalho direto para novo ingrediente, preparo, embalagem ou item final.
              </Text>
            </View>
            <ActionButton
              label={catalogPrimaryAction.label}
              onPress={catalogPrimaryAction.onPress}
              accent={SCREEN_COLORS.brand}
            />
          </View>

          <View style={styles.filterRow}>
            {CATALOG_SEGMENTS.map(segment => {
              const active = segment.key === catalogSegment;
              return (
                <TouchableOpacity
                  key={segment.key}
                  style={[styles.filterChip, active && styles.filterChipActive, active && { borderColor: segment.accent }]}
                  activeOpacity={0.85}
                  onPress={() => setCatalogSegment(segment.key)}
                >
                  <Text style={[styles.filterChipText, active && { color: segment.accent }]}>{segment.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            value={catalogQuery}
            onChangeText={setCatalogQuery}
            placeholder="Buscar item, SKU, tipo ou categoria..."
            placeholderTextColor={SCREEN_COLORS.muted}
            style={styles.searchInput}
          />

          <ListState source={catalog.source.status === SOURCE_STATUS.AVAILABLE ? createSourceState(filteredCatalogItems, 'Nenhum item encontrado com este filtro') : catalog.source} />
          {filteredCatalogItems.length ? (
            <View style={[styles.splitLayout, !isWide && { flexDirection: 'column' }]}>
              <View style={styles.splitPrimary}>{renderCatalogTable()}</View>
              <View style={styles.splitSecondary}>{renderCatalogDetail()}</View>
            </View>
          ) : null}
        </View>
      </>
    );
  };

  const renderLedgerTimeline = () => (
    <View style={styles.tableWrap}>
      <View style={styles.tableHeaderRow}>
        <View style={{ flex: 1.2 }}>
          <Text style={styles.tableHeaderCell}>Pedido</Text>
        </View>
        <View style={{ flex: 1.5 }}>
          <Text style={styles.tableHeaderCell}>Fornecedor</Text>
        </View>
        <View style={{ flex: 1.1 }}>
          <Text style={styles.tableHeaderCell}>Data</Text>
        </View>
        <View style={{ flex: 0.9 }}>
          <Text style={styles.tableHeaderCell}>Itens</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tableHeaderCell}>Total</Text>
        </View>
      </View>

      {filteredLedgerOrders.map(order => (
        <TouchableOpacity
          key={order.id}
          style={[styles.tableRow, order.id === selectedOrder?.id && styles.tableRowActive]}
          activeOpacity={0.84}
          onPress={() => setSelectedOrderId(order.id)}
        >
          <View style={{ flex: 1.2, paddingRight: 10 }}>
            <Text style={styles.tableCellText}>#{order.id}</Text>
            <Text style={styles.mutedText}>{order.statusLabel || 'Compra'}</Text>
          </View>
          <View style={{ flex: 1.5, paddingRight: 10 }}>
            {order.supplierLabel ? <Text style={styles.tableCellText}>{order.supplierLabel}</Text> : <Text style={[styles.tableCellText, { color: '#FCA5A5' }]}>{MISSING_TEXT}</Text>}
          </View>
          <View style={{ flex: 1.1, paddingRight: 10 }}>
            {order.dateLabel ? <Text style={styles.tableCellText}>{order.dateLabel}</Text> : <Text style={[styles.tableCellText, { color: '#FCA5A5' }]}>{MISSING_TEXT}</Text>}
          </View>
          <View style={{ flex: 0.9, paddingRight: 10 }}>
            <Text style={styles.tableCellText}>{String(order.itemCount)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            {order.totalLabel ? <Text style={styles.tableCellText}>{order.totalLabel}</Text> : <Text style={[styles.tableCellText, { color: '#FCA5A5' }]}>{MISSING_TEXT}</Text>}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderLedgerDetail = () => {
    if (!selectedOrder) {
      return <EmptyState message="Sem pedido selecionado." />;
    }

    return (
      <View style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailTitle}>Pedido de compra #{selectedOrder.id}</Text>
          <Text style={styles.detailSubtitle}>
            {selectedOrder.dateTimeLabel || MISSING_TEXT}
          </Text>
          <View style={styles.badgesWrap}>
            <Badge label={selectedOrder.statusLabel || 'Compra'} accent={getStatusAccent(selectedOrder.statusColor)} />
            {selectedOrder.supplierLabel ? <Badge label={selectedOrder.supplierLabel} accent={SCREEN_COLORS.brand} /> : null}
          </View>
        </View>

        <View style={styles.fieldGrid}>
          <FieldCard label="Fornecedor" value={selectedOrder.supplierLabel || MISSING_TEXT} missing={!selectedOrder.supplierLabel} />
          <FieldCard label="Data" value={selectedOrder.dateLabel || MISSING_TEXT} missing={!selectedOrder.dateLabel} />
          <FieldCard label="Itens" value={String(selectedOrder.itemCount)} />
          <FieldCard label="Quantidade" value={formatQuantity(selectedOrder.totalQuantity, 3) || '0'} />
        </View>

        <View style={styles.divider} />

        <Text style={styles.detailSectionTitle}>Itens comprados</Text>
        {selectedOrder.items.length
          ? selectedOrder.items.map(item => (
            <View key={`${selectedOrder.id}-${item.id}`} style={styles.smallListItem}>
              <Text style={styles.smallListTitle}>{item.productName}</Text>
              <Text style={styles.smallListMeta}>
                {item.productTypeLabel} • Qtde {item.quantityLabel}
                {item.inInventoryLabel ? ` • Estoque ${item.inInventoryLabel}` : ` • Estoque ${MISSING_TEXT}`}
              </Text>
              <Text style={styles.smallListMeta}>
                {item.priceLabel || MISSING_TEXT} • {item.totalLabel || MISSING_TEXT}
              </Text>
            </View>
          ))
          : <EmptyState message="Sem itens detalhados neste pedido." />}

        <View style={styles.divider} />

        <Text style={styles.detailSectionTitle}>Evidências e financeiro</Text>
        <MissingInfo label="Comprovantes anexos" />
        <View style={{ height: 10 }} />
        <MissingInfo label="Número documental" />
        <View style={{ height: 10 }} />
        <MissingInfo label="Forma/status de pagamento" />
      </View>
    );
  };

  const renderPurchaseMap = () => (
    <View style={styles.tableWrap}>
      <View style={styles.tableHeaderRow}>
        <View style={{ flex: 1.8 }}>
          <Text style={styles.tableHeaderCell}>Familia comprada</Text>
        </View>
        <View style={{ flex: 0.9 }}>
          <Text style={styles.tableHeaderCell}>Qtde</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tableHeaderCell}>Último preço</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tableHeaderCell}>Total</Text>
        </View>
      </View>

      {filteredPurchaseMap.map(row => (
        <TouchableOpacity
          key={row.key}
          style={[styles.tableRow, row.key === selectedMapRow?.key && styles.tableRowActive]}
          activeOpacity={0.84}
          onPress={() => setSelectedMapKey(row.key)}
        >
          <View style={{ flex: 1.8, paddingRight: 10 }}>
            <Text style={styles.tableCellText}>{row.productName}</Text>
            <Text style={styles.mutedText}>{row.productTypeLabel}</Text>
          </View>
          <View style={{ flex: 0.9, paddingRight: 10 }}>
            <Text style={styles.tableCellText}>{row.quantityLabel}</Text>
          </View>
          <View style={{ flex: 1, paddingRight: 10 }}>
            {row.latestPriceLabel ? <Text style={styles.tableCellText}>{row.latestPriceLabel}</Text> : <Text style={[styles.tableCellText, { color: '#FCA5A5' }]}>{MISSING_TEXT}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            {row.totalLabel ? <Text style={styles.tableCellText}>{row.totalLabel}</Text> : <Text style={[styles.tableCellText, { color: '#FCA5A5' }]}>{MISSING_TEXT}</Text>}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPurchaseMapDetail = () => {
    if (!selectedMapRow) {
      return <EmptyState message="Sem familia de compra selecionada." />;
    }

    return (
      <View style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailTitle}>{selectedMapRow.productName}</Text>
          <Text style={styles.detailSubtitle}>
            {selectedMapRow.productTypeLabel}
            {selectedMapRow.sku ? ` • ${selectedMapRow.sku}` : ''}
          </Text>
          <View style={styles.badgesWrap}>
            <Badge label={`Última compra ${selectedMapRow.lastOrderDateLabel || MISSING_TEXT}`} accent={SCREEN_COLORS.brand} />
            <Badge label={`${selectedMapRow.occurrences.length} ocorrências`} accent={SCREEN_COLORS.good} />
          </View>
        </View>

        <View style={styles.fieldGrid}>
          <FieldCard label="Quantidade comprada" value={selectedMapRow.quantityLabel} />
          <FieldCard label="Último preço" value={selectedMapRow.latestPriceLabel || MISSING_TEXT} missing={!selectedMapRow.latestPriceLabel} />
          <FieldCard label="Total acumulado" value={selectedMapRow.totalLabel || MISSING_TEXT} missing={!selectedMapRow.totalLabel} />
          <FieldCard label="Fornecedores" value={selectedMapRow.suppliers.length ? selectedMapRow.suppliers.join(', ') : MISSING_TEXT} missing={!selectedMapRow.suppliers.length} />
        </View>

        <View style={styles.divider} />

        <Text style={styles.detailSectionTitle}>Ocorrências</Text>
        {selectedMapRow.occurrences.map((occurrence, index) => (
          <View key={`${selectedMapRow.key}-${occurrence.orderId}-${index}`} style={styles.smallListItem}>
            <Text style={styles.smallListTitle}>Pedido #{occurrence.orderId}</Text>
            <Text style={styles.smallListMeta}>
              {occurrence.dateLabel || MISSING_TEXT}
              {occurrence.supplierLabel ? ` • ${occurrence.supplierLabel}` : ` • ${MISSING_TEXT}`}
            </Text>
            <Text style={styles.smallListMeta}>
              Qtde {occurrence.quantityLabel}
              {occurrence.priceLabel ? ` • ${occurrence.priceLabel}` : ` • ${MISSING_TEXT}`}
              {occurrence.totalLabel ? ` • ${occurrence.totalLabel}` : ''}
            </Text>
          </View>
        ))}

        <View style={styles.divider} />

        <Text style={styles.detailSectionTitle}>Campos ainda sem fonte</Text>
        <MissingInfo label="Links de evidência" />
      </View>
    );
  };

  const renderLedger = () => {
    const ledger = viewModel?.ledger || {
      source: createSourceState([], 'Sem compras registradas'),
      orders: [],
      purchaseMapSource: createSourceState([], 'Sem itens comprados para consolidar'),
      purchaseMap: [],
    };
    const activeListSource = ledgerMode === 'timeline'
      ? (ledger.source.status === SOURCE_STATUS.AVAILABLE
        ? createSourceState(filteredLedgerOrders, 'Nenhum pedido encontrado com este filtro')
        : ledger.source)
      : (ledger.purchaseMapSource.status === SOURCE_STATUS.AVAILABLE
        ? createSourceState(filteredPurchaseMap, 'Nenhuma familia encontrada com este filtro')
        : ledger.purchaseMapSource);

    return (
      <>
        <View style={styles.metricGrid}>
          <MetricCard label="Compras" value={String(ledger.orders.length)} accent={SCREEN_COLORS.brand} />
          <MetricCard label="Famílias compradas" value={String(ledger.purchaseMap.length)} accent={SCREEN_COLORS.good} />
          <MetricCard
            label="Comprovantes anexos"
            missing
          />
          <MetricCard
            label="Pagamento consolidado"
            missing
          />
        </View>

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWrap}>
              <Text style={styles.sectionTitle}>Lançamentos</Text>
              <Text style={styles.sectionDescription}>
                Timeline de pedidos de compra e consolidação por família comprada usando `productId + type`.
              </Text>
            </View>
            <View style={styles.modeRow}>
              <ActionButton
                label="Compra"
                onPress={openPurchaseCreator}
                accent={SCREEN_COLORS.brand}
              />
              {LEDGER_MODES.map(mode => {
                const active = ledgerMode === mode.key;
                return (
                  <TouchableOpacity
                    key={mode.key}
                    style={[styles.modeButton, active && styles.modeButtonActive]}
                    activeOpacity={0.82}
                    onPress={() => setLedgerMode(mode.key)}
                  >
                    <Text style={[styles.modeButtonText, active && { color: SCREEN_COLORS.brand }]}>{mode.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TextInput
            value={ledgerQuery}
            onChangeText={setLedgerQuery}
            placeholder="Buscar por pedido, fornecedor, item ou SKU..."
            placeholderTextColor={SCREEN_COLORS.muted}
            style={styles.searchInput}
          />

          <ListState source={activeListSource} />
          {(ledgerMode === 'timeline' ? filteredLedgerOrders.length : filteredPurchaseMap.length) ? (
            <View style={[styles.splitLayout, !isWide && { flexDirection: 'column' }]}>
              <View style={styles.splitPrimary}>
                {ledgerMode === 'timeline' ? renderLedgerTimeline() : renderPurchaseMap()}
              </View>
              <View style={styles.splitSecondary}>
                {ledgerMode === 'timeline' ? renderLedgerDetail() : renderPurchaseMapDetail()}
              </View>
            </View>
          ) : null}
        </View>
      </>
    );
  };

  const renderRegisterCard = (sectionKey, section) => {
    const action = resourceActions[sectionKey];
    const normalizedSection = section || { title: '', ...createSourceState([]) };
    const sectionItems = Array.isArray(normalizedSection.items) ? normalizedSection.items : [];

    if (normalizedSection.status === SOURCE_STATUS.MISSING) {
      return (
        <View key={sectionKey} style={styles.registerCard}>
          <View style={styles.registerCardHeader}>
            <Text style={styles.registerCardTitle}>{normalizedSection.title}</Text>
            {action ? <ActionButton onPress={action.onPress} accent={action.accent} /> : null}
          </View>
          <MissingInfo label={normalizedSection.title} message={normalizedSection.message} />
        </View>
      );
    }

    const previewItems = sectionItems.slice(0, 3);
    return (
      <View key={sectionKey} style={styles.registerCard}>
        <View style={styles.registerCardHeader}>
          <Text style={styles.registerCardTitle}>{normalizedSection.title}</Text>
          {action ? <ActionButton onPress={action.onPress} accent={action.accent} /> : null}
        </View>
        <Text style={styles.registerCount}>{String(sectionItems.length)}</Text>
        {normalizedSection.status === SOURCE_STATUS.EMPTY ? (
          <EmptyState message={normalizedSection.message} />
        ) : (
          previewItems.map((item, index) => (
            <View key={`${sectionKey}-${item.id || index}`} style={styles.smallListItem}>
              <Text style={styles.smallListTitle}>{item.label || item.name || item.productName || `Registro ${index + 1}`}</Text>
              <Text style={styles.smallListMeta}>
                {item.valueLabel || item.document || item.email || item.dateLabel || item.segmentLabel || getPreviewText([item.supplierLabel, formatMoney(item.orderPrice), formatDate(item.date)]) || 'Registro disponível'}
              </Text>
            </View>
          ))
        )}
      </View>
    );
  };

  const renderResources = () => {
    const sections = viewModel?.resources || {};
    const orderedSections = [
      ['ingredients', sections.ingredients || { title: 'Ingredientes', ...createSourceState([]) }],
      ['recipes', sections.recipes || { title: 'Preparos', ...createSourceState([]) }],
      ['packaging', sections.packaging || { title: 'Embalagens', ...createSourceState([]) }],
      ['suppliers', sections.suppliers || { title: 'Fornecedores', ...createSourceState([]) }],
      ['purchases', sections.purchases || { title: 'Compras', ...createSourceState([]) }],
      ['inputs', sections.inputs || { title: 'Inputs', ...createSourceState([]) }],
      ['operationalExpenses', sections.operationalExpenses || { title: 'Gastos operacionais', ...createSourceState([]) }],
      ['fixedCosts', sections.fixedCosts || { title: 'Custos fixos', ...createSourceState([]) }],
      ['settings', sections.settings || { title: 'Parâmetros', ...createSourceState([]) }],
    ];

    return (
      <View style={styles.registerGrid}>
        {orderedSections.map(([key, section]) => renderRegisterCard(key, section))}
      </View>
    );
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'catalog':
        return renderCatalog();
      case 'ledger':
        return renderLedger();
      case 'resources':
        return renderResources();
      default:
        return null;
    }
  };

  if (!currentCompany || !themeColors || (state.loading && !viewModel)) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={brandColors.primary || SCREEN_COLORS.brand} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={state.refreshing}
            onRefresh={() => loadScreen(true)}
            tintColor={brandColors.primary || SCREEN_COLORS.brand}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderHero()}
        {renderTabs()}

        {state.error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Falha ao montar a tela</Text>
            <Text style={styles.errorText}>{state.error}</Text>
            <TouchableOpacity style={styles.refreshButton} activeOpacity={0.82} onPress={() => loadScreen(false)}>
              <Text style={styles.refreshButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {viewModel ? renderActiveTab() : null}
      </ScrollView>

      <AddCompanyModal
        visible={showProviderModal}
        onClose={() => setShowProviderModal(false)}
        context={providerContext}
        onSuccess={() => {
          loadScreen(true);
        }}
      />
    </SafeAreaView>
  );
}
