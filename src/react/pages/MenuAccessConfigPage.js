import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import {useStore} from '@store';
import {api} from '@controleonline/ui-common/src/api';
import {userHasRole} from '@controleonline/ui-common/src/react/utils/runtimeMenu';
import useToastMessage from '@controleonline/ui-crm/src/react/hooks/useToastMessage';
import styles from './MenuAccessConfigPage.styles';

const APP_TYPES = ['MANAGER', 'CRM', 'POS', 'DELIVERY', 'PPC', 'SHOP'];
const LINK_TYPES = [
  'owner',
  'director',
  'manager',
  'employee',
  'salesman',
  'after-sales',
];
const ITEMS_PER_PAGE = 40;

const formatApiError = error => {
  if (typeof error === 'string') return error;
  if (Array.isArray(error?.message)) return error.message.map(item => item?.message || item).join('\n');
  return error?.message || error?.description || 'Nao foi possivel salvar a configuracao do menu.';
};

const linkTypeLabel = linkType =>
  global.t?.t('people', 'label', linkType) || linkType;

const routeLabel = item =>
  item?.route?.route || item?.route || '-';

export default function MenuAccessConfigPage() {
  const authStore = useStore('auth');
  const {user} = authStore.getters;
  const {showError, showSuccess} = useToastMessage();

  const [activeAppType, setActiveAppType] = useState('MANAGER');
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [availableAppTypes, setAvailableAppTypes] = useState(APP_TYPES);
  const [availableLinkTypes, setAvailableLinkTypes] = useState(LINK_TYPES);
  const [appTypeSelectorOpen, setAppTypeSelectorOpen] = useState(false);

  const canManageMenus = userHasRole(user, 'ROLE_SUPER');
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  const loadMenus = useCallback(async () => {
    if (!canManageMenus) return;

    setIsLoading(true);
    try {
      const response = await api.fetch('menu-config', {
        params: {
          appType: activeAppType,
          page,
          itemsPerPage: ITEMS_PER_PAGE,
        },
      });

      setItems(Array.isArray(response?.member) ? response.member : []);
      setTotalItems(Number(response?.totalItems || 0));
      if (Array.isArray(response?.summary?.appTypes)) {
        setAvailableAppTypes(response.summary.appTypes);
      }
      if (Array.isArray(response?.summary?.linkTypes)) {
        setAvailableLinkTypes(response.summary.linkTypes);
      }
    } catch (error) {
      showError(formatApiError(error));
    } finally {
      setIsLoading(false);
    }
  }, [activeAppType, canManageMenus, page, showError]);

  useEffect(() => {
    loadMenus();
  }, [loadMenus]);

  const toggleLinkType = async (item, linkType) => {
    const current = Array.isArray(item?.linkTypes) ? item.linkTypes : [];
    const next = current.includes(linkType)
      ? current.filter(value => value !== linkType)
      : [...current, linkType];

    setSavingId(item.id);
    try {
      const saved = await api.fetch(`menu-config/${item.id}`, {
        method: 'PATCH',
        body: {
          linkTypes: next,
        },
      });

      setItems(currentItems =>
        currentItems.map(currentItem =>
          currentItem.id === item.id ? saved : currentItem,
        ),
      );
      showSuccess('Menu atualizado.');
    } catch (error) {
      showError(formatApiError(error));
    } finally {
      setSavingId(null);
    }
  };

  const toggleEnabled = async item => {
    setSavingId(item.id);
    try {
      const saved = await api.fetch(`menu-config/${item.id}`, {
        method: 'PATCH',
        body: {
          enabled: !item.enabled,
        },
      });

      setItems(currentItems =>
        currentItems.map(currentItem =>
          currentItem.id === item.id ? saved : currentItem,
        ),
      );
      showSuccess('Menu atualizado.');
    } catch (error) {
      showError(formatApiError(error));
    } finally {
      setSavingId(null);
    }
  };

  if (!canManageMenus) {
    return (
      <View style={styles.centerState}>
        <Icon name="lock" size={28} color="#64748B" />
        <Text style={styles.centerTitle}>Acesso restrito</Text>
        <Text style={styles.centerText}>Esta configuracao e exclusiva do super admin.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Menus por perfil</Text>
        <Text style={styles.subtitle}>Configure quais atalhos aparecem para cada APP_TYPE e vinculo.</Text>
      </View>

      <View style={styles.appTypeSelector}>
        <Text style={styles.selectorLabel}>APP_TYPE</Text>
        <TouchableOpacity
          activeOpacity={0.82}
          style={styles.appTypeSelectButton}
          onPress={() => setAppTypeSelectorOpen(open => !open)}
        >
          <Text style={styles.appTypeSelectText}>{activeAppType}</Text>
          <Icon
            name={appTypeSelectorOpen ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#334155"
          />
        </TouchableOpacity>

        {appTypeSelectorOpen && (
          <View style={styles.appTypeOptions}>
            {availableAppTypes.map(appType => (
              <TouchableOpacity
                key={appType}
                activeOpacity={0.82}
                style={[
                  styles.appTypeOption,
                  activeAppType === appType && styles.appTypeOptionActive,
                ]}
                onPress={() => {
                  setActiveAppType(appType);
                  setPage(1);
                  setAppTypeSelectorOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.appTypeOptionText,
                    activeAppType === appType && styles.appTypeOptionTextActive,
                  ]}
                >
                  {appType}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.centerText}>Carregando menus...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {items.map(item => {
            const selected = Array.isArray(item?.linkTypes) ? item.linkTypes : [];
            const disabled = savingId === item.id;

            return (
              <View key={item.id} style={[styles.row, !item.enabled && styles.rowDisabled]}>
                <View style={styles.rowHeader}>
                  <View style={styles.rowTitleGroup}>
                    <Text style={styles.menuTitle}>{item.menu || item.label}</Text>
                    <Text style={styles.menuMeta}>
                      {item.category?.name || '-'} - {routeLabel(item)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.82}
                    disabled={disabled}
                    style={[styles.enabledButton, item.enabled && styles.enabledButtonActive]}
                    onPress={() => toggleEnabled(item)}
                  >
                    <Icon
                      name={item.enabled ? 'eye' : 'eye-off'}
                      size={14}
                      color={item.enabled ? '#FFFFFF' : '#64748B'}
                    />
                    <Text style={[styles.enabledText, item.enabled && styles.enabledTextActive]}>
                      {item.enabled ? 'Ativo' : 'Inativo'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.linkGrid}>
                  {availableLinkTypes.map(linkType => {
                    const active = selected.includes(linkType);

                    return (
                      <TouchableOpacity
                        key={`${item.id}-${linkType}`}
                        activeOpacity={0.82}
                        disabled={disabled}
                        style={[styles.linkButton, active && styles.linkButtonActive]}
                        onPress={() => toggleLinkType(item, linkType)}
                      >
                        <Icon
                          name={active ? 'check-square' : 'square'}
                          size={14}
                          color={active ? '#2563EB' : '#94A3B8'}
                        />
                        <Text style={[styles.linkText, active && styles.linkTextActive]}>
                          {linkTypeLabel(linkType)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}

          {items.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.centerText}>Nenhum menu cadastrado para este APP_TYPE.</Text>
            </View>
          )}
        </ScrollView>
      )}

      <View style={styles.pagination}>
        <TouchableOpacity
          style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
          disabled={page <= 1}
          onPress={() => setPage(currentPage => Math.max(1, currentPage - 1))}
        >
          <Icon name="chevron-left" size={16} color={page <= 1 ? '#94A3B8' : '#0F172A'} />
        </TouchableOpacity>
        <Text style={styles.pageText}>{page} / {totalPages}</Text>
        <TouchableOpacity
          style={[styles.pageButton, page >= totalPages && styles.pageButtonDisabled]}
          disabled={page >= totalPages}
          onPress={() => setPage(currentPage => Math.min(totalPages, currentPage + 1))}
        >
          <Icon name="chevron-right" size={16} color={page >= totalPages ? '#94A3B8' : '#0F172A'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
