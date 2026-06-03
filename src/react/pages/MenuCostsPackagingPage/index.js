/* eslint-disable no-unused-vars */
import React, { useCallback, useEffect, useState } from 'react';
import {
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
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import styles, { MENU_COLORS } from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/index.styles';
import {
  MAIN_TABS,
  cloneSeedData,
  safeArray,
} from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/viewModel';
import {
  resolveMenuCostsTabRoute,
} from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/navigation';
import {
  SupplyResourceView,
} from '@controleonline/ui-manager/src/react/pages/MenuCostsPage';

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

const resolveSectionTitle = () => 'Embalagens cadastradas';

const resolveInitialSelection = db => safeArray(db?.packaging)[0]?.id || null;

export default function MenuCostsPackagingPage({ navigation }) {
  const messageApi = useMessage() || {};
  const { showError, showSuccess } = messageApi;
  const { width } = useWindowDimensions();
  const isWide = width >= 1060;

  const [db, setDb] = useState(() => cloneSeedData());
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(() => resolveInitialSelection(cloneSeedData()));

  useFocusEffect(
    useCallback(() => {
      const nextDb = cloneSeedData();
      setDb(nextDb);
      setQuery('');
      setSelectedId(resolveInitialSelection(nextDb));
    }, []),
  );

  const patchActiveCost = useCallback((collection, id, patch) => {
    setDb(prev => ({
      ...prev,
      [collection]: safeArray(prev[collection]).map(item =>
        String(item.id) === String(id) ? { ...item, ...patch } : item,
      ),
    }));
  }, []);

  const handleTabPress = useCallback(
    tab => {
      const { routeName, params } = resolveMenuCostsTabRoute(tab);

      if (routeName === 'MenuCostsPackagingPage') {
        return;
      }

      navigation?.navigate?.(routeName, params || {});
    },
    [navigation],
  );

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
                    active={tab.key === 'packaging'}
                    onPress={() => handleTabPress(tab.key)}
                    disabled={tab.key === 'packaging'}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.content}>
            <View style={styles.sectionTop}>
              <View>
                <Text style={styles.sectionEyebrow}>Embalagens</Text>
                <Text style={styles.sectionTitle}>{resolveSectionTitle()}</Text>
              </View>
              <SearchBox
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar embalagem, fornecedor ou código"
              />
            </View>

            <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentScrollBody}>
              <SupplyResourceView
                db={db}
                query={query}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
                collection="packaging"
                patchActiveCost={patchActiveCost}
                showError={showError}
                showSuccess={showSuccess}
              />
            </ScrollView>
          </View>
        </View>
      </View>
      <StateStore stores={['people', 'products', 'product_group_product', 'product_unit']} />
    </SafeAreaView>
  );
}
