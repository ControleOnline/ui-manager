import {
  canAccessOnboarding,
  isCompanyAdministrator,
  isSuperRole,
  collectUserRoles,
} from '../../../../react/pages/onboarding/onboardingPermissions';

describe('onboardingPermissions', () => {
  test('ROLE_SUPER is detected', () => {
    expect(isSuperRole({ roles: ['ROLE_SUPER'] })).toBe(true);
    expect(isSuperRole({ roles: ['ROLE_HUMAN'] })).toBe(false);
  });

  test('company owner can access as admin', () => {
    const user = {
      id: 1,
      companies: [{ company: { id: 10 }, linkType: 'owner' }],
    };
    const access = canAccessOnboarding(user, { id: 10 });
    expect(access.allowed).toBe(true);
    expect(access.mode).toBe('admin');
  });

  test('ROLE_SUPER without company admin is preview', () => {
    const user = { id: 2, roles: ['ROLE_SUPER'] };
    const access = canAccessOnboarding(user, { id: 99 });
    expect(access.allowed).toBe(true);
    expect(access.mode).toBe('preview');
  });

  test('common user is denied', () => {
    const user = { id: 3, roles: ['ROLE_HUMAN'], companies: [{ company: { id: 10 }, linkType: 'employee' }] };
    const access = canAccessOnboarding(user, { id: 10 });
    expect(access.allowed).toBe(false);
  });

  test('isCompanyAdministrator matches director', () => {
    expect(
      isCompanyAdministrator(
        { companies: [{ companyId: 5, role: 'director' }] },
        { id: 5 },
      ),
    ).toBe(true);
  });

  test('collectUserRoles normalizes', () => {
    expect(collectUserRoles({ roles: ['ROLE_MANAGER'] })).toContain('MANAGER');
  });
});
