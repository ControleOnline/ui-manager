import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { MAIN_TABS } from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/tabs';
import {
  resolveMenuCostsTabRoute,
} from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/navigation';
import {
  buildLivePackagingDb,
} from '@controleonline/ui-products/src/react/domain/menuCostsPackaging';
import { MENU_COSTS_PAGE_SIZE } from '@controleonline/ui-products/src/react/domain/menuCostsPagination';
import { formatCurrency } from '@controleonline/ui-products/src/react/domain/productCosting';

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

const safeArray = value => (Array.isArray(value) ? value : []);

const normalizeText = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const formatDate = value => {
  if (!value) return 'Sem data';
  const text = String(value);
  if (text.includes('-')) {
    const [year, month, day] = text.split('T')[0].split('-');
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
  }
  return text;
};

const money = value => formatCurrency(Number(value || 0));

const decimal = (value, digits = 2) =>
  Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });

const evidenceLabel = value => ({
  documented: 'Comprovado',
  review: 'Revisar',
  estimated: 'Estimado',
  manual: 'Manual',
}[value] || 'Revisar');

const categoryName = (db, categoryId) =>
  safeArray(db?.categories).find(item => String(item.id) === String(categoryId))?.name || 'Sem categoria';

const filterBySearch = (items, query, selectors) => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return safeArray(items);
  }

  return safeArray(items).filter(item => {
    const haystack = selectors
      .map(selector => normalizeText(String(selector(item) || '')))
      .join(' ');
    return haystack.includes(normalizedQuery);
  });
};

const buildParentRows = (db, item) => {
  const unitCost = Number(item?.purchaseQty || 1) > 0
    ? Number(item?.purchaseCost || 0) / Number(item?.purchaseQty || 1)
    : Number(item?.purchaseCost || 0);

  return safeArray(db?.products)
    .filter(product => product?.active !== false)
    .flatMap(product =>
      safeArray(product?.components)
        .filter(component => String(component?.refType) === 'packaging' && String(component?.refId) === String(item?.id))
        .map(component => ({
          productId: product.id,
          productName: product.name || product.product || `#${product.id}`,
          productCode: product.code || product.sku || String(product.id),
          category: categoryName(db, product.categoryId),
          qty: Number(component.qty || 0),
          unit: component.unit || item?.baseUnit || 'un',
          cost: Number(component.qty || 0) * unitCost,
        })),
    )
    .sort((left, right) => String(left.productName || '').localeCompare(String(right.productName || ''), 'pt-BR'));
};

const buildPurchaseRows = (db, item) =>
  safeArray(db?.purchaseItems)
    .filter(row => String(row.resourceType) === 'packaging' && String(row.resourceId) === String(item?.id))
    .map(row => ({
      ...row,
      supplierName: row.supplierName || 'Fornecedor não vinculado',
      date: row.date || '',
    }))
    .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));

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
    <Icon name={icon} size={16} color={active ? MENU_COLORS.brandText : MENU_COLORS.muted} />
    {label ? <Text style={[styles.iconButtonText, active && styles.iconButtonTextActive]}>{label}</Text> : null}
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

const EmptyState = ({ text = 'Nenhum registro encontrado.' }) => (
  <View style={styles.emptyState}>
    <Icon name="inbox" size={24} color={MENU_COLORS.muted} />
    <Text style={styles.emptyStateText}>{text}</Text>
  </View>
);

const InfoGrid = ({ rows }) => (
  <View style={styles.infoGrid}>
    {safeArray(rows).map(row => (
      <View key={row.label} style={styles.infoCell}>
        <Text style={styles.infoLabel}>{row.label}</Text>
        <Text style={styles.infoValue} numberOfLines={2}>
          {row.value}
        </Text>
        {row.helper ? (
          <Text style={styles.infoHelper} numberOfLines={3}>
            {row.helper}
          </Text>
        ) : null}
      </View>
    ))}
  </View>
);

