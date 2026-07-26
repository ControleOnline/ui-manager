/* eslint-disable no-unused-vars -- The current flat ESLint config does not mark JSX identifiers as used. */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import {useStore} from '@store';
import {app_type_base} from '@appType';
import {resolveThemePalette, withOpacity} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import {APP_ENV} from '../../../../../../../config/env';
import {resolveAppDomain} from '@controleonline/ui-common/src/utils/appDomain';
import FlowchartVisualEditor from './FlowchartVisualEditor';
import MermaidDiagram from './MermaidDiagram';
import {createStyles} from './index.styles';

const NEW_FLOW_ID = '__new-flowchart__';
const DEFAULT_NEW_MERMAID = `flowchart TD
  start["Novo fluxo"] --> step["Edite o Mermaid"]
  step --> done["Salvar no tenant"]`;

const buildPalette = basePalette => ({
  ...basePalette,
  activeBackground: withOpacity(basePalette.primary, 0.1),
  cardBackground: basePalette.white,
  cardBorder: basePalette.border,
  codeBackground: withOpacity(basePalette.text, 0.04),
  diagramBackground: basePalette.white,
  iconBackground: withOpacity(basePalette.primary, 0.12),
});

const normalizeFlowId = flow => String(flow?.id || flow?.flowKey || flow?.flow_key || '');

