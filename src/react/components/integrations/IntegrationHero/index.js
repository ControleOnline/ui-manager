import React from 'react';
import { Image, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import styles from './styles';

// Hero visual compartilhado pelas telas de integração.
export default function IntegrationHero({
  shadowStyle,
  accentColor,
  eyebrow,
  title,
  description,
  logo,
  iconName = 'layers',
}) {
  return (
    <View style={[styles.card, shadowStyle, { backgroundColor: accentColor }]}>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <View style={styles.badge}>
        {logo ? (
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        ) : (
          <Icon name={iconName} size={20} color={accentColor} />
        )}
      </View>
    </View>
  );
}
