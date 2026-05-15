import { getOrderChannelLogo } from '@assets/ppc/channels';

const buildLogo = app => {
  try {
    return getOrderChannelLogo({ app });
  } catch {
    return null;
  }
};

export const INTEGRATION_LIST = [
  {
    key: '99food',
    label: '99Food',
    route: 'Food99IntegrationPage',
    accent: '#F97316',
    logo: buildLogo('99Food'),
  },
  {
    key: 'ifood',
    label: 'iFood',
    route: 'IFoodIntegrationPage',
    accent: '#EA580C',
    logo: buildLogo('iFood'),
  },
  {
    key: 'uber',
    label: 'Uber',
    route: 'UberIntegrationPage',
    accent: '#111827',
    icon: 'truck',
  },
  {
    key: 'asaas',
    label: 'Asaas',
    route: 'AsaasIntegrationPage',
    accent: '#2563EB',
    icon: 'credit-card',
  },
  {
    key: 'clicksign',
    label: 'ClickSign',
    route: 'ClickSignIntegrationPage',
    accent: '#0F172A',
    icon: 'file-text',
  },
];

export const INTEGRATION_CONFIGS = {
  uber: {
    key: 'uber',
    label: 'Uber',
    accent: '#111827',
    icon: 'truck',
    description: 'Credenciais usadas para solicitar motoboy no pedido atual.',
    saveLabel: 'Salvar Uber',
    requiredKeys: [
      'OAUTH_UBER_APP_ID',
      'OAUTH_UBER_CLIENT_SECRET',
      'OAUTH_UBER_STORE_ID',
    ],
    fields: [
      {
        key: 'OAUTH_UBER_APP_ID',
        label: 'App ID',
        placeholder: 'Informe o App ID do Uber',
      },
      {
        key: 'OAUTH_UBER_CLIENT_SECRET',
        label: 'Client Secret',
        placeholder: 'Informe o Client Secret do Uber',
        secureTextEntry: true,
      },
      {
        key: 'OAUTH_UBER_STORE_ID',
        label: 'Store ID',
        placeholder: 'Informe o Store ID do Uber',
      },
    ],
  },
  asaas: {
    key: 'asaas',
    label: 'Asaas',
    accent: '#2563EB',
    icon: 'credit-card',
    description: 'Chaves da conta usada para cobranca e PIX da empresa atual.',
    saveLabel: 'Salvar Asaas',
    requiredKeys: [
      'asaas-key',
      'asaas-receiver-pix-key',
    ],
    fields: [
      {
        key: 'asaas-key',
        label: 'Asaas key',
        placeholder: 'Informe a chave de acesso do Asaas',
        secureTextEntry: true,
      },
      {
        key: 'asaas-receiver-pix-key',
        label: 'Receiver PIX key',
        placeholder: 'Informe a chave PIX de recebimento',
        secureTextEntry: true,
      },
    ],
  },
  clicksign: {
    key: 'clicksign',
    label: 'ClickSign',
    accent: '#0F172A',
    icon: 'file-text',
    description: 'Chave usada pelo fluxo de assinatura e webhook da empresa atual.',
    saveLabel: 'Salvar ClickSign',
    requiredKeys: [
      'clicksign-key',
    ],
    fields: [
      {
        key: 'clicksign-key',
        label: 'ClickSign key',
        placeholder: 'Informe a chave da ClickSign',
        secureTextEntry: true,
      },
    ],
  },
};

export const getIntegrationListItem = key =>
  INTEGRATION_LIST.find(item => item.key === key) || null;

export const getIntegrationConfig = key => INTEGRATION_CONFIGS[key] || null;

export const parseIntegrationCollection = response => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.member)) {
    return response.member;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  if (Array.isArray(response?.['hydra:member'])) {
    return response['hydra:member'];
  }

  return [];
};

export const getIntegrationByKey = (response, key) => {
  const normalizedKey = String(key || '').trim().toLowerCase();

  if (!normalizedKey) {
    return null;
  }

  return (
    parseIntegrationCollection(response).find(
      item => String(item?.key || '').trim().toLowerCase() === normalizedKey,
    ) || null
  );
};
