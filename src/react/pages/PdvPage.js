import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { useStore } from '@store'
import Formatter from '@controleonline/ui-common/src/utils/formatter'
import { env } from '@env'
import { resolveThemePalette, withOpacity } from '@controleonline/../../src/styles/branding'

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

/**
 * Calcula o delta de preço dos grupos selecionados.
 * priceCalculation: 'sum' | 'biggest' | 'average' | 'free'
 */
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

const calcCartItemTotal = cartItem => {
  const base = Number(cartItem.product?.price || 0) * cartItem.quantity
  const extra = cartItem.extraPrice || 0
  return base + extra * cartItem.quantity
}

/* ─── tela de categorias ─────────────────────────────────────────────── */

const CategoryGrid = ({ categories, allProducts, onSelect, palette, styles }) => (
  <View style={{ flex: 1 }}>
    <FlatList
      data={categories}
      keyExtractor={c => String(c.id)}
      numColumns={2}
      contentContainerStyle={{ padding: 10, paddingBottom: 20 }}
      ListHeaderComponent={
        <TouchableOpacity
          onPress={() => onSelect(null)}
          style={[styles.catCard, { borderColor: palette.primary, backgroundColor: withOpacity(palette.primary, 0.07) }]}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="view-grid" size={32} color={palette.primary} />
          <Text style={[styles.catCardName, { color: palette.primary }]}>Todos os produtos</Text>
          <Text style={[styles.catCardCount, { color: palette.textSecondary }]}>
            {allProducts.length} produto{allProducts.length !== 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>
      }
      renderItem={({ item: cat }) => {
        const count = allProducts.filter(p => {
          const c = p.category || p.productCategory
          return c?.id === cat.id
        }).length
        return (
          <TouchableOpacity
            onPress={() => onSelect(cat)}
            style={[styles.catCard, { borderColor: palette.border }]}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="tag-outline" size={32} color={palette.textSecondary} />
            <Text style={[styles.catCardName, { color: palette.text }]} numberOfLines={2}>
              {cat.category || cat.name || 'Categoria'}
            </Text>
            <Text style={[styles.catCardCount, { color: palette.textSecondary }]}>
              {count} produto{count !== 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        )
      }}
    />
  </View>
)

/* ─── card de produto no grid ─────────────────────────────────────────── */

const ProductCard = ({ product, quantity, onAdd, palette }) => {
  const coverUrl = buildCoverUrl(product.productFiles, product?.extraData?.imageCoverRelationId)
  const isCustom = product.type === 'custom'

  return (
    <TouchableOpacity
      onPress={onAdd}
      style={[pdvCard.card, { borderColor: quantity > 0 ? palette.primary : palette.border }]}
      activeOpacity={0.85}
    >
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={pdvCard.image} resizeMode="cover" />
      ) : (
        <View style={[pdvCard.image, pdvCard.imagePh]}>
          <MaterialCommunityIcons name="food" size={30} color={palette.border} />
        </View>
      )}

      {quantity > 0 && (
        <View style={[pdvCard.qtyBadge, { backgroundColor: palette.primary }]}>
          <Text style={pdvCard.qtyBadgeText}>{quantity}</Text>
        </View>
      )}

      {isCustom && (
        <View style={[pdvCard.customTag, { backgroundColor: withOpacity('#8B5CF6', 0.12) }]}>
          <Text style={pdvCard.customTagText}>Personalizável</Text>
        </View>
      )}

      <View style={pdvCard.body}>
        <Text style={[pdvCard.name, { color: palette.text }]} numberOfLines={2}>
          {product.product}
        </Text>
        <Text style={[pdvCard.price, { color: palette.primary }]}>
          {Formatter.formatMoney(product.price)}
        </Text>
      </View>

      <View style={[pdvCard.addRow, { borderTopColor: palette.border }]}>
        <Text style={[pdvCard.addLabel, { color: palette.primary }]}>
          {isCustom ? 'Personalizar' : 'Adicionar'}
        </Text>
        <MaterialCommunityIcons
          name={isCustom ? 'tune' : 'plus-circle'}
          size={22}
          color={palette.primary}
        />
      </View>
    </TouchableOpacity>
  )
}

const pdvCard = StyleSheet.create({
  card: {
    flex: 1,
    margin: 5,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 2,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
    }),
  },
  image: { width: '100%', aspectRatio: 1.2, backgroundColor: '#F1F5F9' },
  imagePh: { justifyContent: 'center', alignItems: 'center' },
  qtyBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  qtyBadgeText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  customTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  customTagText: { color: '#8B5CF6', fontSize: 10, fontWeight: '700' },
  body: { padding: 10 },
  name: { fontSize: 13, fontWeight: '700', lineHeight: 17, marginBottom: 4 },
  price: { fontSize: 15, fontWeight: '800' },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  addLabel: { fontSize: 13, fontWeight: '700' },
})

