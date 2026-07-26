/* eslint-disable no-unused-vars -- The current flat ESLint config does not mark JSX identifiers as used. */
import React from 'react';
import {Text, TextInput, View} from 'react-native';

export default function FlowchartVisualEditor({
  draftMermaid,
  onMermaidChange,
  palette,
  styles,
}) {
  return (
    <View style={styles.editorPanel}>
      <Text style={styles.editorTitle}>Editor visual disponível na versão web.</Text>
      <TextInput
        multiline
        onChangeText={onMermaidChange}
        placeholder="flowchart TD"
        placeholderTextColor={palette.textSecondary}
        style={[styles.editorInput, styles.editorCode]}
        textAlignVertical="top"
        value={draftMermaid}
      />
    </View>
  );
}
