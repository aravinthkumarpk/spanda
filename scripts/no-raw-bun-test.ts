// Preloaded by bunfig.toml [test] when someone runs raw `bun test`.
//
// This repo's test harness is vitest (`bun run test` → vitest run --project
// unit). Raw `bun test` ignores vitest.config.ts — no project filter, no
// setup files — so it wanders into files it was never meant to execute and
// has historically hung for minutes at 100% CPU with zero output (g8u.4).
// Fail fast and loud instead.
console.error(
  "\n[31m✗ raw `bun test` is not this repo's harness.[0m\n" +
    "  Use:  bun run test          (vitest, unit project)\n" +
    "        bun run test:all      (unit + storybook)\n" +
    "        bun run test:manual   (environment-coupled manual tests)\n",
);
process.exit(1);
