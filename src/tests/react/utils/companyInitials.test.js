/* global describe, expect, it */

import {companyInitialsFromName} from '../../../react/utils/companyInitials';

describe('companyInitialsFromName', () => {
  it('uses the first and last company-name initials', () => {
    expect(companyInitialsFromName('Loja Central de São Paulo')).toBe('LP');
  });

  it('handles a single-word company and a missing name', () => {
    expect(companyInitialsFromName('Mercado')).toBe('M');
    expect(companyInitialsFromName('')).toBe('?');
  });
});
