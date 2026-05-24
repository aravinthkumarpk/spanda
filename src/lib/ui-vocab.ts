// ui-vocab — UI-only label translation layer for spanda.
//
// Per phase2.html locked decision (Option B):
//   - Internal types + API routes + file names keep the musical Foolery
//     vocabulary (Beat / Take / Scene / Setlist / ReTakes). Zero upstream
//     diff at the code level.
//   - User-facing strings render through the "plain" vocabulary by
//     default — accessible to any knowledge worker who doesn't already
//     know the brand jargon.
//   - A "verbose" vocabulary opt-in preserves the musical originals.
//
// Component pattern:
//   import { useVocab } from "@/hooks/use-vocab";
//   const v = useVocab();
//   <button>{v("Take!")}</button>   // renders "Run" by default
//
// Switching vocabularies: localStorage.setItem("spanda_vocab", "verbose")
// then refresh. Default is "plain".

/**
 * The set of keys recognised by the vocabulary system. These are exactly
 * the strings that appear in component JSX today (audited via
 * `grep -rohE '"(Take!|Scene!|...)"' src/components/`).
 *
 * Adding a new key here is the public extension point — both VOCAB.plain
 * and VOCAB.verbose must list it, enforced by the no-drift test.
 */
export type VocabKey =
  | "Take!"
  | "Scene!"
  | "Beat"
  | "Beats"
  | "beat"
  | "beats"
  | "Setlist"
  | "ReTakes"
  | "Retakes"
  | "Escalations"
  | "Capsule"
  | "Scene"
  | "Take";

export type VocabName = "plain" | "verbose";

export const DEFAULT_VOCAB: VocabName = "plain";

type VocabMap = Record<VocabKey, string>;

const PLAIN: VocabMap = {
  // Domain action verbs (the imperatives ending in !)
  "Take!": "Run",
  "Scene!": "Plan it",
  // Singular/plural nouns, case-preserving
  "Beat": "Task",
  "Beats": "Tasks",
  "beat": "task",
  "beats": "tasks",
  // Surface names
  "Setlist": "Plan board",
  "ReTakes": "Reviews",
  "Retakes": "Reviews",
  // Other domain words
  "Escalations": "Blockers",
  "Capsule": "Context",
  "Scene": "Plan",
  "Take": "Run",
};

const VERBOSE: VocabMap = {
  // Identity map — keep the musical-metaphor originals.
  "Take!": "Take!",
  "Scene!": "Scene!",
  "Beat": "Beat",
  "Beats": "Beats",
  "beat": "beat",
  "beats": "beats",
  "Setlist": "Setlist",
  "ReTakes": "ReTakes",
  "Retakes": "Retakes",
  "Escalations": "Escalations",
  "Capsule": "Capsule",
  "Scene": "Scene",
  "Take": "Take",
};

/**
 * The registered vocabularies. Add a new vocab by extending this object
 * AND the VocabName type union above.
 */
export const VOCAB = {
  plain: PLAIN,
  verbose: VERBOSE,
} as const;

/**
 * Look up a key in a vocabulary. Fail-soft: returns the input string
 * verbatim if the key isn't in the chosen vocab (so a stale call site
 * during a refactor degrades to the original text, not a runtime crash).
 */
export function vocab(name: VocabName, key: VocabKey | string): string {
  const dict = VOCAB[name] as Record<string, string>;
  const value = dict[key];
  return value !== undefined ? value : key;
}
