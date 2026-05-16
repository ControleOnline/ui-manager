import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal';

import styles from '../styles';

const modalStyles = StyleSheet.create({
  form: {
    gap: 8,
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    minHeight: 44,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
  },
});

// Modal leve para cadastrar uma carteira da empresa ativa sem sair da integração.
export default function Food99QuickWalletModal({
  visible,
  walletName,
  setWalletName,
  actionLoading,
  accentColor,
  onClose,
  onCreate,
}) {
  return (
    <AnimatedModal visible={visible} onRequestClose={onClose}>
      <View style={styles.modalShell}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Cadastro rapido de carteira</Text>
              <Text style={styles.modalSubtitle}>
                Crie a carteira da empresa ativa para usá-la como carteira de repasse do 99Food.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Icon name="x" size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          <View style={modalStyles.form}>
            <Text style={modalStyles.label}>Nome da carteira</Text>
            <TextInput
              value={walletName}
              onChangeText={setWalletName}
              placeholder="Ex.: Pic Pay"
              placeholderTextColor="#94A3B8"
              autoFocus
              style={modalStyles.input}
              returnKeyType="done"
              onSubmitEditing={onCreate}
            />
            <Text style={modalStyles.hint}>
              O cadastro rápido cria a carteira na empresa ativa. Depois disso, ela fica disponível para seleção
              no campo de repasse.
            </Text>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, styles.modalPrimaryButton, { backgroundColor: accentColor }]}
              onPress={onCreate}
              disabled={actionLoading === 'create-wallet'}>
              {actionLoading === 'create-wallet' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="plus" size={16} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Criar carteira</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </AnimatedModal>
  );
}
