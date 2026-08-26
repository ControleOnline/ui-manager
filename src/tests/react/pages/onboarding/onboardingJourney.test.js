import { buildJourney, capabilityStatusForDraft } from '../../../../react/pages/onboarding/onboardingJourney';
import { createEmptyDraft } from '../../../../react/pages/onboarding/onboardingDraft';

describe('onboardingJourney', () => {
  test('salon enables floor plan step', () => {
    const d = createEmptyDraft();
    d.operations.salon = true;
    const j = buildJourney(d);
    expect(j.some((s) => s.id === 'floor_plan')).toBe(true);
  });

  test('pcp enables pcp step', () => {
    const d = createEmptyDraft();
    d.operations.pcp = true;
    const j = buildJourney(d);
    expect(j.some((s) => s.id === 'pcp')).toBe(true);
  });

  test('delivery highlights capability', () => {
    const d = createEmptyDraft();
    d.operations.deliveryOwn = true;
    const caps = capabilityStatusForDraft(d);
    const delivery = caps.find((c) => c.id === 'delivery');
    expect(delivery.highlighted).toBe(true);
  });

  test('base journey always has company_profile and devices', () => {
    const j = buildJourney(createEmptyDraft());
    expect(j[0].id).toBe('company_profile');
    expect(j.some((s) => s.id === 'devices')).toBe(true);
  });
});
