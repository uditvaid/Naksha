/**
 * Unit tests for the font-scale preset helpers.
 *
 * The Text.render patch itself can't be tested in jest without mocking
 * RN internals — its behaviour is verified visually in the simulator.
 * What's testable is the preset round-tripping: option ↔ multiplier
 * mappings have to stay consistent so the Profile UI's "active" pill
 * always matches the stored value, even after migrations or accidental
 * drift.
 */

import { fontScaleValue, fontScaleOption } from '../src/services/textScale';

describe('fontScaleValue', () => {
  test('default → 1.0', () => { expect(fontScaleValue('default')).toBe(1); });
  test('large → 1.15', () => { expect(fontScaleValue('large')).toBe(1.15); });
  test('xlarge → 1.3', () => { expect(fontScaleValue('xlarge')).toBe(1.3); });
});

describe('fontScaleOption', () => {
  test('1.0 → default', () => { expect(fontScaleOption(1)).toBe('default'); });
  test('1.15 → large', () => { expect(fontScaleOption(1.15)).toBe('large'); });
  test('1.3 → xlarge', () => { expect(fontScaleOption(1.3)).toBe('xlarge'); });

  test('values just below thresholds round down to the correct band', () => {
    expect(fontScaleOption(0.99)).toBe('default');
    expect(fontScaleOption(1.14)).toBe('default');
    expect(fontScaleOption(1.29)).toBe('large');
  });

  test('values above xlarge stay at xlarge', () => {
    expect(fontScaleOption(1.5)).toBe('xlarge');
    expect(fontScaleOption(2)).toBe('xlarge');
  });

  test('values below default stay at default', () => {
    expect(fontScaleOption(0.5)).toBe('default');
    expect(fontScaleOption(0)).toBe('default');
  });
});

describe('round-trip option ↔ value', () => {
  test('every option maps back to itself', () => {
    for (const opt of ['default', 'large', 'xlarge'] as const) {
      expect(fontScaleOption(fontScaleValue(opt))).toBe(opt);
    }
  });
});
