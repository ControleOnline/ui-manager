import React, { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import { resolveThemePalette, withOpacity } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import styles from './ConfiguratorPage.styles';

const tt = (type, key) => global.t?.t('configs', type, key);

const getConfigActions = () => [
  {
    label: tt('hub_label', 'generalSettings') || 'Configurações gerais',
    description:
      tt('hub_description', 'generalSettings') ||
      'Abra o configurador principal sem misturar conexões e integrações direto na home.',
    icon: 'settings',
    accentKey: 'textSecondary',
    route: 'GeneralSettings',
  },
  {
    label: tt('hub_label', 'logs') || 'Logs',
    description:
      tt('hub_description', 'logs') ||
      'Consulte a timeline completa de logs, incluindo registros por entidade e outros tipos técnicos.',
    icon: 'activity',
    accentKey: 'warning',
    route: 'GenericLogPage',
  },
  {
    label: tt('hub_label', 'connections') || 'Conexões',
    description:
      tt('hub_description', 'connections') ||
      'Centralize canais de comunicação e configurações operacionais ligadas à empresa ativa.',
    icon: 'radio',
    accentKey: 'success',
    route: 'ConnectionsPage',
  },
  {
    label: tt('hub_label', 'integrations') || 'Integrações',
    description:
      tt('hub_description', 'integrations') ||
      'Gerencie marketplaces e outras integrações da operação dentro do mesmo hub.',
    icon: 'link',
    accentKey: 'info',
    route: 'IntegrationsPage',
  },
  {
    label: tt('hub_label', 'translations') || 'Traduções',
    description:
      tt('hub_description', 'translations') ||
      'Revise textos inseridos automaticamente, compare com o fallback principal e grave sobrescritas por empresa.',
    icon: 'type',
    accentKey: 'error',
    route: 'TranslationsReviewPage',
  },
  {
    label: tt('hub_label', 'themes') || 'Temas',
    description:
      tt('hub_description', 'themes') ||
      'Gerencie paletas visuais, duplique temas e associe cada domínio da empresa ao tema desejado.',
    icon: 'droplet',
    accentKey: 'primary',
    route: 'ThemeManagerPage',
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
  const configActions = getConfigActions();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: palette.primary }]}>
          <View style={styles.heroBadge}>
            <Icon name="sliders" size={22} color={palette.primary} />
          </View>
          <Text style={styles.heroEyebrow}>{tt('hub_eyebrow', 'configurator') || 'CONFIGURADOR'}</Text>
          <Text style={styles.heroTitle}>{tt('hub_title', 'configurationCenter') || 'Central de configuração'}</Text>
          <Text style={styles.heroText}>
            {tt('hub_text', 'configurationCenter') ||
              'Agrupe conexões, integrações e configurações gerais em um único lugar e deixe a home focada no que realmente precisa aparecer nela.'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>{tt('hub_title', 'configuratorAccess') || 'Acessos do configurador'}</Text>
        <Text style={styles.sectionDescription}>
          {tt('hub_text', 'configuratorAccess') ||
            'Conexões e integrações deixam de competir por destaque na home e passam a viver dentro deste módulo.'}
        </Text>

        <View style={styles.grid}>
          {configActions.map(item => (
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
