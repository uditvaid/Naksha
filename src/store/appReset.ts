/**
 * Lightweight reset registry, extracted from userStore to avoid circular
 * imports. Stores like dailyContinuityStore need to register an onAppReset
 * listener at module load, but they're also imported BY userStore — so
 * importing onAppReset from userStore creates a cycle (the export hasn't
 * been assigned yet when the inner store evaluates).
 *
 * Keeping the registry in this dependency-free file lets every store
 * register without triggering userStore's evaluation chain.
 */

type ResetListener = () => void;
const resetListeners: Set<ResetListener> = new Set();

export function onAppReset(listener: ResetListener): () => void {
  resetListeners.add(listener);
  return () => resetListeners.delete(listener);
}

export function fireAppReset(): void {
  // Snapshot to an array before iterating — protects against listeners
  // that mutate the Set during iteration (e.g., a reset action that
  // triggers another store's reset which unregisters itself).
  const snapshot = Array.from(resetListeners);
  for (const fn of snapshot) {
    try { fn(); } catch { /* swallow listener errors */ }
  }
}
