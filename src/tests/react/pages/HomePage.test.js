/* global describe, expect, it, jest */

import React from 'react';
import { act, create } from 'react-test-renderer';

const mockFetch = jest.fn();
const mockMenus = [
  {
    id: 'menu_access',
    label: 'Menus por perfil',
  },
];

const mockStores = {
  theme: {
    getters: {
      colors: {},
      menus: mockMenus,
    },
  },
  people: {
    getters: {
      currentCompany: {
        id: 1,
        theme: {
          colors: {},
        },
      },
    },
  },
  auth: {
    getters: {
      user: {
        roles: ['ROLE_SUPER'],
      },
    },
  },
  translate: {
    getters: {
      messages: {},
      pendingMessages: {},
    },
  },
};

jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Platform: {
    OS: 'web',
    select: options => options.web || options.default || options.ios || options.android,
  },
  ScrollView: 'ScrollView',
  StyleSheet: {
    create: styles => styles,
    flatten: styles => styles,
  },
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
}));

jest.mock('react-native-animatable', () => ({
  Text: 'Text',
}));

jest.mock('react-native-vector-icons/Feather', () => 'FeatherIcon');

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
}));

jest.mock('@controleonline/ui-layout/src/react/components/AppMenuGrid', () => {
  const ReactMock = require('react');

  return function AppMenuGrid(props) {
    return ReactMock.createElement('AppMenuGrid', props);
  };
});

jest.mock('@controleonline/ui-common/src/api', () => ({
  api: {
    fetch: mockFetch,
  },
}));

jest.mock('@controleonline/ui-common/src/react/utils/runtimeMenu', () => ({
  userHasRole: () => true,
}));

jest.mock('@controleonline/../../src/styles/branding', () => ({
  resolveThemePalette: (themeColors, baseColors) => ({
    ...baseColors,
    ...themeColors,
    background: '#F8FAFC',
    border: '#E2E8F0',
    info: '#0284C7',
    primary: '#0EA5E9',
    success: '#16A34A',
    text: '#0F172A',
    textSecondary: '#64748B',
    white: '#FFFFFF',
  }),
  withOpacity: (hexColor, opacity) => `${hexColor}:${opacity}`,
}));

jest.mock('@controleonline/../../src/styles/colors', () => ({
  colors: {
    background: '#F8FAFC',
    border: '#E2E8F0',
    info: '#0284C7',
    primary: '#0EA5E9',
    success: '#16A34A',
    text: '#0F172A',
    textSecondary: '#64748B',
    white: '#FFFFFF',
  },
}));

jest.mock('@store', () => ({
  useStore: name => mockStores[name],
}));

jest.mock('@appType', () => ({
  app_type_base: 'ADMIN',
}));

const {
  default: HomePage,
  resolveHomeColors,
} = require('../../../react/pages/home');

const homePageSource = require('node:fs').readFileSync(
  require('node:path').resolve(__dirname, '../../../react/pages/home/index.js'),
  'utf8',
);

const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

function renderHomePage() {
  const navigation = {
    navigate: jest.fn(),
  };

  let renderer;

  act(() => {
    renderer = create(<HomePage navigation={navigation} />);
  });

  return {navigation, renderer};
}

describe('HomePage', () => {
  it('keeps Portuguese labels visible while translations are unavailable', () => {
    expect(homePageSource).toContain("|| 'Visão geral'");
    expect(homePageSource).toContain("|| 'Pedidos'");
    expect(homePageSource).toContain("|| 'Clientes'");
  });

  it('derives the home accents and readable labels from the company theme', () => {
    expect(resolveHomeColors({
      border: '#DDDDDD',
      buttonBackground: '#111111',
      buttonText: '#FFCC00',
      cardBackground: '#FFFFFF',
      cardBorder: '#E5E5E5',
      text: '#222222',
      textSecondary: '#FFCC00',
      white: '#FFFFFF',
    })).toEqual(expect.objectContaining({
      actionBackground: '#111111',
      actionText: '#FFCC00',
      cardBackground: '#FFFFFF',
      cardBorder: '#E5E5E5',
      mutedText: '#222222:0.68',
      statIcon: '#111111',
      statIconBackground: '#FFCC00',
      text: '#222222',
    }));
  });

  it('renders the ADMIN home without hero blocks', () => {
    const { renderer } = renderHomePage();

    const tree = renderer.toJSON();
    const serializedTree = JSON.stringify(tree);
    const appMenuGrid = renderer.root.findAllByType('AppMenuGrid');

    expect(mockFetch).not.toHaveBeenCalled();
    expect(appMenuGrid).toHaveLength(1);
    expect(appMenuGrid[0].props.menus).toBe(mockMenus);
    expect(appMenuGrid[0].props.colorTokens).toEqual(expect.objectContaining({
      actionBackground: '#0EA5E9',
      text: '#0F172A',
    }));
    expect(serializedTree).toContain('AppMenuGrid');
    expect(serializedTree).not.toContain('Cadastro de menus');
    expect(serializedTree).not.toContain('Olá,');
  });
});
