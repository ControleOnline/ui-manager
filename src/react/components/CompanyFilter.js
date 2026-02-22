import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useStore} from '@store';

const CompanyFilter = () => {
  const peopleStore = useStore('people');
  const peopleGetters = peopleStore?.getters || {};
  const peopleActions = peopleStore?.actions;

  const {currentCompany, companies = []} = peopleGetters;

  const [selectedCompany, setSelectedCompany] = useState(currentCompany);
  const [modalVisible, setModalVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-50));

  useEffect(() => {
    setSelectedCompany(currentCompany);
  }, [currentCompany]);

  const handleSelectCompany = useCallback(
    company => {
      peopleActions?.setCurrentCompany(company);
      setModalVisible(false);

      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }),
      ]).start();
    },
    [peopleActions, fadeAnim],
  );

  const openModal = useCallback(() => {
    setModalVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const closeModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setModalVisible(false);
    });
  }, [fadeAnim, slideAnim]);

  const renderCompanyItem = useCallback(
    (company, index) => {
      const isSelected = selectedCompany?.id === company?.id;

      return (
        <TouchableOpacity
          key={company?.id || index}
          style={[
            styles.companyItem,
            isSelected && styles.companyItemSelected,
            index === 0 && styles.firstItem,
            index === companies.length - 1 && styles.lastItem,
          ]}
          onPress={() => handleSelectCompany(company)}
          activeOpacity={0.7}>
          <View style={styles.companyInfo}>
            <View
              style={[
                styles.companyIcon,
                isSelected && styles.companyIconSelected,
              ]}>
              <Icon
                name="business"
                size={20}
                color={isSelected ? '#fff' : '#2529a1'}
              />
            </View>
            <View style={styles.companyDetails}>
              <Text
                style={[
                  styles.companyName,
                  isSelected && styles.companyNameSelected,
                ]}>
                {company?.alias || company?.name}
              </Text>
              {company?.name !== company?.alias && (
                <Text
                  style={[
                    styles.companyFullName,
                    isSelected && styles.companyFullNameSelected,
                  ]}>
                  {company?.name}
                </Text>
              )}
            </View>
          </View>
          {isSelected && (
            <Icon name="check-circle" size={24} color="#2529a1" />
          )}
        </TouchableOpacity>
      );
    },
    [selectedCompany, companies.length, handleSelectCompany],
  );

  if (!companies || companies.length <= 1) {
    return null;
  }

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={openModal}
          activeOpacity={0.8}>
          <View style={styles.filterContent}>
            <View style={styles.companyIndicator}>
              <Icon name="business" size={18} color="#2529a1" />
            </View>
            <View style={styles.filterText}>
              <Text style={styles.filterLabel}>Empresa</Text>
              <Text style={styles.filterValue} numberOfLines={1}>
                {selectedCompany?.alias ||
                  selectedCompany?.name ||
                  'Selecionar'}
              </Text>
            </View>
            <Icon name="chevron-down" size={24} color="#666" />
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
          <Animated.View
            style={[
              styles.modalBackground,
              {
                opacity: fadeAnim,
              },
            ]}
          />
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.modalContent,
            {
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
            },
          ]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Icon name="business" size={24} color="#2529a1" />
              <Text style={styles.modalTitle}>Selecionar Empresa</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeModal}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}>
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
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  filterText: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginBottom: 2,
  },
  filterValue: {
    fontSize: 16,
    color: '#212529',
    fontWeight: '600',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
    paddingTop: 8,
  },
  companyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  companyItemSelected: {
    backgroundColor: '#f8f9ff',
  },
  firstItem: {
    borderTopWidth: 0,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  companyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  companyIconSelected: {
    backgroundColor: '#2529a1',
  },
  companyDetails: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2,
  },
  companyNameSelected: {
    color: '#2529a1',
  },
  companyFullName: {
    fontSize: 14,
    color: '#666',
  },
  companyFullNameSelected: {
    color: '#2529a1',
    opacity: 0.8,
  },
});

export default CompanyFilter;
