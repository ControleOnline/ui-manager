import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Animated, Image } from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import md5 from 'md5';
import { api } from '@controleonline/ui-common/src/api';
import { resolveDefaultFileUrl } from '@controleonline/ui-common/src/react/utils/fileUrl';
import createStyles from './CompanyFilter.styles';

import { inlineStyle_275_20 } from './CompanyFilter.styles';

const normalizeCollection = payload => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.member)) return payload.member;
  if (Array.isArray(payload['hydra:member'])) return payload['hydra:member'];
  if (Array.isArray(payload.items)) return payload.items;
  return [];
};

const normalizeId = value => String(value || '').replace(/\D+/g, '');

const companyIconFileCache = new Map();
const companyIconRequestCache = new Map();

const loadCompanyIconFile = companyId => {
  const normalizedCompanyId = normalizeId(companyId);
  if (!normalizedCompanyId) {
    return Promise.resolve(null);
  }

  if (companyIconFileCache.has(normalizedCompanyId)) {
    return Promise.resolve(companyIconFileCache.get(normalizedCompanyId));
  }

  if (companyIconRequestCache.has(normalizedCompanyId)) {
    return companyIconRequestCache.get(normalizedCompanyId);
  }

  const request = api
    .fetch('/people_media', {
      params: {
        people: `/people/${normalizedCompanyId}`,
        'mediaType.type': 'icon',
        'mediaType.peopleType': 'J',
        itemsPerPage: 1,
      },
    })
    .then(response => {
      const [media] = normalizeCollection(response);
      const file = media?.file || null;
      companyIconFileCache.set(normalizedCompanyId, file);
      companyIconRequestCache.delete(normalizedCompanyId);
      return file;
    })
    .catch(() => {
      companyIconFileCache.set(normalizedCompanyId, null);
      companyIconRequestCache.delete(normalizedCompanyId);
      return null;
    });

  companyIconRequestCache.set(normalizedCompanyId, request);
  return request;
};

