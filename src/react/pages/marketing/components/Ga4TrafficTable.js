/*
 * @agents GA4 traffic by source/medium/campaign for the marketing dashboard (#46).
 * Groups raw rows by source + medium and sums sessions/users/conversions.
 */
import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';

export default function Ga4TrafficTable({rows, palette}) {
  const styles = useStyles(palette);
  const grouped = useMemo(() => groupRows(rows), [rows]);

  if (grouped.length === 0) {
    return (
      <Text style={styles.empty}>
        {global.t?.t('marketing', 'dashboard', 'ga4Empty', 'Nenhum dado de GA4 para o período.')}
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.row, styles.header]}>
        <Text style={[styles.cell, styles.cellSource]}>{global.t?.t('marketing', 'dashboard', 'colSource', 'Fonte / Meio')}</Text>
        <Text style={styles.cell}>{global.t?.t('marketing', 'dashboard', 'colSessions', 'Sessões')}</Text>
        <Text style={styles.cell}>{global.t?.t('marketing', 'dashboard', 'colUsers', 'Usuários')}</Text>
        <Text style={styles.cell}>{global.t?.t('marketing', 'dashboard', 'colGa4Conv', 'Conv.')}</Text>
      </View>
      {grouped.map(row => (
        <View key={row.key} style={styles.row}>
          <Text style={[styles.cell, styles.cellSource]} numberOfLines={1}>{row.label}</Text>
          <Text style={styles.cell}>{Math.round(row.sessions)}</Text>
          <Text style={styles.cell}>{Math.round(row.users)}</Text>
          <Text style={styles.cell}>{Number(row.conversions).toFixed(1)}</Text>
        </View>
      ))}
    </View>
  );
}

const groupRows = rows => {
  const bucket = {};
  rows.forEach(row => {
    const source = row?.dimensions?.sessionSource || '(direct)';
    const medium = row?.dimensions?.sessionMedium || '(none)';
    const key = source + ' / ' + medium;
    if (!bucket[key]) {
      bucket[key] = {key, label: key, sessions: 0, users: 0, conversions: 0};
    }
    bucket[key].sessions += Number(row?.metrics?.sessions || 0);
    bucket[key].users += Number(row?.metrics?.activeUsers || 0);
    bucket[key].conversions += Number(row?.metrics?.conversions || 0);
  });
  return Object.values(bucket).sort((a, b) => b.sessions - a.sessions).slice(0, 20);
};

const useStyles = palette =>
  StyleSheet.create({
    container: {backgroundColor: palette.panel, borderRadius: 10, borderWidth: 1, borderColor: palette.border, overflow: 'hidden'},
    header: {backgroundColor: palette.panel, borderBottomWidth: 1, borderBottomColor: palette.border},
    row: {flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: palette.border, alignItems: 'center'},
    cell: {flex: 1, color: palette.text, fontSize: 12, paddingHorizontal: 4},
    cellSource: {flex: 2},
    empty: {color: palette.muted, fontSize: 13, padding: 12},
  });
