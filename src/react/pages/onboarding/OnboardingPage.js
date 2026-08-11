/* eslint-disable no-unused-vars */

import React, {useMemo, useState} from 'react';
import {ScrollView, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useStore} from '@store';
import {app_type_base} from '@appType';
import {resolveThemePalette} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import {userHasRole} from '@controleonline/ui-common/src/react/utils/runtimeMenu';
import createStyles from './OnboardingPage.styles';
import {
  createOnboardingSteps,
  isOnboardingDraftReady,
  ONBOARDING_STEP_STATUS,
  resolveCompanyName,
} from './onboardingSteps';

const INITIAL_DRAFT = Object.freeze({
  clientOwner: '',
  internalOwner: '',
  notes: '',
  zDayDate: '',
  zDayTime: '',
});

const DraftField = ({label, multiline = false, onChangeText, styles, value, ...props}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      accessibilityLabel={label}
      multiline={multiline}
      onChangeText={onChangeText}
      placeholderTextColor="#94A3B8"
      style={[styles.input, multiline ? styles.notesInput : null]}
      value={value}
      {...props}
    />
  </View>
);

export default function OnboardingPage() {
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const authStore = useStore('auth');
  const {currentCompany} = peopleStore.getters;
  const {colors: themeColors = {}} = themeStore.getters;
  const {user} = authStore.getters;

  const palette = useMemo(
    () =>
      resolveThemePalette(
        {...themeColors, ...(currentCompany?.theme?.colors || {})},
        colors,
      ),
    [currentCompany?.id, themeColors],
  );
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [draft, setDraft] = useState(INITIAL_DRAFT);
  const [started, setStarted] = useState(false);
  const steps = useMemo(() => createOnboardingSteps({started}), [started]);
  const canStart = isOnboardingDraftReady({company: currentCompany, draft});
  const canAccess =
    app_type_base === 'MANAGER' && userHasRole(user, 'ROLE_SUPER');

  const updateField = (field, value) => {
    setStarted(false);
    setDraft(current => ({...current, [field]: value}));
  };

  if (!canAccess) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Onboarding indisponível</Text>
          <Text style={styles.cardText}>
            Esta estrutura beta está disponível somente no MANAGER para usuários
            autorizados.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>Manager · Beta</Text>
        <Text style={styles.heroTitle}>Implantação assistida</Text>
        <Text style={styles.heroText}>
          Abra o onboarding, defina os responsáveis e agende o Z-Day antes de
          configurar os módulos do ERP.
        </Text>
      </View>

      <View style={styles.draftNotice}>
        <Text style={styles.draftNoticeText}>
          Rascunho temporário desta sessão. Esta etapa ainda não cria registros
          de empresa, usuários, catálogo, devices, POS ou PCP.
        </Text>
      </View>

      <View style={styles.layout}>
        <View style={styles.formColumn}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>1. Abrir implantação</Text>
            <Text style={styles.cardText}>
              Confirme o contexto atual e os participantes do primeiro encontro.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>Estabelecimento selecionado</Text>
              <TextInput
                accessibilityLabel="Estabelecimento selecionado"
                editable={false}
                style={[styles.input, styles.readOnlyInput]}
                value={resolveCompanyName(currentCompany)}
              />
            </View>

            <DraftField
              label="Responsável do cliente"
              placeholder="Nome e função"
              styles={styles}
              value={draft.clientOwner}
              onChangeText={value => updateField('clientOwner', value)}
            />
            <DraftField
              label="Responsável interno"
              placeholder="Nome do implantador"
              styles={styles}
              value={draft.internalOwner}
              onChangeText={value => updateField('internalOwner', value)}
            />

            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <DraftField
                  label="Data do Z-Day"
                  placeholder="DD/MM/AAAA"
                  styles={styles}
                  value={draft.zDayDate}
                  onChangeText={value => updateField('zDayDate', value)}
                />
              </View>
              <View style={styles.fieldHalf}>
                <DraftField
                  label="Horário do Z-Day"
                  placeholder="HH:mm"
                  styles={styles}
                  value={draft.zDayTime}
                  onChangeText={value => updateField('zDayTime', value)}
                />
              </View>
            </View>

            <DraftField
              label="Observações iniciais"
              multiline
              placeholder="Contexto, participantes e restrições conhecidas"
              styles={styles}
              value={draft.notes}
              onChangeText={value => updateField('notes', value)}
            />

            <TouchableOpacity
              accessibilityLabel="Iniciar onboarding de teste"
              accessibilityRole="button"
              activeOpacity={0.86}
              disabled={!canStart}
              onPress={() => setStarted(true)}
              style={[styles.button, !canStart ? styles.buttonDisabled : null]}
            >
              <Text style={styles.buttonText}>Iniciar onboarding de teste</Text>
            </TouchableOpacity>

            {started ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>
                  Onboarding iniciado nesta sessão. A etapa 1 está em preenchimento.
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.stepsColumn}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Jornada da implantação</Text>
            <Text style={styles.cardText}>
              As próximas etapas são apenas a estrutura do fluxo e ainda não
              representam funcionalidades concluídas.
            </Text>

            <View style={styles.stepsList}>
              {steps.map((step, index) => (
                <View key={step.id} style={styles.step}>
                  <View style={styles.stepIndex}>
                    <Text style={styles.stepIndexText}>{index + 1}</Text>
                  </View>
                  <View style={styles.stepBody}>
                    <Text style={styles.stepLabel}>{step.label}</Text>
                    <Text
                      style={[
                        styles.stepStatus,
                        step.status === ONBOARDING_STEP_STATUS.ACTIVE
                          ? styles.activeStatus
                          : null,
                      ]}
                    >
                      {step.status}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
