"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, Check } from "lucide-react";
import { fetchBeats } from "@/lib/api";
import {
  buildPromotePayload,
  collectPromotedKeys,
  isKeyPromoted,
  type PromoteMarker,
} from "@/lib/today-promote";
import { CreateBeatDialog } from "@/components/create-beat-dialog";

interface MarkerTarget {
  slot: HTMLElement;
  marker: PromoteMarker;
}

/** Read a line's data-promote-* attributes into a marker (null if incomplete). */
function readMarker(el: HTMLElement): PromoteMarker | null {
  const key = el.getAttribute("data-promote-key")?.trim();
  const title = el.getAttribute("data-promote-title")?.trim();
  const bucket = el.getAttribute("data-promote-bucket")?.trim();
  if (!key || !title || !bucket) return null;
  return {
    key,
    title,
    bucket,
    project: el.getAttribute("data-promote-project")?.trim() || undefined,
    acceptance: el.getAttribute("data-promote-acceptance") ?? undefined,
    person: el.getAttribute("data-promote-person")?.trim() || undefined,
  };
}

/** Ensure each promotable element has a trailing slot node to portal into. */
function collectTargets(): MarkerTarget[] {
  const out: MarkerTarget[] = [];
  const els = document.querySelectorAll<HTMLElement>("[data-promotable]");
  els.forEach((el) => {
    const marker = readMarker(el);
    if (!marker) return;
    let slot = el.querySelector<HTMLElement>(":scope > .promote-slot");
    if (!slot) {
      slot = document.createElement("span");
      slot.className = "promote-slot";
      slot.style.marginLeft = "8px";
      el.appendChild(slot);
    }
    out.push({ slot, marker });
  });
  return out;
}

/**
 * /today promote island (B2). After the daily HTML is inlined
 * (dangerouslySetInnerHTML, whose scripts do NOT run), this client component
 * walks the DOM for pipeline-marked [data-promotable] lines, injects a
 * "make it work" button per line, and on click opens the shared create form
 * (CreateBeatDialog/BeatForm) prefilled from the marker. Already-promoted lines
 * (by stable data-promote-key) render a "promoted" badge instead. Writes go to
 * the single registered work repo via POST /api/beats.
 *
 * See docs/today-promote-contract.md for the marker contract.
 */
export function PromoteIsland({ sourceDate }: { sourceDate: string }) {
  const [targets, setTargets] = useState<MarkerTarget[]>([]);
  const [repo, setRepo] = useState<string | null>(null);
  const [promoted, setPromoted] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<PromoteMarker | null>(null);

  const date = useMemo(
    () => new Date(`${sourceDate}T00:00:00Z`),
    [sourceDate],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      setTargets(collectTargets());
      const reg = await fetch("/api/registry").then((r) => r.json()).catch(
        () => null,
      );
      const path: string | undefined = reg?.data?.[0]?.path ?? reg?.repos?.[0]?.path;
      if (!path) {
        console.error(
          "FOOLERY PROMOTE FAILURE: no registered work repo — register one in "
            + "Settings before promoting /today lines.",
        );
        return;
      }
      if (cancelled) return;
      setRepo(path);
      const beats = await fetchBeats({}, path);
      if (!cancelled && beats.ok && beats.data) {
        setPromoted(collectPromotedKeys(beats.data));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activePayload = active ? buildPromotePayload(active, date) : null;

  return (
    <>
      {targets.map(({ slot, marker }) =>
        createPortal(
          isKeyPromoted(marker.key, promoted) ? (
            <PromotedBadge />
          ) : (
            <PromoteButton onClick={() => setActive(marker)} />
          ),
          slot,
          marker.key,
        ),
      )}
      {active && activePayload && (
        <CreateBeatDialog
          open
          repo={repo}
          heading={{
            title: "Make it work",
            description: "Promote this line to a task. Review and confirm.",
          }}
          defaultValues={{
            title: activePayload.title,
            description: activePayload.description,
            acceptance: activePayload.acceptance,
            labels: activePayload.labels,
            type: "task",
          }}
          onOpenChange={(open) => {
            if (!open) setActive(null);
          }}
          onCreated={() => {
            setPromoted((prev) => new Set(prev).add(active.key));
            setActive(null);
          }}
        />
      )}
    </>
  );
}

function PromoteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-1 rounded-full border border-moss-300"
        + " bg-moss-50 px-2 py-0.5 align-middle text-[11px] font-semibold"
        + " text-moss-700 hover:bg-moss-100"
      }
    >
      <Sparkles className="size-3" />
      make it work
    </button>
  );
}

function PromotedBadge() {
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 align-middle"
        + " text-[11px] font-semibold text-ink-500"
      }
      title="Already promoted to a task"
    >
      <Check className="size-3" />
      promoted
    </span>
  );
}
