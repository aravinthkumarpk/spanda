import type {
  ActionOwnerKind,
  MemoryWorkflowDescriptor,
  MemoryWorkflowOwners,
  WorkflowMode,
} from "@/lib/types";

export const WF_STATE_LABEL_PREFIX = "wf:state:";
export const WF_PROFILE_LABEL_PREFIX = "wf:profile:";

// Spanda adds 4 user-facing profiles (do / coordinate / followup / decide)
// ALONGSIDE the upstream Foolery profiles, routed via work:* labels.
//
// DEFAULT_PROFILE_ID stays "autopilot" (the upstream default) so the
// 63 upstream-coupled tests and any consumer that hardcodes this id
// stay stable. The spanda fallback when a bead has no work:* label is
// still "autopilot" (a sensible IC lifecycle). Beads with an explicit
// work:do / work:coordinate / work:followup / work:decide label route
// to the spanda profile via the label-routing layer (#1, T17-T18).
export const DEFAULT_PROFILE_ID = "autopilot";
export const LEGACY_BEADS_COARSE_WORKFLOW_ID = "beads-coarse";
export const DEFAULT_WORKFLOW_ID = DEFAULT_PROFILE_ID;
export const DEFAULT_PROMPT_PROFILE_ID = DEFAULT_PROFILE_ID;

// Knots descriptor ids — preserved as upstream Foolery (autopilot /
// semiauto) under the augment-not-replace strategy. The knots backend
// resolves to these by id; renaming would break the knots-side wiring.
export const KNOTS_GRANULAR_DESCRIPTOR_ID = "autopilot";
export const KNOTS_COARSE_DESCRIPTOR_ID = "semiauto";
export const KNOTS_GRANULAR_PROMPT_PROFILE_ID = "autopilot";
export const KNOTS_COARSE_PROMPT_PROFILE_ID = "semiauto";

// ── Step abstraction ────────────────────────────────────────────

export const WorkflowStep = {
  Planning: "planning",
  PlanReview: "plan_review",
  Implementation: "implementation",
  ImplementationReview: "implementation_review",
  Shipment: "shipment",
  ShipmentReview: "shipment_review",
} as const;

export type WorkflowStep = (typeof WorkflowStep)[keyof typeof WorkflowStep];

export const StepPhase = {
  Queued: "queued",
  Active: "active",
} as const;

export type StepPhase = (typeof StepPhase)[keyof typeof StepPhase];

export interface ResolvedStep {
  /** Action-state name. The key used for dispatch pool lookup. */
  step: string;
  phase: StepPhase;
}

export {
  resolveStep,
  queueStateForStep,
  nextQueueStateForStep,
  priorQueueStateForStep,
  isReviewStep,
  priorActionStep,
  deriveWorkflowStructure,
} from "@/lib/workflow-step-nav";

import {
  deriveWorkflowStructure,
} from "@/lib/workflow-step-nav";

interface BuiltinProfileConfig {
  id: string;
  displayName: string;
  description: string;
  // SDLC lifecycle controls — used only when `customStates` is NOT set.
  // The `do` profile uses these (planningMode: "skipped" + review: "required"
  // gives the 5-state IC lifecycle that was autopilot_no_planning).
  planningMode: "required" | "skipped";
  implementationReviewMode: "required" | "skipped";
  // ADR-0004: insert an agent-owned `sign_off` state between `implementation`
  // and the human `implementation_review` gate. Scoped per-profile so the
  // shared SDLC graph stays unchanged for profiles that don't opt in.
  signOffMode?: "required" | "skipped";
  output: "remote_main" | "pr";
  owners: MemoryWorkflowOwners;
  // Spanda extensions — when `customStates` is set, the SDLC lifecycle
  // is bypassed entirely. Used by coord / followup / decide profiles
  // that don't map to a software-shipment shape.
  customStates?: string[];
  customInitial?: string;
  customTerminal?: string[];
  customTransitions?: Array<{ from: string; to: string }>;
}

const AGENT_OWNERS: MemoryWorkflowOwners = {
  planning: "agent",
  plan_review: "agent",
  implementation: "agent",
  sign_off: "agent",
  implementation_review: "agent",
  shipment: "agent",
  shipment_review: "agent",
};

