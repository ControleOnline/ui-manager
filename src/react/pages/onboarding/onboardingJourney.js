/**
 * Conditional activation journey from diagnostic answers.
 * Orchestrates only — real modules remain owners of execution.
 */

export const CAPABILITIES = [
  { id: 'pdv', label: 'PDV / Checkout', status: 'available', module: 'ui-orders / PdvPage' },
  { id: 'pcp', label: 'PCP / KDS', status: 'available', module: 'ui-ppc' },
  { id: 'catalog', label: 'Cardápio / Produtos', status: 'available', module: 'ui-products' },
  { id: 'devices', label: 'Devices', status: 'available', module: 'ui-common / Devices' },
  { id: 'tables', label: 'Mesas', status: 'evolving', module: 'orders / table domain' },
  { id: 'tabs', label: 'Comandas', status: 'evolving', module: 'orders / tab domain' },
  { id: 'delivery', label: 'Delivery', status: 'available', module: 'ui-logistic' },
  { id: 'menu_import', label: 'Importação de cardápio', status: 'not_contracted', module: 'future' },
];

export function buildJourney(draft) {
  const ops = draft?.operations || {};
  const floor = draft?.floor || {};
  const steps = [];

  steps.push({
    id: 'company_profile',
    title: 'Dados do estabelecimento',
    moduleHint: 'ui-people / My Companies',
    required: true,
  });

  if (ops.salon || floor.tables || floor.tabs) {
    steps.push({
      id: 'floor_plan',
      title: 'Salão: mesas e comandas',
      moduleHint: 'orders (table/tab domains — distinct)',
      required: true,
    });
  }

  if (ops.counter || ops.pickup) {
    steps.push({
      id: 'counter_pickup',
      title: 'Balcão e retirada',
      moduleHint: 'ui-orders / PDV',
      required: true,
    });
  }

  if (ops.deliveryOwn || ops.deliveryThird) {
    steps.push({
      id: 'delivery',
      title: 'Delivery próprio ou terceirizado',
      moduleHint: 'ui-logistic',
      required: true,
    });
  }

  if (ops.pcp) {
    steps.push({
      id: 'pcp',
      title: 'Produção / PCP / KDS',
      moduleHint: 'ui-ppc',
      required: true,
    });
  }

  steps.push({
    id: 'devices',
    title: 'Inventário inicial de devices',
    moduleHint: 'ui-common / Devices',
    required: true,
  });

  steps.push({
    id: 'catalog',
    title: 'Origem do cardápio e canais',
    moduleHint: 'ui-products',
    required: true,
  });

  return steps;
}

export function capabilityStatusForDraft(draft) {
  const ops = draft?.operations || {};
  return CAPABILITIES.map((cap) => {
    if (cap.id === 'pcp') {
      return { ...cap, highlighted: !!ops.pcp };
    }
    if (cap.id === 'delivery') {
      return { ...cap, highlighted: !!(ops.deliveryOwn || ops.deliveryThird) };
    }
    if (cap.id === 'tables') {
      return { ...cap, highlighted: !!draft?.floor?.tables };
    }
    if (cap.id === 'tabs') {
      return { ...cap, highlighted: !!draft?.floor?.tabs };
    }
    return { ...cap, highlighted: false };
  });
}
