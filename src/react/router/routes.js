import PurchasingSuggestion from '@controleonline/ui-orders/src/react/pages/orders/purchasing/Suggestion';
import Inventory from '@controleonline/ui-orders/src/react/pages/inventory';

import IncomeStatement from '@controleonline/ui-financial/src/react/pages/reports/IncomeStatement';
import Payables from '@controleonline/ui-financial/src/react/pages/Payables';
import Receivables from '@controleonline/ui-financial/src/react/pages/Receivables';
import OwnTransfers from '@controleonline/ui-financial/src/react/pages/OwnTransfers';

import CashRegisters from '@controleonline/ui-manager/src/react/pages/CashRegisters';
import Food99IntegrationPage from '@controleonline/ui-manager/src/react/pages/Food99IntegrationPage';
import Food99OrderHistoryPage from '@controleonline/ui-manager/src/react/pages/Food99OrderHistoryPage';
import IntegrationsPage from '@controleonline/ui-manager/src/react/pages/Integrations';
import DisplayList from '@controleonline/ui-ppc/src/react/pages/displays/displayPage';
import DisplayDetails from '@controleonline/ui-ppc/src/react/pages/displays/DisplayDetails';
import DisplayForm from '@controleonline/ui-ppc/src/react/pages/displays/DisplayForm';
import QueueAddProducts from '@controleonline/ui-ppc/src/react/pages/queues/QueueAddProducts';

const managerRoutes = [
  {
    name: 'DisplayList',
    component: DisplayList,
    options: {
      headerShown: true,
      headerBackVisible: false,
      title: global.t?.t("configs", "title", "displays"),
      showBottomToolBar: true,
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'DisplayDetails',
    component: DisplayDetails,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: global.t?.t("configs", "title", "displayDetails"),
      showBottomToolBar: true,
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'DisplayForm',
    component: DisplayForm,
    options: {
      headerShown: false,
      headerBackVisible: false,
      title: global.t?.t("configs", "title", "displayForm"),
    },
  },
  {
    name: 'QueueAddProducts',
    component: QueueAddProducts,
    options: {
      headerShown: true,
      headerBackVisible: false,
      title: global.t?.t("configs", "title", "queueAddProducts"),
    },
  },
  {
    name: 'IntegrationsPage',
    component: IntegrationsPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: global.t?.t("configs", "title", "integrations"),
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'Food99IntegrationPage',
    component: Food99IntegrationPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: '99Food',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'Food99OrderHistoryPage',
    component: Food99OrderHistoryPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: global.t?.t("configs", "title", "99FoodOrderHistory"),
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'CashRegistersIndex',
    component: CashRegisters,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: global.t?.t("configs", "title", "cashRegisters"),
    },
    initialParams: { store: 'invoice' },
  },
  {
    name: 'IncomeStatement',
    component: IncomeStatement,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: global.t?.t("configs", "title", "incomeStatement"),
    },
    initialParams: { store: 'invoice' },
  },
  {
    name: 'Payables',
    component: Payables,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: global.t?.t("configs", "title", "payables"),
    },
    initialParams: { store: 'invoice' },
  },
  {
    name: 'Receivables',
    component: Receivables,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: global.t?.t("configs", "title", "receivables"),
    },
    initialParams: { store: 'invoice' },
  },
  {
    name: 'OwnTransfers',
    component: OwnTransfers,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: global.t?.t("configs", "title", "ownTransfers"),
    },
    initialParams: { store: 'invoice' },
  },
  {
    name: 'PurchasingSuggestion',
    component: PurchasingSuggestion,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: global.t?.t("configs", "title", "purchasingSuggestion"),
    },
    initialParams: { store: 'products' },
  },
  {
    name: 'Inventory',
    component: Inventory,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: global.t?.t("configs", "title", "inventory"),
    },
    initialParams: { store: 'products' },
  },
];

export default managerRoutes;
