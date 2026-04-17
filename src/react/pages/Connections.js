import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

import useToastMessage from '@controleonline/ui-crm/src/react/hooks/useToastMessage';
import { useStore } from '@store';
import { colors } from '@controleonline/../../src/styles/colors';
import styles from './Connections.styles';
import {
  resolveThemePalette,
  withOpacity,
} from '@controleonline/../../src/styles/branding';

const shadowStyle = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  android: { elevation: 3 },
  web: { boxShadow: '0 10px 24px rgba(15,23,42,0.08)' },
});

const formatApiError = error => {
  if (!error) return 'Nao foi possivel carregar as conexoes.';
  if (typeof error === 'string') return error;
  return error?.message || error?.description || error?.errmsg || 'Nao foi possivel carregar as conexoes.';
};

const toArray = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.member)) return response.member;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  return [];
};

const normalizePhone = phone => {
  if (!phone) return 'Nao informado';

  const ddd = String(phone?.ddd || '').trim();
  const digits = String(phone?.phone || '').replace(/\D/g, '');
  if (!ddd && !digits) return 'Nao informado';
  if (!digits) return `(${ddd})`;

  const lastFour = digits.slice(-4);
  const firstPart = digits.slice(0, -4);
  if (!firstPart) {
    return ddd ? `(${ddd}) ${lastFour}` : lastFour;
  }

  return ddd ? `(${ddd}) ${firstPart}-${lastFour}` : `${firstPart}-${lastFour}`;
};

const normalizeConnection = item => ({
  id: item?.id || item?.['@id'] || `connection-${Math.random()}`,
  name: item?.name || 'Sem nome',
  phoneLabel: normalizePhone(item?.phone),
  type: item?.type || 'Nenhum',
  channel: item?.channel || 'whatsapp',
  status: item?.status?.status || item?.status || 'Pendente',
  raw: item,
});

export default function ConnectionsPage({ navigation }) {
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const connectionsStore = useStore('connections');
  const { currentCompany } = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;
  const connectionsActions = connectionsStore.actions;
  const { showError } = useToastMessage();

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        {
          ...themeColors,
          ...(currentCompany?.theme?.colors || {}),
        },
        colors,
      ),
    [themeColors, currentCompany?.id],
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connections, setConnections] = useState([]);

  const providerId = currentCompany?.id;
  const peopleIri = useMemo(
    () => (providerId ? `/people/${String(providerId).replace(/\D/g, '')}` : ''),
    [providerId],
  );

  const loadConnections = useCallback(async () => {
    if (!peopleIri) {
      setConnections([]);
      setLoading(false);
      return;
    }

    try {
      const response = await connectionsActions.getItems({
        people: peopleIri,
      });

      setConnections(toArray(response).map(normalizeConnection));
    } catch (error) {
      showError(formatApiError(error));
      setConnections([]);
    } finally {
      setLoading(false);
    }
  }, [connectionsActions, peopleIri, showError]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadConnections();
    }, [loadConnections]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadConnections();
    } finally {
      setRefreshing(false);
    }
  }, [loadConnections]);

  if (!providerId) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerState}>
          <Icon name="building" size={32} color="#94A3B8" />
          <Text style={styles.centerStateTitle}>Selecione uma empresa</Text>
          <Text style={styles.centerStateText}>
            As conexoes disponiveis dependem da empresa ativa.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: brandColors.background }]} edges={['bottom']}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={brandColors.primary} />
          <Text style={styles.centerStateTitle}>Carregando conexoes</Text>
          <Text style={styles.centerStateText}>
            Buscando canais configurados para a empresa ativa.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: brandColors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brandColors.primary} />
        }>
        <View style={[styles.heroCard, shadowStyle, { backgroundColor: brandColors.primary }]}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>COMUNICACAO</Text>
            <Text style={styles.heroTitle}>Conexoes</Text>
            <Text style={styles.heroText}>
              Gerencie os canais de comunicacao conectados com a sua operacao.
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Icon name="radio" size={22} color={brandColors.primary} />
          </View>
        </View>

        <View style={styles.companyRow}>
          <View>
            <Text style={styles.sectionTitle}>Empresa ativa</Text>
            <Text style={styles.companyName}>
              {currentCompany?.name || currentCompany?.alias || `Empresa #${providerId}`}
            </Text>
          </View>
          <View style={styles.companyBadge}>
            <Text style={styles.companyBadgeText}>{connections.length} conexoes</Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => navigation.navigate('WhatsAppConnectionPage')}
          style={[styles.channelCard, shadowStyle]}>
          <View style={styles.channelTopRow}>
            <View style={[styles.channelIconWrap, { backgroundColor: withOpacity('#22C55E', 0.12) }]}>
              <Icon name="message-circle" size={20} color="#22C55E" />
            </View>
            <View style={styles.channelStatusPill}>
              <Text style={styles.channelStatusText}>
                {connections.length > 0 ? `${connections.length} configurada(s)` : 'Pronta para configurar'}
              </Text>
            </View>
          </View>

          <Text style={styles.channelTitle}>WhatsApp</Text>
          <Text style={styles.channelDescription}>
            Conecte numeros, acompanhe status e gere o QR Code de autenticacao.
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Canal</Text>
              <Text style={styles.metaValue}>WhatsApp</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Status</Text>
              <Text style={styles.metaValue}>
                {connections.some(item => String(item.status).toUpperCase() === 'CONNECTED')
                  ? 'Conectado'
                  : connections.length > 0
                    ? 'Em configuracao'
                    : 'Nao configurado'}
              </Text>
            </View>
          </View>

          {connections.length > 0 ? (
            <View style={styles.previewList}>
              {connections.slice(0, 3).map(item => (
                <View key={item.id} style={styles.previewRow}>
                  <View>
                    <Text style={styles.previewName}>{item.name}</Text>
                    <Text style={styles.previewPhone}>{item.phoneLabel}</Text>
                  </View>
                  <Text style={styles.previewStatus}>{item.status}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyInline}>
              <Text style={styles.emptyInlineText}>
                Nenhuma conexao cadastrada ainda. Toque para configurar o primeiro numero.
              </Text>
            </View>
          )}

          <View style={styles.actionRow}>
            <Text style={styles.actionText}>Abrir canal</Text>
            <Icon name="arrow-right" size={18} color={brandColors.primary} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