// Human-only owners for the coord / followup / decide profiles.
// Even though these profiles don't traverse SDLC steps, owners is
// a required field on MemoryWorkflowOwners — fill it human throughout
// so any code that asks "who owns step X" gets a sane answer.
const HUMAN_OWNERS: MemoryWorkflowOwners = {
  planning: "human",
  plan_review: "human",
  implementation: "human",
  sign_off: "human",
  implementation_review: "human",
  shipment: "human",
  shipment_review: "human",
};

const SEMIAUTO_OWNERS: MemoryWorkflowOwners = {
  planning: "agent",
  plan_review: "human",
  implementation: "agent",
  sign_off: "agent",
  implementation_review: "human",
  shipment: "agent",
  shipment_review: "agent",
};

// Augment-not-replace strategy: spanda adds the 4 new profiles
// (do / coordinate / followup / decide) ALONGSIDE the 6 upstream
// Foolery profiles (autopilot, autopilot_with_pr, semiauto,
// autopilot_no_planning, autopilot_with_pr_no_planning,
// semiauto_no_planning).
//
// Why both: the upstream profiles are referenced by ~63 hardcoded
// tests + the knots descriptor lookups. Removing them shifts the
// fork tax from "tiny catalog addition" to "deep test churn", and
// makes every upstream rebase a hostile merge.
//
// The UI surfaces only the 4 spanda profiles via the settings UI
// filter (see settings-pools-target-editor); the legacy ones stay
// in the catalog as compat scaffolding. `normalizeProfileId`
// preserves legacy ids round-trip so callers that already say
// "autopilot" still resolve to a real descriptor (autopilot itself,
// not a rebind to "do") — this keeps the upstream tests stable.
const BUILTIN_PROFILE_CATALOG: ReadonlyArray<BuiltinProfileConfig> = [
  // ===== Spanda profiles FIRST (surface order in the settings UI) =====
  // do — the canonical human-gated Do lifecycle (ADR-0004). Planning + an
  // agent sign_off step + two human gates (plan_review, implementation_review)
  // via SEMIAUTO_OWNERS. NOT the old autonomous autopilot_no_planning shape —
  // that lifecycle still lives at the `autopilot_no_planning` profile.
  // Open → Plan → Plan review → Execution → Sign-off → Execution review → Done.
  {
    id: "do",
    displayName: "Do",
    description: "Agent-executed work with two human gates (plan + execution review)",
    planningMode: "required",
    implementationReviewMode: "required",
    signOffMode: "required",
    output: "remote_main",
    owners: SEMIAUTO_OWNERS,
  },
  // coordinate — meetings, calls, alignment with named people.
  // Required label at create time: with:<person> (enforced in bd-lint).
  {
    id: "coordinate",
    displayName: "Coordinate",
    description: "Meetings, calls, alignment with named people",
    planningMode: "skipped",
    implementationReviewMode: "skipped",
    output: "remote_main",
    owners: HUMAN_OWNERS,
    customStates: ["scheduled", "done", "cancelled"],
    customInitial: "scheduled",
    customTerminal: ["done", "cancelled"],
    customTransitions: [
      { from: "scheduled", to: "done" },
      { from: "scheduled", to: "cancelled" },
    ],
  },
  // followup — chasing someone external. Required label: chasing:<person>.
  {
    id: "followup",
    displayName: "Follow-up",
    description: "Chasing someone external for an outcome",
    planningMode: "skipped",
    implementationReviewMode: "skipped",
    output: "remote_main",
    owners: HUMAN_OWNERS,
    customStates: ["waiting", "nudged", "escalated", "done", "closed"],
    customInitial: "waiting",
    customTerminal: ["done", "closed"],
    customTransitions: [
      { from: "waiting", to: "nudged" },
      { from: "waiting", to: "done" },
      { from: "nudged", to: "escalated" },
      { from: "nudged", to: "done" },
      { from: "escalated", to: "done" },
      { from: "escalated", to: "closed" },
    ],
  },
  // decide — a decision you need to make. `waiting` is the parking-lot
  // state for captured-but-not-actively-deciding items.
  {
    id: "decide",
    displayName: "Decide",
    description: "A choice you need to make",
    planningMode: "skipped",
    implementationReviewMode: "skipped",
    output: "remote_main",
    owners: HUMAN_OWNERS,
    customStates: ["waiting", "deciding", "decided", "executed", "dropped"],
    customInitial: "waiting",
    customTerminal: ["executed", "dropped"],
    customTransitions: [
      { from: "waiting", to: "deciding" },
      { from: "deciding", to: "decided" },
      { from: "decided", to: "executed" },
      { from: "decided", to: "dropped" },
    ],
  },

  // ===== Upstream Foolery profiles (preserved for backwards-compat) =====
  {
    id: "autopilot",
    displayName: "Autopilot",
    description: "Agent-owned full flow with remote main output",
    planningMode: "required",
    implementationReviewMode: "required",
    output: "remote_main",
    owners: AGENT_OWNERS,
  },
  {
    id: "autopilot_with_pr",
    displayName: "Autopilot (PR)",
    description: "Agent-owned full flow with PR output",
    planningMode: "required",
    implementationReviewMode: "required",
    output: "pr",
    owners: AGENT_OWNERS,
  },
  {
    id: "semiauto",
    displayName: "Semiauto",
    description: "Human-gated plan and implementation reviews",
    planningMode: "required",
    implementationReviewMode: "required",
    output: "remote_main",
    owners: SEMIAUTO_OWNERS,
  },
  {
    id: "autopilot_no_planning",
    displayName: "Autopilot (no planning)",
    description: "Agent-owned flow starting at implementation",
    planningMode: "skipped",
    implementationReviewMode: "required",
    output: "remote_main",
    owners: AGENT_OWNERS,
  },
  {
    id: "autopilot_with_pr_no_planning",
    displayName: "Autopilot (PR, no planning)",
    description: "Agent-owned flow with PR output and no planning",
    planningMode: "skipped",
    implementationReviewMode: "required",
    output: "pr",
    owners: AGENT_OWNERS,
  },
  {
    id: "semiauto_no_planning",
    displayName: "Semiauto (no planning)",
    description: "Human-gated implementation review with skipped planning",
    planningMode: "skipped",
    implementationReviewMode: "required",
    output: "remote_main",
    owners: SEMIAUTO_OWNERS,
  },

];

