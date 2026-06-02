import React from 'react';
import { Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { colors } from '@controleonline/../../src/styles/colors';

import { withOpacity } from '@controleonline/../../src/styles/branding';

import styles from '../styles';

// Aba inicial com leitura rápida da integração 99Food.
export default function Food99OverviewTab({
  shadowStyle,
  connected,
  needsReconnect,
  summaryCards,
  lastMenuPublishState,
  publicationTone,
  publishStateLabel,
  lastMenuTaskMessage,
  lastErrorMessage,
  palette = colors,
}) {
  const reconnectRequired = Boolean(needsReconnect);
  const pillBackgroundColor = reconnectRequired
    ? withOpacity(palette.warning, 0.24)
    : connected
      ? withOpacity(palette.success, 0.18)
      : withOpacity(palette.warning, 0.24);
  const pillTextColor = reconnectRequired
    ? palette.warning
    : connected
      ? palette.success
      : palette.warning;
  const pillLabel = reconnectRequired
    ? 'Reconexão necessária'
    : connected
      ? '99Food conectado'
      : 'Integração pendente';

  return (
    <>
      <View style={styles.companyRow}>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: pillBackgroundColor },
          ]}>
          <Text
            style={[
              styles.statusPillText,
              { color: pillTextColor },
            ]}>
            {pillLabel}
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
            <Icon name="alert-circle" size={14} color={palette.error} />
            <Text style={styles.errorBannerText}>{lastErrorMessage}</Text>
          </View>
        )}

        {reconnectRequired && !lastMenuPublishState && !lastErrorMessage ? (
          <View style={[styles.infoBanner, { backgroundColor: withOpacity(palette.warning, 0.24) }]}>
            <Icon name="alert-triangle" size={14} color={palette.warning} />
            <Text style={[styles.infoBannerText, { color: palette.warning }]}>
              A loja está vinculada localmente, mas a conexão remota caiu. Use a aba Loja para reconectar e retomar os webhooks.
            </Text>
          </View>
        ) : !lastMenuPublishState && !lastErrorMessage ? (
          <View style={[styles.infoBanner, { backgroundColor: withOpacity(palette.info, 0.12) }]}>
            <Icon name="info" size={14} color={palette.info} />
            <Text style={[styles.infoBannerText, { color: palette.info }]}>
              A aba de loja concentra status remoto e ações de conexão. A aba de cardápio cuida somente dos produtos.
            </Text>
          </View>
        ) : null}
      </View>
    </>
  );
}