/* ─── modal de customização ──────────────────────────────────────────── */

const CustomizeModal = ({ visible, product, groups, groupProducts, onConfirm, onClose, palette }) => {
  const [selections, setSelections] = useState({}) // { groupId: [productGroupProductObj] }
  const [loadingGroups, setLoadingGroups] = useState(false)

  useEffect(() => {
    if (visible) setSelections({})
  }, [visible, product?.id])

  const toggle = (group, item) => {
    setSelections(prev => {
      const cur = prev[group.id] || []
      const already = cur.find(i => i['@id'] === item['@id'])
      if (already) {
        return { ...prev, [group.id]: cur.filter(i => i['@id'] !== item['@id']) }
      }
      // respeita maximum
      if (group.maximum && cur.length >= group.maximum) {
        // remove o primeiro para dar lugar ao novo (radio em max=1)
        if (group.maximum === 1) {
          return { ...prev, [group.id]: [item] }
        }
        return prev // já no limite
      }
      return { ...prev, [group.id]: [...cur, item] }
    })
  }

  const isSelected = (groupId, item) =>
    (selections[groupId] || []).some(i => i['@id'] === item['@id'])

  // preço extra total
  const extraPrice = useMemo(() => {
    return groups.reduce((total, group) => {
      const sel = selections[group.id] || []
      return total + calcGroupExtraPrice(group, sel)
    }, 0)
  }, [groups, selections])

  // validação: grupos obrigatórios com mínimo
  const isValid = useMemo(() => {
    return groups.every(group => {
      if (!group.required && !group.minimum) return true
      const sel = (selections[group.id] || []).length
      return sel >= (group.minimum || 1)
    })
  }, [groups, selections])

  const handleConfirm = () => {
    const subProducts = []
    groups.forEach(group => {
      const sel = selections[group.id] || []
      sel.forEach(item => {
        subProducts.push({
          productGroupProduct: item,
          groupId: group.id,
          groupName: group.productGroup,
          priceCalculation: group.priceCalculation,
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
        <View style={[custStyles.sheet, { backgroundColor: palette.modalBg || palette.surface || '#fff' }]}>

          {/* header */}
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

          {/* grupos */}
          <ScrollView style={custStyles.body} showsVerticalScrollIndicator={false}>
            {groups.map(group => {
              const items = groupProducts[group.id] || []
              const selCount = (selections[group.id] || []).length
              const isGroupValid = (!group.required && !group.minimum) || selCount >= (group.minimum || 1)

              return (
                <View key={group.id} style={[custStyles.groupBlock, { borderColor: palette.border }]}>
                  {/* título do grupo */}
                  <View style={custStyles.groupHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[custStyles.groupName, { color: palette.text }]}>
                        {group.productGroup}
                      </Text>
                      <Text style={[custStyles.groupMeta, { color: isGroupValid ? palette.textSecondary : (palette.danger || '#EF4444') }]}>
                        {group.required ? '● Obrigatório · ' : '○ Opcional · '}
                        {group.minimum > 0 && group.maximum > 0
                          ? `Escolha de ${group.minimum} a ${group.maximum}`
                          : group.minimum > 0
                            ? `Mínimo ${group.minimum}`
                            : group.maximum > 0
                              ? `Até ${group.maximum}`
                              : 'Ilimitado'}
                        {group.priceCalculation === 'free' ? ' · Grátis' : ''}
                      </Text>
                    </View>
                    <View style={[
                      custStyles.groupCounter,
                      { backgroundColor: selCount > 0 ? withOpacity(palette.primary, 0.12) : palette.border + '40' },
                    ]}>
                      <Text style={[custStyles.groupCounterText, { color: selCount > 0 ? palette.primary : palette.textSecondary }]}>
                        {selCount}{group.maximum ? `/${group.maximum}` : ''}
                      </Text>
                    </View>
                  </View>

                  {/* opções */}
                  {items.map((item, idx) => {
                    const selected = isSelected(group.id, item)
                    const isAtMax = group.maximum && (selections[group.id] || []).length >= group.maximum && !selected
                    const itemPrice = Number(item.price || 0)
                    const priceLabel = group.priceCalculation === 'free'
                      ? 'Grátis'
                      : itemPrice > 0
                        ? `+${Formatter.formatMoney(itemPrice)}`
                        : itemPrice < 0
                          ? `-${Formatter.formatMoney(Math.abs(itemPrice))}`
                          : 'Incluso'

                    return (
                      <TouchableOpacity
                        key={item['@id'] || idx}
                        onPress={() => !isAtMax && toggle(group, item)}
                        disabled={isAtMax}
                        style={[
                          custStyles.optionRow,
                          { borderBottomColor: palette.border, opacity: isAtMax ? 0.4 : 1 },
                          selected && { backgroundColor: withOpacity(palette.primary, 0.06) },
                        ]}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons
                          name={
                            group.maximum === 1
                              ? selected ? 'radiobox-marked' : 'radiobox-blank'
                              : selected ? 'checkbox-marked' : 'checkbox-blank-outline'
                          }
                          size={22}
                          color={selected ? palette.primary : palette.textSecondary}
                        />
                        <Text style={[custStyles.optionName, { color: palette.text }]} numberOfLines={1}>
                          {item.productChild?.product || item.productChild?.name || '—'}
                        </Text>
                        <Text style={[
                          custStyles.optionPrice,
                          {
                            color: itemPrice > 0
                              ? palette.primary
                              : itemPrice < 0
                                ? (palette.danger || '#EF4444')
                                : palette.textSecondary,
                          },
                        ]}>
                          {priceLabel}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}

                  {items.length === 0 && (
                    <Text style={[custStyles.emptyGroup, { color: palette.textSecondary }]}>
                      Nenhuma opção disponível
                    </Text>
                  )}
                </View>
              )
            })}
          </ScrollView>

          {/* rodapé */}
          <View style={[custStyles.footer, { borderTopColor: palette.border }]}>
            <View>
              <Text style={[custStyles.totalLabel, { color: palette.textSecondary }]}>Total do item</Text>
              <Text style={[custStyles.totalValue, { color: palette.primary }]}>
                {Formatter.formatMoney(totalPrice)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={!isValid}
              style={[
                custStyles.addBtn,
                { backgroundColor: isValid ? palette.primary : (palette.border || '#E2E8F0') },
              ]}
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
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  title: { fontSize: 17, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  body: { flex: 1 },
  groupBlock: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  groupName: { fontSize: 15, fontWeight: '800' },
  groupMeta: { fontSize: 12, marginTop: 2 },
  groupCounter: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 36,
    alignItems: 'center',
  },
  groupCounterText: { fontSize: 13, fontWeight: '800' },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    gap: 12,
  },
  optionName: { flex: 1, fontSize: 14, fontWeight: '600' },
  optionPrice: { fontSize: 14, fontWeight: '700' },
  emptyGroup: { padding: 16, fontSize: 13 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    borderTopWidth: 1,
    gap: 12,
  },
  totalLabel: { fontSize: 12, fontWeight: '600' },
  totalValue: { fontSize: 22, fontWeight: '900' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
  },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
})

/* ─── componente principal ──────────────────────────────────────────── */

export default function PdvPage({ navigation }) {
  const productsStore      = useStore('products')
  const ordersStore        = useStore('orders')
  const invoiceStore       = useStore('invoice')
  const peopleStore        = useStore('people')
  const walletStore        = useStore('walletPaymentType')
  const themeStore         = useStore('theme')
  const productGroupStore  = useStore('product_group')
  const productGroupProdStore = useStore('product_group_product')

  const palette = useMemo(() => resolveThemePalette(themeStore?.getters?.colors), [themeStore?.getters?.colors])
  const styles  = useMemo(() => createStyles(palette), [palette])

  const { currentCompany, defaultCompany } = peopleStore.getters
  const { items: allProducts, isLoading: productsLoading } = productsStore.getters
  const { isSaving: orderSaving }   = ordersStore.getters
  const { isSaving: invoiceSaving } = invoiceStore.getters
  const { items: paymentTypes, isLoading: paymentsLoading } = walletStore.getters

  /* ── tela atual: 'categories' | 'products' ── */
  const [screen, setScreen]               = useState('categories')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [search, setSearch]               = useState('')

  /* ── carrinho: { productKey: { product, quantity, subProducts, extraPrice } } ── */
  const [cart, setCart] = useState({})

  /* ── modal de customização ── */
  const [custModal, setCustModal]       = useState({ visible: false, product: null })
  const [custGroups, setCustGroups]     = useState([])
  const [custGroupProds, setCustGroupProds] = useState({}) // { groupId: [...] }
  const [custLoading, setCustLoading]   = useState(false)

  /* ── checkout ── */
  const [checkoutVisible, setCheckoutVisible] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [customAmount, setCustomAmount]       = useState('')
  const [step, setStep]                       = useState('cart')
  const [processingMsg, setProcessingMsg]     = useState('')

  /* ── carregar produtos e pagamentos ── */
  useFocusEffect(
    useCallback(() => {
      if (!currentCompany?.id) return
      productsStore.actions.getItems({
        active: 1,
        'order[product]': 'ASC',
        company: currentCompany.id,
        type: ['custom', 'product', 'manufactured', 'service'],
      })
      walletStore.actions.getItems({ company: currentCompany.id })
    }, [currentCompany?.id]),
  )

  /* ── reset ao sair da tela ── */
  useFocusEffect(
    useCallback(() => {
      return () => {
        setCart({})
        setScreen('categories')
        setSelectedCategory(null)
        setSearch('')
        setCheckoutVisible(false)
        setCustModal({ visible: false, product: null })
        setStep('cart')
      }
    }, []),
  )

  /* ── categorias únicas ── */
  const categories = useMemo(() => {
    const map = new Map()
    ;(allProducts || []).forEach(p => {
      const c = p.category || p.productCategory
      if (c?.id && !map.has(c.id)) map.set(c.id, c)
    })
    return Array.from(map.values())
  }, [allProducts])

  /* ── produtos filtrados ── */
  const filteredProducts = useMemo(() => {
    let list = allProducts || []
    if (selectedCategory) {
      list = list.filter(p => {
        const c = p.category || p.productCategory
        return c?.id === selectedCategory.id
      })
    }
    if (search.trim()) {
      const q = normalizeStr(search.trim())
      list = list.filter(p =>
        normalizeStr(p.product).includes(q) ||
        normalizeStr(p.description || '').includes(q) ||
        normalizeStr(p.sku || '').includes(q),
      )
    }
    return list
  }, [allProducts, selectedCategory, search])

  /* ── totais ── */
  const cartItems = useMemo(() => Object.values(cart).filter(i => i.quantity > 0), [cart])
  const cartCount = useMemo(() => cartItems.reduce((s, i) => s + i.quantity, 0), [cartItems])
  const cartTotal = useMemo(() => cartItems.reduce((s, i) => s + calcCartItemTotal(i), 0), [cartItems])

  /* ── quantidade de um produto no carrinho (ignora customizações distintas) ── */
  const getProductQty = useCallback(
    productId =>
      Object.values(cart)
        .filter(i => String(i.product.id) === String(productId))
        .reduce((s, i) => s + i.quantity, 0),
    [cart],
  )

  /* ── abrir modal de customização ── */
  const openCustomize = useCallback(async (product) => {
    setCustModal({ visible: true, product })
    setCustGroups([])
    setCustGroupProds({})
    setCustLoading(true)

    try {
      const groups = await productGroupStore.actions.getItems({ product: product.id })
      if (!groups || groups.length === 0) {
        // sem grupos → adiciona direto
        setCustLoading(false)
        setCustModal({ visible: false, product: null })
        addSimpleProduct(product)
        return
      }
      setCustGroups(groups)

      const prodsMap = {}
      await Promise.all(
        groups.map(async group => {
          const items = await productGroupProdStore.actions.getItems({
            productGroup: `/product_groups/${group.id}`,
          })
          prodsMap[group.id] = items || []
        }),
      )
      setCustGroupProds(prodsMap)
    } catch {
      // erro → adiciona simples
      setCustModal({ visible: false, product: null })
      addSimpleProduct(product)
    } finally {
      setCustLoading(false)
    }
  }, [cart])

  /* ── adicionar produto simples (sem grupos) ── */
  const addSimpleProduct = useCallback((product) => {
    const key = `simple_${product.id}`
    setCart(prev => {
      const cur = prev[key]
      return {
        ...prev,
        [key]: {
          product,
          quantity: (cur?.quantity || 0) + 1,
          subProducts: [],
          extraPrice: 0,
        },
      }
    })
  }, [])

  /* ── ao clicar no card de produto ── */
  const handleProductPress = useCallback((product) => {
    if (product.type === 'custom') {
      openCustomize(product)
    } else {
      addSimpleProduct(product)
    }
  }, [openCustomize, addSimpleProduct])

  /* ── confirmar customização ── */
  const handleCustomizeConfirm = useCallback((subProducts, extraPrice) => {
    const product = custModal.product
    // cada customização distinta vira uma key única no carrinho
    const key = `custom_${product.id}_${Date.now()}`
    setCart(prev => ({
      ...prev,
      [key]: { product, quantity: 1, subProducts, extraPrice },
    }))
    setCustModal({ visible: false, product: null })
  }, [custModal.product])

  /* ── remover item do carrinho ── */
  const removeCartItem = useCallback((key) => {
    setCart(prev => {
      const next = { ...prev }
      if (next[key].quantity > 1) {
        next[key] = { ...next[key], quantity: next[key].quantity - 1 }
      } else {
        delete next[key]
      }
      return next
    })
  }, [])

  const addCartItem = useCallback((key) => {
    setCart(prev => ({
      ...prev,
      [key]: { ...prev[key], quantity: prev[key].quantity + 1 },
    }))
  }, [])

  /* ── abrir checkout ── */
  const openCheckout = () => {
    if (cartCount === 0) return
    setCustomAmount(cartTotal.toFixed(2).replace('.', ','))
    setSelectedPayment(null)
    setStep('cart')
    setCheckoutVisible(true)
  }

  /* ── finalizar pedido ── */
  const handleFinalize = useCallback(async () => {
    if (!selectedPayment) return
    setStep('processing')
    setProcessingMsg('Criando pedido...')
    try {
      const status = defaultCompany?.configs?.['pos-default-status']
      const order = await ordersStore.actions.save({
        app: 'POS',
        provider: '/people/' + currentCompany.id,
        status: '/statuses/' + status,
        orderType: 'sale',
      })

      setProcessingMsg('Adicionando produtos...')
      // itens simples agrupados por produto
      const simpleMap = {}
      // itens customizados: um save por item
      for (const item of cartItems) {
        if (item.subProducts && item.subProducts.length > 0) {
          await productGroupProdStore.actions.save
            ? null
            : null // just to reference the store
          // usa o endpoint order_products diretamente
          const orderProductsStore = useStore ? null : null // workaround
          // chama via ordersStore custom action
          const payload = {
            product: item.product['@id'],
            quantity: item.quantity,
            order: order['@id'],
            sub_products: item.subProducts.map(sp => ({
              product: sp.productGroupProduct.productChild['@id'].replace(/\D/g, ''),
              productGroup: sp.groupId,
              quantity: sp.quantity,
            })),
          }
          await ordersStore.actions.addProducts(order.id, [payload])
        } else {
          const pid = item.product['@id'].replace(/\D/g, '')
          simpleMap[pid] = (simpleMap[pid] || 0) + item.quantity
        }
      }

      if (Object.keys(simpleMap).length > 0) {
        const simplePayload = Object.entries(simpleMap).map(([pid, qty]) => ({
          product: pid,
          quantity: qty,
        }))
        await ordersStore.actions.addProducts(order.id, simplePayload)
      }

      setProcessingMsg('Registrando pagamento...')
      const rawAmount = String(customAmount).replace(',', '.')
      const total = parseFloat(rawAmount) || cartTotal
      await invoiceStore.actions.save({
        dueDate: Formatter.getCurrentDate(),
        status: '/statuses/' + defaultCompany?.configs?.['pos-paid-status'],
        destinationWallet: selectedPayment.wallet['@id'],
        paymentType: selectedPayment.paymentType['@id'],
        price: total,
        receiver: '/people/' + currentCompany.id,
        order: order['@id'],
      })

      setStep('done')
      setProcessingMsg('')
      setCart({})
    } catch (e) {
      setStep('error')
      setProcessingMsg(e?.message || 'Erro ao finalizar pedido')
    }
  }, [selectedPayment, cartItems, customAmount, cartTotal, currentCompany, defaultCompany])

  /* ── renderização ── */
  const renderProduct = useCallback(({ item }) => (
    <ProductCard
      product={item}
      quantity={getProductQty(item.id)}
      onAdd={() => handleProductPress(item)}
      palette={palette}
    />
  ), [cart, palette, handleProductPress, getProductQty])

  return (
    <SafeAreaView style={styles.root}>

      {/* ── tela de categorias ── */}
      {screen === 'categories' && !search && (
        <View style={{ flex: 1 }}>
          <View style={styles.searchBar}>
            <View style={styles.searchInput}>
              <MaterialCommunityIcons name="magnify" size={20} color={palette.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                value={search}
                onChangeText={v => { setSearch(v); if (v) setScreen('products') }}
                placeholder="Buscar produto..."
                placeholderTextColor={palette.textSecondary}
                style={[styles.searchText, { color: palette.text }]}
              />
            </View>
          </View>

          {productsLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={palette.primary} />
              <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Carregando...</Text>
            </View>
          ) : (
            <CategoryGrid
              categories={categories}
              allProducts={allProducts || []}
              onSelect={cat => {
                setSelectedCategory(cat)
                setScreen('products')
              }}
              palette={palette}
              styles={styles}
            />
          )}
        </View>
      )}

      {/* ── tela de produtos ── */}
      {(screen === 'products' || !!search) && (
        <View style={{ flex: 1 }}>
          {/* header da tela de produtos */}
          <View style={styles.productsHeader}>
            <TouchableOpacity
              onPress={() => { setScreen('categories'); setSearch(''); setSelectedCategory(null) }}
              style={styles.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="arrow-left" size={22} color={palette.text} />
            </TouchableOpacity>

            <View style={[styles.searchInput, { flex: 1 }]}>
              <MaterialCommunityIcons name="magnify" size={18} color={palette.textSecondary} style={{ marginRight: 6 }} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={selectedCategory ? (selectedCategory.category || 'Buscar...') : 'Buscar produto...'}
                placeholderTextColor={palette.textSecondary}
                style={[styles.searchText, { color: palette.text }]}
                returnKeyType="search"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              {!!search && (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialCommunityIcons name="close-circle" size={16} color={palette.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* título da categoria */}
          {selectedCategory && !search && (
            <View style={[styles.catTitle, { borderBottomColor: palette.border }]}>
              <MaterialCommunityIcons name="tag" size={16} color={palette.primary} />
              <Text style={[styles.catTitleText, { color: palette.primary }]}>
                {selectedCategory.category || selectedCategory.name}
              </Text>
              <Text style={[styles.catTitleCount, { color: palette.textSecondary }]}>
                ({filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''})
              </Text>
            </View>
          )}

          {productsLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={palette.primary} />
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="cart-off" size={48} color={palette.border} />
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Nenhum produto encontrado</Text>
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              keyExtractor={item => String(item.id)}
              renderItem={renderProduct}
              numColumns={2}
              contentContainerStyle={styles.grid}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      )}

      {/* ── FAB carrinho ── */}
      {cartCount > 0 && (
        <TouchableOpacity style={[styles.cartFab, { backgroundColor: palette.primary }]} onPress={openCheckout} activeOpacity={0.9}>
          <MaterialCommunityIcons name="cart" size={22} color="#fff" />
          <View style={styles.cartFabBadge}>
            <Text style={styles.cartFabBadgeText}>{cartCount}</Text>
          </View>
          <Text style={styles.cartFabTotal}>{Formatter.formatMoney(cartTotal)}</Text>
          <Text style={styles.cartFabLabel}>Ver carrinho</Text>
        </TouchableOpacity>
      )}

      {/* ── overlay de loading do modal de customização ── */}
      {custLoading && (
        <View style={styles.custLoadOverlay}>
          <View style={[styles.custLoadBox, { backgroundColor: palette.surface || '#fff' }]}>
            <ActivityIndicator size="large" color={palette.primary} />
            <Text style={[styles.loadingText, { color: palette.textSecondary, marginTop: 10 }]}>Carregando opções...</Text>
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
        onRequestClose={() => (step === 'done' || step === 'error') && setCheckoutVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: palette.modalBg || palette.surface || '#fff' }]}>

            <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
              <Text style={[styles.modalTitle, { color: palette.text }]}>
                {step === 'cart' ? 'Carrinho' : step === 'payment' ? 'Pagamento' : step === 'done' ? 'Concluído!' : step === 'processing' ? 'Processando...' : 'Erro'}
              </Text>
              {(step === 'cart' || step === 'payment') && (
                <TouchableOpacity onPress={() => setCheckoutVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialCommunityIcons name="close" size={24} color={palette.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* step: carrinho */}
            {step === 'cart' && (
              <>
                <ScrollView style={styles.cartList} showsVerticalScrollIndicator={false}>
                  {cartItems.map((item, idx) => {
                    const key = Object.keys(cart).find(k => cart[k] === item)
                    return (
                      <View key={key || idx} style={[styles.cartItem, { borderBottomColor: palette.border }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.cartItemName, { color: palette.text }]} numberOfLines={1}>
                            {item.product.product}
                          </Text>
                          {item.subProducts?.length > 0 && (
                            <Text style={[styles.cartItemSub, { color: palette.textSecondary }]} numberOfLines={2}>
                              + {item.subProducts.map(s => s.productGroupProduct?.productChild?.product || '').filter(Boolean).join(', ')}
                            </Text>
                          )}
                          <Text style={[styles.cartItemPrice, { color: palette.textSecondary }]}>
                            {item.quantity} × {Formatter.formatMoney(Number(item.product.price) + (item.extraPrice || 0))}
                          </Text>
                        </View>
                        <View style={styles.cartItemQty}>
                          <TouchableOpacity
                            onPress={() => removeCartItem(key)}
                            style={[styles.cartQtyBtn, { borderColor: palette.border }]}
                          >
                            <MaterialCommunityIcons
                              name={item.quantity === 1 ? 'delete-outline' : 'minus'}
                              size={16}
                              color={item.quantity === 1 ? (palette.danger || '#EF4444') : palette.text}
                            />
                          </TouchableOpacity>
                          <Text style={[styles.cartQtyNum, { color: palette.text }]}>{item.quantity}</Text>
                          <TouchableOpacity
                            onPress={() => addCartItem(key)}
                            style={[styles.cartQtyBtn, { borderColor: palette.border }]}
                          >
                            <MaterialCommunityIcons name="plus" size={16} color={palette.primary} />
                          </TouchableOpacity>
                        </View>
                        <Text style={[styles.cartItemTotal, { color: palette.primary }]}>
                          {Formatter.formatMoney(calcCartItemTotal(item))}
                        </Text>
                      </View>
                    )
                  })}
                </ScrollView>

                <View style={[styles.cartSummary, { borderTopColor: palette.border }]}>
                  <View style={styles.cartTotalRow}>
                    <Text style={[styles.cartTotalLabel, { color: palette.textSecondary }]}>Total</Text>
                    <Text style={[styles.cartTotalValue, { color: palette.primary }]}>{Formatter.formatMoney(cartTotal)}</Text>
                  </View>
                  <View style={styles.amountRow}>
                    <Text style={[styles.amountLabel, { color: palette.textSecondary }]}>Valor a cobrar</Text>
                    <TextInput
                      value={customAmount}
                      onChangeText={setCustomAmount}
                      keyboardType="decimal-pad"
                      style={[styles.amountInput, { borderColor: palette.border, color: palette.text }]}
                      selectTextOnFocus
                    />
                  </View>
                </View>

                <View style={styles.cartActions}>
                  <TouchableOpacity onPress={() => setCart({})} style={[styles.btnSecondary, { borderColor: palette.border }]}>
                    <Text style={[styles.btnSecondaryText, { color: palette.textSecondary }]}>Limpar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setStep('payment')} style={[styles.btnPrimary, { backgroundColor: palette.primary }]}>
                    <Text style={styles.btnPrimaryText}>Ir para pagamento</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* step: pagamento */}
            {step === 'payment' && (
              <>
                {paymentsLoading ? (
                  <View style={styles.loadingWrap}><ActivityIndicator color={palette.primary} /></View>
                ) : (
                  <ScrollView style={styles.paymentList} showsVerticalScrollIndicator={false}>
                    {(paymentTypes || []).map(pt => {
                      const sel = selectedPayment?.paymentType?.id === pt.paymentType?.id
                      return (
                        <TouchableOpacity
                          key={pt.paymentType?.id}
                          onPress={() => setSelectedPayment(pt)}
                          style={[
                            styles.paymentOption,
                            {
                              borderColor: sel ? palette.primary : palette.border,
                              backgroundColor: sel ? withOpacity(palette.primary, 0.08) : 'transparent',
                            },
                          ]}
                          activeOpacity={0.8}
                        >
                          <MaterialCommunityIcons
                            name={sel ? 'radiobox-marked' : 'radiobox-blank'}
                            size={22}
                            color={sel ? palette.primary : palette.textSecondary}
                          />
                          <Text style={[styles.paymentName, { color: sel ? palette.primary : palette.text }]}>
                            {pt.paymentType?.paymentType}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                    {(!paymentTypes || paymentTypes.length === 0) && (
                      <Text style={[styles.emptyText, { color: palette.textSecondary, padding: 24, textAlign: 'center' }]}>
                        Nenhuma forma de pagamento configurada
                      </Text>
                    )}
                  </ScrollView>
                )}

                <View style={[styles.paymentSummary, { borderTopColor: palette.border }]}>
                  <Text style={[styles.cartTotalLabel, { color: palette.textSecondary }]}>Total a cobrar</Text>
                  <Text style={[styles.cartTotalValue, { color: palette.primary }]}>
                    {customAmount ? `R$ ${customAmount}` : Formatter.formatMoney(cartTotal)}
                  </Text>
                </View>

                <View style={styles.cartActions}>
                  <TouchableOpacity onPress={() => setStep('cart')} style={[styles.btnSecondary, { borderColor: palette.border }]}>
                    <Text style={[styles.btnSecondaryText, { color: palette.textSecondary }]}>Voltar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleFinalize}
                    disabled={!selectedPayment || orderSaving || invoiceSaving}
                    style={[styles.btnPrimary, { backgroundColor: selectedPayment ? palette.primary : palette.border }]}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.btnPrimaryText}>Finalizar venda</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* step: processando */}
            {step === 'processing' && (
              <View style={styles.feedbackWrap}>
                <ActivityIndicator size="large" color={palette.primary} />
                <Text style={[styles.feedbackText, { color: palette.text }]}>{processingMsg}</Text>
              </View>
            )}

            {/* step: concluído */}
            {step === 'done' && (
              <View style={styles.feedbackWrap}>
                <MaterialCommunityIcons name="check-circle" size={64} color={palette.success || '#22C55E'} />
                <Text style={[styles.feedbackTitle, { color: palette.text }]}>Venda concluída!</Text>
                <Text style={[styles.feedbackText, { color: palette.textSecondary }]}>Pedido registrado com sucesso.</Text>
                <TouchableOpacity
                  onPress={() => { setCheckoutVisible(false); setScreen('categories') }}
                  style={[styles.btnPrimary, { backgroundColor: palette.primary, marginTop: 24, minWidth: 160 }]}
                >
                  <Text style={styles.btnPrimaryText}>Nova venda</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* step: erro */}
            {step === 'error' && (
              <View style={styles.feedbackWrap}>
                <MaterialCommunityIcons name="alert-circle" size={64} color={palette.danger || '#EF4444'} />
                <Text style={[styles.feedbackTitle, { color: palette.text }]}>Erro ao finalizar</Text>
                <Text style={[styles.feedbackText, { color: palette.textSecondary }]}>{processingMsg}</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                  <TouchableOpacity onPress={() => setCheckoutVisible(false)} style={[styles.btnSecondary, { borderColor: palette.border }]}>
                    <Text style={[styles.btnSecondaryText, { color: palette.textSecondary }]}>Fechar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setStep('payment')} style={[styles.btnPrimary, { backgroundColor: palette.primary }]}>
                    <Text style={styles.btnPrimaryText}>Tentar novamente</Text>
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

const createStyles = palette => StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background || '#F8FAFC' },

  searchBar: { paddingHorizontal: 12, paddingVertical: 10 },
  productsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.surface || '#fff',
    borderWidth: 1,
    borderColor: palette.border,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface || '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: palette.border || '#E2E8F0',
  },
  searchText: { flex: 1, fontSize: 15, padding: 0 },

  catTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 6,
  },
  catTitleText: { fontSize: 14, fontWeight: '800' },
  catTitleCount: { fontSize: 13 },

  /* category grid */
  catCard: {
    flex: 1,
    margin: 5,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: palette.surface || '#fff',
    alignItems: 'center',
    padding: 18,
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.06)' },
    }),
  },
  catCardName: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  catCardCount: { fontSize: 12 },

  grid: { paddingHorizontal: 6, paddingBottom: 100 },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  loadingText: { fontSize: 14 },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  emptyText: { fontSize: 14, textAlign: 'center' },

  /* cust loading overlay */
  custLoadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  custLoadBox: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },

  /* FAB */
  cartFab: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
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
  cartFabBadgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  cartFabTotal: { color: '#fff', fontWeight: '800', fontSize: 16, flex: 1 },
  cartFabLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },

  /* modal checkout */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '800' },

  cartList: { maxHeight: 340 },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  cartItemName: { fontSize: 14, fontWeight: '700', marginBottom: 1 },
  cartItemSub: { fontSize: 11, marginBottom: 2 },
  cartItemPrice: { fontSize: 12 },
  cartItemQty: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartQtyBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  cartQtyNum: { fontSize: 15, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  cartItemTotal: { fontSize: 14, fontWeight: '800', minWidth: 70, textAlign: 'right' },

  cartSummary: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, gap: 10 },
  cartTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cartTotalLabel: { fontSize: 14, fontWeight: '600' },
  cartTotalValue: { fontSize: 22, fontWeight: '900' },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  amountLabel: { fontSize: 13, fontWeight: '600' },
  amountInput: {
    borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    fontSize: 16, fontWeight: '700', minWidth: 120, textAlign: 'right',
  },

  paymentList: { maxHeight: 320, paddingHorizontal: 12, paddingTop: 8 },
  paymentOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8,
  },
  paymentName: { fontSize: 15, fontWeight: '700' },
  paymentSummary: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, borderTopWidth: 1,
  },

  cartActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  btnPrimary: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  btnSecondary: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  btnSecondaryText: { fontWeight: '700', fontSize: 15 },

  feedbackWrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, gap: 8 },
  feedbackTitle: { fontSize: 22, fontWeight: '900', marginTop: 12 },
  feedbackText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
})
