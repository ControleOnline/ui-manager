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
  const base = Number(cartItem.product?.price || 0)
  const extra = cartItem.extraPrice || 0
  return (base + extra) * cartItem.quantity
}

const toFloat = str => parseFloat(String(str || '0').replace(',', '.')) || 0

/* ─── tela de categorias ─────────────────────────────────────────────── */

const CategoryGrid = ({ categories, categoriesLoading, totalProductCount, onSelect, palette, styles }) => (
  <View style={{ flex: 1 }}>
    {categoriesLoading ? (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Carregando categorias...</Text>
      </View>
    ) : (
      <FlatList
        data={categories}
        keyExtractor={c => String(c.id || c['@id'])}
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
            {totalProductCount > 0 && (
              <Text style={[styles.catCardCount, { color: palette.textSecondary }]}>
                {totalProductCount} produto{totalProductCount !== 1 ? 's' : ''}
              </Text>
            )}
          </TouchableOpacity>
        }
        renderItem={({ item: cat }) => (
          <TouchableOpacity
            onPress={() => onSelect(cat)}
            style={[styles.catCard, { borderColor: palette.border }]}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="tag-outline" size={32} color={palette.textSecondary} />
            <Text style={[styles.catCardName, { color: palette.text }]} numberOfLines={2}>
              {cat.category || cat.name || 'Categoria'}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={[styles.emptyWrap, { marginTop: 20 }]}>
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Nenhuma categoria cadastrada</Text>
          </View>
        }
      />
    )}
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
  const [selections, setSelections] = useState({})

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
      if (group.maximum && cur.length >= group.maximum) {
        if (group.maximum === 1) return { ...prev, [group.id]: [item] }
        return prev
      }
      return { ...prev, [group.id]: [...cur, item] }
    })
  }

  const isSelected = (groupId, item) =>
    (selections[groupId] || []).some(i => i['@id'] === item['@id'])

  const extraPrice = useMemo(() => {
    return groups.reduce((total, group) => {
      const sel = selections[group.id] || []
      return total + calcGroupExtraPrice(group, sel)
    }, 0)
  }, [groups, selections])

  const isValid = useMemo(() => {
    return groups.every(group => {
      if (!group.required && !group.minimum) return true
      return (selections[group.id] || []).length >= (group.minimum || 1)
    })
  }, [groups, selections])

  const handleConfirm = () => {
    const subProducts = []
    groups.forEach(group => {
      ;(selections[group.id] || []).forEach(item => {
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
              const isGroupValid = (!group.required && !group.minimum) || selCount >= (group.minimum || 1)

              return (
                <View key={group.id} style={[custStyles.groupBlock, { borderColor: palette.border }]}>
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
  const productsStore         = useStore('products')
  const ordersStore           = useStore('orders')
  const invoiceStore          = useStore('invoice')
  const peopleStore           = useStore('people')
  const walletStore           = useStore('walletPaymentType')
  const themeStore            = useStore('theme')
  const productGroupStore     = useStore('product_group')
  const productGroupProdStore = useStore('product_group_product')
  const categoriesStore       = useStore('categories')

  const palette = useMemo(() => resolveThemePalette(themeStore?.getters?.colors), [themeStore?.getters?.colors])
  const styles  = useMemo(() => createStyles(palette), [palette])

  const { currentCompany, defaultCompany } = peopleStore.getters
  const { items: allProducts, isLoading: productsLoading, totalItems: productsTotalItems } = productsStore.getters
  const { isSaving: orderSaving }   = ordersStore.getters
  const { isSaving: invoiceSaving } = invoiceStore.getters
  const { items: paymentTypes, isLoading: paymentsLoading } = walletStore.getters
  const { items: categoryItems, isLoading: categoriesLoading } = categoriesStore.getters

  /* ── tela atual: 'categories' | 'products' ── */
  const [screen, setScreen]               = useState('categories')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [search, setSearch]               = useState('')

  /* ── carrinho: { key: { product, quantity, subProducts, extraPrice } } ── */
  const [cart, setCart] = useState({})

  /* ── modal de customização ── */
  const [custModal, setCustModal]         = useState({ visible: false, product: null })
  const [custGroups, setCustGroups]       = useState([])
  const [custGroupProds, setCustGroupProds] = useState({})
  const [custLoading, setCustLoading]     = useState(false)

  /* ── checkout ── */
  const [checkoutVisible, setCheckoutVisible] = useState(false)
  const [step, setStep]                       = useState('cart')
  const [processingMsg, setProcessingMsg]     = useState('')

  /* ── múltiplos pagamentos ── */
  // payments: [{ id, paymentType: walletObj, amount: string }]
  const [payments, setPayments]               = useState([])
  const [newPaymentType, setNewPaymentType]   = useState(null)
  const [newPaymentAmount, setNewPaymentAmount] = useState('')

  /* ── carregar categorias, produtos e pagamentos ── */
  useFocusEffect(
    useCallback(() => {
      if (!currentCompany?.id) return
      categoriesStore.actions.getItems({ company: currentCompany.id })
      walletStore.actions.getItems({ company: currentCompany.id })
      // carrega todos os produtos para a tela de categorias mostrar totais
      productsStore.actions.getItems({
        active: 1,
        'order[product]': 'ASC',
        company: currentCompany.id,
        itemsPerPage: 1, // só precisamos do totalItems
      })
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
        setPayments([])
        setNewPaymentType(null)
        setNewPaymentAmount('')
      }
    }, []),
  )

  /* ── ao selecionar categoria: carrega produtos filtrados ── */
  const handleSelectCategory = useCallback((cat) => {
    setSelectedCategory(cat)
    setScreen('products')
    setSearch('')
    const params = {
      active: 1,
      'order[product]': 'ASC',
      company: currentCompany.id,
      itemsPerPage: 50,
    }
    if (cat) {
      params['productCategory.category'] = cat['@id']
    } else {
      // sem filtro de categoria = todos
    }
    productsStore.actions.getItems(params)
  }, [currentCompany?.id])

  /* ── produtos filtrados por busca local ── */
  const filteredProducts = useMemo(() => {
    let list = allProducts || []
    if (search.trim()) {
      const q = normalizeStr(search.trim())
      list = list.filter(p =>
        normalizeStr(p.product).includes(q) ||
        normalizeStr(p.description || '').includes(q) ||
        normalizeStr(p.sku || '').includes(q),
      )
    }
    return list
  }, [allProducts, search])

  /* ── totais do carrinho ── */
  const cartItems = useMemo(() => Object.values(cart).filter(i => i.quantity > 0), [cart])
  const cartCount = useMemo(() => cartItems.reduce((s, i) => s + i.quantity, 0), [cartItems])
  const cartTotal = useMemo(() => cartItems.reduce((s, i) => s + calcCartItemTotal(i), 0), [cartItems])

  /* ── totais do pagamento ── */
  const paymentsTotal = useMemo(
    () => payments.reduce((s, p) => s + toFloat(p.amount), 0),
    [payments],
  )
  const remaining = useMemo(() => Math.max(0, cartTotal - paymentsTotal), [cartTotal, paymentsTotal])
  const troco     = useMemo(() => Math.max(0, paymentsTotal - cartTotal), [cartTotal, paymentsTotal])

  /* ── quantidade de um produto no carrinho ── */
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
    const key = `custom_${product.id}_${Date.now()}`
    setCart(prev => ({
      ...prev,
      [key]: { product, quantity: 1, subProducts, extraPrice },
    }))
    setCustModal({ visible: false, product: null })
  }, [custModal.product])

  /* ── remover/adicionar item do carrinho ── */
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
    setPayments([])
    setNewPaymentType(null)
    setNewPaymentAmount(cartTotal.toFixed(2).replace('.', ','))
    setStep('cart')
    setCheckoutVisible(true)
  }

  /* ── adicionar forma de pagamento ── */
  const addPayment = () => {
    if (!newPaymentType) return
    const amt = toFloat(newPaymentAmount)
    if (amt <= 0) return
    setPayments(prev => [
      ...prev,
      { id: Date.now(), paymentType: newPaymentType, amount: newPaymentAmount },
    ])
    setNewPaymentType(null)
    // sugere o restante como próximo valor
    const nextRemaining = Math.max(0, cartTotal - paymentsTotal - amt)
    setNewPaymentAmount(nextRemaining > 0 ? nextRemaining.toFixed(2).replace('.', ',') : '')
  }

  const removePayment = (id) => {
    setPayments(prev => prev.filter(p => p.id !== id))
  }

  /* ── finalizar pedido ── */
  const handleFinalize = useCallback(async () => {
    if (payments.length === 0 || paymentsTotal < cartTotal) return
    setStep('processing')
    setProcessingMsg('Criando pedido...')
    try {
      const status = defaultCompany?.configs?.['pos-default-status']
      const order = await ordersStore.actions.save({
        app: 'POS',
        provider: '/people/' + currentCompany.id,
        status: status ? '/statuses/' + status : undefined,
        orderType: 'sale',
      })

      setProcessingMsg('Adicionando produtos...')
      const simpleMap = {}
      for (const item of cartItems) {
        if (item.subProducts && item.subProducts.length > 0) {
          const payload = {
            product: item.product['@id'],
            quantity: item.quantity,
            order: order['@id'],
            sub_products: item.subProducts.map(sp => ({
              product: sp.productGroupProduct.productChild?.['@id'],
              productGroup: sp.groupId,
              quantity: sp.quantity,
            })),
          }
          await ordersStore.actions.addProducts(order.id, [payload])
        } else {
          const pid = item.product['@id']
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
      const paidStatus = defaultCompany?.configs?.['pos-paid-status']
      for (const payment of payments) {
        await invoiceStore.actions.save({
          dueDate: Formatter.getCurrentDate(),
          status: paidStatus ? '/statuses/' + paidStatus : undefined,
          destinationWallet: payment.paymentType.wallet?.['@id'],
          paymentType: payment.paymentType.paymentType?.['@id'],
          price: toFloat(payment.amount),
          receiver: '/people/' + currentCompany.id,
          order: order['@id'],
        })
      }

      setStep('done')
      setProcessingMsg('')
      setCart({})
    } catch (e) {
      setStep('error')
      setProcessingMsg(e?.message || 'Erro ao finalizar pedido')
    }
  }, [payments, paymentsTotal, cartTotal, cartItems, currentCompany, defaultCompany])

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
                onChangeText={v => { setSearch(v); if (v) { setScreen('products'); handleSelectCategory(null) } }}
                placeholder="Buscar produto..."
                placeholderTextColor={palette.textSecondary}
                style={[styles.searchText, { color: palette.text }]}
              />
            </View>
          </View>

          <CategoryGrid
            categories={categoryItems || []}
            categoriesLoading={categoriesLoading}
            totalProductCount={productsTotalItems || (allProducts || []).length}
            onSelect={handleSelectCategory}
            palette={palette}
            styles={styles}
          />
        </View>
      )}

      {/* ── tela de produtos ── */}
      {(screen === 'products' || !!search) && (
        <View style={{ flex: 1 }}>
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
                <ScrollView style={styles.paymentScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                  {/* formas adicionadas */}
                  {payments.map(p => (
                    <View key={p.id} style={[styles.paymentAdded, { borderBottomColor: palette.border }]}>
                      <MaterialCommunityIcons name="check-circle" size={18} color={palette.success || '#22C55E'} />
                      <Text style={[styles.paymentAddedName, { color: palette.text }]}>
                        {p.paymentType?.paymentType?.paymentType}
                      </Text>
                      <Text style={[styles.paymentAddedAmount, { color: palette.primary }]}>
                        {Formatter.formatMoney(toFloat(p.amount))}
                      </Text>
                      <TouchableOpacity onPress={() => removePayment(p.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <MaterialCommunityIcons name="close-circle" size={18} color={palette.danger || '#EF4444'} />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {/* seletor de nova forma */}
                  <View style={[styles.addPaymentBlock, { borderColor: palette.border }]}>
                    <Text style={[styles.addPaymentTitle, { color: palette.textSecondary }]}>
                      {payments.length === 0 ? 'Selecione a forma de pagamento' : 'Adicionar outra forma'}
                    </Text>

                    {paymentsLoading ? (
                      <ActivityIndicator color={palette.primary} style={{ marginVertical: 12 }} />
                    ) : (
                      (paymentTypes || []).map(pt => {
                        const sel = newPaymentType?.paymentType?.id === pt.paymentType?.id
                        return (
                          <TouchableOpacity
                            key={pt.paymentType?.id}
                            onPress={() => setNewPaymentType(pt)}
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
                      })
                    )}

                    {/* valor */}
                    {newPaymentType && (
                      <View style={styles.paymentAmountRow}>
                        <Text style={[styles.paymentAmountLabel, { color: palette.textSecondary }]}>Valor</Text>
                        <TextInput
                          value={newPaymentAmount}
                          onChangeText={setNewPaymentAmount}
                          keyboardType="decimal-pad"
                          style={[styles.amountInput, { borderColor: palette.primary, color: palette.text }]}
                          selectTextOnFocus
                          autoFocus
                        />
                        <TouchableOpacity
                          onPress={addPayment}
                          style={[styles.addPaymentBtn, { backgroundColor: palette.primary }]}
                          activeOpacity={0.85}
                        >
                          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                          <Text style={styles.addPaymentBtnText}>Adicionar</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </ScrollView>

                {/* resumo de valores */}
                <View style={[styles.paymentTotals, { borderTopColor: palette.border }]}>
                  <View style={styles.paymentTotalRow}>
                    <Text style={[styles.paymentTotalLabel, { color: palette.textSecondary }]}>Total do pedido</Text>
                    <Text style={[styles.paymentTotalValue, { color: palette.text }]}>{Formatter.formatMoney(cartTotal)}</Text>
                  </View>
                  <View style={styles.paymentTotalRow}>
                    <Text style={[styles.paymentTotalLabel, { color: palette.textSecondary }]}>Total informado</Text>
                    <Text style={[styles.paymentTotalValue, { color: paymentsTotal >= cartTotal ? (palette.success || '#22C55E') : palette.text }]}>
                      {Formatter.formatMoney(paymentsTotal)}
                    </Text>
                  </View>
                  {remaining > 0 && (
                    <View style={styles.paymentTotalRow}>
                      <Text style={[styles.paymentTotalLabel, { color: palette.danger || '#EF4444' }]}>Falta</Text>
                      <Text style={[styles.paymentTotalValue, { color: palette.danger || '#EF4444', fontWeight: '900' }]}>
                        {Formatter.formatMoney(remaining)}
                      </Text>
                    </View>
                  )}
                  {troco > 0 && (
                    <View style={[styles.paymentTotalRow, styles.trocoRow, { backgroundColor: withOpacity(palette.success || '#22C55E', 0.1), borderRadius: 10 }]}>
                      <Text style={[styles.paymentTotalLabel, { color: palette.success || '#22C55E', fontWeight: '800' }]}>Troco</Text>
                      <Text style={[styles.paymentTotalValue, { color: palette.success || '#22C55E', fontWeight: '900', fontSize: 20 }]}>
                        {Formatter.formatMoney(troco)}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.cartActions}>
                  <TouchableOpacity onPress={() => setStep('cart')} style={[styles.btnSecondary, { borderColor: palette.border }]}>
                    <Text style={[styles.btnSecondaryText, { color: palette.textSecondary }]}>Voltar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleFinalize}
                    disabled={payments.length === 0 || paymentsTotal < cartTotal || orderSaving || invoiceSaving}
                    style={[styles.btnPrimary, { backgroundColor: (payments.length > 0 && paymentsTotal >= cartTotal) ? palette.primary : palette.border }]}
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
                {troco > 0 && (
                  <View style={[styles.trocoRow, { backgroundColor: withOpacity(palette.success || '#22C55E', 0.1), borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 }]}>
                    <Text style={{ color: palette.success || '#22C55E', fontWeight: '800', fontSize: 16 }}>
                      Troco: {Formatter.formatMoney(troco)}
                    </Text>
                  </View>
                )}
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

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
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

  cartList: { maxHeight: 300 },
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

  cartSummary: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  cartTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cartTotalLabel: { fontSize: 14, fontWeight: '600' },
  cartTotalValue: { fontSize: 22, fontWeight: '900' },

  /* pagamento */
  paymentScroll: { maxHeight: 380, paddingHorizontal: 12, paddingTop: 4 },

  paymentAdded: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  paymentAddedName: { flex: 1, fontSize: 14, fontWeight: '700' },
  paymentAddedAmount: { fontSize: 15, fontWeight: '800' },

  addPaymentBlock: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    marginBottom: 6,
  },
  addPaymentTitle: { fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },

  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
  },
  paymentName: { fontSize: 15, fontWeight: '700', flex: 1 },

  paymentAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  paymentAmountLabel: { fontSize: 13, fontWeight: '600' },
  amountInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  addPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addPaymentBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  paymentTotals: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  paymentTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  paymentTotalLabel: { fontSize: 13, fontWeight: '600' },
  paymentTotalValue: { fontSize: 15, fontWeight: '800' },
  trocoRow: { paddingHorizontal: 12, paddingVertical: 6 },

  cartActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  btnPrimary: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  btnSecondary: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  btnSecondaryText: { fontWeight: '700', fontSize: 15 },

  feedbackWrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, gap: 8 },
  feedbackTitle: { fontSize: 22, fontWeight: '900', marginTop: 12 },
  feedbackText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
})