export function normalizeProfileId(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;

  // Spanda profile ids — round-trip as-is.
  if (normalized === "do") return "do";
  if (normalized === "coordinate") return "coordinate";
  if (normalized === "followup") return "followup";
  if (normalized === "decide") return "decide";

  // Upstream Foolery profiles round-trip to themselves (they exist in the
  // catalog under the augment-not-replace strategy; preserving their ids
  // keeps 63 hardcoded tests stable).
  if (normalized === "autopilot") return "autopilot";
  if (normalized === "autopilot_no_planning") return "autopilot_no_planning";
  if (normalized === "autopilot_with_pr") return "autopilot_with_pr";
  if (normalized === "autopilot_with_pr_no_planning") return "autopilot_with_pr_no_planning";
  if (normalized === "semiauto") return "semiauto";
  if (normalized === "semiauto_no_planning") return "semiauto_no_planning";

  // Other historical / external ids — map to the legacy default
  // (autopilot, the upstream default) for compat. New beads default to
  // DEFAULT_PROFILE_ID ("do") via the missing-label fallback path.
  if (normalized === LEGACY_BEADS_COARSE_WORKFLOW_ID) return "autopilot";
  if (normalized === "beads-coarse-human-gated") return "semiauto";
  if (normalized === "automatic") return "autopilot";
  if (normalized === "workflow") return "semiauto";
  if (normalized === "knots-granular" || normalized === "knots-granular-autonomous") {
    return "autopilot";
  }
  if (normalized === "knots-coarse" || normalized === "knots-coarse-human-gated") {
    return "semiauto";
  }

  return normalized;
}

