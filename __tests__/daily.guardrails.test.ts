import { checkDailyGuardrails, isTooSimilarToRecent } from '@lib/daily/guardrails';

describe('checkDailyGuardrails', () => {
  const CLEAN = `Saturn occupies the 10th house of your chart, and today that placement asks a specific question. The Moon moves into Capricorn this afternoon, tightening the focus on structures and what you're actually building — not what you intend to build. Pay attention to where your effort goes versus where you hope it goes. These are often different places.

There's one thing worth moving carefully with today: communication with authority figures. The current Mercury-Saturn aspect makes it easy for precision to read as coldness. It isn't — but if there's something important to convey, say the warmest version of the true thing.

What one structure in your life — a habit, a system, a relationship — is quietly asking for renewal rather than just maintenance?`;

  it('passes a clean response', () => {
    const result = checkDailyGuardrails(CLEAN, false);
    expect(result.passes).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('flags generic spiritual language', () => {
    const generic = CLEAN + ' The universe is guiding you on this journey. Embrace the path that the cosmos is showing you.';
    const result = checkDailyGuardrails(generic, false);
    expect(result.passes).toBe(false);
    expect(result.issues.some(i => i.includes('generic'))).toBe(true);
  });

  it('flags predicted external events', () => {
    const withPrediction = CLEAN + ' Something will arrive in your career that you\'ve been waiting for.';
    const result = checkDailyGuardrails(withPrediction, false);
    expect(result.passes).toBe(false);
    expect(result.issues.some(i => i.includes('prediction'))).toBe(true);
  });

  it('flags quiet day padding', () => {
    const padded = 'A quiet day. ' + 'x'.repeat(400);
    const result = checkDailyGuardrails(padded, true);
    expect(result.passes).toBe(false);
    expect(result.issues.some(i => i.includes('low-significance') || i.includes('padded') || i.includes('brief'))).toBe(true);
  });

  it('flags missing forward element', () => {
    const noForward = 'Saturn is in your 10th. Today is steady and unremarkable. The dasha continues.';
    const result = checkDailyGuardrails(noForward, false);
    expect(result.passes).toBe(false);
    expect(result.issues.some(i => i.includes('question') || i.includes('forward'))).toBe(true);
  });
});

describe('isTooSimilarToRecent', () => {
  const card = 'Saturn in the tenth house asks what you are building and whether it will last beyond your attention span.';

  it('returns false when no recent cards', () => {
    expect(isTooSimilarToRecent(card, [])).toBe(false);
  });

  it('returns true for near-duplicate', () => {
    expect(isTooSimilarToRecent(card, [card])).toBe(true);
  });

  it('returns false for very different card', () => {
    const different = 'The Moon in Scorpio brings emotional depth and an invitation to examine what you have been avoiding in your closest relationships.';
    expect(isTooSimilarToRecent(card, [different])).toBe(false);
  });
});
