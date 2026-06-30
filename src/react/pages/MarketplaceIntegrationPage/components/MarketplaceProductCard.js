import React, {useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import {withOpacity} from '@controleonline/../../src/styles/branding';

import styles from '../../Food99IntegrationPage/styles';

// Card compartilhado para o catálogo de marketplace.
export default function MarketplaceProductCard({
  product,
  selected,
  accentColor,
  onPress,
  onMarkCardPressHandled,
}) {
  const eligible = Boolean(product?.eligible);
  const published = Boolean(product?.published);
  const childGroups = Array.isArray(product?.children) ? product.children : [];
  const childCount = childGroups.reduce(
    (total, group) =>
      total + (Array.isArray(group.items) ? group.items.length : 0),
    0,
  );
  const [childrenExpanded, setChildrenExpanded] = useState(false);

  const handleToggleChildren = event => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    onMarkCardPressHandled?.();
    setChildrenExpanded(current => !current);
  };

  return (
    <TouchableOpacity
      style={[
        styles.productCard,
        selected && {
          borderColor: accentColor,
          backgroundColor: withOpacity(accentColor, 0.04),
        },
      ]}
      activeOpacity={0.88}
      onPress={() => onPress?.(product?.sourceProduct || product)}>
      <View style={styles.productMain}>
        <View
          style={[
            styles.productStatusIcon,
            {backgroundColor: eligible ? '#DCFCE7' : '#FEE2E2'},
          ]}>
          <Icon
            name={selected ? 'check-circle' : eligible ? 'circle' : 'x-circle'}
            size={16}
            color={selected ? accentColor : eligible ? '#16A34A' : '#DC2626'}
          />
        </View>

        <View style={styles.productContent}>
          <View style={styles.productTitleRow}>
            <Text style={styles.productName} numberOfLines={1}>
              {product?.name}
            </Text>
            <Text style={styles.productPrice}>
              R$ {Number(product?.price || 0).toFixed(2)}
            </Text>
          </View>

          <Text style={styles.productMeta} numberOfLines={1}>
            {product?.categoryName || 'Sem categoria'} •{' '}
            {product?.productType || 'produto'}
          </Text>

          {!!product?.description && (
            <Text style={styles.productDescription} numberOfLines={1}>
              {product.description}
            </Text>
          )}

          {product?.code ? (
            <Text style={styles.productCode}>
              {product?.codeLabel || 'Codigo'}: {product.code}
            </Text>
          ) : (
            <Text style={styles.productCode}>
              {product?.noCodeLabel || 'Sem codigo'}
            </Text>
          )}

          {published && (
            <Text style={styles.productRemoteState}>
              {product?.publishedLabel || 'Ja publicado no catalogo'}
            </Text>
          )}

          {!eligible &&
            Array.isArray(product?.blockers) &&
            product.blockers.length > 0 && (
              <Text style={styles.productBlocker}>
                {product.blockers.join(' • ')}
              </Text>
            )}

          {childCount > 0 && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPressIn={onMarkCardPressHandled}
              onPress={handleToggleChildren}
              style={[
                styles.productDisclosureButton,
                {
                  borderColor: accentColor,
                  backgroundColor: withOpacity(accentColor, 0.08),
                },
              ]}>
              <Text
                style={[
                  styles.productDisclosureButtonText,
                  {color: accentColor},
                ]}>
                {childrenExpanded
                  ? 'Ocultar filhos'
                  : `Mostrar filhos (${childCount})`}
              </Text>
              <Icon
                name={childrenExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={accentColor}
              />
            </TouchableOpacity>
          )}

          {childrenExpanded && childCount > 0 && (
            <View style={styles.childrenSection}>
              <Text style={styles.childrenSectionLabel}>
                {product?.childrenSectionLabel || 'Filhos consultados'}
              </Text>

              {childGroups.map(group => {
                const groupItems = Array.isArray(group.items)
                  ? group.items
                  : [];
                const requiredLabel = group.required
                  ? 'Obrigatorio'
                  : 'Opcional';
                const rangeParts = [];

                if (Number(group.minimum ?? 0) > 0) {
                  rangeParts.push(`min ${group.minimum}`);
                }

                if (Number(group.maximum ?? 0) > 0) {
                  rangeParts.push(`max ${group.maximum}`);
                }

                const groupMeta = [requiredLabel, ...rangeParts].join(' • ');

                return (
                  <View
                    key={`${group.id ?? group.name}`}
                    style={styles.childGroupCard}>
                    <View style={styles.childGroupHeader}>
                      <Text style={styles.childGroupTitle} numberOfLines={1}>
                        {group.name}
                      </Text>
                      <Text style={styles.childGroupMeta} numberOfLines={1}>
                        {groupMeta}
                      </Text>
                    </View>

                    <View style={styles.childItemsList}>
                      {groupItems.map(item => (
                        <View
                          key={`${item.id ?? item.code ?? item.name}`}
                          style={styles.childItemRow}>
                          <View style={styles.childItemContent}>
                            <Text
                              style={styles.childItemName}
                              numberOfLines={1}>
                              {item.name}
                            </Text>
                            <Text
                              style={styles.childItemMeta}
                              numberOfLines={1}>
                              {item.code
                                ? `${product?.childItemCodeLabel || 'Codigo'}: ${item.code}`
                                : product?.childItemNoCodeLabel || 'Sem codigo'}
                              {item.description ? ` • ${item.description}` : ''}
                            </Text>
                          </View>
                          <Text style={styles.childItemPrice}>
                            R$ {Number(item.price || 0).toFixed(2)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
