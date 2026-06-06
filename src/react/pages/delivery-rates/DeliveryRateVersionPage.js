/*
 * Contract imported from MODOS_OPERACAO.md
 * - Version detail is read-only and exposes the full km-band snapshot.
 * - Managers inspect historical values here; changes are always done by creating a new courier version.
 */

/* eslint-disable no-unused-vars */

import React, {useMemo} from 'react';
import {ActivityIndicator, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import {useStore} from '@store';
import {
  DELIVERY_RATE_BAND_COLUMNS,
  resolveCompanyLabel,
} from '@controleonline/ui-logistic/src/shared/deliveryTaxGroups';
import {useDeliveryRateGroupItem} from '@controleonline/ui-logistic/src/react/pages/delivery-rates/hooks';
import styles from '@controleonline/ui-logistic/src/react/pages/delivery-rates/styles';
import Icon from 'react-native-vector-icons/Feather';
import {TouchableOpacity} from 'react-native';

export default function DeliveryRateVersionPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const authStore = useStore('auth');
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');

  const {sessionChecked, user} = authStore.getters;
  const {colors: themeColors} = themeStore.getters;
  const {currentCompany} = peopleStore.getters;

  const groupId = useMemo(
    () => String(route?.params?.id || '').replace(/\D+/g, ''),
    [route?.params?.id],
  );

  const {item: group, isLoading, reload, error} = useDeliveryRateGroupItem(groupId, Boolean(groupId));

  const bootstrapReady =
    Boolean(sessionChecked) &&
    Boolean(currentCompany) &&
    Boolean(themeColors) &&
    Boolean(user);

  const courierLabel = useMemo(
    () => resolveCompanyLabel(group?.courier),
    [group?.courier],
  );

  const bands = useMemo(() => Array.isArray(group?.taxes) ? group.taxes : [], [group?.taxes]);

  if (!bootstrapReady || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  if (!groupId) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.scrollContent}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Versão não informada</Text>
            <Text style={styles.emptyStateText}>
              Abra uma tabela válida para visualizar o detalhe.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
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

    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.scrollContent}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Versão não encontrada</Text>
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
      <View style={styles.scrollContent}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Manager</Text>
          <Text style={styles.heroTitle}>{group.groupName}</Text>
          <Text style={styles.heroText}>
            Versão v{group.versionNumber} da tabela de entrega, somente leitura.
          </Text>
          <View style={styles.heroPillRow}>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>Código: {group.code || '-'}</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>Veículo: {group.vehicleType || '-'}</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>Motoboy: {courierLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Resumo</Text>
            <Text style={styles.sectionText}>
              Histórico preservado. Se precisar mudar qualquer valor, o courier deve abrir uma nova versão.
            </Text>
          </View>

          <View style={styles.listCard}>
            <View style={styles.companyRow}>
              <View style={styles.companyIdentity}>
                <Text style={styles.companyTitle}>Faixas cadastradas</Text>
                <Text style={styles.companyMeta}>{bands.length} linhas com km mínimo, km máximo e valores mínimos.</Text>
              </View>
              <Text style={styles.sectionTitle}>{bands.length}</Text>
            </View>
            <View style={styles.sectionDivider} />
            <View style={styles.companyRow}>
              <View style={styles.companyIdentity}>
                <Text style={styles.companyTitle}>Empresas associadas</Text>
                <Text style={styles.companyMeta}>
                  {group.companiesCount || 0} vínculos, {group.activeCompaniesCount || 0} ativos.
                </Text>
              </View>
              <Text style={styles.sectionTitle}>{group.activeCompaniesCount || 0}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Faixas de km</Text>
            <Text style={styles.sectionText}>
              A faixa abaixo é o snapshot exato salvo para esta versão.
            </Text>
          </View>

          <View style={styles.tableWrap}>
            <DefaultTable
              accentColor="#0EA5E9"
              add={false}
              columns={DELIVERY_RATE_BAND_COLUMNS}
              data={bands}
              initialViewMode="table"
              isLoading={false}
              showColumnFiltersButton={false}
              showRowActions={false}
              storeName="delivery_tax_groups"
              totalItems={bands.length}
              totalItemsLabel="faixas"
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Próximos passos</Text>
          <Text style={styles.helperText}>
            {group.previousGroup
              ? `Versão anterior: ${group.previousGroup.groupName} v${group.previousGroup.versionNumber}.`
              : 'Esta é a primeira versão da tabela.'}
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
              onPress={() => navigation.navigate('DeliveryRateCompanyPage', { id: groupId })}
            >
              <Icon name="briefcase" size={14} color="#0F172A" />
              <Text style={styles.secondaryButtonText}>Empresas</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.86} style={styles.primaryButton} onPress={reload}>
              <Text style={styles.primaryButtonText}>Atualizar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
