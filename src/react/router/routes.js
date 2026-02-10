import PurchasingSuggestion from '@controleonline/ui-orders/src/react/pages/orders/purchasing/Suggestion';
import Inventory from '@controleonline/ui-orders/src/react/pages/inventory';
import IncomeStatment from '@controleonline/ui-manager/src/react/pages/IncomeStatment';
import CashRegisters from '@controleonline/ui-manager/src/react/pages/CashRegisters';
import DisplayList from '@controleonline/ui-ppc/src/react/pages/displays/displayPage';
import DisplayDetails from '@controleonline/ui-ppc/src/react/pages/displays/DisplayDetails';
import DisplayForm from '@controleonline/ui-ppc/src/react/pages/displays/DisplayForm';
import QueueAddProducts from '@controleonline/ui-ppc/src/react/pages/queues/QueueAddProducts';

const managerRoutes = [
  {
    name: 'DisplayList',
    component: DisplayList,
    options: { headerShown: false, title: 'Displays' },
  },
  {
    name: 'DisplayDetails',
    component: DisplayDetails,
    options: { headerShown: false, title: 'Detalhes do Display' },
  },
  {
    name: 'DisplayForm',
    component: DisplayForm,
    options: { headerShown: false, title: 'Formulário de Display' },
  },
  {
    name: 'QueueAddProducts',
    component: QueueAddProducts,
    options: { headerShown: true, title: 'Produtos da Fila' },
  },
  {
    name: 'CashRegistersIndex',
    component: CashRegisters,
    options: { headerShown: false, title: 'Caixas', headerBackButtonMenuEnabled: false },
    initialParams: { store: 'invoice' },
  },
  {
    name: 'IncomeStatment',
    component: IncomeStatment,
    options: { headerShown: true, title: 'Faturamento', headerBackButtonMenuEnabled: false },
    initialParams: { store: 'invoice' },
  },
  {
    name: 'PurchasingSuggestion',
    component: PurchasingSuggestion,
    options: { headerShown: true, title: 'Sugestão de Compras', headerBackButtonMenuEnabled: false },
    initialParams: { store: 'products' },
  },
  {
    name: 'Inventory',
    component: Inventory,
    options: { headerShown: true, title: 'Estoque', headerBackButtonMenuEnabled: false },
    initialParams: { store: 'products' },
  },
];

export default managerRoutes;