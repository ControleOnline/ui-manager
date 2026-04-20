import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { withOpacity } from '@controleonline/../../src/styles/branding';

import styles from '../styles';

// Aba responsável pela conexão da empresa com a loja remota do iFood.
export default function IFoodStoreTab({
  shadowStyle,
  accentColor,
  stores,
  merchantIdInput,
  setMerchantIdInput,
  ifoodCode,
  selectedStore,
  connected,
  actionLoading,
  onConnect,
  onDisconnect,
  onSync,
}) {
  return (
    <View style={[styles.sectionCard, shadowStyle]}>
      <Text style={styles.sectionTitle}>Lojas disponiveis no iFood</Text>

      <View style={styles.helperRow}>
        <Text style={styles.helperText}>
          Escolha uma loja sugerida pela API ou informe manualmente o `merchant_id` para concluir a vinculacao.
        </Text>
      </View>

      {stores.length > 0 ? (
        <View style={styles.storesList}>
          {stores.map(store => {
            const storeId = String(store?.merchant_id || '');
            const selected = storeId !== '' && (storeId === merchantIdInput || storeId === ifoodCode);

            return (
              <TouchableOpacity
                key={storeId}
                activeOpacity={0.9}
                style={[styles.storeCard, selected && styles.storeCardSelected]}
                onPress={() => setMerchantIdInput(storeId)}>
                <View style={styles.storeTop}>
                  <Text style={styles.storeName}>{store?.name || `Loja ${storeId}`}</Text>
                  <View
                    style={[
                      styles.storeStatusChip,
                      {
                        backgroundColor: withOpacity(
                          store?.status === 'AVAILABLE' ? '#16A34A' : '#64748B',
                          0.14,
                        ),
                      },
                    ]}>
                    <Text
                      style={[
                        styles.storeStatusText,
                        { color: store?.status === 'AVAILABLE' ? '#166534' : '#334155' },
                      ]}>
                      {store?.status_label || 'Indefinido'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.storeCode}>código: {storeId}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyStores}>
          <Text style={styles.emptyStoresText}>
            Nenhuma loja retornada pela API iFood. Voce ainda pode conectar manualmente por `merchant_id`.
          </Text>
        </View>
      )}

      <Text style={styles.inputLabel}>Código iFood para vinculação</Text>
      <TextInput
        value={merchantIdInput}
        onChangeText={setMerchantIdInput}
        placeholder="Ex.: c1111111-aaaa-bbbb-cccc-222222222222"
        placeholderTextColor="#94A3B8"
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.actionsRow}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.actionButton, { backgroundColor: accentColor }]}
          onPress={onConnect}
          disabled={actionLoading !== null}>
          {actionLoading === 'connect' ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Icon name="link" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Conectar</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.actionButtonSecondary, !connected && styles.actionButtonSecondaryDisabled]}
          onPress={onDisconnect}
          disabled={actionLoading !== null || !connected}>
          {actionLoading === 'disconnect' ? (
            <ActivityIndicator color="#EF4444" size="small" />
          ) : (
            <>
              <Icon name="x-circle" size={16} color="#EF4444" />
              <Text style={styles.actionButtonSecondaryText}>Desconectar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.syncButton, { borderColor: accentColor }]}
        onPress={onSync}
        disabled={actionLoading !== null}>
        {actionLoading === 'sync' ? (
          <ActivityIndicator color={accentColor} size="small" />
        ) : (
          <>
            <Icon name="refresh-cw" size={16} color={accentColor} />
            <Text style={[styles.syncButtonText, { color: accentColor }]}>Sincronizar estado remoto</Text>
          </>
        )}
      </TouchableOpacity>

      {!!selectedStore && (
        <View style={styles.selectedStoreBox}>
          <Text style={styles.selectedStoreTitle}>Loja selecionada</Text>
          <Text style={styles.selectedStoreText}>{selectedStore?.name || 'Sem nome'}</Text>
          <Text style={styles.selectedStoreText}>código: {selectedStore?.merchant_id}</Text>
        </View>
      )}
    </View>
  );
}
