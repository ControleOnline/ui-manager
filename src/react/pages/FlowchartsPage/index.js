/* eslint-disable no-unused-vars -- The current flat ESLint config does not mark JSX identifiers as used. */
import React, {useMemo, useState} from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import {useStore} from '@store';
import {app_type_base} from '@appType';
import {resolveThemePalette, withOpacity} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import {ADMIN_FLOWCHARTS} from './flowcharts';
import MermaidDiagram from './MermaidDiagram';
import {createStyles} from './index.styles';

const buildPalette = basePalette => ({
  ...basePalette,
  activeBackground: withOpacity(basePalette.primary, 0.1),
  cardBackground: basePalette.white,
  cardBorder: basePalette.border,
  codeBackground: withOpacity(basePalette.text, 0.04),
  diagramBackground: basePalette.white,
  iconBackground: withOpacity(basePalette.primary, 0.12),
});

export default function FlowchartsPage() {
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');
  const {colors: themeColors = {}} = themeStore.getters || {};
  const {currentCompany = {}, defaultCompany = {}} = peopleStore.getters || {};
  const company = currentCompany?.id ? currentCompany : defaultCompany;

  const palette = useMemo(
    () =>
      buildPalette(
        resolveThemePalette(
          {...themeColors, ...(company?.theme?.colors || {})},
          colors,
        ),
      ),
    [company?.id, company?.theme?.colors, themeColors],
  );
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [activeFlowId, setActiveFlowId] = useState(ADMIN_FLOWCHARTS[0]?.id || '');
  const activeFlow = useMemo(
    () =>
      ADMIN_FLOWCHARTS.find(flow => flow.id === activeFlowId) ||
      ADMIN_FLOWCHARTS[0],
    [activeFlowId],
  );
  const isAdminApp = app_type_base === 'ADMIN';

  if (!isAdminApp) {
    return (
      <SafeAreaView style={[styles.safeArea, {backgroundColor: palette.background}]} edges={['bottom']}>
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>Rota disponível somente no APP_TYPE ADMIN.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, {backgroundColor: palette.background}]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <Text style={styles.pageTitle}>Fluxogramas</Text>
            <Text style={styles.pageSubtitle}>{activeFlow?.summary}</Text>
          </View>
          <View style={styles.badge}>
            <Icon name="shield" size={13} color={palette.primary} />
            <Text style={styles.badgeText}>ADMIN</Text>
          </View>
        </View>

        <View style={styles.shell}>
          <View style={styles.sidebar}>
            <Text style={styles.sidebarTitle}>Fluxos</Text>
            {ADMIN_FLOWCHARTS.map(flow => {
              const active = flow.id === activeFlow?.id;

              return (
                <Pressable
                  accessibilityRole="button"
                  key={flow.id}
                  onPress={() => setActiveFlowId(flow.id)}
                  style={({pressed}) => [
                    styles.flowButton,
                    active && styles.flowButtonActive,
                    pressed && {backgroundColor: withOpacity(palette.primary, 0.08)},
                  ]}
                >
                  <View style={styles.flowIcon}>
                    <Icon name="git-branch" size={16} color={palette.primary} />
                  </View>
                  <View style={styles.flowTextWrap}>
                    <Text numberOfLines={2} style={styles.flowTitle}>{flow.title}</Text>
                    <Text numberOfLines={3} style={styles.flowSummary}>{flow.summary}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.main}>
            <View style={styles.diagramFrame}>
              <ScrollView
                horizontal
                style={styles.diagramScroll}
                contentContainerStyle={styles.diagramScrollContent}
                showsHorizontalScrollIndicator
                showsVerticalScrollIndicator
              >
                {activeFlow ? (
                  <MermaidDiagram chart={activeFlow} palette={palette} styles={styles} />
                ) : null}
              </ScrollView>
            </View>

            {activeFlow?.checkpoints?.length ? (
              <View style={styles.checkpointList}>
                {activeFlow.checkpoints.map(checkpoint => (
                  <View key={checkpoint} style={styles.checkpointRow}>
                    <View style={styles.checkpointBullet} />
                    <Text style={styles.checkpointText}>{checkpoint}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
