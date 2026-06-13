import { redirect } from "next/navigation";
import { RepoRegistry } from "@/components/repo-registry";
import { resolveFeatures, featureEnabled } from "@/lib/features";

export default function RegistryPage() {
  // Gated off in the lean cut — never used across the project history.
  // Unset SPANDA_FEATURES (or include "registry") restores it.
  if (!featureEnabled("registry", resolveFeatures(process.env.SPANDA_FEATURES ?? null))) {
    redirect("/beats");
  }
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <RepoRegistry />
    </div>
  );
}
