/**
 * One-shot migration: copy legacy Guru chat messages from `userStore`
 * (where they used to be co-located with chart + savedReadings) into
 * the new dedicated `guruMessageStore`.
 *
 * Why this matters
 * ----------------
 * Splitting the message list into its own AsyncStorage key fixes a real
 * write-hotspot — see the file comment in `guruMessageStore.ts`. But
 * existing TestFlight users have messages persisted under the old key,
 * and we don't want them to silently lose their Guru history on
 * upgrade. This runner handles the carry-over.
 *
 * Behaviour
 * ---------
 * - Idempotent: gated on `migrationCompleted` in the new store.
 * - Requires BOTH stores hydrated before running, so we don't race on
 *   AsyncStorage and either see ghost-empty states or double-write.
 * - Best-effort: if anything throws we log a breadcrumb and mark the
 *   migration done anyway — we'd rather drop a few messages than block
 *   the app indefinitely.
 */

import { useAppStore } from '@store/userStore';
import { useGuruMessageStore } from '@store/guruMessageStore';
import { addBreadcrumb, reportError } from '@services/telemetry';

/**
 * Try to migrate legacy Guru messages. Caller should invoke this
 * whenever EITHER store's hydration flag flips — the function
 * internally checks both and no-ops when either side isn't ready or
 * when the migration has already been performed.
 *
 * Returns `true` if the migration ran during this invocation, `false`
 * otherwise. Callers don't need to await — the writes are synchronous
 * Zustand state updates; persistence happens on the next tick.
 */
export function migrateLegacyGuruMessages(): boolean {
  const userStore = useAppStore.getState();
  const messageStore = useGuruMessageStore.getState();

  // Wait until both sides have read their persisted blobs. Otherwise
  // the legacy field could be its INITIAL empty value (no migration
  // attempted) or the new store could be its INITIAL empty value
  // (we'd overwrite real data with stale legacy data the next time
  // userStore hydrates and the runner re-fires).
  if (!userStore._hasHydrated || !messageStore._hasHydrated) {
    return false;
  }

  if (messageStore.migrationCompleted) {
    return false;
  }

  const legacy = userStore.guruMessages;
  // Empty source — nothing to copy, but still mark done so we don't
  // re-evaluate every focus event.
  if (!Array.isArray(legacy) || legacy.length === 0) {
    messageStore.markMigrationCompleted();
    return false;
  }

  // If the new store already has messages (e.g. the user opened Guru
  // and typed before the migration effect fired), MERGE rather than
  // skip. The earlier strategy was to bail on non-empty new — but on
  // the rare race where the user is fast enough to send a message
  // before the post-hydration effect runs, that silently dropped the
  // entire legacy transcript. Merging preserves both:
  //
  //   - Legacy session-history first (chronologically older)
  //   - Then anything typed in this session before migration fired
  //
  // The store's MESSAGE_CAP slice keeps the latest 50 if the merged
  // total overflows. Dedup on `id` defends against the theoretical
  // case where the same message is in both lists (e.g. a re-onboard
  // mid-session) — id is a random UUID per message so collisions are
  // not expected, but the dedup is cheap.
  // Capture session count (messages added before migration fired) up
  // front so we can include it in the breadcrumb after merging.
  const sessionCount = messageStore.messages.length;
  const seen = new Set<string>();
  const merged: typeof legacy = [];
  for (const m of [...legacy, ...messageStore.messages]) {
    if (m?.id && !seen.has(m.id)) {
      seen.add(m.id);
      merged.push(m);
    }
  }

  try {
    messageStore.setMessages(merged);
    // Clear the legacy field so subsequent userStore writes don't
    // continue to serialize the (now duplicated) data, and so a
    // future userStore version can drop the field entirely without
    // a data-loss footnote.
    userStore.clearGuruMessages();
    messageStore.markMigrationCompleted();
    addBreadcrumb('guruMessages migrated to dedicated store', 'lifecycle', {
      legacyCount: legacy.length,
      sessionCount,
      mergedTotal: merged.length,
    });
    return true;
  } catch (e) {
    reportError(e instanceof Error ? e : new Error(String(e)), {
      source: 'migrateLegacyGuruMessages',
    });
    // Still mark done — repeated failures would just block forever.
    messageStore.markMigrationCompleted();
    return false;
  }
}
