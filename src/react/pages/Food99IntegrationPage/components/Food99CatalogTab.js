import React from 'react';
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import {withOpacity} from '@controleonline/../../src/styles/branding';
import CompactFilterSelector from '@controleonline/ui-default/src/react/components/filters/CompactFilterSelector';

import {
  normalizeMarketplaceCatalogProduct,
  normalizeMarketplaceCatalogTabProps,
} from '../../MarketplaceIntegrationPage/utils';
import MarketplaceProductCard from '../../MarketplaceIntegrationPage/components/MarketplaceProductCard';
import styles from '../styles';
import {
  filterTabs,
  MINIMUM_REQUIRED_ITEMS as DEFAULT_MINIMUM_REQUIRED_ITEMS,
} from '../utils';

// Aba separada para seleção e publicação do catálogo 99Food.
export default function Food99CatalogTab(props) {
  const {
    shadowStyle,
    accentColor,
    providerKey,
    selectionSummaryTone,
    search,
    setSearch,
    filterKey,
    setFilterKey,
    tabCounts,
    productsResponse,
    selectedEligibleProducts,
    previewLoading,
    onPreview,
    filteredProducts,
    selectedProductSet,
    onToggleProduct,
    onMarkCardPressHandled,
    minimumRequiredItems,
  } = normalizeMarketplaceCatalogTabProps(props, {
    providerKey: props?.providerKey || '99food',
    defaultMinimumRequiredItems: DEFAULT_MINIMUM_REQUIRED_ITEMS,
  });

  const normalizedProducts = React.useMemo(
    () =>
      filteredProducts.map(product =>
        normalizeMarketplaceCatalogProduct(product, providerKey),
      ),
    [filteredProducts, providerKey],
  );

  const filterOptions = filterTabs.map(tab => ({
    key: tab.key,
    label: `${tab.label} (${tabCounts[tab.key] || 0})`,
  }));
  const selectedFilterLabel =
    filterOptions.find(option => option.key === filterKey)?.label ||
    filterOptions[0]?.label ||
    'Todos';

  return (
    <View style={[styles.panel, shadowStyle]}>
      <View style={styles.panelHeader}>
        <View>
          <Text style={styles.panelTitle}>Selecao de produtos</Text>
          <Text style={styles.panelSubtitle}>
            Escolha pelo menos {minimumRequiredItems} produtos elegiveis para o
            catalogo.
          </Text>
        </View>
        <View
          style={[
            styles.selectionBadge,
            {backgroundColor: withOpacity(selectionSummaryTone, 0.12)},
          ]}>
          <Text
            style={[styles.selectionBadgeText, {color: selectionSummaryTone}]}>
            {selectedEligibleProducts.length}/{minimumRequiredItems}
          </Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Icon name="search" size={16} color="#94A3B8" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar produto, categoria ou codigo"
          placeholderTextColor="#94A3B8"
          style={styles.searchInput}
        />
      </View>

      <CompactFilterSelector
        icon="filter"
        label={selectedFilterLabel}
        title="Produtos do catalogo"
        accentColor={accentColor}
        active={filterKey !== filterTabs[0]?.key}
        options={filterOptions}
        selectedKey={filterKey}
        onSelect={optionKey => {
          setFilterKey(optionKey);
          return true;
        }}
      />

      <View style={styles.selectionSummaryRow}>
        <Text style={styles.selectionSummaryText}>
          {productsResponse?.eligible_product_count || 0} produtos aptos no
          cadastro atual
        </Text>
        <TouchableOpacity
          style={[
            styles.previewButton,
            {
              backgroundColor:
                selectedEligibleProducts.length >= minimumRequiredItems
                  ? accentColor
                  : '#CBD5E1',
            },
          ]}
          onPress={onPreview}
          disabled={
            previewLoading ||
            selectedEligibleProducts.length < minimumRequiredItems
          }>
          {previewLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Icon name="eye" size={15} color="#FFFFFF" />
              <Text style={styles.previewButtonText}>Pre-visualizar menu</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {normalizedProducts.length > 0 ? (
        <View style={styles.productsList}>
          {normalizedProducts.map(product => (
            <MarketplaceProductCard
              key={product.id}
              product={product}
              accentColor={accentColor}
              selected={selectedProductSet.has(String(product.id))}
              onPress={onToggleProduct}
              onMarkCardPressHandled={onMarkCardPressHandled}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyProducts}>
          <Text style={styles.emptyProductsText}>
            Nenhum produto encontrado para este filtro.
          </Text>
        </View>
      )}
    </View>
  );
}
