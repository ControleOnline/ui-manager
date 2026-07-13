import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Animated, Image } from 'react-native';
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

const CompanyFilter = ({ navigation, mode }) => {
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

  useEffect(() => {
    let cancelled = false;
    const companyCandidates = [selectedCompany, ...(Array.isArray(companies) ? companies : [])]
      .filter(Boolean)
      .reduce((accumulator, company) => {
        const companyId = normalizeId(company?.id);

        if (!companyId || accumulator.some(item => item.id === companyId)) {
          return accumulator;
        }

        accumulator.push({id: companyId, company});
        return accumulator;
      }, []);

    if (companyCandidates.length === 0) {
      setCompanyIconFilesById({});
      return undefined;
    }

    Promise.all(
      companyCandidates.map(({id}) =>
        api
          .fetch('/people_media', {
            params: {
              people: `/people/${id}`,
              'mediaType.type': 'icon',
              'mediaType.peopleType': 'J',
              itemsPerPage: 1,
            },
          })
          .then(response => {
            const [media] = normalizeCollection(response);
            return [id, media?.file || null];
          })
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
  }, [companies, selectedCompany]);

  const companyLogoUrl = useMemo(() => {
    const selectedCompanyIconFile = companyIconFilesById[selectedCompanyId];
    if (!selectedCompanyIconFile) {
      return null;
    }

    return resolveDefaultFileUrl(selectedCompanyIconFile, {
      company: selectedCompany,
    });
  }, [companyIconFilesById, selectedCompany, selectedCompanyId]);



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

        {canSwitchCompany && (
          <Modal visible={modalVisible} transparent animationType="none">
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={closeModal}>
              <Animated.View
                style={[
                  styles.modalBackground,
                  { opacity: fadeAnim },
                ]}
              />
            </TouchableOpacity>

            <Animated.View
              style={[
                styles.modalContent,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Selecionar Empresa</Text>

                <TouchableOpacity onPress={closeModal}>
                  <Icon name="x" size={22} color={palette.modalCloseIcon} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {companies.map(renderCompanyItem)}
              </ScrollView>
            </Animated.View>
          </Modal>
        )}
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
      {canSwitchCompany && (
        <Modal visible={modalVisible} transparent animationType="none">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={closeModal}>
            <Animated.View
              style={[
                styles.modalBackground,
                { opacity: fadeAnim },
              ]}
            />
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.modalContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Empresa</Text>

              <TouchableOpacity onPress={closeModal}>
                <Icon name="x" size={22} color={palette.modalCloseIcon} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {companies.map(renderCompanyItem)}
            </ScrollView>
          </Animated.View>
        </Modal>
      )}
    </>
  );
};

export default CompanyFilter;
