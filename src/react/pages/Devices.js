import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useStore } from '@store';
import Formatter from '@controleonline/ui-common/src/utils/formatter';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import { resolveThemePalette, withOpacity } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import Icon from 'react-native-vector-icons/Feather';

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  android: { elevation: 2 },
  web: { boxShadow: '0 4px 12px rgba(15,23,42,0.06)' },
});

const hex = {
  primary: '#0EA5E9',
  success: '#22C55E',
  danger:  '#EF4444',
};

const getStatus = dc => {
  const closed = dc?.configs?.['cash-wallet-closed-id'];
  return closed === 0 || closed === '0' || closed === undefined || closed === null
    ? 'open'
    : 'closed';
};

const Devices = () => {
  const navigation          = useNavigation();
  const peopleStore         = useStore('people');
  const deviceConfigStore   = useStore('device_config');
  const themeStore          = useStore('theme');

  const { currentCompany }                                   = peopleStore.getters;
  const { colors: themeColors }                              = themeStore.getters;
  const { items: deviceConfigs, isLoading }                  = deviceConfigStore.getters;

  const actionsRef = useRef({});
  actionsRef.current = { deviceConfigActions: deviceConfigStore.actions };

  const brandColors = useMemo(
    () => resolveThemePalette({ ...themeColors, ...(currentCompany?.theme?.colors || {}) }, colors),
    [themeColors, currentCompany?.id],
  );

  const scopedDeviceConfigs = useMemo(
    () =>
      (deviceConfigs || []).filter(dc => {
        const peopleId = String(dc?.people?.id || dc?.people || '').replace(/\D/g, '');
        const companyId = String(currentCompany?.id || '').replace(/\D/g, '');
        return !companyId || peopleId === companyId;
      }),
    [currentCompany?.id, deviceConfigs],
  );

  useEffect(() => {
    if (currentCompany?.id) {
      actionsRef.current.deviceConfigActions.getItems({ people: `/people/${currentCompany.id}` });
    }
  }, [currentCompany?.id]);

  useFocusEffect(
    useCallback(() => {
      if (currentCompany?.id) {
        actionsRef.current.deviceConfigActions.getItems({ people: `/people/${currentCompany.id}` });
      }
    }, [currentCompany?.id]),
  );

  const openCount = useMemo(
    () => scopedDeviceConfigs.filter(dc => getStatus(dc) === 'open').length,
    [scopedDeviceConfigs],
  );

  const goToDetail = useCallback(dc => {
    navigation.navigate('DeviceDetail', {
      dcId:         dc.id,
      deviceId:     dc.device?.id,
      deviceString: dc.device?.device,
      alias:        dc.device?.alias || dc.device?.device || `Dispositivo #${dc.id}`,
      configs:      dc.configs || {},
    });
  }, [navigation]);

  const renderItem = ({ item: dc }) => {
    const isOpen  = getStatus(dc) === 'open';
    const alias   = dc.device?.alias || dc.device?.device || `Dispositivo #${dc.id}`;
    const accent  = isOpen ? hex.success : hex.danger;

    return (
      <TouchableOpacity
        style={styles.deviceCard}
        activeOpacity={0.82}
        onPress={() => goToDetail(dc)}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.iconBox, { backgroundColor: withOpacity(accent, 0.1) }]}>
            <Icon name="monitor" size={18} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.deviceTitle} numberOfLines={1}>{alias}</Text>
            <Text style={styles.deviceSub} numberOfLines={1}>
              {dc.device?.device || ''}
            </Text>
          </View>
        </View>

        <View style={styles.cardRight}>
          <View style={[styles.badge, { backgroundColor: withOpacity(accent, 0.12), borderColor: withOpacity(accent, 0.4) }]}>
            <View style={[styles.dot, { backgroundColor: accent }]} />
            <Text style={[styles.badgeText, { color: accent }]}>
              {isOpen ? 'Aberto' : 'Fechado'}
            </Text>
          </View>
          <Icon name="chevron-right" size={16} color="#CBD5E1" style={{ marginLeft: 8 }} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: brandColors.background }]}>
      <StateStore store="device_config" />

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Dispositivos</Text>
          <Text style={styles.summaryValue}>{scopedDeviceConfigs.length || 0}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Abertos</Text>
          <Text style={[styles.summaryValue, { color: hex.success }]}>{openCount}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Fechados</Text>
          <Text style={[styles.summaryValue, { color: hex.danger }]}>
            (scopedDeviceConfigs.length || 0) - openCount
          </Text>
        </View>
      </View>

      {isLoading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={brandColors.primary} />
          <Text style={styles.loadingText}>Carregando dispositivos...</Text>
        </View>
      )}

      <FlatList
        data={scopedDeviceConfigs || []}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyBox}>
              <Icon name="monitor" size={32} color="#CBD5E1" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>Nenhum dispositivo encontrado</Text>
              <Text style={styles.emptySub}>Cadastre dispositivos para visualizar os equipamentos da empresa.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...cardShadow,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#94A3B8',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },

  loadingBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  listContent: {
    gap: 10,
    paddingBottom: 24,
  },

  deviceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...cardShadow,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  deviceSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  emptyBox: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    ...cardShadow,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
});

export default Devices;
