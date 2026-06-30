/*
 * Contract imported from MODOS_OPERACAO.md
 * - Delivery-rate history is read-only and groups immutable versions by code.
 * - The manager can inspect previous versions but cannot edit or delete them here.
 */

/* eslint-disable no-unused-vars */

import React, {useMemo, useState} from 'react';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute} from '@react-navigation/native';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import {useStore} from '@store';
import {
  DELIVERY_RATE_GROUP_COLUMNS,
  filterDeliveryRateGroups,
  normalizeEntityId,
  resolveCompanyLabel,
  sortDeliveryRateGroups,
} from '@controleonline/ui-logistic/src/shared/deliveryTaxGroups';
import {
  useDeliveryRateGroupItem,
  useDeliveryRateGroupsCollection,
} from '@controleonline/ui-logistic/src/react/pages/delivery-rates/hooks';
import styles from '@controleonline/ui-logistic/src/react/pages/delivery-rates/styles';
import Icon from 'react-native-vector-icons/Feather';

export default function DeliveryRateHistoryPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const authStore = useStore('auth');
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');

  const {sessionChecked, user} = authStore.getters;
  const {colors: themeColors} = themeStore.getters;
  const {currentCompany} = peopleStore.getters;

  const referenceId = useMemo(
    () => String(route?.params?.id || route?.params?.groupId || '').replace(/\D+/g, ''),
    [route?.params?.groupId, route?.params?.id],
  );
  const routeCode = useMemo(
    () => String(route?.params?.code || '').trim(),
    [route?.params?.code],
  );

  const {item: sourceGroup, isLoading: isSourceLoading, error: sourceError} = useDeliveryRateGroupItem(
    referenceId,
    Boolean(referenceId && !routeCode),
  );

  const resolvedCode = routeCode || sourceGroup?.code || '';
  const currentCompanyId = useMemo(
    () => normalizeEntityId(currentCompany?.id || currentCompany?.value || currentCompany),
    [currentCompany],
  );
  const currentCompanyIri = currentCompanyId ? `/people/${currentCompanyId}` : '';

  const {items, isLoading, error, reload} = useDeliveryRateGroupsCollection(
    useMemo(
      () => ({
        code: resolvedCode,
        company: currentCompanyIri,
      }),
      [currentCompanyIri, resolvedCode],
    ),
    Boolean(resolvedCode && currentCompanyIri),
  );

  const [searchText, setSearchText] = useState('');
  const [sortState, setSortState] = useState({
    field: 'versionNumber',
    direction: 'desc',
  });

  const bootstrapReady =
    Boolean(sessionChecked) &&
    Boolean(user) &&
    Boolean(currentCompany) &&
    Boolean(themeColors);

  const filteredGroups = useMemo(
    () => filterDeliveryRateGroups(items, searchText),
    [items, searchText],
  );

  const visibleGroups = useMemo(
    () => sortDeliveryRateGroups(filteredGroups, sortState),
    [filteredGroups, sortState],
  );

  const courierLabel = useMemo(
    () => resolveCompanyLabel(sourceGroup?.courier || visibleGroups?.[0]?.courier),
    [sourceGroup?.courier, visibleGroups],
  );

  if (!bootstrapReady || isLoading || isSourceLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  if (error || sourceError) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.scrollContent}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Falha ao carregar</Text>
            <Text style={styles.errorText}>{error || sourceError}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!resolvedCode) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.scrollContent}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Histórico não informado</Text>
            <Text style={styles.emptyStateText}>
              Abra uma versão válida para ver o histórico de tabelas.
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
          <Text style={styles.heroTitle}>Histórico da tabela</Text>
          <Text style={styles.heroText}>
            Cada linha abaixo representa uma versão imutável da tabela {resolvedCode}.
          </Text>
          <View style={styles.heroPillRow}>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>Código: {resolvedCode}</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>Motoboy: {courierLabel}</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{visibleGroups.length} versões</Text>
            </View>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Falha ao carregar</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Versões</Text>
            <Text style={styles.sectionText}>
              Toque em uma linha para abrir a leitura da versão. As edições sempre começam em uma nova tabela no app do courier.
            </Text>
          </View>

          {visibleGroups.length > 0 ? (
            <View style={styles.tableWrap}>
              <DefaultTable
                accentColor="#0EA5E9"
                add={false}
                columns={DELIVERY_RATE_GROUP_COLUMNS}
                data={visibleGroups}
                initialViewMode="table"
                isLoading={isLoading}
                onRowPress={row =>
                  navigation.navigate('DeliveryRateVersionPage', {
                    id: String(row?.id || '').replace(/\D+/g, ''),
                  })
                }
                searchProps={{
                  onSearch: setSearchText,
                  placeholder: 'Buscar versão, código ou motoboy',
                  value: searchText,
                }}
                onSortChange={setSortState}
                showColumnFiltersButton={false}
                showRowActions={false}
                sort={sortState}
                storeName="delivery_tax_groups"
                totalItems={visibleGroups.length}
                totalItemsLabel="versões"
              />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>Nenhuma versão encontrada</Text>
              <Text style={styles.emptyStateText}>
                O código {resolvedCode} ainda não tem histórico disponível para esta empresa.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionBar}>
          <TouchableOpacity
            activeOpacity={0.86}
            style={styles.secondaryButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={14} color="#0F172A" />
            <Text style={styles.secondaryButtonText}>Voltar</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.86} style={styles.primaryButton} onPress={reload}>
            <Text style={styles.primaryButtonText}>Atualizar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
