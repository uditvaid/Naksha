/**
 * Migration runner: legacy in-userStore Guru transcript →
 * dedicated guruMessageStore.
 *
 * The runner has four interesting branches that we want to lock down
 * before they regress quietly during future store edits:
 *   1. Both stores must be hydrated; otherwise no-op.
 *   2. If already migrated, no-op.
 *   3. If legacy is non-empty + new is empty → copy + clear legacy +
 *      mark done.
 *   4. If both are non-empty → don't clobber, just mark done.
 */

import { useAppStore } from '../src/store/userStore';
import { useGuruMessageStore } from '../src/store/guruMessageStore';
import { migrateLegacyGuruMessages } from '../src/lib/migrations/guruMessages';

// Helpers — build a minimal valid GuruMessage shape.
const msg = (id: string, role: 'user' | 'assistant' = 'user') => ({
  id, role, content: `m-${id}`, timestamp: new Date().toISOString(),
});

beforeEach(() => {
  // Reset both stores between tests. The persist middleware is a no-op
  // here because setup.ts mocks AsyncStorage; we just need clean state.
  useGuruMessageStore.getState().reset();
  useAppStore.getState().reset();
  // reset() leaves the new store with migrationCompleted=true (by
  // design — a freshly-reset user shouldn't see prior data migrated).
  // For these tests we want to exercise the migration so clear that.
  useGuruMessageStore.setState({ migrationCompleted: false, _hasHydrated: true });
  useAppStore.setState({ _hasHydrated: true });
});

describe('migrateLegacyGuruMessages', () => {
  it('no-ops when userStore is not hydrated', () => {
    useAppStore.setState({ _hasHydrated: false, guruMessages: [msg('a')] });
    expect(migrateLegacyGuruMessages()).toBe(false);
    expect(useGuruMessageStore.getState().messages).toEqual([]);
  });

  it('no-ops when guruMessageStore is not hydrated', () => {
    useGuruMessageStore.setState({ _hasHydrated: false });
    useAppStore.setState({ guruMessages: [msg('a')] });
    expect(migrateLegacyGuruMessages()).toBe(false);
    expect(useGuruMessageStore.getState().messages).toEqual([]);
  });

  it('no-ops when migration already completed', () => {
    useGuruMessageStore.setState({ migrationCompleted: true });
    useAppStore.setState({ guruMessages: [msg('a')] });
    expect(migrateLegacyGuruMessages()).toBe(false);
    // Legacy untouched — wasn't picked up.
    expect(useAppStore.getState().guruMessages).toHaveLength(1);
  });

  it('marks done with no copy when legacy is empty', () => {
    useAppStore.setState({ guruMessages: [] });
    expect(migrateLegacyGuruMessages()).toBe(false);
    expect(useGuruMessageStore.getState().migrationCompleted).toBe(true);
    expect(useGuruMessageStore.getState().messages).toEqual([]);
  });

  it('copies legacy → new + clears legacy + marks done', () => {
    const legacy = [msg('a'), msg('b'), msg('c', 'assistant')];
    useAppStore.setState({ guruMessages: legacy });
    expect(migrateLegacyGuruMessages()).toBe(true);
    expect(useGuruMessageStore.getState().messages).toHaveLength(3);
    expect(useGuruMessageStore.getState().messages[0]?.id).toBe('a');
    expect(useGuruMessageStore.getState().migrationCompleted).toBe(true);
    // Legacy field cleared so future userStore writes don't keep
    // serializing the (now duplicated) data.
    expect(useAppStore.getState().guruMessages).toEqual([]);
  });

  it('merges legacy + session messages when both have content', () => {
    // Simulates the race: user opened Guru and typed a message before
    // the post-hydration migration effect fired. The new store has
    // a fresh session message; the legacy has prior-session history.
    // Both should survive — legacy first (chronological), then session.
    useAppStore.setState({ guruMessages: [msg('a'), msg('b')] });
    useGuruMessageStore.getState().addMessage(msg('z', 'assistant'));
    expect(migrateLegacyGuruMessages()).toBe(true);
    const final = useGuruMessageStore.getState().messages;
    expect(final).toHaveLength(3);
    expect(final.map(m => m.id)).toEqual(['a', 'b', 'z']);
    expect(useGuruMessageStore.getState().migrationCompleted).toBe(true);
    // Legacy field cleared post-merge so we don't double-count next time.
    expect(useAppStore.getState().guruMessages).toEqual([]);
  });

  it('dedups on id when merging (defensive against duplicate IDs)', () => {
    useAppStore.setState({ guruMessages: [msg('a'), msg('b')] });
    // Same id 'b' already in the new store — dedup should drop one.
    useGuruMessageStore.getState().addMessage(msg('b'));
    expect(migrateLegacyGuruMessages()).toBe(true);
    expect(useGuruMessageStore.getState().messages).toHaveLength(2);
    expect(useGuruMessageStore.getState().messages.map(m => m.id)).toEqual(['a', 'b']);
  });

  it('subsequent calls are idempotent', () => {
    useAppStore.setState({ guruMessages: [msg('a'), msg('b')] });
    expect(migrateLegacyGuruMessages()).toBe(true);
    // Second call sees migrationCompleted=true and bails immediately.
    expect(migrateLegacyGuruMessages()).toBe(false);
    expect(useGuruMessageStore.getState().messages).toHaveLength(2);
  });
});