const buildFlowKey = title => {
  const slug = String(title || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${slug || 'fluxo'}-${Date.now()}`;
};

const normalizeFlowcharts = flowcharts =>
  (Array.isArray(flowcharts) ? flowcharts : [])
    .filter(flow => flow && flow.enabled !== false)
    .sort((a, b) => {
      const sortA = Number(a.sortOrder ?? a.sort_order ?? 0);
      const sortB = Number(b.sortOrder ?? b.sort_order ?? 0);

      if (sortA !== sortB) {
        return sortA - sortB;
      }

      return String(a.title || '').localeCompare(String(b.title || ''));
    });

export default function FlowchartsPage() {
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');
  const flowchartsStore = useStore('flowcharts');
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
  const isAdminApp = app_type_base === 'ADMIN';
  const flowcharts = useMemo(
    () => normalizeFlowcharts(flowchartsStore.getters?.items),
    [flowchartsStore.getters?.items],
  );
  const [activeFlowId, setActiveFlowId] = useState('');
  const activeFlow = useMemo(
    () =>
      flowcharts.find(flow => normalizeFlowId(flow) === activeFlowId) ||
      flowcharts[0] ||
      null,
    [activeFlowId, flowcharts],
  );
  const [draftTitle, setDraftTitle] = useState('');
  const [draftSummary, setDraftSummary] = useState('');
  const [draftMermaid, setDraftMermaid] = useState('');
  const [isCreatingFlow, setIsCreatingFlow] = useState(false);
  const [isEditingFlow, setIsEditingFlow] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [saveError, setSaveError] = useState('');
  const isLoading = Boolean(flowchartsStore.getters?.isLoading);
  const isSaving = Boolean(flowchartsStore.getters?.isSaving);
  const loadError = flowchartsStore.getters?.error;

  useEffect(() => {
    if (!isAdminApp) {
      return;
    }

    flowchartsStore.actions
      .getItems({
        'app-domain': resolveAppDomain(APP_ENV.DOMAIN),
        appType: 'ADMIN',
        enabled: 1,
        'order[sortOrder]': 'asc',
        'order[title]': 'asc',
      })
      .catch(() => undefined);
  }, [flowchartsStore.actions, isAdminApp]);

  useEffect(() => {
    if (!flowcharts.length) {
      if (!isCreatingFlow) {
        setActiveFlowId('');
      }
      return;
    }

    if (!isCreatingFlow && !flowcharts.some(flow => normalizeFlowId(flow) === activeFlowId)) {
      setActiveFlowId(normalizeFlowId(flowcharts[0]));
    }
  }, [activeFlowId, flowcharts, isCreatingFlow]);

  useEffect(() => {
    if (isCreatingFlow) {
      return;
    }

    setDraftTitle(activeFlow?.title || '');
    setDraftSummary(activeFlow?.summary || '');
    setDraftMermaid(activeFlow?.mermaid || '');
    setSaveStatus('');
    setSaveError('');
  }, [activeFlow?.id, activeFlow?.flowKey, isCreatingFlow]);

  const previewFlow = useMemo(
    () =>
      isCreatingFlow
        ? {
            id: NEW_FLOW_ID,
            title: draftTitle || 'Novo fluxo',
            summary: draftSummary,
            mermaid: draftMermaid,
          }
        : activeFlow
        ? {
            ...activeFlow,
            id: activeFlow.id || activeFlow.flowKey,
            title: draftTitle,
            summary: draftSummary,
            mermaid: draftMermaid,
          }
        : null,
    [activeFlow, draftMermaid, draftSummary, draftTitle, isCreatingFlow],
  );
  const hasChanges = Boolean(
    isCreatingFlow ||
      (activeFlow &&
      (draftTitle !== (activeFlow.title || '') ||
        draftSummary !== (activeFlow.summary || '') ||
          draftMermaid !== (activeFlow.mermaid || ''))),
  );

  const handleNewFlow = useCallback(() => {
    setIsCreatingFlow(true);
    setIsEditingFlow(true);
    setActiveFlowId(NEW_FLOW_ID);
    setDraftTitle('Novo fluxo');
    setDraftSummary('');
    setDraftMermaid(DEFAULT_NEW_MERMAID);
    setSaveStatus('');
    setSaveError('');
  }, []);

  const handleSave = useCallback(async () => {
    if ((!activeFlow && !isCreatingFlow) || isSaving) {
      return;
    }

    setSaveStatus('');
    setSaveError('');

    try {
      const baseFlow = isCreatingFlow ? {} : activeFlow;
      const nextTitle = draftTitle.trim() || baseFlow.title || 'Fluxograma';
      const saved = await flowchartsStore.actions.save({
        id: baseFlow.id,
        appType: baseFlow.appType || 'ADMIN',
        checkpoints: Array.isArray(baseFlow.checkpoints) ? baseFlow.checkpoints : [],
        enabled: baseFlow.enabled !== false,
        flowKey: baseFlow.flowKey || baseFlow.flow_key || buildFlowKey(nextTitle),
        mermaid: draftMermaid,
        sortOrder: Number(baseFlow.sortOrder ?? baseFlow.sort_order ?? flowcharts.length + 1),
        summary: draftSummary,
        title: nextTitle,
      });

      setIsCreatingFlow(false);
      setIsEditingFlow(false);
      setActiveFlowId(normalizeFlowId(saved));
      setSaveStatus('Fluxograma salvo.');
    } catch (error) {
      setSaveError(String(error?.message || error || 'Falha ao salvar fluxograma.'));
    }
  }, [
    activeFlow,
    draftMermaid,
    draftSummary,
    draftTitle,
    flowcharts.length,
    flowchartsStore.actions,
    isCreatingFlow,
    isSaving,
  ]);

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
            <Text style={styles.pageSubtitle}>{draftSummary || activeFlow?.summary || ''}</Text>
          </View>
          <View style={styles.badge}>
            <Icon name="shield" size={13} color={palette.primary} />
            <Text style={styles.badgeText}>ADMIN</Text>
          </View>
        </View>

        <View style={styles.shell}>
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>Fluxos</Text>
              <Pressable
                accessibilityRole="button"
                onPress={handleNewFlow}
                style={({pressed}) => [
                  styles.newFlowButton,
                  pressed && {backgroundColor: withOpacity(palette.primary, 0.08)},
                ]}
              >
                <Icon name="plus" size={15} color={palette.primary} />
                <Text style={styles.newFlowButtonText}>Novo</Text>
              </Pressable>
            </View>
            {isLoading && !flowcharts.length ? (
              <View style={styles.sidebarStatus}>
                <Text style={styles.statusText}>Carregando fluxogramas...</Text>
              </View>
            ) : null}
            {!isLoading && !flowcharts.length ? (
              <View style={styles.sidebarStatus}>
                <Text style={styles.statusText}>Nenhum fluxo carregado neste tenant.</Text>
              </View>
            ) : null}
            {isCreatingFlow ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setActiveFlowId(NEW_FLOW_ID)}
                style={[styles.flowButton, styles.flowButtonActive]}
              >
                <View style={styles.flowIcon}>
                  <Icon name="plus" size={16} color={palette.primary} />
                </View>
                <View style={styles.flowTextWrap}>
                  <Text numberOfLines={2} style={styles.flowTitle}>{draftTitle || 'Novo fluxo'}</Text>
                  <Text numberOfLines={3} style={styles.flowSummary}>Rascunho ainda não salvo.</Text>
                </View>
              </Pressable>
            ) : null}
            {flowcharts.map(flow => {
              const active = normalizeFlowId(flow) === normalizeFlowId(activeFlow);

              return (
                <Pressable
                  accessibilityRole="button"
                  key={normalizeFlowId(flow)}
                  onPress={() => {
                    setIsCreatingFlow(false);
                    setIsEditingFlow(false);
                    setActiveFlowId(normalizeFlowId(flow));
                  }}
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
            {loadError ? (
              <View style={styles.statusStrip}>
                <Text style={styles.errorText}>{String(loadError)}</Text>
              </View>
            ) : null}

            {previewFlow && isEditingFlow ? (
              <FlowchartVisualEditor
                draftMermaid={draftMermaid}
                draftSummary={draftSummary}
                draftTitle={draftTitle}
                hasChanges={hasChanges}
                isSaving={isSaving}
                onMermaidChange={setDraftMermaid}
                onSave={handleSave}
                onSummaryChange={setDraftSummary}
                onTitleChange={setDraftTitle}
                palette={palette}
                saveError={saveError}
                saveStatus={saveStatus}
                styles={styles}
              />
            ) : null}

            {previewFlow && !isEditingFlow ? (
              <View style={styles.diagramFrame}>
                <View style={styles.readOnlyHeader}>
                  <View style={styles.titleWrap}>
                    <Text style={styles.editorTitle}>{previewFlow.title}</Text>
                    <Text style={styles.pageSubtitle}>{previewFlow.summary}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setIsEditingFlow(true)}
                    style={({pressed}) => [
                      styles.saveButton,
                      pressed && {backgroundColor: withOpacity(palette.primary, 0.82)},
                    ]}
                  >
                    <Icon name="edit-2" size={14} color={palette.white} />
                    <Text style={styles.saveButtonText}>Editar</Text>
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  style={styles.diagramScroll}
                  contentContainerStyle={styles.diagramScrollContent}
                  showsHorizontalScrollIndicator
                >
                  <MermaidDiagram chart={previewFlow} palette={palette} styles={styles} />
                </ScrollView>
              </View>
            ) : null}

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
