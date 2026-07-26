/* eslint-disable no-unused-vars -- The current flat ESLint config does not mark JSX identifiers as used. */
import React, {useEffect, useState} from 'react';
import {Text, View} from 'react-native';
import mermaid from 'mermaid';

export const buildMermaidThemeVariables = palette => ({
  background: palette.diagramBackground,
  clusterBkg: palette.diagramBackground,
  clusterBorder: palette.cardBorder,
  edgeLabelBackground: palette.diagramBackground,
  fontFamily: 'Inter, Arial, sans-serif',
  lineColor: palette.text,
  mainBkg: palette.diagramBackground,
  nodeBorder: palette.text,
  primaryBorderColor: palette.text,
  primaryColor: palette.diagramBackground,
  primaryTextColor: palette.text,
  secondaryBorderColor: palette.primary,
  secondaryColor: palette.activeBackground,
  secondaryTextColor: palette.text,
  tertiaryColor: palette.diagramBackground,
});

export default function MermaidDiagram({chart, palette, styles}) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      setError('');
      setSvg('');

      try {
        mermaid.initialize({
          flowchart: {
            curve: 'linear',
            htmlLabels: true,
            nodeSpacing: 36,
            rankSpacing: 48,
          },
          securityLevel: 'strict',
          startOnLoad: false,
          theme: 'base',
          themeVariables: buildMermaidThemeVariables(palette),
        });

        const rendered = await mermaid.render(
          `admin-flowchart-${chart.id}-${Date.now()}`,
          chart.mermaid,
        );

        if (!cancelled) {
          setSvg(rendered.svg || '');
        }
      } catch (renderError) {
        if (!cancelled) {
          setError(String(renderError?.message || renderError || 'Mermaid render error'));
        }
      }
    };

    void render();

    return () => {
      cancelled = true;
    };
  }, [chart.id, chart.mermaid, palette]);

  if (error) {
    return (
      <View style={styles.statusBox}>
        <Text style={styles.statusText}>{error}</Text>
      </View>
    );
  }

  if (!svg) {
    return (
      <View style={styles.statusBox}>
        <Text style={styles.statusText}>Carregando fluxograma...</Text>
      </View>
    );
  }

  return (
    <div
      aria-label={chart.title}
      style={{
        minHeight: 520,
        minWidth: 1040,
      }}
      dangerouslySetInnerHTML={{__html: svg}}
    />
  );
}
