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
import styles from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/index.styles';
import pageStyles, { MENU_COLORS } from '@controleonline/ui-manager/src/react/pages/MenuCostsSuppliersPage/index.styles';
import { MAIN_TABS } from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/tabs';
import {
  filterSuppliers,
  getSupplierSelection,
  buildImportedSuppliersFromPeople,
} from '@controleonline/ui-people/src/react/utils/menuCostsSuppliers';
import {
  fetchLatestPurchasesByProductIds,
  formatCurrency,
} from '@controleonline/ui-products/src/react/domain/productCosting';
import {
  MENU_COSTS_PAGE_SIZE,
  extractCollectionItems,
  hasHydraNext,
} from '@controleonline/ui-products/src/react/domain/menuCostsPagination';
import {
  resolveMenuCostsTabRoute,
} from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/navigation';

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

const Badge = ({ label, tone = 'neutral' }) => {
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
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
};

const InfoGrid = ({ rows }) => (
  <View style={styles.infoGrid}>
    {rows.map(row => (
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

const ContactCard = ({ contact }) => (
  <View style={pageStyles.contactCard}>
    <Text style={pageStyles.contactName} numberOfLines={1}>
      {contact.name}
    </Text>
    <Text style={pageStyles.contactMeta} numberOfLines={1}>
      {contact.phone || 'Sem telefone'}{contact.email ? ` · ${contact.email}` : ''}
    </Text>
    <View style={pageStyles.contactBadgeRow}>
      {contact.phone ? (
        <View style={pageStyles.contactBadge}>
          <Text style={pageStyles.contactBadgeText}>Telefone</Text>
        </View>
      ) : null}
      {contact.email ? (
        <View style={pageStyles.contactBadge}>
          <Text style={pageStyles.contactBadgeText}>Email</Text>
        </View>
      ) : null}
    </View>
  </View>
);

const ProductRow = ({ item, latestPurchase }) => (
  <View style={styles.rowCard}>
    <View style={styles.rowContent}>
      <Text style={styles.rowTitle} numberOfLines={1}>
        {item.productName || item.label}
      </Text>
      <Text style={styles.rowSubtitle} numberOfLines={2}>
        {[item.productSku ? `SKU ${item.productSku}` : '', item.productType || item.type || 'Produto vinculado']
          .filter(Boolean)
          .join(' · ')}
      </Text>
      <Text style={styles.rowMeta} numberOfLines={2}>
        {latestPurchase
          ? `Última compra em ${formatDate(latestPurchase.orderDate)} · ${latestPurchase.quantity || 0} x ${formatCurrency(latestPurchase.unitPrice)}`
          : 'Sem compra recente encontrada'}
      </Text>
    </View>
    <View style={styles.rowRight}>
      <Text style={styles.rowMoney}>
        {item.amount ? formatCurrency(item.amount) : '—'}
      </Text>
    </View>
  </View>
);

const PurchaseRow = ({ item }) => (
  <View style={styles.rowCard}>
    <View style={styles.rowContent}>
      <Text style={styles.rowTitle} numberOfLines={1}>
        {item.productName || 'Produto vinculado'}
      </Text>
      <Text style={styles.rowSubtitle} numberOfLines={2}>
        {item.orderDate ? `Comprado em ${formatDate(item.orderDate)}` : 'Compra recente'}
      </Text>
      <Text style={styles.rowMeta} numberOfLines={2}>
        {item.quantity || 0} x {formatCurrency(item.unitPrice)}{item.orderId ? ` · Pedido #${item.orderId}` : ''}
      </Text>
    </View>
    <View style={styles.rowRight}>
      <Text style={styles.rowMoney}>
        {item.totalPrice ? formatCurrency(item.totalPrice) : '—'}
      </Text>
    </View>
  </View>
);

const resolveSectionTitle = () => 'Fornecedores do ERP';

const safeArray = value => (Array.isArray(value) ? value : []);

const formatDate = value => {
  if (!value) return 'Sem data';
  const [year, month, day] = String(value).split('-');
  if (!year || !month || !day) return String(value);
  return `${day}/${month}/${year}`;
};

export default function MenuCostsSuppliersPage({ navigation }) {
  const messageApi = useMessage() || {};
  const { showError } = messageApi;
  const peopleStore = useStore('people');
  const { currentCompany } = peopleStore.getters;
  const { width } = useWindowDimensions();
  const isWide = width >= 1060;
  const requestIdRef = useRef(0);
  const detailRequestIdRef = useRef(0);
  const rawSuppliersRef = useRef([]);
  const nextPageRef = useRef(1);

  const [query, setQuery] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedSupplierDetail, setSelectedSupplierDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [hasMoreSuppliers, setHasMoreSuppliers] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [latestPurchasesByProductId, setLatestPurchasesByProductId] = useState({});

  const loadSuppliersPage = useCallback(async ({ pageNumber = 1, append = false } = {}) => {
    const companyId = currentCompany?.id;
    if (!companyId) {
      rawSuppliersRef.current = [];
      nextPageRef.current = 1;
      setSuppliers([]);
      setSelectedId(null);
      setHasMoreSuppliers(false);
      setLoadError('');
      return;
    }

    const requestId = ++requestIdRef.current;
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setLoadError('');
    }

    try {
      const companyIri = `/people/${companyId}`;
      const response = await peopleStore.actions.getItems({
        'link.company': companyIri,
        'link.linkType': 'provider',
        page: pageNumber,
      }).catch(() => []);

      if (requestId !== requestIdRef.current) {
        return;
      }

      const items = extractCollectionItems(response);
      const combinedRaw = append
        ? [...rawSuppliersRef.current, ...items]
        : items;
      rawSuppliersRef.current = combinedRaw;
      nextPageRef.current = pageNumber + 1;
      setHasMoreSuppliers(hasHydraNext(response) || items.length === MENU_COSTS_PAGE_SIZE);

      const imported = buildImportedSuppliersFromPeople(combinedRaw);
      setSuppliers(imported);
      setSelectedId(currentId => {
        const current = imported.find(item => String(item.id) === String(currentId));
        return current?.id || imported[0]?.id || null;
      });
    } catch (error) {
      const message =
        error?.response?.data?.['hydra:description'] ||
        error?.response?.data?.detail ||
        error?.message ||
        'Nao foi possivel ler os fornecedores do ERP.';
      if (requestId === requestIdRef.current) {
        setSuppliers([]);
        setSelectedId(null);
        setLoadError(message);
      }
      showError?.(message);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, [currentCompany?.id, peopleStore.actions, showError]);

  useFocusEffect(
    useCallback(() => {
      rawSuppliersRef.current = [];
      nextPageRef.current = 1;
      setHasMoreSuppliers(true);
      loadSuppliersPage({pageNumber: 1, append: false});
    }, [loadSuppliersPage]),
  );

  useEffect(() => {
    if (!selectedId && suppliers[0]?.id) {
      setSelectedId(suppliers[0].id);
    }
  }, [selectedId, suppliers]);

  const filteredSuppliers = useMemo(
    () => filterSuppliers(suppliers, query),
    [query, suppliers],
  );

  const selectedSupplier = useMemo(
    () => getSupplierSelection(filteredSuppliers, selectedId),
    [filteredSuppliers, selectedId],
  );

  const selectedSupplierView = selectedSupplierDetail || selectedSupplier;

  useEffect(() => {
    const sourceIds = Array.from(
      new Set(
        safeArray(selectedSupplier?.sourceIds)
          .map(id => String(id || '').trim())
          .filter(Boolean),
      ),
    );

    if (!selectedSupplier?.id) {
      setSelectedSupplierDetail(null);
      setLatestPurchasesByProductId({});
      setDetailError('');
      setIsLoadingDetails(false);
      return;
    }

    if (sourceIds.length === 0) {
      sourceIds.push(String(selectedSupplier.id));
    }

    const requestId = ++detailRequestIdRef.current;
    setIsLoadingDetails(true);
    setDetailError('');
    setLatestPurchasesByProductId({});
    setSelectedSupplierDetail(null);

    const loadSelectedSupplier = async () => {
      try {
        const detailRecords = await Promise.all(
          sourceIds.map(id => peopleStore.actions.get(id).catch(() => null)),
        );

        if (requestId !== detailRequestIdRef.current) {
          return;
        }

        const enrichedSuppliers = buildImportedSuppliersFromPeople(
          detailRecords.filter(Boolean),
        );
        const detailedSupplier =
          enrichedSuppliers.find(item =>
            sourceIds.some(sourceId => safeArray(item.sourceIds).map(String).includes(String(sourceId))) ||
            String(item.id) === String(selectedSupplier.id),
          ) ||
          enrichedSuppliers[0] ||
          selectedSupplier;

        const detailedProducts = safeArray(detailedSupplier?.products || detailedSupplier?.movements);
        const productIds = Array.from(
          new Set(
            detailedProducts
              .map(product => String(product?.productId || '').trim())
              .filter(Boolean),
          ),
        );

        let nextLatestPurchases = {};
        if (productIds.length > 0 && currentCompany?.id) {
          nextLatestPurchases = await fetchLatestPurchasesByProductIds({
            companyId: currentCompany.id,
            providerIds: sourceIds,
            productIds,
            limitPerProduct: 1,
            maxPages: 1,
          });
        }

        if (requestId !== detailRequestIdRef.current) {
          return;
        }

        setSelectedSupplierDetail({
          ...selectedSupplier,
          ...detailedSupplier,
          products: detailedProducts,
          movements: detailedProducts,
          productCount: detailedProducts.length,
          movementCount: detailedProducts.length,
        });
        setLatestPurchasesByProductId(nextLatestPurchases);
      } catch (error) {
        if (requestId !== detailRequestIdRef.current) {
          return;
        }

        const message =
          error?.response?.data?.['hydra:description'] ||
          error?.response?.data?.detail ||
          error?.message ||
          'Nao foi possivel carregar os detalhes do fornecedor.';
        setSelectedSupplierDetail(selectedSupplier);
        setLatestPurchasesByProductId({});
        setDetailError(message);
        showError?.(message);
      } finally {
        if (requestId === detailRequestIdRef.current) {
          setIsLoadingDetails(false);
        }
      }
    };

    loadSelectedSupplier();
  }, [
    currentCompany?.id,
    peopleStore.actions,
    selectedSupplier,
    showError,
  ]);

  const latestPurchaseRows = useMemo(() => {
    const productRows = safeArray(selectedSupplierView?.products || selectedSupplierView?.movements);

    return productRows
      .map(product => {
        const latestPurchase = safeArray(latestPurchasesByProductId?.[product.productId])[0];
        if (!latestPurchase) {
          return null;
        }

        return {
          ...latestPurchase,
          productId: product.productId,
          productName: product.productName || product.label,
          productSku: product.productSku || '',
          productType: product.productType || product.type || '',
          productCost: product.amount || 0,
        };
      })
      .filter(Boolean)
      .sort((left, right) => String(right.orderDate || '').localeCompare(String(left.orderDate || '')));
  }, [latestPurchasesByProductId, selectedSupplierView?.movements, selectedSupplierView?.products]);

  const handleContentScroll = useCallback(
    event => {
      if (isLoading || isLoadingMore || !hasMoreSuppliers) {
        return;
      }

      const layoutHeight = event?.nativeEvent?.layoutMeasurement?.height || 0;
      const contentOffsetY = event?.nativeEvent?.contentOffset?.y || 0;
      const contentHeight = event?.nativeEvent?.contentSize?.height || 0;

      if (layoutHeight + contentOffsetY >= contentHeight - 360) {
        loadSuppliersPage({ pageNumber: nextPageRef.current, append: true });
      }
    },
    [hasMoreSuppliers, isLoading, isLoadingMore, loadSuppliersPage],
  );

  const handleTabPress = useCallback(
    tab => {
      const { routeName, params } = resolveMenuCostsTabRoute(tab);

      if (routeName === 'MenuCostsSuppliersPage') {
        return;
      }

      navigation?.navigate?.(routeName, params || {});
    },
    [navigation],
  );

  const summaryRows = [
    { label: 'Fornecedores', value: String(filteredSuppliers.length) },
    { label: 'Contatos', value: String(filteredSuppliers.reduce((sum, item) => sum + Number(item.contactCount || 0), 0)) },
    { label: 'Produtos', value: String(filteredSuppliers.reduce((sum, item) => sum + Number(item.productCount || item.movementCount || 0), 0)) },
  ];

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
                    active={tab.key === 'suppliers'}
                    onPress={() => handleTabPress(tab.key)}
                    disabled={tab.key === 'suppliers'}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.content}>
            <View style={styles.sectionTop}>
              <View>
                <Text style={styles.sectionEyebrow}>Fornecedores</Text>
                <Text style={styles.sectionTitle}>{resolveSectionTitle()}</Text>
              </View>
              <SearchBox
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar fornecedor, contato ou produto"
              />
            </View>

            <ScrollView
              style={styles.contentScroll}
              contentContainerStyle={styles.contentScrollBody}
              onScroll={handleContentScroll}
              scrollEventThrottle={200}
            >
              <View style={pageStyles.summaryStrip}>
                {summaryRows.map(row => (
                  <View key={row.label} style={pageStyles.summaryChip}>
                    <Text style={pageStyles.summaryChipText}>
                      {row.label}: {row.value}
                    </Text>
                  </View>
                ))}
              </View>
              {loadError ? (
                <View style={[styles.rowCard, { marginBottom: 12 }]}>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowTitle}>Erro ao carregar fornecedores</Text>
                    <Text style={styles.rowSubtitle}>{loadError}</Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.splitLayout}>
                <View style={styles.listPanel}>
                  {isLoading && filteredSuppliers.length === 0 ? (
                    <View style={[styles.rowCard, { alignItems: 'center', justifyContent: 'center', minHeight: 120 }]}>
                      <ActivityIndicator size="small" color={MENU_COLORS.brand} />
                      <Text style={[styles.rowSubtitle, { marginTop: 8 }]}>Carregando fornecedores do ERP...</Text>
                    </View>
                  ) : null}
                  {filteredSuppliers.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.rowCard, selectedSupplier?.id === item.id && styles.rowCardActive]}
                      activeOpacity={0.84}
                      onPress={() => setSelectedId(item.id)}
                    >
                      <View style={styles.rowContent}>
                        <Text style={styles.rowTitle} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={styles.rowSubtitle} numberOfLines={2}>
                          {item.legalName || item.description || item.notes || 'Cadastro consolidado do ERP'}
                        </Text>
                        <View style={styles.badgeLine}>
                          <Badge label={item.evidenceLabel} tone={item.evidenceType === 'documented' ? 'good' : item.evidenceType === 'review' ? 'warn' : 'neutral'} />
                          {item.duplicateCount > 0 ? (
                            <Badge label={`${item.sourceIds.length} cadastros`} tone="good" />
                          ) : (
                            <Badge label="Cadastro único" tone="neutral" />
                          )}
                          <Badge label={`${item.contactCount} contato(s)`} tone="neutral" />
                        </View>
                        <Text style={styles.rowMeta} numberOfLines={2}>
                          {item.sourceSummary}
                        </Text>
                      </View>
                      <View style={styles.rowRight}>
                        <Text style={styles.rowMoney}>{String(item.productCount || item.movementCount || 0)}</Text>
                        <Text style={styles.rowMeta}>produtos</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {isLoadingMore ? (
                    <View style={[styles.rowCard, { alignItems: 'center', justifyContent: 'center', minHeight: 80 }]}>
                      <ActivityIndicator size="small" color={MENU_COLORS.brand} />
                      <Text style={[styles.rowSubtitle, { marginTop: 8 }]}>Carregando mais fornecedores...</Text>
                    </View>
                  ) : null}
                </View>

                {selectedSupplierView ? (
                  <View style={styles.detailPanel}>
                    <View style={styles.detailHeader}>
                      <View style={styles.detailHeaderText}>
                        <View style={styles.badgeLine}>
                          <Badge label={selectedSupplierView.evidenceLabel} tone={selectedSupplierView.evidenceType === 'documented' ? 'good' : selectedSupplierView.evidenceType === 'review' ? 'warn' : 'neutral'} />
                          <Badge label={selectedSupplierView.sourceSummary} tone={selectedSupplierView.duplicateCount > 0 ? 'good' : 'neutral'} />
                          <Badge label={`${selectedSupplierView.contactCount} contato(s)`} tone="neutral" />
                        </View>
                        <Text style={styles.detailTitle}>{selectedSupplierView.name}</Text>
                        <Text style={styles.detailSubtitle}>
                          {selectedSupplierView.legalName || selectedSupplierView.description || 'Fornecedor consolidado a partir do catálogo importado.'}
                        </Text>
                      </View>
                    </View>

                    {detailError ? (
                      <View style={[styles.rowCard, { marginBottom: 12 }]}>
                        <View style={styles.rowContent}>
                          <Text style={styles.rowTitle}>Detalhes indisponiveis</Text>
                          <Text style={styles.rowSubtitle}>{detailError}</Text>
                        </View>
                      </View>
                    ) : null}

                    {isLoadingDetails ? (
                      <View style={[styles.rowCard, { alignItems: 'center', justifyContent: 'center', minHeight: 88, marginBottom: 12 }]}>
                        <ActivityIndicator size="small" color={MENU_COLORS.brand} />
                        <Text style={[styles.rowSubtitle, { marginTop: 8 }]}>Carregando detalhes do fornecedor...</Text>
                      </View>
                    ) : null}

                    <InfoGrid rows={[
                      { label: 'CNPJ', value: selectedSupplierView.cnpj || '—' },
                      { label: 'Local', value: [selectedSupplierView.city, selectedSupplierView.state].filter(Boolean).join(' / ') || '—', helper: selectedSupplierView.address || 'Sem endereço informado' },
                      { label: 'Tipo', value: selectedSupplierView.category || '—', helper: selectedSupplierView.sourceNames.join(' · ') || selectedSupplierView.sourceSummary },
                      { label: 'Contatos', value: String(selectedSupplierView.contactCount || 0), helper: safeArray(selectedSupplierView.contacts).map(contact => [contact.phone, contact.email].filter(Boolean).join(' · ')).join(' • ') || 'Sem contato importado' },
                      { label: 'Produtos', value: String(selectedSupplierView.productCount || selectedSupplierView.movementCount || 0), helper: selectedSupplierView.latestProductDate ? `Último: ${formatDate(selectedSupplierView.latestProductDate)}` : 'Sem vínculo importado' },
                      { label: 'Observação', value: selectedSupplierView.notes || '—', helper: selectedSupplierView.evidenceSource || 'Sem fonte registrada' },
                    ]} />

                    <View style={styles.panelNested}>
                      <Text style={styles.panelTitle}>Contatos</Text>
                      <Text style={styles.panelSubtitle}>
                        O telefone fica sempre dentro do contato, nunca no cadastro principal do fornecedor.
                      </Text>
                      <View style={pageStyles.contactList}>
                        {selectedSupplierView.contacts.length > 0 ? (
                          selectedSupplierView.contacts.map(contact => (
                            <ContactCard key={contact.id} contact={contact} />
                          ))
                        ) : (
                          <Text style={styles.panelSubtitle}>Nenhum contato importado para este fornecedor.</Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.panelNested}>
                      <Text style={styles.panelTitle}>Produtos vinculados</Text>
                      <Text style={styles.panelSubtitle}>
                        Produtos do ERP vinculados ao fornecedor, com SKU, custo e ultima compra quando existirem.
                      </Text>
                      <View style={{ gap: 8, marginTop: 12 }}>
                        {safeArray(selectedSupplierView.products || selectedSupplierView.movements).slice(0, 6).map(item => (
                          <ProductRow
                            key={item.id}
                            item={item}
                            latestPurchase={safeArray(latestPurchasesByProductId?.[item.productId])[0] || null}
                          />
                        ))}
                        {safeArray(selectedSupplierView.products || selectedSupplierView.movements).length === 0 ? (
                          <Text style={styles.panelSubtitle}>Nenhum produto vinculado no ERP para este fornecedor.</Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.panelNested}>
                      <Text style={styles.panelTitle}>Últimas compras</Text>
                      <Text style={styles.panelSubtitle}>
                        Compras mais recentes encontradas para os produtos vinculados ao fornecedor.
                      </Text>
                      <View style={{ gap: 8, marginTop: 12 }}>
                        {latestPurchaseRows.slice(0, 6).map(item => (
                          <PurchaseRow key={`${item.orderId || 'order'}-${item.productId || item.id}`} item={item} />
                        ))}
                        {latestPurchaseRows.length === 0 ? (
                          <Text style={styles.panelSubtitle}>Nenhuma compra recente encontrada para este fornecedor.</Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
