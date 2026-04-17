import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import QRCode from 'react-native-qrcode-svg';

import useToastMessage from '@controleonline/ui-crm/src/react/hooks/useToastMessage';
import { useStore } from '@store';
import { colors } from '@controleonline/../../src/styles/colors';
import styles from './WhatsAppConnectionPage.styles';
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
  if (!error) return 'Nao foi possivel concluir a operacao.';
  if (typeof error === 'string') return error;
  return error?.message || error?.description || error?.errmsg || 'Nao foi possivel concluir a operacao.';
};

const toArray = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.member)) return response.member;
  if (Array.isArray(response?.['hydra:member'])) return response['hydra:member'];
  return [];
};

const extractDigits = value => String(value || '').replace(/\D/g, '');

const formatPhoneLabel = phone => {
  const ddd = String(phone?.ddd || '').trim();
  const digits = extractDigits(phone?.phone || '');
  if (!ddd && !digits) return 'Nao informado';
  if (!digits) return `(${ddd})`;
  if (digits.length <= 4) return ddd ? `(${ddd}) ${digits}` : digits;

  const lastFour = digits.slice(-4);
  const firstPart = digits.slice(0, -4);
  return ddd ? `(${ddd}) ${firstPart}-${lastFour}` : `${firstPart}-${lastFour}`;
};

const normalizeConnection = item => ({
  id: item?.id || item?.['@id'] || `connection-${Math.random()}`,
  name: item?.name || 'Sem nome',
  status: item?.status?.status || item?.status || 'Pendente',
  type: item?.type || 'Nenhum',
  channel: item?.channel || 'whatsapp',
  phone: item?.phone || {},
  phoneLabel: formatPhoneLabel(item?.phone),
});

const sanitizeDdi = value => extractDigits(value).slice(0, 3);
const sanitizeDdd = value => extractDigits(value).slice(0, 2);
const sanitizePhone = value => extractDigits(value).slice(0, 9);

