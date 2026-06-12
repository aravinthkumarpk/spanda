import type { RunRecord } from "./types";

export interface IngestResult {
  /** The store after applying incoming records, keyed by sessionId. */
  store: Map<string, RunRecord>;
  /** Records that actually changed (new session, or new sourceHash). */
  changed: RunRecord[];
}

/**
 * Idempotent ingest. Re-running the feeder on unchanged transcripts must be a
 * no-op: a session is rewritten only when its sourceHash differs from what is
 * already stored. This is the second CRITICAL behaviour from the 5wo.2 eng
 * review. A feeder crash and restart, or a double cron fire, must never
 * duplicate runs in the feed.
 */
export function ingestSessions(
  existing: ReadonlyMap<string, RunRecord>,
  incoming: readonly RunRecord[],
): IngestResult {
  const store = new Map(existing);
  const changed: RunRecord[] = [];

  for (const record of incoming) {
    const prev = store.get(record.sessionId);
    if (prev && prev.sourceHash === record.sourceHash) {
      continue; // unchanged: idempotent skip
    }
    store.set(record.sessionId, record);
    changed.push(record);
  }

  return { store, changed };
}
