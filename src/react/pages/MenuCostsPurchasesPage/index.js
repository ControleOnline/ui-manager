/* eslint-disable no-unused-vars */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import {useStore} from '@store';
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import OrderHeader from '@controleonline/ui-orders/src/react/components/OrderHeader';
import OrderAttachmentManager from '@controleonline/ui-orders/src/react/pages/orders/sales/components/OrderAttachmentManager';
import {buildOrderDetailsRouteParams} from '@controleonline/ui-orders/src/react/utils/orderRoute';
import {normalizeEntityId} from '@controleonline/ui-orders/src/utils/orderState';
import {
  buildPurchaseHistoryLoadedKey,
  buildPurchaseHistoryQuery,
  countOrderAttachments,
  normalizeCollection,
  resolveOrderAttachmentKind,
  resolveOrderAttachmentLabel,
  resolvePurchaseOrderDate,
  resolvePurchaseOrderDocument,
  resolvePurchaseOrderLineLabel,
  resolvePurchaseOrderLineQuantity,
  resolvePurchaseOrderLineTotal,
  resolvePurchaseOrderLineUnit,
  resolvePurchaseOrderLineUnitPrice,
  resolvePurchaseSupplierLabel,
} from '@controleonline/ui-orders/src/react/utils/menuCostsPurchases';
import {MAIN_TABS} from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/tabs';
import {
  resolveMenuCostsTabRoute,
} from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/navigation';
import {resolveFileImageUrl, resolveFileDownloadUrl} from '@controleonline/ui-common/src/react/utils/fileUrl';
import {
  extractCollectionItems,
  hasHydraNext,
} from '@controleonline/ui-products/src/react/domain/menuCostsPagination';
import styles, {MENU_COLORS} from './styles';

const getNativeWebView = () => {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    return require('react-native-webview').WebView;
  } catch {
    return null;
  }
};

const NativeWebView = getNativeWebView();

const IconButton = ({icon, label, onPress, active, disabled = false, primary = false}) => (
  <TouchableOpacity
    style={[
      styles.iconButton,
      active && styles.iconButtonActive,
      primary && styles.toolbarButtonPrimary,
      disabled && {opacity: 0.6},
    ]}
    activeOpacity={disabled ? 1 : 0.82}
    onPress={disabled ? undefined : onPress}
    disabled={disabled}
  >
    <Icon name={icon} size={16} color={active || primary ? MENU_COLORS.brand : MENU_COLORS.muted} />
    {label ? (
      <Text
        style={[
          styles.iconButtonText,
          active && styles.iconButtonTextActive,
          primary && styles.toolbarButtonTextPrimary,
        ]}
      >
        {label}
      </Text>
    ) : null}
  </TouchableOpacity>
);

