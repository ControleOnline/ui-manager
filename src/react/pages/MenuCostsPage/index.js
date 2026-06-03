/* eslint-disable no-unused-vars */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
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
  MAIN_TABS,
  PRODUCT_DETAIL_TABS,
  RESOURCE_META,
  STORAGE_KEY,
  activeCostOptionsForRef,
  activeCostSummary,
  buildErpCatalogCsv,
  buildErpExportPayload,
  buildExportPayload,
  categoryName,
  cloneSeedData,
  comparableCostLabel,
  componentCost,
  computeAllProducts,
  computeEngineeringProducts,
  computeProduct,
  dashboardMetrics,
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
  extractItems,
  normalizeEntityId,
  validateImportedDb,
} from './viewModel';
import {
  resolveCategoryCoverUrl,
  resolveEntityCoverUrl,
  resolveProductCoverUrl,
} from '@controleonline/ui-products/src/react/domain/productMedia';

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

const VisualThumb = ({ source, label, size = 'md' }) => (
  <View style={[styles.visualThumb, size === 'lg' && styles.visualThumbLarge, size === 'sm' && styles.visualThumbSmall]}>
    {source ? (
      <Image source={source} style={styles.visualImage} resizeMode="cover" />
    ) : (
      <Text style={styles.visualInitial}>{String(label || 'GY').slice(0, 2).toUpperCase()}</Text>
    )}
  </View>
);

const MetricCard = ({ label, value, tone }) => (
  <View style={styles.metricCard}>
    <Text style={[styles.metricValue, tone === 'warn' && styles.metricValueWarn, tone === 'good' && styles.metricValueGood]}>
      {value}
    </Text>
    <Text style={styles.metricLabel}>{label}</Text>
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

const QuantityField = ({ value, unit, onChangeText, compact }) => (
  <View style={[styles.quantityField, compact && styles.quantityFieldCompact]}>
    <TextInput
      value={String(value ?? '')}
      onChangeText={onChangeText}
      keyboardType="numeric"
      style={styles.quantityInput}
      placeholderTextColor={MENU_COLORS.muted}
    />
    <Text style={styles.quantityUnit}>{unit}</Text>
  </View>
);

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

const ComponentNode = ({ db, node, depth = 0, onQtyChange }) => {
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
          <QuantityField value={node.qty} unit={node.unit} onChangeText={value => onQtyChange(value)} />
        </View>
        <View style={styles.componentCostCell}>
          <Text style={styles.infoLabel}>Custo-base</Text>
          <Text style={styles.infoValue}>{baseCostLabel}</Text>
          {costSummary?.source ? <Text style={styles.infoHelper} numberOfLines={2}>{costSummary.source}</Text> : null}
        </View>
        <View style={styles.componentCostCell}>
          <Text style={styles.infoLabel}>Leitura</Text>
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

export default function MenuCostsPage({ navigation, route }) {
  const messageApi = useMessage() || {};
  const { showError, showSuccess } = messageApi;
  const { width } = useWindowDimensions();
  const isWide = width >= 1060;
  const routeSection = route?.params?.section;
  const initialSection = resolveMenuCostsInitialSection(route);
  const [db, setDb] = useState(() => cloneSeedData());
  const [activeTab, setActiveTab] = useState(initialSection);
  const [activeProductTab, setActiveProductTab] = useState(
    resolveInitialProductTab(initialSection),
  );
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(() =>
    getSectionDefaultSelection(cloneSeedData(), initialSection),
  );
  const [modal, setModal] = useState(null);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(value => {
        if (!alive || !value) return;
        setDb(JSON.parse(value));
      })
      .catch(() => showError?.('Não foi possível ler os dados locais da Engenharia.'));
    return () => {
      alive = false;
    };
  }, [showError]);

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
    const nextDb = cloneSeedData();
    await AsyncStorage.removeItem(STORAGE_KEY);
    setDb(nextDb);
    setSelectedId(getSectionDefaultSelection(nextDb, activeTab));
    showSuccess?.('Base local restaurada a partir do PWA.');
  }, [activeTab, showSuccess]);

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
              {activeTab !== 'dashboard' && activeTab !== 'settings' ? (
                <SearchBox value={query} onChangeText={setQuery} placeholder="Buscar na engenharia" />
              ) : null}
            </View>
            <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentScrollBody}>
              {renderContent({
                activeTab,
                db,
                query,
                selectedId,
                setSelectedId,
                activeProductTab,
                setActiveProductTab,
                openModal: setModal,
                patchCollectionItem,
                patchProductComponent,
                patchProductAddonComponent,
                patchRecipeComponent,
                patchActiveCost,
                persistDb,
                showError,
                showSuccess,
              })}
            </ScrollView>
          </View>
        </View>
      </View>
      <StateStore stores={['products', 'product_group_product', 'product_unit']} />
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
  if (activeTab === 'purchases') return 'Mapa auditável de compras, notas e comprovantes';
  if (activeTab === 'processes') return 'Matriz de processo operacional';
  if (activeTab === 'pending') return 'Itens que pedem revisão';
  if (activeTab === 'settings') return 'Parâmetros locais da engenharia';
  return RESOURCE_META[activeTab]?.description || 'Engenharia';
}

