import React from 'react';

import Food99CatalogTab from '../../Food99IntegrationPage/components/Food99CatalogTab';

// Aba de cardápio do iFood, renderizada pelo mesmo componente compartilhado.
export default function IFoodCatalogTab(props) {
  return <Food99CatalogTab {...props} providerKey="ifood" />;
}