const CompanyFilter = ({ navigation, mode }) => {
  const insets = useSafeAreaInsets();
  const peopleStore = useStore('people');
  const authStore = useStore('auth');
  const themeStore = useStore('theme');

  const peopleGetters = peopleStore.getters;
  const peopleActions = peopleStore.actions;
  const authGetters = authStore.getters;
  const themeGetters = themeStore.getters;

  const { currentCompany, companies } = peopleGetters;
  const { user: authUser } = authGetters;
  const { colors: themeColors } = themeGetters;

  const [selectedCompany, setSelectedCompany] = useState(currentCompany);
  const [modalVisible, setModalVisible] = useState(false);
  const [companyIconFilesById, setCompanyIconFilesById] = useState({});

  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-50));

  useEffect(() => {
    setSelectedCompany(currentCompany);
  }, [currentCompany]);

  const currentUser = {
    ...authUser,
    name: String(
      authUser?.realname || authUser?.name || authUser?.username || '',
    ).trim(),
  };
  const firstName = currentUser?.name?.split(' ')[0] || 'Usuário';
  const canSwitchCompany = Array.isArray(companies) && companies.length > 1;
  const headerCompanyLabel = selectedCompany?.alias ||
    selectedCompany?.name ||
    'Selecionar empresa';

  const palette = useMemo(
    () => ({
      pageBackground: themeColors.pageBackground,
      headerText: themeColors.headerText,
      headerIcon: themeColors.headerIcon,
      listItemBackground: themeColors.listItemBackground,
      listItemBorder: themeColors.listItemBorder,
      listItemIcon: themeColors.listItemIcon,
      listItemSelectedBackground: themeColors.listItemSelectedBackground,
      listItemSelectedBorder: themeColors.listItemSelectedBorder,
      listItemText: themeColors.listItemText,
      modalBackground: themeColors.modalBackground,
      modalBorder: themeColors.modalBorder,
      modalCloseIcon: themeColors.modalCloseIcon,
      modalHeaderText: themeColors.modalHeaderText,
      modalOverlay: themeColors.modalOverlay,
    }),
    [themeColors],
  );
  const styles = useMemo(() => createStyles(palette), [palette]);

  const selectedCompanyId = normalizeId(selectedCompany?.id);
  const shouldLoadCompanyIcons = modalVisible && canSwitchCompany;
  const companyIconIdsSignature = useMemo(() => {
    if (!shouldLoadCompanyIcons) {
      return '';
    }

    const ids = [
      selectedCompanyId,
      ...(Array.isArray(companies) ? companies : []).map(company => normalizeId(company?.id)),
    ].filter(Boolean);

    return Array.from(new Set(ids))
      .sort((left, right) => Number(left) - Number(right))
      .join(',');
  }, [companies, selectedCompanyId, shouldLoadCompanyIcons]);

  useEffect(() => {
    let cancelled = false;
    const companyIds = companyIconIdsSignature
      ? companyIconIdsSignature.split(',').filter(Boolean)
      : [];

    if (companyIds.length === 0) {
      setCompanyIconFilesById({});
      return undefined;
    }

    Promise.all(
      companyIds.map(id =>
        loadCompanyIconFile(id)
          .then(file => [id, file])
          .catch(() => [id, null]),
      ),
    )
      .then(entries => {
        if (cancelled) {
          return;
        }

        setCompanyIconFilesById(
          entries.reduce((accumulator, [id, file]) => {
            accumulator[id] = file;
            return accumulator;
          }, {}),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setCompanyIconFilesById({});
        }
      });

    return () => {
      cancelled = true;
    };
  }, [companyIconIdsSignature]);

  const companyLogoUrl = useMemo(() => {
    if (!shouldLoadCompanyIcons) {
      return null;
    }

    const selectedCompanyIconFile = companyIconFilesById[selectedCompanyId];
    if (!selectedCompanyIconFile) {
      return null;
    }

    return resolveDefaultFileUrl(selectedCompanyIconFile, {
      company: selectedCompany,
    });
  }, [companyIconFilesById, selectedCompany, selectedCompanyId, shouldLoadCompanyIcons]);



  const getAvatarUrl = () => {
    if (typeof currentUser?.avatarUrl === 'string' && currentUser.avatarUrl) {
      return currentUser.avatarUrl;
    }

    if (currentUser?.avatar?.url) {
      const domain = currentUser?.avatar?.domain || '';
      return `${domain}${currentUser.avatar.url}`;
    }

    if (!currentUser?.email) {
      return 'https://www.gravatar.com/avatar/?d=identicon';
    }

    const emailHash = md5(currentUser.email.trim().toLowerCase());
    return `https://www.gravatar.com/avatar/${emailHash}?s=200&d=identicon`;
  };

  const openModal = useCallback(() => {
    setModalVisible(true);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const closeModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setModalVisible(false));
  }, [fadeAnim, slideAnim]);

  const handleSelectCompany = useCallback(
    company => {
      peopleActions.setCurrentCompany(company);
      setSelectedCompany(company);
      closeModal();
    },
    [peopleActions, closeModal],
  );

  const renderCompanyItem = useCallback(
    company => {
      const isSelected = selectedCompany?.id === company.id;
      const companyId = normalizeId(company?.id);
      const companyLogo = companyIconFilesById[companyId]
        ? resolveDefaultFileUrl(companyIconFilesById[companyId], {company})
        : '';

      return (
        <TouchableOpacity
          key={company.id}
          style={[
            styles.companyItem,
            isSelected && styles.companyItemSelected,
          ]}
          onPress={() => handleSelectCompany(company)}
          activeOpacity={0.8}>
          <View style={styles.companyItemLeft}>
            {companyLogo ? (
              <Image
                source={{uri: companyLogo}}
                style={styles.companyLogo}
              />
            ) : (
              <Icon name="briefcase" size={18} color={palette.listItemIcon} />
            )}
            <Text
              style={styles.companyItemName}>
              {company.alias || company.name}
            </Text>
          </View>

          {isSelected && (
            <Icon name="check-circle" size={20} color={palette.listItemIcon} />
          )}
        </TouchableOpacity>
      );
    },
    [selectedCompany, handleSelectCompany, companyIconFilesById, palette.listItemIcon, styles.companyItem, styles.companyItemLeft, styles.companyItemName, styles.companyItemSelected, styles.companyLogo],
  );

  const renderCompanyModal = () => (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={closeModal}>
      <View style={styles.modalRoot}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeModal}>
          <Animated.View
            style={[
              styles.modalBackground,
              {opacity: fadeAnim},
            ]}
          />
        </TouchableOpacity>

        <Animated.View
          testID="company-selector-modal"
          style={[
            styles.modalContent,
            {
              paddingBottom: insets.bottom,
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
            },
          ]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Selecionar Empresa</Text>

            <TouchableOpacity onPress={closeModal}>
              <Icon name="x" size={22} color={palette.modalCloseIcon} />
            </TouchableOpacity>
          </View>

          <ScrollView
            testID="company-selector-list"
            showsVerticalScrollIndicator={false}>
            {companies.map(renderCompanyItem)}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );

  if (mode === 'icon') {
    if (!canSwitchCompany && !headerCompanyLabel) {
      return null;
    }

    const triggerContent = (
      <>
        {companyLogoUrl ? (
          <Image
            source={{ uri: companyLogoUrl }}
            style={styles.iconCompanyLogo}
          />
        ) : (
          <Icon name="briefcase" size={18} color={palette.headerIcon} />
        )}

        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={styles.iconCompanyName}
        >
          {headerCompanyLabel}
        </Text>

        {canSwitchCompany ? (
          <Icon
            name="chevron-down"
            size={14}
            color={palette.headerIcon}
            style={styles.iconChevron}
          />
        ) : null}
      </>
    );

    return (
      <>
        <View style={styles.iconHeaderWrap}>
          {canSwitchCompany ? (
            <TouchableOpacity
              onPress={openModal}
              style={[
                styles.iconButton,
                styles.iconButtonExpanded,
              ]}
              activeOpacity={0.8}>
              {triggerContent}
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.iconButton,
                styles.iconButtonStatic,
                styles.iconButtonExpanded,
              ]}
            >
              {triggerContent}
            </View>
          )}
        </View>

        {canSwitchCompany && renderCompanyModal()}
      </>
    );
  }

  return (
    <>
      <View style={styles.container}>
        {mode === 'icon' ? (
          <TouchableOpacity
            onPress={openModal}
            style={styles.iconButton}
            activeOpacity={0.8}>
            <Icon name="briefcase" size={22} color={palette.headerIcon} />
          </TouchableOpacity>
        ) : (
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Olá, {firstName}</Text>

              <TouchableOpacity
                style={styles.companyRow}
                onPress={canSwitchCompany ? openModal : undefined}
                disabled={!canSwitchCompany}
                activeOpacity={0.8}>
                {companyLogoUrl ? (
                  <Image
                    source={{ uri: companyLogoUrl }}
                    style={styles.companyLogo}
                  />
                ) : null}

                <Text
                  style={styles.companyName}>
                  {selectedCompany?.alias ||
                    selectedCompany?.name ||
                    'Selecionar empresa'}
                </Text>

                {canSwitchCompany && (
                  <Icon
                    name="chevron-down"
                    size={14}
                    color={palette.headerIcon}
                    style={inlineStyle_275_20}
                  />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={() => navigation?.navigate?.('ProfilePage')}>
              <Image source={{ uri: getAvatarUrl() }} style={styles.avatar} />
            </TouchableOpacity>
          </View>
        )}
      </View>
      {canSwitchCompany && renderCompanyModal()}
    </>
  );
};

export default CompanyFilter;
