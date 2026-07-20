import React, { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import { resolveThemePalette } from '@controleonline/../../src/styles/branding';
import { createStyles } from './ConfiguratorPage.styles';

const tt = (type, key) => global.t?.t('configs', type, key);

export const resolveConfiguratorColors = brandColors => {
  return {
    ...brandColors,
    actionBackground: brandColors.buttonBackground,
    actionText: brandColors.buttonText,
    cardBackground: brandColors.cardBackground,
    cardBorder: brandColors.cardBorder,
    cardIconColor: brandColors.cardIconColor,
    cardIconBackground: brandColors.cardIconBackground,
    cardText: brandColors.cardText,
    iconBackground: brandColors.iconBackground,
    iconColor: brandColors.iconColor,
    mutedText: brandColors.textMuted,
    text: brandColors.textPrimary,
  };
};

const getConfigActions = () => [
  {
    label: tt('hub_label', 'generalSettings') || 'Configurações gerais',
    description:
      tt('hub_description', 'generalSettings') ||
      'Abra o configurador principal sem misturar conexões e integrações direto na home.',
    icon: 'settings',
    route: 'GeneralSettings',
  },
  {
    label: tt('hub_label', 'logs') || 'Logs',
    description:
      tt('hub_description', 'logs') ||
      'Consulte a timeline completa de logs, incluindo registros por entidade e outros tipos técnicos.',
    icon: 'activity',
    route: 'GenericLogPage',
  },
  {
    label: tt('hub_label', 'connections') || 'Conexões',
    description:
      tt('hub_description', 'connections') ||
      'Centralize canais de comunicação e configurações operacionais ligadas à empresa ativa.',
    icon: 'radio',
    route: 'ConnectionsPage',
  },
  {
    label: tt('hub_label', 'integrations') || 'Integrações',
    description:
      tt('hub_description', 'integrations') ||
      'Gerencie marketplaces e outras integrações da operação dentro do mesmo hub.',
    icon: 'link',
    route: 'IntegrationsPage',
  },
  {
    label: tt('hub_label', 'productShowcases') || 'Vitrines de preços',
    description:
      tt('hub_description', 'productShowcases') ||
      'Veja a distribuição de produtos por integração, preço, estoque de saída e código externo.',
    icon: 'grid',
    route: 'ProductShowcasesPage',
  },
  {
    label: tt('hub_label', 'cronJobs') || 'Cron jobs',
    description:
      tt('hub_description', 'cronJobs') ||
      'Organize os agendamentos do sistema por empresa principal usando comandos descobertos dinamicamente.',
    icon: 'clock',
    route: 'CronJobsPage',
  },
  {
    label: tt('hub_label', 'translations') || 'Traduções',
    description:
      tt('hub_description', 'translations') ||
      'Revise textos inseridos automaticamente, compare com o fallback principal e grave sobrescritas por empresa.',
    icon: 'type',
    route: 'TranslationsReviewPage',
  },
  {
    label: tt('hub_label', 'themes') || 'Temas',
    description:
      tt('hub_description', 'themes') ||
      'Gerencie paletas visuais, duplique temas e associe cada domínio da empresa ao tema desejado.',
    icon: 'droplet',
    route: 'ThemeManagerPage',
  },
];

function ActionCard({ styles, colors, label, description, icon, onPress }) {
  return (
    <TouchableOpacity style={styles.actionCard} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.actionHeader}>
        <View style={[styles.actionIconWrap, { backgroundColor: colors.cardIconBackground }]}>
          <Icon name={icon} size={18} color={colors.cardIconColor} />
        </View>
        <Text style={styles.actionLabel}>{label}</Text>
      </View>
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
      resolveThemePalette({
        ...themeColors,
        ...(currentCompany?.theme?.colors || {}),
      }),
    [themeColors, currentCompany?.id],
  );
  const configuratorColors = useMemo(
    () => resolveConfiguratorColors(palette),
    [palette],
  );
  const styles = useMemo(
    () => createStyles(configuratorColors),
    [configuratorColors],
  );
  const configActions = getConfigActions();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: configuratorColors.background }]}
      edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Icon name="sliders" size={22} color={configuratorColors.cardIconColor} />
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
              styles={styles}
              colors={configuratorColors}
              label={item.label}
              description={item.description}
              icon={item.icon}
              onPress={() => navigation.navigate(item.route)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
