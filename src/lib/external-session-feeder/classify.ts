import type {
  FeederClock,
  FeederThresholds,
  ParsedSession,
  RunStatus,
} from "./types";

/**
 * Map a parsed session to a run status.
 *
 *                 silent >= doneMs ?
 *                      | yes
 *                      v
 *                   [ done ]
 *                      | no
 *                      v
 *            toolInFlight ?  ── yes ──> [ running ]   CRITICAL: a 5-minute build
 *                      | no                           is a tool in flight, never
 *                      v                               "blocked".
 *      end_turn AND silent >= staleMs ? ── yes ──> [ blocked ]   assistant finished
 *                      | no                                       its turn, waiting on
 *                      v                                          the human: the doorbell.
 *                  [ running ]
 *
 * The single rule that protects trust: `toolInFlight` short-circuits to
 * "running" before any silence-based "blocked" check. Without it the feeder
 * would ring the doorbell every time a legitimate long tool call runs, and the
 * user would learn to ignore it.
 */
export function classifyRunStatus(
  session: ParsedSession,
  thresholds: FeederThresholds,
  clock: FeederClock,
): RunStatus {
  const silentMs = clock.now - session.lastEventAtMs;

  if (silentMs >= thresholds.doneMs) return "done";

  // CRITICAL guard (5wo.2 eng review): a tool in flight is always running.
  if (session.toolInFlight) return "running";

  if (
    session.lastStopReason === "end_turn" &&
    silentMs >= thresholds.staleMs
  ) {
    return "blocked";
  }

  return "running";
}
