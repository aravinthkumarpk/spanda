import { redirect } from "next/navigation";
import { listRepos } from "@/lib/registry";

export default async function Home() {
  const repos = await listRepos();
  if (repos.length > 0) {
    // ADR-0004: Today (the change feed you check first) is the default landing.
    redirect("/today");
  }
  redirect("/beats?settings=repos");
}