function canonicalTransitions(): Array<{ from: string; to: string }> {
  return [
    { from: "ready_for_planning", to: "planning" },
    { from: "planning", to: "ready_for_plan_review" },
    { from: "ready_for_plan_review", to: "plan_review" },
    { from: "plan_review", to: "ready_for_implementation" },
    { from: "plan_review", to: "ready_for_planning" },
    { from: "ready_for_implementation", to: "implementation" },
    { from: "implementation", to: "ready_for_implementation_review" },
    // ADR-0004 sign_off edges — only survive filtering when `sign_off` is in
    // the profile's state set (signOffMode required); inert otherwise.
    { from: "implementation", to: "sign_off" },
    { from: "sign_off", to: "ready_for_implementation_review" },
    { from: "ready_for_implementation_review", to: "implementation_review" },
    { from: "implementation_review", to: "ready_for_shipment" },
    { from: "implementation_review", to: "ready_for_implementation" },
    { from: "ready_for_shipment", to: "shipment" },
    { from: "shipment", to: "ready_for_shipment_review" },
    { from: "ready_for_shipment_review", to: "shipment_review" },
    { from: "shipment_review", to: "shipped" },
    { from: "shipment_review", to: "ready_for_implementation" },
    { from: "shipment_review", to: "ready_for_shipment" },
    { from: "*", to: "deferred" },
    { from: "*", to: "abandoned" },
  ];
}

function buildStates(config: BuiltinProfileConfig): string[] {
  // Spanda extension: a profile may provide a custom state list that bypasses
  // the SDLC lifecycle entirely (coord / followup / decide).
  if (config.customStates) {
    return [...config.customStates];
  }

  let states = [
    "ready_for_planning",
    "planning",
    "ready_for_plan_review",
    "plan_review",
    "ready_for_implementation",
    "implementation",
    "ready_for_implementation_review",
    "implementation_review",
    "ready_for_shipment",
    "shipment",
    "ready_for_shipment_review",
    "shipment_review",
    "shipped",
    "deferred",
    "abandoned",
  ];

  if (config.planningMode === "skipped") {
    states = states.filter(
      (state) => !["ready_for_planning", "planning", "ready_for_plan_review", "plan_review"].includes(state),
    );
  }

  if (config.implementationReviewMode === "skipped") {
    states = states.filter(
      (state) => !["ready_for_implementation_review", "implementation_review"].includes(state),
    );
  }

  // ADR-0004: splice the agent `sign_off` state in right after `implementation`.
  if (config.signOffMode === "required") {
    const idx = states.indexOf("implementation");
    if (idx !== -1) {
      states = [...states.slice(0, idx + 1), "sign_off", ...states.slice(idx + 1)];
    }
  }

  return states;
}

function filterTransitionsForStates(
  states: string[],
  config: BuiltinProfileConfig,
): Array<{ from: string; to: string }> {
  // Spanda extension: when a custom state list is provided, use the
  // catalog's explicit customTransitions rather than the SDLC canonical
  // graph.
  if (config.customStates) {
    return [...(config.customTransitions ?? [])];
  }

  const stateSet = new Set(states);
  let transitions = canonicalTransitions().filter((transition) =>
    (transition.from === "*" || stateSet.has(transition.from)) && stateSet.has(transition.to),
  );

  // ADR-0004: when sign_off is present, route implementation THROUGH it —
  // drop the direct implementation -> ready_for_implementation_review edge so
  // the agent's sign-off can't be skipped.
  if (stateSet.has("sign_off")) {
    transitions = transitions.filter(
      (t) => !(t.from === "implementation" && t.to === "ready_for_implementation_review"),
    );
  }

  if (config.planningMode !== "required") {
    transitions.push({ from: "ready_for_planning", to: "ready_for_implementation" });
  }

  if (config.implementationReviewMode !== "required") {
    transitions.push({ from: "implementation", to: "ready_for_shipment" });
  }

  return transitions
    .sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to))
    .filter((transition, index, all) => {
      if (index === 0) return true;
      const previous = all[index - 1];
      return previous.from !== transition.from || previous.to !== transition.to;
    });
}

