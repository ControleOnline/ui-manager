import HomePage from '@controleonline/ui-manager/src/react/pages/home/index';
import ManagerLayout from '@controleonline/ui-layout/src/react/layouts/ManagerLayout';

const WrappedHomePage = ({navigation}) => (
  <ManagerLayout navigation={navigation}>
    <HomePage navigation={navigation} />
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
];

export default managerRoutes;
