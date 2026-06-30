import {
  assertValidMenuCostsDraftWorkspace,
  createEmptyMenuCostsDraftWorkspace,
  normalizeMenuCostsDraftWorkspace,
} from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/domain/menuCostsDraftWorkspace';

export const MENU_COSTS_DRAFT_STORAGE_PREFIX = 'menu-costs:technical-drafts:v1:company';

const normalizeCompanyId = value => String(value?.id || value || '').trim();

export const buildMenuCostsDraftStorageKey = companyId => {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  if (!normalizedCompanyId) {
    throw new Error('A empresa e obrigatoria para acessar os rascunhos tecnicos.');
  }
  return `${MENU_COSTS_DRAFT_STORAGE_PREFIX}:${normalizedCompanyId}`;
};

// O storage e injetado para manter o repositorio independente de Web ou aplicativo nativo.
export const createMenuCostsDraftRepository = storage => {
  if (!storage?.getItem || !storage?.setItem || !storage?.removeItem) {
    throw new Error('Um storage compativel e obrigatorio para os rascunhos tecnicos.');
  }

  const load = async companyId => {
    const normalizedCompanyId = normalizeCompanyId(companyId);
    const key = buildMenuCostsDraftStorageKey(normalizedCompanyId);
    const storedValue = await storage.getItem(key);
    if (!storedValue) return createEmptyMenuCostsDraftWorkspace(normalizedCompanyId);

    try {
      return normalizeMenuCostsDraftWorkspace(JSON.parse(storedValue), normalizedCompanyId);
    } catch (error) {
      const repositoryError = new Error('Nao foi possivel ler o rascunho tecnico local.');
      repositoryError.code = 'MENU_COSTS_INVALID_DRAFT_STORAGE';
      repositoryError.cause = error;
      throw repositoryError;
    }
  };

  const save = async (companyId, workspace) => {
    const normalizedCompanyId = normalizeCompanyId(companyId);
    const normalizedWorkspace = normalizeMenuCostsDraftWorkspace(workspace, normalizedCompanyId);
    const nextWorkspace = {
      ...normalizedWorkspace,
      updatedAt: new Date().toISOString(),
    };

    assertValidMenuCostsDraftWorkspace(nextWorkspace);
    await storage.setItem(
      buildMenuCostsDraftStorageKey(normalizedCompanyId),
      JSON.stringify(nextWorkspace),
    );
    return nextWorkspace;
  };

  const clear = async companyId => {
    const normalizedCompanyId = normalizeCompanyId(companyId);
    await storage.removeItem(buildMenuCostsDraftStorageKey(normalizedCompanyId));
    return createEmptyMenuCostsDraftWorkspace(normalizedCompanyId);
  };

  return { load, save, clear };
};
