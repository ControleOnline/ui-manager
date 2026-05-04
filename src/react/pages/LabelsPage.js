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
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import { resolveThemePalette, withOpacity } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import { PRINT_JOB_TYPE_PRODUCT_LABEL } from '@controleonline/ui-common/src/react/print/jobs';
import PrintButton from '@controleonline/ui-orders/src/react/components/PrintButton';
import styles from './LabelsPage.styles';

const PRODUCT_TYPES = ['product', 'manufactured', 'custom', 'feedstock', 'package', 'component'];
const DATE_MASK_RE = /^\d{2}\/\d{2}\/\d{4}$/;

const TEMPLATE = {
  key: 'product-handling-expiration',
  label: 'Produto, manejo e validade',
};

const getProductName = product =>
  String(product?.product || product?.name || product?.description || '').trim();

const getProductDisplayName = product =>
  getProductName(product) || (product?.id ? `Produto #${product.id}` : '');

const maskDateInput = value => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const formatLabelDate = value => {
  const text = String(value || '').trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  return text;
};

const buildLabelText = ({ product, handlingDate, expirationDate, freeText }) => {
  const productName = getProductDisplayName(product) || 'Nome do produto';
  const formattedHandling = formatLabelDate(handlingDate) || 'dd/mm/aaaa';
  const formattedExpiration = formatLabelDate(expirationDate) || 'dd/mm/aaaa';
  const lines = [
    productName.toUpperCase(),
    `MANEJO: ${formattedHandling}`,
    `VALIDADE: ${formattedExpiration}`,
  ];
  const normalizedFreeText = String(freeText || '').trim();

  if (normalizedFreeText) {
    lines.push('', normalizedFreeText);
  }

  return lines.join('\n');
};

