import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
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

const normalizeStr = v => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

/* ─── componente de produto no grid ─────────────────────────────────── */

const ProductCard = ({ product, quantity, onAdd, onRemove, palette }) => {
  const coverUrl = buildCoverUrl(product.productFiles, product?.extraData?.imageCoverRelationId)

  return (
    <View style={[cardStyles.card, { borderColor: quantity > 0 ? palette.primary : palette.border }]}>
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={cardStyles.image} resizeMode="cover" />
      ) : (
        <View style={[cardStyles.image, cardStyles.imagePlaceholder]}>
          <MaterialCommunityIcons name="food" size={28} color={palette.textSecondary} />
        </View>
      )}

      <View style={cardStyles.info}>
        <Text style={[cardStyles.name, { color: palette.text }]} numberOfLines={2}>
          {product.product}
        </Text>
        <Text style={[cardStyles.price, { color: palette.primary }]}>
          {Formatter.formatMoney(product.price)}
        </Text>
      </View>

      <View style={[cardStyles.qtyRow, { borderTopColor: palette.border }]}>
        {quantity > 0 ? (
          <>
            <TouchableOpacity
              onPress={onRemove}
              style={[cardStyles.qtyBtn, { backgroundColor: withOpacity(palette.danger || '#EF4444', 0.12) }]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <MaterialCommunityIcons
                name={quantity === 1 ? 'delete-outline' : 'minus'}
                size={18}
                color={palette.danger || '#EF4444'}
              />
            </TouchableOpacity>

            <View style={[cardStyles.qtyBadge, { backgroundColor: palette.primary }]}>
              <Text style={cardStyles.qtyBadgeText}>{quantity}</Text>
            </View>

            <TouchableOpacity
              onPress={onAdd}
              style={[cardStyles.qtyBtn, { backgroundColor: withOpacity(palette.primary, 0.12) }]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <MaterialCommunityIcons name="plus" size={18} color={palette.primary} />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={onAdd}
            style={[cardStyles.addBtn, { backgroundColor: palette.primary }]}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="plus" size={16} color="#fff" />
            <Text style={cardStyles.addBtnText}>Adicionar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const cardStyles = StyleSheet.create({
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
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  info: { padding: 10, flex: 1 },
  name: { fontSize: 13, fontWeight: '700', lineHeight: 17, marginBottom: 4 },
  price: { fontSize: 15, fontWeight: '800' },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  qtyBtn: { borderRadius: 8, padding: 6 },
  qtyBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  qtyBadgeText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
})

/* ─── componente principal ──────────────────────────────────────────── */

export default function PdvPage({ navigation }) {
  const productsStore   = useStore('products')
  const ordersStore     = useStore('orders')
  const invoiceStore    = useStore('invoice')
  const peopleStore     = useStore('people')
  const walletStore     = useStore('walletPaymentType')
  const themeStore      = useStore('theme')

  const palette = useMemo(() => resolveThemePalette(themeStore?.getters?.colors), [themeStore?.getters?.colors])

  const { currentCompany, defaultCompany } = peopleStore.getters
  const { items: allProducts, isLoading: productsLoading } = productsStore.getters
  const { isSaving: orderSaving } = ordersStore.getters
  const { isSaving: invoiceSaving } = invoiceStore.getters
  const { items: paymentTypes, isLoading: paymentsLoading } = walletStore.getters

  /* ── estado local do carrinho ── */
  const [cart, setCart]               = useState({})     // { productId: { product, quantity } }
  const [search, setSearch]           = useState('')
  const [activeCategory, setCategory] = useState(null)

  /* ── modal de checkout ── */
  const [checkoutVisible, setCheckoutVisible] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [customAmount, setCustomAmount]       = useState('')
  const [step, setStep]                       = useState('cart')  // 'cart' | 'payment' | 'done'
  const [processingMsg, setProcessingMsg]     = useState('')

  /* ── carregar produtos e formas de pagamento ── */
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

  /* ── resetar carrinho ao sair ── */
  useFocusEffect(
    useCallback(() => {
      return () => {
        setCart({})
        setSearch('')
        setCategory(null)
        setCheckoutVisible(false)
        setStep('cart')
      }
    }, []),
  )

  /* ── categorias únicas dos produtos ── */
  const categories = useMemo(() => {
    const cats = new Map()
    ;(allProducts || []).forEach(p => {
      const cat = p.category || p.productCategory || null
      if (cat && cat.id && !cats.has(cat.id)) {
        cats.set(cat.id, cat)
      }
    })
    return Array.from(cats.values())
  }, [allProducts])

  /* ── produtos filtrados ── */
  const filteredProducts = useMemo(() => {
    let list = allProducts || []
    if (activeCategory) {
      list = list.filter(p => {
        const cat = p.category || p.productCategory
        return cat?.id === activeCategory
      })
    }
    if (search.trim()) {
      const q = normalizeStr(search.trim())
      list = list.filter(p =>
        normalizeStr(p.product).includes(q) ||
        normalizeStr(p.description || '').includes(q) ||
        normalizeStr(p.sku || '').includes(q)
      )
    }
    return list
  }, [allProducts, activeCategory, search])

  /* ── totais do carrinho ── */
  const cartItems     = useMemo(() => Object.values(cart).filter(i => i.quantity > 0), [cart])
  const cartCount     = useMemo(() => cartItems.reduce((s, i) => s + i.quantity, 0), [cartItems])
  const cartTotal     = useMemo(() => cartItems.reduce((s, i) => s + i.product.price * i.quantity, 0), [cartItems])

  /* ── ações do carrinho ── */
  const addToCart = useCallback((product) => {
    setCart(prev => {
      const key = String(product.id)
      const cur = prev[key]?.quantity || 0
      return { ...prev, [key]: { product, quantity: cur + 1 } }
    })
  }, [])

  const removeFromCart = useCallback((product) => {
    setCart(prev => {
      const key = String(product.id)
      const cur = prev[key]?.quantity || 0
      if (cur <= 1) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: { product, quantity: cur - 1 } }
    })
  }, [])

  const clearCart = useCallback(() => setCart({}), [])

  /* ── abrir checkout ── */
  const openCheckout = () => {
    if (cartCount === 0) return
    setCustomAmount(Formatter.formatMoney(cartTotal).replace('R$', '').trim())
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
      const products = cartItems.map(i => ({
        product: i.product['@id'].replace(/\D/g, ''),
        quantity: i.quantity,
      }))
      await ordersStore.actions.addProducts(order.id, products)

      setProcessingMsg('Registrando pagamento...')
      const total = parseFloat(String(customAmount).replace(',', '.')) || cartTotal
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
      clearCart()
    } catch (e) {
      setStep('error')
      setProcessingMsg(e?.message || 'Erro ao finalizar pedido')
    }
  }, [selectedPayment, cartItems, customAmount, cartTotal, currentCompany, defaultCompany])

  const styles = useMemo(() => createStyles(palette), [palette])

  /* ── renderização ── */
  const renderProduct = useCallback(({ item }) => (
    <ProductCard
      product={item}
      quantity={cart[String(item.id)]?.quantity || 0}
      onAdd={() => addToCart(item)}
      onRemove={() => removeFromCart(item)}
      palette={palette}
    />
  ), [cart, palette, addToCart, removeFromCart])

  return (
    <SafeAreaView style={styles.root}>

      {/* ── barra de busca ── */}
      <View style={styles.searchBar}>
        <View style={styles.searchInput}>
          <MaterialCommunityIcons name="magnify" size={20} color={palette.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar produto..."
            placeholderTextColor={palette.textSecondary}
            style={[styles.searchText, { color: palette.text }]}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close-circle" size={18} color={palette.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── filtro de categorias ── */}
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          <TouchableOpacity
            onPress={() => setCategory(null)}
            style={[styles.catChip, !activeCategory && styles.catChipActive]}
          >
            <Text style={[styles.catChipText, !activeCategory && styles.catChipTextActive]}>Todos</Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setCategory(activeCategory === cat.id ? null : cat.id)}
              style={[styles.catChip, activeCategory === cat.id && styles.catChipActive]}
            >
              <Text style={[styles.catChipText, activeCategory === cat.id && styles.catChipTextActive]}>
                {cat.category || cat.name || 'Categoria'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── grid de produtos ── */}
      {productsLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>Carregando produtos...</Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="cart-off" size={48} color={palette.border} />
          <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
            {search ? 'Nenhum produto encontrado' : 'Nenhum produto disponivel'}
          </Text>
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

      {/* ── botão flutuante do carrinho ── */}
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

      {/* ── modal de checkout ── */}
      <Modal
        visible={checkoutVisible}
        animationType="slide"
        transparent
        onRequestClose={() => step === 'done' || step === 'error' ? setCheckoutVisible(false) : null}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: palette.modalBg || palette.surface || '#fff' }]}>

            {/* cabeçalho */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: palette.text }]}>
                {step === 'cart' ? 'Carrinho' : step === 'payment' ? 'Pagamento' : step === 'done' ? 'Pedido realizado!' : step === 'processing' ? 'Processando...' : 'Erro'}
              </Text>
              {(step === 'cart' || step === 'payment') && (
                <TouchableOpacity onPress={() => setCheckoutVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialCommunityIcons name="close" size={24} color={palette.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* ── step: carrinho ── */}
            {step === 'cart' && (
              <>
                <ScrollView style={styles.cartList} showsVerticalScrollIndicator={false}>
                  {cartItems.map(item => (
                    <View key={item.product.id} style={[styles.cartItem, { borderBottomColor: palette.border }]}>
                      <View style={styles.cartItemInfo}>
                        <Text style={[styles.cartItemName, { color: palette.text }]} numberOfLines={1}>
                          {item.product.product}
                        </Text>
                        <Text style={[styles.cartItemPrice, { color: palette.textSecondary }]}>
                          {item.quantity} × {Formatter.formatMoney(item.product.price)}
                        </Text>
                      </View>
                      <View style={styles.cartItemQty}>
                        <TouchableOpacity
                          onPress={() => removeFromCart(item.product)}
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
                          onPress={() => addToCart(item.product)}
                          style={[styles.cartQtyBtn, { borderColor: palette.border }]}
                        >
                          <MaterialCommunityIcons name="plus" size={16} color={palette.primary} />
                        </TouchableOpacity>
                      </View>
                      <Text style={[styles.cartItemTotal, { color: palette.primary }]}>
                        {Formatter.formatMoney(item.product.price * item.quantity)}
                      </Text>
                    </View>
                  ))}
                </ScrollView>

                {/* total + edição de valor */}
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
                  <TouchableOpacity
                    onPress={clearCart}
                    style={[styles.btnSecondary, { borderColor: palette.border }]}
                  >
                    <Text style={[styles.btnSecondaryText, { color: palette.textSecondary }]}>Limpar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setStep('payment')}
                    style={[styles.btnPrimary, { backgroundColor: palette.primary }]}
                  >
                    <Text style={styles.btnPrimaryText}>Ir para pagamento</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ── step: pagamento ── */}
            {step === 'payment' && (
              <>
                {paymentsLoading ? (
                  <View style={styles.loadingWrap}>
                    <ActivityIndicator color={palette.primary} />
                  </View>
                ) : (
                  <ScrollView style={styles.paymentList} showsVerticalScrollIndicator={false}>
                    {(paymentTypes || []).map(pt => {
                      const isSelected = selectedPayment?.paymentType?.id === pt.paymentType?.id
                      return (
                        <TouchableOpacity
                          key={pt.paymentType?.id}
                          onPress={() => setSelectedPayment(pt)}
                          style={[
                            styles.paymentOption,
                            {
                              borderColor: isSelected ? palette.primary : palette.border,
                              backgroundColor: isSelected ? withOpacity(palette.primary, 0.08) : 'transparent',
                            },
                          ]}
                          activeOpacity={0.8}
                        >
                          <MaterialCommunityIcons
                            name={isSelected ? 'radiobox-marked' : 'radiobox-blank'}
                            size={22}
                            color={isSelected ? palette.primary : palette.textSecondary}
                          />
                          <Text style={[styles.paymentName, { color: isSelected ? palette.primary : palette.text }]}>
                            {pt.paymentType?.paymentType || 'Forma de pagamento'}
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
                  <Text style={[styles.cartTotalLabel, { color: palette.textSecondary }]}>
                    Total a cobrar
                  </Text>
                  <Text style={[styles.cartTotalValue, { color: palette.primary }]}>
                    {customAmount ? `R$ ${customAmount}` : Formatter.formatMoney(cartTotal)}
                  </Text>
                </View>

                <View style={styles.cartActions}>
                  <TouchableOpacity
                    onPress={() => setStep('cart')}
                    style={[styles.btnSecondary, { borderColor: palette.border }]}
                  >
                    <Text style={[styles.btnSecondaryText, { color: palette.textSecondary }]}>Voltar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleFinalize}
                    disabled={!selectedPayment || orderSaving || invoiceSaving}
                    style={[
                      styles.btnPrimary,
                      { backgroundColor: selectedPayment ? palette.primary : palette.border },
                    ]}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.btnPrimaryText}>Finalizar venda</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ── step: processando ── */}
            {step === 'processing' && (
              <View style={styles.feedbackWrap}>
                <ActivityIndicator size="large" color={palette.primary} />
                <Text style={[styles.feedbackText, { color: palette.text }]}>{processingMsg}</Text>
              </View>
            )}

            {/* ── step: concluído ── */}
            {step === 'done' && (
              <View style={styles.feedbackWrap}>
                <MaterialCommunityIcons name="check-circle" size={64} color={palette.success || '#22C55E'} />
                <Text style={[styles.feedbackTitle, { color: palette.text }]}>Venda concluida!</Text>
                <Text style={[styles.feedbackText, { color: palette.textSecondary }]}>
                  Pedido registrado com sucesso.
                </Text>
                <TouchableOpacity
                  onPress={() => setCheckoutVisible(false)}
                  style={[styles.btnPrimary, { backgroundColor: palette.primary, marginTop: 24, minWidth: 160 }]}
                >
                  <Text style={styles.btnPrimaryText}>Nova venda</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── step: erro ── */}
            {step === 'error' && (
              <View style={styles.feedbackWrap}>
                <MaterialCommunityIcons name="alert-circle" size={64} color={palette.danger || '#EF4444'} />
                <Text style={[styles.feedbackTitle, { color: palette.text }]}>Erro ao finalizar</Text>
                <Text style={[styles.feedbackText, { color: palette.textSecondary }]}>{processingMsg}</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                  <TouchableOpacity
                    onPress={() => setCheckoutVisible(false)}
                    style={[styles.btnSecondary, { borderColor: palette.border }]}
                  >
                    <Text style={[styles.btnSecondaryText, { color: palette.textSecondary }]}>Fechar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setStep('payment')}
                    style={[styles.btnPrimary, { backgroundColor: palette.primary }]}
                  >
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

/* ─── estilos ───────────────────────────────────────────────────────── */

const createStyles = palette => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.background || '#F8FAFC',
  },

  /* search */
  searchBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  searchText: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },

  /* categorias */
  catRow: {
    paddingHorizontal: 8,
    paddingBottom: 10,
    gap: 6,
    flexDirection: 'row',
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: palette.border || '#E2E8F0',
    backgroundColor: palette.surface || '#fff',
    marginHorizontal: 4,
  },
  catChipActive: {
    borderColor: palette.primary,
    backgroundColor: withOpacity(palette.primary, 0.1),
  },
  catChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.textSecondary,
  },
  catChipTextActive: {
    color: palette.primary,
  },

  /* grid */
  grid: {
    paddingHorizontal: 6,
    paddingBottom: 100,
  },

  /* loading / empty */
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 32,
  },
  loadingText: { fontSize: 14 },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 32,
  },
  emptyText: { fontSize: 14, textAlign: 'center' },

  /* FAB carrinho */
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

  /* modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
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
    borderBottomColor: palette.border || '#E2E8F0',
  },
  modalTitle: { fontSize: 18, fontWeight: '800' },

  /* carrinho */
  cartList: { maxHeight: 320 },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  cartItemPrice: { fontSize: 12 },
  cartItemQty: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartQtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartQtyNum: { fontSize: 15, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  cartItemTotal: { fontSize: 14, fontWeight: '800', minWidth: 70, textAlign: 'right' },

  /* resumo */
  cartSummary: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  cartTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cartTotalLabel: { fontSize: 14, fontWeight: '600' },
  cartTotalValue: { fontSize: 22, fontWeight: '900' },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  amountLabel: { fontSize: 13, fontWeight: '600' },
  amountInput: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 120,
    textAlign: 'right',
  },

  /* pagamento */
  paymentList: { maxHeight: 320, paddingHorizontal: 12, paddingTop: 8 },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  paymentName: { fontSize: 15, fontWeight: '700' },
  paymentSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: 1,
  },

  /* botões */
  cartActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  btnPrimary: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  btnSecondary: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  btnSecondaryText: { fontWeight: '700', fontSize: 15 },

  /* feedback */
  feedbackWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 8,
  },
  feedbackTitle: { fontSize: 22, fontWeight: '900', marginTop: 12 },
  feedbackText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
})
