/*
 * @agents Consolidated marketing dashboard for #46.
 * KPIs: GA4 sessions/users, Ads cost/conversions, AdSense revenue/RPM, ROI.
 * Consumes /marketing/ga4/report, /marketing/ads/report, /marketing/adsense/report
 * (api-platform-integration #84). Split into KpiRow + tables to keep each file
 * below the 200-line soft cap in shared-quality-code-quality.
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, Text, View} from 'react-native';

import {api} from '@controleonline/ui-common/src/api';
import {useStore} from '@store';

import KpiRow from './components/KpiRow';
import CampaignsTable from './components/CampaignsTable';
import Ga4TrafficTable from './components/Ga4TrafficTable';
import AdsenseTable from './components/AdsenseTable';

const DEFAULT_RANGE = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  const iso = date => date.toISOString().slice(0, 10);
  return {startDate: iso(start), endDate: iso(end)};
};

export default function MarketingDashboardPage() {
  const store = useStore();
  const palette = usePalette();
  const styles = useStyles(palette);
  const [range] = useState(DEFAULT_RANGE);
  const [state, setState] = useState({
    loading: true,
    error: null,
    ga4: null,
    adsReport: null,
    adsCampaigns: [],
    adsense: null,
  });

  const companyId = store?.state?.people?.mainCompany?.id;

  const load = useCallback(async () => {
    if (!companyId) {
      setState(s => ({...s, loading: false, error: 'missing_company'}));
      return;
    }
    setState(s => ({...s, loading: true, error: null}));
    try {
      const params = {people: '/people/' + companyId, ...range};
      const [ga4, adsReport, adsCampaignsResp, adsense] = await Promise.all([
        safeFetch(`/marketing/ga4/report`, params),
        safeFetch(`/marketing/ads/report`, params),
        safeFetch(`/marketing/ads/campaigns`, {people: '/people/' + companyId}),
        safeFetch(`/marketing/adsense/report`, params),
      ]);
      setState({
        loading: false,
        error: null,
        ga4,
        adsReport,
        adsCampaigns: Array.isArray(adsCampaignsResp?.campaigns) ? adsCampaignsResp.campaigns : [],
        adsense,
      });
    } catch (err) {
      setState({loading: false, error: String(err?.message || err), ga4: null, adsReport: null, adsCampaigns: [], adsense: null});
    }
  }, [companyId, range]);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = useMemo(() => computeKpis(state), [state]);

  if (state.loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {state.error ? (
        <Text style={styles.error}>
          {global.t?.t('marketing', 'dashboard', 'error', state.error)}
        </Text>
      ) : null}

      <KpiRow kpis={kpis} palette={palette} />

      <Text style={styles.sectionTitle}>
        {global.t?.t('marketing', 'dashboard', 'campaigns', 'Campanhas Google Ads')}
      </Text>
      <CampaignsTable
        campaigns={state.adsCampaigns}
        reportRows={state.adsReport?.rows || []}
        companyId={companyId}
        onMutated={load}
        palette={palette}
      />

      <Text style={styles.sectionTitle}>
        {global.t?.t('marketing', 'dashboard', 'ga4Traffic', 'Tráfego GA4')}
      </Text>
      <Ga4TrafficTable rows={state.ga4?.rows || []} palette={palette} />

      <Text style={styles.sectionTitle}>
        {global.t?.t('marketing', 'dashboard', 'adsenseEarnings', 'Receita AdSense')}
      </Text>
      <AdsenseTable rows={state.adsense?.rows || []} headers={state.adsense?.headers || {}} palette={palette} />
    </ScrollView>
  );
}

const safeFetch = async (path, params) => {
  try {
    return await api.fetch(path, {params});
  } catch (err) {
    if (err?.response?.status === 401) return null;
    throw err;
  }
};

const computeKpis = state => {
  const ga4Totals = state.ga4?.totals || {};
  const ads = state.adsReport?.rows || [];
  const costMicros = ads.reduce((s, r) => s + (r.cost_micros || 0), 0);
  const conversions = ads.reduce((s, r) => s + (r.conversions || 0), 0);
  const adsenseRows = state.adsense?.rows || [];
  const earnings = adsenseRows.reduce((sum, row) => sum + Number(row?.[0] || 0), 0);

  return [
    {key: 'sessions', label: 'Sessões (GA4)', value: Math.round(ga4Totals.sessions || 0)},
    {key: 'users', label: 'Usuários (GA4)', value: Math.round(ga4Totals.activeUsers || 0)},
    {key: 'cost', label: 'Custo Ads', value: (costMicros / 1_000_000).toFixed(2)},
    {key: 'conversions', label: 'Conversões Ads', value: conversions.toFixed(1)},
    {key: 'earnings', label: 'Receita AdSense', value: earnings.toFixed(2)},
    {
      key: 'roi',
      label: 'ROI (AdSense / Ads)',
      value: costMicros > 0 ? (earnings / (costMicros / 1_000_000)).toFixed(2) : '—',
    },
  ];
};

const usePalette = () => {
  const store = useStore();
  const palette = store?.state?.theme?.palette || {};
  return {
    primary: palette.primary || palette.chipActive,
    background: palette.background || palette.body,
    panel: palette.panel || palette.cardBackground,
    text: palette.text || palette.title,
    muted: palette.muted || palette.subtitle,
    border: palette.border || palette.divider,
    danger: palette.danger || palette.error || palette.text,
  };
};

const useStyles = palette =>
  StyleSheet.create({
    container: {padding: 20, backgroundColor: palette.background},
    centered: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background},
    sectionTitle: {color: palette.text, fontWeight: '700', fontSize: 15, marginTop: 24, marginBottom: 12},
    error: {color: palette.danger, marginBottom: 12},
  });
