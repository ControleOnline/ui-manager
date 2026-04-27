import React from 'react';
import { Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { withOpacity } from '@controleonline/../../src/styles/branding';

import styles from '../styles';

// Aba inicial com leitura rápida da integração 99Food.
export default function Food99OverviewTab({
  shadowStyle,
  connected,
  summaryCards,
  lastMenuPublishState,
  publicationTone,
  publishStateLabel,
  lastMenuTaskMessage,
  lastErrorMessage,
}) {
  return (
    <>
      <View style={styles.companyRow}>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: connected ? '#DCFCE7' : '#FEF3C7' },
          ]}>
          <Text
            style={[
              styles.statusPillText,
              { color: connected ? '#166534' : '#92400E' },
            ]}>
            {connected ? '99Food conectado' : 'Integracao pendente'}
          </Text>
        </View>
      </View>

      <View style={styles.summaryGrid}>
        {summaryCards.map(card => (
          <View key={card.key} style={[styles.summaryCard, shadowStyle]}>
            <View style={[styles.summaryIcon, { backgroundColor: withOpacity(card.color, 0.12) }]}>
              <Icon name={card.icon} size={18} color={card.color} />
            </View>
            <Text style={styles.summaryValue}>{card.value}</Text>
            <Text style={styles.summaryLabel}>{card.label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.panel, shadowStyle]}>
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.panelTitle}>Leitura rapida</Text>
            <Text style={styles.panelSubtitle}>
              Use as abas seguintes para trabalhar conexao, configuracoes e catalogo separadamente.
            </Text>
          </View>
        </View>

        {!!lastMenuPublishState && (
          <View style={[styles.infoBanner, { backgroundColor: withOpacity(publicationTone, 0.12) }]}>
            <Icon
              name={
                lastMenuPublishState === 'failed'
                  ? 'alert-triangle'
                  : lastMenuPublishState === 'published'
                    ? 'check-circle'
                    : 'clock'
              }
              size={14}
              color={publicationTone}
            />
            <Text style={[styles.infoBannerText, { color: publicationTone }]}>
              {publishStateLabel}
              {lastMenuTaskMessage ? ` • ${lastMenuTaskMessage}` : ''}
            </Text>
          </View>
        )}

        {!!lastErrorMessage && lastMenuPublishState !== 'failed' && (
          <View style={styles.errorBanner}>
            <Icon name="alert-circle" size={14} color="#B91C1C" />
            <Text style={styles.errorBannerText}>{lastErrorMessage}</Text>
          </View>
        )}

        {!lastMenuPublishState && !lastErrorMessage && (
          <View style={[styles.infoBanner, { backgroundColor: '#EFF6FF' }]}>
            <Icon name="info" size={14} color="#2563EB" />
            <Text style={[styles.infoBannerText, { color: '#1D4ED8' }]}>
              A aba de loja concentra status remoto e ações de conexão. A aba de cardápio cuida somente dos produtos.
            </Text>
          </View>
        )}
      </View>
    </>
  );
}
