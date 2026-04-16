import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { useStore } from '@store'
import Formatter from '@controleonline/ui-common/src/utils/formatter'
import { env } from '@env'
import usePosCartSession, {
  getOrderPeopleValue,
} from '@controleonline/ui-orders/src/react/hooks/usePosCartSession'
import useDebouncedOrderProductQuantitySync from '@controleonline/ui-orders/src/react/hooks/useDebouncedOrderProductQuantitySync'
import {
  readCachedCategories as readSharedCachedCategories,
  updateCachedCategoryProducts as updateSharedCachedCategoryProducts,
  writeCachedCategories as writeSharedCachedCategories,
} from '@controleonline/ui-products/src/react/utils/categoryCache'
import {
  mergeOrderProductIntoList,
  mergeOrderWithOrderProducts,
  removeOrderProductFromList,
  withOrderProductQuantity,
} from '@controleonline/ui-orders/src/utils/orderState'
import { resolveThemePalette, withOpacity } from '@controleonline/../../src/styles/branding'

/* ─── constantes ────────────────────────────────────────────────────── */

// tipos de produto que aparecem no PDV (excluindo insumos: feedstock, component, package)
const PDV_TYPES = ['product', 'manufactured', 'custom', 'service']

/* ─── helpers ───────────────────────────────────────────────────────── */

const buildCoverUrl = (files, coverId) => {
  const arr = files || []
  let f = coverId ? arr.find(i => String(i?.id) === String(coverId) && i?.file?.id) : null
  if (!f) f = arr.find(i => i?.file?.id)
  if (!f) return null
  const host = env.DOMAIN || (typeof location !== 'undefined' ? location.host : '')
  return `${env.API_ENTRYPOINT}/files/${f.file.id}/download?app-domain=${encodeURIComponent(host)}`
}

const normalizeStr = v =>
  String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const calcGroupExtraPrice = (group, selectedInGroup) => {
  const prices = selectedInGroup.map(i => Number(i.price || 0))
  if (!prices.length) return 0
  switch (group.priceCalculation) {
    case 'biggest': return Math.max(...prices)
    case 'average': return prices.reduce((a, b) => a + b, 0) / prices.length
    case 'free':    return 0
    case 'sum':
    default:        return prices.reduce((a, b) => a + b, 0)
  }
}

const calcCartItemTotal = item =>
  (Number(item.product?.price || 0) + (item.extraPrice || 0)) * item.quantity

const normalizeId = value => {
  const normalizedId = String(value || '').replace(/\D/g, '')
  return normalizedId || null
}

const extractItems = response => {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member']
  return []
}

const mapOrderProductToCartItem = orderProduct => {
  const quantity = Number(orderProduct?.quantity || 0)
  const baseProduct = orderProduct?.product || {}
  const total = Number(orderProduct?.total || 0)
  const unitBasePrice = Number(orderProduct?.price ?? baseProduct?.price ?? 0)
  const unitDisplayPrice =
    quantity > 0 && total > 0
      ? total / quantity
      : unitBasePrice

  return {
    key: String(orderProduct?.id || orderProduct?.['@id'] || Math.random()),
    id: normalizeId(orderProduct?.id || orderProduct?.['@id']),
    '@id':
      orderProduct?.['@id'] ||
      (normalizeId(orderProduct?.id) ? `/order_products/${normalizeId(orderProduct.id)}` : null),
    orderProduct,
    product: baseProduct,
    quantity,
    total: total > 0 ? total : unitDisplayPrice * quantity,
    extraPrice: Math.max(0, unitDisplayPrice - Number(baseProduct?.price || 0)),
    subProducts: Array.isArray(orderProduct?.orderProductComponents)
      ? orderProduct.orderProductComponents.map(component => ({
          quantity: Number(component?.quantity || 1),
          groupId: component?.productGroup?.id || null,
          groupName: component?.productGroup?.productGroup || '',
          productGroupProduct: {
            productChild:
              component?.product ||
              component?.productChild ||
              null,
          },
        }))
      : [],
  }
}

/* ─── tela de categorias ─────────────────────────────────────────────── */

const CategoryGrid = ({ categories, categoriesLoading, onSelect, palette }) => {
  const { width } = useWindowDimensions()
  const maxWidth = Math.min(width, 1600)
  const gap = 12
  const cols = width < 640 ? 2 : width < 960 ? 3 : width < 1280 ? 4 : 5
  const cardWidth = (maxWidth - (cols + 1) * gap) / cols

  if (categoriesLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={{ color: palette.textSecondary, fontSize: 14 }}>Carregando categorias...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      contentContainerStyle={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap,
        padding: gap,
        alignSelf: 'center',
        width: maxWidth,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* card "Todos" */}
      <View style={{ width: cardWidth }}>
        <TouchableOpacity
          onPress={() => onSelect(null)}
          activeOpacity={0.88}
          style={{ width: '100%' }}
        >
          <View style={[catStyles.card, { aspectRatio: 3 / 4, backgroundColor: withOpacity(palette.primary, 0.12) }]}>
            <View style={catStyles.overlay}>
              <MaterialCommunityIcons name="view-grid-outline" size={28} color="#fff" />
              <Text style={catStyles.overlayName} numberOfLines={2}>Todos os produtos</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {(categories || []).map(cat => {
        const coverUrl = buildCoverUrl(cat.categoryFiles, cat?.extraData?.imageCoverRelationId)
        return (
          <View key={cat.id || cat['@id']} style={{ width: cardWidth }}>
            <TouchableOpacity
              onPress={() => onSelect(cat)}
              activeOpacity={0.88}
              style={{ width: '100%' }}
            >
              <View
                style={[
                  catStyles.card,
                  { aspectRatio: 3 / 4, backgroundColor: cat.color || '#CBD5E1' },
                ]}
              >
                {coverUrl && (
                  <Image
                    source={{ uri: coverUrl }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                  />
                )}
                <View style={catStyles.overlay}>
                  <Text style={catStyles.overlayName} numberOfLines={2}>
                    {cat.name || cat.category}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )
      })}

      {(!categories || categories.length === 0) && (
        <View style={{ flex: 1, alignItems: 'center', padding: 32, gap: 8 }}>
          <MaterialCommunityIcons name="tag-off-outline" size={48} color={palette.border} />
          <Text style={{ color: palette.textSecondary, fontSize: 14 }}>Nenhuma categoria cadastrada</Text>
        </View>
      )}
    </ScrollView>
  )
}

const catStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10 },
      android: { elevation: 4 },
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.10)' },
    }),
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 14,
    paddingTop: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...Platform.select({
      web: { backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)' },
      default: { backgroundColor: 'rgba(0,0,0,0.45)' },
    }),
    alignItems: 'center',
    gap: 4,
  },
  overlayName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
})

