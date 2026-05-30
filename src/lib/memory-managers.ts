/**
 * Known memory manager implementations supported by Foolery.
 *
 * This file is intentionally runtime-agnostic (no node:fs imports) so it can
 * be used by both server and client code.
 */

export type MemoryManagerType = "beads" | "knots";

export interface MemoryManagerImplementation {
  type: MemoryManagerType;
  label: string;
  markerDirectory: string;
  /** Lower number = higher priority when multiple managers are detected. */
  precedence: number;
}

const KNOWN_MEMORY_MANAGERS: ReadonlyArray<MemoryManagerImplementation> = Object.freeze([
  {
    type: "knots",
    label: "Knots",
    markerDirectory: ".knots",
    precedence: 0,
  },
  {
    type: "beads",
    label: "Beads",
    markerDirectory: ".beads",
    precedence: 1,
  },
]);

const KNOWN_MEMORY_MANAGER_BY_TYPE = new Map<MemoryManagerType, MemoryManagerImplementation>(
  KNOWN_MEMORY_MANAGERS.map((memoryManager) => [memoryManager.type, memoryManager]),
);

/**
 * Beads-only mode: when FOOLERY_DISABLE_KNOTS is set, knots is removed from the
 * supported managers so the browser, marker detection, and the backend router
 * never see or pick knots. Lets a beads-only install ignore a stray `.knots/`
 * cache entirely. The knots backend code stays in the tree for installs that
 * use it. (Server-only env; client code defaults to the full list, which it
 * only uses for labels.)
 */
function knotsDisabled(): boolean {
  const flag = process.env.FOOLERY_DISABLE_KNOTS;
  return flag === "1" || flag === "true";
}

export function listKnownMemoryManagers(): ReadonlyArray<MemoryManagerImplementation> {
  if (knotsDisabled()) {
    return KNOWN_MEMORY_MANAGERS.filter(
      (memoryManager) => memoryManager.type !== "knots",
    );
  }
  return KNOWN_MEMORY_MANAGERS;
}

export function isKnownMemoryManagerType(value: string | undefined): value is MemoryManagerType {
  if (!value) return false;
  return KNOWN_MEMORY_MANAGER_BY_TYPE.has(value as MemoryManagerType);
}

export function getMemoryManagerLabel(type: string | undefined): string {
  if (!isKnownMemoryManagerType(type)) return "Unknown";
  return KNOWN_MEMORY_MANAGER_BY_TYPE.get(type)!.label;
}

export function getKnownMemoryManagerMarkers(): string[] {
  return listKnownMemoryManagers().map(
    (memoryManager) => memoryManager.markerDirectory,
  );
}
