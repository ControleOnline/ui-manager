import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { withOpacity } from '@controleonline/../../src/styles/branding';

import styles from '../styles';

// Card enxuto de seleção de produto para o menu 99Food.
export default function Food99ProductCard({ product, accentColor, selected, onPress }) {
  const eligible = Boolean(product.eligible);
  const publishedRemotely = Boolean(product.published_remotely);

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
      onPress={() => onPress(product)}>
      <View style={styles.productMain}>
        <View
          style={[
            styles.productStatusIcon,
            { backgroundColor: eligible ? '#DCFCE7' : '#FEE2E2' },
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
              {product.name}
            </Text>
            <Text style={styles.productPrice}>R$ {Number(product.price || 0).toFixed(2)}</Text>
          </View>

          <Text style={styles.productMeta} numberOfLines={1}>
            {product.category?.name || 'Sem categoria'} • {product.type || 'produto'}
          </Text>

          {!!product.description && (
            <Text style={styles.productDescription} numberOfLines={1}>
              {product.description}
            </Text>
          )}

          {!!product.food99_code && <Text style={styles.productCode}>Codigo 99: {product.food99_code}</Text>}
          {publishedRemotely && <Text style={styles.productRemoteState}>Ja publicado no catalogo remoto</Text>}
          {!eligible && Array.isArray(product.blockers) && product.blockers.length > 0 && (
            <Text style={styles.productBlocker}>{product.blockers.join(' • ')}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
