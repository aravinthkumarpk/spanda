/**
 * Pure, client-safe terminal-state check. Lives in its own module (no backend
 * imports) so client components — e.g. the Projects rollup — can filter out
 * done work without pulling server-only code into the browser bundle.
 *
 * The three terminal lifecycle states match the backend's derived `closed`
 * status; `terminal-manager-workflow.ts` re-exports this as the single source.
 */
export function isTerminalBeatState(
  state: string | undefined,
): boolean {
  if (!state) return false;
  return (
    state === "closed" ||
    state === "shipped" ||
    state === "abandoned"
  );
}
