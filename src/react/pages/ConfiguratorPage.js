import React, { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import { resolveThemePalette, withOpacity } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import styles from './ConfiguratorPage.styles';

const CONFIG_ACTIONS = [
  {
    label: 'Configurações gerais',
    description: 'Abra o configurador principal sem misturar conexões e integrações direto na home.',
    icon: 'settings',
    accentKey: 'textSecondary',
    route: 'GeneralSettings',
  },
  {
    label: 'Logs',
    description: 'Consulte a timeline completa de logs, incluindo registros por entidade e outros tipos técnicos.',
    icon: 'activity',
    accentKey: 'warning',
    route: 'GenericLogPage',
  },
  {
    label: 'Conexões',
    description: 'Centralize canais de comunicação e configurações operacionais ligadas à empresa ativa.',
    icon: 'radio',
    accentKey: 'success',
    route: 'ConnectionsPage',
  },
  {
    label: 'Integrações',
    description: 'Gerencie marketplaces e outras integrações da operação dentro do mesmo hub.',
    icon: 'link',
    accentKey: 'info',
    route: 'IntegrationsPage',
  },
  {
    label: 'Traduções',
    description: 'Revise textos inseridos automaticamente, compare com o fallback principal e grave sobrescritas por empresa.',
    icon: 'type',
    accentKey: 'error',
    route: 'TranslationsReviewPage',
  },
];

function ActionCard({ label, description, icon, color, onPress }) {
  return (
    <TouchableOpacity style={styles.actionCard} activeOpacity={0.9} onPress={onPress}>
      <View style={[styles.actionIconWrap, { backgroundColor: withOpacity(color, 0.12) }]}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionDescription}>{description}</Text>
    </TouchableOpacity>
  );
}

export default function ConfiguratorPage({ navigation }) {
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const { currentCompany } = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;

  const palette = useMemo(
    () =>
      resolveThemePalette(
        { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
        colors,
      ),
    [themeColors, currentCompany?.id],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: palette.primary }]}>
          <View style={styles.heroBadge}>
            <Icon name="sliders" size={22} color={palette.primary} />
          </View>
          <Text style={styles.heroEyebrow}>CONFIGURADOR</Text>
          <Text style={styles.heroTitle}>Central de configuração</Text>
          <Text style={styles.heroText}>
            Agrupe conexões, integrações e configurações gerais em um único lugar e deixe a home focada no que realmente precisa aparecer nela.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Acessos do configurador</Text>
        <Text style={styles.sectionDescription}>
          Conexões e integrações deixam de competir por destaque na home e passam a viver dentro deste módulo.
        </Text>

        <View style={styles.grid}>
          {CONFIG_ACTIONS.map(item => (
            <ActionCard
              key={item.route}
              label={item.label}
              description={item.description}
              icon={item.icon}
              color={palette[item.accentKey] || palette.primary}
              onPress={() => navigation.navigate(item.route)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
