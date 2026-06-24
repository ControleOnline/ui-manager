import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import styles from '../../Food99IntegrationPage/styles';

const normalizeList = value => (Array.isArray(value) ? value : []);

const formatValue = value => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '-';
  if (typeof value === 'object') {
    if (value.value !== null && value.value !== undefined) return formatValue(value.value);
    if (value.originalValue !== null && value.originalValue !== undefined) {
      return formatValue(value.originalValue);
    }

    return '-';
  }
  return String(value);
};

const formatMissingName = (kind, id) => {
  const formattedId = formatValue(id);
  return formattedId !== '-' ? `${kind} ${formattedId}` : `${kind} sem nome`;
};

const RemoteOptionRow = ({option}) => {
  const displayId = option?.pdv_code ?? option?.id;
  const name = option?.name || formatMissingName('Opcao', displayId);
  const metaLabel = option?.pdv_code
    ? `ID / Codigo PDV: ${formatValue(option.pdv_code)}`
    : `ID: ${formatValue(option?.id)} | Codigo: ${formatValue(option?.external_code)}`;

  return (
    <View style={styles.remoteOptionRow}>
      <View style={styles.remoteTreeContent}>
        <Text style={styles.remoteTreeTitle}>{name}</Text>
        <Text style={styles.remoteTreeMeta}>{metaLabel}</Text>
        {option?.name_missing ? (
          <Text style={styles.remoteTreeHint}>
            Nome nao veio na resposta remota.
          </Text>
        ) : null}
      </View>
      <Text style={styles.remoteTreePrice}>{formatValue(option?.price)}</Text>
    </View>
  );
};

const RemoteGroupNode = ({group}) => {
  const [expanded, setExpanded] = useState(false);
  const options = normalizeList(group?.options);

  return (
    <View style={styles.remoteGroupCard}>
      <TouchableOpacity
        style={styles.remoteTreeHeader}
        onPress={() => setExpanded(current => !current)}>
        <Icon
          name={expanded ? 'chevron-down' : 'chevron-right'}
          size={16}
          color="#64748B"
        />
        <View style={styles.remoteTreeContent}>
          <Text style={styles.remoteTreeTitle}>
            {group?.name || 'Grupo sem nome'}
          </Text>
          <Text style={styles.remoteTreeMeta}>
            ID: {formatValue(group?.id)} | Min: {formatValue(group?.minimum)} |
            Max: {formatValue(group?.maximum)} | Opcoes: {options.length}
          </Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.remoteTreeChildren}>
          {options.length > 0 ? (
            options.map((option, index) => (
              <RemoteOptionRow
                key={`${group?.id || 'group'}-${option?.id || index}`}
                option={option}
              />
            ))
          ) : (
            <Text style={styles.remoteEmptyText}>Grupo sem opcoes.</Text>
          )}
        </View>
      )}
    </View>
  );
};

