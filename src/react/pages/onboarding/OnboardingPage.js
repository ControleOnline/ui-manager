import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { useStore } from '@store';
import { canAccessOnboarding } from './onboardingPermissions';
import { loadDraft, saveDraft, createEmptyDraft } from './onboardingDraft';
import { buildJourney, capabilityStatusForDraft } from './onboardingJourney';
import { createOnboardingStyles } from './onboarding.styles';

const STEPS = [
  { id: 'establishment', title: 'Estabelecimento' },
  { id: 'activity', title: 'Atividade' },
  { id: 'operations', title: 'Operação' },
  { id: 'floor', title: 'Salão' },
  { id: 'team', title: 'Equipe' },
  { id: 'catalog', title: 'Cardápio' },
  { id: 'summary', title: 'Jornada' },
];

function ToggleRow({ label, value, onValueChange, styles }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch value={!!value} onValueChange={onValueChange} />
    </View>
  );
}

/**
 * Manager company onboarding — local draft only (no ERP writes).
 * Route: /manager/onboarding (path: onboarding).
 */
export default function OnboardingPage({ navigation }) {
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');
  const authStore = useStore('auth');

  const colors = themeStore?.getters?.colors || {};
  const styles = useMemo(() => createOnboardingStyles(colors), [colors]);
  const currentCompany = peopleStore?.getters?.currentCompany;
  const user = authStore?.getters?.user;

  const access = useMemo(
    () => canAccessOnboarding(user, currentCompany),
    [user, currentCompany],
  );

  const companyId = currentCompany?.id;
  const userId = user?.id ?? user?.username;

  const [draft, setDraft] = useState(() => createEmptyDraft());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!access.allowed) return;
    const next = loadDraft(companyId, userId);
    setDraft(next);
    setLoaded(true);
  }, [access.allowed, companyId, userId]);

  const persist = useCallback(
    (next) => {
      setDraft(next);
      saveDraft(companyId, userId, next);
    },
    [companyId, userId],
  );

  const setStep = (step) => persist({ ...draft, step });

  const patch = (section, field, value) => {
    persist({
      ...draft,
      [section]: {
        ...(draft[section] || {}),
        [field]: value,
      },
    });
  };

  const journey = useMemo(() => buildJourney(draft), [draft]);
  const capabilities = useMemo(() => capabilityStatusForDraft(draft), [draft]);

  if (!access.allowed) {
    return (
      <View style={styles.denied} testID="onboarding-denied">
        <Text style={styles.deniedTitle}>Acesso restrito</Text>
        <Text style={styles.muted}>
          O onboarding está disponível apenas para proprietário, diretor ou gestor da
          empresa. ROLE_SUPER pode pré-visualizar quando houver contexto de empresa.
        </Text>
        <TouchableOpacity
          style={[styles.button, { marginTop: 16, maxWidth: 200 }]}
          onPress={() => navigation?.goBack?.()}
        >
          <Text style={styles.buttonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!loaded) {
    return (
      <View style={styles.root}>
        <Text style={styles.muted}>Carregando rascunho local…</Text>
      </View>
    );
  }

  const step = Math.min(Math.max(draft.step || 0, 0), STEPS.length - 1);

  const statusStyle = (status) => {
    if (status === 'available') return styles.statusAvailable;
    if (status === 'evolving') return styles.statusEvolving;
    return styles.statusNot;
  };

  const statusLabel = (status) => {
    if (status === 'available') return 'Contratada / disponível';
    if (status === 'evolving') return 'Em evolução';
    return 'Não contratada';
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 32 }} testID="onboarding-root">
      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          Este onboarding é um diagnóstico local. Nada é gravado no ERP, banco ou API
          nesta fase — apenas rascunho no dispositivo (empresa + usuário).
        </Text>
      </View>

      {access.mode === 'preview' ? (
        <View style={styles.previewBadge}>
          <Text style={styles.previewBadgeText}>Pré-visualização ROLE_SUPER</Text>
        </View>
      ) : null}

      <Text style={styles.title}>Onboarding da empresa</Text>
      <Text style={styles.subtitle}>
        {currentCompany?.name || currentCompany?.alias || 'Empresa atual'} — cockpit de
        implantação
      </Text>

      <View style={styles.stepTabs}>
        {STEPS.map((s, idx) => (
          <TouchableOpacity
            key={s.id}
            style={[styles.stepChip, step === idx && styles.stepChipActive]}
            onPress={() => setStep(idx)}
            testID={`onboarding-step-${s.id}`}
          >
            <Text style={[styles.stepChipText, step === idx && styles.stepChipTextActive]}>
              {idx + 1}. {s.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {step === 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Estabelecimento e responsável</Text>
          <Text style={styles.label}>Nome do estabelecimento</Text>
          <TextInput
            style={styles.input}
            value={draft.establishment?.name || ''}
            onChangeText={(t) => patch('establishment', 'name', t)}
            placeholder="Ex.: Unidade Centro"
          />
          <Text style={styles.label}>Responsável</Text>
          <TextInput
            style={styles.input}
            value={draft.establishment?.responsible || ''}
            onChangeText={(t) => patch('establishment', 'responsible', t)}
            placeholder="Nome do responsável"
          />
          <Text style={styles.label}>Z-Day (fechamento operacional)</Text>
          <TextInput
            style={styles.input}
            value={draft.establishment?.zDay || ''}
            onChangeText={(t) => patch('establishment', 'zDay', t)}
            placeholder="Ex.: 00:00"
          />
        </View>
      )}

      {step === 1 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Atividade e estrutura</Text>
          <Text style={styles.label}>Estrutura / tipo de operação</Text>
          <TextInput
            style={styles.input}
            value={draft.activity?.structure || ''}
            onChangeText={(t) => patch('activity', 'structure', t)}
            placeholder="Ex.: restaurante, dark kitchen, franquia"
          />
          <Text style={styles.label}>Notas</Text>
          <TextInput
            style={[styles.input, { minHeight: 72 }]}
            multiline
            value={draft.activity?.notes || ''}
            onChangeText={(t) => patch('activity', 'notes', t)}
          />
        </View>
      )}

      {step === 2 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Modos de operação</Text>
          <ToggleRow
            label="Salão"
            value={draft.operations?.salon}
            onValueChange={(v) => patch('operations', 'salon', v)}
            styles={styles}
          />
          <ToggleRow
            label="Balcão"
            value={draft.operations?.counter}
            onValueChange={(v) => patch('operations', 'counter', v)}
            styles={styles}
          />
          <ToggleRow
            label="Retirada"
            value={draft.operations?.pickup}
            onValueChange={(v) => patch('operations', 'pickup', v)}
            styles={styles}
          />
          <ToggleRow
            label="Delivery próprio"
            value={draft.operations?.deliveryOwn}
            onValueChange={(v) => patch('operations', 'deliveryOwn', v)}
            styles={styles}
          />
          <ToggleRow
            label="Delivery terceirizado"
            value={draft.operations?.deliveryThird}
            onValueChange={(v) => patch('operations', 'deliveryThird', v)}
            styles={styles}
          />
          <ToggleRow
            label="PCP / produção"
            value={draft.operations?.pcp}
            onValueChange={(v) => patch('operations', 'pcp', v)}
            styles={styles}
          />
        </View>
      )}

      {step === 3 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Salão — mesas e comandas (domínios distintos)</Text>
          <ToggleRow
            label="Mesas"
            value={draft.floor?.tables}
            onValueChange={(v) => patch('floor', 'tables', v)}
            styles={styles}
          />
          <ToggleRow
            label="Comandas"
            value={draft.floor?.tabs}
            onValueChange={(v) => patch('floor', 'tabs', v)}
            styles={styles}
          />
          <ToggleRow
            label="Garçons"
            value={draft.floor?.waiters}
            onValueChange={(v) => patch('floor', 'waiters', v)}
            styles={styles}
          />
          <ToggleRow
            label="Tablet em mesa"
            value={draft.floor?.tabletOnTable}
            onValueChange={(v) => patch('floor', 'tabletOnTable', v)}
            styles={styles}
          />
        </View>
      )}

      {step === 4 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Equipe e devices (inventário inicial)</Text>
          <Text style={styles.label}>Equipe / papéis</Text>
          <TextInput
            style={[styles.input, { minHeight: 64 }]}
            multiline
            value={draft.team?.notes || ''}
            onChangeText={(t) => patch('team', 'notes', t)}
            placeholder="Ex.: 2 caixas, 4 garçons"
          />
          <Text style={styles.label}>Devices previstos</Text>
          <TextInput
            style={[styles.input, { minHeight: 64 }]}
            multiline
            value={draft.team?.devicesInventory || ''}
            onChangeText={(t) => patch('team', 'devicesInventory', t)}
            placeholder="Ex.: 1 PDV, 2 KDS, 1 impressora"
          />
        </View>
      )}

      {step === 5 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cardápio e canais</Text>
          <Text style={styles.label}>Origem do cardápio</Text>
          <TextInput
            style={styles.input}
            value={draft.catalog?.menuSource || ''}
            onChangeText={(t) => patch('catalog', 'menuSource', t)}
            placeholder="Manual, importação futura, outro ERP…"
          />
          <Text style={styles.label}>Canais de venda (texto livre)</Text>
          <TextInput
            style={styles.input}
            value={(draft.catalog?.salesChannels || []).join(', ')}
            onChangeText={(t) =>
              patch(
                'catalog',
                'salesChannels',
                t
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
            placeholder="Balcão, iFood, próprio…"
          />
        </View>
      )}

      {step === 6 && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Jornada sugerida (módulos reais)</Text>
            <Text style={[styles.muted, { marginBottom: 8 }]}>
              O onboarding orquestra; PDV, PCP, catálogo e devices executam nos módulos
              oficiais — não são recriados aqui.
            </Text>
            {journey.map((item, idx) => (
              <View key={item.id} style={styles.capabilityRow}>
                <Text style={styles.rowLabel}>
                  {idx + 1}. {item.title}
                </Text>
                <Text style={styles.muted}>{item.moduleHint}</Text>
              </View>
            ))}
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Capacidades</Text>
            {capabilities.map((cap) => (
              <View key={cap.id} style={styles.capabilityRow}>
                <Text style={styles.rowLabel}>
                  {cap.label}
                  {cap.highlighted ? ' •' : ''}
                </Text>
                <Text style={statusStyle(cap.status)}>{statusLabel(cap.status)}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          disabled={step <= 0}
          onPress={() => setStep(step - 1)}
        >
          <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Anterior</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            if (step < STEPS.length - 1) setStep(step + 1);
            else navigation?.navigate?.('HomePage') || navigation?.goBack?.();
          }}
          testID="onboarding-next"
        >
          <Text style={styles.buttonText}>
            {step < STEPS.length - 1 ? 'Próximo' : 'Concluir diagnóstico'}
          </Text>
        </TouchableOpacity>
      </View>

      {Platform.OS === 'web' ? (
        <Text style={styles.muted} testID="onboarding-platform-web">
          Ambiente web — rascunho em localStorage.
        </Text>
      ) : null}
    </ScrollView>
  );
}
