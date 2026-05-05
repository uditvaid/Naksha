/**
 * Shared HTTP utility — kept in its own module so claude.ts, arcExtractor,
 * memoryExtractor, and dailySynthesis can all import it without creating
 * the require cycle Metro warns about. Previously this lived in claude.ts.
 */

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error('The reading took too long. Please check your connection and try again.');
    }
    throw new Error('Could not reach the reading service. Please check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }
}
