import React from 'react';
import { ActivityIndicator, Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { withOpacity } from '@controleonline/../../src/styles/branding';

import styles from '../styles';

function IFoodOptionRow({
  option,
  optionIndex,
  product,
  onBlockCardPress,
  onMarkCardPressHandled,
  onSaveOptionPrice,
  onToggleOptionStatus,
  optStatusLoading,
  optPriceLoading,
  optPriceEditing,
  setOptPriceEditing,
}) {
  const hasIfoodId = !!option.ifood_option_id;
  const optionId = option.ifood_option_id || null;
  const isAvailable = option.ifood_status !== 'UNAVAILABLE';
  const isStatusBusy = optionId ? optStatusLoading.has(optionId) : false;
  const isPriceBusy = optionId ? optPriceLoading.has(optionId) : false;
  const draftPrice = optionId ? optPriceEditing[optionId] : undefined;
  const isEditing = draftPrice !== undefined;

  return (
    <View style={styles.optionRow}>
      <View style={styles.optionInfo}>
        <Text style={styles.optionName} numberOfLines={1}>
          {option.name || `Complemento ${optionIndex + 1}`}
        </Text>
        {!hasIfoodId && <Text style={styles.optNoIfoodId}>Sem ID iFood</Text>}
      </View>

      {hasIfoodId && (
        <View style={styles.optionControls}>
          {isEditing ? (
            <>
              <TextInput
                value={String(draftPrice)}
                onChangeText={value => setOptPriceEditing(current => ({ ...current, [optionId]: value }))}
                onFocus={onMarkCardPressHandled}
                keyboardType="decimal-pad"
                style={styles.priceInput}
                placeholder="0.00"
                placeholderTextColor="#94A3B8"
                onSubmitEditing={event => {
                  event.stopPropagation?.();
                  onSaveOptionPrice(product, option);
                }}
              />
              <TouchableOpacity
                onPressIn={onMarkCardPressHandled}
                onPress={event => {
                  onBlockCardPress(event);
                  onSaveOptionPrice(product, option);
                }}
                disabled={isPriceBusy}
                style={styles.priceSaveButton}>
                {isPriceBusy ? (
                  <ActivityIndicator size={12} color="#FFFFFF" />
                ) : (
                  <Icon name="check" size={13} color="#FFFFFF" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPressIn={onMarkCardPressHandled}
                onPress={event => {
                  onBlockCardPress(event);
                  setOptPriceEditing(current => {
                    const next = { ...current };
                    delete next[optionId];
                    return next;
                  });
                }}
                style={styles.priceCancelButton}>
                <Icon name="x" size={13} color="#64748B" />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              onPressIn={onMarkCardPressHandled}
              onPress={event => {
                onBlockCardPress(event);
                setOptPriceEditing(current => ({ ...current, [optionId]: String(option.price ?? '') }));
              }}
              style={styles.priceEditTrigger}>
              <Text style={styles.priceEditText}>R$ {Number(option.price || 0).toFixed(2)}</Text>
              <Icon name="edit-2" size={11} color="#64748B" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPressIn={onMarkCardPressHandled}
            onPress={event => {
              onBlockCardPress(event);
              onToggleOptionStatus(product, option);
            }}
            disabled={isStatusBusy}
            style={[styles.optStatusBadge, { backgroundColor: isAvailable ? '#DCFCE7' : '#FEE2E2' }]}>
            {isStatusBusy ? (
              <ActivityIndicator size={10} color={isAvailable ? '#16A34A' : '#DC2626'} />
            ) : (
              <Text style={[styles.itemStatusText, { color: isAvailable ? '#15803D' : '#B91C1C' }]}>
                {isAvailable ? 'Ativo' : 'Inativo'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// Card individual do catálogo iFood com item remoto e complementos.
export default function IFoodProductCard({
  product,
  accentColor,
  isSelected,
  onPress,
  onBlockCardPress,
  onMarkCardPressHandled,
  onToggleStatus,
  onSavePrice,
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
}) {
  const eligible = Boolean(product.eligible);
  const published = Boolean(product.published_remotely);
  const itemId = product.ifood_item_id || null;
  const ifoodStatus = product.ifood_status || 'AVAILABLE';
  const isAvailable = ifoodStatus !== 'UNAVAILABLE';
  const isStatusBusy = itemId ? itemStatusLoading.has(itemId) : false;
  const isPriceBusy = itemId ? itemPriceLoading.has(itemId) : false;
  const draftPrice = itemId ? itemPriceEditing[itemId] : undefined;
  const isEditingPrice = draftPrice !== undefined;

  return (
    <TouchableOpacity
      key={product.id}
      activeOpacity={0.88}
      style={[
        styles.productCard,
        isSelected && {
          borderColor: accentColor,
          backgroundColor: withOpacity(accentColor, 0.04),
        },
      ]}
      onPress={() => onPress(product.id)}>
      <View style={styles.productMain}>
        {product.cover_image_url ? (
          <Image source={{ uri: product.cover_image_url }} style={styles.productThumb} resizeMode="cover" />
        ) : (
          <View style={[styles.productStatusIcon, { backgroundColor: eligible ? '#DCFCE7' : '#FEE2E2' }]}>
            <Icon
              name={isSelected ? 'check-circle' : eligible ? 'circle' : 'x-circle'}
              size={16}
              color={isSelected ? accentColor : eligible ? '#16A34A' : '#DC2626'}
            />
          </View>
        )}

        <View style={styles.productContent}>
          <View style={styles.productTitleRow}>
            <Text style={styles.productName} numberOfLines={1}>
              {product.name}
            </Text>

            {published && itemId ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPressIn={onMarkCardPressHandled}
                onPress={event => {
                  onBlockCardPress(event);
                  onToggleStatus(product);
                }}
                disabled={isStatusBusy}
                style={[
                  styles.itemStatusBadge,
                  { backgroundColor: isAvailable ? '#DCFCE7' : '#FEE2E2' },
                ]}>
                {isStatusBusy ? (
                  <ActivityIndicator size={10} color={isAvailable ? '#16A34A' : '#DC2626'} />
                ) : (
                  <Text style={[styles.itemStatusText, { color: isAvailable ? '#15803D' : '#B91C1C' }]}>
                    {isAvailable ? 'Ativo' : 'Inativo'}
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={styles.productPrice}>R$ {Number(product.price || 0).toFixed(2)}</Text>
            )}
          </View>

          <Text style={styles.productMeta} numberOfLines={1}>
            {product.category?.name || 'Sem categoria'} • {product.type || 'produto'}
          </Text>

          {!!product.description && (
            <Text style={styles.productDescription} numberOfLines={1}>
              {product.description}
            </Text>
          )}

          {published && itemId ? (
            <View style={styles.priceEditRow}>
              {isEditingPrice ? (
                <>
                  <TextInput
                    value={String(draftPrice)}
                    onChangeText={value => setItemPriceEditing(current => ({ ...current, [itemId]: value }))}
                    onFocus={onMarkCardPressHandled}
                    keyboardType="decimal-pad"
                    style={styles.priceInput}
                    placeholder="0.00"
                    placeholderTextColor="#94A3B8"
                    onSubmitEditing={() => onSavePrice(product)}
                  />
                  <TouchableOpacity
                    onPressIn={onMarkCardPressHandled}
                    onPress={event => {
                      onBlockCardPress(event);
                      onSavePrice(product);
                    }}
                    disabled={isPriceBusy}
                    style={styles.priceSaveButton}>
                    {isPriceBusy ? (
                      <ActivityIndicator size={12} color="#FFFFFF" />
                    ) : (
                      <Icon name="check" size={13} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPressIn={onMarkCardPressHandled}
                    onPress={event => {
                      onBlockCardPress(event);
                      setItemPriceEditing(current => {
                        const next = { ...current };
                        delete next[itemId];
                        return next;
                      });
                    }}
                    style={styles.priceCancelButton}>
                    <Icon name="x" size={13} color="#64748B" />
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  onPress={event => {
                    onBlockCardPress(event);
                    setItemPriceEditing(current => ({ ...current, [itemId]: String(product.price ?? '') }));
                  }}
                  onPressIn={onMarkCardPressHandled}
                  style={styles.priceEditTrigger}>
                  <Text style={styles.priceEditText}>R$ {Number(product.price || 0).toFixed(2)}</Text>
                  <Icon name="edit-2" size={11} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {!!itemId && <Text style={styles.productCode}>ID iFood: {itemId.slice(0, 8)}...</Text>}
          {published && <Text style={styles.productRemoteState}>Publicado no catalogo iFood</Text>}
          {!eligible && Array.isArray(product.blockers) && product.blockers.length > 0 && (
            <Text style={styles.productBlocker}>{product.blockers.join(' • ')}</Text>
          )}

          {published && Array.isArray(product.options) && product.options.length > 0 && (
            <View style={styles.optionsSection}>
              <Text style={styles.optionsSectionLabel}>Complementos iFood</Text>
              {product.options.map((option, optionIndex) => (
                <IFoodOptionRow
                  key={`${product.id}-option-${optionIndex}`}
                  option={option}
                  optionIndex={optionIndex}
                  product={product}
                  onBlockCardPress={onBlockCardPress}
                  onMarkCardPressHandled={onMarkCardPressHandled}
                  onSaveOptionPrice={onSaveOptionPrice}
                  onToggleOptionStatus={onToggleOptionStatus}
                  optStatusLoading={optStatusLoading}
                  optPriceLoading={optPriceLoading}
                  optPriceEditing={optPriceEditing}
                  setOptPriceEditing={setOptPriceEditing}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
