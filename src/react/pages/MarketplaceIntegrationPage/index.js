import {useLayoutEffect, useMemo} from 'react';

import Food99IntegrationPage from '@controleonline/ui-manager/src/react/pages/Food99IntegrationPage';
import IFoodIntegrationPage from '@controleonline/ui-manager/src/react/pages/IFoodIntegrationPage';

const ROUTE_PROVIDER_MAP = {
  Food99IntegrationPage: '99food',
  IFoodIntegrationPage: 'ifood',
};

const PROVIDER_LABEL_MAP = {
  '99food': '99Food',
  ifood: 'iFood',
};

const normalizeProviderKey = value =>
  String(value || '')
    .trim()
    .toLowerCase();

const resolveProviderKey = route =>
  normalizeProviderKey(
    route?.params?.providerKey ||
      route?.params?.integrationKey ||
      ROUTE_PROVIDER_MAP[route?.name] ||
      '',
  );

export default function MarketplaceIntegrationPage(props) {
  const {navigation, route} = props;

  const providerKey = useMemo(
    () => resolveProviderKey(route),
    [route?.name, route?.params?.providerKey, route?.params?.integrationKey],
  );
  const providerLabel = PROVIDER_LABEL_MAP[providerKey] || 'Marketplace';

  useLayoutEffect(() => {
    if (!navigation?.setOptions) {
      return;
    }

    navigation.setOptions({
      title: providerLabel,
    });
  }, [navigation, providerLabel]);

  if (providerKey === 'ifood') {
    return <IFoodIntegrationPage {...props} />;
  }

  return <Food99IntegrationPage {...props} />;
}
