import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import DefaultTooltip from '@controleonline/ui-default/src/react/components/help/DefaultTooltip';
import styles from './PeopleDomainDetailPage.styles';

const normalizeId = value => String(value ?? '').trim().replace(/\D+/g, '');

const domainLabel = value => String(value ?? '').trim() || '—';

const renderServerValue = value => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return String(value).trim() || '—';
};

export default function PeopleDomainDetailPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const peopleDomainsStore = useStore('people_domains');
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');

  const peopleDomainState = peopleDomainsStore.getters || {};
  const { currentCompany, defaultCompany } = peopleStore.getters || {};
  const { colors: themeColors } = themeStore.getters || {};

  const item = peopleDomainState.item || {};
  const linkedItem = peopleDomainState.linkedItem || null;
  const frontItems = Array.isArray(peopleDomainState.frontItems) ? peopleDomainState.frontItems : [];
  const server = peopleDomainState.server || null;
  const testDomain = String(peopleDomainState.testDomain || '').trim();
  const detailLoading = peopleDomainState.detailLoading === true;
  const detailError = String(peopleDomainState.detailError || '').trim();

  const mainCompany = defaultCompany || currentCompany || null;
  const palette = useMemo(
    () =>
      resolveThemePalette(
        { ...themeColors, ...(mainCompany?.theme?.colors || {}) },
        colors,
      ),
    [mainCompany?.id, mainCompany?.theme?.colors, themeColors],
  );

  const id = useMemo(
    () => normalizeId(route.params?.id),
    [route.params?.id],
  );

  const currentDomainValue = String(item?.domain || '').trim();
  const currentDomain = domainLabel(currentDomainValue);
  const currentType = String(item?.domainType || '').trim().toUpperCase();
  const linkedDomainValue = String(linkedItem?.domain || '').trim();
  const linkedDomain = domainLabel(linkedDomainValue);
  const companyId = normalizeId(item?.people?.id || item?.people || peopleDomainsStore.getters?.item?.people?.id || '');
  const displayTestDomain = testDomain || (currentType === 'API' ? currentDomainValue : linkedDomainValue || currentDomainValue);

  useEffect(() => {
    navigation.setOptions({
      title: 'Domínio',
      headerRight: () => (
        <DefaultTooltip
          accentColor={palette.primary}
          title="Domínios"
          message="O vínculo mostra qual API atende o front. Quando o domínio atual for API, o botão de crons abre a operação do tenant."
        />
      ),
    });
  }, [navigation, palette.primary]);

  useEffect(() => {
    if (!id) {
      return undefined;
    }

    void peopleDomainsStore.actions.loadDetail({ id }).catch(() => {});
  }, [id, peopleDomainsStore.actions]);

  const openTests = useCallback(() => {
    if (!displayTestDomain) {
      return;
    }

    navigation.navigate('TestsPlaygroundPage', {
      title: `Testes - ${displayTestDomain}`,
      smokeConfig: {
        domain: displayTestDomain,
      },
    });
  }, [displayTestDomain, navigation]);

  const openCrons = useCallback(() => {
    const peopleId = normalizeId(item?.people?.id || item?.people || '');

    if (!peopleId) {
      return;
    }

    navigation.navigate('CronJobsPage', {
      peopleId,
    });
  }, [item?.people?.id, navigation]);

  const openFrontDetail = useCallback(
    frontItem => {
      const frontId = normalizeId(frontItem?.id || frontItem?.['@id'] || '');

      if (!frontId) {
        return;
      }

      navigation.push('PeopleDomainDetailPage', {
        id: frontId,
      });
    },
    [navigation],
  );

  if (detailLoading && !item?.id) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['bottom']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.loadingText}>Carregando domínio...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {detailError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Não foi possível carregar o domínio</Text>
            <Text style={styles.errorText}>{detailError}</Text>
          </View>
        ) : null}

        <View style={styles.diagramCard}>
          <View style={styles.diagramHeader}>
            <View>
              <Text style={styles.sectionKicker}>Domínio atual</Text>
              <Text style={styles.domainTitle}>{currentDomain}</Text>
            </View>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{currentType || '—'}</Text>
            </View>
          </View>

          <View style={styles.diagramRow}>
            <View style={styles.domainNode}>
              <Text style={styles.domainNodeLabel}>Empresa</Text>
              <Text style={styles.domainNodeValue}>{domainLabel(item?.peopleLabel || item?.people?.alias || item?.people?.name)}</Text>
            </View>

            <View style={styles.arrowWrap}>
              <Icon name="arrow-right" size={16} color={palette.primary} />
            </View>

            <View style={styles.domainNode}>
              <Text style={styles.domainNodeLabel}>
                {currentType === 'API' ? 'Consumidores' : 'API vinculada'}
              </Text>
              {currentType === 'API' ? (
                frontItems.length > 0 ? (
                  <View style={styles.frontChipList}>
                    {frontItems.map(frontItem => (
                      <TouchableOpacity
                        key={String(frontItem?.id || frontItem?.['@id'] || frontItem?.domain || '')}
                        activeOpacity={0.85}
                        onPress={() => openFrontDetail(frontItem)}
                        style={styles.frontChip}
                      >
                        <Text style={styles.frontChipText}>
                          {domainLabel(frontItem?.domain)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.domainNodeValue}>Nenhum front vinculado</Text>
                )
              ) : (
                <Text style={styles.domainNodeValue}>{linkedDomain}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Servidor</Text>
            {server ? (
              <View style={styles.summaryStack}>
                <Text style={styles.summaryValue}>{renderServerValue(server.host)}</Text>
                <Text style={styles.summaryMeta}>
                  {renderServerValue(server.user)} · porta {renderServerValue(server.port)}
                </Text>
                <Text style={styles.summaryMeta}>{renderServerValue(server.driver)}</Text>
              </View>
            ) : (
              <Text style={styles.summaryMeta}>Servidor não encontrado para este domínio.</Text>
            )}
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Testes</Text>
            <Text style={styles.summaryValue}>{displayTestDomain || '—'}</Text>
            <Text style={styles.summaryMeta}>
              Os smoke tests usam o domínio resolvido pela relação API.
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            onPress={openTests}
            disabled={!displayTestDomain}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
              !displayTestDomain && styles.actionButtonDisabled,
            ]}
          >
            <Icon name="activity" size={14} color={palette.primary} />
            <Text style={styles.actionButtonText}>Testes</Text>
          </Pressable>

          {currentType === 'API' ? (
            <Pressable
              accessibilityRole="button"
              onPress={openCrons}
              disabled={!companyId}
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.actionButtonPressed,
                !companyId && styles.actionButtonDisabled,
              ]}
            >
              <Icon name="clock" size={14} color={palette.primary} />
              <Text style={styles.actionButtonText}>Crons</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
