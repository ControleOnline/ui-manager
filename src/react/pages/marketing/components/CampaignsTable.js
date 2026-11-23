/*
 * @agents Google Ads campaigns table with inline pause/resume actions (#46).
 * Report rows are joined by campaign_id to show impressions, cost, conv.
 */
import React, {useCallback, useMemo} from 'react';
import {Alert, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

import {api} from '@controleonline/ui-common/src/api';

const formatMicros = micros => (Number(micros || 0) / 1_000_000).toFixed(2);

export default function CampaignsTable({campaigns, reportRows, companyId, onMutated, palette}) {
  const styles = useStyles(palette);
  const aggregates = useMemo(() => aggregateReport(reportRows), [reportRows]);

  const mutate = useCallback(
    async (campaignId, action) => {
      try {
        await api.fetch(`/marketing/ads/campaigns/${campaignId}/${action}`, {
          method: 'POST',
          params: {people: '/people/' + companyId},
        });
        if (typeof onMutated === 'function') onMutated();
      } catch (err) {
        Alert.alert(String(err?.message || err));
      }
    },
    [companyId, onMutated],
  );

  if (campaigns.length === 0) {
    return (
      <Text style={styles.empty}>
        {global.t?.t('marketing', 'dashboard', 'adsEmpty', 'Nenhuma campanha visível para esta empresa.')}
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.row, styles.header]}>
        <Text style={[styles.cell, styles.cellName]}>{global.t?.t('marketing', 'dashboard', 'colName', 'Campanha')}</Text>
        <Text style={styles.cell}>{global.t?.t('marketing', 'dashboard', 'colStatus', 'Status')}</Text>
        <Text style={styles.cell}>{global.t?.t('marketing', 'dashboard', 'colImpressions', 'Impressões')}</Text>
        <Text style={styles.cell}>{global.t?.t('marketing', 'dashboard', 'colClicks', 'Cliques')}</Text>
        <Text style={styles.cell}>{global.t?.t('marketing', 'dashboard', 'colCost', 'Custo')}</Text>
        <Text style={styles.cell}>{global.t?.t('marketing', 'dashboard', 'colConversions', 'Conv.')}</Text>
        <Text style={[styles.cell, styles.cellActions]} />
      </View>

      {campaigns.map(campaign => {
        const agg = aggregates[campaign.id] || {impressions: 0, clicks: 0, cost_micros: 0, conversions: 0};
        const isPaused = campaign.status === 'PAUSED';
        return (
          <View key={campaign.id} style={styles.row}>
            <Text style={[styles.cell, styles.cellName]} numberOfLines={2}>{campaign.name}</Text>
            <Text style={styles.cell}>{campaign.status}</Text>
            <Text style={styles.cell}>{agg.impressions}</Text>
            <Text style={styles.cell}>{agg.clicks}</Text>
            <Text style={styles.cell}>{formatMicros(agg.cost_micros)}</Text>
            <Text style={styles.cell}>{Number(agg.conversions).toFixed(1)}</Text>
            <View style={[styles.cell, styles.cellActions]}>
              <TouchableOpacity
                onPress={() => mutate(campaign.id, isPaused ? 'resume' : 'pause')}
                style={styles.actionButton}>
                <Text style={styles.actionText}>
                  {isPaused
                    ? global.t?.t('marketing', 'dashboard', 'resume', 'Retomar')
                    : global.t?.t('marketing', 'dashboard', 'pause', 'Pausar')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const aggregateReport = rows => {
  const out = {};
  rows.forEach(row => {
    const id = String(row.campaign_id || '');
    if (!id) return;
    if (!out[id]) out[id] = {impressions: 0, clicks: 0, cost_micros: 0, conversions: 0};
    out[id].impressions += Number(row.impressions || 0);
    out[id].clicks += Number(row.clicks || 0);
    out[id].cost_micros += Number(row.cost_micros || 0);
    out[id].conversions += Number(row.conversions || 0);
  });
  return out;
};

const useStyles = palette =>
  StyleSheet.create({
    container: {backgroundColor: palette.panel, borderRadius: 10, borderWidth: 1, borderColor: palette.border, overflow: 'hidden'},
    header: {backgroundColor: palette.panel, borderBottomWidth: 1, borderBottomColor: palette.border},
    row: {flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: palette.border, alignItems: 'center'},
    cell: {flex: 1, color: palette.text, fontSize: 12, paddingHorizontal: 4},
    cellName: {flex: 2},
    cellActions: {flex: 1, alignItems: 'flex-end'},
    actionButton: {paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: palette.border},
    actionText: {color: palette.text, fontSize: 11, fontWeight: '600'},
    empty: {color: palette.muted, fontSize: 13, padding: 12},
  });
