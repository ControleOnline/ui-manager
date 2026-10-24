import {isCompanySelectable} from '@controleonline/ui-people/src/react/utils/currentCompanySelection';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Animated } from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LegacyIcon from 'react-native-vector-icons/Feather';
import HomeIcon from '@controleonline/../../src/components/HomeIcon';
import { useStore } from '@store';
import {
  resolveFileImageUrl,
} from '@controleonline/ui-common/src/react/utils/fileUrl';
import UserAvatar from '@controleonline/ui-common/src/react/components/UserAvatar';
import {
  getAvatarDisplayName,
  resolveUserAvatarUrl,
} from '@controleonline/ui-common/src/react/utils/userAvatar';
import {resolveThemePalette} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import {resolveHomepagePalette} from '@controleonline/../../src/styles/homepagePalette';
import createStyles from './CompanyFilter.styles';
import resolveHomeAvatar from '@controleonline/../../src/components/resolveHomeAvatarUrl';
import HomeAvatar from '@controleonline/../../src/components/HomeAvatar';
import CompanyIdentityAvatar from './CompanyIdentityAvatar';
import { inlineStyle_275_20 } from './CompanyFilter.styles';
const CompanyFilter = ({ navigation, mode, appearance = 'legacy', compact = false, wrapLabel = false, onSelectCompany, disabled = false, align = 'end' }) => {
  const Icon = appearance === 'soft' ? HomeIcon : LegacyIcon;
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
  const homeAvatar = appearance === 'soft' ? resolveHomeAvatar(authUser, currentCompany) : '';
  const ProfileAvatar = appearance === 'soft' ? HomeAvatar : UserAvatar;
  const canSwitchCompany = Array.isArray(companies) && companies.length > 1;
  const headerCompanyLabel = selectedCompany?.alias ||
    selectedCompany?.name ||
    'Selecionar empresa';

  const brandColors = useMemo(
    () => appearance === 'soft' ? themeColors :
      resolveThemePalette(
        {...themeColors, ...(currentCompany?.theme?.colors || {})},
        colors,
      ),
    [appearance, currentCompany?.id, currentCompany?.theme?.colors, themeColors],
  );

  // High-contrast chip on white list rows (theme buttonText often white).
  // Force a saturated bg so initials never disappear on white modal rows.
  const identityColors = useMemo(() => {
    if (appearance === 'soft') return {background: themeColors.iconBackground,
      text: themeColors.iconColor, border: themeColors.iconColor};
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
  }, [appearance, brandColors, themeColors]);

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
  const styles = useMemo(() => createStyles(palette, appearance, resolveHomepagePalette(themeColors), compact), [palette, appearance, themeColors, compact]);

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
      if (disabled || !isCompanySelectable(company)) return;
      if (onSelectCompany) onSelectCompany(company);
      else {
        peopleActions.setCurrentCompany(company);
        setSelectedCompany(company);
      }
      closeModal();
    },
    [peopleActions, closeModal, onSelectCompany, disabled],
  );

  const renderCompanyItem = useCallback(
    company => {
      const isSelected = selectedCompany?.id === company.id;
      return (
        <TouchableOpacity
          key={company.id}
          disabled={!isCompanySelectable(company)}
          accessibilityState={{disabled: !isCompanySelectable(company)}}
          style={[
            styles.companyItem,
            !isCompanySelectable(company) && {opacity: 0.45},
            isSelected && styles.companyItemSelected,
          ]}
          onPress={() => handleSelectCompany(company)}
          activeOpacity={0.8}
          testID={`company-selector-item-${company.id}`}>
          <View style={styles.companyItemLeft}>
            <CompanyIdentityAvatar
              home={appearance === 'soft'}
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
      home={appearance === 'soft'}
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
          numberOfLines={wrapLabel ? undefined : 1}
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
        <View style={[styles.iconHeaderWrap, align === 'start' && {justifyContent:'flex-start'}]}>
          {canSwitchCompany ? (
            <TouchableOpacity
              disabled={disabled}
              onPress={openModal}
              style={[styles.iconButton, styles.iconButtonExpanded, align === 'start' && {paddingHorizontal:0}, wrapLabel && {height: 'auto', minHeight: 36, paddingVertical: 8}]}
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
                align === 'start' && {paddingHorizontal:0},
                wrapLabel && {height: 'auto', minHeight: 36, paddingVertical: 8},
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
          <View style={wrapLabel ? {flex: 1, minWidth: 0} : undefined}>
            <Text style={styles.greeting}>Olá, {firstName}</Text>
            {canSwitchCompany ? (
              <TouchableOpacity
                style={styles.companyRow}
                disabled={disabled}
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
            <ProfileAvatar
              imageUrl={appearance === 'soft' ? homeAvatar || avatarImageUrl : avatarImageUrl}
              email={avatarEmail}
              name={currentUser?.name}
              size={appearance === 'soft' ? 48 : 40}
              backgroundColor={appearance === 'soft' ? themeColors.iconBackground : palette.avatarBackground}
              borderColor={appearance === 'soft' ? themeColors.iconColor : palette.avatarBorder}
              borderWidth={1}
              textColor={appearance === 'soft' ? themeColors.iconText : palette.avatarText}
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
