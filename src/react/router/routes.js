import HomePage from '@controleonline/ui-manager/src/react/pages/home/index';
import ManagerLayout from '@controleonline/ui-layout/src/react/layouts/ManagerLayout';
import Profile from '@controleonline/ui-people/src/react/pages/Profile';
import PurchasingSuggestion from '@controleonline/ui-orders/src/react/pages/orders/purchasing/Suggestion';
import Inventory from '@controleonline/ui-orders/src/react/pages/inventory';
import IncomeStatment from '@controleonline/ui-manager/src/react/pages/IncomeStatment';
import CashRegisters from '@controleonline/ui-manager/src/react/pages/CashRegisters';
import DisplayList from '@controleonline/ui-ppc/src/react/pages/displays/displayPage';
import DisplayDetails from '@controleonline/ui-ppc/src/react/pages/displays/DisplayDetails';
import DisplayForm from '@controleonline/ui-ppc/src/react/pages/displays/DisplayForm';

const WrappedComponent = (Component) => ({ navigation, route }) => (
  <ManagerLayout navigation={navigation} route={route}>
    <Component navigation={navigation} route={route} />
  </ManagerLayout>
);

const managerRoutes = [
  {
    name: 'HomePage',
    component: WrappedComponent(HomePage),
    options: { headerShown: false, title: 'Menu' },
  },
  {
    name: 'DisplayList',
    component: WrappedComponent(DisplayList),
    options: { headerShown: false, title: 'Displays' },
  },
  {
    name: 'DisplayDetails',
    component: WrappedComponent(DisplayDetails),
    options: { headerShown: false, title: 'Detalhes do Display' },
  },
  {
    name: 'DisplayForm',
    component: WrappedComponent(DisplayForm),
    options: { headerShown: false, title: 'Formulário de Display' },
  },
  {
    name: 'CashRegistersIndex',
    component: WrappedComponent(CashRegisters),
    options: { headerShown: false, title: 'Caixas', headerBackButtonMenuEnabled: false },
    initialParams: { store: 'invoice' },
  },
  {
    name: 'ProfilePage',
    component: WrappedComponent(Profile),
    options: { headerShown: false, title: 'Perfil', headerBackButtonMenuEnabled: false },
    initialParams: { store: 'auth' },
  },
  {
    name: 'IncomeStatment',
    component: WrappedComponent(IncomeStatment),
    options: { headerShown: true, title: 'Faturamento', headerBackButtonMenuEnabled: false },
    initialParams: { store: 'invoice' },
  },
  {
    name: 'PurchasingSuggestion',
    component: WrappedComponent(PurchasingSuggestion),
    options: { headerShown: true, title: 'Sugestão de Compras', headerBackButtonMenuEnabled: false },
    initialParams: { store: 'products' },
  },
  {
    name: 'Inventory',
    component: WrappedComponent(Inventory),
    options: { headerShown: true, title: 'Estoque', headerBackButtonMenuEnabled: false },
    initialParams: { store: 'products' },
  },
];

export default managerRoutes;