export default function WhatsAppConnectionPage() {
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const connectionsStore = useStore('connections');
  const { currentCompany } = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;
  const connectionsActions = connectionsStore.actions;
  const { showError, showSuccess, showInfo } = useToastMessage();

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
  const [submitting, setSubmitting] = useState(false);
  const [connections, setConnections] = useState([]);
  const [ddi, setDdi] = useState('55');
  const [ddd, setDdd] = useState('');
  const [phone, setPhone] = useState('');
  const [qrValue, setQrValue] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('');
  const [lastRequestedPhone, setLastRequestedPhone] = useState('');

  const pollingRef = useRef(null);
  const providerId = currentCompany?.id;
  const peopleIri = useMemo(
    () => (providerId ? `/people/${String(providerId).replace(/\D/g, '')}` : ''),
    [providerId],
  );

  const completePhone = useMemo(() => `${ddi}${ddd}${phone}`, [ddi, ddd, phone]);

  const clearPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const loadConnections = useCallback(async () => {
    if (!peopleIri) {
      setConnections([]);
      setLoading(false);
      return [];
    }

    try {
      const response = await connectionsActions.getItems({
        people: peopleIri,
      });
      const normalized = toArray(response).map(normalizeConnection);
      setConnections(normalized);
      return normalized;
    } catch (error) {
      showError(formatApiError(error));
      setConnections([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [connectionsActions, peopleIri, showError]);

  const requestQrCode = useCallback(async phoneNumber => {
    const targetPhone = extractDigits(phoneNumber);
    if (!targetPhone) {
      showError('Informe DDI, DDD e telefone para gerar o QR Code.');
      return null;
    }

    try {
      setSubmitting(true);
      const response = await connectionsActions.createWhatsappConnection({
        phone: targetPhone,
      });

      const nextStatus = String(response?.status || '').trim();
      const nextQr = String(response?.qr || '').trim();

      setLastRequestedPhone(targetPhone);
      setConnectionStatus(nextStatus || 'Aguardando autenticacao');

      if (nextQr) {
        setQrValue(nextQr);
      }

      if (nextStatus === 'CONNECTED') {
        clearPolling();
        setQrValue('');
        showSuccess('WhatsApp conectado com sucesso.');
        await loadConnections();
      }

      return response;
    } catch (error) {
      clearPolling();
      showError(formatApiError(error));
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [clearPolling, connectionsActions, loadConnections, showError, showSuccess]);

  const startPolling = useCallback(async selectedPhone => {
    const targetPhone = extractDigits(selectedPhone || completePhone);
    if (!targetPhone) {
      showError('Informe DDI, DDD e telefone para gerar o QR Code.');
      return;
    }

    clearPolling();
    const response = await requestQrCode(targetPhone);
    if (response?.status === 'CONNECTED') {
      return;
    }

    showInfo('Aguardando autenticacao do WhatsApp pelo QR Code.');
    pollingRef.current = setInterval(() => {
      requestQrCode(targetPhone);
    }, 5000);
  }, [clearPolling, completePhone, requestQrCode, showError, showInfo]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadConnections();

      return () => {
        clearPolling();
      };
    }, [clearPolling, loadConnections]),
  );

  useEffect(() => () => clearPolling(), [clearPolling]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadConnections();
    } finally {
      setRefreshing(false);
    }
  }, [loadConnections]);

  const handleUseExistingConnection = useCallback(item => {
    const nextDdi = String(item?.phone?.ddi || '55');
    const nextDdd = String(item?.phone?.ddd || '');
    const nextPhone = extractDigits(item?.phone?.phone || '');

    setDdi(nextDdi);
    setDdd(nextDdd);
    setPhone(nextPhone);
    setConnectionStatus(item?.status || 'Pendente');
    setLastRequestedPhone(`${nextDdi}${nextDdd}${nextPhone}`);
    setQrValue('');
  }, []);

  if (!providerId) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centerState}>
          <Icon name="building" size={32} color="#94A3B8" />
          <Text style={styles.centerStateTitle}>Selecione uma empresa</Text>
          <Text style={styles.centerStateText}>
            A configuracao do WhatsApp depende da empresa ativa.
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
          <Text style={styles.centerStateTitle}>Carregando canal</Text>
          <Text style={styles.centerStateText}>
            Buscando conexoes de WhatsApp da empresa ativa.
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
            <Text style={styles.heroEyebrow}>CANAIS DE COMUNICACAO</Text>
            <Text style={styles.heroTitle}>WhatsApp</Text>
            <Text style={styles.heroText}>
              Gere o QR Code, acompanhe o status e gerencie os numeros conectados.
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Icon name="message-circle" size={22} color={brandColors.primary} />
          </View>
        </View>

        <View style={[styles.formCard, shadowStyle]}>
          <View style={styles.formHeader}>
            <View>
              <Text style={styles.cardTitle}>Nova autenticacao</Text>
              <Text style={styles.cardSubtitle}>
                Informe o numero e solicite um novo QR Code de acesso.
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: withOpacity('#2563EB', 0.12) }]}>
              <Text style={styles.statusBadgeText}>{connectionStatus || 'Aguardando configuracao'}</Text>
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.inputGroupSmall}>
              <Text style={styles.inputLabel}>DDI</Text>
              <TextInput
                keyboardType="number-pad"
                onChangeText={value => setDdi(sanitizeDdi(value))}
                placeholder="55"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={ddi}
              />
            </View>
            <View style={styles.inputGroupSmall}>
              <Text style={styles.inputLabel}>DDD</Text>
              <TextInput
                keyboardType="number-pad"
                onChangeText={value => setDdd(sanitizeDdd(value))}
                placeholder="11"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={ddd}
              />
            </View>
            <View style={styles.inputGroupLarge}>
              <Text style={styles.inputLabel}>Telefone</Text>
              <TextInput
                keyboardType="number-pad"
                onChangeText={value => setPhone(sanitizePhone(value))}
                placeholder="999999999"
                placeholderTextColor="#94A3B8"
                style={styles.input}
                value={phone}
              />
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            disabled={submitting}
            onPress={() => startPolling(completePhone)}
            style={[
              styles.primaryButton,
              { backgroundColor: brandColors.primary },
              submitting && styles.primaryButtonDisabled,
            ]}>
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Icon name="smartphone" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Solicitar QR Code</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.helperText}>
            Numero atual: {completePhone || 'Nao informado'}
          </Text>
        </View>

        <View style={[styles.qrCard, shadowStyle]}>
          <View style={styles.qrHeader}>
            <View>
              <Text style={styles.cardTitle}>QR Code</Text>
              <Text style={styles.cardSubtitle}>
                Escaneie com o WhatsApp para concluir a autenticacao do canal.
              </Text>
            </View>
          </View>

          {qrValue ? (
            <View style={styles.qrContent}>
              <View style={styles.qrWrap}>
                <QRCode value={qrValue} size={210} />
              </View>
              <Text style={styles.qrCaption}>
                Atualizando automaticamente a cada 5 segundos enquanto a autenticacao estiver pendente.
              </Text>
            </View>
          ) : (
            <View style={styles.emptyStateBox}>
              <Icon name="maximize" size={24} color="#94A3B8" />
              <Text style={styles.emptyStateTitle}>QR Code indisponivel</Text>
              <Text style={styles.emptyStateText}>
                Solicite um QR Code para o numero escolhido ou selecione uma conexao existente abaixo.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.listHeader}>
          <View>
            <Text style={styles.cardTitle}>Conexoes existentes</Text>
            <Text style={styles.cardSubtitle}>
              Toque em um item para reutilizar o numero e solicitar um novo QR Code.
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{connections.length} item(ns)</Text>
          </View>
        </View>

        <View style={styles.listWrap}>
          {connections.length > 0 ? (
            connections.map(item => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.92}
                onPress={() => handleUseExistingConnection(item)}
                style={[styles.connectionCard, shadowStyle]}>
                <View style={styles.connectionTop}>
                  <View style={[styles.connectionIconWrap, { backgroundColor: withOpacity('#22C55E', 0.12) }]}>
                    <Icon name="phone-call" size={18} color="#22C55E" />
                  </View>
                  <View style={[styles.connectionStatusBadge, { backgroundColor: withOpacity('#2563EB', 0.12) }]}>
                    <Text style={styles.connectionStatusText}>{item.status}</Text>
                  </View>
                </View>

                <Text style={styles.connectionName}>{item.name}</Text>

                <View style={styles.connectionMetaRow}>
                  <View style={styles.connectionMetaItem}>
                    <Text style={styles.connectionMetaLabel}>Telefone</Text>
                    <Text style={styles.connectionMetaValue}>{item.phoneLabel}</Text>
                  </View>
                  <View style={styles.connectionMetaItem}>
                    <Text style={styles.connectionMetaLabel}>Tipo</Text>
                    <Text style={styles.connectionMetaValue}>{item.type}</Text>
                  </View>
                </View>

                <View style={styles.connectionMetaRow}>
                  <View style={styles.connectionMetaItem}>
                    <Text style={styles.connectionMetaLabel}>Canal</Text>
                    <Text style={styles.connectionMetaValue}>{item.channel}</Text>
                  </View>
                  <View style={styles.connectionMetaItem}>
                    <Text style={styles.connectionMetaLabel}>Ultima sessao</Text>
                    <Text style={styles.connectionMetaValue}>
                      {extractDigits(item.phone?.phone || '') &&
                      lastRequestedPhone &&
                      lastRequestedPhone.endsWith(extractDigits(item.phone?.phone || ''))
                        ? 'Selecionada'
                        : 'Disponivel'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={[styles.emptyStateBox, { marginTop: 4 }]}>
              <Icon name="inbox" size={24} color="#94A3B8" />
              <Text style={styles.emptyStateTitle}>Nenhuma conexao cadastrada</Text>
              <Text style={styles.emptyStateText}>
                O primeiro QR Code gerado vai iniciar a configuracao deste canal para a empresa.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
