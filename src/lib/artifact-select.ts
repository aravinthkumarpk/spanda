// Which beats appear on /artifacts: every active bead carrying the
// `artifact` label (the v0 task-output convention), priority-first.
import type { Beat } from "@/lib/types";
import { isTerminalBeatState } from "@/lib/beat-terminal";
import { compareBeatsByPriorityThenState } from "@/lib/beat-sort";

export function selectArtifactBeats(beats: Beat[]): Beat[] {
  return beats
    .filter(
      (b) =>
        (b.labels ?? []).includes("artifact")
        && !isTerminalBeatState(b.state),
    )
    .sort(compareBeatsByPriorityThenState);
}
