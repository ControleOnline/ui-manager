import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useStore } from '@store';
import { api } from '@controleonline/ui-common/src/api';
import { app_type_base } from '@appType';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import styles from './AdsensePage.styles';

const normalizeId = value => String(value ?? '').replace(/\D+/g, '');

const normalizeDomain = value => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
};

const statusLabel = status => {
  if (status === 'ok') return 'OK';
  if (status === 'warning') return 'Atenção';
  if (status === 'checking') return 'Verificando';
  if (status === 'error') return 'Erro';
  return 'Não verificado';
};

const statusColor = (status, palette) => {
  if (status === 'ok') return palette.success || '#16A34A';
  if (status === 'error') return palette.error || '#DC2626';
  if (status === 'warning') return palette.warning || '#D97706';
  if (status === 'checking') return palette.warning || '#D97706';
  return palette.textMuted || '#64748B';
};

const extractItems = response =>
  response?.member || response?.['hydra:member'] || (Array.isArray(response) ? response : []);

export default function AdsensePage() {
  const navigation = useNavigation();
  const themeStore = useStore('theme');
  const peopleStore = useStore('people');
  const isFocused = useIsFocused();
  const [domains, setDomains] = useState([]);
  const [checks, setChecks] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { colors: themeColors } = themeStore.getters || {};
  const { currentCompany, defaultCompany } = peopleStore.getters || {};
  const palette = useMemo(
    () => resolveThemePalette({ ...themeColors, ...(currentCompany?.theme?.colors || {}) }, colors),
    [currentCompany?.id, currentCompany?.theme?.colors, themeColors],
  );

  useEffect(() => {
    navigation.setOptions({ title: 'AdSense' });
  }, [navigation]);

  const loadDomains = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.fetch('people_domains', {
        params: {
          itemsPerPage: 100,
          ...(defaultCompany?.id || currentCompany?.id
            ? { people: `/people/${defaultCompany?.id || currentCompany?.id}` }
            : {}),
        },
      });
      setDomains(extractItems(response).filter(item => String(item?.domain || '').trim()));
    } catch (requestError) {
      setError(requestError?.message || 'Não foi possível carregar os domínios.');
    } finally {
      setLoading(false);
    }
  }, [currentCompany?.id, defaultCompany?.id]);

  useEffect(() => {
    if (app_type_base === 'MKT' && isFocused) void loadDomains();
  }, [isFocused, loadDomains]);

  const checkDomain = useCallback(async domain => {
    const id = normalizeId(domain?.id || domain?.['@id']);
    if (!id) return;
    setChecks(previous => ({ ...previous, [id]: { status: 'checking' } }));
    try {
      const result = await api.fetch(`people_domains/${id}/adsense-check`);
      setChecks(previous => ({
        ...previous,
        [id]: {
          status: Array.isArray(result?.issues) && result.issues.length > 0 ? 'warning' : 'ok',
          result,
        },
      }));
    } catch (requestError) {
      setChecks(previous => ({
        ...previous,
        [id]: { status: 'error', error: requestError?.message || 'Falha na checagem.' },
      }));
    }
  }, []);

  const checkAll = useCallback(async () => {
    for (const domain of domains) {
      // Keep requests sequential to avoid triggering rate limits on customer sites.
      await checkDomain(domain);
    }
  }, [checkDomain, domains]);

  const checkedCount = Object.values(checks).filter(item => item.status === 'ok').length;
  const issueCount = Object.values(checks).filter(item => ['error', 'warning'].includes(item.status)).length;

  if (app_type_base !== 'MKT') {
    return (
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.deniedCard}>
          <Text style={styles.deniedTitle}>Tela exclusiva do APP_TYPE MKT</Text>
          <Text style={styles.mutedText}>Configure o build com APP_TYPE=MKT para acessar a integração do AdSense.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}><Icon name="bar-chart-2" size={22} color={palette.primary} /></View>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>MONETIZAÇÃO</Text>
            <Text style={styles.title}>Integração AdSense</Text>
            <Text style={styles.mutedText}>Monitore os sites cadastrados em people_domain sem expor credenciais do Google no aplicativo.</Text>
          </View>
          <Pressable onPress={checkAll} disabled={loading || domains.length === 0} style={styles.primaryButton}>
            <Icon name="check-circle" size={15} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Checar todos</Text>
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}><Text style={styles.summaryValue}>{domains.length}</Text><Text style={styles.summaryLabel}>Sites</Text></View>
          <View style={styles.summaryCard}><Text style={[styles.summaryValue, { color: palette.success || '#16A34A' }]}>{checkedCount}</Text><Text style={styles.summaryLabel}>OK</Text></View>
          <View style={styles.summaryCard}><Text style={[styles.summaryValue, { color: palette.error || '#DC2626' }]}>{issueCount}</Text><Text style={styles.summaryLabel}>Com alerta</Text></View>
        </View>

        {error ? <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></View> : null}
        {loading ? <View style={styles.loadingRow}><ActivityIndicator color={palette.primary} /><Text style={styles.mutedText}>Carregando domínios...</Text></View> : null}

        {!loading && domains.length === 0 ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Nenhum site encontrado</Text><Text style={styles.mutedText}>Adicione um domínio em people_domain para iniciar as checagens.</Text></View> : null}

        {domains.map(domain => {
          const id = normalizeId(domain?.id || domain?.['@id']);
          const check = checks[id] || {};
          const result = check.result || {};
          const domainUrl = normalizeDomain(domain?.domain);
          return (
            <View key={id || domain?.domain} style={styles.domainCard}>
              <View style={styles.domainHeader}>
                <View style={styles.domainCopy}>
                  <Text style={styles.domainName}>{domain?.domain}</Text>
                  <Text style={styles.domainMeta}>{domain?.domainType || 'Domínio'} · {domain?.people?.alias || domain?.people?.name || 'Empresa não informada'}</Text>
                </View>
                <View style={[styles.statusBadge, { borderColor: statusColor(check.status, palette) }]}><Text style={[styles.statusText, { color: statusColor(check.status, palette) }]}>{statusLabel(check.status)}</Text></View>
              </View>
              {check.status === 'ok' ? (
                <View style={styles.checkGrid}>
                  <Text style={styles.checkItem}>HTTP: {result.http?.status || '—'}</Text>
                  <Text style={styles.checkItem}>Código: {result.adsenseCode?.found ? 'encontrado' : 'ausente'}</Text>
                  <Text style={styles.checkItem}>ads.txt: {result.adsTxt?.authorized ? 'autorizado' : 'ausente/não autorizado'}</Text>
                </View>
              ) : null}
              {check.error ? <Text style={styles.errorText}>{check.error}</Text> : null}
              <View style={styles.domainActions}>
                <Pressable onPress={() => checkDomain(domain)} disabled={check.status === 'checking'} style={styles.secondaryButton}>
                  {check.status === 'checking' ? <ActivityIndicator size="small" color={palette.primary} /> : <Icon name="refresh-cw" size={14} color={palette.primary} />}
                  <Text style={styles.secondaryButtonText}>Verificar</Text>
                </Pressable>
                <Pressable onPress={() => Linking.openURL(domainUrl)} style={styles.linkButton}><Icon name="external-link" size={14} color={palette.primary} /><Text style={styles.secondaryButtonText}>Abrir site</Text></Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
