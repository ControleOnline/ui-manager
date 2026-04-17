import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  ActivityIndicator,
  Image,
  Keyboard,
  Modal,
  ScrollView,
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
import { catStyles, custStyles, gs, prodStyles } from './PdvPage.styles'

import {
  inlineStyle_136_12,
  inlineStyle_138_14,
  inlineStyle_156_12,
  inlineStyle_160_10,
  inlineStyle_174_43,
  inlineStyle_178_14,
  inlineStyle_205_14,
  inlineStyle_207_16,
  inlineStyle_279_12,
  inlineStyle_287_12,
  inlineStyle_289_14,
  inlineStyle_391_18,
  inlineStyle_414_26,
  inlineStyle_943_93,
  inlineStyle_1048_30,
  inlineStyle_1208_22,
} from './PdvPage.styles';

import { inlineStyle_172_6, inlineStyle_331_6 } from './PdvPage.styles';

/* ─── constantes ────────────────────────────────────────────────────── */

// tipos de produto que aparecem no PDV (excluindo insumos: feedstock, component, package)
const PDV_TYPES = ['product', 'manufactured', 'custom', 'service']

/* ─── helpers ───────────────────────────────────────────────────────── */

const buildCoverUrl = (files, coverId) => {
  const arr = files || []
  let f = coverId ? arr.find(i => String(i?.id) === String(coverId) && i?.file?.id) : null
  if (!f) f = arr.find(i => i?.file?.id)
  if (!f) return null
  const host = env.DOMAIN || (
    typeof globalThis !== 'undefined' && globalThis.location
      ? globalThis.location.host
      : ''
  )
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
      <View style={inlineStyle_136_12}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={inlineStyle_138_14({
          palette: palette,
        })}>Carregando categorias...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={inlineStyle_172_6({
        gap: gap,
        maxWidth: maxWidth,
      })}
      showsVerticalScrollIndicator={false}
    >
      {/* card "Todos" */}
      <View style={inlineStyle_156_12({
        cardWidth: cardWidth,
      })}>
        <TouchableOpacity
          onPress={() => onSelect(null)}
          activeOpacity={0.88}
          style={inlineStyle_160_10}
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
          <View key={cat.id || cat['@id']} style={inlineStyle_174_43({
            cardWidth: cardWidth,
          })}>
            <TouchableOpacity
              onPress={() => onSelect(cat)}
              activeOpacity={0.88}
              style={inlineStyle_178_14}
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
                    style={catStyles.coverImage}
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
        );
      })}
      {(!categories || categories.length === 0) && (
        <View style={inlineStyle_205_14}>
          <MaterialCommunityIcons name="tag-off-outline" size={48} color={palette.border} />
          <Text style={inlineStyle_207_16({
            palette: palette,
          })}>Nenhuma categoria cadastrada</Text>
        </View>
      )}
    </ScrollView>
  );
}

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

/* ─── tela de produtos ─────────────────────────────────────────────── */

const ProductsGrid = ({ products, isLoading, onPress, palette, getProductQty }) => {
  const { width } = useWindowDimensions()
  const gap = 10
  const maxWidth = Math.min(width, 960) // cap para não ficar imenso em telas grandes
  const cols = width < 480 ? 2 : width < 768 ? 3 : width < 1024 ? 4 : 5
  const cardWidth = (maxWidth - (cols + 1) * gap) / cols

  if (isLoading) {
    return (
      <View style={inlineStyle_279_12}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  if (!products || products.length === 0) {
    return (
      <View style={inlineStyle_287_12}>
        <MaterialCommunityIcons name="cart-off" size={48} color={palette.border} />
        <Text style={inlineStyle_289_14({
          palette: palette,
        })}>
          Nenhum produto encontrado
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={inlineStyle_331_6({
        gap: gap,
        maxWidth: maxWidth,
      })}
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
  );
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
            <View style={inlineStyle_391_18}>
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
                    <View style={inlineStyle_414_26}>
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
              );
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
  );
}

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
    delay: 1000,
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

  const handleCustomizeConfirm = useCallback(async (subProducts, _extraPrice) => {
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

    scheduleCartQuantityChange(orderProduct, currentQuantity => Math.max(0, currentQuantity - 1))
  }, [scheduleCartQuantityChange])

  const addCartItem = useCallback(async orderProduct => {
    const orderProductId = normalizeId(orderProduct?.id || orderProduct?.['@id'])
    if (!orderProductId) return

    scheduleCartQuantityChange(orderProduct, currentQuantity => currentQuantity + 1)
  }, [scheduleCartQuantityChange])

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
      await flushPendingCartQuantityChanges()
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
  }, [cartItems.length, ensureActiveOrder, flushPendingCartQuantityChanges, navigation, selectedPeople, syncOrderPeople])

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
              <MaterialCommunityIcons name="magnify" size={16} color={palette.textSecondary} style={inlineStyle_943_93} />
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
                        <View style={inlineStyle_1048_30}>
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
                    );
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
                      cancelPendingCartQuantityChanges()
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
                <View style={inlineStyle_1208_22}>
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
  );
}