const ToolbarButton = ({icon, label, onPress, primary = false, disabled = false}) => (
  <TouchableOpacity
    style={[
      styles.toolbarButton,
      primary && styles.toolbarButtonPrimary,
      disabled && {opacity: 0.6},
    ]}
    activeOpacity={disabled ? 1 : 0.82}
    onPress={disabled ? undefined : onPress}
    disabled={disabled}
  >
    <Icon name={icon} size={16} color={primary ? MENU_COLORS.brand : MENU_COLORS.brandText} />
    <Text style={[styles.toolbarButtonText, primary && styles.toolbarButtonTextPrimary]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const Badge = ({label, tone = 'neutral'}) => {
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

const SearchBox = ({value, onChangeText, placeholder}) => (
  <View style={styles.searchBox}>
    <Icon name="search" size={16} color={MENU_COLORS.muted} />
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={MENU_COLORS.muted}
      style={styles.searchInput}
    />
    {!!value && (
      <TouchableOpacity onPress={() => onChangeText('')} style={styles.searchClearButton}>
        <Icon name="x-circle" size={16} color={MENU_COLORS.muted} />
      </TouchableOpacity>
    )}
  </View>
);

const EmptyState = ({text = 'Nenhum registro encontrado.'}) => (
  <View style={styles.emptyState}>
    <Icon name="inbox" size={24} color={MENU_COLORS.muted} />
    <Text style={styles.emptyStateText}>{text}</Text>
  </View>
);

const InfoGrid = ({rows}) => (
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

const isImageAttachment = file => {
  const fileType = String(file?.fileType || '').trim().toLowerCase();
  const fileName = String(file?.fileName || file?.name || file?.path || '').trim().toLowerCase();
  return fileType === 'image' || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName);
};

const AttachmentCard = ({relation, onPress, company}) => {
  const file = relation?.file || relation;
  const previewUrl = resolveFileImageUrl(file, {company});

  return (
  <TouchableOpacity
    style={styles.attachmentCard}
    activeOpacity={0.82}
    onPress={onPress}
  >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 10,
          backgroundColor: '#F8FAFC',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          marginRight: 12,
        }}
      >
        {isImageAttachment(file) && previewUrl ? (
          <Image
            source={{uri: previewUrl}}
            style={{width: '100%', height: '100%'}}
            resizeMode="cover"
          />
        ) : (
          <Text style={{fontSize: 18}}>📎</Text>
        )}
      </View>
      <View style={styles.attachmentMain}>
        <Text style={styles.attachmentTitle} numberOfLines={2}>
          {resolveOrderAttachmentLabel(relation)}
        </Text>
        <Text style={styles.attachmentMeta} numberOfLines={1}>
          {resolveOrderAttachmentKind(relation)}
        </Text>
      </View>
      <Text style={styles.attachmentAction}>
        Abrir
      </Text>
    </TouchableOpacity>
  );
};

const resolveSectionTitle = () => 'Mapa de compras por item';
const MAP_CELL_VISIBLE_LIMIT = 3;
const ITEM_HISTORY_VISIBLE_STEP = 5;

const getOrderKey = order => normalizeEntityId(order) || String(order?.id || '');

const getOrderDateLabel = order => {
  const value = resolvePurchaseOrderDate(order);
  return value ? Formatter.formatDateYmdTodmY(value, true) : 'Sem data';
};

const getOrderTotalLabel = order =>
  Formatter.formatMoney(Number(order?.price || order?.totalAmount || 0));

const normalizeMapText = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const itemMapKey = line => {
  const productId = normalizeEntityId(line?.product);
  if (productId) return `product:${productId}`;
  return `label:${normalizeMapText(resolvePurchaseOrderLineLabel(line)).replace(/[^a-z0-9]+/g, '-')}`;
};

const compactDate = value => {
  const formatted = value ? Formatter.formatDateYmdTodmY(value, false) : '';
  return formatted || 'sem data';
};

const comparableUnitLabel = line => {
  const unit = resolvePurchaseOrderLineUnit(line);
  const price = resolvePurchaseOrderLineUnitPrice(line);
  return `${Formatter.formatMoney(price)} / ${unit}`;
};

const buildEvidenceLinks = order => {
  const orderId = getOrderKey(order);
  const label = resolvePurchaseOrderDocument(order) || `#${orderId}`;
  return orderId ? [{id: orderId, label: `${compactDate(resolvePurchaseOrderDate(order))} · ${label}`, order}] : [];
};

const defaultResolveOperationalGroup = value => String(value || '').trim() || 'Itens comprados';

const buildPurchaseItemMapRows = (orders, resolveOperationalGroup = defaultResolveOperationalGroup) => {
  const groups = new Map();

  normalizeCollection(orders).forEach(order => {
    const lines = normalizeCollection(order?.orderProducts);
    lines.forEach(line => {
      const key = itemMapKey(line);
      const label = resolvePurchaseOrderLineLabel(line);
      const supplier = resolvePurchaseSupplierLabel(order);
      const total = resolvePurchaseOrderLineTotal(line);
      const unitPrice = resolvePurchaseOrderLineUnitPrice(line);
      const date = resolvePurchaseOrderDate(order);
      const orderId = getOrderKey(order);
      const current = groups.get(key) || {
        key,
        label,
        groupName: resolveOperationalGroup(label),
        purchases: [],
        suppliers: new Map(),
        totalPaid: 0,
        minUnitPrice: unitPrice || 0,
        maxUnitPrice: unitPrice || 0,
        latestOrder: order,
      };

      current.purchases.push({order, line, date, supplier, total, unitPrice, orderId});
      current.suppliers.set(supplier, (current.suppliers.get(supplier) || 0) + 1);
      current.totalPaid += total;
      current.latestOrder = current.latestOrder && String(resolvePurchaseOrderDate(current.latestOrder) || '') > String(date || '')
        ? current.latestOrder
        : order;
      if (unitPrice > 0) {
        current.minUnitPrice = current.minUnitPrice ? Math.min(current.minUnitPrice, unitPrice) : unitPrice;
        current.maxUnitPrice = Math.max(current.maxUnitPrice || 0, unitPrice);
      }
      groups.set(key, current);
    });
  });

  return Array.from(groups.values())
    .map(row => ({
      ...row,
      purchases: row.purchases.sort((left, right) => String(right.date || '').localeCompare(String(left.date || ''))),
      supplierNames: Array.from(row.suppliers.keys()).filter(Boolean),
      evidenceLinks: row.purchases.flatMap(purchase => buildEvidenceLinks(purchase.order)),
    }))
    .sort((left, right) => String(left.label).localeCompare(String(right.label), 'pt-BR'));
};

const groupMapRows = rows =>
  Array.from(rows.reduce((groups, row) => {
    const current = groups.get(row.groupName) || [];
    groups.set(row.groupName, [...current, row]);
    return groups;
  }, new Map()).entries()).sort(([left], [right]) => String(left).localeCompare(String(right), 'pt-BR'));

const orderOperationalGroupEntries = (entries = [], emptyGroups = [], includeEmpty = false) => {
  const entryMap = new Map(entries);
  const names = new Set([
    ...(includeEmpty ? normalizeCollection(emptyGroups) : []),
    ...Array.from(entryMap.keys()),
  ]);
  const orderMap = new Map(normalizeCollection(emptyGroups).map((groupName, index) => [groupName, index]));

  return Array.from(names)
    .map(groupName => [groupName, normalizeCollection(entryMap.get(groupName))])
    .filter(([, rows]) => includeEmpty || rows.length > 0)
    .sort(([left], [right]) => {
      const leftOrder = orderMap.has(left) ? orderMap.get(left) : Number.MAX_SAFE_INTEGER;
      const rightOrder = orderMap.has(right) ? orderMap.get(right) : Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return String(left).localeCompare(String(right), 'pt-BR');
    });
};

const MapCellList = ({items, empty = 'Sem histórico'}) => {
  const visibleItems = normalizeCollection(items).slice(0, MAP_CELL_VISIBLE_LIMIT);
  const extraCount = Math.max(0, normalizeCollection(items).length - visibleItems.length);

  if (!visibleItems.length) {
    return <Text style={styles.mapCellMuted}>{empty}</Text>;
  }

  return (
    <View style={styles.mapCellStack}>
      {visibleItems.map((item, index) => (
        <Text key={`${item}-${index}`} style={styles.mapCellText} numberOfLines={2}>
          {item}
        </Text>
      ))}
      {extraCount > 0 ? <Badge label={`+${extraCount}`} tone="neutral" /> : null}
    </View>
  );
};

const PurchaseMapRow = ({row, selected, onPress, onOpenEvidence}) => {
  const latest = row.purchases[0] || {};
  const historyItems = row.purchases.map(purchase => (
    `${compactDate(purchase.date)} · ${purchase.supplier} · ${resolvePurchaseOrderLineQuantity(purchase.line)} ${resolvePurchaseOrderLineUnit(purchase.line)} · ${Formatter.formatMoney(purchase.unitPrice)}`
  ));
  const priceItems = row.purchases.map(purchase => comparableUnitLabel(purchase.line));
  const supplierItems = row.supplierNames.slice(0, MAP_CELL_VISIBLE_LIMIT);
  const evidenceItems = row.evidenceLinks.slice(0, MAP_CELL_VISIBLE_LIMIT);

  return (
    <TouchableOpacity
      style={[styles.mapRow, selected && styles.mapRowSelected]}
      activeOpacity={0.84}
      onPress={() => onPress?.(row)}
    >
      <View style={[styles.mapCell, styles.mapProductCell]}>
        <Text style={styles.mapProductTitle} numberOfLines={1}>{row.label}</Text>
        <Text style={styles.mapProductMeta}>{row.purchases.length} compra(s)</Text>
      </View>
      <View style={[styles.mapCell, styles.mapHistoryCell]}>
        <MapCellList items={historyItems} />
      </View>
      <View style={[styles.mapCell, styles.mapPriceCell]}>
        <Text style={styles.mapProductTitle}>{latest.line ? comparableUnitLabel(latest.line) : 'Sem preço'}</Text>
        <Text style={styles.mapProductMeta}>
          faixa {Formatter.formatMoney(row.minUnitPrice)} a {Formatter.formatMoney(row.maxUnitPrice)}
        </Text>
        <MapCellList items={priceItems.slice(1)} empty="" />
      </View>
      <View style={[styles.mapCell, styles.mapSupplierCell]}>
        <Text style={styles.mapProductTitle}>{row.supplierNames.length}</Text>
        <MapCellList items={supplierItems} />
      </View>
      <View style={[styles.mapCell, styles.mapPaidCell]}>
        <Text style={styles.mapProductTitle}>{Formatter.formatMoney(row.totalPaid)}</Text>
        <Text style={styles.mapProductMeta}>{row.purchases.length} registro(s)</Text>
      </View>
      <View style={[styles.mapCell, styles.mapEvidenceCell]}>
        <View style={styles.evidenceChipList}>
          {evidenceItems.map(link => (
            <TouchableOpacity
              key={`${link.id}-${link.label}`}
              style={styles.evidenceChip}
              activeOpacity={0.82}
              onPress={() => onOpenEvidence?.(link.order)}
            >
              <Text style={styles.evidenceChipText} numberOfLines={1}>{link.label}</Text>
            </TouchableOpacity>
          ))}
          {row.evidenceLinks.length > evidenceItems.length ? (
            <Badge label={`+${row.evidenceLinks.length - evidenceItems.length}`} tone="neutral" />
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function MenuCostsPurchasesPage({
  navigation,
  resolveOperationalGroup = defaultResolveOperationalGroup,
  operationalGroups = [],
}) {
  const {showError} = useMessage() || {};
  const peopleStore = useStore('people');
  const ordersStore = useStore('orders');
  const orderFileStore = useStore('order_file');
  const {currentCompany} = peopleStore.getters || {};
  const {width} = useWindowDimensions();
  const isWide = width >= 1060;

  const ordersActions = ordersStore.actions || {};
  const orderFileActions = orderFileStore.actions || {};

  const {items: storedOrders, totalItems, isLoadingList} = ordersStore.getters || {};

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedMapKey, setSelectedMapKey] = useState('');
  const [orderDetailsById, setOrderDetailsById] = useState({});
  const [selectedOrderLoading, setSelectedOrderLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [attachmentsVisible, setAttachmentsVisible] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsLoadingMore, setAttachmentsLoadingMore] = useState(false);
  const [attachmentsHasMore, setAttachmentsHasMore] = useState(false);
  const [visibleItemHistoryCount, setVisibleItemHistoryCount] = useState(ITEM_HISTORY_VISIBLE_STEP);
  const [expandedPurchaseGroups, setExpandedPurchaseGroups] = useState(new Set());

  const lastLoadedSelectedIdRef = useRef('');
  const nextPageRef = useRef(1);
  const attachmentNextPageRef = useRef(1);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const historyQuery = useMemo(
    () =>
      buildPurchaseHistoryQuery({
        companyId: currentCompany?.id,
        searchText: debouncedQuery,
        page: 1,
        orderField: 'id',
        orderDirection: 'desc',
      }),
    [currentCompany?.id, debouncedQuery],
  );

  const historyLoadedKey = useMemo(
    () =>
      buildPurchaseHistoryLoadedKey({
        companyId: currentCompany?.id,
        searchText: debouncedQuery,
        orderField: 'id',
        orderDirection: 'desc',
      }),
    [currentCompany?.id, debouncedQuery],
  );

  const storedOrderList = Array.isArray(storedOrders) ? storedOrders : [];
  const hasMore = Number(totalItems || 0) > storedOrderList.length;

  const loadOrdersPage = useCallback(
    async ({pageNumber = 1, append = false} = {}) => {
      if (!historyQuery) {
        ordersActions.setItems?.([]);
        ordersActions.setTotalItems?.(0);
        setSelectedOrderId('');
        setSelectedMapKey('');
        setSelectedOrder(null);
        return;
      }

      try {
        if (append) {
          setLoadingMore(true);
        }

        await ordersActions.fetchHistoryPage({
          query: {
            ...historyQuery,
            page: pageNumber,
          },
          append,
          loadedKey: historyLoadedKey,
        });

        nextPageRef.current = pageNumber + 1;
      } catch (error) {
        showError?.(error?.message || 'Falha ao carregar as compras.');
      } finally {
        setLoadingMore(false);
      }
    },
    [historyLoadedKey, historyQuery, ordersActions, showError],
  );

  const loadAttachmentsPage = useCallback(
    async ({orderId, pageNumber = 1, append = false} = {}) => {
      if (!orderId || typeof orderFileActions.getItems !== 'function') {
        setAttachedFiles([]);
        setAttachmentsHasMore(false);
        return [];
      }

      const currentPage = Number(pageNumber || 1) > 0 ? Number(pageNumber) : 1;

      try {
        if (append) {
          setAttachmentsLoadingMore(true);
        } else {
          setAttachmentsLoading(true);
          setAttachedFiles([]);
          setAttachmentsHasMore(false);
          attachmentNextPageRef.current = 1;
        }

        const response = await orderFileActions.getItems({
          order: `/orders/${orderId}`,
          page: currentPage,
        });
        const pageItems = extractCollectionItems(response);

        setAttachedFiles(current => {
          if (!append) {
            return pageItems;
          }

          const seen = new Set();
          return [...current, ...pageItems].filter(item => {
            const key = String(item?.id || item?.['@id'] || item?.file?.id || '').trim();
            if (!key || seen.has(key)) {
              return false;
            }
            seen.add(key);
            return true;
          });
        });
        setAttachmentsHasMore(hasHydraNext(response));
        attachmentNextPageRef.current = currentPage + 1;

        return pageItems;
      } catch (error) {
        showError?.(error?.message || 'Falha ao carregar as evidências do pedido.');
        if (!append) {
          setAttachedFiles([]);
        }
        setAttachmentsHasMore(false);
        return [];
      } finally {
        setAttachmentsLoading(false);
        setAttachmentsLoadingMore(false);
      }
    },
    [orderFileActions, showError],
  );

  const refreshSelectedOrder = useCallback(
    async orderId => {
      if (!orderId || !ordersActions.get || lastLoadedSelectedIdRef.current === String(orderId)) {
        return;
      }

      lastLoadedSelectedIdRef.current = String(orderId);

      const fallbackOrder =
        storedOrderList.find(order => getOrderKey(order) === String(orderId)) || null;

      setSelectedOrderLoading(true);
      setSelectedOrder(fallbackOrder);

      try {
        const detail = await ordersActions.get(orderId);
        setOrderDetailsById(current => ({
          ...current,
          [String(orderId)]: detail || fallbackOrder,
        }));
        setSelectedOrder(detail || fallbackOrder);
        await loadAttachmentsPage({orderId, pageNumber: 1, append: false});
      } catch (error) {
        showError?.(error?.message || 'Falha ao carregar os detalhes da compra.');
      } finally {
        setSelectedOrderLoading(false);
      }
    },
    [loadAttachmentsPage, ordersActions, showError, storedOrderList],
  );

  useFocusEffect(
    useCallback(() => {
      if (!currentCompany?.id) {
        ordersActions.setItems?.([]);
        ordersActions.setTotalItems?.(0);
        setSelectedOrderId('');
        setSelectedMapKey('');
        setSelectedOrder(null);
        return undefined;
      }

      nextPageRef.current = 1;
      void loadOrdersPage({pageNumber: 1, append: false});
      return undefined;
    }, [currentCompany?.id, loadOrdersPage, ordersActions]),
  );

  useEffect(() => {
    const loadMissingDetails = async () => {
      if (!ordersActions.get || !storedOrderList.length) return;

      const missingOrders = storedOrderList
        .map(order => ({order, orderId: getOrderKey(order)}))
        .filter(item => item.orderId && !orderDetailsById[item.orderId])
        .slice(0, 25);

      if (!missingOrders.length) return;

      try {
        const details = await Promise.all(
          missingOrders.map(async item => {
            try {
              return [item.orderId, await ordersActions.get(item.orderId)];
            } catch {
              return [item.orderId, item.order];
            }
          }),
        );

        setOrderDetailsById(current => ({
          ...current,
          ...Object.fromEntries(details),
        }));
      } catch {
        // O mapa continua com os pedidos já carregados; detalhes completos entram quando disponíveis.
      }
    };

    void loadMissingDetails();
  }, [orderDetailsById, ordersActions, storedOrderList]);

  const detailedOrders = useMemo(
    () => storedOrderList.map(order => orderDetailsById[getOrderKey(order)] || order),
    [orderDetailsById, storedOrderList],
  );

  const purchaseMapRows = useMemo(
    () => buildPurchaseItemMapRows(detailedOrders, resolveOperationalGroup),
    [detailedOrders, resolveOperationalGroup],
  );
  const groupedPurchaseMapRows = useMemo(
    () => orderOperationalGroupEntries(
      groupMapRows(purchaseMapRows),
      operationalGroups,
      isLoadingList && !purchaseMapRows.length,
    ),
    [isLoadingList, operationalGroups, purchaseMapRows],
  );
  const purchaseGroupNames = useMemo(
    () => groupedPurchaseMapRows.map(([groupName]) => groupName),
    [groupedPurchaseMapRows],
  );

  useEffect(() => {
    setExpandedPurchaseGroups(debouncedQuery ? new Set(purchaseGroupNames) : new Set());
  }, [debouncedQuery, purchaseGroupNames.join('|')]);

  const allPurchaseGroupsExpanded = purchaseGroupNames.length > 0 && expandedPurchaseGroups.size >= purchaseGroupNames.length;
  const toggleAllPurchaseGroups = useCallback(() => {
    setExpandedPurchaseGroups(allPurchaseGroupsExpanded ? new Set() : new Set(purchaseGroupNames));
  }, [allPurchaseGroupsExpanded, purchaseGroupNames]);
  const togglePurchaseGroup = useCallback(groupName => {
    setExpandedPurchaseGroups(current => {
      const next = new Set(current);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  }, []);

  const selectedMapRow = useMemo(
    () => purchaseMapRows.find(row => row.key === selectedMapKey) || purchaseMapRows[0] || null,
    [purchaseMapRows, selectedMapKey],
  );

  useEffect(() => {
    if (!selectedMapRow) {
      setSelectedMapKey('');
      setSelectedOrderId('');
      setSelectedOrder(null);
      lastLoadedSelectedIdRef.current = '';
      return;
    }

    if (selectedMapRow.key !== selectedMapKey) {
      setSelectedMapKey(selectedMapRow.key);
    }

    const nextOrderId = getOrderKey(selectedMapRow.latestOrder);
    if (nextOrderId && nextOrderId !== selectedOrderId) {
      setSelectedOrderId(nextOrderId);
    }
  }, [selectedMapKey, selectedMapRow, selectedOrderId]);

  useEffect(() => {
    if (!selectedOrderId) {
      return undefined;
    }

    void refreshSelectedOrder(selectedOrderId);
    return undefined;
  }, [refreshSelectedOrder, selectedOrderId]);

  const handleTabPress = useCallback(
    tab => {
      const {routeName, params} = resolveMenuCostsTabRoute(tab);

      if (routeName === 'MenuCostsPurchasesPage') {
        return;
      }

      navigation?.navigate?.(routeName, params || {});
    },
    [navigation],
  );

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingList || loadingMore || !historyQuery) {
      return;
    }

    void loadOrdersPage({
      pageNumber: nextPageRef.current,
      append: true,
    });
  }, [hasMore, historyQuery, isLoadingList, loadOrdersPage, loadingMore]);

  useEffect(() => {
    if (!hasMore || isLoadingList || loadingMore || !historyQuery) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      handleLoadMore();
    }, 80);

    return () => clearTimeout(timeout);
  }, [handleLoadMore, hasMore, historyQuery, isLoadingList, loadingMore]);

  const handleRefresh = useCallback(() => {
    setOrderDetailsById({});
    void loadOrdersPage({pageNumber: 1, append: false});
    if (selectedOrderId) {
      lastLoadedSelectedIdRef.current = '';
      void refreshSelectedOrder(selectedOrderId);
    }
  }, [loadOrdersPage, refreshSelectedOrder, selectedOrderId]);

  const openOrderDetails = useCallback(() => {
    if (!selectedOrder) {
      return;
    }

    navigation?.navigate?.('OrderDetails', buildOrderDetailsRouteParams(selectedOrder));
  }, [navigation, selectedOrder]);

  const closeAttachmentPreview = useCallback(() => {
    setPreviewAttachment(null);
  }, []);

  const openAttachment = useCallback(async relation => {
    const file = relation?.file || relation;

    if (!file) {
      showError?.('Nao foi possivel abrir o arquivo.');
      return;
    }

    setPreviewAttachment(file);
  }, [showError]);

  const previewAttachmentUrl = useMemo(() => {
    if (!previewAttachment) {
      return '';
    }

    return resolveFileDownloadUrl(previewAttachment, {company: currentCompany});
  }, [currentCompany, previewAttachment]);

  const previewAttachmentTitle = useMemo(() => {
    if (!previewAttachment) {
      return '';
    }

    return resolveOrderAttachmentLabel({file: previewAttachment});
  }, [previewAttachment]);

  const previewAttachmentIsImage = useMemo(
    () => isImageAttachment(previewAttachment),
    [previewAttachment],
  );

  const handleDetailScroll = useCallback(
    event => {
      if (!selectedOrderId || attachmentsLoading || attachmentsLoadingMore || !attachmentsHasMore) {
        return;
      }

      const layoutHeight = event?.nativeEvent?.layoutMeasurement?.height || 0;
      const contentOffsetY = event?.nativeEvent?.contentOffset?.y || 0;
      const contentHeight = event?.nativeEvent?.contentSize?.height || 0;

      if (layoutHeight + contentOffsetY >= contentHeight - 240) {
        void loadAttachmentsPage({
          orderId: selectedOrderId,
          pageNumber: attachmentNextPageRef.current,
          append: true,
        });
      }
    },
    [
      attachmentNextPageRef,
      attachmentsHasMore,
      attachmentsLoading,
      attachmentsLoadingMore,
      loadAttachmentsPage,
      selectedOrderId,
    ],
  );

  const selectedAttachmentCount = countOrderAttachments(attachedFiles);

  const handleSelectMapRow = useCallback(row => {
    setSelectedMapKey(row?.key || '');
    setVisibleItemHistoryCount(ITEM_HISTORY_VISIBLE_STEP);
    const orderId = getOrderKey(row?.latestOrder);
    if (orderId) {
      setSelectedOrderId(orderId);
    }
  }, []);

  useEffect(() => {
    setVisibleItemHistoryCount(ITEM_HISTORY_VISIBLE_STEP);
  }, [selectedMapKey]);

  const handleLoadMoreItemHistory = useCallback(() => {
    if (selectedMapRow && visibleItemHistoryCount < selectedMapRow.purchases.length) {
      setVisibleItemHistoryCount(current => Math.min(
        current + ITEM_HISTORY_VISIBLE_STEP,
        selectedMapRow.purchases.length,
      ));
      return;
    }

    handleLoadMore();
  }, [handleLoadMore, selectedMapRow, visibleItemHistoryCount]);

  const openEvidenceOrder = useCallback(order => {
    const orderId = getOrderKey(order);
    if (!orderId) return;
    setSelectedOrderId(orderId);
    setSelectedOrder(order);
    lastLoadedSelectedIdRef.current = '';
    void refreshSelectedOrder(orderId);
  }, [refreshSelectedOrder]);

  const detailContent = selectedMapRow ? (
    <ScrollView
      style={styles.detailScroll}
      contentContainerStyle={styles.detailContent}
      showsVerticalScrollIndicator={false}
      onScroll={handleDetailScroll}
      scrollEventThrottle={16}
    >
      <View style={styles.detailHeader}>
        <View>
          <View style={styles.badgeRow}>
            <Badge label={selectedMapRow.groupName} tone="neutral" />
            <Badge label={`${selectedMapRow.purchases.length} compra(s)`} tone="good" />
          </View>
          <Text style={styles.itemDetailTitle}>{selectedMapRow.label}</Text>
          <Text style={styles.itemDetailSubtitle}>
            Histórico de compra do item, com fornecedores, valores pagos e evidências.
          </Text>
        </View>
        <View style={styles.detailHeaderActions}>
          <ToolbarButton
            icon="external-link"
            label="Abrir última compra"
            onPress={openOrderDetails}
            primary
          />
          <ToolbarButton
            icon="paperclip"
            label={`Anexos da última (${selectedAttachmentCount})`}
            onPress={() => setAttachmentsVisible(true)}
          />
          <ToolbarButton
            icon="refresh-cw"
            label="Atualizar"
            onPress={handleRefresh}
          />
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionCardHeader}>
          <View>
            <Text style={styles.sectionCardTitle}>Resumo do item</Text>
            <Text style={styles.sectionCardSubtitle}>
              Leitura consolidada do histórico pago neste recorte.
            </Text>
          </View>
          <Text style={styles.sectionCardMeta}>
            {selectedOrderLoading ? 'Carregando' : selectedMapRow.key}
          </Text>
        </View>

        <InfoGrid
          rows={[
            {
              label: 'Compras registradas',
              value: String(selectedMapRow.purchases.length),
              helper: 'Histórico carregado do ERP',
            },
            {
              label: 'Fornecedores',
              value: String(selectedMapRow.supplierNames.length),
              helper: selectedMapRow.supplierNames.slice(0, 4).join(', '),
            },
            {
              label: 'Valor pago',
              value: Formatter.formatMoney(selectedMapRow.totalPaid),
              helper: 'Soma das linhas deste item',
            },
            {
              label: 'Última compra',
              value: selectedMapRow.purchases[0] ? compactDate(selectedMapRow.purchases[0].date) : 'Sem data',
              helper: selectedMapRow.purchases[0]?.supplier || '',
            },
            {
              label: 'Preço recente',
              value: selectedMapRow.purchases[0] ? comparableUnitLabel(selectedMapRow.purchases[0].line) : 'Sem preço',
              helper: `Faixa ${Formatter.formatMoney(selectedMapRow.minUnitPrice)} a ${Formatter.formatMoney(selectedMapRow.maxUnitPrice)}`,
            },
            {
              label: 'Evidências',
              value: String(selectedMapRow.evidenceLinks.length),
              helper: 'Links de pedidos/documentos encontrados',
            },
          ]}
        />
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionCardHeader}>
          <View>
            <Text style={styles.sectionCardTitle}>Histórico do produto</Text>
            <Text style={styles.sectionCardSubtitle}>
              Últimas compras deste item. Role para investigar as demais.
            </Text>
          </View>
          <Text style={styles.sectionCardMeta}>
            {Math.min(visibleItemHistoryCount, selectedMapRow.purchases.length)} de {selectedMapRow.purchases.length} registro(s)
          </Text>
        </View>

        {selectedMapRow.purchases.length ? (
          <View style={styles.lineList}>
            {selectedMapRow.purchases.slice(0, visibleItemHistoryCount).map((purchase, index) => (
              <TouchableOpacity
                key={`${purchase.orderId}-${index}`}
                style={styles.historyLineCard}
                activeOpacity={0.84}
                onPress={() => openEvidenceOrder(purchase.order)}
              >
                <View style={styles.lineRow}>
                  <Text style={styles.lineTitle} numberOfLines={2}>
                    {compactDate(purchase.date)} · {purchase.supplier}
                  </Text>
                  <Text style={styles.lineValue}>{Formatter.formatMoney(purchase.total)}</Text>
                </View>
                <Text style={styles.lineMeta} numberOfLines={2}>
                  {`${resolvePurchaseOrderLineQuantity(purchase.line)} ${resolvePurchaseOrderLineUnit(purchase.line)} · ${comparableUnitLabel(purchase.line)} · #${purchase.orderId}`}
                </Text>
              </TouchableOpacity>
            ))}
            {visibleItemHistoryCount < selectedMapRow.purchases.length || hasMore ? (
              <TouchableOpacity
                style={styles.loadMoreMapButton}
                activeOpacity={0.82}
                onPress={handleLoadMoreItemHistory}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={MENU_COLORS.brand} />
                ) : (
                  <Text style={styles.loadMoreMapText}>Carregar mais histórico</Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <EmptyState text="Nenhum histórico encontrado para este item." />
        )}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionCardHeader}>
          <View>
            <Text style={styles.sectionCardTitle}>Evidências vinculadas</Text>
            <Text style={styles.sectionCardSubtitle}>
              Links dos pedidos e comprovantes do item. A lista de anexos abaixo corresponde à última compra selecionada.
            </Text>
          </View>
          <Text style={styles.sectionCardMeta}>{selectedMapRow.evidenceLinks.length} link(s)</Text>
        </View>

        {selectedMapRow.evidenceLinks.length ? (
          <View style={styles.evidenceChipListLarge}>
            {selectedMapRow.evidenceLinks.slice(0, visibleItemHistoryCount).map(link => (
              <TouchableOpacity
                key={`${link.id}-${link.label}`}
                style={styles.evidenceChip}
                activeOpacity={0.82}
                onPress={() => openEvidenceOrder(link.order)}
              >
                <Text style={styles.evidenceChipText}>{link.label}</Text>
              </TouchableOpacity>
            ))}
            {selectedMapRow.evidenceLinks.length > visibleItemHistoryCount ? (
              <Badge label={`+${selectedMapRow.evidenceLinks.length - visibleItemHistoryCount}`} tone="neutral" />
            ) : null}
          </View>
        ) : null}

        {attachmentsLoading && attachedFiles.length === 0 ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="small" color={MENU_COLORS.brand} />
            <Text style={styles.emptyStateText}>Carregando anexos da compra selecionada...</Text>
          </View>
        ) : attachedFiles.length ? (
          <View style={styles.attachmentList}>
            {attachedFiles.map(relation => (
              <AttachmentCard
                key={relation?.id || relation?.file?.id || resolveOrderAttachmentLabel(relation)}
                relation={relation}
                company={currentCompany}
                onPress={() => openAttachment(relation)}
              />
            ))}
            {attachmentsLoadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={MENU_COLORS.brand} />
              </View>
            ) : null}
          </View>
        ) : (
          <EmptyState text="Nenhum anexo carregado para a compra selecionada." />
        )}
      </View>
    </ScrollView>
  ) : (
    <EmptyState text="Selecione um item comprado para ver histórico e evidências." />
  );

  const renderHeader = () => (
    <View style={styles.toolbar}>
      <View style={styles.titleBlock}>
        <Text style={styles.eyebrow}>Custos do cardápio</Text>
        <Text style={styles.pageTitle}>Compras e evidências</Text>
      </View>
      <View style={styles.toolbarActions}>
        <ToolbarButton icon="refresh-cw" label="Recarregar" onPress={handleRefresh} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={styles.page}>
        {renderHeader()}

        <View style={[styles.body, !isWide && styles.bodyCompact]}>
          <View style={[styles.sidebar, !isWide && styles.sidebarCompact]}>
            <ScrollView horizontal={!isWide} showsHorizontalScrollIndicator={false}>
              <View style={[styles.menuList, !isWide && styles.menuListHorizontal]}>
                {MAIN_TABS.map(tab => (
                  <IconButton
                    key={tab.key}
                    icon={tab.icon}
                    label={tab.label}
                    active={tab.key === 'purchases'}
                    onPress={() => handleTabPress(tab.key)}
                    disabled={tab.key === 'purchases'}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.content}>
            <View style={styles.sectionTop}>
              <View>
                <Text style={styles.sectionEyebrow}>Compras</Text>
                <Text style={styles.sectionTitle}>{resolveSectionTitle()}</Text>
              </View>
              <SearchBox
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar item, fornecedor ou documento"
              />
            </View>

            <View style={[styles.splitLayout, !isWide && styles.splitLayoutCompact]}>
              <View style={[styles.mapPanel, !isWide && styles.listPanelCompact]}>
                <View style={styles.mapPanelHeader}>
                  <View>
                    <Text style={styles.sectionCardTitle}>Mapa de compras</Text>
                    <Text style={styles.sectionCardSubtitle}>
                      Produto por produto, com histórico, fornecedores, valores pagos e evidências recentes.
                    </Text>
                  </View>
                  <View style={styles.headerActions}>
                    <TouchableOpacity
                      style={styles.iconButton}
                      activeOpacity={0.82}
                      onPress={toggleAllPurchaseGroups}
                    >
                      <Icon name={allPurchaseGroupsExpanded ? 'minimize-2' : 'maximize-2'} size={14} color={MENU_COLORS.muted} />
                      <Text style={styles.iconButtonText}>
                        {allPurchaseGroupsExpanded ? 'Recolher todas' : 'Expandir todas'}
                      </Text>
                    </TouchableOpacity>
                    <Badge label={`${purchaseMapRows.length} item(ns)`} tone="neutral" />
                  </View>
                </View>
                {purchaseMapRows.length || isLoadingList ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.purchaseMapTable}>
                      <View style={styles.mapHeader}>
                        <Text style={[styles.mapHeaderText, styles.mapProductCell]}>Produto</Text>
                        <Text style={[styles.mapHeaderText, styles.mapHistoryCell]}>Histórico recente</Text>
                        <Text style={[styles.mapHeaderText, styles.mapPriceCell]}>Preço comparável</Text>
                        <Text style={[styles.mapHeaderText, styles.mapSupplierCell]}>Fornecedores</Text>
                        <Text style={[styles.mapHeaderText, styles.mapPaidCell]}>Valor pago</Text>
                        <Text style={[styles.mapHeaderText, styles.mapEvidenceCell]}>Evidências</Text>
                      </View>
                      <ScrollView style={styles.mapTableScroll} nestedScrollEnabled>
                        {groupedPurchaseMapRows.map(([groupName, rows]) => {
                          const expanded = expandedPurchaseGroups.has(groupName);
                          const purchaseCount = rows.reduce((sum, row) => sum + row.purchases.length, 0);
                          const supplierCount = new Set(rows.flatMap(row => row.supplierNames)).size;
                          const evidenceCount = rows.reduce((sum, row) => sum + row.evidenceLinks.length, 0);

                          return (
                            <View key={groupName}>
                              <TouchableOpacity
                                style={styles.mapGroupHeader}
                                activeOpacity={0.82}
                                onPress={() => togglePurchaseGroup(groupName)}
                              >
                                <View style={styles.lineRow}>
                                  <Text style={styles.mapGroupTitle}>{groupName}</Text>
                                  <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={MENU_COLORS.muted} />
                                </View>
                                <Text style={styles.mapGroupMeta}>
                                  {rows.length} item(ns) · {purchaseCount} compra(s) · {supplierCount} fornecedor(es) · {evidenceCount} evidência(s)
                                </Text>
                              </TouchableOpacity>
                              {expanded ? rows.map(row => (
                              <PurchaseMapRow
                                key={row.key}
                                row={row}
                                selected={selectedMapRow?.key === row.key}
                                onPress={handleSelectMapRow}
                                onOpenEvidence={openEvidenceOrder}
                              />
                              )) : null}
                            </View>
                          );
                        })}
                        {isLoadingList && !purchaseMapRows.length ? (
                          <View style={styles.loadingMore}>
                            <ActivityIndicator size="small" color={MENU_COLORS.brand} />
                            <Text style={styles.emptyStateText}>Carregando compras do ERP...</Text>
                          </View>
                        ) : loadingMore ? (
                          <View style={styles.loadingMore}>
                            <ActivityIndicator size="small" color={MENU_COLORS.brand} />
                            <Text style={styles.emptyStateText}>Atualizando mapa de compras...</Text>
                          </View>
                        ) : null}
                      </ScrollView>
                    </View>
                  </ScrollView>
                ) : (
                  <EmptyState text="Nenhum item comprado encontrado para esta empresa." />
                )}
              </View>

              <View style={[styles.detailPanel, !isWide && styles.detailPanelCompact]}>
                {selectedOrderLoading && !selectedOrder ? (
                  <View style={styles.emptyState}>
                    <ActivityIndicator size="small" color={MENU_COLORS.brand} />
                    <Text style={styles.emptyStateText}>Carregando detalhes da compra...</Text>
                  </View>
                ) : (
                  detailContent
                )}
              </View>
            </View>
          </View>
        </View>
      </View>

      <OrderAttachmentManager
        visible={attachmentsVisible}
        onClose={() => setAttachmentsVisible(false)}
        order={selectedOrder}
        company={currentCompany}
        onChanged={() => {
          if (selectedOrderId) {
            void loadAttachmentsPage({orderId: selectedOrderId, pageNumber: 1, append: false});
          }
        }}
      />

      <Modal
        visible={Boolean(previewAttachment)}
        transparent
        animationType="fade"
        onRequestClose={closeAttachmentPreview}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          justifyContent: 'center',
          padding: 16,
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 18,
            overflow: 'hidden',
            maxHeight: '90%',
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#E2E8F0',
            }}>
              <View style={{flex: 1, paddingRight: 12}}>
                <Text style={{fontSize: 15, fontWeight: '800', color: '#0F172A'}} numberOfLines={1}>
                  {previewAttachmentTitle || 'Evidência'}
                </Text>
                <Text style={{fontSize: 12, color: '#64748B'}} numberOfLines={1}>
                  {resolveOrderAttachmentKind({file: previewAttachment})}
                </Text>
              </View>
              <TouchableOpacity onPress={closeAttachmentPreview} style={{padding: 8}}>
                <Icon name="x" size={18} color="#334155" />
              </TouchableOpacity>
            </View>

            <View style={{height: 520, backgroundColor: '#0F172A'}}>
              {previewAttachmentIsImage && previewAttachmentUrl ? (
                <Image
                  source={{uri: previewAttachmentUrl}}
                  style={{width: '100%', height: '100%'}}
                  resizeMode="contain"
                />
              ) : Platform.OS === 'web' ? (
                <iframe
                  title={previewAttachmentTitle || 'attachment-preview'}
                  src={previewAttachmentUrl}
                  style={{width: '100%', height: '100%', border: 0, background: '#fff'}}
                />
              ) : NativeWebView ? (
                <NativeWebView
                  source={{uri: previewAttachmentUrl}}
                  style={{flex: 1, backgroundColor: '#fff'}}
                  startInLoadingState
                />
              ) : (
                <View style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 24,
                  backgroundColor: '#fff',
                }}>
                  <Icon name="file" size={40} color="#94A3B8" />
                  <Text style={{marginTop: 12, fontSize: 14, color: '#334155', textAlign: 'center'}}>
                    Pré-visualização não suportada para este tipo de arquivo neste dispositivo.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <StateStore stores={['orders', 'order_file', 'file']} />
    </SafeAreaView>
  );
}
