import { describe, expect, it } from "vitest";
import { hideStaleCompleted } from "@/lib/active-filter";
import type { Beat, MemoryWorkflowDescriptor } from "@/lib/types";

const NOW = Date.parse("2026-05-30T00:00:00Z");
const daysAgo = (n: number) =>
  new Date(NOW - n * 86_400_000).toISOString();

function makeBeat(overrides: Partial<Beat> = {}): Beat {
  return {
    id: "b",
    title: "t",
    type: "task",
    state: "shipped",
    priority: 2,
    labels: [],
    created: daysAgo(60),
    updated: daysAgo(60),
    ...overrides,
  };
}

const descriptor = {
  terminalStates: ["shipped", "abandoned", "closed", "done"],
} as unknown as MemoryWorkflowDescriptor;
const resolve = () => descriptor;

describe("hideStaleCompleted", () => {
  it("hides a terminal beat completed more than 7 days ago", () => {
    const beats = [makeBeat({ id: "old", closed: daysAgo(8) })];
    expect(hideStaleCompleted(beats, NOW, resolve).map((b) => b.id)).toEqual([]);
  });

  it("keeps a terminal beat completed within 7 days", () => {
    const beats = [makeBeat({ id: "recent", closed: daysAgo(3) })];
    expect(hideStaleCompleted(beats, NOW, resolve).map((b) => b.id)).toEqual([
      "recent",
    ]);
  });

  it("boundary: exactly 7 days is still shown (<=)", () => {
    const beats = [makeBeat({ id: "edge", closed: daysAgo(7) })];
    expect(hideStaleCompleted(beats, NOW, resolve).map((b) => b.id)).toEqual([
      "edge",
    ]);
  });

  it("never hides a non-terminal beat, however old", () => {
    const beats = [
      makeBeat({ id: "open", state: "ready_for_implementation", updated: daysAgo(99) }),
    ];
    expect(hideStaleCompleted(beats, NOW, resolve).map((b) => b.id)).toEqual([
      "open",
    ]);
  });

  it("uses updated when closed is absent", () => {
    const beats = [makeBeat({ id: "noclose", closed: undefined, updated: daysAgo(20) })];
    expect(hideStaleCompleted(beats, NOW, resolve)).toHaveLength(0);
  });

  it("fail-soft: keeps a terminal beat with an unparseable timestamp", () => {
    const beats = [makeBeat({ id: "bad", closed: "not-a-date", updated: "x" })];
    expect(hideStaleCompleted(beats, NOW, resolve).map((b) => b.id)).toEqual([
      "bad",
    ]);
  });

  it("a long-closed PARENT (project) is also hidden (terminal)", () => {
    const beats = [
      makeBeat({ id: "proj", type: "epic", state: "closed", closed: daysAgo(40) }),
      makeBeat({ id: "live", state: "implementation", updated: daysAgo(1) }),
    ];
    expect(hideStaleCompleted(beats, NOW, resolve).map((b) => b.id)).toEqual([
      "live",
    ]);
  });

  it("configurable window", () => {
    const beats = [makeBeat({ id: "x", closed: daysAgo(5) })];
    expect(hideStaleCompleted(beats, NOW, resolve, 3)).toHaveLength(0);
    expect(hideStaleCompleted(beats, NOW, resolve, 10)).toHaveLength(1);
  });
});
