/**
 * Attribution: cwd → repo → beat.
 *
 * The 5wo.2 eng review's rule: mis-attribution files a run under the wrong
 * work item, which is worse than "unattributed". So matching is exact
 * path-prefix-with-boundary, and the beat is pinned only when the repo has
 * exactly ONE in-flight beat — anything ambiguous stays undefined.
 */

export interface RunAttribution {
  repoPath?: string;
  beatId?: string;
}

function isInside(cwd: string, repo: string): boolean {
  return cwd === repo || cwd.startsWith(`${repo}/`);
}

export function attributeRun(
  cwd: string,
  repoPaths: readonly string[],
  inFlightBeatsByRepo: Readonly<Record<string, readonly string[]>>,
): RunAttribution {
  // Longest match wins so nested repos resolve to the innermost checkout.
  const repoPath = [...repoPaths]
    .sort((a, b) => b.length - a.length)
    .find((repo) => isInside(cwd, repo));
  if (!repoPath) return { repoPath: undefined, beatId: undefined };

  const inFlight = inFlightBeatsByRepo[repoPath] ?? [];
  return {
    repoPath,
    beatId: inFlight.length === 1 ? inFlight[0] : undefined,
  };
}