const RowCard = ({ item, selected, onPress, right, badges, meta, subtitle }) => (
  <TouchableOpacity
    style={[styles.rowCard, selected && styles.rowCardActive]}
    activeOpacity={onPress ? 0.84 : 1}
    onPress={onPress}
    disabled={!onPress}
  >
    <View style={[styles.visualThumb, styles.visualThumbSmall]}>
      <Text style={styles.visualInitial}>{String(item?.name || 'PK').slice(0, 2).toUpperCase()}</Text>
    </View>
    <View style={styles.rowContent}>
      <Text style={styles.rowTitle} numberOfLines={2}>
        {item.name}
      </Text>
      {subtitle ? (
        <Text style={styles.rowSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
      {badges?.length ? (
        <View style={styles.badgeLine}>
          {badges.map(badge => (
            <Badge key={badge.label} tone={badge.tone}>{badge.label}</Badge>
          ))}
        </View>
      ) : null}
      {meta ? (
        <Text style={styles.rowMeta} numberOfLines={2}>
          {meta}
        </Text>
      ) : null}
    </View>
    {right ? <View style={styles.rowRight}>{right}</View> : null}
  </TouchableOpacity>
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

const resolveSectionTitle = () => 'Embalagens cadastradas no ERP';

const resolveInitialSelection = db => safeArray(db?.packaging)[0]?.id || null;

export default function MenuCostsPackagingPage({ navigation }) {
  const messageApi = useMessage() || {};
  const { showError } = messageApi;
  const peopleStore = useStore('people');
  const productsStore = useStore('products');
  const productGroupProductStore = useStore('product_group_product');
  const ordersStore = useStore('orders');
  const categoriesStore = useStore('categories');
  const { currentCompany } = peopleStore.getters || {};
  const { width } = useWindowDimensions();
  const isWide = width >= 1060;

  const [db, setDb] = useState(EMPTY_DB);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [visibleCount, setVisibleCount] = useState(MENU_COSTS_PAGE_SIZE);
  const requestIdRef = useRef(0);

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
      const nextDb = await buildLivePackagingDb({
        companyId,
        companyIri,
        productsActions: productsStore.actions,
        productGroupProductActions: productGroupProductStore.actions,
        ordersActions: ordersStore.actions,
        categoriesActions: categoriesStore.actions,
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      setDb(nextDb);
      setSelectedId(currentSelected =>
        currentSelected && safeArray(nextDb.packaging).some(item => String(item.id) === String(currentSelected))
          ? currentSelected
          : resolveInitialSelection(nextDb),
      );
    } catch (error) {
      const message =
        error?.response?.data?.['hydra:description'] ||
        error?.response?.data?.detail ||
        error?.message ||
        'Falha ao carregar as embalagens do ERP.';
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
    if (!safeArray(db.packaging).length) return;
    if (!selectedId || !safeArray(db.packaging).some(item => String(item.id) === String(selectedId))) {
      setSelectedId(resolveInitialSelection(db));
    }
  }, [db, selectedId]);

  const handleTabPress = useCallback(
    tab => {
      const { routeName, params } = resolveMenuCostsTabRoute(tab);

      if (routeName === 'MenuCostsPackagingPage') {
        return;
      }

      navigation?.navigate?.(routeName, params || {});
    },
    [navigation],
  );

  const rows = useMemo(
    () =>
      filterBySearch(db.packaging, query, [
        item => item.name,
        item => item.code,
        item => item.description,
        item => item.notes,
        item => item.supplier,
        item => item.sourceReference,
        item => categoryName(db, item.categoryId),
      ]).sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR')),
    [db, query],
  );

  const selected = useMemo(
    () => rows.find(item => String(item.id) === String(selectedId)) || rows[0] || null,
    [rows, selectedId],
  );

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

  const parentRows = useMemo(
    () => (selected ? buildParentRows(db, selected) : []),
    [db, selected],
  );

  const purchaseRows = useMemo(
    () => (selected ? buildPurchaseRows(db, selected) : []),
    [db, selected],
  );

  const selectedWarnings = selected
    ? [
        selected.duplicateCount > 1
          ? `Este item consolida ${selected.duplicateCount} registros com o mesmo código ou nome.`
          : '',
        !selected.purchaseCost ? 'Sem custo de compra carregado.' : '',
        selected.evidenceType === 'review' ? 'Ainda não existe compra vinculada recente para este item.' : '',
      ].filter(Boolean)
    : [];

  const content = isLoadingDb ? (
    <View style={styles.emptyState}>
      <ActivityIndicator size="small" color={MENU_COLORS.brand} />
      <Text style={styles.emptyStateText}>Carregando embalagens do ERP...</Text>
    </View>
  ) : loadError ? (
    <View style={styles.emptyState}>
      <Icon name="alert-circle" size={24} color={MENU_COLORS.muted} />
      <Text style={styles.emptyStateText}>{loadError}</Text>
    </View>
  ) : rows.length === 0 ? (
    <EmptyState text="Nenhuma embalagem encontrada no ERP." />
  ) : (
    <View style={styles.splitLayout}>
      <View style={styles.listPanel}>
        <View style={styles.activeCostHeader}>
          <View>
            <Text style={styles.panelTitle}>Embalagens</Text>
            <Text style={styles.panelSubtitle}>
              Descartáveis, potes, sacolas e embalagens que entram na ficha ou repasse.
            </Text>
          </View>
          <Badge>{rows.length} item(ns)</Badge>
        </View>
        <View style={styles.badgeLine}>
          <Badge tone="good">{rows.filter(item => (item.evidenceType || item.sourceType) === 'documented').length} comprovado(s)</Badge>
          <Badge tone={rows.filter(item => item.duplicateCount > 1).length ? 'warn' : 'good'}>
            {rows.filter(item => item.duplicateCount > 1).length} duplicidade(s)
          </Badge>
        </View>
        {visibleRows.map(item => (
          <RowCard
            key={item.id}
            item={item}
            subtitle={item.description || item.notes || item.supplier || categoryName(db, item.categoryId)}
            selected={selected?.id === item.id}
            onPress={() => setSelectedId(item.id)}
            right={<Text style={styles.rowMoney}>{money(Number(item.purchaseCost || 0) / Number(item.purchaseQty || 1))}</Text>}
            badges={[
              { label: evidenceLabel(item.evidenceType || item.sourceType), tone: (item.evidenceType || item.sourceType) === 'documented' ? 'good' : 'warn' },
              item.duplicateCount > 1
                ? { label: `Duplicado x${item.duplicateCount}`, tone: 'warn' }
                : { label: categoryName(db, item.categoryId), tone: 'neutral' },
            ]}
            meta={item.supplier || item.sourceReference || ''}
          />
        ))}
        {hasMoreRows ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="small" color={MENU_COLORS.brand} />
            <Text style={styles.emptyStateText}>Carregando mais embalagens...</Text>
          </View>
        ) : null}
      </View>

      {selected ? (
        <DetailShell
          title={selected.name}
          subtitle={selected.description || selected.notes || selected.supplier || ''}
          badges={[
            { label: 'Embalagem', tone: 'neutral' },
            { label: categoryName(db, selected.categoryId), tone: 'neutral' },
            { label: evidenceLabel(selected.evidenceType || selected.sourceType), tone: (selected.evidenceType || selected.sourceType) === 'documented' ? 'good' : 'warn' },
            selected.duplicateCount > 1
              ? { label: `Consolidado x${selected.duplicateCount}`, tone: 'warn' }
              : { label: selected.code || selected.id, tone: 'neutral' },
          ]}
        >
          <View style={styles.productHero}>
            <View style={[styles.visualThumb, styles.visualThumbLarge]}>
              <Text style={styles.visualInitial}>{String(selected.name || 'PK').slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={styles.productHeroText}>
              <Text style={styles.productHeroTitle}>{categoryName(db, selected.categoryId)}</Text>
              <Text style={styles.productHeroSubtitle}>
                {selected.supplier || selected.sourceReference || 'ERP package'}
              </Text>
            </View>
          </View>

          <InfoGrid
            rows={[
              {
                label: 'Custo de compra',
                value: `${money(selected.purchaseCost)} / ${decimal(selected.purchaseQty)} un`,
                helper: selected.supplier || 'Sem fornecedor informado',
              },
              {
                label: 'Custo unitário',
                value: money(Number(selected.purchaseCost || 0) / Number(selected.purchaseQty || 1)),
                helper: selected.erpUnit || 'UN',
              },
              {
                label: 'Código ERP',
                value: selected.code || selected.sku || String(selected.id),
                helper: selected.sourceReference || 'Código consolidado',
              },
              {
                label: 'Compras',
                value: String(purchaseRows.length),
                helper: 'Últimas compras importadas do ERP',
              },
              {
                label: 'Pais vinculados',
                value: String(parentRows.length),
                helper: 'Produtos de venda que usam esta embalagem',
              },
              {
                label: 'Status',
                value: evidenceLabel(selected.evidenceType || selected.sourceType),
                helper: selected.duplicateCount > 1 ? `${selected.duplicateIds.length} duplicado(s) consolidado(s)` : selected.active ? 'Ativo' : 'Inativo',
              },
            ]}
          />

          {selectedWarnings.length ? (
            <View style={styles.panelNested}>
              <Text style={styles.panelTitle}>Atenção</Text>
              {selectedWarnings.map(message => (
                <Text key={message} style={styles.infoHelper}>{message}</Text>
              ))}
            </View>
          ) : null}

          <View style={styles.panelNested}>
            <Text style={styles.panelTitle}>Produtos-pai vinculados</Text>
            <Text style={styles.panelSubtitle}>
              A embalagem abaixo aparece diretamente na engenharia de produtos.
            </Text>
            {parentRows.length ? parentRows.map(parentRow => (
              <RowCard
                key={parentRow.productId}
                item={{ name: parentRow.productName }}
                subtitle={parentRow.category}
                meta={`${decimal(parentRow.qty, 3)} ${parentRow.unit || 'un'} · ${money(parentRow.cost)}`}
                right={<Text style={styles.rowMoney}>{parentRow.productCode}</Text>}
                badges={[{ label: 'Pai', tone: 'neutral' }]}
              />
            )) : <EmptyState text="Nenhum produto pai encontrado." />}
          </View>

          <View style={styles.panelNested}>
            <Text style={styles.panelTitle}>Histórico de compra</Text>
            {purchaseRows.length ? purchaseRows.map(row => (
              <RowCard
                key={row.id}
                item={{ name: row.description || 'Compra vinculada' }}
                subtitle={`${formatDate(row.date)} · ${row.supplierName || 'Fornecedor'}`}
                meta={`${decimal(row.quantity, 3)} un · unit ${money(row.unitPrice)}`}
                right={<Text style={styles.rowMoney}>{money(row.totalPrice)}</Text>}
                badges={[{ label: `${safeArray(row.inputs).length} evid.`, tone: safeArray(row.inputs).length ? 'good' : 'warn' }]}
              />
            )) : <EmptyState text="Sem compras vinculadas para esta embalagem." />}
          </View>
        </DetailShell>
      ) : (
        <EmptyState text="Selecione uma embalagem para ver custos, pais e compras." />
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
                    active={tab.key === 'packaging'}
                    onPress={() => handleTabPress(tab.key)}
                    disabled={tab.key === 'packaging'}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.content}>
            <View style={styles.sectionTop}>
              <View>
                <Text style={styles.sectionEyebrow}>Embalagens</Text>
                <Text style={styles.sectionTitle}>{resolveSectionTitle()}</Text>
              </View>
              <SearchBox
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar embalagem, fornecedor ou código"
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
      <StateStore stores={['people', 'products', 'product_group_product', 'product_unit', 'orders', 'categories']} />
    </SafeAreaView>
  );
}