export default function LabelsPage() {
  const { width } = useWindowDimensions();
  const isCompact = width < 520;

  const themeStore = useStore('theme');
  const peopleStore = useStore('people');
  const productsStore = useStore('products');

  const { colors: themeColors } = themeStore.getters;
  const { currentCompany } = peopleStore.getters;

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
        colors,
      ),
    [themeColors, currentCompany?.id],
  );

  const [productQuery, setProductQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productResults, setProductResults] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [handlingDate, setHandlingDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [freeText, setFreeText] = useState('');
  const [printFeedback, setPrintFeedback] = useState(null);
  const searchRef = useRef(0);

  const generatedText = useMemo(
    () =>
      buildLabelText({
        product: selectedProduct,
        handlingDate,
        expirationDate,
        freeText,
      }),
    [expirationDate, freeText, handlingDate, selectedProduct],
  );

  const searchProducts = useCallback(
    async text => {
      const query = String(text || '').trim();
      const companyId = currentCompany?.id;

      if (!companyId || query.length < 2) {
        setProductResults([]);
        setSearchingProducts(false);
        return;
      }

      const requestId = ++searchRef.current;
      setSearchingProducts(true);

      try {
        const products = await productsStore.actions
          .getItems({
            product: query,
            company: companyId,
            people: `/people/${companyId}`,
            active: 1,
            type: PRODUCT_TYPES,
            'order[product]': 'ASC',
            itemsPerPage: 8,
          })
          .catch(() => []);

        if (requestId !== searchRef.current) return;
        setProductResults(Array.isArray(products) ? products.slice(0, 8) : []);
      } finally {
        if (requestId === searchRef.current) {
          setSearchingProducts(false);
        }
      }
    },
    [currentCompany?.id, productsStore.actions],
  );

  useEffect(() => {
    const selectedName = getProductDisplayName(selectedProduct);

    if (selectedProduct && productQuery === selectedName) {
      setProductResults([]);
      return undefined;
    }

    const timer = setTimeout(() => {
      searchProducts(productQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [productQuery, searchProducts, selectedProduct]);

  const handleProductQueryChange = text => {
    setProductQuery(text);

    if (selectedProduct && text !== getProductDisplayName(selectedProduct)) {
      setSelectedProduct(null);
    }
  };

  const selectProduct = product => {
    setSelectedProduct(product);
    setProductQuery(getProductDisplayName(product));
    setProductResults([]);
  };

  const clearProduct = () => {
    setSelectedProduct(null);
    setProductQuery('');
    setProductResults([]);
  };

  const clearForm = () => {
    clearProduct();
    setHandlingDate('');
    setExpirationDate('');
    setFreeText('');
  };

  const formattedHandling = formatLabelDate(handlingDate);
  const formattedExpiration = formatLabelDate(expirationDate);
  const labelReady =
    !!selectedProduct &&
    DATE_MASK_RE.test(formattedHandling) &&
    DATE_MASK_RE.test(formattedExpiration);
  const primaryColor = brandColors.primary || '#2563EB';
  const finalLabelText = String(generatedText || '').trim();
  const canPrint = labelReady && finalLabelText !== '';
  const printJob = useMemo(
    () => ({
      type: PRINT_JOB_TYPE_PRODUCT_LABEL,
      id: selectedProduct?.id || selectedProduct?.['@id'] || '',
      productId: selectedProduct?.id || selectedProduct?.['@id'] || '',
      productName: getProductDisplayName(selectedProduct),
      handlingDate: formattedHandling,
      expirationDate: formattedExpiration,
      freeText,
      labelText: finalLabelText,
    }),
    [
      finalLabelText,
      formattedExpiration,
      formattedHandling,
      freeText,
      selectedProduct,
    ],
  );

  const showPrintFeedback = (ok, message) => {
    setPrintFeedback({ ok, message });
    setTimeout(() => setPrintFeedback(null), 4000);
  };

  const handlePrintSuccess = completedRequest => {
    const targetDeviceId = String(completedRequest?.targetDeviceId || '').trim();
    showPrintFeedback(
      true,
      targetDeviceId
        ? `Etiqueta enviada para ${targetDeviceId}`
        : 'Etiqueta enviada para impressao.',
    );
  };

  const handlePrintError = completedRequest => {
    showPrintFeedback(
      false,
      completedRequest?.error || 'Erro ao imprimir etiqueta.',
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: brandColors.background || '#F8FAFC' }]} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          isCompact && styles.scrollContentCompact,
        ]}
      >
        <View style={styles.shell}>
          <View style={[styles.panel, styles.formPanel, isCompact && styles.panelCompact]}>
            <Text style={styles.panelTitle}>Etiquetas</Text>

            <View style={styles.templateCard}>
              <View style={styles.templateIcon}>
                <Icon name="tag" size={20} color={primaryColor} />
              </View>
              <View style={styles.templateText}>
                <Text style={styles.templateTitle}>{TEMPLATE.label}</Text>
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Produto</Text>
              <View style={styles.inputWrap}>
                <Icon name="search" size={17} color="#94A3B8" />
                <TextInput
                  style={styles.input}
                  value={productQuery}
                  onChangeText={handleProductQueryChange}
                  placeholder="Buscar produto..."
                  placeholderTextColor="#94A3B8"
                />
                {searchingProducts ? <ActivityIndicator size="small" color="#94A3B8" /> : null}
              </View>

              {selectedProduct ? (
                <View style={styles.selectedProduct}>
                  <Icon name="check-circle" size={16} color="#16A34A" />
                  <Text style={styles.selectedProductText} numberOfLines={1}>
                    {getProductDisplayName(selectedProduct)}
                  </Text>
                  <TouchableOpacity onPress={clearProduct} hitSlop={8}>
                    <Icon name="x" size={17} color="#166534" />
                  </TouchableOpacity>
                </View>
              ) : null}

              {!selectedProduct && productResults.length > 0 ? (
                <View style={styles.resultList}>
                  {productResults.map(product => (
                    <TouchableOpacity
                      key={String(product.id || product['@id'])}
                      style={styles.resultItem}
                      activeOpacity={0.75}
                      onPress={() => selectProduct(product)}
                    >
                      <Icon name="package" size={16} color={primaryColor} />
                      <View style={styles.resultTextBlock}>
                        <Text style={styles.resultName} numberOfLines={1}>
                          {getProductDisplayName(product)}
                        </Text>
                        <Text style={styles.resultMeta} numberOfLines={1}>
                          {product.sku ? `SKU ${product.sku}` : product.type || 'Produto'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {!selectedProduct &&
              !searchingProducts &&
              productQuery.trim().length >= 2 &&
              productResults.length === 0 ? (
                <View style={styles.emptyResult}>
                  <Text style={styles.emptyResultText}>Nenhum produto encontrado.</Text>
                </View>
              ) : null}
            </View>

            <View style={[styles.dateRow, isCompact && styles.dateRowCompact]}>
              <View style={[styles.fieldBlock, styles.dateField]}>
                <Text style={styles.fieldLabel}>Data de manejo</Text>
                <View style={styles.inputWrap}>
                  <Icon name="calendar" size={17} color="#94A3B8" />
                  <TextInput
                    style={styles.input}
                    value={handlingDate}
                    onChangeText={value => setHandlingDate(maskDateInput(value))}
                    placeholder="dd/mm/aaaa"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
              </View>

              <View style={[styles.fieldBlock, styles.dateField]}>
                <Text style={styles.fieldLabel}>Data de validade</Text>
                <View style={styles.inputWrap}>
                  <Icon name="calendar" size={17} color="#94A3B8" />
                  <TextInput
                    style={styles.input}
                    value={expirationDate}
                    onChangeText={value => setExpirationDate(maskDateInput(value))}
                    placeholder="dd/mm/aaaa"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Texto livre</Text>
              <TextInput
                style={styles.textArea}
                value={freeText}
                onChangeText={setFreeText}
                placeholder="Ex.: aberto em 04/05, lote, observacoes..."
                placeholderTextColor="#94A3B8"
                multiline
              />
            </View>

            <View style={[styles.actionRow, isCompact && styles.actionRowCompact]}>
              <PrintButton
                job={printJob}
                store="print"
                disabled={!canPrint}
                iconColor="#FFFFFF"
                label="Imprimir etiqueta"
                printerSelection={{ enabled: true }}
                onSuccess={handlePrintSuccess}
                onError={handlePrintError}
                style={[styles.printButtonWrap, isCompact && styles.fullWidthButton]}
                layout={{
                  mainButtonStyle: [
                    styles.printButton,
                    {
                      backgroundColor: canPrint
                        ? primaryColor
                        : withOpacity(primaryColor, 0.45),
                    },
                  ],
                  selectButtonStyle: [
                    styles.printSelectButton,
                    {
                      backgroundColor: canPrint
                        ? withOpacity(primaryColor, 0.9)
                        : withOpacity(primaryColor, 0.35),
                    },
                  ],
                }}
                textStyle={styles.printButtonText}
              />
              <TouchableOpacity
                style={[styles.secondaryButton, isCompact && styles.fullWidthButton]}
                activeOpacity={0.85}
                onPress={clearForm}
              >
                <Icon name="trash-2" size={16} color="#64748B" />
                <Text style={[styles.buttonText, { color: '#475569' }]}>Limpar</Text>
              </TouchableOpacity>
            </View>
            {!!printFeedback && (
              <View
                style={[
                  styles.printFeedback,
                  printFeedback.ok
                    ? styles.printFeedbackOk
                    : styles.printFeedbackError,
                ]}
              >
                <Icon
                  name={printFeedback.ok ? 'check-circle' : 'alert-circle'}
                  size={16}
                  color={printFeedback.ok ? '#16A34A' : '#DC2626'}
                />
                <Text
                  style={[
                    styles.printFeedbackText,
                    { color: printFeedback.ok ? '#166534' : '#B91C1C' },
                  ]}
                >
                  {printFeedback.message}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
