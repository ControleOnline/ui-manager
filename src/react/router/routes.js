import PurchaseSuggestions from '@controleonline/ui-products/src/react/pages/PurchaseSuggestions';
import Inventory from '@controleonline/ui-orders/src/react/pages/inventory';
import PdvPage from '@controleonline/ui-manager/src/react/pages/PdvPage';

import IncomeStatement from '@controleonline/ui-financial/src/react/pages/reports/IncomeStatement';
import Payables from '@controleonline/ui-financial/src/react/pages/Payables';
import Receivables from '@controleonline/ui-financial/src/react/pages/Receivables';
import OwnTransfers from '@controleonline/ui-financial/src/react/pages/OwnTransfers';
import WalletsPage from '@controleonline/ui-financial/src/react/pages/WalletsPage';
import PaymentTypesPage from '@controleonline/ui-financial/src/react/pages/PaymentTypesPage';
import InvoiceCategoriesPage from '@controleonline/ui-financial/src/react/pages/InvoiceCategoriesPage';

import Devices from '@controleonline/ui-manager/src/react/pages/Devices';
import DeviceDetailPage from '@controleonline/ui-manager/src/react/pages/DeviceDetailPage';
import PrinterDeviceDetailPage from '@controleonline/ui-manager/src/react/pages/PrinterDeviceDetailPage';
import PrinterDeviceFormPage from '@controleonline/ui-manager/src/react/pages/PrinterDeviceFormPage';
import ConnectionsPage from '@controleonline/ui-manager/src/react/pages/Connections';
import Food99IntegrationPage from '@controleonline/ui-manager/src/react/pages/Food99IntegrationPage';
import IFoodIntegrationPage from '@controleonline/ui-manager/src/react/pages/IFoodIntegrationPage';
import IntegrationsPage from '@controleonline/ui-manager/src/react/pages/Integrations';
import ModelTemplatesPage from '@controleonline/ui-manager/src/react/pages/ModelTemplatesPage';
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
      title: global.t?.t("configs", "title", "connections"),
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
      title: global.t?.t("configs", "title", "whatsApp"),
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
    name: 'ModelTemplatesPage',
    component: ModelTemplatesPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Modelos HTML/Twig',
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
    name: 'PdvPage',
    component: PdvPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'PDV',
      showBottomToolBar: true,
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
      title: global.t?.t("configs", "title", "orderHistory"),
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'DevicesIndex',
    component: Devices,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Dispositivos',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
    initialParams: { store: 'device_config' },
  },
  {
    name: 'DeviceDetail',
    component: DeviceDetailPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Detalhes do Device',
      showCompanyFilter: false,
    },
    initialParams: { store: 'invoice' },
  },
  {
    name: 'PrinterDeviceDetail',
    component: PrinterDeviceDetailPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Impressora de Rede',
      showCompanyFilter: false,
    },
    initialParams: {store: 'device'},
  },
  {
    name: 'PrinterDeviceForm',
    component: PrinterDeviceFormPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Nova Impressora de Rede',
      showCompanyFilter: false,
    },
    initialParams: {store: 'device'},
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
      showCompanyFilter: true,
      companyFilterMode: 'icon',
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
      showCompanyFilter: true,
      companyFilterMode: 'icon',
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
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
    initialParams: { store: 'invoice' },
  },
  {
    name: 'WalletsPage',
    component: WalletsPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Carteiras',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
    initialParams: { store: 'wallet' },
  },
  {
    name: 'PaymentTypesPage',
    component: PaymentTypesPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Formas de Pagamento',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
    initialParams: { store: 'paymentType' },
  },
  {
    name: 'InvoiceCategoriesPage',
    component: InvoiceCategoriesPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Categorias Financeiras',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
    initialParams: { store: 'categories' },
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

