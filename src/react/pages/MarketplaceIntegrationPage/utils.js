const normalizeProviderKey = value =>
  String(value || '')
    .trim()
    .toLowerCase();

const normalizeIfFoodChildren = product => {
  const options = Array.isArray(product?.options) ? product.options : [];

  if (options.length === 0) {
    return [];
  }

  return [
    {
      id: `${product.id}-ifood-options`,
      name: 'Complementos',
      required: false,
      minimum: 0,
      maximum: 0,
      items: options.map(option => ({
        id:
          option.ifood_option_id ||
          option.id ||
          option.code ||
          `${product.id}-option`,
        name: option.name || 'Complemento',
        code: option.ifood_option_id || option.id || option.code || '',
        description: option.description || '',
        price: option.price,
      })),
    },
  ];
};

const normalizeFood99Children = product =>
  Array.isArray(product?.children) ? product.children : [];

const normalizeSelectedProductSet = value => {
  if (value instanceof Set) {
    return new Set(Array.from(value).map(item => String(item)));
  }

  if (Array.isArray(value)) {
    return new Set(value.map(item => String(item)));
  }

  return new Set();
};

export const normalizeMarketplaceCatalogProduct = (
  product,
  providerKey = '99food',
) => {
  const normalizedProviderKey = normalizeProviderKey(providerKey);
  const isIfood = normalizedProviderKey === 'ifood';
  const code = isIfood
    ? product?.ifood_item_id || product?.food99_code || product?.id
    : product?.food99_code || product?.ifood_item_id || product?.id;

  return {
    id: product?.id,
    name: String(product?.name || ''),
    categoryName: String(
      product?.category?.name || product?.category_name || 'Sem categoria',
    ),
    productType: String(product?.type || product?.product_type || 'produto'),
    description: String(product?.description || ''),
    price: Number(product?.price || 0),
    code: code === null || code === undefined ? '' : String(code),
    codeLabel: 'Codigo',
    noCodeLabel: 'Sem codigo',
    published: Boolean(product?.published_remotely || product?.published),
    publishedLabel: 'Ja publicado no catalogo',
    childrenSectionLabel: 'Filhos consultados',
    childItemCodeLabel: 'Codigo',
    childItemNoCodeLabel: 'Sem codigo',
    eligible: Boolean(product?.eligible),
    blockers: Array.isArray(product?.blockers) ? product.blockers : [],
    children: isIfood
      ? normalizeIfFoodChildren(product)
      : normalizeFood99Children(product),
    sourceProduct: product,
  };
};

export const normalizeMarketplaceCatalogTabProps = (
  props = {},
  {providerKey = '99food', defaultMinimumRequiredItems} = {},
) => {
  const selectedEligibleProducts = Array.isArray(props.selectedEligibleProducts)
    ? props.selectedEligibleProducts
    : Array.isArray(props.selectedEligible)
      ? props.selectedEligible
      : [];
  const filteredProducts = Array.isArray(props.filteredProducts)
    ? props.filteredProducts
    : [];
  const selectedProductSet =
    props.selectedProductSet instanceof Set
      ? normalizeSelectedProductSet(props.selectedProductSet)
      : normalizeSelectedProductSet(props.selectedIds);
  const minimumRequiredItems = Number(
    props.minimumRequiredItems ??
      props.productsResponse?.minimum_required_items ??
      defaultMinimumRequiredItems ??
      1,
  );
  const selectionSummaryTone =
    props.selectionSummaryTone || props.accentColor;
  const productsResponse = {
    ...(props.productsResponse || {}),
    eligible_product_count: Number(
      props.productsResponse?.eligible_product_count ??
        props.eligibleCount ??
        selectedEligibleProducts.length ??
        0,
    ),
    minimum_required_items: minimumRequiredItems,
  };

  return {
    ...props,
    providerKey,
    selectionSummaryTone,
    minimumRequiredItems,
    productsResponse,
    selectedEligibleProducts,
    filteredProducts,
    selectedProductSet,
    previewLoading: Boolean(props.previewLoading),
    onPreview: props.onPreview || props.onOpenPreview || (() => {}),
    onToggleProduct:
      props.onToggleProduct || props.onProductCardPress || (() => {}),
    onMarkCardPressHandled:
      props.onMarkCardPressHandled || props.onBlockCardPress || (() => {}),
  };
};
