/**
 * B4 (ADR-0003) — the per-initiative status page renders the live state, the
 * agent-written "what's done" (metadata.status), a pending question, and the
 * child-task breakdown. It is a pure view; these render tests pin the surface.
 */

import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StatusPage } from "@/components/status-page";
import type { Beat } from "@/lib/types";

function makeBeat(overrides: Partial<Beat> = {}): Beat {
  return {
    id: "init.1",
    title: "Ship the widget",
    type: "work",
    state: "implementation",
    profileId: "semiauto",
    priority: 2,
    labels: [],
    created: "2026-05-01T00:00:00.000Z",
    updated: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

function render(props: Parameters<typeof StatusPage>[0]): string {
  return renderToStaticMarkup(createElement(StatusPage, props));
}

describe("StatusPage", () => {
  it("renders the initiative title and live state", () => {
    const html = render({ initiative: makeBeat() });
    expect(html).toContain("Ship the widget");
    // "implementation" → BeatStateBadge formats to "Impl" (abbreviation).
    expect(html).toContain("Impl");
  });

  it("renders the agent-written 'what's done' from metadata.status", () => {
    const html = render({
      initiative: makeBeat({ metadata: { status: "Task 1 of 3 merged" } }),
    });
    expect(html).toContain("What&#x27;s done");
    expect(html).toContain("Task 1 of 3 merged");
  });

  it("shows the empty state when no status has been written yet", () => {
    const html = render({ initiative: makeBeat() });
    expect(html).toContain("No status yet");
  });

  it("surfaces a pending question that needs the human", () => {
    const html = render({
      initiative: makeBeat({
        requiresHumanAction: true,
        metadata: { question: "Use Postgres or SQLite?" },
      }),
    });
    expect(html).toContain("Open question");
    expect(html).toContain("Use Postgres or SQLite?");
    expect(html).toContain("Needs you");
  });

  it("renders child tasks with their states", () => {
    const html = render({
      initiative: makeBeat(),
      tasks: [
        makeBeat({ id: "t1", title: "Build API", state: "shipped" }),
        makeBeat({ id: "t2", title: "Write tests", state: "ready_for_implementation" }),
      ],
    });
    expect(html).toContain("Tasks (2)");
    expect(html).toContain("Build API");
    expect(html).toContain("Write tests");
  });

  it("renders the plan when metadata.plan is present", () => {
    const html = render({
      initiative: makeBeat({ metadata: { plan: "1. API\n2. UI\n3. tests" } }),
    });
    expect(html).toContain("Plan");
    expect(html).toContain("1. API");
  });

  it("shows Approve/Reject when at a gate with a decision handler (D6)", () => {
    const html = render({
      initiative: makeBeat({
        profileId: "do",
        state: "ready_for_plan_review",
        requiresHumanAction: true,
      }),
      onGateDecision: () => {},
    });
    expect(html).toContain("Your decision");
    expect(html).toContain("Approve");
    expect(html).toContain("Reject");
  });

  it("hides the gate controls when no decision handler is wired", () => {
    const html = render({
      initiative: makeBeat({
        profileId: "do",
        state: "ready_for_plan_review",
        requiresHumanAction: true,
      }),
    });
    expect(html).not.toContain("Your decision");
  });
});
