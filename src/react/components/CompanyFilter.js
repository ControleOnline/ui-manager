import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CompanyFilter = () => {
  const peopleStore = useStore('people');
  const { currentCompany, companies } = peopleStore.getters;
  const peopleActions = peopleStore.actions;
  const [selectedCompany, setSelectedCompany] = useState(currentCompany);
  const [modalVisible, setModalVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const insets = useSafeAreaInsets();

  useEffect(() => {
    setSelectedCompany(currentCompany);
  }, [currentCompany]);

  const handleSelectCompany = useCallback(
    company => {
      peopleActions.setCurrentCompany(company);
      closeModal();
    },
    [peopleActions],
  );

  const openModal = useCallback(() => {
    setModalVisible(true);
    fadeAnim.setValue(1);
    slideAnim.setValue(300);
    Animated.spring(slideAnim, {
      toValue: 0,
      damping: 24,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, slideAnim]);

  const closeModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => setModalVisible(false));
  }, [fadeAnim, slideAnim]);

  const renderCompanyItem = useCallback(
    (company, index) => {
      const isSelected = selectedCompany?.id === company.id;
      return (
        <TouchableOpacity
          key={company.id}
          style={[styles.companyItem, isSelected && styles.companyItemSelected]}
          onPress={() => handleSelectCompany(company)}
          activeOpacity={0.7}>
          <View style={styles.companyInfo}>
            <View style={[styles.companyIcon, isSelected && styles.companyIconSelected]}>
              <Icon name="briefcase" size={18} color="#6366F1" />
            </View>
            <View style={styles.companyDetails}>
              <Text style={[styles.companyName, isSelected && styles.companyNameSelected]}>
                {company.alias || company.name}
              </Text>
              {company.name !== company.alias && (
                <Text style={styles.companyFullName} numberOfLines={1}>
                  {company.name}
                </Text>
              )}
            </View>
          </View>
          {isSelected && <Icon name="check-circle" size={20} color="#6366F1" />}
        </TouchableOpacity>
      );
    },
    [selectedCompany, handleSelectCompany],
  );

  if (companies.length <= 1) return null;

  return (
    <>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={openModal}
          activeOpacity={0.8}>
          <View style={styles.filterContent}>
            <View style={styles.indicator}>
              <Icon name="briefcase" size={16} color="#6366F1" />
            </View>
            <View style={styles.filterText}>
              <Text style={styles.filterLabel}>Empresa</Text>
              <Text style={styles.filterValue} numberOfLines={1}>
                {selectedCompany?.alias || selectedCompany?.name || 'Selecionar'}
              </Text>
            </View>
            <Icon name="chevron-down" size={18} color="#94A3B8" />
          </View>
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={closeModal}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeModal}>
          <Animated.View style={[styles.modalBg, { opacity: fadeAnim }]} />
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.modalContent,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Selecionar Empresa</Text>
            <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
              <Icon name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            bounces={false}>
            {companies.map(renderCompanyItem)}
          </ScrollView>
        </Animated.View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#F8FAFC',
  },
  filterButton: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
      web: { boxShadow: '0 1px 6px rgba(15,23,42,0.05)' },
    }),
  },
  filterContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  filterText: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 1,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  filterValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    minHeight: 250,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 6,
  },
  modalBody: {
    flex: 1,
    paddingTop: 4,
  },
  companyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  companyItemSelected: {
    backgroundColor: '#EEF2FF',
    borderBottomColor: '#E0E7FF',
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  companyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  companyIconSelected: {
    backgroundColor: '#C7D2FE',
  },
  companyDetails: {
    flex: 1,
  },
  companyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 1,
  },
  companyNameSelected: {
    color: '#4338CA',
  },
  companyFullName: {
    fontSize: 12,
    color: '#94A3B8',
  },
});

export default CompanyFilter;
