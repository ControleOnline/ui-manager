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
import { MAIN_TABS } from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/tabs';
import {
  resolveMenuCostsTabRoute,
} from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/navigation';
import {
  buildEngineeringResaleRows,
  resolveEngineeringBeverageCategoryIds,
} from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/engineeringCatalogAdapter';
import {
  formatDate,
  safeArray,
} from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/menuCostsShared';
import {
  fetchLatestPurchasesByProductIds,
  formatCurrency,
} from '@controleonline/ui-products/src/react/domain/productCosting';
import {
  resolveCategoryCoverUrl,
  resolveProductCoverUrl,
} from '@controleonline/ui-products/src/react/domain/productMedia';
import {
  MENU_COSTS_PAGE_SIZE,
  extractCollectionItems,
  hasHydraNext,
} from '@controleonline/ui-products/src/react/domain/menuCostsPagination';

const getToneStyle = tone => {
  if (tone === 'good') return styles.toneGood;
  if (tone === 'warn') return styles.toneWarn;
  if (tone === 'bad') return styles.toneBad;
  return styles.toneNeutral;
};

const Badge = ({ children, label, tone = 'neutral' }) => (
  <View style={[styles.badge, getToneStyle(tone)]}>
    <Text style={styles.badgeText}>{children || label}</Text>
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

const normalizeEntityId = value => {
  if (!value && value !== 0) return '';
  const raw = typeof value === 'object'
    ? value?.id || value?.['@id'] || value?.value || ''
    : value;

  return String(raw || '').replace(/\D+/g, '').trim();
};

const uniqueProducts = products => {
  const seen = new Set();
  return safeArray(products).filter(product => {
    const id = normalizeEntityId(product) || String(product?.sku || product?.product || product?.name || '').trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const resolveProductCategoryId = product =>
  normalizeEntityId(
    product?.productCategory?.category ||
      product?.productCategories?.[0]?.category ||
      product?.category ||
      product?.categoryId,
  );

const resolveRowImageUrl = (item, categories = []) => {
  const productCover = resolveProductCoverUrl(item);
  if (productCover) return productCover;

  const categoryId = item?.categoryId || resolveProductCategoryId(item);
  const category = safeArray(categories).find(row => normalizeEntityId(row) === String(categoryId || ''));
  return resolveCategoryCoverUrl(category) || null;
};

const VisualThumb = ({ label, imageUrl }) => (
  <View style={[styles.visualThumb, styles.visualThumbSmall]}>
    {imageUrl ? (
      <Image source={{ uri: imageUrl }} style={styles.visualImage} resizeMode="cover" />
    ) : (
      <Text style={styles.visualInitial}>{String(label || 'RV').slice(0, 2).toUpperCase()}</Text>
    )}
  </View>
);

const ProductRow = ({ item, selected, latestPurchase, onPress, categories }) => (
  <TouchableOpacity
    style={[styles.rowCard, selected && styles.rowCardActive]}
    activeOpacity={0.84}
    onPress={onPress}
  >
    <VisualThumb label={item.name} imageUrl={resolveRowImageUrl(item, categories)} />
    <View style={styles.rowContent}>
      <Text style={styles.rowTitle} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.rowSubtitle} numberOfLines={2}>
        {[item.sku ? `SKU ${item.sku}` : '', item.categoryLabel || 'Bebidas de revenda']
          .filter(Boolean)
          .join(' · ')}
      </Text>
      <View style={styles.badgeLine}>
        <Badge label="Revenda" tone="neutral" />
        <Badge label={item.categoryLabel || 'Bebidas'} tone={item.matchSource === 'category' ? 'good' : 'warn'} />
        <Badge label={item.matchLabel || 'Texto'} tone="neutral" />
      </View>
      <Text style={styles.rowMeta} numberOfLines={2}>
        {latestPurchase
          ? `Última compra em ${formatDate(latestPurchase.orderDate)} · ${latestPurchase.supplierLabel || 'Fornecedor'}`
          : item.description || 'Produto comercial sem ficha técnica de fabricação.'}
      </Text>
    </View>
    <View style={styles.rowRight}>
      <Text style={styles.rowMoney}>
        {formatCurrency(item.price)}
      </Text>
      {latestPurchase ? (
        <Text style={styles.rowMeta}>
          {formatCurrency(latestPurchase.unitPrice)}
        </Text>
      ) : null}
    </View>
  </TouchableOpacity>
);

const PurchaseRow = ({ item }) => (
  <View style={styles.rowCard}>
    <View style={styles.rowContent}>
      <Text style={styles.rowTitle} numberOfLines={1}>
        Compra mais recente
      </Text>
      <Text style={styles.rowSubtitle} numberOfLines={2}>
        {item.orderDate ? `Comprada em ${formatDate(item.orderDate)}` : 'Compra recente'}
      </Text>
      <Text style={styles.rowMeta} numberOfLines={2}>
        {item.quantity || 0} x {formatCurrency(item.unitPrice)}
        {item.orderId ? ` · Pedido #${item.orderId}` : ''}
      </Text>
    </View>
    <View style={styles.rowRight}>
      <Text style={styles.rowMoney}>
        {item.totalPrice ? formatCurrency(item.totalPrice) : '—'}
      </Text>
    </View>
  </View>
);

const resolveSectionTitle = () => 'Bebidas de revenda';
const RESALE_INITIAL_TARGET_ROWS = 24;
const RESALE_INITIAL_MAX_PAGES = 5;
const RESALE_CATEGORY_MAX_PAGES = 6;

export default function MenuCostsResalePage({ navigation }) {
  const { showError } = useMessage() || {};
  const peopleStore = useStore('people');
  const productsStore = useStore('products');
  const categoriesStore = useStore('categories');

  const { currentCompany } = peopleStore.getters;
  const storeCategories = categoriesStore.getters?.items || [];
  const isLoadingStore = productsStore.getters?.isLoading === true || categoriesStore.getters?.isLoading === true;
  const { width } = useWindowDimensions();
  const isWide = width >= 1060;

  const requestIdRef = useRef(0);
  const latestPurchasesRequestIdRef = useRef(0);
  const rawProductsRef = useRef([]);
  const nextPageRef = useRef(1);
  const categoriesRef = useRef([]);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [rawProducts, setRawProducts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [latestPurchasesByProductId, setLatestPurchasesByProductId] = useState({});
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [catalogCategories, setCatalogCategories] = useState([]);
  const categories = catalogCategories.length ? catalogCategories : storeCategories;

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(String(query || '').trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const resetCatalogState = useCallback(() => {
    rawProductsRef.current = [];
    nextPageRef.current = 1;
    setRawProducts([]);
    setSelectedId(null);
    setHasMoreProducts(true);
    setLoadError('');
    setDetailError('');
    setLatestPurchasesByProductId({});
    setIsLoadingDetails(false);
    setCatalogCategories([]);
  }, []);

  const fetchProductsByBeverageCategories = useCallback(async ({
    companyId,
    categoryIds,
  }) => {
    const results = [];

    for (const categoryId of categoryIds) {
      let page = 1;
      let shouldContinue = true;

      while (shouldContinue && page <= RESALE_CATEGORY_MAX_PAGES) {
        const response = await productsStore.actions.getItems({
          active: 1,
          company: companyId,
          page,
          type: ['product', 'feedstock'],
          'productCategory.category': `/categories/${categoryId}`,
          'order[product]': 'ASC',
          'order[description]': 'ASC',
        });

        const pageItems = extractCollectionItems(response);
        results.push(...pageItems);
        shouldContinue = hasHydraNext(response) || pageItems.length === MENU_COSTS_PAGE_SIZE;
        page += 1;
      }
    }

    return uniqueProducts(results);
  }, [productsStore.actions]);

  const loadProductsPage = useCallback(async ({
    pageNumber = 1,
    append = false,
    searchTerm = '',
    categoriesOverride = null,
  } = {}) => {
    const companyId = currentCompany?.id;
    if (!companyId) {
      resetCatalogState();
      return;
    }

    const requestId = ++requestIdRef.current;
    if (append) {
      setIsLoadingMore(true);
    } else {
      setLoadError('');
    }

    try {
      const activeCategories = categoriesOverride || categoriesRef.current;
      const beverageCategoryIds = resolveEngineeringBeverageCategoryIds(activeCategories);

      if (!append && !searchTerm && beverageCategoryIds.length) {
        const categoryProducts = await fetchProductsByBeverageCategories({
          companyId,
          categoryIds: beverageCategoryIds,
        });

        if (requestId !== requestIdRef.current) {
          return;
        }

        rawProductsRef.current = categoryProducts;
        setRawProducts(categoryProducts);
        nextPageRef.current = 1;
        setHasMoreProducts(false);
        setSelectedId(currentId => {
          const resaleRows = buildEngineeringResaleRows({
            products: categoryProducts,
            categories: activeCategories,
          });
          const current = resaleRows.find(product => String(product.id) === String(currentId));
          return current?.id || resaleRows[0]?.id || null;
        });
        return;
      }

      let response = null;
      let pageToLoad = pageNumber;
      let loadedPages = 0;
      let items = [];
      let lastPageItems = [];
      let combined = append ? [...rawProductsRef.current] : [];

      do {
        response = await productsStore.actions.getItems({
          active: 1,
          company: companyId,
          page: pageToLoad,
          type: ['product', 'feedstock'],
          'order[product]': 'ASC',
          'order[description]': 'ASC',
          ...(searchTerm ? { product: searchTerm } : {}),
        });

        const pageItems = extractCollectionItems(response);
        lastPageItems = pageItems;
        items = [...items, ...pageItems];
        combined = [...combined, ...pageItems];
        loadedPages += 1;
        pageToLoad += 1;

        const resaleRows = buildEngineeringResaleRows({
          products: combined,
          categories: categoriesRef.current,
        });
        const canLoadMore = hasHydraNext(response) || pageItems.length === MENU_COSTS_PAGE_SIZE;
        const reachedInitialTarget = append || resaleRows.length >= RESALE_INITIAL_TARGET_ROWS;

        if (!canLoadMore || reachedInitialTarget || loadedPages >= RESALE_INITIAL_MAX_PAGES) {
          break;
        }
      } while (true);

      if (requestId !== requestIdRef.current) {
        return;
      }

      rawProductsRef.current = combined;
      setRawProducts(combined);
      nextPageRef.current = pageToLoad;
      setHasMoreProducts(hasHydraNext(response) || lastPageItems.length === MENU_COSTS_PAGE_SIZE);
      setSelectedId(currentId => {
        const resaleRows = buildEngineeringResaleRows({
          products: combined,
          categories: categoriesRef.current,
        });
        const current = resaleRows.find(product => String(product.id) === String(currentId));
        return current?.id || resaleRows[0]?.id || null;
      });
    } catch (error) {
      const message =
        error?.response?.data?.['hydra:description'] ||
        error?.response?.data?.detail ||
        error?.message ||
        'Nao foi possivel carregar as bebidas de revenda.';

      if (requestId === requestIdRef.current) {
        setLoadError(message);
        setRawProducts([]);
        setSelectedId(null);
        showError?.(message);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoadingMore(false);
      }
    }
  }, [currentCompany?.id, fetchProductsByBeverageCategories, productsStore.actions, resetCatalogState, showError]);

  const loadCategories = useCallback(async () => {
    const companyId = currentCompany?.id;
    if (!companyId) {
      return [];
    }

    try {
      const response = await categoriesStore.actions.getItems({
        company: companyId,
        context: 'products',
        'order[name]': 'ASC',
      });
      const nextCategories = extractCollectionItems(response);
      categoriesRef.current = safeArray(nextCategories);
      setCatalogCategories(safeArray(nextCategories));
      return safeArray(nextCategories);
    } catch (error) {
      const message =
        error?.response?.data?.['hydra:description'] ||
        error?.response?.data?.detail ||
        error?.message ||
        'Nao foi possivel carregar as categorias da revenda.';
      showError?.(message);
      return [];
    }
  }, [categoriesStore.actions, currentCompany?.id, showError]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      resetCatalogState();

      const loadCatalog = async () => {
        const nextCategories = await loadCategories();

        if (!isActive) return;

        await loadProductsPage({
          pageNumber: 1,
          append: false,
          searchTerm: debouncedQuery,
          categoriesOverride: nextCategories,
        });
      };

      loadCatalog();

      return () => {
        isActive = false;
        latestPurchasesRequestIdRef.current += 1;
      };
    }, [debouncedQuery, loadCategories, loadProductsPage, resetCatalogState]),
  );

  const visibleProducts = useMemo(
    () => buildEngineeringResaleRows({
      products: rawProducts,
      categories,
    }),
    [categories, rawProducts],
  );

  useEffect(() => {
    if (!visibleProducts.length) {
      return;
    }

    const current = visibleProducts.find(item => String(item.id) === String(selectedId));
    if (!current) {
      setSelectedId(visibleProducts[0].id);
    }
  }, [selectedId, visibleProducts]);

  const selectedProduct = useMemo(
    () =>
      visibleProducts.find(item => String(item.id) === String(selectedId)) ||
      visibleProducts[0] ||
      null,
    [selectedId, visibleProducts],
  );

  const selectedLatestPurchase = useMemo(
    () => safeArray(latestPurchasesByProductId?.[selectedProduct?.id])[0] || null,
    [latestPurchasesByProductId, selectedProduct?.id],
  );
  const visibleProductIdsKey = useMemo(
    () => visibleProducts.map(item => item.id).filter(Boolean).join('|'),
    [visibleProducts],
  );

  useEffect(() => {
    const companyId = currentCompany?.id;
    const visibleIds = visibleProductIdsKey ? visibleProductIdsKey.split('|').filter(Boolean) : [];

    if (!companyId || visibleIds.length === 0) {
      setIsLoadingDetails(false);
      return;
    }

    const missingIds = visibleIds.filter(productId => !safeArray(latestPurchasesByProductId?.[productId]).length);
    if (missingIds.length === 0) {
      setIsLoadingDetails(false);
      return;
    }

    const requestId = ++latestPurchasesRequestIdRef.current;
    setIsLoadingDetails(true);
    setDetailError('');

    const loadLatestPurchases = async () => {
      try {
        const result = await fetchLatestPurchasesByProductIds({
          companyId,
          productIds: missingIds,
          limitPerProduct: 1,
          maxPages: 1,
        });

        if (requestId !== latestPurchasesRequestIdRef.current) {
          return;
        }

        setLatestPurchasesByProductId(previous => {
          const next = { ...previous };

          missingIds.forEach(productId => {
            if (Array.isArray(result?.[productId]) && result[productId].length > 0) {
              next[productId] = result[productId];
              return;
            }

            if (!Array.isArray(next[productId])) {
              next[productId] = [];
            }
          });

          return next;
        });
      } catch (error) {
        if (requestId !== latestPurchasesRequestIdRef.current) {
          return;
        }

        const message =
          error?.response?.data?.['hydra:description'] ||
          error?.response?.data?.detail ||
          error?.message ||
          'Nao foi possivel carregar a ultima compra destas bebidas.';
        setDetailError(message);
        showError?.(message);
      } finally {
        if (requestId === latestPurchasesRequestIdRef.current) {
          setIsLoadingDetails(false);
        }
      }
    };

    loadLatestPurchases();
  }, [currentCompany?.id, latestPurchasesByProductId, showError, visibleProductIdsKey]);

  const summaryRows = [
    { label: 'Carregados', value: String(rawProducts.length) },
    { label: 'Revenda', value: String(visibleProducts.length) },
    { label: 'Categorias', value: String(new Set(visibleProducts.map(item => item.categoryLabel || 'Sem categoria')).size) },
  ];

  const handleContentScroll = useCallback(
    event => {
      if (isLoadingStore || isLoadingMore || !hasMoreProducts) {
        return;
      }

      const layoutHeight = event?.nativeEvent?.layoutMeasurement?.height || 0;
      const contentOffsetY = event?.nativeEvent?.contentOffset?.y || 0;
      const contentHeight = event?.nativeEvent?.contentSize?.height || 0;

      if (layoutHeight + contentOffsetY >= contentHeight - 360) {
        loadProductsPage({
          pageNumber: nextPageRef.current,
          append: true,
          searchTerm: debouncedQuery,
        });
      }
    },
    [debouncedQuery, hasMoreProducts, isLoadingMore, isLoadingStore, loadProductsPage],
  );

  const handleTabPress = useCallback(
    tab => {
      const { routeName, params } = resolveMenuCostsTabRoute(tab);

      if (routeName === 'MenuCostsResalePage') {
        return;
      }

      navigation?.navigate?.(routeName, params || {});
    },
    [navigation],
  );

  const emptyText = debouncedQuery
    ? `Nenhuma bebida encontrada para "${debouncedQuery}".`
    : 'Nenhuma bebida de revenda encontrada no ERP.';

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={styles.page}>
        <StateStore store={['products', 'categories']} />

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
                    active={tab.key === 'resale'}
                    onPress={() => handleTabPress(tab.key)}
                    disabled={tab.key === 'resale'}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.content}>
            <View style={styles.sectionTop}>
              <View>
                <Text style={styles.sectionEyebrow}>Revenda</Text>
                <Text style={styles.sectionTitle}>{resolveSectionTitle()}</Text>
              </View>
              <SearchBox
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar bebida, SKU ou descrição"
              />
            </View>

            <ScrollView
              style={styles.contentScroll}
              contentContainerStyle={styles.contentScrollBody}
              onScroll={handleContentScroll}
              scrollEventThrottle={200}
            >
              <View style={styles.summaryStrip}>
                {summaryRows.map(row => (
                  <View key={row.label} style={styles.summaryChip}>
                    <Text style={styles.summaryChipText}>
                      {row.label}: {row.value}
                    </Text>
                  </View>
                ))}
              </View>

              {loadError ? (
                <View style={[styles.rowCard, { marginBottom: 12 }]}>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowTitle}>Erro ao carregar revenda</Text>
                    <Text style={styles.rowSubtitle}>{loadError}</Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.splitLayout}>
                <View style={styles.listPanel}>
                  {visibleProducts.length === 0 && !isLoadingStore ? (
                    <EmptyState text={emptyText} />
                  ) : null}

                  {visibleProducts.map(item => (
                    <ProductRow
                      key={item.id}
                      item={item}
                      categories={categories}
                      latestPurchase={safeArray(latestPurchasesByProductId?.[item.id])[0] || null}
                      selected={String(selectedProduct?.id) === String(item.id)}
                      onPress={() => setSelectedId(item.id)}
                    />
                  ))}

                  {isLoadingMore ? (
                    <View style={[styles.rowCard, { alignItems: 'center', justifyContent: 'center', minHeight: 80 }]}>
                      <ActivityIndicator size="small" color={MENU_COLORS.brand} />
                      <Text style={[styles.rowSubtitle, { marginTop: 8 }]}>Carregando mais bebidas...</Text>
                    </View>
                  ) : null}
                </View>

                {selectedProduct ? (
                  <View style={styles.detailPanel}>
                    <View style={styles.detailHeader}>
                      <View style={styles.detailHeaderText}>
                        <View style={styles.badgeLine}>
                          <Badge label="Revenda" tone="neutral" />
                          <Badge label={selectedProduct.categoryLabel || 'Bebidas'} tone={selectedProduct.matchSource === 'category' ? 'good' : 'warn'} />
                          <Badge label={selectedProduct.matchLabel || 'Texto'} tone="neutral" />
                        </View>
                        <Text style={styles.detailTitle}>{selectedProduct.name}</Text>
                        <Text style={styles.detailSubtitle}>
                          Produto comercial do ERP, sem ficha de fabricação interna.
                        </Text>
                      </View>
                    </View>

                    {detailError ? (
                      <View style={[styles.rowCard, { marginBottom: 12 }]}>
                        <View style={styles.rowContent}>
                          <Text style={styles.rowTitle}>Detalhe indisponivel</Text>
                          <Text style={styles.rowSubtitle}>{detailError}</Text>
                        </View>
                      </View>
                    ) : null}

                    <View style={styles.productHero}>
                      <View style={[styles.visualThumb, styles.visualThumbLarge]}>
                        {resolveRowImageUrl(selectedProduct, categories) ? (
                          <Image
                            source={{ uri: resolveRowImageUrl(selectedProduct, categories) }}
                            style={styles.visualImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text style={styles.visualInitial}>
                            {String(selectedProduct.name || 'RV').slice(0, 2).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={styles.productHeroText}>
                        <Text style={styles.productHeroTitle}>
                          {formatCurrency(selectedProduct.price)}
                        </Text>
                        <Text style={styles.productHeroSubtitle}>
                          Preço de venda atual do ERP
                        </Text>
                      </View>
                    </View>

                    <InfoGrid rows={[
                      { label: 'SKU', value: selectedProduct.sku || '—' },
                      { label: 'Categoria', value: selectedProduct.categoryLabel || '—', helper: selectedProduct.categoryPath || 'Classificação de bebida' },
                      { label: 'Tipo', value: selectedProduct.typeLabel || selectedProduct.type || 'product', helper: 'Produtos de revenda nao usam ficha tecnica de fabricacao' },
                      { label: 'Preço', value: formatCurrency(selectedProduct.price), helper: 'Preço comercial atual' },
                      { label: 'Última compra', value: selectedLatestPurchase ? `${formatDate(selectedLatestPurchase.orderDate)} · ${formatCurrency(selectedLatestPurchase.unitPrice)}` : '—', helper: selectedLatestPurchase ? selectedLatestPurchase.supplierLabel || 'Fornecedor' : 'Sem compra recente' },
                      { label: 'Quantidade', value: selectedLatestPurchase ? String(selectedLatestPurchase.quantity || 0) : '—', helper: selectedLatestPurchase ? 'Última compra carregada do ERP' : 'Sem histórico disponível' },
                    ]} />

                    <View style={styles.panelNested}>
                      <Text style={styles.panelTitle}>Última compra</Text>
                      <Text style={styles.panelSubtitle}>
                        Os dados abaixo mostram a compra mais recente encontrada para esta bebida.
                      </Text>
                      <View style={{ gap: 8, marginTop: 12 }}>
                        {selectedLatestPurchase ? (
                          <PurchaseRow item={selectedLatestPurchase} />
                        ) : isLoadingDetails ? (
                          <View style={[styles.rowCard, { alignItems: 'center', justifyContent: 'center', minHeight: 80 }]}>
                            <ActivityIndicator size="small" color={MENU_COLORS.brand} />
                            <Text style={[styles.rowSubtitle, { marginTop: 8 }]}>Carregando ultima compra...</Text>
                          </View>
                        ) : (
                          <Text style={styles.panelSubtitle}>Nenhuma compra recente encontrada para esta bebida.</Text>
                        )}
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.detailPanel}>
                    <EmptyState text={emptyText} />
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
