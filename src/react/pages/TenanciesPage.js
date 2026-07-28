import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import { app_type_base } from '@appType';
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';
import { userHasRole } from '@controleonline/ui-common/src/react/utils/runtimeMenu';
import styles from './TenanciesPage.styles';

const EMPTY_FORM = {
  id: '',
  appHost: '',
  dbHost: '',
  dbName: '',
  dbPort: '3306',
  dbUser: '',
  dbPassword: '',
  dbDriver: 'pdo_mysql',
  dbInstance: '',
  instalationStatus: 'pending',
};

const normalizeFormFromItem = item => ({
  id: String(item?.id || ''),
  appHost: String(item?.appHost || ''),
  dbHost: String(item?.dbHost || ''),
  dbName: String(item?.dbName || ''),
  dbPort: String(item?.dbPort || '3306'),
  dbUser: String(item?.dbUser || ''),
  dbPassword: '',
  dbDriver: String(item?.dbDriver || 'pdo_mysql'),
  dbInstance: String(item?.dbInstance || ''),
  instalationStatus: String(item?.instalationStatus || 'pending'),
});

const statusStyle = status => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'installed') return styles.statusInstalled;
  if (normalized === 'failed') return styles.statusFailed;
  return styles.statusPending;
};

export default function TenanciesPage({ navigation }) {
  const tenanciesStore = useStore('tenancies');
  const authStore = useStore('auth');
  const { showError, showSuccess } = useMessage();
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  const actions = tenanciesStore.actions;
  const getters = tenanciesStore.getters || {};
  const authGetters = authStore.getters || {};
  const items = Array.isArray(getters.items) ? getters.items : [];
  const isLoading = getters.isLoading === true;
  const isSaving = getters.isSaving === true;
  const error = String(getters.error || '').trim();
  const canManage = app_type_base === 'ADMIN' && userHasRole(authGetters.user, 'ROLE_SUPER');

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter(item =>
      [item.appHost, item.dbHost, item.dbName, item.dbUser, item.instalationStatus]
        .some(value => String(value || '').toLowerCase().includes(query)),
    );
  }, [items, search]);

  const loadItems = useCallback(() => {
    if (!canManage) return;
    actions.loadItems().catch(loadError => showError(loadError?.message || 'Falha ao carregar tenancies.'));
  }, [actions, canManage, showError]);

  useEffect(() => {
    navigation?.setOptions?.({ title: 'Tenancies' });
  }, [navigation]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const updateField = useCallback((field, value) => {
    setForm(current => ({ ...current, [field]: value }));
  }, []);

  const resetForm = useCallback(() => setForm(EMPTY_FORM), []);

  const save = useCallback(async () => {
    try {
      const saved = await actions.saveItem(form);
      setForm(normalizeFormFromItem(saved));
      showSuccess('Tenancy salva.');
    } catch (saveError) {
      showError(saveError?.message || 'Falha ao salvar tenancy.');
    }
  }, [actions, form, showError, showSuccess]);

  const enqueueInstall = useCallback(async item => {
    try {
      await actions.enqueueInstall(item);
      showSuccess('Instalação reenfileirada.');
    } catch (installError) {
      showError(installError?.message || 'Falha ao reenfileirar instalação.');
    }
  }, [actions, showError, showSuccess]);

  if (!canManage) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.panel}>
          <Text style={styles.title}>Acesso restrito</Text>
          <Text style={styles.meta}>Tenancies ficam disponíveis apenas no app ADMIN para ROLE_SUPER.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Tenancies</Text>
          <TouchableOpacity style={styles.iconButton} onPress={loadItems} disabled={isLoading}>
            {isLoading ? <ActivityIndicator size="small" color="#0284C7" /> : <Icon name="refresh-cw" size={18} color="#0284C7" />}
          </TouchableOpacity>
        </View>

        <View style={styles.panel}>
          <View style={styles.grid}>
            <View style={styles.field}>
              <Text style={styles.label}>Domínio</Text>
              <TextInput style={styles.input} value={form.appHost} onChangeText={value => updateField('appHost', value)} autoCapitalize="none" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>DB host</Text>
              <TextInput style={styles.input} value={form.dbHost} onChangeText={value => updateField('dbHost', value)} autoCapitalize="none" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>DB name</Text>
              <TextInput style={styles.input} value={form.dbName} onChangeText={value => updateField('dbName', value)} autoCapitalize="none" />
            </View>
            <View style={[styles.field, styles.fieldSmall]}>
              <Text style={styles.label}>Porta</Text>
              <TextInput style={styles.input} value={form.dbPort} onChangeText={value => updateField('dbPort', value)} keyboardType="number-pad" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>DB user</Text>
              <TextInput style={styles.input} value={form.dbUser} onChangeText={value => updateField('dbUser', value)} autoCapitalize="none" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Senha</Text>
              <TextInput style={styles.input} value={form.dbPassword} onChangeText={value => updateField('dbPassword', value)} secureTextEntry />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Driver</Text>
              <TextInput style={styles.input} value={form.dbDriver} onChangeText={value => updateField('dbDriver', value)} autoCapitalize="none" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Instância</Text>
              <TextInput style={styles.input} value={form.dbInstance} onChangeText={value => updateField('dbInstance', value)} autoCapitalize="none" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Status</Text>
              <TextInput style={styles.input} value={form.instalationStatus} onChangeText={value => updateField('instalationStatus', value)} autoCapitalize="none" />
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={resetForm}>
              <Icon name="plus" size={14} color="#0F172A" />
              <Text style={styles.secondaryButtonText}>Novo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={save} disabled={isSaving}>
              <Icon name="save" size={14} color="#FFFFFF" />
              <Text style={styles.buttonText}>{isSaving ? 'Salvando...' : 'Salvar'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TextInput
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar domínio, banco, usuário ou status"
          autoCapitalize="none"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.table}>
          {filteredItems.length === 0 ? (
            <Text style={styles.empty}>Nenhuma tenancy encontrada.</Text>
          ) : filteredItems.map(item => (
            <View key={String(item.id)} style={styles.row}>
              <View style={styles.rowHeader}>
                <Text style={styles.domain}>{item.appHost}</Text>
                <Text style={[styles.status, statusStyle(item.instalationStatus)]}>{item.instalationStatus}</Text>
              </View>
              <Text style={styles.meta}>{item.dbUser}@{item.dbHost}/{item.dbName} · {item.dbDriver}:{item.dbPort}</Text>
              <View style={styles.rowActions}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setForm(normalizeFormFromItem(item))}>
                  <Icon name="edit-2" size={14} color="#0F172A" />
                  <Text style={styles.secondaryButtonText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => enqueueInstall(item)}>
                  <Icon name="play" size={14} color="#0F172A" />
                  <Text style={styles.secondaryButtonText}>Instalar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
