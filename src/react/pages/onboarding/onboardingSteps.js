export const ONBOARDING_STEP_STATUS = Object.freeze({
  ACTIVE: 'Em preenchimento',
  NOT_STARTED: 'Não iniciada',
});

export const ONBOARDING_STEPS = Object.freeze([
  {id: 'opening', label: 'Abrir implantação'},
  {id: 'establishment', label: 'Empresa e estabelecimento'},
  {id: 'packages', label: 'Pacotes e serviços'},
  {id: 'people', label: 'Usuários e equipe'},
  {id: 'operation', label: 'Modelo operacional e logística'},
  {id: 'menu-source', label: 'Receber o cardápio'},
  {id: 'catalog-review', label: 'Revisar o catálogo'},
  {id: 'production', label: 'Estoque e produção'},
  {id: 'devices', label: 'Cadastrar devices'},
  {id: 'financial', label: 'Financeiro e fiscal'},
  {id: 'integrations', label: 'Integrações e benefícios'},
  {id: 'activation', label: 'Validar e ativar'},
]);

export const createOnboardingSteps = ({started = false} = {}) =>
  ONBOARDING_STEPS.map((step, index) => ({
    ...step,
    status:
      started && index === 0
        ? ONBOARDING_STEP_STATUS.ACTIVE
        : ONBOARDING_STEP_STATUS.NOT_STARTED,
  }));

const normalizeText = value => String(value || '').trim();

export const normalizeOnboardingDraft = draft => ({
  clientOwner: normalizeText(draft?.clientOwner),
  internalOwner: normalizeText(draft?.internalOwner),
  notes: normalizeText(draft?.notes),
  zDayDate: normalizeText(draft?.zDayDate),
  zDayTime: normalizeText(draft?.zDayTime),
});

export const isOnboardingDraftReady = ({company, draft} = {}) => {
  const normalized = normalizeOnboardingDraft(draft);

  return Boolean(
    company?.id &&
      normalized.clientOwner &&
      normalized.internalOwner &&
      /^\d{2}\/\d{2}\/\d{4}$/.test(normalized.zDayDate) &&
      /^\d{2}:\d{2}$/.test(normalized.zDayTime),
  );
};

export const resolveCompanyName = company =>
  normalizeText(company?.name || company?.alias) || 'Empresa não selecionada';
