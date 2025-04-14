import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getStore } from '@store';

const CompanyFilter = () => {
  const { getters: peopleGetters, actions: peopleActions } = getStore('people');
  const { currentCompany, companies } = peopleGetters;
  const [selectedCompany, setSelectedCompany] = useState(currentCompany);

  useEffect(() => {
    setSelectedCompany(currentCompany);
  }, [currentCompany]);

  const handleSelectCompany = company => {
    peopleActions.setCurrentCompany(company);
    setSelectedCompany(company);
  };

  return (
    <View style={styles.container}>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedCompany?.id}
          onValueChange={value =>
            handleSelectCompany(companies.find(c => c.id === value))
          }
          style={styles.picker}
          itemStyle={styles.pickerItem}
        >
          {companies.map(company => (
            <Picker.Item
              key={company.id}
              label={company.alias || 'Selecione uma empresa'}
              value={company.id}
            />
          ))}
        </Picker>
        <Text style={styles.arrow}>▼</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 2,
    paddingHorizontal: 2,
    backgroundColor: '#fff',
    borderRadius: 0,
    margin: 0,
  },
  pickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  picker: {
    fontSize: 8,
    flex: 1,
    height: 30,
    color: '#000',
  },
  pickerItem: {
    fontSize: 8,
    color: '#000',
  },
  arrow: {
    fontSize: 8,
    color: '#000',
    paddingHorizontal: 2,
  },
});

export default CompanyFilter;