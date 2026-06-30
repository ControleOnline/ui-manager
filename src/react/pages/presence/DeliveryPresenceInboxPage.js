/*
 * Contract imported from MODOS_OPERACAO.md
 * - The manager inbox is a read-only scoped view of courier/company presence rows.
 * - It reuses the same backend contract as the courier side but never exposes state changes.
 */

/* eslint-disable no-unused-vars */

import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import {useStore} from '@store';
import {resolveThemePalette} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import {
  buildPresenceSearchText,
  normalizeText,
} from '@controleonline/ui-logistic/src/shared/deliveryPresence';
import {resolvePeopleLabel} from '@controleonline/ui-logistic/src/shared/deliveryPresence';
import styles from '@controleonline/ui-logistic/src/react/pages/delivery-rates/styles';

const PAGE_SIZE = 100;

export default function DeliveryPresenceInboxPage() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const authStore = useStore('auth');
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');
  const presenceStore = useStore('delivery_courier_company_presences');

  const {actions, getters} = presenceStore;
  const {user, sessionChecked} = authStore.getters;
  const {colors: themeColors} = themeStore.getters;
  const {currentCompany} = peopleStore.getters;
  const {columns} = getters;

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
        colors,
      ),
    [currentCompany?.id, themeColors],
  );

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [sortState, setSortState] = useState({
    field: 'alterDate',
    direction: 'desc',
  });

  const currentCompanyIri = useMemo(
    () => (currentCompany?.id ? `/people/${String(currentCompany.id).replace(/\D+/g, '')}` : ''),
    [currentCompany?.id],
  );

  const bootstrapReady =
    Boolean(sessionChecked) &&
    Boolean(currentCompany) &&
    Boolean(themeColors) &&
    Boolean(user);

  const loadPresenceRows = async () => {
    if (!currentCompanyIri) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await actions.getItems({
        company: currentCompanyIri,
      });
      setItems(Array.isArray(response) ? response : []);
    } catch (caughtError) {
      const message =
        caughtError?.message || 'Nao foi possivel carregar a presenca do manager.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isFocused || !currentCompanyIri) {
      return;
    }

    loadPresenceRows();
  }, [currentCompanyIri, isFocused]);

  const visibleItems = useMemo(() => {
    const normalizedSearch = normalizeText(searchText).toLowerCase();
    if (!normalizedSearch) {
      return items;
    }

    return items.filter(item => buildPresenceSearchText(item).includes(normalizedSearch));
  }, [items, searchText]);

  if (!bootstrapReady || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={brandColors.primary || '#0EA5E9'} />
      </View>
    );
  }

  if (!currentCompanyIri) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.scrollContent}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Empresa nao identificada</Text>
            <Text style={styles.emptyStateText}>
              Selecione uma empresa com painel habilitado para ver as presencas.
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
          <Text style={styles.heroTitle}>Presenca dos motoboys</Text>
          <Text style={styles.heroText}>
            A lista abaixo mostra quem esta online para a empresa selecionada e qual foi a ultima mudanca registrada.
          </Text>
          <View style={styles.heroPillRow}>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{visibleItems.length} registros</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{resolvePeopleLabel(currentCompany)}</Text>
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
              Clique em uma linha para abrir o detalhe somente leitura ou abra o historico da entidade.
            </Text>
          </View>

          <View style={styles.tableWrap}>
            <DefaultTable
              accentColor={brandColors.primary || '#0EA5E9'}
              add={false}
              columns={columns}
              data={visibleItems}
              initialViewMode="table"
              isLoading={isLoading}
              onRowPress={row =>
                navigation.navigate('DeliveryPresenceDetailPage', {
                  presenceId: String(row?.id || '').replace(/\D+/g, ''),
                })
              }
              searchProps={{
                onSearch: setSearchText,
                placeholder: 'Buscar motoboy, empresa ou status',
                value: searchText,
              }}
              onSortChange={setSortState}
              showColumnFiltersButton={false}
              showRowActions={false}
              sort={sortState}
              storeName="delivery_courier_company_presences"
              totalItems={visibleItems.length}
              totalItemsLabel="registros"
            />
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity activeOpacity={0.86} style={styles.primaryButton} onPress={loadPresenceRows}>
            <Text style={styles.primaryButtonText}>Atualizar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
