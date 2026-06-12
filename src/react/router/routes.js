import PurchaseSuggestions from '@controleonline/ui-products/src/react/pages/PurchaseSuggestions';
import Inventory from '@controleonline/ui-orders/src/react/pages/inventory';
import PdvPage from '@controleonline/ui-manager/src/react/pages/PdvPage';

import IncomeStatement from '@controleonline/ui-financial/src/react/pages/reports/IncomeStatement';
import Payables from '@controleonline/ui-financial/src/react/pages/Payables';
import Receivables from '@controleonline/ui-financial/src/react/pages/Receivables';
import OwnTransfers from '@controleonline/ui-financial/src/react/pages/OwnTransfers';
import InvoiceDetailsPage from '@controleonline/ui-financial/src/react/pages/InvoiceDetailsPage';
import WalletsPage from '@controleonline/ui-financial/src/react/pages/WalletsPage';
import InvoiceCategoriesPage from '@controleonline/ui-financial/src/react/pages/InvoiceCategoriesPage';

import Devices from '@controleonline/ui-manager/src/react/pages/Devices';
import DeviceDetailPage from '@controleonline/ui-manager/src/react/pages/DeviceDetailPage';
import PrinterDeviceDetailPage from '@controleonline/ui-manager/src/react/pages/PrinterDeviceDetailPage';
import PrinterDeviceFormPage from '@controleonline/ui-manager/src/react/pages/PrinterDeviceFormPage';
import ConfiguratorPage from '@controleonline/ui-manager/src/react/pages/ConfiguratorPage';
import ThemeManagerPage from '@controleonline/ui-manager/src/react/pages/ThemeManagerPage';
import ThemePreviewPage from '@controleonline/ui-manager/src/react/pages/ThemePreviewPage';
import ManagerOrderNotificationsPage from '@controleonline/ui-manager/src/react/pages/ManagerOrderNotificationsPage';
import TranslationsReviewPage from '@controleonline/ui-manager/src/react/pages/TranslationsReviewPage';
import DeliveryRatesInboxPage from '@controleonline/ui-manager/src/react/pages/delivery-rates/DeliveryRatesInboxPage';
import DeliveryRateVersionPage from '@controleonline/ui-manager/src/react/pages/delivery-rates/DeliveryRateVersionPage';
import DeliveryRateHistoryPage from '@controleonline/ui-manager/src/react/pages/delivery-rates/DeliveryRateHistoryPage';
import DeliveryRateCompanyPage from '@controleonline/ui-manager/src/react/pages/delivery-rates/DeliveryRateCompanyPage';
import DeliveryPresenceInboxPage from '@controleonline/ui-manager/src/react/pages/presence/DeliveryPresenceInboxPage';
import DeliveryPresenceDetailPage from '@controleonline/ui-manager/src/react/pages/presence/DeliveryPresenceDetailPage';
import DeliveryPresenceHistoryPage from '@controleonline/ui-manager/src/react/pages/presence/DeliveryPresenceHistoryPage';
import {
  IP_CAMERA_DEVICE_TYPE,
  PRINT_DEVICE_TYPE,
} from '@controleonline/ui-common/src/react/utils/printerDevices';
import ConnectionsPage from '@controleonline/ui-manager/src/react/pages/Connections';
import FinancialHubPage from '@controleonline/ui-manager/src/react/pages/FinancialHubPage';
import MarketplaceIntegrationPage from '@controleonline/ui-manager/src/react/pages/MarketplaceIntegrationPage';
import IntegrationConfigPage from '@controleonline/ui-manager/src/react/pages/IntegrationConfigPage';
import IntegrationsPage from '@controleonline/ui-manager/src/react/pages/Integrations';
import ManagerCategoriesPage from '@controleonline/ui-manager/src/react/pages/ManagerCategoriesPage';
import MenuCostsPage from '@controleonline/ui-manager/src/react/pages/MenuCostsPage';
import MenuCostsParametersPage from '@controleonline/ui-manager/src/react/pages/MenuCostsParametersPage';
import MenuCostsIngredientsPage from '@controleonline/ui-manager/src/react/pages/MenuCostsIngredientsPage';
import MenuCostsPackagingPage from '@controleonline/ui-manager/src/react/pages/MenuCostsPackagingPage';
import MenuCostsResalePage from '@controleonline/ui-manager/src/react/pages/MenuCostsResalePage';
import MenuCostsSuppliersPage from '@controleonline/ui-manager/src/react/pages/MenuCostsSuppliersPage';
import MenuCostsPurchasesPage from '@controleonline/ui-manager/src/react/pages/MenuCostsPurchasesPage';
import MenuAccessConfigPage from '@controleonline/ui-manager/src/react/pages/MenuAccessConfigPage';
import LabelsPage from '@controleonline/ui-manager/src/react/pages/LabelsPage';
import ModelTemplatesPage from '@controleonline/ui-manager/src/react/pages/ModelTemplatesPage';
import WhatsAppConnectionPage from '@controleonline/ui-manager/src/react/pages/WhatsAppConnectionPage';
import DisplayList from '@controleonline/ui-ppc/src/react/pages/displays/displayPage';
import DisplayDetails from '@controleonline/ui-ppc/src/react/pages/displays/DisplayDetails';
import DisplayOrderConference from '@controleonline/ui-ppc/src/react/pages/displays/orders/DisplayOrderConference';
import DisplayForm from '@controleonline/ui-ppc/src/react/pages/displays/DisplayForm';
import QueueAddProducts from '@controleonline/ui-ppc/src/react/pages/queues/QueueAddProducts';
import LinkedOrderSettlementPage from '@controleonline/ui-orders/src/react/pages/checkout/LinkedOrderSettlementPage';

