"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { BeatForm } from "@/components/beat-form";
import type { Beat } from "@/lib/types";
import type { UpdateBeatInput } from "@/lib/schemas";
import { updateBeat } from "@/lib/api";
import { invalidateBeatListQueries } from "@/lib/beat-query-cache";
import { repoPathForBeat } from "@/components/beat-table-mutations";

/**
 * Edit a task through the shared BeatForm (Q6: one Add/Update/promote form).
 * Pre-fills the full field set — including the complete label list, so nothing
 * is dropped on submit — and PATCHes via updateBeat -> /api/beats/:id.
 */
export function EditBeatDialog({
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
  const mutation = useMutation({
    mutationFn: (data: UpdateBeatInput) =>
      updateBeat(beat.id, data, repoPathForBeat(beat)).then((r) => {
        if (!r.ok) throw new Error(r.error ?? "Update failed");
      }),
    onSuccess: () => {
      toast.success("Task updated");
      void invalidateBeatListQueries(queryClient);
      onUpdated?.();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>
            Update {beat.id}. The full label list is shown so nothing is lost.
          </DialogDescription>
        </DialogHeader>
        <BeatForm
          mode="edit"
          defaultValues={{
            title: beat.title,
            description: beat.description ?? "",
            type: beat.type,
            state: beat.state,
            profileId: beat.profileId,
            priority: beat.priority,
            labels: beat.labels,
            acceptance: beat.acceptance ?? "",
          }}
          onSubmit={(data) => mutation.mutate(data)}
        />
      </DialogContent>
    </Dialog>
  );
}
