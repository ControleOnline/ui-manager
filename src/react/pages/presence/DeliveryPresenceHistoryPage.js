/*
 * Contract imported from MODOS_OPERACAO.md
 * - History in the manager app uses the shared entity log view for the presence row.
 * - The detail screen keeps the operational controls blocked while the log remains visible.
 */

import React from 'react';
import EntityLogPage from '@controleonline/ui-common/src/react/pages/EntityLogPage';

export default function DeliveryPresenceHistoryPage(props) {
  return React.createElement(EntityLogPage, props);
}
