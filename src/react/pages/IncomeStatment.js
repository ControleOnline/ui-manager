import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Modal,
  Text,
  Alert,
  TouchableOpacity,
  TextInput as RNTextInput,
} from 'react-native';
import { getStore } from '@store';
import StateStore from '@controleonline/ui-layout/src/react/components/StateStore';
import Formatter from '@controleonline/ui-common/src/utils/formatter.js';
import Icon from 'react-native-vector-icons/MaterialIcons';

const IncomeStatment = () => {
  const { getters: invoiceGetters, actions: invoiceActions } = getStore('invoice');
  const { getters: peopleGetters } = getStore('people');
  const { isLoading, items: rawData } = invoiceGetters;
  const { currentCompany } = peopleGetters;

  const [filters, setFilters] = useState({
    year: new Date().getFullYear().toString(),
    people: null,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [parentCategories, setParentCategories] = useState(null);
  const [incomeStatements, setIncomeStatements] = useState({});

  useEffect(() => {
    loadData();
  }, [currentCompany]);

  const loadData = () => {
    const params = { ...filters, people: currentCompany.id };
    invoiceActions.getIncomeStatements(params).then((response) => {
    }).catch((error) => {
    });
  };

  useEffect(() => {
    if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
      const transformedData = Object.keys(rawData).reduce((acc, month) => {
        const monthData = rawData[month];
        const receiveData = Array.isArray(monthData.receive)
          ? { parent_categories: monthData.receive, total_month_price: 0 }
          : monthData.receive || { parent_categories: [], total_month_price: 0 };
        const payData = {
          parent_categories: [],
          total_month_price: monthData.pay?.total_month_price || 0,
        };
        if (monthData.pay?.parent_categories) {
          if (Array.isArray(monthData.pay.parent_categories)) {
            payData.parent_categories = monthData.pay.parent_categories;
          } else if (typeof monthData.pay.parent_categories === 'object') {
            payData.parent_categories = Object.values(monthData.pay.parent_categories).flat();
          }
        }
        acc[month] = {
          receive: {
            parent_categories: receiveData.parent_categories,
            total_month_price: receiveData.total_month_price,
          },
          pay: payData,
        };
        return acc;
      }, {});
      setIncomeStatements(transformedData);
    } else {
      setIncomeStatements({});
    }
  }, [rawData]);

  const showDetails = (categories) => {
    setParentCategories(categories);
    setModalVisible(true);
  };

  const getBalanceColor = (month) => {
    const balance =
      (month.receive?.total_month_price || 0) -
      (month.pay?.total_month_price || 0);
    return balance < 0 ? styles.textRed : styles.textGreen;
  };

  const getMonthName = (monthIndex) => {
    const monthNames = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ];
    return monthNames[monthIndex - 1];
  };

  const formatYear = (text) => {
    const cleaned = text.replace(/\D/g, '');
    setFilters((prev) => ({ ...prev, year: cleaned }));
  };

  const validateYear = (value) => {
    if (value.length !== 4) {
      Alert.alert('Erro', 'Por favor, insira um ano válido');
    }
  };

  const clearFilters = () => {
    setFilters({
      year: new Date().getFullYear().toString(),
      people: null,
    });
    loadData();
  };

  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString());

  const renderMonthCard = ({ item }) => {
    const monthIndex = parseInt(item);
    const month = incomeStatements[monthIndex] || {
      receive: { parent_categories: [], total_month_price: 0 },
      pay: { parent_categories: [], total_month_price: 0 },
    };

    return (
      <View style={styles.monthCard}>
        <View style={styles.listHeader}>
          <Text style={styles.cardTitle}>{getMonthName(monthIndex)}</Text>
          <TouchableOpacity
            onPress={() => showDetails(month.receive?.parent_categories || [])}>
            <Icon name="info" size={20} color="#2196f3" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => showDetails(month.pay?.parent_categories || [])}>
            <Icon name="info" size={20} color="#2196f3" />
          </TouchableOpacity>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.listItem}>
            <Text style={[styles.itemText, styles.textGreen]}>Total de Receitas</Text>
            <Text style={[styles.itemText, styles.textGreen]}>
              {Formatter.formatMoney(month.receive?.total_month_price || 0)}
            </Text>
          </View>
          <View style={styles.listItem}>
            <Text style={[styles.itemText, styles.textRed]}>Total de Despesas</Text>
            <Text style={[styles.itemText, styles.textRed]}>
              {Formatter.formatMoney(month.pay?.total_month_price || 0)}
            </Text>
          </View>
          <View style={styles.listItem}>
            <Text style={[styles.itemText, styles.bold, getBalanceColor(month)]}>
              Saldo
            </Text>
            <Text style={[styles.itemText, styles.bold, getBalanceColor(month)]}>
              {Formatter.formatMoney(
                (month.receive?.total_month_price || 0) -
                  (month.pay?.total_month_price || 0)
              )}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StateStore store="invoice" />
      <View style={styles.filterCard}>
        <View style={styles.filterContent}>
          <RNTextInput
            placeholder="Ano"
            value={filters.year}
            onChangeText={formatYear}
            onSubmitEditing={() => {
              validateYear(filters.year);
              loadData();
            }}
            keyboardType="numeric"
            maxLength={4}
            style={styles.input}
            placeholderTextColor="#000"
          />
          <TouchableOpacity style={styles.button} onPress={loadData}>
            <Icon name="search" size={20} color="#fff" />
            <Text style={styles.buttonText}>Filtrar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={clearFilters}>
            <Icon name="filter-alt-off" size={20} color="#fff" />
            <Text style={styles.buttonText}>Limpar</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={months}
        renderItem={renderMonthCard}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.listContainer}
      />
      <Modal
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalCard}>
            {parentCategories && Array.isArray(parentCategories) && parentCategories.length > 0 ? (
              parentCategories.map((parentCategory, idx) => (
                <View key={idx}>
                  <Text style={styles.modalTitle}>
                    {parentCategory.parent_category_name || 'Categoria'}
                  </Text>
                  {parentCategory.categories_childs && parentCategory.categories_childs.length > 0 ? (
                    parentCategory.categories_childs.map((category, cIdx) => (
                      <Text key={cIdx} style={styles.modalText}>
                        {category.category_name}: {Formatter.formatMoney(category.category_price || 0)}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.modalText}>Nenhuma subcategoria</Text>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.modalText}>Nenhuma categoria disponível</Text>
            )}
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.buttonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {isLoading && (
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  companyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 16,
  },
  filterCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
  },
  filterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    justifyContent: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginRight: 8,
    backgroundColor: '#fff',
    color: '#000',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196f3',
    padding: 10,
    borderRadius: 4,
    marginLeft: 8,
  },
  buttonText: {
    color: '#fff',
    marginLeft: 4,
  },
  monthCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 16,
    color: '#000',
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemText: {
    fontSize: 14,
    color: '#000',
  },
  textGreen: {
    color: '#4caf50',
  },
  textRed: {
    color: '#f44336',
  },
  bold: {
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  modalText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#000',
  },
  modalButton: {
    backgroundColor: '#2196f3',
    padding: 10,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 16,
  },
  listContainer: {
    paddingBottom: 16,
  },
  loading: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default IncomeStatment;