/* ─── card de produto ─────────────────────────────────────────────────── */

const ProductCard = ({ product, quantity, onPress, palette, cardWidth }) => {
  const coverUrl = buildCoverUrl(product.productFiles, product?.extraData?.imageCoverRelationId)
  const hasGroups = product.type === 'custom' // visual hint

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        prodStyles.card,
        {
          width: cardWidth,
          borderColor: quantity > 0 ? palette.primary : 'transparent',
          backgroundColor: palette.surface || '#fff',
        },
      ]}
    >
      {/* imagem */}
      <View style={prodStyles.imageWrap}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={prodStyles.image} resizeMode="cover" />
        ) : (
          <View style={[prodStyles.image, prodStyles.imagePh]}>
            <MaterialCommunityIcons name="food-outline" size={26} color={palette.border} />
          </View>
        )}
        {quantity > 0 && (
          <View style={[prodStyles.qtyBadge, { backgroundColor: palette.primary }]}>
            <Text style={prodStyles.qtyBadgeText}>{quantity}</Text>
          </View>
        )}
        {hasGroups && (
          <View style={prodStyles.customTag}>
            <MaterialCommunityIcons name="tune" size={11} color="#8B5CF6" />
            <Text style={prodStyles.customTagText}>+opções</Text>
          </View>
        )}
      </View>

      {/* info */}
      <View style={prodStyles.body}>
        <Text style={[prodStyles.name, { color: palette.text }]} numberOfLines={2}>
          {product.product}
        </Text>
        <Text style={[prodStyles.price, { color: palette.primary }]}>
          {Formatter.formatMoney(product.price)}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const prodStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
    marginBottom: 0,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
    }),
  },
  imageWrap: { position: 'relative' },
  image: { width: '100%', height: 110, backgroundColor: '#F1F5F9' },
  imagePh: { justifyContent: 'center', alignItems: 'center' },
  qtyBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  qtyBadgeText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  customTag: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245,243,255,0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  customTagText: { color: '#8B5CF6', fontSize: 10, fontWeight: '700' },
  body: { padding: 8 },
  name: { fontSize: 12, fontWeight: '700', lineHeight: 16, marginBottom: 4 },
  price: { fontSize: 14, fontWeight: '800' },
})

/* ─── tela de produtos ─────────────────────────────────────────────── */

const ProductsGrid = ({ products, isLoading, cart, onPress, palette, getProductQty }) => {
  const { width } = useWindowDimensions()
  const gap = 10
  const maxWidth = Math.min(width, 960) // cap para não ficar imenso em telas grandes
  const cols = width < 480 ? 2 : width < 768 ? 3 : width < 1024 ? 4 : 5
  const cardWidth = (maxWidth - (cols + 1) * gap) / cols

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    )
  }

  if (!products || products.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 }}>
        <MaterialCommunityIcons name="cart-off" size={48} color={palette.border} />
        <Text style={{ color: palette.textSecondary, fontSize: 14, textAlign: 'center' }}>
          Nenhum produto encontrado
        </Text>
      </View>
    )
  }

  return (
    <ScrollView
      contentContainerStyle={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap,
        padding: gap,
        paddingBottom: 100,
        alignSelf: 'center',
        width: maxWidth,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          quantity={getProductQty(product.id)}
          onPress={() => onPress(product)}
          palette={palette}
          cardWidth={cardWidth}
        />
      ))}
    </ScrollView>
  )
}

/* ─── modal de customização ──────────────────────────────────────────── */