const RemoteProductNode = ({product}) => {
  const [expanded, setExpanded] = useState(false);
  const groups = normalizeList(product?.groups);

  return (
    <View style={styles.remoteProductCard}>
      <TouchableOpacity
        style={styles.remoteTreeHeader}
        onPress={() => setExpanded(current => !current)}>
        <Icon
          name={expanded ? 'chevron-down' : 'chevron-right'}
          size={16}
          color="#64748B"
        />
        <View style={styles.remoteTreeContent}>
          <Text style={styles.remoteTreeTitle}>
            {product?.name || 'Produto sem nome'}
          </Text>
          <Text style={styles.remoteTreeMeta}>
            ID: {formatValue(product?.id)} | Codigo:{' '}
            {formatValue(product?.external_code)} | Grupos: {groups.length}
          </Text>
        </View>
        <Text style={styles.remoteTreePrice}>{formatValue(product?.price)}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.remoteTreeChildren}>
          {product?.description ? (
            <Text style={styles.remoteDescription}>{product.description}</Text>
          ) : null}

          {groups.length > 0 ? (
            groups.map((group, index) => (
              <RemoteGroupNode
                key={`${product?.id || 'product'}-${group?.id || index}`}
                group={group}
              />
            ))
          ) : (
            <Text style={styles.remoteEmptyText}>
              Produto sem grupos/adicionais remotos.
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const RemoteCategoryNode = ({category}) => {
  const [expanded, setExpanded] = useState(false);
  const products = normalizeList(category?.products);

  return (
    <View style={styles.remoteCategoryCard}>
      <TouchableOpacity
        style={styles.remoteTreeHeader}
        onPress={() => setExpanded(current => !current)}>
        <Icon
          name={expanded ? 'chevron-down' : 'chevron-right'}
          size={18}
          color="#0F172A"
        />
        <View style={styles.remoteTreeContent}>
          <Text style={styles.remoteCategoryTitle}>
            {category?.name || 'Categoria sem nome'}
          </Text>
          <Text style={styles.remoteTreeMeta}>
            ID: {formatValue(category?.id)} | Produtos: {products.length}
          </Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.remoteTreeChildren}>
          {products.length > 0 ? (
            products.map((product, index) => (
              <RemoteProductNode
                key={`${category?.id || 'category'}-${product?.id || index}`}
                product={product}
              />
            ))
          ) : (
            <Text style={styles.remoteEmptyText}>
              Categoria sem produtos remotos.
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

export default function RemoteMarketplaceMenuTab({
  shadowStyle,
  accentColor,
  palette,
  title,
  subtitle,
  buttonLabel,
  loading,
  snapshot,
  errorMessage,
  onLoad,
}) {
  const categories = normalizeList(snapshot?.categories);
  const buttonTextColor = palette?.white || '#fff';
  const summaryItems = useMemo(() => {
    const summary = snapshot?.summary || {};

    return [
      ['Catalogos/Menus', summary.catalogs ?? summary.menus ?? 0],
      ['Categorias', summary.categories ?? 0],
      ['Produtos', summary.products ?? 0],
      ['Grupos', summary.groups ?? 0],
      ['Opcoes', summary.options ?? 0],
      ['Opcoes sem nome', summary.missing_option_names ?? 0],
    ];
  }, [snapshot]);

  return (
    <View style={[styles.panel, shadowStyle]}>
      <View style={styles.panelHeader}>
        <View style={styles.remoteHeaderCopy}>
          <Text style={styles.panelTitle}>{title}</Text>
          <Text style={styles.panelSubtitle}>{subtitle}</Text>
        </View>

        <TouchableOpacity
          style={[styles.previewButton, {backgroundColor: accentColor}]}
          onPress={onLoad}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color={buttonTextColor} />
          ) : (
            <>
              <Icon name="download-cloud" size={15} color={buttonTextColor} />
              <Text style={styles.previewButtonText}>{buttonLabel}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Icon name="alert-triangle" size={16} color="#B91C1C" />
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      ) : null}

      {snapshot ? (
        <>
          <View style={styles.remoteSummaryGrid}>
            {summaryItems.map(([label, value]) => (
              <View key={label} style={styles.remoteSummaryCard}>
                <Text style={styles.remoteSummaryValue}>{formatValue(value)}</Text>
                <Text style={styles.remoteSummaryLabel}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.remoteTreeList}>
            {categories.length > 0 ? (
              categories.map((category, index) => (
                <RemoteCategoryNode
                  key={`${category?.id || 'category'}-${index}`}
                  category={category}
                />
              ))
            ) : (
              <View style={styles.emptyProducts}>
                <Text style={styles.emptyProductsText}>
                  Nenhuma categoria remota encontrada.
                </Text>
              </View>
            )}
          </View>
        </>
      ) : (
        <View style={styles.emptyProducts}>
          <Text style={styles.emptyProductsText}>
            Clique no botao para ler o cardapio atual da plataforma.
          </Text>
        </View>
      )}
    </View>
  );
}
