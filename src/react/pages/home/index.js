/*
 * Contract imported from AGENTS.md
 * ## Escopo
 * - `ui-manager` e o modulo administrativo do app para configuracoes operacionais, devices, integracoes e visoes amplas da empresa.
 * - As telas React em `src/react/pages` sao a referencia ativa deste modulo.
 * - Na visao `ADMIN`, a home e enxuta: mostra apenas a grade de menus e deixa o atalho de `MenuAccessConfigPage` dentro do grid.
 *
 * ## Devices
 * - `DeviceDetailPage` e `PrinterDeviceDetailPage` sao os donos das configuracoes por device no `MANAGER`.
 * - Toda regra booleana ou normalizacao de `configs` de device deve nascer ou ser reutilizada de `@controleonline/ui-common/src/react/config/deviceConfigBootstrap`.
 * - Persistencia de configuracao de device deve continuar passando pelo store `device_config`, sem criar chamadas paralelas fora desse fluxo.
 * - A chave `pos-delivery-enabled` pertence a configuracao do device no `MANAGER` e controla se o detalhe operacional do pedido daquele equipamento mostra cliente, endereco e observacoes de entrega.
 * - Na listagem de devices, o subtitulo deve usar o mesmo identificador resolvido pelo runtime compartilhado: para web, priorizar o IP publico persistido em `device.metadata.network.publicIp`; para nativo, manter o identificador salvo em `device.device`.
 *
 * ## Limites
 * - `ui-manager` configura a operacao, mas nao deve duplicar a UI operacional de `ui-orders`.
 * - A tela React `OrderHistoryPage` pertence ao modulo `ui-orders`. O `MANAGER` pode navegar para ela, mas nao deve manter uma copia da tela em `ui-manager`.
 * - `OrderHistoryPage` do `MANAGER` nao deve abrir `OrderDetails` com `kds=true`. Esse param pertence apenas a origens reais de `PPC`/KDS.
 * - Quando a configuracao alterar comportamento do `POS`, documente a regra tambem no `AGENTS.md` do modulo dono do fluxo operacional.
 * - `ManagerOrderNotificationsPage` pode deixar a URL de audio vazia; nesse caso o runtime usa o som padrao `src/assets/sound/caixa.m4a` empacotado no app.
 * - Em `Food99IntegrationPage`, a carteira de repasse da loja precisa ser escolhida na tela de integracao a partir das carteiras da empresa ativa e persistida como `settlement_wallet_id`; nao permitir selecao fora do contexto da empresa.
 * - Quando `Food99IntegrationPage` precisar cadastrar uma carteira nova para repasse, usar o store `wallet` com `people: '/people/<empresa ativa>'` e selecionar imediatamente a carteira criada no formulario, sem criar fluxo paralelo ou buscar carteiras fora da empresa ativa.
 *
 * ## Menus
 * - `MenuAccessConfigPage` e a tela administrativa para configurar menus por `APP_TYPE` e vinculos humanos de `people_link.link_type`; `client`, `provider` e `franchisee` sao comerciais e nao entram como perfis de menu.
 * - Essa tela e exclusiva de `ROLE_SUPER` e deve persistir alteracoes pelo endpoint `menu-config`.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-animatable';
import { resolveThemePalette, withOpacity } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import { api } from '@controleonline/ui-common/src/api';
import {app_type_base} from '@appType';
import { userHasRole } from '@controleonline/ui-common/src/react/utils/runtimeMenu';
import AppMenuGrid from '@controleonline/ui-layout/src/react/components/AppMenuGrid';
import { createStyles } from './index.styles';

const translate = (store, type, key) => global.t?.t(store, type, key);

export default function HomePage({ navigation }) {
  const isAdminApp = app_type_base === 'ADMIN';

  const themeStore = useStore('theme');
  const peopleStore = useStore('people');
  const authStore = useStore('auth');
  const translateStore = useStore('translate');

  const { colors: themeColors, menus } = themeStore.getters;
  const { currentCompany } = peopleStore.getters;
  const { user } = authStore.getters;
  const translateMessages = translateStore?.getters?.messages || {};
  const pendingTranslateMessages = translateStore?.getters?.pendingMessages || {};
  const canManageAdminMenus = userHasRole(user, 'ROLE_SUPER');

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
        colors,
      ),
    [themeColors, currentCompany?.id],
  );
  const styles = useMemo(() => createStyles(brandColors), [brandColors]);
  const tones = useMemo(
    () => ({
      info: { solid: brandColors.info, soft: withOpacity(brandColors.info, 0.12) },
      success: { solid: brandColors.success, soft: withOpacity(brandColors.success, 0.12) },
    }),
    [brandColors.info, brandColors.success],
  );

  const [statValues, setStatValues] = useState([
    { key: 'orders', value: '...' },
    { key: 'customers', value: '...' },
  ]);
  const [loadingStats, setLoadingStats] = useState(true);
  const stats = useMemo(() => {
    const valuesByKey = Object.fromEntries(
      statValues.map(item => [item.key, item.value]),
    );

    return [
      {
        key: 'orders',
        label: translate('configs', 'stat_label', 'orders'),
        value: valuesByKey.orders || '...',
        icon: 'shopping-bag',
        tone: tones.info,
        route: 'OrderHistoryPage',
      },
      {
        key: 'customers',
        label: translate('configs', 'stat_label', 'customers'),
        value: valuesByKey.customers || '...',
        icon: 'users',
        tone: tones.success,
        route: 'ClientsIndex',
      },
    ];
  }, [statValues, tones.info, tones.success, translateMessages, pendingTranslateMessages]);

  useEffect(() => {
    if (isAdminApp || !currentCompany?.id) return;

    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const [ordersRes, clientsRes] =
          await Promise.all([
            api.fetch('/orders', { params: { provider: currentCompany.id} }).catch(() => null),
            api.fetch('/people', { params: { 'link.company': `/people/${currentCompany.id}`, 'link.linkType': 'client'} }).catch(() => null),
          ]);

        setStatValues([
          { key: 'orders', value: String(ordersRes?.totalItems ?? '-') },
          { key: 'customers', value: String(clientsRes?.totalItems ?? '-') },
        ]);
      } catch {
        // mantém os valores padrão
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [currentCompany?.id]);

  const go = (route, params = undefined) => navigation.navigate(route, params);

  if (!currentCompany || !themeColors) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={brandColors.info} />
      </View>
    );
  }

  if (isAdminApp) {
    return (
      <View style={[styles.container, { backgroundColor: brandColors.background }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <AppMenuGrid menus={menus} navigation={navigation} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: brandColors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Stats */}
        <Text style={styles.overviewLabel}>
          {translate('configs', 'section_title', 'overview')}
        </Text>
        <View style={styles.statsRow}>
          {stats.map((stat, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.statCard}
              activeOpacity={0.85}
              onPress={() => go(stat.route)}
            >
              <View style={[styles.statIcon, { backgroundColor: stat.tone.soft }]}>
                <Icon name={stat.icon} size={17} color={stat.tone.solid} />
              </View>
              {loadingStats ? (
                <ActivityIndicator
                  size="small"
                  color={stat.tone.solid}
                  style={styles.statLoader}
                />
              ) : (
                <Text style={styles.statValue}>{stat.value}</Text>
              )}
              <Text style={styles.statLabel}>{stat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isAdminApp && canManageAdminMenus ? (
          <TouchableOpacity
            style={[styles.actionBanner, { backgroundColor: brandColors.primary }]}
            activeOpacity={0.9}
            onPress={() => go('MenuAccessConfigPage')}
          >
            <View style={styles.actionContent}>
              <View>
                <Text style={styles.actionTitle}>Cadastro de menus</Text>
                <Text style={styles.actionSub}>
                  Comece por aqui para montar os atalhos da nova visao admin.
                </Text>
              </View>
              <View style={styles.actionArrow}>
                <Icon name="list" size={20} color={brandColors.primary} />
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBanner, { backgroundColor: brandColors.primary }]}
            activeOpacity={0.9}
            onPress={() => go('IncomeStatement')}
          >
            <View style={styles.actionContent}>
              <View>
                <Text style={styles.actionTitle}>
                  {translate('configs', 'button_title', 'results') || 'Resultados'}
                </Text>
                <Text style={styles.actionSub}>
                  {translate('configs', 'section_title', 'resultsDescription') || 'Resumo dos resultados'}
                </Text>
              </View>
              <View style={styles.actionArrow}>
                <Icon name="arrow-right" size={20} color={brandColors.primary} />
              </View>
            </View>
          </TouchableOpacity>
        )}

        <AppMenuGrid menus={menus} navigation={navigation} />

      </ScrollView>
    </View>
  );
}
// TODO(store-first): quando este arquivo for mexido, mover a leitura para stores, remover api.fetch e evitar repassar dados em objetos quando o store ja resolver isso.
