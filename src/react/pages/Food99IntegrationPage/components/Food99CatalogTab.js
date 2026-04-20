import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { withOpacity } from '@controleonline/../../src/styles/branding';

import styles from '../styles';
import { filterTabs, MINIMUM_REQUIRED_ITEMS } from '../utils';
import Food99ProductCard from './Food99ProductCard';

// Aba separada para seleção e publicação do catálogo 99Food.
export default function Food99CatalogTab({
  shadowStyle,
  accentColor,
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
}) {
  return (
    <View style={[styles.panel, shadowStyle]}>
      <View style={styles.panelHeader}>
        <View>
          <Text style={styles.panelTitle}>Selecao de produtos</Text>
          <Text style={styles.panelSubtitle}>
            Escolha pelo menos {MINIMUM_REQUIRED_ITEMS} produtos elegiveis para o menu do 99Food.
          </Text>
        </View>
        <View
          style={[
            styles.selectionBadge,
            { backgroundColor: withOpacity(selectionSummaryTone, 0.12) },
          ]}>
          <Text style={[styles.selectionBadgeText, { color: selectionSummaryTone }]}>
            {selectedEligibleProducts.length}/{MINIMUM_REQUIRED_ITEMS}
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

      <View style={styles.filterTabsRow}>
        {filterTabs.map(tab => {
          const active = filterKey === tab.key;

          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterChip,
                active && {
                  backgroundColor: withOpacity(accentColor, 0.12),
                  borderColor: withOpacity(accentColor, 0.25),
                },
              ]}
              onPress={() => setFilterKey(tab.key)}>
              <Text style={[styles.filterChipText, active && { color: accentColor }]}>
                {tab.label} ({tabCounts[tab.key] || 0})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.selectionSummaryRow}>
        <Text style={styles.selectionSummaryText}>
          {productsResponse?.eligible_product_count || 0} produtos aptos no cadastro atual
        </Text>
        <TouchableOpacity
          style={[
            styles.previewButton,
            {
              backgroundColor:
                selectedEligibleProducts.length >= MINIMUM_REQUIRED_ITEMS ? accentColor : '#CBD5E1',
            },
          ]}
          onPress={onPreview}
          disabled={previewLoading || selectedEligibleProducts.length < MINIMUM_REQUIRED_ITEMS}>
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

      {filteredProducts.length > 0 ? (
        <View style={styles.productsList}>
          {filteredProducts.map(product => (
            <Food99ProductCard
              key={product.id}
              product={product}
              accentColor={accentColor}
              selected={selectedProductSet.has(String(product.id))}
              onPress={onToggleProduct}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyProducts}>
          <Text style={styles.emptyProductsText}>Nenhum produto encontrado para este filtro.</Text>
        </View>
      )}
    </View>
  );
}
