import PurchasingSuggestion from '@controleonline/ui-orders/src/react/pages/orders/purchasing/Suggestion';
import Inventory from '@controleonline/ui-orders/src/react/pages/inventory';

import IncomeStatement from '@controleonline/ui-financial/src/react/pages/reports/IncomeStatement';
import Payables from '@controleonline/ui-financial/src/react/pages/Payables';
import Receivables from '@controleonline/ui-financial/src/react/pages/Receivables';

import CashRegisters from '@controleonline/ui-manager/src/react/pages/CashRegisters';
import DisplayList from '@controleonline/ui-ppc/src/react/pages/displays/displayPage';
import DisplayDetails from '@controleonline/ui-ppc/src/react/pages/displays/DisplayDetails';
import DisplayForm from '@controleonline/ui-ppc/src/react/pages/displays/DisplayForm';
import QueueAddProducts from '@controleonline/ui-ppc/src/react/pages/queues/QueueAddProducts';

const managerRoutes = [
  {
    name: 'DisplayList',
    component: DisplayList,
    options: {
      headerShown: false,
      headerBackVisible: false,
      title: 'Displays',
      showToolBar: true,
      showCompanyFilter: true,
    },
  },
  {
    name: 'DisplayDetails',
    component: DisplayDetails,
    options: {
      headerShown: false,
      headerBackVisible: false,
      title: 'Detalhes do Display',
    },
  },
  {
    name: 'DisplayForm',
    component: DisplayForm,
    options: {
      headerShown: false,
      headerBackVisible: false,
      title: 'Formulário de Display',
    },
  },
  {
    name: 'QueueAddProducts',
    component: QueueAddProducts,
    options: {
      headerShown: true,
      headerBackVisible: false,
      title: 'Produtos da Fila',
    },
  },
  {
    name: 'CashRegistersIndex',
    component: CashRegisters,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Caixas',
    },
    initialParams: { store: 'invoice' },
  },
  {
    name: 'IncomeStatement',
    component: IncomeStatement,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Faturamento',
    },
    initialParams: { store: 'invoice' },
  },
  {
    name: 'Payables',
    component: Payables,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Contas a Pagar',
    },
    initialParams: { store: 'invoice' },
  },
  {
    name: 'Receivables',
    component: Receivables,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Contas a Receber',
    },
    initialParams: { store: 'invoice' },
  },
  {
    name: 'PurchasingSuggestion',
    component: PurchasingSuggestion,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Sugestão de Compras',
    },
    initialParams: { store: 'products' },
  },
  {
    name: 'Inventory',
    component: Inventory,
    options: {
      headerShown: true,
      headerBackVisible: true,
      title: 'Estoque',
    },
    initialParams: { store: 'products' },
  },
];

export default managerRoutes;