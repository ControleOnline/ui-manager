/*
 * @agents KPI tiles for the marketing dashboard (#46).
 * Six fixed tiles; wraps on narrow layouts.
 */
import React from 'react';
import {StyleSheet, Text, View, useWindowDimensions} from 'react-native';

export default function KpiRow({kpis, palette}) {
  const {width} = useWindowDimensions();
  const columnWidth = width < 600 ? '48%' : '15%';
  const styles = useStyles(palette, columnWidth);

  return (
    <View style={styles.row}>
      {kpis.map(kpi => (
        <View key={kpi.key} style={styles.tile}>
          <Text style={styles.label}>{kpi.label}</Text>
          <Text style={styles.value}>{String(kpi.value)}</Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = (palette, columnWidth) =>
  StyleSheet.create({
    row: {flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 10},
    tile: {
      width: columnWidth,
      minWidth: 140,
      backgroundColor: palette.panel,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 14,
    },
    label: {color: palette.muted, fontSize: 12, marginBottom: 6},
    value: {color: palette.text, fontSize: 20, fontWeight: '700'},
  });
