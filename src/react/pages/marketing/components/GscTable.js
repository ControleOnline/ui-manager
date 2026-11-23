/*
 * @agents Top queries from Google Search Console (#48).
 * Rows come from /marketing/search-console/report already shaped as
 * {<dimensions>, clicks, impressions, ctr, position}.
 */
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

export default function GscTable({rows, palette}) {
  const styles = useStyles(palette);

  if (rows.length === 0) {
    return (
      <Text style={styles.empty}>
        {global.t?.t('marketing', 'dashboard', 'gscEmpty', 'Nenhum dado de Search Console para o período.')}
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.row, styles.header]}>
        <Text style={[styles.cell, styles.cellQuery]}>{global.t?.t('marketing', 'dashboard', 'colQuery', 'Consulta')}</Text>
        <Text style={styles.cell}>{global.t?.t('marketing', 'dashboard', 'colClicks', 'Cliques')}</Text>
        <Text style={styles.cell}>{global.t?.t('marketing', 'dashboard', 'colImpressionsShort', 'Impr.')}</Text>
        <Text style={styles.cell}>{global.t?.t('marketing', 'dashboard', 'colCtr', 'CTR')}</Text>
        <Text style={styles.cell}>{global.t?.t('marketing', 'dashboard', 'colPosition', 'Pos.')}</Text>
      </View>
      {rows.slice(0, 20).map((row, index) => (
        <View key={index} style={styles.row}>
          <Text style={[styles.cell, styles.cellQuery]} numberOfLines={1}>
            {String(row.query || row.page || row.device || row.country || '—')}
          </Text>
          <Text style={styles.cell}>{Number(row.clicks || 0)}</Text>
          <Text style={styles.cell}>{Number(row.impressions || 0)}</Text>
          <Text style={styles.cell}>{(Number(row.ctr || 0) * 100).toFixed(1) + '%'}</Text>
          <Text style={styles.cell}>{Number(row.position || 0).toFixed(1)}</Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = palette =>
  StyleSheet.create({
    container: {backgroundColor: palette.panel, borderRadius: 10, borderWidth: 1, borderColor: palette.border, overflow: 'hidden'},
    header: {backgroundColor: palette.panel, borderBottomWidth: 1, borderBottomColor: palette.border},
    row: {flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: palette.border, alignItems: 'center'},
    cell: {flex: 1, color: palette.text, fontSize: 12, paddingHorizontal: 4},
    cellQuery: {flex: 3},
    empty: {color: palette.muted, fontSize: 13, padding: 12},
  });
