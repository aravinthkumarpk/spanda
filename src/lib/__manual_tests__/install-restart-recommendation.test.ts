/**
 * Manual integration test for installer restart recommendation output.
 *
 * Uses real shell execution and temp files while mocking host commands, so it
 * lives in `__manual_tests__/` per the Hermetic Test Policy.
 */

import { execFile } from "node:child_process";
import {
  chmod,
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const installScriptPath = join(process.cwd(), "scripts", "install.sh");
const createdDirs: string[] = [];
const restartRecommendation = "Run 'foolery restart'";

const runInstallMainScript = String.raw`
  set -euo pipefail
  script_path="$FOOLERY_TEST_INSTALL_SCRIPT"
  stripped="$(mktemp "/tmp/foolery-install-restart-test.XXXXXX")"
  trap 'rm -f "$stripped"' EXIT
  sed '$d' "$script_path" >"$stripped"
  source "$stripped"
  install_runtime() { :; }
  write_launcher() { :; }
  main
`;

afterEach(async () => {
  await Promise.all(
    createdDirs.splice(0).map((dir) =>
      rm(dir, { recursive: true, force: true })),
  );
});

async function makeTempDir(prefix: string) {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  createdDirs.push(dir);
  return dir;
}

async function writeExecutable(path: string, body = "exit 0") {
  await writeFile(
    path,
    `#!/usr/bin/env bash\n${body}\n`,
    "utf8",
  );
  await chmod(path, 0o755);
}

async function runInstaller(options: {
  osId: string;
  systemdRegistered: boolean;
}) {
  const tempRoot = await makeTempDir("foolery-install-restart-");
  const binDir = join(tempRoot, "bin");
  const installRoot = join(tempRoot, "install");
  const stateDir = join(tempRoot, "state");
  const osReleasePath = join(tempRoot, "os-release");

  await mkdir(binDir, { recursive: true });
  await mkdir(stateDir, { recursive: true });
  await writeFile(join(stateDir, "foolery.pid"), `${process.pid}\n`);
  await writeFile(osReleasePath, `ID=${options.osId}\n`, "utf8");

  await Promise.all(
    ["curl", "tar", "node", "kno"].map((cmd) =>
      writeExecutable(join(binDir, cmd))),
  );
  await writeExecutable(
    join(binDir, "uname"),
    '[[ "$1" == "-s" ]] && { printf "Linux\\n"; exit 0; }\n'
      + 'printf "x86_64\\n"',
  );
  await writeExecutable(
    join(binDir, "systemctl"),
    options.systemdRegistered
      ? '[[ "$1" == "cat" || "$2" == "cat" ]] && exit 0\nexit 1'
      : "exit 1",
  );

  return execFileAsync("/bin/bash", ["-c", runInstallMainScript], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH ?? ""}`,
      FOOLERY_INSTALL_ROOT: installRoot,
      FOOLERY_APP_DIR: join(installRoot, "runtime"),
      FOOLERY_BIN_DIR: binDir,
      FOOLERY_STATE_DIR: stateDir,
      FOOLERY_LAUNCHER_PATH: join(binDir, "foolery"),
      FOOLERY_OS_RELEASE_PATH: osReleasePath,
      FOOLERY_TEST_INSTALL_SCRIPT: installScriptPath,
    },
  });
}

describe("installer restart recommendation", () => {
  it("suppresses manual restart advice on Debian with systemd service", async () => {
    const result = await runInstaller({
      osId: "debian",
      systemdRegistered: true,
    });

    expect(result.stderr).not.toContain(restartRecommendation);
  });

  it("keeps manual restart advice on Debian without systemd service", async () => {
    const result = await runInstaller({
      osId: "debian",
      systemdRegistered: false,
    });

    expect(result.stderr).toContain(restartRecommendation);
  });

  it("keeps manual restart advice on non-Debian Linux", async () => {
    const result = await runInstaller({
      osId: "ubuntu",
      systemdRegistered: true,
    });

    expect(result.stderr).toContain(restartRecommendation);
  });
});
