"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Beat } from "@/lib/types";
import type {
  QuickCaptureInput,
  QuickCaptureProfile,
} from "@/lib/quick-capture";
import {
  beatToQuickCaptureInput,
  diffQuickCaptureUpdate,
  validateQuickCaptureUpdate,
} from "@/lib/quick-capture-update";
import { profileForBucket } from "@/lib/bucket-profile";
import { updateBeat } from "@/lib/api";
import { invalidateBeatListQueries } from "@/lib/beat-query-cache";
import { repoPathForBeat } from "@/components/beat-table-mutations";

const QC_PROFILES: QuickCaptureProfile[] = [
  "do",
  "coordinate",
  "followup",
  "decide",
];

/** Derive the bucket-profile (do/coordinate/followup/decide) for a beat. */
function profileOf(beat: Beat): QuickCaptureProfile {
  const work = beat.labels.find((l) => l.toLowerCase().startsWith("work:"));
  if (work) {
    try {
      return profileForBucket(work) as QuickCaptureProfile;
    } catch {
      // Unhygienic/unknown bucket label (e.g. work:coord) — default for the
      // edit form; the user can re-pick. A UI default, not a config fallback.
    }
  }
  return "do";
}

/**
 * Shared Update form (A2). Pre-fills from an existing beat via the tested pure
 * layer, validates with the same rules as create, and submits a MINIMAL PATCH
 * (only changed fields + label add/remove) through updateBeat -> PATCH
 * /api/beats/:id (BackendPort). No second store; acceptance follows the shipped
 * description-embedded rule for consistency with quick-capture.
 */
export function UpdateBeatDialog({
  beat,
  open,
  onOpenChange,
  onUpdated,
}: {
  beat: Beat;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}) {
  const queryClient = useQueryClient();
  const original: QuickCaptureInput = useMemo(
    () => beatToQuickCaptureInput(beat, profileOf(beat)),
    [beat],
  );
  const [title, setTitle] = useState(original.title);
  const [description, setDescription] = useState(original.description);
  const [profile, setProfile] = useState<QuickCaptureProfile>(original.profile);
  const [person, setPerson] = useState(original.person ?? "");
  const [acceptance, setAcceptance] = useState(original.acceptance);
  const [errors, setErrors] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: () => {
      const edited: QuickCaptureInput = {
        title,
        description,
        profile,
        acceptance,
        person: person.trim() ? person.trim() : null,
      };
      const check = validateQuickCaptureUpdate(edited);
      if (!check.ok) {
        return Promise.reject(new Error(check.errors.join("\n")));
      }
      const patch = diffQuickCaptureUpdate(original, edited, beat.labels);
      if (Object.keys(patch).length === 0) {
        return Promise.reject(new Error("__NOCHANGE__"));
      }
      return updateBeat(beat.id, patch, repoPathForBeat(beat)).then((r) => {
        if (!r.ok) throw new Error(r.error ?? "Update failed");
      });
    },
    onSuccess: () => {
      toast.success("Task updated");
      void invalidateBeatListQueries(queryClient);
      onUpdated?.();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      if (err.message === "__NOCHANGE__") {
        toast.info("No changes to save");
        onOpenChange(false);
        return;
      }
      setErrors(err.message.split("\n"));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>
            Update {beat.id}. Only changed fields are written.
          </DialogDescription>
        </DialogHeader>
        <UpdateBeatFormBody
          values={{ title, description, profile, person, acceptance }}
          set={{ setTitle, setDescription, setProfile, setPerson, setAcceptance }}
          errors={errors}
          isPending={mutation.isPending}
          onCancel={() => onOpenChange(false)}
          onSave={() => {
            setErrors([]);
            mutation.mutate();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

interface FormValues {
  title: string;
  description: string;
  profile: QuickCaptureProfile;
  person: string;
  acceptance: string;
}
interface FormSetters {
  setTitle: (v: string) => void;
  setDescription: (v: string) => void;
  setProfile: (v: QuickCaptureProfile) => void;
  setPerson: (v: string) => void;
  setAcceptance: (v: string) => void;
}

function UpdateBeatFormBody({
  values,
  set,
  errors,
  isPending,
  onCancel,
  onSave,
}: {
  values: FormValues;
  set: FormSetters;
  errors: string[];
  isPending: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const needsPerson =
    values.profile === "coordinate" || values.profile === "followup";
  return (
    <div className="flex flex-col gap-3">
      <Field label="Title">
        <Input
          value={values.title}
          onChange={(e) => set.setTitle(e.target.value)}
        />
      </Field>
      <Field label="Description">
        <Textarea
          rows={4}
          value={values.description}
          onChange={(e) => set.setDescription(e.target.value)}
        />
      </Field>
      <Field label="Acceptance criteria (required for do)">
        <Textarea
          rows={2}
          value={values.acceptance}
          onChange={(e) => set.setAcceptance(e.target.value)}
        />
      </Field>
      <Field label="Bucket">
        <div className="flex flex-wrap gap-1.5">
          {QC_PROFILES.map((p) => (
            <Button
              key={p}
              type="button"
              size="sm"
              variant={p === values.profile ? "default" : "outline"}
              onClick={() => set.setProfile(p)}
            >
              {p}
            </Button>
          ))}
        </div>
      </Field>
      {needsPerson && (
        <Field
          label={
            values.profile === "coordinate"
              ? "With (person)"
              : "Chasing (person)"
          }
        >
          <Input
            value={values.person}
            onChange={(e) => set.setPerson(e.target.value)}
          />
        </Field>
      )}
      {errors.length > 0 && (
        <ul className="text-sm text-rust-700">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" disabled={isPending} onClick={onSave}>
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-ink-700">{label}</Label>
      {children}
    </div>
  );
}
