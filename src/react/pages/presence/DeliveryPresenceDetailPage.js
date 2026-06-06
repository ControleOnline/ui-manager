/*
 * Contract imported from MODOS_OPERACAO.md
 * - The manager detail view is read-only and reuses the courier presence screen.
 * - All write actions stay blocked in the manager app.
 */

import React from 'react';
import DeliveryCourierPresencePage from '@controleonline/ui-logistic/src/react/pages/presence/DeliveryCourierPresencePage';

const DeliveryPresenceDetailContent = DeliveryCourierPresencePage;

export default function DeliveryPresenceDetailPage(props) {
  return <DeliveryPresenceDetailContent {...props} readOnly />;
}
