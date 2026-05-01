import {
  TAROT_DECK,
  shuffleAndDraw,
  dailyCardOfTheDay,
  getSpreadPositions,
} from '@utils/tarot';

describe('TAROT_DECK', () => {
  it('contains exactly 78 cards', () => {
    expect(TAROT_DECK).toHaveLength(78);
  });

  it('has 22 Major Arcana and 56 Minor Arcana', () => {
    const major = TAROT_DECK.filter(c => c.arcana === 'major');
    const minor = TAROT_DECK.filter(c => c.arcana === 'minor');
    expect(major).toHaveLength(22);
    expect(minor).toHaveLength(56);
  });

  it('has 14 cards in each minor suit', () => {
    const suits: Array<'wands' | 'cups' | 'swords' | 'pentacles'> = ['wands', 'cups', 'swords', 'pentacles'];
    suits.forEach(suit => {
      const cards = TAROT_DECK.filter(c => c.suit === suit);
      expect(cards).toHaveLength(14);
    });
  });

  it('has unique IDs across all cards', () => {
    const ids = new Set(TAROT_DECK.map(c => c.id));
    expect(ids.size).toBe(78);
  });

  it('every card has an upright and reversed meaning', () => {
    TAROT_DECK.forEach(c => {
      expect(c.upright.length).toBeGreaterThan(5);
      expect(c.reversed.length).toBeGreaterThan(5);
    });
  });

  it('every card has a unique name', () => {
    const names = new Set(TAROT_DECK.map(c => c.name));
    expect(names.size).toBe(78);
  });
});

describe('shuffleAndDraw', () => {
  it('draws 1 card for single spread', () => {
    const drawn = shuffleAndDraw('single');
    expect(drawn).toHaveLength(1);
    expect(drawn[0]?.position).toBe('The Card');
  });

  it('draws 3 cards for three spread', () => {
    const drawn = shuffleAndDraw('three');
    expect(drawn).toHaveLength(3);
    expect(drawn.map(d => d.position)).toEqual(['Past', 'Present', 'Future']);
  });

  it('returns distinct cards (no duplicates) within a draw', () => {
    const drawn = shuffleAndDraw('three');
    const ids = new Set(drawn.map(d => d.card.id));
    expect(ids.size).toBe(3);
  });

  it('is deterministic when seeded', () => {
    const a = shuffleAndDraw('three', 'fixed-seed-123');
    const b = shuffleAndDraw('three', 'fixed-seed-123');
    expect(a.map(d => d.card.id)).toEqual(b.map(d => d.card.id));
    expect(a.map(d => d.reversed)).toEqual(b.map(d => d.reversed));
  });

  it('different seeds produce different draws', () => {
    const a = shuffleAndDraw('three', 'seed-a');
    const b = shuffleAndDraw('three', 'seed-b');
    // Extremely unlikely to match all 3 by chance.
    const sameAll = a.every((card, i) => card.card.id === b[i]!.card.id);
    expect(sameAll).toBe(false);
  });

  it('every drawn card has a valid position label', () => {
    const positions = getSpreadPositions('three');
    const drawn = shuffleAndDraw('three');
    drawn.forEach((d, i) => {
      expect(d.position).toBe(positions[i]);
    });
  });
});

describe('dailyCardOfTheDay', () => {
  it('returns the same card for the same userKey + date', () => {
    const date = new Date('2026-05-01T10:00:00Z');
    const a = dailyCardOfTheDay('user-1', date);
    const b = dailyCardOfTheDay('user-1', date);
    expect(a.card.id).toBe(b.card.id);
    expect(a.reversed).toBe(b.reversed);
  });

  it('returns different cards for different users on the same date', () => {
    const date = new Date('2026-05-01T10:00:00Z');
    const a = dailyCardOfTheDay('user-alpha', date);
    const b = dailyCardOfTheDay('user-omega', date);
    // Very unlikely to collide; if they do, the test catches it.
    const same = a.card.id === b.card.id && a.reversed === b.reversed;
    expect(same).toBe(false);
  });

  it('returns different cards for the same user across different dates', () => {
    const a = dailyCardOfTheDay('user-1', new Date('2026-05-01T10:00:00Z'));
    const b = dailyCardOfTheDay('user-1', new Date('2026-05-02T10:00:00Z'));
    const same = a.card.id === b.card.id && a.reversed === b.reversed;
    expect(same).toBe(false);
  });
});