function stepOwnerKind(
  owners: MemoryWorkflowOwners,
  step: string,
): ActionOwnerKind {
  return owners[step] ?? "agent";
}

function modeForOwners(owners: MemoryWorkflowOwners): WorkflowMode {
  const hasHuman = Object.values(owners).some((ownerKind) => ownerKind === "human");
  return hasHuman ? "coarse_human_gated" : "granular_autonomous";
}

function descriptorFromProfileConfig(
  config: BuiltinProfileConfig,
  options?: { labelPrefix?: string },
): MemoryWorkflowDescriptor {
  const states = buildStates(config);
  const transitions = filterTransitionsForStates(states, config);
  // Spanda extension: custom-state profiles declare their own terminal set
  // (e.g. coord = [done, cancelled], decide = [executed, dropped]).
  // Default: the SDLC pair [shipped, abandoned].
  const terminalStates = config.customTerminal
    ? [...config.customTerminal]
    : ["shipped", "abandoned"];
  const { queueStates, actionStates, queueActions } = deriveWorkflowStructure({
    states,
    transitions,
    owners: config.owners,
    terminalStates,
  });
  const reviewQueueStates = queueStates.filter((q) => {
    const action = queueActions[q];
    return action ? action.endsWith("_review") : false;
  });
  const mode = modeForOwners(config.owners);
  const humanQueueStates = queueStates.filter((q) => {
    const action = queueActions[q];
    return action ? stepOwnerKind(config.owners, action) === "human" : false;
  });
  // Spanda extension: a custom-state profile names its own initial state.
  const initialState = config.customInitial
    ? config.customInitial
    : config.planningMode === "skipped"
      ? "ready_for_implementation"
      : "ready_for_planning";
  return {
    id: config.id,
    profileId: config.id,
    backingWorkflowId: config.id,
    label: options?.labelPrefix
      ? `${options.labelPrefix} (${config.id})`
      : config.displayName,
    mode,
    initialState,
    states,
    terminalStates,
    transitions,
    finalCutState: humanQueueStates[0] ?? null,
    retakeState: states.includes("ready_for_implementation") ? "ready_for_implementation" : initialState,
    promptProfileId: config.id,
    owners: config.owners,
    queueStates,
    actionStates,
    queueActions,
    reviewQueueStates,
    humanQueueStates,
  };
}

const BUILTIN_WORKFLOWS = BUILTIN_PROFILE_CATALOG.map((config) =>
  descriptorFromProfileConfig(config),
);

const BUILTIN_WORKFLOWS_BY_ID = new Map<string, MemoryWorkflowDescriptor>(
  BUILTIN_WORKFLOWS.map((workflow) => [workflow.id, workflow]),
);

function cloneWorkflowDescriptor(
  workflow: MemoryWorkflowDescriptor,
): MemoryWorkflowDescriptor {
  return {
    ...workflow,
    states: [...workflow.states],
    terminalStates: [...workflow.terminalStates],
    transitions: workflow.transitions
      ? workflow.transitions.map((t) => ({ ...t }))
      : undefined,
    owners: workflow.owners ? { ...workflow.owners } : undefined,
    stateOwners: workflow.stateOwners
      ? { ...workflow.stateOwners }
      : undefined,
    queueStates: workflow.queueStates ? [...workflow.queueStates] : undefined,
    actionStates: workflow.actionStates ? [...workflow.actionStates] : undefined,
    queueActions: workflow.queueActions
      ? { ...workflow.queueActions }
      : undefined,
    reviewQueueStates: workflow.reviewQueueStates ? [...workflow.reviewQueueStates] : undefined,
    humanQueueStates: workflow.humanQueueStates ? [...workflow.humanQueueStates] : undefined,
  };
}

export function builtinWorkflowDescriptors(): MemoryWorkflowDescriptor[] {
  return BUILTIN_WORKFLOWS.map(cloneWorkflowDescriptor);
}

