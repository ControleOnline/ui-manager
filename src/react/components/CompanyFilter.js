import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Animated, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import md5 from 'md5';
import { env } from '@env';
import { colors } from '@controleonline/../../src/styles/colors';
import styles from './CompanyFilter.styles';

import {
  resolveThemePalette,
} from '@controleonline/../../src/styles/branding';

import { inlineStyle_275_20 } from './CompanyFilter.styles';

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
  const host =
    env.DOMAIN ||
    (typeof location !== 'undefined' && location?.host ? location.host : '');
  const firstName = currentUser?.name?.split(' ')[0] || 'Usuário';
  const canSwitchCompany = Array.isArray(companies) && companies.length > 1;

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        {
          ...themeColors,
          ...(currentCompany?.theme?.colors || {}),
        },
        colors,
      ),
    [themeColors, currentCompany?.id],
  );



  const companyLogoUrl = useMemo(() => {
    if (!selectedCompany?.logo) return null;

    if (selectedCompany.logo.domain && selectedCompany.logo.url) {
      return `https://${selectedCompany.logo.domain}${selectedCompany.logo.url}?app-domain=${host}`;
    }

    return null;
  }, [selectedCompany]);



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
            {company?.logo?.domain && company?.logo?.url ? (
              <Image
                source={{ uri: `https://${company.logo.domain}${company.logo.url}?app-domain=${host}` }}
                style={styles.companyLogo}
              />
            ) : (
              <Icon name="briefcase" size={18} color="#64748B" />
            )}
            <Text
              style={[
                styles.companyItemName,
                isSelected && { color: brandColors.primary },
              ]}>
              {company.alias || company.name}
            </Text>
          </View>

          {isSelected && (
            <Icon name="check-circle" size={20} color={brandColors.primary} />
          )}
        </TouchableOpacity>
      );
    },
    [selectedCompany, handleSelectCompany, brandColors.primary],
  );

  if (mode === 'icon' && !canSwitchCompany) {
    return null;
  }

  if (mode === 'icon') {
    return (
      <>
        <View style={styles.iconHeaderWrap}>
          {canSwitchCompany && (
            <TouchableOpacity
              onPress={openModal}
              style={styles.iconButton}
              activeOpacity={0.8}>
              <Icon name="briefcase" size={18} color={brandColors.primary} />
            </TouchableOpacity>
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
                  <Icon name="x" size={22} color="#64748B" />
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
      <View style={[styles.container, { backgroundColor: brandColors.background }]}>
        {mode === 'icon' ? (
          <TouchableOpacity
            onPress={openModal}
            style={styles.iconButton}
            activeOpacity={0.8}>
            <Icon name="briefcase" size={22} color={brandColors.primary} />
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
                  style={[
                    styles.companyName,
                    { color: brandColors.textSecondary },
                  ]}>
                  {selectedCompany?.alias ||
                    selectedCompany?.name ||
                    'Selecionar empresa'}
                </Text>

                {canSwitchCompany && (
                  <Icon
                    name="chevron-down"
                    size={14}
                    color={brandColors.textSecondary}
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
                <Icon name="x" size={22} color="#64748B" />
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
