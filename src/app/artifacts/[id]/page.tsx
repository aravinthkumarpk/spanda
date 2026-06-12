import { existsSync, readFileSync } from "node:fs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  loadArtifact,
  ArtifactIdError,
  type ArtifactLoaderFs,
} from "@/lib/artifact-loader";
import { ArtifactComments } from "@/components/artifact-comments";

// A task's compiled output changes whenever an agent re-runs the task —
// never prerender or edge-cache it (same rationale as /today).
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Same convention the v0 loop established: html-artifacts/docs/beads/<id>.html.
const ARTIFACTS_ROOT =
  process.env.SPANDA_ARTIFACTS_ROOT
  ?? "/home/deploy/code/html-artifacts/docs/beads";

const realFs: ArtifactLoaderFs = {
  exists: (path) => existsSync(path),
  read: (path) => readFileSync(path, "utf8"),
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
          Artifacts
        </Link>
      </div>
      {children}
    </main>
  );
}

export default async function ArtifactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let result: ReturnType<typeof loadArtifact>;
  try {
    result = loadArtifact(id, { root: ARTIFACTS_ROOT, fs: realFs });
  } catch (err) {
    const message =
      err instanceof ArtifactIdError ? err.message : String(err);
    return (
      <Shell>
        <div className="mx-auto max-w-3xl px-6 py-10 text-center">
          <p className="text-base">That is not a valid artifact id.</p>
          <p className="mt-2 font-mono text-sm text-muted-foreground">
            {message}
          </p>
        </div>
      </Shell>
    );
  }

  if (!result) {
    return (
      <Shell>
        <div className="mx-auto max-w-3xl px-6 py-10 text-center">
          <p className="text-base">
            No output attached to <code className="font-mono">{id}</code> yet.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Drop its HTML at docs/beads/{id}.html in html-artifacts and tag
            the task with the <code className="font-mono">artifact</code>{" "}
            label.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div
        className="artifact-content"
        dangerouslySetInnerHTML={{ __html: result.body }}
      />
      <ArtifactComments beadId={id} />
    </Shell>
  );
}
