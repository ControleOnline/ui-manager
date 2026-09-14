import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Animated } from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import {
  resolveFileImageUrl,
} from '@controleonline/ui-common/src/react/utils/fileUrl';
import UserAvatar from '@controleonline/ui-common/src/react/components/UserAvatar';
import {
  getAvatarDisplayName,
  resolveUserAvatarUrl,
} from '@controleonline/ui-common/src/react/utils/userAvatar';
import {
  resolvePeopleDisplayName,
  resolvePeopleImageUrl,
} from '@controleonline/ui-people/src/react/utils/peopleImage';
import {resolveThemePalette} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import createStyles from './CompanyFilter.styles';

import { inlineStyle_275_20 } from './CompanyFilter.styles';

/**
 * Company identity chip for the company selector.
 * Fallback order (app-community#805):
 * 1) people_media / direct icon|logo (resolvePeopleImageUrl)
 * 2) UserAvatar initials from alias/name
 * Never leave an empty slot when the company has a display name.
 */
const CompanyIdentityAvatar = ({
  company,
  size = 18,
  backgroundColor,
  borderColor,
  textColor,
  style,
}) => {
  const imageUrl = useMemo(
    () =>
      resolvePeopleImageUrl(company, resolveFileImageUrl, {
        usePeopleImage: true,
        fileOptions: {company},
      }),
    [company],
  );
  const name = useMemo(() => resolvePeopleDisplayName(company), [company]);

  return (
    <UserAvatar
      imageUrl={imageUrl}
      name={name}
      email=""
      size={size}
      backgroundColor={backgroundColor}
      borderColor={borderColor}
      borderWidth={0}
      textColor={textColor}
      useGravatar={false}
      style={style}
    />
  );
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

  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-50));

  useEffect(() => {
    setSelectedCompany(currentCompany);
  }, [currentCompany]);

  const currentUser = {
    ...authUser,
    name: getAvatarDisplayName(authUser),
  };
  const firstName = currentUser?.name?.split(' ')[0] || 'Usuário';
  const canSwitchCompany = Array.isArray(companies) && companies.length > 1;
  const headerCompanyLabel = selectedCompany?.alias ||
    selectedCompany?.name ||
    'Selecionar empresa';

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        {...themeColors, ...(currentCompany?.theme?.colors || {})},
        colors,
      ),
    [currentCompany?.id, currentCompany?.theme?.colors, themeColors],
  );

  const palette = useMemo(
    () => ({
      pageBackground: themeColors.pageBackground,
      headerText: themeColors.headerText,
      headerIcon: themeColors.headerIcon,
      avatarBackground: brandColors.buttonBackground || brandColors.primary,
      avatarBorder: brandColors.buttonText || brandColors.white,
      avatarText: brandColors.buttonText || brandColors.white,
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
    [brandColors, themeColors],
  );
  const styles = useMemo(() => createStyles(palette), [palette]);

  const avatarEmail = useMemo(() => {
    const email = currentUser?.email;
    if (Array.isArray(email)) {
      return String(email[0]?.value || email[0]?.email || '').trim();
    }

    return String(email?.value || email?.email || email || '').trim();
  }, [currentUser?.email]);
  const avatarImageUrl = useMemo(() => {
    return resolveUserAvatarUrl(currentUser, resolveFileImageUrl);
  }, [currentUser?.avatar]);

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

      return (
        <TouchableOpacity
          key={company.id}
          style={[
            styles.companyItem,
            isSelected && styles.companyItemSelected,
          ]}
          onPress={() => handleSelectCompany(company)}
          activeOpacity={0.8}
          testID={`company-selector-item-${company.id}`}>
          <View style={styles.companyItemLeft}>
            <CompanyIdentityAvatar
              company={company}
              size={18}
              backgroundColor={palette.avatarBackground}
              borderColor={palette.listItemBorder}
              textColor={palette.avatarText}
              style={styles.companyLogo}
            />
            <Text style={styles.companyItemName}>
              {company.alias || company.name}
            </Text>
          </View>

          {isSelected && (
            <Icon name="check-circle" size={20} color={palette.listItemIcon} />
          )}
        </TouchableOpacity>
      );
    },
    [
      handleSelectCompany,
      palette.avatarBackground,
      palette.avatarText,
      palette.listItemBorder,
      palette.listItemIcon,
      selectedCompany,
      styles.companyItem,
      styles.companyItemLeft,
      styles.companyItemName,
      styles.companyItemSelected,
      styles.companyLogo,
    ],
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
            {(Array.isArray(companies) ? companies : []).map(renderCompanyItem)}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );

  const selectedCompanyAvatar = (
    <CompanyIdentityAvatar
      company={selectedCompany}
      size={18}
      backgroundColor={palette.avatarBackground}
      borderColor={palette.headerIcon}
      textColor={palette.avatarText}
      style={mode === 'icon' ? styles.iconCompanyLogo : styles.companyLogo}
    />
  );

  if (mode === 'icon') {
    if (!canSwitchCompany && !headerCompanyLabel) {
      return null;
    }

    const triggerContent = (
      <>
        {selectedCompany ? selectedCompanyAvatar : null}

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
              activeOpacity={0.8}
              testID="company-selector-trigger">
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
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá, {firstName}</Text>

            {canSwitchCompany ? (
              <TouchableOpacity
                style={styles.companyRow}
                onPress={openModal}
                activeOpacity={0.8}
                testID="company-selector-trigger">
                {selectedCompany ? selectedCompanyAvatar : null}

                <Text style={styles.companyName}>
                  {selectedCompany?.alias ||
                    selectedCompany?.name ||
                    'Selecionar empresa'}
                </Text>

                <Icon
                  name="chevron-down"
                  size={14}
                  color={palette.headerIcon}
                  style={inlineStyle_275_20}
                />
              </TouchableOpacity>
            ) : (
              (selectedCompany?.alias || selectedCompany?.name) ? (
                <View style={styles.companyRow} testID="company-label-static">
                  {selectedCompanyAvatar}
                  <Text style={styles.companyName}>
                    {selectedCompany?.alias || selectedCompany?.name}
                  </Text>
                </View>
              ) : null
            )}
          </View>

          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={() => navigation?.navigate?.('ProfilePage')}>
            <UserAvatar
              imageUrl={avatarImageUrl}
              email={avatarEmail}
              name={currentUser?.name}
              size={40}
              backgroundColor={palette.avatarBackground}
              borderColor={palette.avatarBorder}
              borderWidth={1}
              textColor={palette.avatarText}
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>
      </View>
      {canSwitchCompany && renderCompanyModal()}
    </>
  );
};

export default CompanyFilter;
