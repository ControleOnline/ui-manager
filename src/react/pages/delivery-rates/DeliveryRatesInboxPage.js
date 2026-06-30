/*
 * Contract imported from MODOS_OPERACAO.md
 * - The manager inbox lists immutable delivery-rate versions visible to the selected company.
 * - Managers can only inspect versions and activate/deactivate company links.
 */

/* eslint-disable no-unused-vars */

import React, {useMemo, useState} from 'react';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import {useStore} from '@store';
import {
  filterDeliveryRateGroups,
  normalizeEntityId,
  resolveCompanyLabel,
  sortDeliveryRateGroups,
} from '@controleonline/ui-logistic/src/shared/deliveryTaxGroups';
import {useDeliveryRateGroupsCollection} from '@controleonline/ui-logistic/src/react/pages/delivery-rates/hooks';
import styles from '@controleonline/ui-logistic/src/react/pages/delivery-rates/styles';

const normalizePeopleId = user =>
  normalizeEntityId(user?.people || user?.peopleId || user?.person || user?.personId || '');

export default function DeliveryRatesInboxPage() {
  const navigation = useNavigation();
  const authStore = useStore('auth');
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');
  const deliveryTaxGroupsStore = useStore('delivery_tax_groups');

  const {user, sessionChecked} = authStore.getters;
  const {colors: themeColors} = themeStore.getters;
  const {currentCompany} = peopleStore.getters;
  const {columns} = deliveryTaxGroupsStore.getters;

  const currentCompanyId = useMemo(
    () => normalizeEntityId(currentCompany?.id || currentCompany?.value || currentCompany),
    [currentCompany],
  );
  const currentCompanyIri = currentCompanyId ? `/people/${currentCompanyId}` : '';

  const {items, isLoading, error, reload} = useDeliveryRateGroupsCollection(
    useMemo(() => ({ company: currentCompanyIri}), [currentCompanyIri]),
    Boolean(currentCompanyIri),
  );

  const [searchText, setSearchText] = useState('');
  const [sortState, setSortState] = useState({
    field: 'versionNumber',
    direction: 'desc',
  });

  const bootstrapReady =
    Boolean(sessionChecked) &&
    Boolean(currentCompany) &&
    Boolean(themeColors) &&
    Boolean(user);

  const filteredGroups = useMemo(
    () => filterDeliveryRateGroups(items, searchText),
    [items, searchText],
  );

  const visibleGroups = useMemo(
    () => sortDeliveryRateGroups(filteredGroups, sortState),
    [filteredGroups, sortState],
  );

  const currentPeopleId = useMemo(() => normalizePeopleId(user), [user]);

  if (!bootstrapReady || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  if (!currentCompanyIri) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.scrollContent}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Empresa não identificada</Text>
            <Text style={styles.emptyStateText}>
              Selecione uma empresa com painel habilitado antes de consultar as tabelas de entrega.
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
          <Text style={styles.heroTitle}>Tabelas de entrega</Text>
          <Text style={styles.heroText}>
            Tabelas visíveis para a empresa selecionada. Cada linha abre a versão read-only e o histórico.
          </Text>
          <View style={styles.heroPillRow}>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{visibleGroups.length} versões</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{resolveCompanyLabel(currentCompany)}</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>#{currentPeopleId || '-'}</Text>
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
            <Text style={styles.sectionTitle}>Inbox</Text>
            <Text style={styles.sectionText}>
              O manager não altera histórico. A edição acontece sempre via nova versão do courier.
            </Text>
          </View>

          <View style={styles.tableWrap}>
            <DefaultTable
              accentColor="#0EA5E9"
              add={false}
              columns={columns}
              data={visibleGroups}
              initialViewMode="table"
              isLoading={isLoading}
              onRowPress={row => navigation.navigate('DeliveryRateVersionPage', { id: String(row?.id || '').replace(/\D+/g, '') })}
              searchProps={{
                onSearch: setSearchText,
                placeholder: 'Buscar tabela, código ou motoboy',
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
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity activeOpacity={0.86} style={styles.primaryButton} onPress={reload}>
            <Text style={styles.primaryButtonText}>Atualizar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
