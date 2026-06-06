/*
 * Contract imported from MODOS_OPERACAO.md
 * - Managers only toggle activation on companies already linked to the immutable table version.
 * - The courier keeps association ownership; this screen only enables or disables the link state.
 */

/* eslint-disable no-unused-vars */

import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, ScrollView, Switch, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService';
import {api} from '@controleonline/ui-common/src/api';
import {useStore} from '@store';
import {
  normalizeEntityId,
  resolveCompanyLabel,
  resolveCompanyStatusLabel,
  unwrapHydratorItem,
} from '@controleonline/ui-logistic/src/shared/deliveryTaxGroups';
import {useDeliveryRateGroupItem} from '@controleonline/ui-logistic/src/react/pages/delivery-rates/hooks';
import styles from '@controleonline/ui-logistic/src/react/pages/delivery-rates/styles';
import Icon from 'react-native-vector-icons/Feather';

export default function DeliveryRateCompanyPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const {showError, showSuccess} = useMessage() || {};
  const authStore = useStore('auth');
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');

  const {sessionChecked, user} = authStore.getters;
  const {colors: themeColors} = themeStore.getters;
  const {currentCompany} = peopleStore.getters;
  const peopleActions = peopleStore.actions;

  const groupId = useMemo(
    () => String(route?.params?.id || route?.params?.groupId || '').replace(/\D+/g, ''),
    [route?.params?.groupId, route?.params?.id],
  );

  const {item: group, isLoading, reload, error} = useDeliveryRateGroupItem(groupId, Boolean(groupId));
  const [companies, setCompanies] = useState([]);
  const [savingCompanyId, setSavingCompanyId] = useState('');

  const bootstrapReady =
    Boolean(sessionChecked) &&
    Boolean(user) &&
    Boolean(currentCompany) &&
    Boolean(themeColors);

  const linkedCompanies = useMemo(
    () =>
      Array.isArray(group?.companies)
        ? group.companies
            .map(link => {
              const company = link?.company || link?.companyId || link;
              const companyId = normalizeEntityId(company);

              return {
                link,
                company,
                companyId,
                enabled: Boolean(link?.enabled),
              };
            })
            .filter(link => Boolean(link.companyId))
        : [],
    [group?.companies],
  );

  const linkedCompanyIds = useMemo(
    () => linkedCompanies.map(link => String(link.companyId)),
    [linkedCompanies],
  );

  const activeCompanyIds = useMemo(
    () => linkedCompanies.filter(link => link.enabled).map(link => String(link.companyId)),
    [linkedCompanies],
  );

  const visibleCompanies = useMemo(
    () =>
      companies
        .filter(company => linkedCompanyIds.includes(String(company?.id).replace(/\D+/g, '')))
        .map(company => ({
          ...company,
          linked: true,
          active: activeCompanyIds.includes(String(company?.id).replace(/\D+/g, '')),
        }))
        .sort((left, right) =>
          resolveCompanyLabel(left).toLowerCase().localeCompare(resolveCompanyLabel(right).toLowerCase()),
        ),
    [activeCompanyIds, companies, linkedCompanyIds],
  );

  useEffect(() => {
    if (!bootstrapReady || typeof peopleActions.myCompanies !== 'function') {
      return;
    }

    peopleActions
      .myCompanies()
      .then(list => {
        setCompanies(Array.isArray(list) ? list : []);
      })
      .catch(error => {
        showError?.(error?.message || 'Não foi possível carregar as empresas disponíveis.');
      });
  }, [bootstrapReady, peopleActions, showError]);

  const handleToggleCompany = async company => {
    const companyId = String(company?.id || '').replace(/\D+/g, '');
    if (!groupId || !companyId || company?.panel_enabled === false || savingCompanyId) {
      return;
    }

    const nextEnabled = !activeCompanyIds.includes(companyId);
    setSavingCompanyId(companyId);

    try {
      const response = await api.fetch(
        `/delivery_tax_groups/${groupId}/companies/${companyId}`,
        {
          method: 'PATCH',
          body: { enabled: nextEnabled },
        },
      );

      unwrapHydratorItem(response);
      showSuccess?.(
        nextEnabled
          ? 'Empresa ativada para esta tabela.'
          : 'Empresa desativada para esta tabela.',
      );
      await reload();
    } catch (error) {
      showError?.(error?.message || 'Não foi possível atualizar a ativação da empresa.');
    } finally {
      setSavingCompanyId('');
    }
  };

  if (!bootstrapReady || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.scrollContent}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Falha ao carregar</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!groupId) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.scrollContent}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Tabela não informada</Text>
            <Text style={styles.emptyStateText}>
              Abra uma versão válida para ativar ou desativar empresas.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.scrollContent}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Tabela não encontrada</Text>
            <Text style={styles.emptyStateText}>
              Esta versão não está disponível no seu contexto de segurança.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Manager</Text>
          <Text style={styles.heroTitle}>Ativação por empresa</Text>
          <Text style={styles.heroText}>
            A tabela {group.groupName} v{group.versionNumber} só muda de estado por empresa associada. O histórico continua intacto.
          </Text>
          <View style={styles.heroPillRow}>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>Código: {group.code || '-'}</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>Empresas: {linkedCompanies.length}</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>Ativas: {activeCompanyIds.length}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Empresas associadas</Text>
            <Text style={styles.sectionText}>
              Somente empresas já associadas pelo courier aparecem aqui. O manager apenas liga ou desliga a mesma versão.
            </Text>
          </View>

          <View style={styles.listCard}>
            {visibleCompanies.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>Nenhuma empresa associada</Text>
                <Text style={styles.emptyStateText}>
                  O courier ainda precisa associar empresas a esta versão antes da ativação.
                </Text>
              </View>
            ) : (
              visibleCompanies.map(company => {
                const companyId = String(company?.id || '').replace(/\D+/g, '');
                const isActive = activeCompanyIds.includes(companyId);
                const isSelectable = company?.panel_enabled !== false && !savingCompanyId;

                return (
                  <View key={companyId} style={styles.companyRow}>
                    <View style={styles.companyIdentity}>
                      <Text style={styles.companyTitle}>{resolveCompanyLabel(company)}</Text>
                      <Text style={styles.companyMeta}>
                        {resolveCompanyStatusLabel(company)} · #{companyId}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          isActive ? styles.statusBadgeActive : styles.statusBadgeInactive,
                        ]}
                      >
                        <Text style={styles.statusBadgeText}>
                          {isActive ? 'Tabela ativa' : 'Tabela inativa'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.toggleColumn}>
                      <Switch
                        value={isActive}
                        disabled={!isSelectable}
                        onValueChange={() => handleToggleCompany(company)}
                        trackColor={{ false: '#E2E8F0', true: '#BAE6FD' }}
                        thumbColor={isActive ? '#0EA5E9' : '#94A3B8'}
                      />
                      {!isSelectable ? (
                        <Text style={styles.companyMeta}>Sem painel ou atualização em andamento</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Resumo</Text>
          <Text style={styles.helperText}>
            A qualquer momento você pode voltar para a leitura da versão ou para o histórico completo.
          </Text>

          <View style={styles.actionBar}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('DeliveryRateHistoryPage', { code: group.code || groupId })}
            >
              <Icon name="clock" size={14} color="#0F172A" />
              <Text style={styles.secondaryButtonText}>Histórico</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('DeliveryRateVersionPage', { id: groupId })}
            >
              <Icon name="file-text" size={14} color="#0F172A" />
              <Text style={styles.secondaryButtonText}>Detalhe</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.86} style={styles.primaryButton} onPress={reload}>
              <Text style={styles.primaryButtonText}>Atualizar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
