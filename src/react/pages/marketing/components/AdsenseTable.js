/*
 * @agents AdSense revenue table for the marketing dashboard (#46).
 * Columns come from the API header map; rows are raw cell strings.
 */
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

export default function AdsenseTable({rows, headers, palette}) {
  const styles = useStyles(palette);
  const columns = Object.keys(headers || {});

  if (rows.length === 0 || columns.length === 0) {
    return (
      <Text style={styles.empty}>
        {global.t?.t('marketing', 'dashboard', 'adsenseEmpty', 'Nenhum dado de AdSense para o período.')}
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.row, styles.header]}>
        {columns.map(column => (
          <Text key={column} style={styles.cell}>{column}</Text>
        ))}
      </View>
      {rows.slice(0, 50).map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((cell, cellIndex) => (
            <Text key={cellIndex} style={styles.cell} numberOfLines={1}>{String(cell)}</Text>
          ))}
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
    empty: {color: palette.muted, fontSize: 13, padding: 12},
  });
