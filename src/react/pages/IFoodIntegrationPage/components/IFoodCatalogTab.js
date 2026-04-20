import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { withOpacity } from '@controleonline/../../src/styles/branding';

import styles from '../styles';
import { filterTabs } from '../utils';
import IFoodProductCard from './IFoodProductCard';

// Aba de cardápio e publicação do catálogo iFood.
export default function IFoodCatalogTab({
  shadowStyle,
  accentColor,
  connected,
  minimumRequiredItems,
  eligibleCount,
  search,
  setSearch,
  filterKey,
  setFilterKey,
  tabCounts,
  selectedEligible,
  onOpenPreview,
  actionLoading,
  filteredProducts,
  selectedIds,
  onProductCardPress,
  onMarkCardPressHandled,
  onBlockCardPress,
  onToggleItemStatus,
  onSaveItemPrice,
  itemStatusLoading,
  itemPriceLoading,
  itemPriceEditing,
  setItemPriceEditing,
  optStatusLoading,
  optPriceLoading,
  optPriceEditing,
  setOptPriceEditing,
  onSaveOptionPrice,
  onToggleOptionStatus,
  onSyncCatalog,
}) {
  return (
    <View style={[styles.sectionCard, shadowStyle]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Cardapio iFood</Text>
        <View
          style={[
            styles.selectionBadge,
            { backgroundColor: withOpacity(connected ? '#16A34A' : '#F59E0B', 0.12) },
          ]}>
          <Text style={[styles.selectionBadgeText, { color: connected ? '#166534' : '#92400E' }]}>
            {connected ? 'Pronto para publicar' : 'Conecte a loja'}
          </Text>
        </View>
      </View>

      <Text style={styles.catalogHint}>
        Escolha pelo menos {minimumRequiredItems} produto(s) elegiveis para o menu do iFood.
      </Text>

      <View style={styles.searchBox}>
        <Icon name="search" size={16} color="#94A3B8" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar produto, categoria ou codigo"
          placeholderTextColor="#94A3B8"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.filterTabsRow}>
        {filterTabs.map(tab => {
          const active = filterKey === tab.key;

          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.8}
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
          {eligibleCount} produtos aptos no cadastro atual
        </Text>
        <TouchableOpacity
          style={[
            styles.previewButton,
            {
              backgroundColor:
                connected && selectedEligible.length >= minimumRequiredItems ? accentColor : '#CBD5E1',
            },
          ]}
          onPress={onOpenPreview}
          disabled={!connected || actionLoading !== null || selectedEligible.length < minimumRequiredItems}>
          {actionLoading === 'menu_upload' ? (
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
            <IFoodProductCard
              key={product.id}
              product={product}
              accentColor={accentColor}
              isSelected={selectedIds.has(String(product.id))}
              onPress={onProductCardPress}
              onBlockCardPress={onBlockCardPress}
              onMarkCardPressHandled={onMarkCardPressHandled}
              onToggleStatus={onToggleItemStatus}
              onSavePrice={onSaveItemPrice}
              itemStatusLoading={itemStatusLoading}
              itemPriceLoading={itemPriceLoading}
              itemPriceEditing={itemPriceEditing}
              setItemPriceEditing={setItemPriceEditing}
              optStatusLoading={optStatusLoading}
              optPriceLoading={optPriceLoading}
              optPriceEditing={optPriceEditing}
              setOptPriceEditing={setOptPriceEditing}
              onSaveOptionPrice={onSaveOptionPrice}
              onToggleOptionStatus={onToggleOptionStatus}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyProducts}>
          <Text style={styles.emptyProductsText}>Nenhum produto encontrado para este filtro.</Text>
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.9}
        style={[
          styles.syncCatalogButton,
          (!connected || actionLoading !== null) && styles.syncCatalogButtonDisabled,
        ]}
        onPress={onSyncCatalog}
        disabled={!connected || actionLoading !== null}>
        {actionLoading === 'catalog_sync' ? (
          <ActivityIndicator color="#0EA5E9" size="small" />
        ) : (
          <>
            <Icon name="download-cloud" size={15} color="#0EA5E9" />
            <Text style={styles.syncCatalogButtonText}>Sincronizar catalogo do iFood</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}