function renderContent(props) {
  const { activeTab } = props;
  if (activeTab === 'dashboard') return <Dashboard {...props} />;
  if (activeTab === 'products') return <ProductsView {...props} />;
  if (['ingredients', 'packaging'].includes(activeTab)) return <SupplyResourceView {...props} collection={activeTab} />;
  if (activeTab === 'recipes') return <ResourceView {...props} collection={activeTab} />;
  if (activeTab === 'resale') return <ResaleView {...props} />;
  if (activeTab === 'purchases') return <PurchasesView {...props} />;
  if (activeTab === 'processes') return <ProcessesView {...props} />;
  if (activeTab === 'suppliers') return <SuppliersView {...props} />;
  if (activeTab === 'pending') return <PendingView {...props} />;
  if (activeTab === 'settings') return <SettingsView {...props} />;
  return <EmptyState />;
}

function Dashboard({ db, setSelectedId }) {
  const metrics = dashboardMetrics(db);
  const products = computeAllProducts(db);
  const byMargin = [...products].sort((left, right) => left.marginPct - right.marginPct).slice(0, 8);
  const purchases = safeArray(db.purchaseOrders)
    .filter(order => order.date)
    .sort((left, right) => String(right.date).localeCompare(String(left.date)))
    .slice(0, 8);

  return (
    <View style={styles.stack}>
      <View style={styles.metricGrid}>
        {metrics.map(metric => (
          <MetricCard
            key={metric.key}
            label={metric.label}
            value={metric.value}
            tone={metric.tone}
          />
        ))}
      </View>
      <View style={styles.gridTwo}>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Produtos que pedem atenção</Text>
          {byMargin.map(item => (
            <RowCard
              key={item.product.id}
              title={item.product.name}
              subtitle={categoryName(db, item.product.categoryId)}
              meta={`Custo ${money(item.directCost)} · Preço ${money(item.salePrice)}`}
              onPress={() => setSelectedId(item.product.id)}
              badges={[{ label: percent(item.marginPct), tone: item.marginPct >= targetMarginPct(db) ? 'good' : 'warn' }]}
            />
          ))}
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Últimas compras</Text>
          {purchases.map(order => (
            <RowCard
              key={order.id}
              title={order.label || 'Compra'}
              subtitle={`${formatDate(order.date)} · ${getById(db, 'suppliers', order.supplierId)?.name || 'Fornecedor não vinculado'}`}
              meta={order.evidenceSource || order.notes}
              right={<Text style={styles.rowMoney}>{money(order.totalAmount)}</Text>}
              badges={[{ label: paymentLabel(order.paymentStatus), tone: order.paymentStatus === 'paid' ? 'good' : 'warn' }]}
            />
          ))}
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
  patchProductAddonComponent,
}) {
  const products = filterBySearch(computeEngineeringProducts(db), query, [
    item => item.product.name,
    item => item.product.code,
    item => categoryName(db, item.product.categoryId),
  ]);
  const selectedProduct = products.find(item => String(item.product.id) === String(selectedId)) || products[0] || null;
  const selected = selectedProduct ? computeProduct(db, selectedProduct.product.id) : null;
  const grouped = groupBy(products, item => categoryName(db, item.product.categoryId));

  return (
    <View style={styles.splitLayout}>
      <View style={styles.listPanel}>
        {Object.entries(grouped).map(([category, rows]) => (
          <View key={category} style={styles.listGroup}>
            <Text style={styles.listGroupTitle}>{category}</Text>
            {rows.map(item => (
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
            ))}
          </View>
        ))}
      </View>
      <ProductDetail
        db={db}
        computed={selected}
        activeProductTab={activeProductTab}
        setActiveProductTab={setActiveProductTab}
        openModal={openModal}
        patchProductComponent={patchProductComponent}
        patchProductAddonComponent={patchProductAddonComponent}
        readOnly
      />
    </View>
  );
}