const managerRoutes = [
  {
    name: 'DisplayList',
    component: DisplayList,
    options: {
      headerShown: true,
      headerBackVisible: false,
      title: () => global.t?.t('configs', 'title', 'displays'),
      showBottomToolBar: false,
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
      title: () => global.t?.t('configs', 'title', 'displayDetails'),
      showBottomToolBar: true,
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'DisplayOrderConference',
    component: DisplayOrderConference,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Conferencia',
      showBottomToolBar: false,
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'DisplayForm',
    component: DisplayForm,
    options: {
      title: () => global.t?.t('configs', 'title', 'displayForm'),
    },
  },
  {
    name: 'QueueAddProducts',
    component: QueueAddProducts,
    options: {
      headerShown: true,
      title: () => global.t?.t('configs', 'title', 'queueAddProducts'),
    },
  },
  {
    name: 'FinancialHubPage',
    component: FinancialHubPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Financeiro',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'ConfiguratorPage',
    component: ConfiguratorPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Configurador',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'ThemeManagerPage',
    component: ThemeManagerPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Temas',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'ThemePreviewPage',
    component: ThemePreviewPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Preview do tema',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'MenuAccessConfigPage',
    component: MenuAccessConfigPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Menus por perfil',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'ManagerOrderNotificationsPage',
    component: ManagerOrderNotificationsPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Notificações de pedidos',
      showBottomToolBar: true,
      showCompanyFilter: false,
    },
  },
  {
    name: 'DeliveryRatesInboxPage',
    component: DeliveryRatesInboxPage,
    path: 'delivery/manager/rates',
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Tabelas de entrega',
      showBottomToolBar: false,
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'DeliveryRateVersionPage',
    component: DeliveryRateVersionPage,
    path: 'delivery/manager/rates/version',
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Detalhe da tabela',
      showBottomToolBar: false,
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'DeliveryRateHistoryPage',
    component: DeliveryRateHistoryPage,
    path: 'delivery/manager/rates/history',
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Histórico da tabela',
      showBottomToolBar: false,
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'DeliveryRateCompanyPage',
    component: DeliveryRateCompanyPage,
    path: 'delivery/manager/rates/companies',
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Ativação por empresa',
      showBottomToolBar: false,
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'DeliveryPresenceInboxPage',
    component: DeliveryPresenceInboxPage,
    path: 'delivery/manager/presence',
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Presenca dos motoboys',
      showBottomToolBar: false,
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'DeliveryPresenceDetailPage',
    component: DeliveryPresenceDetailPage,
    path: 'delivery/manager/presence/detail',
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Detalhe da presenca',
      showBottomToolBar: false,
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'DeliveryPresenceHistoryPage',
    component: DeliveryPresenceHistoryPage,
    path: 'delivery/manager/presence/history',
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Historico da presenca',
      showBottomToolBar: false,
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'TranslationsReviewPage',
    component: TranslationsReviewPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Revisão de traduções',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'ConnectionsPage',
    component: ConnectionsPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: () => global.t?.t('configs', 'title', 'connections'),
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
      title: () => global.t?.t('configs', 'title', 'whatsApp'),
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
      title: () => global.t?.t('configs', 'title', 'integrations'),
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'ManagerCategoriesPage',
    component: ManagerCategoriesPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Categorias',
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
    name: 'LabelsPage',
    component: LabelsPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Etiquetas',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'MarketplaceIntegrationPage',
    component: MarketplaceIntegrationPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Marketplace',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'Food99IntegrationPage',
    component: MarketplaceIntegrationPage,
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
    component: MarketplaceIntegrationPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'iFood',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'UberIntegrationPage',
    component: IntegrationConfigPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Uber',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'AsaasIntegrationPage',
    component: IntegrationConfigPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Asaas',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'ClickSignIntegrationPage',
    component: IntegrationConfigPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'ClickSign',
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
    name: 'LinkedOrderSettlementPage',
    component: LinkedOrderSettlementPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: () => global.t?.t('orders', 'title', 'linkedOrderSettlement'),
      showBottomToolBar: true,
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
    initialParams: {store: 'device_config'},
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
    initialParams: {store: 'invoice'},
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
    initialParams: {store: 'device', deviceType: PRINT_DEVICE_TYPE},
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
    initialParams: {store: 'device', deviceType: PRINT_DEVICE_TYPE},
  },
  {
    name: 'IpCameraDetail',
    component: PrinterDeviceDetailPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Camera IP',
      showCompanyFilter: false,
    },
    initialParams: {store: 'device', deviceType: IP_CAMERA_DEVICE_TYPE},
  },
  {
    name: 'IpCameraForm',
    component: PrinterDeviceFormPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Nova Camera IP',
      showCompanyFilter: false,
    },
    initialParams: {store: 'device', deviceType: IP_CAMERA_DEVICE_TYPE},
  },
  {
    name: 'IncomeStatement',
    component: IncomeStatement,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: () => global.t?.t('configs', 'title', 'incomeStatement'),
    },
    initialParams: {store: 'invoice'},
  },
  {
    name: 'Payables',
    component: Payables,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: () => global.t?.t('configs', 'title', 'payables'),
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
    initialParams: {store: 'invoice'},
  },
  {
    name: 'Receivables',
    component: Receivables,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: () => global.t?.t('configs', 'title', 'receivables'),
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
    initialParams: {store: 'invoice'},
  },
  {
    name: 'OwnTransfers',
    component: OwnTransfers,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: () => global.t?.t('configs', 'title', 'ownTransfers'),
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
    initialParams: {store: 'invoice'},
  },
  {
    name: 'InvoiceDetailsPage',
    component: InvoiceDetailsPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Detalhe da invoice',
      showCompanyFilter: false,
    },
    initialParams: {store: 'invoice'},
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
    initialParams: {store: 'wallet'},
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
    initialParams: {store: 'categories'},
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
    initialParams: {store: 'product_inventories'},
  },
  {
    name: 'MenuCostsPage',
    component: MenuCostsPage,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Custos do Cardápio',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'MenuCostsParametersPage',
    component: MenuCostsParametersPage,
    path: 'menu-costs-page/parametros',
    options: {
      headerShown: true,
      headerBackVisible: true,
      headerBackFallback: {
        name: 'MenuCostsPage',
      },
      title: 'Premissas e rateio',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'MenuCostsIngredientsPage',
    component: MenuCostsIngredientsPage,
    path: 'menu-costs-page/ingredientes',
    options: {
      headerShown: true,
      headerBackVisible: true,
      headerBackFallback: {
        name: 'MenuCostsPage',
      },
      title: 'Ingredientes',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'MenuCostsPackagingPage',
    component: MenuCostsPackagingPage,
    path: 'menu-costs-page/embalagens',
    options: {
      headerShown: true,
      headerBackVisible: true,
      headerBackFallback: {
        name: 'MenuCostsPage',
      },
      title: 'Embalagens',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'MenuCostsResalePage',
    component: MenuCostsResalePage,
    path: 'menu-costs-page/revenda',
    options: {
      headerShown: true,
      headerBackVisible: true,
      headerBackFallback: {
        name: 'MenuCostsPage',
      },
      title: 'Revenda',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'MenuCostsSuppliersPage',
    component: MenuCostsSuppliersPage,
    path: 'menu-costs-page/fornecedores',
    options: {
      headerShown: true,
      headerBackVisible: true,
      headerBackFallback: {
        name: 'MenuCostsPage',
      },
      title: 'Fornecedores',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'MenuCostsPurchasesPage',
    component: MenuCostsPurchasesPage,
    path: 'menu-costs-page/compras-e-evidencias',
    options: {
      headerShown: true,
      headerBackVisible: true,
      headerBackFallback: {
        name: 'MenuCostsPage',
      },
      title: 'Compras e evidências',
      showCompanyFilter: true,
      companyFilterMode: 'icon',
    },
  },
  {
    name: 'Inventory',
    component: Inventory,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: () => global.t?.t('configs', 'title', 'inventory'),
    },
    initialParams: {store: 'products'},
  },
];

export default managerRoutes;