const CustomizeModal = ({ visible, product, groups, groupProducts, onConfirm, onClose, palette }) => {
  const { height: screenHeight } = useWindowDimensions()
  const [selections, setSelections] = useState({})

  useEffect(() => {
    if (visible) setSelections({})
  }, [visible, product?.id])

  const toggle = (group, item) => {
    setSelections(prev => {
      const cur = prev[group.id] || []
      const already = cur.find(i => i['@id'] === item['@id'])
      if (already) return { ...prev, [group.id]: cur.filter(i => i['@id'] !== item['@id']) }
      if (group.maximum && cur.length >= group.maximum) {
        if (group.maximum === 1) return { ...prev, [group.id]: [item] }
        return prev
      }
      return { ...prev, [group.id]: [...cur, item] }
    })
  }

  const isSelected = (groupId, item) =>
    (selections[groupId] || []).some(i => i['@id'] === item['@id'])

  const extraPrice = useMemo(
    () => groups.reduce((t, g) => t + calcGroupExtraPrice(g, selections[g.id] || []), 0),
    [groups, selections],
  )

  const isValid = useMemo(
    () => groups.every(g => {
      if (!g.required && !g.minimum) return true
      return (selections[g.id] || []).length >= (g.minimum || 1)
    }),
    [groups, selections],
  )

  const handleConfirm = () => {
    const subProducts = []
    groups.forEach(g => {
      ;(selections[g.id] || []).forEach(item => {
        subProducts.push({
          productGroupProduct: item,
          groupId: g.id,
          groupName: g.productGroup,
          priceCalculation: g.priceCalculation,
          price: Number(item.price || 0),
          quantity: 1,
        })
      })
    })
    onConfirm(subProducts, extraPrice)
  }

  if (!visible || !product) return null

  const basePrice = Number(product.price || 0)
  const totalPrice = basePrice + extraPrice

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={custStyles.overlay}>
        <View style={[custStyles.sheet, { backgroundColor: palette.modalBg || palette.surface || '#fff', maxHeight: screenHeight * 0.92 }]}>

          <View style={[custStyles.header, { borderBottomColor: palette.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[custStyles.title, { color: palette.text }]} numberOfLines={1}>
                {product.product}
              </Text>
              <Text style={[custStyles.subtitle, { color: palette.textSecondary }]}>
                Base: {Formatter.formatMoney(basePrice)}
                {extraPrice > 0 ? ` + ${Formatter.formatMoney(extraPrice)} adicionais` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close" size={24} color={palette.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={custStyles.body} showsVerticalScrollIndicator={false}>
            {groups.map(group => {
              const items = groupProducts[group.id] || []
              const selCount = (selections[group.id] || []).length
              const groupValid = (!group.required && !group.minimum) || selCount >= (group.minimum || 1)

              return (
                <View key={group.id} style={[custStyles.groupBlock, { borderColor: palette.border }]}>
                  <View style={custStyles.groupHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[custStyles.groupName, { color: palette.text }]}>{group.productGroup}</Text>
                      <Text style={[custStyles.groupMeta, { color: groupValid ? palette.textSecondary : (palette.danger || '#EF4444') }]}>
                        {group.required ? '● Obrigatório · ' : '○ Opcional · '}
                        {group.minimum > 0 && group.maximum > 0
                          ? `Escolha de ${group.minimum} a ${group.maximum}`
                          : group.minimum > 0 ? `Mínimo ${group.minimum}`
                          : group.maximum > 0 ? `Até ${group.maximum}` : 'Ilimitado'}
                        {group.priceCalculation === 'free' ? ' · Grátis' : ''}
                      </Text>
                    </View>
                    <View style={[custStyles.counter, { backgroundColor: selCount > 0 ? withOpacity(palette.primary, 0.12) : palette.border + '40' }]}>
                      <Text style={[custStyles.counterText, { color: selCount > 0 ? palette.primary : palette.textSecondary }]}>
                        {selCount}{group.maximum ? `/${group.maximum}` : ''}
                      </Text>
                    </View>
                  </View>

                  {items.map((item, idx) => {
                    const selected = isSelected(group.id, item)
                    const atMax = group.maximum && (selections[group.id] || []).length >= group.maximum && !selected
                    const itemPrice = Number(item.price || 0)
                    const priceLabel = group.priceCalculation === 'free' ? 'Grátis'
                      : itemPrice > 0 ? `+${Formatter.formatMoney(itemPrice)}`
                      : itemPrice < 0 ? `-${Formatter.formatMoney(Math.abs(itemPrice))}` : 'Incluso'

                    return (
                      <TouchableOpacity
                        key={item['@id'] || idx}
                        onPress={() => !atMax && toggle(group, item)}
                        disabled={atMax}
                        style={[
                          custStyles.optionRow,
                          { borderBottomColor: palette.border, opacity: atMax ? 0.4 : 1 },
                          selected && { backgroundColor: withOpacity(palette.primary, 0.06) },
                        ]}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons
                          name={group.maximum === 1
                            ? selected ? 'radiobox-marked' : 'radiobox-blank'
                            : selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                          size={22}
                          color={selected ? palette.primary : palette.textSecondary}
                        />
                        <Text style={[custStyles.optionName, { color: palette.text }]} numberOfLines={1}>
                          {item.productChild?.product || item.productChild?.name || '—'}
                        </Text>
                        <Text style={[custStyles.optionPrice, {
                          color: itemPrice > 0 ? palette.primary : itemPrice < 0 ? (palette.danger || '#EF4444') : palette.textSecondary,
                        }]}>
                          {priceLabel}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}

                  {items.length === 0 && (
                    <Text style={[custStyles.emptyGroup, { color: palette.textSecondary }]}>Nenhuma opção disponível</Text>
                  )}
                </View>
              )
            })}
          </ScrollView>

          <View style={[custStyles.footer, { borderTopColor: palette.border }]}>
            <View>
              <Text style={[custStyles.totalLabel, { color: palette.textSecondary }]}>Total do item</Text>
              <Text style={[custStyles.totalValue, { color: palette.primary }]}>{Formatter.formatMoney(totalPrice)}</Text>
            </View>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={!isValid}
              style={[custStyles.addBtn, { backgroundColor: isValid ? palette.primary : (palette.border || '#E2E8F0') }]}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="cart-plus" size={20} color="#fff" />
              <Text style={custStyles.addBtnText}>Adicionar ao carrinho</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  )
}

const custStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, gap: 12 },
  title: { fontSize: 17, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  body: { flex: 1, flexShrink: 1 },
  groupBlock: { marginHorizontal: 12, marginTop: 12, borderRadius: 14, borderWidth: 1 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  groupName: { fontSize: 15, fontWeight: '800' },
  groupMeta: { fontSize: 12, marginTop: 2 },
  counter: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, minWidth: 36, alignItems: 'center' },
  counterText: { fontSize: 13, fontWeight: '800' },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, gap: 12 },
  optionName: { flex: 1, fontSize: 14, fontWeight: '600' },
  optionPrice: { fontSize: 14, fontWeight: '700' },
  emptyGroup: { padding: 16, fontSize: 13 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, borderTopWidth: 1, gap: 12 },
  totalLabel: { fontSize: 12, fontWeight: '600' },
  totalValue: { fontSize: 22, fontWeight: '900' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
})

/* ─── componente principal ──────────────────────────────────────────── */

export default function PdvPage() {
  const navigation = useNavigation()
  const { height: windowHeight } = useWindowDimensions()
  const productsStore         = useStore('products')
  const ordersStore           = useStore('orders')
  const orderProductsStore    = useStore('order_products')
  const peopleStore           = useStore('people')
  const themeStore            = useStore('theme')
  const productGroupStore     = useStore('product_group')
  const productGroupProdStore = useStore('product_group_product')
  const categoriesStore       = useStore('categories')
  const deviceStore           = useStore('device')

  const palette = useMemo(() => resolveThemePalette(themeStore?.getters?.colors), [themeStore?.getters?.colors])

  const { currentCompany, items: peopleItems, isLoading: peopleLoading } = peopleStore.getters
  const { items: allProducts, isLoading: productsLoading } = productsStore.getters
  const { isSaving: orderProductsSaving } = orderProductsStore.getters
  const { isSaving: orderSaving }   = ordersStore.getters
  const { items: categoryItems, isLoading: categoriesLoading } = categoriesStore.getters
  const { item: storagedDevice } = deviceStore.getters

  const [screen, setScreen]                   = useState('categories')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [search, setSearch]                   = useState('')
  const [cartSyncing, setCartSyncing]         = useState(false)

  const [custModal, setCustModal]             = useState({ visible: false, product: null })
  const [custGroups, setCustGroups]           = useState([])
  const [custGroupProds, setCustGroupProds]   = useState({})
  const [custLoading, setCustLoading]         = useState(false)

  const [checkoutVisible, setCheckoutVisible] = useState(false)
  const [step, setStep]                       = useState('review')
  const [processingMsg, setProcessingMsg]     = useState('')

  const [selectedPeople, setSelectedPeople]   = useState(null)
  const [peopleQuery, setPeopleQuery]         = useState('')
  const activeOrderProductsRef                = useRef([])
  const {
    activeOrder,
    ensureActiveOrder,
    loadStoredDraftOrder,
    syncActiveOrderState,
    syncOrderPeople,
  } = usePosCartSession({
    companyId: currentCompany?.id,
    deviceId: storagedDevice?.id,
    defaultStatusId: currentCompany?.configs?.['pos-default-status'],
  })
  const rootOrderProducts = useMemo(
    () =>
      (activeOrder?.orderProducts || []).filter(orderProduct => !orderProduct?.parentProduct),
    [activeOrder?.orderProducts],
  )
  const cartItems = useMemo(
    () => rootOrderProducts.map(mapOrderProductToCartItem),
    [rootOrderProducts],
  )
  const isCartBusy = cartSyncing || orderSaving

  useEffect(() => {
    activeOrderProductsRef.current = Array.isArray(activeOrder?.orderProducts)
      ? activeOrder.orderProducts
      : []
  }, [activeOrder?.orderProducts])

  const syncCartOrderProducts = useCallback(nextOrderProducts => {
    if (!activeOrder) return null

    const normalizedOrderProducts = Array.isArray(nextOrderProducts) ? nextOrderProducts : []
    activeOrderProductsRef.current = normalizedOrderProducts
    orderProductsStore.actions.setItems(normalizedOrderProducts)

    return syncActiveOrderState(
      mergeOrderWithOrderProducts(activeOrder, normalizedOrderProducts),
    )
  }, [activeOrder, orderProductsStore.actions, syncActiveOrderState])

  const {
    cancelAllChanges: cancelPendingCartQuantityChanges,
    flushAllChanges: flushPendingCartQuantityChanges,
    scheduleQuantityChange: scheduleCartQuantityChange,
  } = useDebouncedOrderProductQuantitySync({
    onOptimisticUpdate: (orderProduct, nextQuantity) => {
      const nextOrderProducts =
        nextQuantity <= 0
          ? removeOrderProductFromList(activeOrderProductsRef.current, orderProduct)
          : mergeOrderProductIntoList(
              activeOrderProductsRef.current,
              withOrderProductQuantity(orderProduct, nextQuantity),
            )

      syncCartOrderProducts(nextOrderProducts)
    },
    onCommit: async (orderProduct, targetQuantity) => {
      const orderProductId = normalizeId(orderProduct?.id || orderProduct?.['@id'])
      if (!orderProductId) return

      if (targetQuantity <= 0) {
        await orderProductsStore.actions.remove(orderProductId)
        return
      }

      const savedOrderProduct = await orderProductsStore.actions.save({
        '@id': orderProduct?.['@id'],
        id: Number(orderProductId),
        quantity: targetQuantity,
      })

      syncCartOrderProducts(
        mergeOrderProductIntoList(activeOrderProductsRef.current, savedOrderProduct),
      )
    },
  })

  useEffect(() => {
    const nextPeople = getOrderPeopleValue(activeOrder)
    if (nextPeople) {
      setSelectedPeople(nextPeople)
      return
    }

    if (!activeOrder) {
      setSelectedPeople(null)
    }
  }, [activeOrder])

  /* ── carregar categorias e pagamentos ── */
  useFocusEffect(
    useCallback(() => {
      if (!currentCompany?.id) return

      const cachedCategories = readSharedCachedCategories(currentCompany.id)
      if (cachedCategories.length > 0) {
        categoriesStore.actions.setItems(cachedCategories)
      } else {
        categoriesStore.actions
          .getItems({
            context: 'products',
            'order[name]': 'ASC',
            company: currentCompany.id,
          })
          .then(data => {
            writeSharedCachedCategories(currentCompany.id, data || [])
            categoriesStore.actions.setItems(data || [])
          })
      }

    }, [categoriesStore.actions, currentCompany?.id]),
  )

  useFocusEffect(
    useCallback(() => {
      void loadStoredDraftOrder()
    }, [loadStoredDraftOrder]),
  )

  const searchPeople = useCallback((query) => {
    if (!query.trim() || !currentCompany?.id) {
      peopleStore.actions.setItems([])
      return
    }
    peopleStore.actions.getItems({
      'link.company': '/people/' + currentCompany.id,
      'link.linkType': 'client',
      name: query.trim(),
      itemsPerPage: 5,
    })
  }, [currentCompany?.id])

  /* ── reset ao sair ── */
  useFocusEffect(
    useCallback(() => () => {
      setScreen('categories')
      setSelectedCategory(null)
      setSearch('')
      setCheckoutVisible(false)
      setCustModal({ visible: false, product: null })
      setStep('review')
      setSelectedPeople(null)
      setPeopleQuery('')
      setCartSyncing(false)
      peopleStore.actions.setItems([])
    }, []),
  )

  /* ── selecionar categoria → carrega produtos filtrados ── */
  const handleSelectCategory = useCallback((cat) => {
    setSelectedCategory(cat)
    setScreen('products')
    setSearch('')

    if (!cat) {
      const cachedCategories = readSharedCachedCategories(currentCompany.id)
      const cachedProducts = cachedCategories.flatMap(category =>
        Array.isArray(category?.products) ? category.products : [],
      )

      if (cachedProducts.length > 0) {
        productsStore.actions.setItems(cachedProducts)
        return
      }
    } else {
      const cachedCategories = readSharedCachedCategories(currentCompany.id)
      const cachedCategory = cachedCategories.find(
        category => category?.['@id'] === cat['@id'],
      )

      if (Array.isArray(cachedCategory?.products) && cachedCategory.products.length > 0) {
        productsStore.actions.setItems(cachedCategory.products)
        return
      }
    }

    const params = {
      active: 1,
      'order[product]': 'ASC',
      company: currentCompany.id,
      type: PDV_TYPES,
      itemsPerPage: 100,
    }
    if (cat) params['productCategory.category'] = cat['@id']
    productsStore.actions.getItems(params).then(data => {
      const nextProducts = Array.isArray(data) ? data : []
      if (cat?.['@id']) {
        const nextCategories = updateSharedCachedCategoryProducts(
          currentCompany.id,
          cat,
          nextProducts,
        )
        categoriesStore.actions.setItems(nextCategories)
      }
    })
  }, [currentCompany?.id])

  /* ── filtro local por busca ── */
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return allProducts || []
    const q = normalizeStr(search.trim())
    return (allProducts || []).filter(p =>
      normalizeStr(p.product).includes(q) ||
      normalizeStr(p.description || '').includes(q) ||
      normalizeStr(p.sku || '').includes(q),
    )
  }, [allProducts, search])

  /* ── totais carrinho ── */
  const cartCount   = useMemo(() => cartItems.reduce((s, i) => s + i.quantity, 0), [cartItems])
  const cartTotal   = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.total || calcCartItemTotal(item) || 0), 0),
    [cartItems],
  )

  /* ── totais pagamento ── */
  const getProductQty = useCallback(
    pid =>
      cartItems
        .filter(item => String(item?.product?.id) === String(pid))
        .reduce((sum, item) => sum + Number(item?.quantity || 0), 0),
    [cartItems],
  )

  const addSimpleProduct = useCallback(async product => {
    if (!product?.id && !product?.['@id']) return

    setCartSyncing(true)
    try {
      const order = await ensureActiveOrder()
      const productId = normalizeId(product?.id || product?.['@id'])
      if (!productId) return

      const updatedOrder = await ordersStore.actions.addProducts(order.id, [{
        product: productId,
        quantity: 1,
      }])

      syncActiveOrderState(updatedOrder)
    } finally {
      setCartSyncing(false)
    }
  }, [ensureActiveOrder, ordersStore.actions, syncActiveOrderState])

  /* ── abrir modal de grupos (para qualquer produto) ── */
  const openCustomize = useCallback(async (product) => {
    setCustModal({ visible: true, product })
    setCustGroups([])
    setCustGroupProds({})
    setCustLoading(true)

    try {
      const groupsResponse = await productGroupStore.actions.getItems({
        parentProduct: `/products/${product.id}`,
        people: currentCompany?.id,
        itemsPerPage: 200,
      })
      const groups = extractItems(groupsResponse)
      if (!groups || groups.length === 0) {
        // sem grupos → adiciona direto ao carrinho
        setCustLoading(false)
        setCustModal({ visible: false, product: null })
        void addSimpleProduct(product)
        return
      }
      setCustGroups(groups)
      const prodsMap = {}
      await Promise.all(
        groups.map(async g => {
          const groupProductsResponse = await productGroupProdStore.actions.getItems({
            productGroup: `/product_groups/${g.id}`,
            productType: 'component',
            itemsPerPage: 200,
          })
          prodsMap[g.id] = extractItems(groupProductsResponse)
        }),
      )
      setCustGroupProds(prodsMap)
    } catch {
      setCustModal({ visible: false, product: null })
      void addSimpleProduct(product)
    } finally {
      setCustLoading(false)
    }
  }, [addSimpleProduct, currentCompany?.id, productGroupProdStore.actions, productGroupStore.actions])

  /* ── todos os produtos passam por openCustomize ── */
  const handleProductPress = useCallback((product) => {
    if (isCartBusy) return
    openCustomize(product)
  }, [isCartBusy, openCustomize])

  const handleCustomizeConfirm = useCallback(async (subProducts, extraPrice) => {
    const product = custModal.product
    const productId = normalizeId(product?.id || product?.['@id'])
    if (!productId) {
      setCustModal({ visible: false, product: null })
      return
    }
    const normalizedSubProducts = (subProducts || [])
      .map(item => ({
        product: normalizeId(item?.productGroupProduct?.productChild?.id || item?.productGroupProduct?.productChild?.['@id']),
        productGroup: item?.groupId,
        quantity: Number(item?.quantity || 1),
      }))
      .filter(item => item.product && item.productGroup)

    setCartSyncing(true)
    try {
      const order = await ensureActiveOrder()
      const updatedOrder = await ordersStore.actions.addProducts(order.id, [{
        product: productId,
        quantity: 1,
        sub_products: normalizedSubProducts,
      }])

      syncActiveOrderState(updatedOrder)
      setCustModal({ visible: false, product: null })
    } finally {
      setCartSyncing(false)
    }
  }, [custModal.product, ensureActiveOrder, ordersStore.actions, syncActiveOrderState])

  const removeCartItem = useCallback(async orderProduct => {
    const orderProductId = normalizeId(orderProduct?.id || orderProduct?.['@id'])
    if (!orderProductId) return

    setCartSyncing(true)
    try {
      const currentOrderProducts = Array.isArray(activeOrder?.orderProducts)
        ? activeOrder.orderProducts
        : []

      if (Number(orderProduct?.quantity || 0) > 1) {
        const savedOrderProduct = await orderProductsStore.actions.save({
          '@id': orderProduct?.['@id'],
          id: Number(orderProductId),
          quantity: Number(orderProduct?.quantity || 0) - 1,
        })
        syncCartOrderProducts(
          mergeOrderProductIntoList(currentOrderProducts, savedOrderProduct),
        )
      } else {
        await orderProductsStore.actions.remove(orderProductId)
        syncCartOrderProducts(
          removeOrderProductFromList(currentOrderProducts, orderProduct),
        )
      }
    } finally {
      setCartSyncing(false)
    }
  }, [activeOrder?.orderProducts, orderProductsStore.actions, syncCartOrderProducts])

  const addCartItem = useCallback(async orderProduct => {
    const orderProductId = normalizeId(orderProduct?.id || orderProduct?.['@id'])
    if (!orderProductId) return

    setCartSyncing(true)
    try {
      const savedOrderProduct = await orderProductsStore.actions.save({
        '@id': orderProduct?.['@id'],
        id: Number(orderProductId),
        quantity: Number(orderProduct?.quantity || 0) + 1,
      })
      syncCartOrderProducts(
        mergeOrderProductIntoList(
          Array.isArray(activeOrder?.orderProducts) ? activeOrder.orderProducts : [],
          savedOrderProduct,
        ),
      )
    } finally {
      setCartSyncing(false)
    }
  }, [activeOrder?.orderProducts, orderProductsStore.actions, syncCartOrderProducts])

  const openCheckout = () => {
    if (cartCount === 0) return
    setStep('review')
    setCheckoutVisible(true)
  }

  const handleCreateOrder = useCallback(async () => {
    if (cartItems.length === 0) return

    setStep('processing')
    setProcessingMsg('Preparando checkout...')
    try {
      const order = await ensureActiveOrder()
      const syncedOrder = await syncOrderPeople(selectedPeople)

      setCheckoutVisible(false)
      setProcessingMsg('')
      setStep('review')
      navigation.navigate('Checkout', { order: syncedOrder || order })
    } catch (e) {
      setStep('error')
      setProcessingMsg(e?.message || 'Erro ao abrir checkout')
    }
  }, [cartItems.length, ensureActiveOrder, navigation, selectedPeople, syncOrderPeople])

  return (
    <SafeAreaView style={[gs.root, { backgroundColor: palette.background || '#F8FAFC' }]}>

      {/* ── tela de categorias ── */}
      {screen === 'categories' && !search && (
        <View style={gs.flex}>
          <View style={[gs.searchBar, { backgroundColor: palette.surface || '#fff', borderBottomColor: palette.border }]}>
            <MaterialCommunityIcons name="magnify" size={18} color={palette.textSecondary} />
            <TextInput
              value={search}
              onChangeText={v => { setSearch(v); if (v) handleSelectCategory(null) }}
              placeholder="Buscar produto..."
              placeholderTextColor={palette.textSecondary}
              style={[gs.searchText, { color: palette.text }]}
            />
          </View>
          <CategoryGrid
            categories={categoryItems || []}
            categoriesLoading={categoriesLoading}
            onSelect={handleSelectCategory}
            palette={palette}
          />
        </View>
      )}

      {/* ── tela de produtos ── */}
      {(screen === 'products' || !!search) && (
        <View style={gs.flex}>
          <View style={[gs.productsHeader, { borderBottomColor: palette.border }]}>
            <TouchableOpacity
              onPress={() => { setScreen('categories'); setSearch(''); setSelectedCategory(null) }}
              style={[gs.backBtn, { backgroundColor: palette.surface || '#fff', borderColor: palette.border }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="arrow-left" size={20} color={palette.text} />
            </TouchableOpacity>

            <View style={[gs.searchInput, { flex: 1, backgroundColor: palette.surface || '#fff', borderColor: palette.border }]}>
              <MaterialCommunityIcons name="magnify" size={16} color={palette.textSecondary} style={{ marginRight: 6 }} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={selectedCategory ? (selectedCategory.name || selectedCategory.category || 'Buscar...') : 'Buscar produto...'}
                placeholderTextColor={palette.textSecondary}
                style={[gs.searchText, { color: palette.text }]}
                returnKeyType="search"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              {!!search && (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialCommunityIcons name="close-circle" size={15} color={palette.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {selectedCategory && !search && (
            <View style={[gs.catBadge, { borderBottomColor: palette.border }]}>
              <MaterialCommunityIcons name="tag" size={14} color={palette.primary} />
              <Text style={[gs.catBadgeText, { color: palette.primary }]}>
                {selectedCategory.name || selectedCategory.category}
              </Text>
              <Text style={[gs.catBadgeCount, { color: palette.textSecondary }]}>
                · {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}

          <ProductsGrid
            products={filteredProducts}
            isLoading={productsLoading}
            cart={activeOrder}
            onPress={handleProductPress}
            palette={palette}
            getProductQty={getProductQty}
          />
        </View>
      )}

      {/* ── FAB carrinho ── */}
      {cartCount > 0 && (
        <TouchableOpacity
          style={[gs.cartFab, { backgroundColor: palette.primary }]}
          onPress={openCheckout}
          activeOpacity={0.9}
        >
          <MaterialCommunityIcons name="cart" size={22} color="#fff" />
          <View style={gs.cartFabBadge}>
            <Text style={gs.cartFabBadgeText}>{cartCount}</Text>
          </View>
          <Text style={gs.cartFabTotal}>{Formatter.formatMoney(cartTotal)}</Text>
          <Text style={gs.cartFabLabel}>Ver carrinho</Text>
        </TouchableOpacity>
      )}

      {/* ── loading de grupos ── */}
      {custLoading && (
        <View style={gs.loadOverlay}>
          <View style={[gs.loadBox, { backgroundColor: palette.surface || '#fff' }]}>
            <ActivityIndicator size="large" color={palette.primary} />
            <Text style={[{ fontSize: 13, marginTop: 10 }, { color: palette.textSecondary }]}>Carregando opções...</Text>
          </View>
        </View>
      )}

      {/* ── modal de customização ── */}
      <CustomizeModal
        visible={custModal.visible && !custLoading}
        product={custModal.product}
        groups={custGroups}
        groupProducts={custGroupProds}
        onConfirm={handleCustomizeConfirm}
        onClose={() => setCustModal({ visible: false, product: null })}
        palette={palette}
      />

      {/* ── modal de checkout ── */}
      <Modal
        visible={checkoutVisible}
        animationType="slide"
        transparent
        onRequestClose={() => step !== 'processing' && setCheckoutVisible(false)}
      >
        <View style={gs.modalOverlay}>
          <View style={[gs.modalSheet, { backgroundColor: palette.modalBg || palette.surface || '#fff', maxHeight: windowHeight * 0.92 }]}>

            <View style={[gs.modalHeader, { borderBottomColor: palette.border }]}>
              <Text style={[gs.modalTitle, { color: palette.text }]}>
                {step === 'review' ? 'Revisar pedido' : step === 'processing' ? 'Abrindo checkout...' : 'Erro'}
              </Text>
              {step === 'review' && (
                <TouchableOpacity onPress={() => setCheckoutVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialCommunityIcons name="close" size={24} color={palette.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* REVISAO */}
            {step === 'review' && (
              <>
                <ScrollView style={gs.cartList} showsVerticalScrollIndicator={false}>
                  {cartItems.map((item, idx) => {
                    return (
                      <View key={item.key || idx} style={[gs.cartItem, { borderBottomColor: palette.border }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[gs.cartItemName, { color: palette.text }]} numberOfLines={1}>
                            {item.product.product}
                          </Text>
                          {item.subProducts?.length > 0 && (
                            <Text style={[gs.cartItemSub, { color: palette.textSecondary }]} numberOfLines={2}>
                              + {item.subProducts.map(s => s.productGroupProduct?.productChild?.product || '').filter(Boolean).join(', ')}
                            </Text>
                          )}
                          <Text style={[gs.cartItemPrice, { color: palette.textSecondary }]}>
                            {item.quantity} × {Formatter.formatMoney(Number(item.product.price) + (item.extraPrice || 0))}
                          </Text>
                        </View>
                        <View style={gs.cartItemQty}>
                          <TouchableOpacity
                            onPress={() => removeCartItem(item.orderProduct || item)}
                            disabled={isCartBusy}
                            style={[gs.qtyBtn, { borderColor: palette.border }]}
                          >
                            <MaterialCommunityIcons
                              name={item.quantity === 1 ? 'delete-outline' : 'minus'}
                              size={15}
                              color={item.quantity === 1 ? (palette.danger || '#EF4444') : palette.text}
                            />
                          </TouchableOpacity>
                          <Text style={[gs.qtyNum, { color: palette.text }]}>{item.quantity}</Text>
                          <TouchableOpacity
                            onPress={() => addCartItem(item.orderProduct || item)}
                            disabled={isCartBusy}
                            style={[gs.qtyBtn, { borderColor: palette.border }]}
                          >
                            <MaterialCommunityIcons name="plus" size={15} color={palette.primary} />
                          </TouchableOpacity>
                        </View>
                        <Text style={[gs.cartItemTotal, { color: palette.primary }]}>
                          {Formatter.formatMoney(item.total || calcCartItemTotal(item))}
                        </Text>
                      </View>
                    )
                  })}
                </ScrollView>

                <View style={[gs.cartSummary, { borderTopColor: palette.border }]}>
                  <View style={gs.totalRow}>
                    <Text style={[gs.totalLabel, { color: palette.textSecondary }]}>Total</Text>
                    <Text style={[gs.totalValue, { color: palette.primary }]}>{Formatter.formatMoney(cartTotal)}</Text>
                  </View>
                </View>

                {/* cliente opcional */}
                <View style={[gs.clientBlock, { borderTopColor: palette.border }]}>
                  <Text style={[gs.addPayTitle, { color: palette.textSecondary }]}>Cliente (opcional)</Text>
                  {selectedPeople ? (
                    <View style={[gs.clientSelected, { borderColor: palette.primary, backgroundColor: withOpacity(palette.primary, 0.06) }]}>
                      <MaterialCommunityIcons name="account-check" size={18} color={palette.primary} />
                      <Text style={[gs.clientSelectedName, { color: palette.primary, flex: 1 }]} numberOfLines={1}>
                        {selectedPeople.name || selectedPeople.people}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          void syncOrderPeople(null)
                          setPeopleQuery('')
                          peopleStore.actions.setItems([])
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialCommunityIcons name="close-circle" size={18} color={palette.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <View style={[gs.clientSearch, { borderColor: palette.border, backgroundColor: palette.surface || '#fff' }]}>
                        <MaterialCommunityIcons name="magnify" size={16} color={palette.textSecondary} />
                        <TextInput
                          value={peopleQuery}
                          onChangeText={v => { setPeopleQuery(v); searchPeople(v) }}
                          placeholder="Buscar por nome..."
                          placeholderTextColor={palette.textSecondary}
                          style={[gs.searchText, { color: palette.text, flex: 1 }]}
                        />
                        {peopleLoading && <ActivityIndicator size="small" color={palette.primary} />}
                      </View>
                      {peopleQuery.trim().length > 0 && (peopleItems || []).map(p => (
                        <TouchableOpacity
                          key={p['@id'] || p.id}
                          onPress={() => {
                            void syncOrderPeople(p)
                            setPeopleQuery('')
                            peopleStore.actions.setItems([])
                          }}
                          style={[gs.clientResult, { borderColor: palette.border }]}
                          activeOpacity={0.7}
                        >
                          <MaterialCommunityIcons name="account" size={16} color={palette.textSecondary} />
                          <Text style={[gs.clientResultName, { color: palette.text }]} numberOfLines={1}>
                            {p.name || p.people}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
                </View>

                <View style={gs.actions}>
                  <TouchableOpacity
                    onPress={async () => {
                      if (!cartItems.length) return
                      setCartSyncing(true)
                      try {
                        let nextOrderProducts = Array.isArray(activeOrder?.orderProducts)
                          ? activeOrder.orderProducts
                          : []

                        await Promise.all(
                          cartItems
                            .filter(orderItem => orderItem?.id)
                            .map(orderItem => orderProductsStore.actions.remove(orderItem.id)),
                        )
                        cartItems.forEach(orderItem => {
                          nextOrderProducts = removeOrderProductFromList(
                            nextOrderProducts,
                            orderItem?.orderProduct || orderItem,
                          )
                        })
                        syncCartOrderProducts(nextOrderProducts)
                      } finally {
                        setCartSyncing(false)
                      }
                    }}
                    disabled={isCartBusy}
                    style={[gs.btnSec, { borderColor: palette.border }]}
                  >
                    <Text style={[gs.btnSecText, { color: palette.textSecondary }]}>Limpar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCreateOrder}
                    disabled={isCartBusy}
                    style={[gs.btnPri, { backgroundColor: palette.primary }]}
                  >
                    <Text style={gs.btnPriText}>Conferir pedido</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* PROCESSANDO */}
            {step === 'processing' && (
              <View style={gs.feedbackWrap}>
                <ActivityIndicator size="large" color={palette.primary} />
                <Text style={[gs.feedbackText, { color: palette.text }]}>{processingMsg}</Text>
              </View>
            )}

            {/* ERRO */}
            {step === 'error' && (
              <View style={gs.feedbackWrap}>
                <MaterialCommunityIcons name="alert-circle" size={64} color={palette.danger || '#EF4444'} />
                <Text style={[gs.feedbackTitle, { color: palette.text }]}>Erro ao finalizar</Text>
                <Text style={[gs.feedbackText, { color: palette.textSecondary }]}>{processingMsg}</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                  <TouchableOpacity onPress={() => setCheckoutVisible(false)} style={[gs.btnSec, { borderColor: palette.border }]}>
                    <Text style={[gs.btnSecText, { color: palette.textSecondary }]}>Fechar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setStep('review')} style={[gs.btnPri, { backgroundColor: palette.primary }]}>
                    <Text style={gs.btnPriText}>Tentar novamente</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

/* ─── estilos globais ───────────────────────────────────────────────── */

const gs = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
  },
  searchText: { flex: 1, fontSize: 14, padding: 0 },

  productsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },

  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 1,
    gap: 5,
  },
  catBadgeText: { fontSize: 13, fontWeight: '800' },
  catBadgeCount: { fontSize: 12 },

  /* FAB */
  cartFab: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 6 },
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.18)' },
    }),
  },
  cartFabBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartFabBadgeText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  cartFabTotal: { color: '#fff', fontWeight: '800', fontSize: 15, flex: 1 },
  cartFabLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },

  /* loading overlay */
  loadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadBox: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },

  /* modal checkout */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '800' },

  /* carrinho */
  cartList: { maxHeight: 300 },
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, gap: 8 },
  cartItemName: { fontSize: 14, fontWeight: '700', marginBottom: 1 },
  cartItemSub: { fontSize: 11, marginBottom: 2 },
  cartItemPrice: { fontSize: 11 },
  cartItemQty: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 28, height: 28, borderRadius: 7, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  qtyNum: { fontSize: 14, fontWeight: '700', minWidth: 18, textAlign: 'center' },
  cartItemTotal: { fontSize: 13, fontWeight: '800', minWidth: 64, textAlign: 'right' },

  cartSummary: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  /* cliente */
  clientBlock: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
  clientSearch: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginTop: 6 },
  clientSelected: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 6 },
  clientSelectedName: { fontSize: 14, fontWeight: '700' },
  clientResult: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  clientResultName: { fontSize: 14 },
  totalLabel: { fontSize: 14, fontWeight: '600' },
  totalValue: { fontSize: 22, fontWeight: '900' },

  /* pagamento */
  payScroll: { maxHeight: 360, paddingHorizontal: 12, paddingTop: 4 },
  payAdded: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 4, borderBottomWidth: 1 },
  payAddedName: { flex: 1, fontSize: 14, fontWeight: '700' },
  payAddedAmt: { fontSize: 14, fontWeight: '800' },

  addPayBlock: { borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 10, marginBottom: 6 },
  addPayTitle: { fontSize: 11, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },

  payOption: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 6 },
  payOptionName: { fontSize: 14, fontWeight: '700', flex: 1 },

  payAmtRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  payAmtLabel: { fontSize: 13, fontWeight: '600' },
  amtInput: { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, fontWeight: '700', textAlign: 'right' },
  addPayBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  addPayBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  payTotals: { borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 8, gap: 5 },
  payTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 2 },
  payTotalLabel: { fontSize: 13, fontWeight: '600' },
  payTotalVal: { fontSize: 15, fontWeight: '800' },
  trocoRow: { paddingHorizontal: 10, paddingVertical: 5 },

  /* botões */
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  btnPri: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  btnPriText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  btnSec: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  btnSecText: { fontWeight: '700', fontSize: 15 },

  feedbackWrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, gap: 8 },
  feedbackTitle: { fontSize: 22, fontWeight: '900', marginTop: 12 },
  feedbackText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
})
