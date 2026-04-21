import React, {useMemo} from 'react';

import AddProductScreen from '@controleonline/ui-orders/src/react/pages/checkout/AddProductScreen';

export default function PdvPage({navigation, route}) {
  const pdvRoute = useMemo(
    () => ({
      ...route,
      params: {
        ...(route?.params || {}),
        interactionMode: 'pdv',
      },
    }),
    [route],
  );

  return <AddProductScreen navigation={navigation} route={pdvRoute} />;
}
