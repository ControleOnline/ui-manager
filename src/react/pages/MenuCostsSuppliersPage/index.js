/* eslint-disable no-unused-vars */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';
import styles from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/index.styles';
import pageStyles, { MENU_COLORS } from '@controleonline/ui-manager/src/react/pages/MenuCostsSuppliersPage/index.styles';
import {
  MAIN_TABS,
  formatDate,
  safeArray,
} from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/viewModel';
import {
  buildImportedSuppliersFromPeople,
  filterSuppliers,
  getSupplierSelection,
} from '@controleonline/ui-manager/src/react/pages/MenuCostsSuppliersPage/viewModel';
import {
  resolveMenuCostsTabRoute,
} from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/navigation';

const IconButton = ({ icon, label, onPress, active, disabled = false }) => (
  <TouchableOpacity
    style={[
      styles.iconButton,
      active && styles.iconButtonActive,
      disabled && { opacity: 0.6 },
    ]}
    activeOpacity={disabled ? 1 : 0.82}
    onPress={disabled ? undefined : onPress}
    disabled={disabled}
  >
    <Icon
      name={icon}
      size={16}
      color={active ? MENU_COLORS.brandText : MENU_COLORS.muted}
    />
    {label ? (
      <Text style={[styles.iconButtonText, active && styles.iconButtonTextActive]}>
        {label}
      </Text>
    ) : null}
  </TouchableOpacity>
);

const SearchBox = ({ value, onChangeText, placeholder }) => (
  <View style={styles.searchBox}>
    <Icon name="search" size={16} color={MENU_COLORS.muted} />
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={MENU_COLORS.muted}
      style={styles.searchInput}
    />
  </View>
);

