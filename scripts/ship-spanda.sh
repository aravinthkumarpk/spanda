#!/usr/bin/env bash
# scripts/ship-spanda.sh — build runtime, swap into systemd, restart, smoke.
#
# Per ROADMAP.md (Phase 1.5). Atomic-ish: stop service → swap → start.
# Reversible: failure auto-keeps the previous runtime in place (we only
# move forward after the new tarball passes its integrity check).
#
# Env:
#   SPANDA_DRY_RUN=1   Don't restart; just build + report.
#   SPANDA_PORT=3210   Override health-check port (default 3210).

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly RUNTIME_DIR="${SPANDA_RUNTIME_DIR:-$HOME/.local/share/foolery/runtime}"
readonly RUNTIME_PARENT="$(dirname "$RUNTIME_DIR")"
readonly PORT="${SPANDA_PORT:-3210}"
readonly TARBALL="$REPO_ROOT/dist/foolery-runtime-linux-x64.tar.gz"

log() { printf '[ship-spanda] %s\n' "$*"; }
fail() { printf '[ship-spanda] [ERROR] %s\n' "$*" >&2; exit 1; }

# ---------------- 1. Build runtime artifact ----------------
log "building runtime artifact"
cd "$REPO_ROOT"
if ! bash scripts/build-runtime-artifact.sh > /tmp/ship-spanda-build.log 2>&1; then
  tail -20 /tmp/ship-spanda-build.log >&2
  fail "build-runtime-artifact.sh failed (see /tmp/ship-spanda-build.log)"
fi
[[ -f "$TARBALL" ]] || fail "tarball missing after build: $TARBALL"
log "artifact: $TARBALL ($(stat -c%s "$TARBALL") bytes)"

# Integrity preview before stopping the live service.
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT
tar -xzf "$TARBALL" -C "$TMPDIR"
# Build script wraps the runtime in a nested "foolery-runtime/" dir.
# Flatten so the launcher's integrity check (looking for package.json,
# .next/BUILD_ID, node_modules, next bin directly under APP_DIR) passes.
NESTED="$TMPDIR/foolery-runtime"
if [[ -d "$NESTED" ]]; then
  STAGED="$TMPDIR/staged"
  mv "$NESTED" "$STAGED"
else
  STAGED="$TMPDIR"
fi
[[ -f "$STAGED/package.json" ]] || fail "staged tarball missing package.json"
[[ -f "$STAGED/.next/BUILD_ID" ]] || fail "staged tarball missing .next/BUILD_ID"
[[ -d "$STAGED/node_modules" ]] || fail "staged tarball missing node_modules"
log "staged runtime integrity OK"

if [[ "${SPANDA_DRY_RUN:-0}" == "1" ]]; then
  log "SPANDA_DRY_RUN=1; not touching live runtime. exiting clean."
  exit 0
fi

# ---------------- 2. Stop service ----------------
log "stopping foolery.service"
systemctl --user stop foolery.service || true
sleep 1

# ---------------- 3. Swap runtime ----------------
BACKUP="${RUNTIME_DIR}.bak.$(date +%s)"
if [[ -d "$RUNTIME_DIR" ]]; then
  log "backing up previous runtime to $BACKUP"
  mv "$RUNTIME_DIR" "$BACKUP"
fi
log "swapping runtime"
mv "$STAGED" "$RUNTIME_DIR"

# ---------------- 4. Start service ----------------
log "starting foolery.service"
systemctl --user start foolery.service
sleep 4

# ---------------- 5. Health check ----------------
status=$(curl -sI -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}/" || echo "000")
case "$status" in
  2*|3*)
    log "health OK (HTTP $status)"
    if [[ -d "$BACKUP" ]]; then
      log "removing backup runtime $BACKUP"
      rm -rf "$BACKUP"
    fi
    ;;
  *)
    fail "health failed (HTTP $status). Backup retained at $BACKUP; restore with: systemctl --user stop foolery; rm -rf $RUNTIME_DIR; mv $BACKUP $RUNTIME_DIR; systemctl --user start foolery"
    ;;
esac

log "done. live at http://127.0.0.1:${PORT}/ (public via Cloudflare Access tunnel)"
