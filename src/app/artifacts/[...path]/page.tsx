import { existsSync, readFileSync } from "node:fs";
import { permanentRedirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  loadArtifactByPath,
  ArtifactPathError,
  type ArtifactLoaderFs,
} from "@/lib/artifact-loader";
import { parseArtifact } from "@/lib/artifact-index";
import { ArtifactComments } from "@/components/artifact-comments";

// A task's output changes whenever an agent re-runs it — never edge-cache.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DOCS_ROOT =
  process.env.SPANDA_ARTIFACTS_DOCS
  ?? "/home/deploy/code/html-artifacts/docs";

const realFs: ArtifactLoaderFs = {
  exists: (p) => existsSync(p),
  read: (p) => readFileSync(p, "utf8"),
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
        <Link
          href="/beats?view=artifacts"
          className={
            "inline-flex items-center gap-1.5 text-sm"
            + " text-muted-foreground hover:text-foreground"
          }
        >
          <ArrowLeft className="size-4" />
          Library
        </Link>
      </div>
      {children}
    </main>
  );
}

function Message({ title, detail }: { title: string; detail?: string }) {
  return (
    <Shell>
      <div className="mx-auto max-w-3xl px-6 py-10 text-center">
        <p className="text-base">{title}</p>
        {detail && (
          <p className="mt-2 font-mono text-sm text-muted-foreground">
            {detail}
          </p>
        )}
      </div>
    </Shell>
  );
}

export default async function ArtifactPage({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  const segments = path ?? [];

  // Back-compat: old single-segment /artifacts/<id> → /artifacts/beads/<id>.
  if (segments.length === 1) {
    permanentRedirect(`/artifacts/beads/${segments[0]}`);
  }

  const relPath = `${segments.join("/")}.html`;

  let result: ReturnType<typeof loadArtifactByPath>;
  try {
    result = loadArtifactByPath(relPath, { root: DOCS_ROOT, fs: realFs });
  } catch (err) {
    return (
      <Message
        title="That is not a valid artifact path."
        detail={err instanceof ArtifactPathError ? err.message : String(err)}
      />
    );
  }

  if (!result) {
    return (
      <Message
        title={`No artifact at ${relPath}.`}
        detail="Drop its HTML under html-artifacts/docs/ and tag the task."
      />
    );
  }

  // The bead (if any) is whatever the artifact itself declares — read it back
  // from the same file so the comment island anchors to the right task.
  const html = realFs.read(`${DOCS_ROOT}/${relPath}`);
  const beads = parseArtifact(relPath, html).beads;

  return (
    <Shell>
      <div
        className="artifact-content"
        dangerouslySetInnerHTML={{ __html: result.body }}
      />
      {beads.length > 0 && <ArtifactComments beadId={beads[0]} />}
    </Shell>
  );
}
