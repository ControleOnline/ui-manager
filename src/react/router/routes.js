import HomePage from '@controleonline/ui-manager/src/react/pages/home/index';
import ManagerLayout from '@controleonline/ui-layout/src/react/layouts/ManagerLayout';
import Profile from '@controleonline/ui-people/src/react/pages/Profile';
import PurchasingSuggestion from '@controleonline/ui-orders/src/react/pages/orders/purchasing/Suggestion';
import Inventory from '@controleonline/ui-orders/src/react/pages/inventory';
import IncomeStatment from '@controleonline/ui-manager/src/react/pages/IncomeStatment';


const WrappedHomePage = ({navigation}) => (
  <ManagerLayout navigation={navigation}>
    <HomePage navigation={navigation} />
  </ManagerLayout>
);

const WrappedProfile = ({navigation, route}) => (
  <ManagerLayout navigation={navigation} route={route}>
    <Profile navigation={navigation} route={route} />
  </ManagerLayout>
);

const WrappedPurchasingSuggestion = ({navigation, route}) => (
  <ManagerLayout navigation={navigation} route={route}>
    <PurchasingSuggestion navigation={navigation} route={route} />
  </ManagerLayout>
);

const WrappedIncomeStatment = ({navigation, route}) => (
  <ManagerLayout navigation={navigation} route={route}>
    <IncomeStatment navigation={navigation} route={route} />
  </ManagerLayout>
);


const WrappedInventory = ({navigation, route}) => (
  <ManagerLayout navigation={navigation} route={route}>
    <Inventory navigation={navigation} route={route} />
  </ManagerLayout>
);

const managerRoutes = [
  {
    name: 'HomePage',
    component: WrappedHomePage,
    options: {
      headerShown: false,
      title: 'Menu',
    },
  },
  {
    name: 'ProfilePage',
    component: WrappedProfile,
    options: {
      headerShown: false,
      title: 'Perfil',
      headerBackButtonMenuEnabled: false,
    },
    initialParams: {store: 'auth'},
  },
  {
    name: 'IncomeStatment',
    component: WrappedIncomeStatment,
    options: {
      headerShown: true,
      title: 'Faturamento',
      headerBackButtonMenuEnabled: false,
    },
    initialParams: {store: 'invoice'},
  },
  {
    name: 'PurchasingSuggestion',
    component: WrappedPurchasingSuggestion,
    options: {
      headerShown: true,
      title: 'Sugestão de Compras',
      headerBackButtonMenuEnabled: false,
    },
    initialParams: {store: 'products'},
  },
  {
    name: 'Inventory',
    component: WrappedInventory,
    options: {
      headerShown: true,
      title: 'Estoque',
      headerBackButtonMenuEnabled: false,
    },
    initialParams: {store: 'products'},
  },
];

export default managerRoutes;
