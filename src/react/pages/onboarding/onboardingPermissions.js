/**
 * Onboarding access: company owner/director/manager.
 * ROLE_SUPER is preview-only (not company admin by itself).
 */

export function normalizeRole(role) {
  if (!role) return '';
  return String(role).toUpperCase().replace(/^ROLE_/, '');
}

export function collectUserRoles(user) {
  const roles = [];
  if (!user) return roles;
  if (Array.isArray(user.roles)) roles.push(...user.roles);
  if (user.role) roles.push(user.role);
  if (Array.isArray(user.companies)) {
    user.companies.forEach((c) => {
      if (c?.role) roles.push(c.role);
      if (Array.isArray(c?.roles)) roles.push(...c.roles);
      if (c?.linkType) roles.push(c.linkType);
    });
  }
  return roles.map(normalizeRole).filter(Boolean);
}

export function isSuperRole(user) {
  return collectUserRoles(user).includes('SUPER');
}

const COMPANY_ADMIN_ROLES = new Set([
  'OWNER',
  'DIRECTOR',
  'MANAGER',
  'ADMIN',
  'PROPRIETARIO',
  'PROPRIETÁRIO',
  'DIRETOR',
  'GESTOR',
]);

/**
 * True when the user administers the given company (link/role).
 */
export function isCompanyAdministrator(user, company) {
  if (!user || !company) return false;
  const companyId = company.id ?? company.companyId;
  const links = [];
  if (Array.isArray(user.companies)) links.push(...user.companies);
  if (Array.isArray(user.peopleLinks)) links.push(...user.peopleLinks);

  for (const link of links) {
    const linkCompanyId =
      link?.company?.id ?? link?.companyId ?? link?.id ?? link?.people?.id;
    if (companyId != null && linkCompanyId != null && String(linkCompanyId) !== String(companyId)) {
      continue;
    }
    const role = normalizeRole(link?.role || link?.linkType || link?.type);
    if (COMPANY_ADMIN_ROLES.has(role)) return true;
  }

  // Fallback: roles on user when company context already scoped
  const userRoles = collectUserRoles(user);
  return userRoles.some((r) => COMPANY_ADMIN_ROLES.has(r));
}

/**
 * Can open onboarding: company admin, or ROLE_SUPER (preview).
 */
export function canAccessOnboarding(user, company) {
  if (isCompanyAdministrator(user, company)) return { allowed: true, mode: 'admin' };
  if (isSuperRole(user)) return { allowed: true, mode: 'preview' };
  return { allowed: false, mode: null };
}
