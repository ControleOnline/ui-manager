import React from 'react';
import { Text, View } from 'react-native';

import { withOpacity } from '@controleonline/../../src/styles/branding';

import styles from '../styles';

// Aba de resumo da integração iFood.
export default function IFoodOverviewTab({
  shadowStyle,
  integration,
  connected,
  remoteConnected,
  authAvailable,
  statusTone,
  statusText,
  eligibleCount,
  selectedStoreDetail,
}) {
  return (
    <View style={[styles.sectionCard, shadowStyle]}>
      <View style={styles.statusRow}>
        <Text style={styles.sectionTitle}>Status da integracao</Text>
        <View style={[styles.statusBadge, { backgroundColor: withOpacity(statusTone, 0.12) }]}>
          <Text style={[styles.statusBadgeText, { color: statusTone }]}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>Loja vinculada</Text>
          <Text style={styles.metaValue}>{integration?.merchant_name || integration?.merchant_id || 'Nao vinculada'}</Text>
        </View>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>Status remoto</Text>
          <Text style={styles.metaValue}>{integration?.merchant_status_label || 'Indefinido'}</Text>
        </View>
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>Token OAuth</Text>
          <Text style={styles.metaValue}>{authAvailable ? 'Disponivel' : 'Indisponivel'}</Text>
        </View>
        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>Produtos aptos</Text>
          <Text style={styles.metaValue}>{eligibleCount}</Text>
        </View>
      </View>

      <View style={styles.helperRow}>
        <Text style={styles.helperText}>
          {remoteConnected
            ? 'A vinculacao local esta confirmada na conta iFood.'
            : connected
              ? 'Loja vinculada localmente. Execute sincronizacao para validar no iFood.'
              : 'Selecione uma loja ou informe o código iFood para conectar.'}
        </Text>
      </View>

      {!!integration?.last_error_message && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Ultimo erro</Text>
          <Text style={styles.errorText}>{integration.last_error_message}</Text>
        </View>
      )}

      {!!selectedStoreDetail && (
        <View style={styles.selectedStoreBox}>
          <Text style={styles.selectedStoreTitle}>Detalhes da loja</Text>

          <View style={styles.metaGrid}>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Nome fantasia</Text>
              <Text style={styles.metaValue}>{selectedStoreDetail?.name || '--'}</Text>
            </View>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Status</Text>
              <Text style={styles.metaValue}>{selectedStoreDetail?.status_label || '--'}</Text>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Razao social</Text>
              <Text style={styles.metaValue}>{selectedStoreDetail?.corporate_name || '--'}</Text>
            </View>
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Tipo</Text>
              <Text style={styles.metaValue}>{selectedStoreDetail?.type || '--'}</Text>
            </View>
          </View>

          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Endereco</Text>
            <Text style={styles.metaValue}>
              {selectedStoreDetail?.address?.formatted || 'Endereco nao informado'}
            </Text>
          </View>

          {Array.isArray(selectedStoreDetail?.operations) && selectedStoreDetail.operations.length > 0 && (
            <View style={styles.storeOperationsBox}>
              <Text style={styles.metaLabel}>Operacoes configuradas</Text>
              {selectedStoreDetail.operations.map((operation, index) => (
                <Text key={`${operation?.name || 'operation'}-${index}`} style={styles.operationText}>
                  {operation?.name || 'Operacao'}
                  {Array.isArray(operation?.sales_channels) && operation.sales_channels.length > 0
                    ? ` - ${operation.sales_channels.join(', ')}`
                    : ''}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