const Badge = ({ label, tone = 'neutral' }) => {
  const toneStyle =
    tone === 'good'
      ? styles.toneGood
      : tone === 'warn'
        ? styles.toneWarn
        : tone === 'bad'
          ? styles.toneBad
          : styles.toneNeutral;

  return (
    <View style={[styles.badge, toneStyle]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
};

const InfoGrid = ({ rows }) => (
  <View style={styles.infoGrid}>
    {rows.map(row => (
      <View key={row.label} style={styles.infoCell}>
        <Text style={styles.infoLabel}>{row.label}</Text>
        <Text style={styles.infoValue} numberOfLines={2}>
          {row.value}
        </Text>
        {row.helper ? (
          <Text style={styles.infoHelper} numberOfLines={3}>
            {row.helper}
          </Text>
        ) : null}
      </View>
    ))}
  </View>
);

const ContactCard = ({ contact }) => (
  <View style={pageStyles.contactCard}>
    <Text style={pageStyles.contactName} numberOfLines={1}>
      {contact.name}
    </Text>
    <Text style={pageStyles.contactMeta} numberOfLines={1}>
      {contact.phone || 'Sem telefone'}{contact.email ? ` · ${contact.email}` : ''}
    </Text>
    <View style={pageStyles.contactBadgeRow}>
      {contact.phone ? (
        <View style={pageStyles.contactBadge}>
          <Text style={pageStyles.contactBadgeText}>Telefone</Text>
        </View>
      ) : null}
      {contact.email ? (
        <View style={pageStyles.contactBadge}>
          <Text style={pageStyles.contactBadgeText}>Email</Text>
        </View>
      ) : null}
    </View>
  </View>
);

const MovementRow = ({ item }) => (
  <View style={styles.rowCard}>
    <View style={styles.rowContent}>
      <Text style={styles.rowTitle} numberOfLines={1}>
        {item.label}
      </Text>
      <Text style={styles.rowSubtitle} numberOfLines={2}>
        {item.date || 'Sem data'} · {item.type}
      </Text>
      <Text style={styles.rowMeta} numberOfLines={2}>
        {item.meta || item.supplierName || 'Vínculo do ERP'}
      </Text>
    </View>
    <View style={styles.rowRight}>
      <Text style={styles.rowMoney}>{item.amount ? item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</Text>
    </View>
  </View>
);

const resolveSectionTitle = () => 'Fornecedores do ERP';

const PAGE_SIZE = 200;

export default function MenuCostsSuppliersPage({ navigation }) {
  const messageApi = useMessage() || {};
  const { showError } = messageApi;
  const peopleStore = useStore('people');
  const { currentCompany } = peopleStore.getters;
  const { width } = useWindowDimensions();
  const isWide = width >= 1060;
  const requestIdRef = useRef(0);

  const [query, setQuery] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadSuppliers = useCallback(async () => {
    const companyId = currentCompany?.id;
    if (!companyId) {
      setSuppliers([]);
      setSelectedId(null);
      setLoadError('');
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLoadError('');

    try {
      const companyIri = `/people/${companyId}`;
      const rawSuppliers = [];
      let page = 1;

      while (page <= 20) {
        const batch = await peopleStore.actions.getItems({
          'link.company': companyIri,
          'link.linkType': 'provider',
          itemsPerPage: PAGE_SIZE,
          page,
        }).catch(() => []);

        if (requestId !== requestIdRef.current) {
          return;
        }

        const items = Array.isArray(batch) ? batch : [];
        rawSuppliers.push(...items);
        if (items.length < PAGE_SIZE) {
          break;
        }
        page += 1;
      }

      const imported = buildImportedSuppliersFromPeople(rawSuppliers);
      if (requestId !== requestIdRef.current) {
        return;
      }

      setSuppliers(imported);
      setSelectedId(currentId => {
        const current = imported.find(item => String(item.id) === String(currentId));
        return current?.id || imported[0]?.id || null;
      });
    } catch (error) {
      const message =
        error?.response?.data?.['hydra:description'] ||
        error?.response?.data?.detail ||
        error?.message ||
        'Nao foi possivel ler os fornecedores do ERP.';
      if (requestId === requestIdRef.current) {
        setSuppliers([]);
        setSelectedId(null);
        setLoadError(message);
      }
      showError?.(message);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [currentCompany?.id, peopleStore.actions, showError]);

  useFocusEffect(
    useCallback(() => {
      loadSuppliers();
    }, [loadSuppliers]),
  );

  useEffect(() => {
    if (!selectedId && suppliers[0]?.id) {
      setSelectedId(suppliers[0].id);
    }
  }, [selectedId, suppliers]);

  const filteredSuppliers = useMemo(
    () => filterSuppliers(suppliers, query),
    [query, suppliers],
  );

  const selectedSupplier = useMemo(
    () => getSupplierSelection(filteredSuppliers, selectedId),
    [filteredSuppliers, selectedId],
  );

  const handleTabPress = useCallback(
    tab => {
      const { routeName, params } = resolveMenuCostsTabRoute(tab);

      if (routeName === 'MenuCostsSuppliersPage') {
        return;
      }

      navigation?.navigate?.(routeName, params || {});
    },
    [navigation],
  );

  const summaryRows = [
    { label: 'Fornecedores', value: String(filteredSuppliers.length) },
    { label: 'Contatos', value: String(filteredSuppliers.reduce((sum, item) => sum + Number(item.contactCount || 0), 0)) },
    { label: 'Produtos', value: String(filteredSuppliers.reduce((sum, item) => sum + Number(item.movementCount || 0), 0)) },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={styles.page}>
        <View style={styles.toolbar}>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>Custos do cardápio</Text>
            <Text style={styles.pageTitle}>Engenharia de Produtos e Processos</Text>
          </View>
          <View style={styles.toolbarActions} />
        </View>

        <View style={[styles.body, !isWide && styles.bodyCompact]}>
          <View style={[styles.sidebar, !isWide && styles.sidebarCompact]}>
            <ScrollView horizontal={!isWide} showsHorizontalScrollIndicator={false}>
              <View style={[styles.menuList, !isWide && styles.menuListHorizontal]}>
                {MAIN_TABS.map(tab => (
                  <IconButton
                    key={tab.key}
                    icon={tab.icon}
                    label={tab.label}
                    active={tab.key === 'suppliers'}
                    onPress={() => handleTabPress(tab.key)}
                    disabled={tab.key === 'suppliers'}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.content}>
            <View style={styles.sectionTop}>
              <View>
                <Text style={styles.sectionEyebrow}>Fornecedores</Text>
                <Text style={styles.sectionTitle}>{resolveSectionTitle()}</Text>
              </View>
              <SearchBox
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar fornecedor, contato ou produto"
              />
            </View>

            <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentScrollBody}>
              <View style={pageStyles.summaryStrip}>
                {summaryRows.map(row => (
                  <View key={row.label} style={pageStyles.summaryChip}>
                    <Text style={pageStyles.summaryChipText}>
                      {row.label}: {row.value}
                    </Text>
                  </View>
                ))}
              </View>
              {loadError ? (
                <View style={[styles.rowCard, { marginBottom: 12 }]}>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowTitle}>Erro ao carregar fornecedores</Text>
                    <Text style={styles.rowSubtitle}>{loadError}</Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.splitLayout}>
                <View style={styles.listPanel}>
                  {isLoading && filteredSuppliers.length === 0 ? (
                    <View style={[styles.rowCard, { alignItems: 'center', justifyContent: 'center', minHeight: 120 }]}>
                      <ActivityIndicator size="small" color={MENU_COLORS.brand} />
                      <Text style={[styles.rowSubtitle, { marginTop: 8 }]}>Carregando fornecedores do ERP...</Text>
                    </View>
                  ) : null}
                  {filteredSuppliers.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.rowCard, selectedSupplier?.id === item.id && styles.rowCardActive]}
                      activeOpacity={0.84}
                      onPress={() => setSelectedId(item.id)}
                    >
                      <View style={styles.rowContent}>
                        <Text style={styles.rowTitle} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={styles.rowSubtitle} numberOfLines={2}>
                          {item.legalName || item.description || item.notes || 'Cadastro consolidado do ERP'}
                        </Text>
                        <View style={styles.badgeLine}>
                          <Badge label={item.evidenceLabel} tone={item.evidenceType === 'documented' ? 'good' : item.evidenceType === 'review' ? 'warn' : 'neutral'} />
                          {item.duplicateCount > 0 ? (
                            <Badge label={`${item.sourceIds.length} cadastros`} tone="good" />
                          ) : (
                            <Badge label="Cadastro único" tone="neutral" />
                          )}
                          <Badge label={`${item.contactCount} contato(s)`} tone="neutral" />
                        </View>
                        <Text style={styles.rowMeta} numberOfLines={2}>
                          {item.sourceSummary}
                        </Text>
                      </View>
                      <View style={styles.rowRight}>
                        <Text style={styles.rowMoney}>{String(item.movementCount || 0)}</Text>
                        <Text style={styles.rowMeta}>vínculos</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {selectedSupplier ? (
                  <View style={styles.detailPanel}>
                    <View style={styles.detailHeader}>
                      <View style={styles.detailHeaderText}>
                        <View style={styles.badgeLine}>
                          <Badge label={selectedSupplier.evidenceLabel} tone={selectedSupplier.evidenceType === 'documented' ? 'good' : selectedSupplier.evidenceType === 'review' ? 'warn' : 'neutral'} />
                          <Badge label={selectedSupplier.sourceSummary} tone={selectedSupplier.duplicateCount > 0 ? 'good' : 'neutral'} />
                          <Badge label={`${selectedSupplier.contactCount} contato(s)`} tone="neutral" />
                        </View>
                        <Text style={styles.detailTitle}>{selectedSupplier.name}</Text>
                        <Text style={styles.detailSubtitle}>
                          {selectedSupplier.legalName || selectedSupplier.description || 'Fornecedor consolidado a partir do catálogo importado.'}
                        </Text>
                      </View>
                    </View>

                    <InfoGrid rows={[
                      { label: 'CNPJ', value: selectedSupplier.cnpj || '—' },
                      { label: 'Local', value: [selectedSupplier.city, selectedSupplier.state].filter(Boolean).join(' / ') || '—', helper: selectedSupplier.address || 'Sem endereço informado' },
                      { label: 'Tipo', value: selectedSupplier.category || '—', helper: selectedSupplier.sourceNames.join(' · ') || selectedSupplier.sourceSummary },
                      { label: 'Contatos', value: String(selectedSupplier.contactCount || 0), helper: safeArray(selectedSupplier.contacts).map(contact => [contact.phone, contact.email].filter(Boolean).join(' · ')).join(' • ') || 'Sem contato importado' },
                      { label: 'Produtos', value: String(selectedSupplier.movementCount || 0), helper: selectedSupplier.latestMovementDate ? `Último: ${formatDate(selectedSupplier.latestMovementDate)}` : 'Sem vínculo importado' },
                      { label: 'Observação', value: selectedSupplier.notes || '—', helper: selectedSupplier.evidenceSource || 'Sem fonte registrada' },
                    ]} />

                    <View style={styles.panelNested}>
                      <Text style={styles.panelTitle}>Contatos</Text>
                      <Text style={styles.panelSubtitle}>
                        O telefone fica sempre dentro do contato, nunca no cadastro principal do fornecedor.
                      </Text>
                      <View style={pageStyles.contactList}>
                        {selectedSupplier.contacts.length > 0 ? (
                          selectedSupplier.contacts.map(contact => (
                            <ContactCard key={contact.id} contact={contact} />
                          ))
                        ) : (
                          <Text style={styles.panelSubtitle}>Nenhum contato importado para este fornecedor.</Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.panelNested}>
                      <Text style={styles.panelTitle}>Produtos vinculados</Text>
                      <Text style={styles.panelSubtitle}>
                        Produtos do ERP vinculados ao fornecedor, com SKU e custo quando já existirem.
                      </Text>
                      <View style={{ gap: 8, marginTop: 12 }}>
                        {selectedSupplier.movements.slice(0, 6).map(item => (
                          <MovementRow key={item.id} item={item} />
                        ))}
                        {selectedSupplier.movements.length === 0 ? (
                          <Text style={styles.panelSubtitle}>Nenhum produto vinculado no ERP para este fornecedor.</Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
