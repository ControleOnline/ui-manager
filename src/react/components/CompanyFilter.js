import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Animated, Image } from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import md5 from 'md5';
import { resolveDefaultFileUrl } from '@controleonline/ui-common/src/react/utils/fileUrl';
import createStyles from './CompanyFilter.styles';

import { inlineStyle_275_20 } from './CompanyFilter.styles';

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

  const resolveCompanyLogoUrl = useCallback(
    company => {
      const logoSource = company?.logo || null;
      if (!logoSource) {
        return '';
      }

      return resolveDefaultFileUrl(logoSource, {company});
    },
    [],
  );

  const companyLogoUrl = useMemo(
    () => resolveCompanyLogoUrl(selectedCompany),
    [resolveCompanyLogoUrl, selectedCompany],
  );



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
      const companyLogo = resolveCompanyLogoUrl(company);

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
    [handleSelectCompany, palette.listItemIcon, resolveCompanyLogoUrl, selectedCompany, styles.companyItem, styles.companyItemLeft, styles.companyItemName, styles.companyItemSelected, styles.companyLogo],
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
