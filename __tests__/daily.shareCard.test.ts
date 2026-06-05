import { extractShareQuote, formatLunarPhase, buildShareMoment } from '@lib/daily/shareCard';
import type { LunarPhase } from '@lib/daily/signals';

// ─── extractShareQuote ──────────────────────────────────────────────────────────

describe('extractShareQuote', () => {
  it('returns empty string for empty input', () => {
    expect(extractShareQuote('')).toBe('');
    expect(extractShareQuote('   ')).toBe('');
  });

  it('returns short single-sentence reading as-is', () => {
    const s = 'Today carries a quiet generosity.';
    expect(extractShareQuote(s)).toBe(s);
  });

  it('picks the first sentence in the ideal length window', () => {
    const short = 'Yes.';
    const ideal = 'There is a particular quality to Thursdays that you might already feel without being able to name it.';
    const reading = `${short} ${ideal} And so the day unfolds.`;
    const result = extractShareQuote(reading);
    expect(result).toBe(ideal);
  });

  it('skips sentences starting with conjunctions', () => {
    const reading = "And yet the tide turns. Jupiter's light falls gently on the path you have been quietly building — not with force, but with patience and presence.";
    const result = extractShareQuote(reading);
    expect(result).not.toMatch(/^And /);
    expect(result.length).toBeGreaterThan(20);
  });

  it('truncates with ellipsis when no good sentence found', () => {
    // All sentences too long or skipped — fallback to first truncated
    const veryLong = 'A'.repeat(300);
    const result = extractShareQuote(veryLong);
    expect(result.length).toBeLessThanOrEqual(245);
    expect(result.endsWith('…')).toBe(true);
  });

  it('handles multi-sentence reading correctly', () => {
    const reading = [
      'Today is Thursday.',
      'There is a beautiful irony in asking this question during your Jupiter planetary period — because Jupiter teaches through the quiet moments, the overlooked, the underestimated.',
      'So let us sit with this honestly.',
    ].join(' ');
    const result = extractShareQuote(reading);
    expect(result.length).toBeGreaterThanOrEqual(60);
    expect(result.length).toBeLessThanOrEqual(240);
  });
});

// ─── formatLunarPhase ───────────────────────────────────────────────────────────

describe('formatLunarPhase', () => {
  const cases: Array<[LunarPhase, string]> = [
    ['new_moon', 'New Moon'],
    ['waxing_crescent', 'Waxing Crescent Moon'],
    ['first_quarter', 'First Quarter Moon'],
    ['waxing_gibbous', 'Waxing Gibbous Moon'],
    ['full_moon', 'Full Moon'],
    ['waning_gibbous', 'Waning Gibbous Moon'],
    ['last_quarter', 'Last Quarter Moon'],
    ['waning_crescent', 'Waning Crescent Moon'],
  ];

  it.each(cases)('formats %s as "%s"', (phase, label) => {
    expect(formatLunarPhase(phase)).toBe(label);
  });
});

// ─── buildShareMoment ───────────────────────────────────────────────────────────

describe('buildShareMoment', () => {
  const reading = 'There is a certain quality to Thursdays that is hard to name but easy to feel — a quietly generous energy that opens doors without announcement.';
  const ctx = {
    lunarPhase: 'waxing_gibbous' as LunarPhase,
    mahadasha: 'Jupiter',
    date: new Date('2026-04-30T12:00:00Z'),
  };

  it('returns a ShareMoment with all required fields', () => {
    const moment = buildShareMoment(reading, ctx);
    expect(moment).toHaveProperty('quote');
    expect(moment).toHaveProperty('contextLine');
    expect(moment).toHaveProperty('dateLabel');
    expect(moment).toHaveProperty('attribution');
    expect(moment).toHaveProperty('fullText');
  });

  it('quote is the extracted sentence from the reading', () => {
    const moment = buildShareMoment(reading, ctx);
    expect(moment.quote.length).toBeGreaterThan(10);
    expect(reading).toContain(moment.quote.replace('…', ''));
  });

  it('contextLine contains mahadasha and lunar phase', () => {
    const moment = buildShareMoment(reading, ctx);
    expect(moment.contextLine).toContain('Jupiter');
    expect(moment.contextLine).toContain('Waxing Gibbous Moon');
  });

  it('dateLabel contains the date', () => {
    const moment = buildShareMoment(reading, ctx);
    expect(moment.dateLabel).toMatch(/April 30/);
  });

  it('attribution carries app tagline and AI-generated disclosure', () => {
    const moment = buildShareMoment(reading, ctx);
    expect(moment.attribution).toContain('naksha');
    expect(moment.attribution).toContain('AI-assisted');
  });

  it('fullText includes quote in quotes, contextLine, dateLabel and attribution', () => {
    const moment = buildShareMoment(reading, ctx);
    expect(moment.fullText).toContain(`"${moment.quote}"`);
    expect(moment.fullText).toContain('✦');
    expect(moment.fullText).toContain(moment.contextLine);
    expect(moment.fullText).toContain(moment.dateLabel);
    expect(moment.fullText).toContain(moment.attribution);
  });

  it('fullText uses newlines to separate sections', () => {
    const moment = buildShareMoment(reading, ctx);
    const lines = moment.fullText.split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(5);
  });

  it('works without a date override (uses current date)', () => {
    const moment = buildShareMoment(reading, { lunarPhase: 'full_moon', mahadasha: 'Saturn' });
    expect(moment.fullText).toContain('Saturn Mahadasha · Full Moon');
    expect(moment.dateLabel).toBeTruthy();
  });
});
