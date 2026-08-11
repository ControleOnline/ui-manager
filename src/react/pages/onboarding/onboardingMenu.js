const ONBOARDING_MENU_ITEM = Object.freeze({
  id: 'manager_onboarding',
  menuKey: 'onboarding',
  label: 'Onboarding',
  route: 'ManagerOnboardingPage',
  icon: 'clipboard',
  color: '#0EA5E9',
  sortOrder: 5,
  menuType: 'home',
});

const normalizeKey = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const isOperationsModule = module => {
  const values = [module?.id, module?.label, module?.name].map(normalizeKey);
  return values.some(value => value.includes('operac') || value.includes('operation'));
};

const sortMenus = menus =>
  [...menus].sort((left, right) => {
    const orderDiff = Number(left?.sortOrder || 0) - Number(right?.sortOrder || 0);
    if (orderDiff !== 0) return orderDiff;
    return String(left?.label || '').localeCompare(String(right?.label || ''));
  });

export const appendManagerOnboardingMenu = (menus, {enabled = false} = {}) => {
  const modules = (Array.isArray(menus) ? menus : []).map(module => ({
    ...module,
    menus: Array.isArray(module?.menus) ? [...module.menus] : [],
  }));

  if (!enabled) return modules;

  const alreadyAvailable = modules.some(module =>
    module.menus.some(item => item?.route === ONBOARDING_MENU_ITEM.route),
  );
  if (alreadyAvailable) return modules;

  const operationIndex = modules.findIndex(isOperationsModule);
  if (operationIndex >= 0) {
    modules[operationIndex] = {
      ...modules[operationIndex],
      menus: sortMenus([
        ...modules[operationIndex].menus,
        {...ONBOARDING_MENU_ITEM},
      ]),
    };
    return modules;
  }

  return [
    ...modules,
    {
      id: 'manager-operacoes-onboarding',
      label: 'Operacoes',
      icon: 'briefcase',
      sortOrder: 90,
      menus: [{...ONBOARDING_MENU_ITEM}],
    },
  ];
};

export {ONBOARDING_MENU_ITEM};
