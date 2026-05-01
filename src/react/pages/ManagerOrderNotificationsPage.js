import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useFocusEffect} from '@react-navigation/native';
import {useStore} from '@store';
import {useMessage} from '@controleonline/ui-common/src/react/components/MessageService';
import {
  applyManagerOrderNotificationPreferences,
  getManagerOrderNotificationPermissionStatus,
  resolveManagerOrderNotificationPreferences,
  requestManagerOrderNotificationPermission,
} from '@controleonline/ui-common/src/react/utils/managerOrderNotifications';
import {colors} from '@controleonline/../../src/styles/colors';

const permissionStatusLabels = {
  granted: 'Permissão do sistema liberada.',
  default: 'Permissão do sistema ainda não confirmada.',
  denied: 'Permissão do sistema negada.',
  unsupported: 'Este ambiente não expõe notificações locais.',
};

export default function ManagerOrderNotificationsPage() {
  const authStore = useStore('auth');
  const {showError, showSuccess} = useMessage() || {};
  const authActions = authStore.actions;
  const {user} = authStore.getters;

  const currentPreferences = useMemo(
    () => resolveManagerOrderNotificationPreferences(user),
    [user],
  );

  const [pushEnabled, setPushEnabled] = useState(currentPreferences.pushEnabled);
  const [soundEnabled, setSoundEnabled] = useState(
    currentPreferences.soundEnabled,
  );
  const [soundUrl, setSoundUrl] = useState(currentPreferences.soundUrl);
  const [permissionStatus, setPermissionStatus] = useState('default');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setPushEnabled(currentPreferences.pushEnabled);
    setSoundEnabled(currentPreferences.soundEnabled);
    setSoundUrl(currentPreferences.soundUrl);
  }, [currentPreferences]);

  const loadPermissionStatus = useCallback(async () => {
    setPermissionStatus(await getManagerOrderNotificationPermissionStatus());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPermissionStatus();
    }, [loadPermissionStatus]),
  );

  const handleSave = useCallback(async () => {
    if (isSaving) {
      return;
    }

    const normalizedSoundUrl = String(soundUrl || '').trim();

    if (pushEnabled && soundEnabled && !normalizedSoundUrl) {
      showError?.('Informe a URL do audio para tocar junto da notificacao.');
      return;
    }

    setIsSaving(true);

    try {
      let nextPermissionStatus = permissionStatus;

      if (pushEnabled) {
        nextPermissionStatus = await requestManagerOrderNotificationPermission();
        setPermissionStatus(nextPermissionStatus);

        if (nextPermissionStatus !== 'granted') {
          throw new Error(
            nextPermissionStatus === 'unsupported'
              ? 'Este ambiente nao permite notificacoes locais.'
              : 'Permita as notificacoes do sistema para ativar o aviso push.',
          );
        }
      }

      authActions.logIn(
        applyManagerOrderNotificationPreferences(user, {
          pushEnabled,
          soundEnabled,
          soundUrl: normalizedSoundUrl,
        }),
      );

      showSuccess?.(
        pushEnabled
          ? 'Notificacoes de pedidos atualizadas.'
          : 'Notificacoes de pedidos desativadas.',
      );
    } catch (error) {
      showError?.(
        error?.message || 'Nao foi possivel salvar as notificacoes do gestor.',
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    authActions,
    isSaving,
    permissionStatus,
    pushEnabled,
    showError,
    showSuccess,
    soundEnabled,
    soundUrl,
    user,
  ]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>PERFIL DO GESTOR</Text>
          <Text style={styles.heroTitle}>Notificacoes de pedidos</Text>
          <Text style={styles.heroDescription}>
            Cada pedido novo recebido no Gestor pode abrir uma notificacao local.
            Se quiser, junto do push voce tambem define um audio remoto para tocar
            no mesmo gatilho do websocket.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <Icon name="notifications-active" size={20} color={colors.primary} />
            </View>
            <View style={styles.sectionHeaderCopy}>
              <Text style={styles.sectionTitle}>Push de novos pedidos</Text>
              <Text style={styles.sectionDescription}>
                Ja vem habilitado por padrao, mas voce pode desligar quando nao
                quiser receber avisos no Gestor.
              </Text>
            </View>
          </View>

          <View style={styles.toggleCard}>
            <View style={styles.toggleCopy}>
              <Text style={styles.toggleLabel}>Receber notificacoes push</Text>
              <Text style={styles.toggleHint}>
                Status do sistema: {permissionStatusLabels[permissionStatus] || permissionStatus}
              </Text>
            </View>
            <Switch value={pushEnabled} onValueChange={setPushEnabled} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <Icon name="volume-up" size={20} color={colors.primary} />
            </View>
            <View style={styles.sectionHeaderCopy}>
              <Text style={styles.sectionTitle}>Aviso sonoro opcional</Text>
              <Text style={styles.sectionDescription}>
                O som usa a URL informada abaixo e dispara no mesmo evento
                `order.created` que gera a notificacao.
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.soundCard,
              !pushEnabled && styles.soundCardDisabled,
            ]}>
            <View style={styles.toggleCard}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleLabel}>Tocar audio junto do push</Text>
                <Text style={styles.toggleHint}>
                  So funciona quando as notificacoes do gestor estiverem ligadas.
                </Text>
              </View>
              <Switch
                value={soundEnabled}
                disabled={!pushEnabled}
                onValueChange={setSoundEnabled}
              />
            </View>

            <Text style={styles.inputLabel}>URL do audio</Text>
            <TextInput
              value={soundUrl}
              onChangeText={setSoundUrl}
              placeholder="https://exemplo.com/alerta.mp3"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={pushEnabled && soundEnabled}
              style={[
                styles.input,
                (!pushEnabled || !soundEnabled) && styles.inputDisabled,
              ]}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Icon
                name="save"
                size={18}
                color={colors.white}
                style={styles.saveIcon}
              />
              <Text style={styles.saveButtonText}>Salvar configuracao</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 18,
  },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  heroEyebrow: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroDescription: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  sectionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderCopy: {
    flex: 1,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionDescription: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  toggleCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  toggleCopy: {
    flex: 1,
  },
  toggleLabel: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  toggleHint: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
  },
  soundCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 18,
    gap: 14,
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  soundCardDisabled: {
    opacity: 0.7,
  },
  inputLabel: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  inputDisabled: {
    color: '#94A3B8',
    backgroundColor: '#F1F5F9',
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#0F172A',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
});
