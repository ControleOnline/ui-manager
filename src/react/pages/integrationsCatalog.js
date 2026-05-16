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
    description: 'Conecte sua conta Uber para descobrir e provisionar a store automaticamente.',
    oauthConnect: true,
    authorizationEndpoint: '/marketplace/integrations/uber/store/authorization-page',
    connectLabel: 'Conectar Uber',
    requiredKeys: [
      'OAUTH_UBER_STORE_ID',
    ],
    fields: [],
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
