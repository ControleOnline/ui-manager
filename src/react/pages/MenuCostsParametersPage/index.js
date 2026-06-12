/* eslint-disable no-unused-vars */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';
import styles, { MENU_COLORS } from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/index.styles';
import { MAIN_TABS } from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/tabs';
import {
  resolveMenuCostsTabRoute,
} from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/navigation';
import {
  buildParameterCache,
  buildParameterRequestConfigs,
  isMethodNotAllowedError,
  resolveEffectiveConfigs,
  resolveErrorMessage,
  resolveParameterDraft,
} from '@controleonline/ui-manager/src/react/pages/MenuCostsParametersPage/viewModel';

const IconButton = ({ icon, label, onPress, active, disabled = false }) => (
  <TouchableOpacity
    style={[
      styles.iconButton,
      active && styles.iconButtonActive,
      disabled && { opacity: 0.6 },
    ]}
    activeOpacity={disabled ? 1 : 0.82}
    onPress={disabled ? undefined : onPress}
    disabled={disabled}
  >
    <Icon
      name={icon}
      size={16}
      color={active ? MENU_COLORS.brandText : MENU_COLORS.muted}
    />
    {label ? (
      <Text style={[styles.iconButtonText, active && styles.iconButtonTextActive]}>
        {label}
      </Text>
    ) : null}
  </TouchableOpacity>
);

const Field = ({ label, value, onChangeText, wide = false }) => (
  <View style={[styles.modalField, wide && styles.modalFieldWide]}>
    <Text style={styles.modalLabel}>{label}</Text>
    <TextInput
      value={String(value ?? '')}
      onChangeText={onChangeText}
      style={styles.modalInput}
      keyboardType="numeric"
      placeholderTextColor={MENU_COLORS.muted}
    />
  </View>
);

const resolveSectionTitle = () => 'Premissas de preço e rateio da engenharia';

export default function MenuCostsParametersPage({ navigation }) {
  const messageApi = useMessage() || {};
  const { showError, showSuccess } = messageApi;
  const { width } = useWindowDimensions();
  const isWide = width >= 1060;

  const peopleStore = useStore('people');
  const peopleGetters = peopleStore.getters;
  const { currentCompany } = peopleGetters;

  const configsStore = useStore('configs');
  const configsGetters = configsStore.getters;
  const configActions = configsStore.actions;
  const { items: companyConfigs, isSaving } = configsGetters;

  const effectiveConfigs = useMemo(
    () => resolveEffectiveConfigs(companyConfigs, currentCompany?.configs),
    [companyConfigs, currentCompany?.configs],
  );

  const [draft, setDraft] = useState(() => resolveParameterDraft(effectiveConfigs));

  useEffect(() => {
    setDraft(resolveParameterDraft(effectiveConfigs));
  }, [effectiveConfigs]);

  useFocusEffect(
    useCallback(() => {
      if (!currentCompany?.id) {
        return undefined;
      }

      let alive = true;
      const companyRef = `/people/${currentCompany.id}`;

      configActions
        .discoveryMainConfigs({ people: companyRef })
        .catch(error => {
          if (alive) {
            showError?.(resolveErrorMessage(error));
          }
        });

      return () => {
        alive = false;
      };
    }, [configActions, currentCompany?.id, showError]),
  );

  const handleTabPress = useCallback(
    tab => {
      const { routeName, params } = resolveMenuCostsTabRoute(tab);

      if (routeName === 'MenuCostsParametersPage') {
        return;
      }

      navigation?.navigate?.(routeName, params || {});
    },
    [navigation],
  );

  const handleSave = useCallback(async () => {
    if (!currentCompany?.id) {
      showError?.('Selecione uma empresa para salvar as premissas.');
      return;
    }

    const companyRef = `/people/${currentCompany.id}`;
    const requestConfigs = buildParameterRequestConfigs(draft);
    const cacheConfigs = buildParameterCache(draft);

    try {
      try {
        await configActions.addManyConfigs({
          configs: requestConfigs,
          people: companyRef,
          module: 4,
          visibility: 'public',
        });
      } catch (error) {
        if (!isMethodNotAllowedError(error)) {
          throw error;
        }

        for (const item of requestConfigs) {
          await configActions.addConfigs({
            configKey: item.configKey,
            configValue: item.configValue,
            people: companyRef,
            module: 4,
            visibility: 'public',
          });
        }
      }

      configActions.setItems({
        ...effectiveConfigs,
        ...cacheConfigs,
      });
      showSuccess?.('Premissas salvas na empresa.');
    } catch (error) {
      showError?.(resolveErrorMessage(error));
    }
  }, [configActions, currentCompany?.id, draft, effectiveConfigs, showError, showSuccess]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={styles.page}>
        <View style={styles.toolbar}>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>Custos do cardápio</Text>
            <Text style={styles.pageTitle}>Engenharia de Produtos e Processos</Text>
          </View>
          <View style={styles.toolbarActions} />
        </View>

        <View style={[styles.body, !isWide && styles.bodyCompact]}>
          <View style={[styles.sidebar, !isWide && styles.sidebarCompact]}>
            <ScrollView horizontal={!isWide} showsHorizontalScrollIndicator={false}>
              <View style={[styles.menuList, !isWide && styles.menuListHorizontal]}>
                {MAIN_TABS.map(tab => (
                  <IconButton
                    key={tab.key}
                    icon={tab.icon}
                    label={tab.label}
                    active={tab.key === 'settings'}
                    onPress={() => handleTabPress(tab.key)}
                    disabled={tab.key === 'settings'}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.content}>
            <View style={styles.sectionTop}>
              <View>
                <Text style={styles.sectionEyebrow}>Premissas e rateio</Text>
                <Text style={styles.sectionTitle}>{resolveSectionTitle()}</Text>
              </View>
            </View>

            <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentScrollBody}>
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Premissas da operação</Text>
                <Text style={styles.panelSubtitle}>
                  Os valores desta tela são carregados ao abrir a rota e salvos nas
                  configurações públicas da empresa selecionada para orientar margem,
                  markup e rateio mensal.
                </Text>

                <View style={styles.modalGrid}>
                  <Field
                    label="Markup padrão (%)"
                    value={draft.markupPct}
                    onChangeText={value => setDraft(prev => ({ ...prev, markupPct: value }))}
                  />
                  <Field
                    label="Margem alvo (%)"
                    value={draft.marginPct}
                    onChangeText={value => setDraft(prev => ({ ...prev, marginPct: value }))}
                  />
                  <Field
                    label="Unidades mensais estimadas"
                    value={draft.monthlyUnits}
                    wide
                    onChangeText={value => setDraft(prev => ({ ...prev, monthlyUnits: value }))}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, isSaving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  <Icon name="save" size={16} color={MENU_COLORS.white} />
                  <Text style={styles.primaryButtonText}>
                    {isSaving ? 'Salvando...' : 'Salvar premissas'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
      <StateStore stores={['configs']} />
    </SafeAreaView>
  );
}
