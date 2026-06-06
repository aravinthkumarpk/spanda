/**
 * Pure, client-safe due-date status for the Projects view's due column.
 * `now` is injected (hermetic): unset -> muted "none", a due day before today
 * -> "overdue" (red), today-or-later -> "set". Label is a compact "Mon D".
 */
export type DueTone = "none" | "set" | "overdue";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function utcDay(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function dueState(
  due: string | undefined,
  nowMs: number,
): { tone: DueTone; label: string } {
  if (!due) return { tone: "none", label: "" };
  const t = Date.parse(due);
  if (Number.isNaN(t)) return { tone: "none", label: "" };
  const d = new Date(t);
  const label = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  return { tone: utcDay(t) < utcDay(nowMs) ? "overdue" : "set", label };
}
