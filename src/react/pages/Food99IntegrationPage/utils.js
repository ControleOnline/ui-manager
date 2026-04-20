// Configurações fixas e helpers específicos da integração 99Food.
export const MINIMUM_REQUIRED_ITEMS = 5;

export const statusLabelMap = {
  1: 'Online',
  2: 'Offline',
};

export const subStatusLabelMap = {
  1: 'Pronta',
  2: 'Pausada',
  3: 'Fechada',
};

export const filterTabs = [
  { key: 'all', label: 'Todos' },
  { key: 'eligible', label: 'Elegiveis' },
  { key: 'selected', label: 'Selecionados' },
  { key: 'blocked', label: 'Com bloqueio' },
];

export const publishStateLabelMap = {
  submitted: 'Enviado',
  processing: 'Processando',
  published: 'Publicado',
  failed: 'Falhou',
  sync_error: 'Sync pendente',
};

export const publishStateToneMap = {
  submitted: '#2563EB',
  processing: '#F59E0B',
  published: '#16A34A',
  failed: '#DC2626',
  sync_error: '#7C3AED',
};

export const deliveryMethodOptions = [
  { value: '2', label: 'Loja (2)' },
  { value: '1', label: 'Entrega 99 (1)' },
];

export const formatFood99ApiError = error => {
  if (!error) return 'Nao foi possivel concluir a operacao.';
  if (typeof error === 'string') return error;

  if (Array.isArray(error?.message)) {
    return error.message
      .map(item => item?.message || item?.title || String(item))
      .filter(Boolean)
      .join('\n');
  }

  return error?.message || error?.description || error?.errmsg || 'Nao foi possivel concluir a operacao.';
};

export const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export const normalizeTaskId = value => {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
};

export const sanitizeTimeInput = value => {
  const digits = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 4);

  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

export const isValidTimeInput = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || '').trim());

export const sanitizeRadiusInput = value => {
  const normalized = String(value || '').replace(/[^0-9.,]/g, '').replace(',', '.');
  const [integerPart, ...decimals] = normalized.split('.');
  if (decimals.length === 0) return integerPart;
  return `${integerPart}.${decimals.join('').slice(0, 2)}`;
};

export const sanitizeConfirmMethodInput = value =>
  String(value || '')
    .replace(/\D/g, '')
    .slice(0, 3);

export const normalizeDeliveryMethodCode = value => {
  const normalized = String(value || '').trim();
  if (normalized === '1' || normalized === '2') return normalized;

  const lower = normalized.toLowerCase();
  if (lower.includes('99') || lower.includes('platform') || lower.includes('didi')) return '1';

  if (
    lower.includes('store') ||
    lower.includes('shop') ||
    lower.includes('merchant') ||
    lower.includes('self') ||
    lower.includes('loja')
  ) {
    return '2';
  }

  return '';
};

export const formatDeliveryMethodLabel = value => {
  const code = normalizeDeliveryMethodCode(value);
  if (code === '2') return 'Loja';
  if (code === '1') return 'Entrega 99';

  const raw = String(value || '').trim();
  return raw || '-';
};

export const getPublishStateLabel = state => publishStateLabelMap[state] || 'Sem envio recente';

export const createEmptyStoreSettingsDraft = () => ({
  deliveryRadiusKm: '',
  openTime: '',
  closeTime: '',
  deliveryMethod: '',
  confirmMethod: '',
  deliveryAreaId: '',
});

export const isErrnoSuccess = errno => String(errno ?? '').trim() === '0';
