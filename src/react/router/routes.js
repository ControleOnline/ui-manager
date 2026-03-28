import PurchaseSuggestions from '@controleonline/ui-products/src/react/pages/PurchaseSuggestions';
import Inventory from '@controleonline/ui-orders/src/react/pages/inventory';
import SalesOrdersIndex from '@controleonline/ui-orders/src/react/pages/orders/sales';

import IncomeStatement from '@controleonline/ui-financial/src/react/pages/reports/IncomeStatement';
import Payables from '@controleonline/ui-financial/src/react/pages/Payables';
import Receivables from '@controleonline/ui-financial/src/react/pages/Receivables';
import OwnTransfers from '@controleonline/ui-financial/src/react/pages/OwnTransfers';

import CashRegisters from '@controleonline/ui-manager/src/react/pages/CashRegisters';
import ConnectionsPage from '@controleonline/ui-manager/src/react/pages/Connections';
import Food99IntegrationPage from '@controleonline/ui-manager/src/react/pages/Food99IntegrationPage';
import IFoodIntegrationPage from '@controleonline/ui-manager/src/react/pages/IFoodIntegrationPage';
import IntegrationsPage from '@controleonline/ui-manager/src/react/pages/Integrations';
import OrderHistoryPage from '@controleonline/ui-manager/src/react/pages/OrderHistoryPage';
import WhatsAppConnectionPage from '@controleonline/ui-manager/src/react/pages/WhatsAppConnectionPage';
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
    name: 'ConnectionsPage',
    component: ConnectionsPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Conexoes',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'WhatsAppConnectionPage',
    component: WhatsAppConnectionPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'WhatsApp',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
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
    name: 'IFoodIntegrationPage',
    component: IFoodIntegrationPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'iFood',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'OrderHistoryPage',
    component: OrderHistoryPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: global.t?.t("configs", "title", "orderHistory") || 'Order History Page',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'ManagerSalesOrdersIndex',
    component: SalesOrdersIndex,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Pedidos de Venda',
      showBottomToolBar: true,
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
    initialParams: { store: 'orders' },
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
    component: PurchaseSuggestions,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Sugestões de Compra',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
    initialParams: { store: 'product_inventories' },
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

