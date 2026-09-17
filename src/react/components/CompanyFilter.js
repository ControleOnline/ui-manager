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

const normalizeText = value => String(value || '').trim();

/**
 * companies/my returns icon/logo as FileService shape:
 *   { id, domain, url: '/files/{id}/download', fileType, public }
 * Not a plain string. Resolve to a download URL UserAvatar can auth-fetch.
 * (Same auth constraint as app-community#796 Media preview.)
 */
const resolveCompanyFileField = (field, company) => {
  if (!field) {
    return '';
  }
  if (typeof field === 'string') {
    const direct = normalizeText(field);
    if (!direct) {
      return '';
    }
    return normalizeText(resolveFileImageUrl(direct, {company}) || direct);
  }
  if (typeof field === 'object') {
    const fromHelper = normalizeText(resolveFileImageUrl(field, {company}));
    if (fromHelper) {
      return fromHelper;
    }
    const nestedUrl = normalizeText(field.url || field.uri || field.path);
    if (nestedUrl) {
      return normalizeText(resolveFileImageUrl(nestedUrl, {company}) || nestedUrl);
    }
  }
  return '';
};

/**
 * Fallback order (app-community#805 / linked #796):
 * 1) companies/my icon object/url
 * 2) companies/my logo object/url
 * 3) peopleImage (media + direct fields; peopleType forced J)
 * 4) UserAvatar initials (alias/name) — never empty chip
 */
const resolveCompanyIdentityImageUrl = company => {
  if (!company || typeof company !== 'object') {
    return '';
  }
  for (const key of ['icon', 'logo']) {
    const url = resolveCompanyFileField(company[key], company);
    if (url) {
      return url;
    }
  }
  return normalizeText(
    resolvePeopleImageUrl(
      {...company, peopleType: company.peopleType || 'J'},
      resolveFileImageUrl,
      {
        usePeopleImage: true,
        fileOptions: {company},
      },
    ),
  );
};

const companyInitialsFromName = name => {
  const words = normalizeText(name).split(' ').filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }
  if (words.length === 1) {
    return words[0][0].toUpperCase();
  }
  return '?';
};

/**
 * Always render a chip: icon when URL resolves, otherwise explicit initials.
 * Avoids empty slots when image fetch fails or name/email are sparse.
 */
const CompanyIdentityAvatar = ({
  company,
  size = 28,
  backgroundColor,
  borderColor,
  textColor,
  style,
}) => {
  const imageUrl = useMemo(
    () => resolveCompanyIdentityImageUrl(company),
    [company],
  );
  const name = useMemo(() => {
    const fromPeople = resolvePeopleDisplayName(company);
    if (fromPeople) {
      return fromPeople;
    }
    return normalizeText(company?.alias || company?.name || company?.id || '');
  }, [company]);
  const initials = useMemo(() => companyInitialsFromName(name), [name]);

  // No usable image → pure initials chip (never leave the slot empty).
  if (!imageUrl) {
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: Math.max(4, Math.round(size / 5)),
            backgroundColor,
            borderColor,
            borderWidth: 1,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          },
          style,
        ]}>
        <Text
          style={{
            color: textColor,
            fontSize: Math.max(Math.round(size * 0.38), 10),
            fontWeight: '700',
            letterSpacing: 0.3,
            textAlign: 'center',
          }}>
          {initials}
        </Text>
      </View>
    );
  }

  return (
    <UserAvatar
      imageUrl={imageUrl}
      name={name || initials}
      email=""
      size={size}
      backgroundColor={backgroundColor}
      borderColor={borderColor}
      borderWidth={1}
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

  // High-contrast chip on white list rows (theme buttonText often white).
  // Force a saturated bg so initials never disappear on white modal rows.
  const identityColors = useMemo(() => {
    const bg =
      brandColors.primary ||
      brandColors.buttonBackground ||
      themeColors.listItemIcon ||
      '#2563EB';
    const bgNorm = String(bg || '').toLowerCase();
    const isLight =
      !bgNorm ||
      bgNorm === '#fff' ||
      bgNorm === '#ffffff' ||
      bgNorm === 'white' ||
      bgNorm === '#f8fafc' ||
      bgNorm === '#f1f5f9';
    return {
      background: isLight ? '#2563EB' : bg,
      text: '#FFFFFF',
      border: themeColors.listItemBorder || '#E2E8F0',
    };
  }, [brandColors, themeColors.listItemBorder, themeColors.listItemIcon]);

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
              size={28}
              backgroundColor={identityColors.background}
              borderColor={identityColors.border}
              textColor={identityColors.text}
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
      identityColors,
      palette.listItemIcon,
      selectedCompany,
      styles,
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
            style={[styles.modalBackground, {opacity: fadeAnim}]}
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
      size={22}
      backgroundColor={identityColors.background}
      borderColor={identityColors.border}
      textColor={identityColors.text}
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
          style={styles.iconCompanyName}>
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
              style={[styles.iconButton, styles.iconButtonExpanded]}
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
              ]}>
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
            ) : selectedCompany?.alias || selectedCompany?.name ? (
              <View style={styles.companyRow} testID="company-label-static">
                {selectedCompanyAvatar}
                <Text style={styles.companyName}>
                  {selectedCompany?.alias || selectedCompany?.name}
                </Text>
              </View>
            ) : null}
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
