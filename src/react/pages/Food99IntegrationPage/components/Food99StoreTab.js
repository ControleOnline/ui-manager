import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { withOpacity } from '@controleonline/../../src/styles/branding';

import styles from '../styles';

// Aba dedicada ao vínculo da loja e ao status operacional remoto.
export default function Food99StoreTab({
  shadowStyle,
  accentColor,
  statusRows,
  lastMenuPublishState,
  publicationTone,
  publishStateLabel,
  lastMenuTaskMessage,
  lastErrorMessage,
  actionLoading,
  connected,
  isOnline,
  onRefresh,
  onConnect,
  onToggleStatus,
  manualShopId,
  setManualShopId,
  onManualBind,
  onDisconnect,
}) {
  return (
    <>
      <View style={[styles.panel, shadowStyle]}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Status da loja</Text>
          <TouchableOpacity
            style={styles.inlineAction}
            onPress={onRefresh}
            disabled={actionLoading === 'refresh'}>
            <Icon name="refresh-cw" size={14} color={accentColor} />
            <Text style={[styles.inlineActionText, { color: accentColor }]}>Atualizar</Text>
          </TouchableOpacity>
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

        <View style={styles.statusRows}>
          {statusRows.map(row => (
            <View
              key={row.label}
              style={[
                styles.statusRowItem,
                row.wide && styles.statusRowItemWide,
              ]}>
              <Text style={styles.statusRowLabel}>{row.label}</Text>
              <Text style={row.small ? styles.statusRowValueSmall : styles.statusRowValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actionRow}>
          {!connected ? (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: accentColor }]}
              onPress={onConnect}
              disabled={actionLoading === 'connect'}>
              {actionLoading === 'connect' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="link-2" size={16} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Integrar loja</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: isOnline ? '#F97316' : accentColor },
              ]}
              onPress={onToggleStatus}
              disabled={actionLoading === 'online' || actionLoading === 'offline'}>
              {actionLoading === 'online' || actionLoading === 'offline' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name={isOnline ? 'pause-circle' : 'play-circle'} size={16} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>
                    {isOnline ? 'Colocar offline' : 'Colocar online'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[styles.panel, shadowStyle]}>
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.panelTitle}>Conexao da loja</Text>
            <Text style={styles.panelSubtitle}>
              Separei o vínculo manual e a desconexão para não misturar com as configurações operacionais.
            </Text>
          </View>
        </View>

        {!connected ? (
          <>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Conectar manualmente por shop_id</Text>
              <TextInput
                value={manualShopId}
                onChangeText={setManualShopId}
                placeholder="Informe o shop_id da 99Food"
                style={styles.formInput}
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.formRow}>
              <TouchableOpacity
                style={[styles.secondaryActionButton, { borderColor: accentColor }]}
                onPress={onManualBind}
                disabled={actionLoading === 'bind-manual'}>
                {actionLoading === 'bind-manual' ? (
                  <ActivityIndicator size="small" color={accentColor} />
                ) : (
                  <>
                    <Icon name="link" size={15} color={accentColor} />
                    <Text style={[styles.secondaryActionButtonText, { color: accentColor }]}>
                      Vincular shop_id
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.formRow}>
            <TouchableOpacity
              style={[styles.secondaryActionButton, styles.dangerActionButton]}
              onPress={onDisconnect}
              disabled={actionLoading === 'disconnect'}>
              {actionLoading === 'disconnect' ? (
                <ActivityIndicator size="small" color="#B91C1C" />
              ) : (
                <>
                  <Icon name="unlink" size={15} color="#B91C1C" />
                  <Text style={[styles.secondaryActionButtonText, { color: '#B91C1C' }]}>Desconectar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}
