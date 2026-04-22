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
    label: 'Configuracoes gerais',
    description: 'Abra o configurador principal sem misturar conexoes e integracoes direto na home.',
    icon: 'settings',
    accent: '#64748B',
    route: 'GeneralSettings',
  },
  {
    label: 'Logs',
    description: 'Consulte a timeline completa de logs, incluindo registros por entidade e outros tipos tecnicos.',
    icon: 'activity',
    accent: '#F97316',
    route: 'GenericLogPage',
  },
  {
    label: 'Conexoes',
    description: 'Centralize canais de comunicacao e configuracoes operacionais ligadas a empresa ativa.',
    icon: 'radio',
    accent: '#22C55E',
    route: 'ConnectionsPage',
  },
  {
    label: 'Integracoes',
    description: 'Gerencie marketplaces e outras integracoes da operacao dentro do mesmo hub.',
    icon: 'link',
    accent: '#0EA5E9',
    route: 'IntegrationsPage',
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
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background || '#F8FAFC' }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: palette.primary || '#0EA5E9' }]}>
          <View style={styles.heroBadge}>
            <Icon name="sliders" size={22} color={palette.primary || '#0EA5E9'} />
          </View>
          <Text style={styles.heroEyebrow}>CONFIGURADOR</Text>
          <Text style={styles.heroTitle}>Central de configuracao</Text>
          <Text style={styles.heroText}>
            Agrupe conexoes, integracoes e configuracoes gerais em um unico lugar e deixe a home focada no que realmente precisa aparecer nela.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Acessos do configurador</Text>
        <Text style={styles.sectionDescription}>
          Conexoes e integracoes deixam de competir por destaque na home e passam a viver dentro deste modulo.
        </Text>

        <View style={styles.grid}>
          {CONFIG_ACTIONS.map(item => (
            <ActionCard
              key={item.route}
              label={item.label}
              description={item.description}
              icon={item.icon}
              color={item.accent}
              onPress={() => navigation.navigate(item.route)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
