/* eslint-disable no-unused-vars -- The current flat ESLint config does not mark JSX identifiers as used. */
import React from 'react';
import {Text, View} from 'react-native';
import Formatter from '@controleonline/ui-common/src/utils/formatter';

export default function MermaidDiagram({chart, styles}) {
  return (
    <View style={styles.nativeFallback}>
      <Text style={styles.statusText}>Mermaid fica disponível na versão web.</Text>
      <Text selectable style={styles.nativeCode}>{Formatter.repairMojibake(chart.mermaid)}</Text>
    </View>
  );
}
