"use client";

// useVocab — the read side of src/lib/ui-vocab.ts.
//
// Uses React 19's useSyncExternalStore instead of useState+useEffect
// to read localStorage. This avoids the react-hooks/set-state-in-effect
// rule and is the idiomatic pattern for subscribing to a non-React
// external state source.

import { useSyncExternalStore } from "react";
import {
  DEFAULT_VOCAB,
  vocab,
  type VocabKey,
  type VocabName,
} from "@/lib/ui-vocab";

const STORAGE_KEY = "spanda_vocab";

function readActiveVocab(): VocabName {
  if (typeof window === "undefined") return DEFAULT_VOCAB;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "verbose" || stored === "plain") return stored;
  } catch {
    // localStorage may be unavailable (Safari private mode, etc.); fall through
  }
  return DEFAULT_VOCAB;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  function onStorage(event: StorageEvent) {
    if (event.key !== STORAGE_KEY) return;
    callback();
  }
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

function getServerSnapshot(): VocabName {
  return DEFAULT_VOCAB;
}

/**
 * Hook returning a vocab-translator function.
 *
 *   const v = useVocab();
 *   <button>{v("Take!")}</button>   // "Run" in plain, "Take!" in verbose
 */
export function useVocab(): (key: VocabKey | string) => string {
  const active = useSyncExternalStore(
    subscribe,
    readActiveVocab,
    getServerSnapshot,
  );
  return (key: VocabKey | string) => vocab(active, key);
}
