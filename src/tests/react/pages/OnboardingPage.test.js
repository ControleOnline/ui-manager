/* global afterAll, describe, expect, it, jest */

import React from 'react';
import {act, create} from 'react-test-renderer';

const currentCompany = {
  id: 42,
  name: 'Santa Redonda Pizzas e Lanches',
  theme: {colors: {primary: '#DC2626'}},
};

const mockStores = {
  auth: {getters: {user: {roles: ['ROLE_SUPER']}}},
  people: {getters: {currentCompany}},
  theme: {getters: {colors: {primary: '#0EA5E9'}}},
};

jest.mock('react-native', () => ({
  Platform: {
    select: options => options.web || options.default || options.ios || options.android,
  },
  ScrollView: 'ScrollView',
  StyleSheet: {create: styles => styles},
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
}));

jest.mock('@store', () => ({
  useStore: name => mockStores[name],
}));

jest.mock('@appType', () => ({
  app_type_base: 'MANAGER',
}));

jest.mock('@controleonline/ui-common/src/react/utils/runtimeMenu', () => ({
  userHasRole: (user, role) => user?.roles?.includes(role),
}));

jest.mock('@controleonline/../../src/styles/branding', () => ({
  resolveThemePalette: theme => ({
    background: '#F8FAFC',
    border: '#E2E8F0',
    cardBackground: '#FFFFFF',
    primary: theme.primary || '#0EA5E9',
    success: '#16A34A',
    text: '#0F172A',
    textSecondary: '#64748B',
    warning: '#F59E0B',
    white: '#FFFFFF',
  }),
}));

jest.mock('@controleonline/../../src/styles/colors', () => ({
  colors: {},
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

const OnboardingPage = require('../../../react/pages/onboarding/OnboardingPage').default;
const {
  createOnboardingSteps,
  isOnboardingDraftReady,
  ONBOARDING_STEPS,
  ONBOARDING_STEP_STATUS,
} = require('../../../react/pages/onboarding/onboardingSteps');
const {
  appendManagerOnboardingMenu,
  ONBOARDING_MENU_ITEM,
} = require('../../../react/pages/onboarding/onboardingMenu');

describe('onboarding structure', () => {
  it('keeps the journey incremental with exactly twelve steps', () => {
    expect(ONBOARDING_STEPS).toHaveLength(12);
    expect(ONBOARDING_STEPS[0].label).toBe('Abrir implantação');
    expect(ONBOARDING_STEPS[11].label).toBe('Validar e ativar');

    const startedSteps = createOnboardingSteps({started: true});
    expect(startedSteps[0].status).toBe(ONBOARDING_STEP_STATUS.ACTIVE);
    expect(startedSteps.slice(1).every(
      step => step.status === ONBOARDING_STEP_STATUS.NOT_STARTED,
    )).toBe(true);
  });

  it('requires the company, owners and a complete Z-Day before starting', () => {
    expect(isOnboardingDraftReady({company: currentCompany, draft: {}})).toBe(false);
    expect(isOnboardingDraftReady({
      company: currentCompany,
      draft: {
        clientOwner: 'Cliente',
        internalOwner: 'Implantador',
        zDayDate: '12/08/2026',
        zDayTime: '09:00',
      },
    })).toBe(true);
  });

  it('adds one onboarding entry to the existing operations module', () => {
    const menus = appendManagerOnboardingMenu([
      {
        id: 'manager-operacoes',
        label: 'Operacoes',
        menus: [{id: 'orders', label: 'Pedidos', route: 'OrderHistoryPage'}],
      },
    ], {enabled: true});

    expect(menus).toHaveLength(1);
    expect(menus[0].menus).toEqual(expect.arrayContaining([
      expect.objectContaining({route: ONBOARDING_MENU_ITEM.route}),
    ]));
    expect(appendManagerOnboardingMenu(menus, {enabled: true})[0].menus).toHaveLength(2);
  });
});

describe('OnboardingPage', () => {
  it('opens the first stage without pretending that future stages are ready', () => {
    let renderer;
    act(() => {
      renderer = create(React.createElement(OnboardingPage));
    });

    const initialTree = JSON.stringify(renderer.toJSON());
    expect(initialTree).toContain('Santa Redonda Pizzas e Lanches');
    expect(initialTree).toContain('Rascunho temporário desta sessão');
    expect(initialTree).toContain('Validar e ativar');

    const button = renderer.root.findByProps({
      accessibilityLabel: 'Iniciar onboarding de teste',
    });
    expect(button.props.disabled).toBe(true);

    act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Responsável do cliente'})
        .props.onChangeText('Responsavel Santa Redonda');
      renderer.root.findByProps({accessibilityLabel: 'Responsável interno'})
        .props.onChangeText('Leandro');
      renderer.root.findByProps({accessibilityLabel: 'Data do Z-Day'})
        .props.onChangeText('12/08/2026');
      renderer.root.findByProps({accessibilityLabel: 'Horário do Z-Day'})
        .props.onChangeText('09:00');
    });

    const enabledButton = renderer.root.findByProps({
      accessibilityLabel: 'Iniciar onboarding de teste',
    });
    expect(enabledButton.props.disabled).toBe(false);

    act(() => enabledButton.props.onPress());
    expect(JSON.stringify(renderer.toJSON())).toContain(
      'Onboarding iniciado nesta sessão',
    );
  });
});
