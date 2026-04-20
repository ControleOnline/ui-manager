import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { withOpacity } from '@controleonline/../../src/styles/branding';

import styles from '../styles';
import {
  deliveryMethodOptions,
  sanitizeConfirmMethodInput,
  sanitizeRadiusInput,
  sanitizeTimeInput,
} from '../utils';

// Aba isolada para configurações operacionais da loja.
export default function Food99SettingsTab({
  shadowStyle,
  accentColor,
  settingsSummaryRows,
  storeSettingsDraft,
  setStoreSettingsDraft,
  actionLoading,
  onSave,
}) {
  return (
    <View style={[styles.panel, shadowStyle]}>
      <View style={styles.panelHeader}>
        <View>
          <Text style={styles.panelTitle}>Configuracoes operacionais</Text>
          <Text style={styles.panelSubtitle}>
            Ajuste raio, horario, metodo de entrega e confirmacao sem misturar isso com a conexão da loja.
          </Text>
        </View>
      </View>

      <View style={styles.statusRows}>
        {settingsSummaryRows.map(row => (
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

      <View style={styles.settingsForm}>
        <View style={styles.formField}>
          <Text style={styles.formLabel}>Raio de atendimento (km)</Text>
          <TextInput
            value={storeSettingsDraft.deliveryRadiusKm}
            onChangeText={value =>
              setStoreSettingsDraft(current => ({ ...current, deliveryRadiusKm: sanitizeRadiusInput(value) }))
            }
            placeholder="Ex.: 5"
            keyboardType="decimal-pad"
            style={styles.formInput}
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formField, styles.formFieldHalf]}>
            <Text style={styles.formLabel}>Abertura (HH:mm)</Text>
            <TextInput
              value={storeSettingsDraft.openTime}
              onChangeText={value =>
                setStoreSettingsDraft(current => ({ ...current, openTime: sanitizeTimeInput(value) }))
              }
              placeholder="08:00"
              keyboardType="number-pad"
              maxLength={5}
              style={styles.formInput}
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={[styles.formField, styles.formFieldHalf]}>
            <Text style={styles.formLabel}>Fechamento (HH:mm)</Text>
            <TextInput
              value={storeSettingsDraft.closeTime}
              onChangeText={value =>
                setStoreSettingsDraft(current => ({ ...current, closeTime: sanitizeTimeInput(value) }))
              }
              placeholder="22:00"
              keyboardType="number-pad"
              maxLength={5}
              style={styles.formInput}
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formField, styles.formFieldHalf]}>
            <Text style={styles.formLabel}>Metodo de entrega</Text>
            <View style={styles.optionGroup}>
              {deliveryMethodOptions.map(option => {
                const selected = String(storeSettingsDraft.deliveryMethod) === String(option.value);

                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() =>
                      setStoreSettingsDraft(current => ({ ...current, deliveryMethod: option.value }))
                    }
                    style={[
                      styles.optionChip,
                      selected && {
                        borderColor: accentColor,
                        backgroundColor: withOpacity(accentColor, 0.12),
                      },
                    ]}>
                    <Text style={[styles.optionChipText, selected && { color: accentColor }]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={[styles.formField, styles.formFieldHalf]}>
            <Text style={styles.formLabel}>Metodo de confirmacao</Text>
            <TextInput
              value={storeSettingsDraft.confirmMethod}
              onChangeText={value =>
                setStoreSettingsDraft(current => ({ ...current, confirmMethod: sanitizeConfirmMethodInput(value) }))
              }
              placeholder="Ex.: 1"
              keyboardType="number-pad"
              maxLength={3}
              style={styles.formInput}
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        <View style={styles.formField}>
          <Text style={styles.formLabel}>ID da area de entrega (opcional)</Text>
          <TextInput
            value={storeSettingsDraft.deliveryAreaId}
            onChangeText={value =>
              setStoreSettingsDraft(current => ({ ...current, deliveryAreaId: value }))
            }
            placeholder="Usa automaticamente a primeira area quando vazio"
            style={styles.formInput}
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: accentColor }]}
          onPress={onSave}
          disabled={actionLoading === 'save-settings'}>
          {actionLoading === 'save-settings' ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Icon name="save" size={16} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Salvar configuracoes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