function ProductDetail({
  db,
  computed,
  activeProductTab,
  setActiveProductTab,
  openModal,
  patchProductComponent,
  patchProductAddonComponent,
  readOnly = false,
}) {
  if (!computed) return <EmptyState text="Selecione um produto para ver a ficha." />;
  const product = computed.product;
  const purchases = productPurchaseRows(db, computed);

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
            {safeArray(product.components).length} componente(s) base · {safeArray(product.addons).length} grupo(s)/adicional(is) · {product.includeInCatalogCount === false ? 'fora da contagem' : 'conta no cardápio'}
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
            <Text style={styles.panelTitle}>Componentes fixos auditáveis</Text>
            <Text style={styles.panelSubtitle}>A quantidade nesta ficha recalcula custo técnico, obrigatórios, margem e preço pela regra.</Text>
            {computed.nodes.map((node, index) => (
              <ComponentNode
                key={node.key}
                db={db}
                node={node}
                onQtyChange={readOnly ? undefined : value => patchProductComponent?.(product.id, index, { qty: num(value) })}
              />
            ))}
          </View>
        </View>
      ) : null}
      {activeProductTab === 'addons' ? (
        <View style={styles.stack}>
          {safeArray(computed.addons).length ? safeArray(computed.addons).map(addon => (
            <View key={addon.id || addon.name} style={styles.addonCard}>
              <View style={styles.nodeHeader}>
                <VisualThumb source={imageForAddon(db, addon)} label={addon.name} size="sm" />
                <View>
                  <Text style={styles.nodeTitle}>{addon.name}</Text>
                  <Text style={styles.nodeMeta}>
                    {addon.group || 'Adicional'} · {addon.required ? 'obrigatório' : 'opcional'} · min {addon.minimum || 0} · max {addon.maximum || 'livre'}
                  </Text>
                </View>
                <Text style={styles.nodeCost}>{money(addon.directCost)} / + {money(addon.salePriceDelta)}</Text>
              </View>
              <Text style={styles.infoHelper}>{addon.notes}</Text>
              {addon.nodes.length ? addon.nodes.map((node, index) => (
                <ComponentNode
                  key={node.key}
                  db={db}
                  node={node}
                  onQtyChange={readOnly ? undefined : value => patchProductAddonComponent?.(product.id, addon.id, index, { qty: num(value) })}
                />
              )) : <Text style={styles.infoHelper}>Grupo sem custo direto. Obrigatoriedade e regra continuam preservadas.</Text>}
            </View>
          )) : <EmptyState text="Produto sem grupos ou adicionais." />}
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
          {['Item', 'Fonte ativa', 'Custo ativo', 'Leitura', 'Histórico', 'Auditoria'].map(label => (
            <Text key={label} style={styles.tableHeaderText}>{label}</Text>
          ))}
        </View>
        {safeArray(rows).map(item => {
          const summary = activeCostSummary(db, refType, item);
          const selected = String(selectedId) === String(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.tableRow, selected && styles.tableRowActive]}
              activeOpacity={0.82}
              onPress={() => onSelect?.(item.id)}
            >
              <Text style={styles.tableCell}>{item.name}</Text>
              <Text style={styles.tableCell}>{summary.modeLabel}{'\n'}{summary.source}</Text>
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
              <Text style={styles.tableCell}>{summary.purchaseCount} compra(s)</Text>
              <Text style={styles.tableCell}>{evidenceLabel(item.evidenceType || item.sourceType)}</Text>
            </TouchableOpacity>
          );
        })}
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

const uniqueByIdentifier = items => {
  const seen = new Set();
  return safeArray(items).filter(item => {
    const identifier = String(item?.id || item?.['@id'] || '').trim();
    if (!identifier || seen.has(identifier)) return false;
    seen.add(identifier);
    return true;
  });
};

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

const fetchAllItems = async (actions, params, pageSize = 200, maxPages = 6) => {
  if (!actions?.getItems) return [];

  const items = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const response = await actions.getItems({
      ...params,
      page,
      itemsPerPage: pageSize,
    });
    const batch = extractItems(response);
    items.push(...batch);

    if (!response?.['hydra:view']?.next || batch.length < pageSize) {
      break;
    }
  }

  return uniqueByIdentifier(items);
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
        fetchAllItems(productsStore.actions, {
          company: companyId,
          people: companyIri,
          active: 1,
          'order[product]': 'ASC',
        }, 250, 6),
        fetchAllItems(productUnitStore.actions, {
          people: companyIri,
        }, 250, 3),
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
        const relationResponse = await productGroupProductStore.actions.getItems({
          product: parentRow.remoteParentIri,
          productChild: childIri,
          productType: row.productType,
          itemsPerPage: 50,
        }).catch(() => []);
        const relationItems = extractItems(relationResponse);
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
      <Text style={styles.panelTitle}>Parâmetros locais</Text>
      <Text style={styles.panelSubtitle}>Nesta primeira etapa, estes valores atualizam apenas a base local da rota.</Text>
      <View style={styles.modalGrid}>
        <Field label="Markup padrão (%)" value={draft.defaultMarkupPct} onChangeText={value => setDraft(prev => ({ ...prev, defaultMarkupPct: value }))} inputProps={{ keyboardType: 'numeric' }} />
        <Field label="Margem alvo (%)" value={draft.targetMarginPct} onChangeText={value => setDraft(prev => ({ ...prev, targetMarginPct: value }))} inputProps={{ keyboardType: 'numeric' }} />
        <Field label="Unidades mensais estimadas" value={draft.customMonthlyUnits} onChangeText={value => setDraft(prev => ({ ...prev, customMonthlyUnits: value }))} inputProps={{ keyboardType: 'numeric' }} />
      </View>
      <TouchableOpacity style={styles.primaryButton} onPress={save}>
        <Icon name="save" size={16} color={MENU_COLORS.white} />
        <Text style={styles.primaryButtonText}>Salvar parâmetros</Text>
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
