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
import styles from './LabelsPage.styles';

const PRODUCT_TYPES = ['product', 'manufactured', 'custom', 'feedstock', 'package', 'component'];

const TEMPLATE = {
  key: 'product-expiration',
  label: 'Nome do produto + validade',
  description: 'Modelo inicial para selecionar um produto, informar vencimento e incluir texto livre.',
};

const getProductName = product =>
  String(product?.product || product?.name || product?.description || '').trim();

const getProductDisplayName = product =>
  getProductName(product) || (product?.id ? `Produto #${product.id}` : '');

const formatExpirationDate = value => {
  const text = String(value || '').trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  return text;
};

const buildLabelText = ({ product, expirationDate, freeText }) => {
  const productName = getProductDisplayName(product) || 'Nome do produto';
  const formattedExpiration = formatExpirationDate(expirationDate) || 'dd/mm/aaaa';
  const lines = [
    productName.toUpperCase(),
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
  const isWide = width >= 900;

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
  const [expirationDate, setExpirationDate] = useState('');
  const [freeText, setFreeText] = useState('');
  const [labelText, setLabelText] = useState('');
  const searchRef = useRef(0);
  const lastGeneratedTextRef = useRef('');

  const generatedText = useMemo(
    () =>
      buildLabelText({
        product: selectedProduct,
        expirationDate,
        freeText,
      }),
    [expirationDate, freeText, selectedProduct],
  );

  useEffect(() => {
    const previousGeneratedText = lastGeneratedTextRef.current;

    setLabelText(currentText =>
      !currentText || currentText === previousGeneratedText
        ? generatedText
        : currentText,
    );
    lastGeneratedTextRef.current = generatedText;
  }, [generatedText]);

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
    setExpirationDate('');
    setFreeText('');
    setLabelText('');
    lastGeneratedTextRef.current = '';
  };

  const useModelText = () => {
    setLabelText(generatedText);
    lastGeneratedTextRef.current = generatedText;
  };

  const formattedExpiration = formatExpirationDate(expirationDate);
  const previewReady = !!selectedProduct && !!formattedExpiration;
  const primaryColor = brandColors.primary || '#2563EB';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: brandColors.background || '#F8FAFC' }]} edges={['bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.shell, isWide && styles.shellWide]}>
          <View style={[styles.panel, styles.formPanel]}>
            <Text style={styles.panelTitle}>Etiquetas</Text>

            <View style={styles.templateCard}>
              <View style={styles.templateIcon}>
                <Icon name="tag" size={20} color={primaryColor} />
              </View>
              <View style={styles.templateText}>
                <Text style={styles.templateTitle}>{TEMPLATE.label}</Text>
                <Text style={styles.templateDescription}>{TEMPLATE.description}</Text>
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

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Data de vencimento</Text>
              <View style={styles.inputWrap}>
                <Icon name="calendar" size={17} color="#94A3B8" />
                <TextInput
                  style={styles.input}
                  value={expirationDate}
                  onChangeText={setExpirationDate}
                  placeholder="dd/mm/aaaa"
                  placeholderTextColor="#94A3B8"
                />
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

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: primaryColor }]}
                activeOpacity={0.85}
                onPress={useModelText}
              >
                <Icon name="refresh-cw" size={16} color="#FFFFFF" />
                <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Recriar pelo modelo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85} onPress={clearForm}>
                <Icon name="trash-2" size={16} color="#64748B" />
                <Text style={[styles.buttonText, { color: '#475569' }]}>Limpar</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.panel, styles.previewPanel]}>
            <Text style={styles.panelTitle}>Previa</Text>

            <View style={styles.previewWrap}>
              <View style={[styles.labelPreview, !previewReady && styles.labelPreviewMuted]}>
                <Text style={styles.labelProduct} numberOfLines={3}>
                  {(getProductDisplayName(selectedProduct) || 'Nome do produto').toUpperCase()}
                </Text>
                <Text style={styles.labelDate}>
                  VALIDADE: {formattedExpiration || 'dd/mm/aaaa'}
                </Text>
                {freeText.trim() ? (
                  <Text style={styles.labelFreeText} numberOfLines={4}>
                    {freeText.trim()}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Texto final da etiqueta</Text>
              <TextInput
                style={[styles.textArea, styles.labelTextInput, { borderColor: withOpacity(primaryColor, 0.35) }]}
                value={labelText}
                onChangeText={setLabelText}
                placeholder="Texto da etiqueta"
                placeholderTextColor="#94A3B8"
                multiline
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
