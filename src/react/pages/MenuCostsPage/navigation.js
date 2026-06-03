import { MAIN_TABS } from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/viewModel';

export const MENU_COSTS_PAGE_ROUTE = 'MenuCostsPage';
export const MENU_COSTS_PARAMETERS_PAGE_ROUTE = 'MenuCostsParametersPage';
export const MENU_COSTS_SUPPLIERS_PAGE_ROUTE = 'MenuCostsSuppliersPage';
export const MENU_COSTS_INGREDIENTS_PAGE_ROUTE = 'MenuCostsIngredientsPage';
export const MENU_COSTS_PACKAGING_PAGE_ROUTE = 'MenuCostsPackagingPage';
export const MENU_COSTS_RESALE_PAGE_ROUTE = 'MenuCostsResalePage';

export const resolveMenuCostsInitialSection = route => {
  const requestedSection = String(route?.params?.section || '').trim();

  if (requestedSection === 'settings' || requestedSection === 'suppliers' || requestedSection === 'ingredients' || requestedSection === 'packaging' || requestedSection === 'resale') {
    return 'dashboard';
  }

  return MAIN_TABS.some(tab => tab.key === requestedSection)
    ? requestedSection
    : 'dashboard';
};

export const resolveMenuCostsTabRoute = tab => {
  if (tab === 'settings') {
    return {
      routeName: MENU_COSTS_PARAMETERS_PAGE_ROUTE,
      params: {},
    };
  }

  if (tab === 'suppliers') {
    return {
      routeName: MENU_COSTS_SUPPLIERS_PAGE_ROUTE,
      params: {},
    };
  }

  if (tab === 'ingredients') {
    return {
      routeName: MENU_COSTS_INGREDIENTS_PAGE_ROUTE,
      params: {},
    };
  }

  if (tab === 'packaging') {
    return {
      routeName: MENU_COSTS_PACKAGING_PAGE_ROUTE,
      params: {},
    };
  }

  if (tab === 'resale') {
    return {
      routeName: MENU_COSTS_RESALE_PAGE_ROUTE,
      params: {},
    };
  }

  return {
    routeName: MENU_COSTS_PAGE_ROUTE,
    params: {
      section: tab,
    },
  };
};