export function builtinProfileDescriptor(profileId?: string | null): MemoryWorkflowDescriptor {
  const normalized = normalizeProfileId(profileId) ?? DEFAULT_PROFILE_ID;
  const descriptor = BUILTIN_WORKFLOWS_BY_ID.get(normalized)
    ?? BUILTIN_WORKFLOWS_BY_ID.get(DEFAULT_PROFILE_ID)!;
  return cloneWorkflowDescriptor(descriptor);
}

export function defaultWorkflowDescriptor(): MemoryWorkflowDescriptor {
  return builtinProfileDescriptor(DEFAULT_PROFILE_ID);
}

export function isWorkflowStateLabel(label: string): boolean {
  return label.startsWith(WF_STATE_LABEL_PREFIX);
}

export function isWorkflowProfileLabel(label: string): boolean {
  return label.startsWith(WF_PROFILE_LABEL_PREFIX);
}

export function extractWorkflowStateLabel(labels: string[]): string | null {
  for (const label of labels) {
    if (!isWorkflowStateLabel(label)) continue;
    const raw = label.slice(WF_STATE_LABEL_PREFIX.length);
    const state = raw.trim().toLowerCase() || null;
    if (state) return state;
  }
  return null;
}

export function extractWorkflowProfileLabel(labels: string[]): string | null {
  for (const label of labels) {
    if (!isWorkflowProfileLabel(label)) continue;
    const profileId = normalizeProfileId(label.slice(WF_PROFILE_LABEL_PREFIX.length));
    if (profileId) return profileId;
  }
  return null;
}

export function withWorkflowStateLabel(labels: string[], workflowState: string): string[] {
  const next = labels.filter((label) => !isWorkflowStateLabel(label));
  const trimmed = workflowState?.trim().toLowerCase();
  const normalizedState = trimmed || "open";
  next.push(`${WF_STATE_LABEL_PREFIX}${normalizedState}`);
  return Array.from(new Set(next));
}

export function withWorkflowProfileLabel(labels: string[], profileId: string): string[] {
  const next = labels.filter((label) => !isWorkflowProfileLabel(label));
  const normalizedProfileId = normalizeProfileId(profileId) ?? DEFAULT_PROFILE_ID;
  next.push(`${WF_PROFILE_LABEL_PREFIX}${normalizedProfileId}`);
  return Array.from(new Set(next));
}

// ── Re-exports from workflows-runtime.ts ─────────────────────

export type {
  WorkflowRuntimeState,
  WorkflowStatePhase,
} from "@/lib/workflows-runtime";

export {
  PROFILE_DESCRIPTIONS,
  profileDisplayName,
  normalizeStateForWorkflow,
  deriveProfileId,
  deriveWorkflowState,
  deriveWorkflowRuntimeState,
  workflowStatePhase,
  workflowOwnerKindForState,
  workflowActionStateForState,
  workflowQueueStateForState,
  inferWorkflowMode,
  inferFinalCutState,
  inferRetakeState,
  workflowDescriptorById,
  beatRequiresHumanAction,
  beatInFinalCut,
  beatInRetake,
  isQueueOrTerminal,
  compareWorkflowStatePriority,
  isRollbackTransition,
  forwardTransitionTarget,
} from "@/lib/workflows-runtime";

// ── Deprecated aliases (use backend-agnostic names above) ──
/** @deprecated Use DEFAULT_PROFILE_ID */
export const DEFAULT_BEADS_PROFILE_ID = DEFAULT_PROFILE_ID;
/** @deprecated Use DEFAULT_WORKFLOW_ID */
export const BEADS_COARSE_WORKFLOW_ID = DEFAULT_WORKFLOW_ID;
/** @deprecated Use DEFAULT_PROMPT_PROFILE_ID */
export const BEADS_COARSE_PROMPT_PROFILE_ID =
  DEFAULT_PROMPT_PROFILE_ID;
/** @deprecated Use builtinWorkflowDescriptors */
export const beadsProfileWorkflowDescriptors =
  builtinWorkflowDescriptors;
/** @deprecated Use builtinProfileDescriptor */
export const beadsProfileDescriptor = builtinProfileDescriptor;
/** @deprecated Use defaultWorkflowDescriptor */
export const beadsCoarseWorkflowDescriptor =
  defaultWorkflowDescriptor;
