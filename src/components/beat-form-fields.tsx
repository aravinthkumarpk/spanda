"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/form-field";
import { builtinProfileDescriptor } from "@/lib/workflows";
import { validNextStates, formatStateName } from "@/components/beat-detail";
import type { MemoryWorkflowDescriptor } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyForm = {
  watch: (name: string) => any;
  setValue: (name: string, value: any) => void;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * The four spanda task types (CONTEXT.md). The task type IS the beads
 * `profileId` (ADR-0003) — Do runs the full agent lifecycle; the other three
 * move by hand / the decide pack. These are the ONLY types the add-task form
 * offers; legacy profiles (autopilot, semiauto, …) are hidden.
 */
export const SPANDA_TASK_TYPES = [
  { profileId: "do", label: "Do" },
  { profileId: "decide", label: "Decide" },
  { profileId: "coordinate", label: "Coordinate" },
  { profileId: "followup", label: "Follow-up" },
] as const;

/** The spanda task types that actually exist in the backend's profile list. */
export function spandaTaskTypeOptions(
  workflows: MemoryWorkflowDescriptor[],
): { profileId: string; label: string }[] {
  const available = new Set(workflows.map((w) => w.id));
  return SPANDA_TASK_TYPES.filter((t) => available.has(t.profileId));
}

/** A4 — "Task type" selector, bound to `profileId`. */
export function TaskTypeField({
  form,
  options,
}: {
  form: AnyForm;
  options: { profileId: string; label: string }[];
}) {
  return (
    <FormField label="Task type">
      <Select
        value={form.watch("profileId") ?? form.watch("workflowId")}
        onValueChange={(v) => {
          form.setValue("profileId", v);
          form.setValue("workflowId", undefined);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a task type" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.profileId} value={o.profileId}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}

/**
 * A7 — edit-task Status field. Offers the current state plus the loom-derived
 * valid next transitions (never a hardcoded state list; CLAUDE.md). Writes the
 * chosen state into the form, which PATCHes it via /api/beats/[id].
 */
export function StatusField({
  form,
  profileId,
  currentState,
}: {
  form: AnyForm;
  profileId?: string;
  currentState: string;
}) {
  const descriptor = builtinProfileDescriptor(profileId);
  const options = [
    currentState,
    ...validNextStates(currentState, descriptor),
  ];
  return (
    <FormField label="Status">
      <Select
        value={form.watch("state") ?? currentState}
        onValueChange={(v) => form.setValue("state", v)}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((s) => (
            <SelectItem key={s} value={s}>
              {formatStateName(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}
