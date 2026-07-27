# Buzz Integration Spec

Status: draft (living doc). Owner: Aravinth. Last updated: 2026-07-27.

This spec defines how we stand up [Buzz](https://github.com/block/buzz) as a workspace for our agents, mapped onto the spanda ("Foolery") model and the merchant-operating-board skill library. Set up from this doc; keep it updated as our setup evolves (see the Living Config section at the end).

## 1. Why Buzz

Buzz is a self-hostable Nostr-relay workspace where humans and AI agents share the same rooms. Every message, reaction, workflow step, review, and git event is a signed event in one log with the same identity model, whether the author is a person or a process. It gives our agents the same surface area as a human teammate (channels, workflows, git, search, voice, media) with their own keys and their own audit trail.

Our spanda model and Buzz's model are near-isomorphic, so most Buzz features need config we already have conceptually in spanda plus the merchant-board skills.

## 2. spanda ↔ Buzz mapping

Spanda ("Foolery") is a keyboard-first, multi-repo control room that launches real agent CLIs (claude/codex/copilot/gemini/opencode) against git-tracked work items and drives them through a fixed 6-step workflow with per-step human-or-agent ownership.

| Buzz concept | spanda concept | Notes |
|---|---|---|
| event | **Beat** (`types.ts:63`, aliased Knot/Bead) | The atomic addressable unit of work, like a Nostr event. |
| channel | **Repo** (durable) + **Wave** (thread) | A registered git working tree is the persistent room; a Wave is a parallel batch within a plan (thread/sub-channel). |
| agents-as-members | **Agent Pool** + **RegisteredAgent** | Registry of RegisteredAgents = the agent directory; the per-step weighted pool = channel membership. |
| workflow | **MemoryWorkflowDescriptor** / **Profile** | Serializable workflow definition: states, transitions, terminals, owner-per-step. |
| approval-gate | **ActionOwnerKind: human** / **Gate** | `owner: human` on a step is a blocking approval gate; `granular autonomous` = no gates. |
| git-as-rooms | **.knots/** (primary, `kno`) or **.beads/issues.jsonl** (`bd`) | Workspace state of record is git-tracked files; `AutoRoutingBackend` selects the backend per repo. |
| search | **generating-trino-queries** + datalake tools | NL to validated Trino SQL across our data domains. |
| media | Report/email skills + Stork delivery | Content members post reports and send email/WhatsApp. |
| huddles | ElevenLabs / n8n voice-call skills | Outbound AI voice calls (receivables, feedback). |
| audit | Normalized-event `result` contract + Langfuse + lease-audit | Every agent turn is a stable event; eval/audit skills chain the record. |
| canvases | **no direct analog** (gap) | Closest is the Setlist/Gantt view. Treat Buzz canvases as net-new. |

Session lifecycle (spanda): click Take!/Scene! → `createSession()` builds prompt → `selectFromPool()` picks agent → `Bun.spawn(agent_command)` → SSE stream to xterm → agent completes → workflow state advances. Sessions are leased (`ExecutionLease`: claim → hold → release/rollback), single-take enforced.

## 3. Deployment topology

- **Relay**: self-hosted on `hermes-ec2` (Ubuntu 24.04, tailnet `100.84.240.65`), via the `deploy/compose/` bundle (prebuilt image `ghcr.io/block/buzz:main` + Postgres + Redis + MinIO + git volume). No source build needed.
- **Client**: Buzz desktop app on the Mac (`Buzz_0.4.26_aarch64.dmg`), pointed at the relay via `BUZZ_RELAY_URL=ws://100.84.240.65:3000`.
- **Transport**: tailnet only. No public IP, no security-group change, no TLS for now (add Caddy/TLS + DNS later if it must be reachable off-tailnet).

## 4. Base values

### 4.1 Identity (Buzz relay layer)
- One Nostr keypair per human member and per agent member. A `RegisteredAgent` (command/provider/model/flavor/label) is the profile each agent key advertises.
- Relay signing key / workspace admin key (`BUZZ_RELAY_PRIVATE_KEY`).
- `RELAY_OWNER_PUBKEY` = Aravinth's 64-hex Nostr pubkey (enables closed-relay mode so it is not world-open).

### 4.2 Env / secrets (for agent members to function)
- `GITHUB_ACCESS_TOKEN` / `GH_TOKEN`: git-as-rooms backend access.
- `AMS_ADMIN_USER` / `AMS_ADMIN_PASS` (basic auth) and `AMS_ADMIN_TOKEN` (`X-Admin-Token` header, not Bearer; rotates ~monthly, decode JWT `exp` before debugging 401s).
- AMS base URLs per env: local `http://localhost:8080`; devstack `https://agent-marketplace-web-{label}.dev.razorpay.in`; prod `https://agent-marketplace-api-concierge.razorpay.com` (corp-network/VPN only; prod is write-sensitive, default to shadow).
- Langfuse creds (traces/evals/audit); Trino/datalake access; internal MCP connector creds; ElevenLabs + Shopify connectors; Stork (mCarbon/Progate WABA) creds + `agent-browser`; n8n workflow endpoint.
- Infra secrets from the compose bundle: Postgres / Redis / MinIO passwords, `BUZZ_GIT_HOOK_HMAC_SECRET`, `BUZZ_AUTO_MIGRATE=true` on first boot.

### 4.3 Channels
- git-as-rooms: each registered Repo = one durable channel; Waves = threads within it.
- Operational channels (each fed by one report/email agent-member): `#cashflow`, `#settlements`, `#receivables`, `#rto`, `#feedback`.

### 4.4 Workflow YAML (`MemoryWorkflowDescriptor` / `Profile`)
- 6-step spine: `Planning → PlanReview → Implementation → ImplementationReview → Shipment → ShipmentReview`, each with `owner: agent|human|none`.
- Ship profiles: `autopilot` (all agent), `autopilot_with_pr`, `semiauto` / `coarse human gated` (human approval on plan/impl review = approval gates).
- Merchant go-live workflow: `connector:test → tool-test → eval-run → shadow → (human approval gate) → live`. Shadow-mode-by-default is the standing safety gate.
- Cron-triggered workflows: 8am daily (cashflow, settlement digest), payroll-horizon, weekly (RTO), 15-day-post-order (feedback), daily (receivables).

## 5. Skill → Buzz feature map

### 5.1 Agent-engineering skills (how agents are built and operated)

| Skill | Capability | Buzz feature | Base value implied |
|---|---|---|---|
| `writing-agent-spec` | Writes publication-ready agent spec MDX; auto-discovers tool surface; 30-pt rubric + 20 sections | agents-as-members (design) | Problem statement; live connector registry |
| `building-skill-from-spec` | Builds/patches a merchant skill bundle from spec MDX, no interview | agents-as-members (build) | Spec MDX path; output `skills/{name}/` |
| `creating-skills` | Create/edit/benchmark skills + optimize trigger descriptions via eval variance | agents-as-members (build) | Test prompts; eval harness |
| `writing-agent-configs` | Authors merchant install-wizard config (controlled components, injection-safe); mirrors section ids into SKILL.md | agents-as-members (config surface) | `install_wizard` schema; `marketplace.yaml` |
| `ams-connector` | Create/sync a connector (registered API, base URL + auth + scope) in AMS | agents-as-members (tool wiring) | AMS base URL; admin auth; connector registry |
| `ams-operation` | Add/sync a connector operation; each op slug becomes an MCP tool | agents-as-members (tool surface) | Operation slug → MCP-tool map |
| `enabling-agents-on-merchants` | Go-live: create skill entity, subscribe merchant, start shadow, flip live | workflows + approval-gate | AMS admin auth; shadow→live flip |
| `provisioning-cart-recovery-agents` | E2E provisioning: pick entity, subscribe, wire connectors, verify, flip live | workflows + agents-as-members | `X-Admin-Token`; connector rows are the real gate |
| `creating-stork-whatsapp-templates` | Registers WABA templates in mCarbon via agent-browser so WA blocks are Meta-approved | media/channels (delivery) | mCarbon/Progate creds; agent-browser; template spec |
| `agent-engineering` | Health audit of traces, failure modes, eval coverage, judge validation via Langfuse | audit | Langfuse creds; alert thresholds |
| `bootstrapping-agent-evals` | One-PR registration of a new agent across 6 eval touchpoints | audit + onboarding | Funnel rules, floors, labels, tabs, Vertex schedule |
| `running-evals` | Scores prod traces for hero agents (4 evaluators); HTML + Markdown reports | audit + media | Langfuse traces; per-agent evaluators |
| `reviewing-agent-design` | Reviews architecture against Claude Code principles (RED/AMBER/GREEN) | audit (design gate) | `references/principles.md` |
| `reviewing-skills-compliance` | Repo-wide compliance + design + autonomous-readiness audit | audit | `CLAUDE.md`; best-practices guidelines |
| `agent-marketplace-tool-tester` | Deterministic pre-ship tool-call test (right tool, args, sequence, no forbidden tool) | workflows (pre-flight gate) + audit | Per-agent allowed-tools contract |
| `connector-e2e-runner` | Discovers connectors from live AMS catalog; health-checks reachability | audit (plumbing) | Live AMS URL; `/v1/admin/connectors` |
| `generating-trino-queries` | NL → validated Trino SQL across 41 domains + 32 datalake tables | search | Trino access; domain index |

Layered go-live gate (recurs across skills, = Buzz workflow+audit spine): `/connector:test` (plumbing) → `/agent:tool-test` (behavior) → `/agent:eval-run` (quality) → shadow → live.

### 5.2 Report / email skills (what a member posts or sends)

| Skill | Produces | Buzz feature | Base value |
|---|---|---|---|
| `generating-merchant-reports` | Paginated Payout + FAV reports from datalake; 100-row preview → export to 50k | media + search | `mcp__datalake__*`; merchant_id from auth; paise÷100 |
| `generating-cashflow-reports` | RazorpayX cashflow, 3 modes (8am digest / on-demand / payroll warning) | media + workflows (cron) | `mcp__internal__*`; 8am + payroll crons |
| `forecasting-cashflow` | Daily digest: cash position, payroll sufficiency, deferral, runway/burn | media + workflows | `mcp__internal__*` + `mcp__datalake__*` |
| `generating-settlement-digest` | Proactive 8am digest (fee breakdown, DoD anomaly, WA/Email) + reactive deep diagnosis (24 Trino queries) | media + channels + search | settlement MCP; Stork; datalake |
| `sending-rto-risk-report` | Weekly RTO risk: high-risk pincodes, repeat offenders WoW; email + WA/SMS | media + channels | `mcp__internal__rto_dashboard_analytics`; weekly cron |
| `sending-invoice-receivables-reminder` | Collections cron: overdue invoices, call-eligibility, outbound AI voice call via n8n | workflows + huddles | receivables MCP; n8n; `initiate_ftxagent_outbound_call` |
| `collecting-receivables` | Daily B2B recovery: aging buckets, LLM strategy, multi-channel + payment link | workflows + channels + media | receivables MCP; `create_payment_link` |
| `collecting-customer-feedback` | Post-order voice interview (ElevenLabs, 6 Qs, 15d), synthesize → WA + Shopify metafield | huddles + media + channels | Shopify + ElevenLabs MCP; 15d trigger |
| `email-test-skill` | Minimal E2E email-connector validator (hardcoded `communications.email` block) | media (delivery test) + audit | Stork template `emails.payout_link.customer_otp` |

### 5.3 Members by role
- **Build/onboarding** (make new agents): `writing-agent-spec`, `building-skill-from-spec`, `creating-skills`, `writing-agent-configs`, `ams-connector`, `ams-operation`.
- **Ops/go-live** (workflows + gates): `enabling-agents-on-merchants`, `provisioning-cart-recovery-agents`, `creating-stork-whatsapp-templates`.
- **Audit**: `agent-engineering`, `bootstrapping-agent-evals`, `running-evals`, `reviewing-agent-design`, `reviewing-skills-compliance`, `agent-marketplace-tool-tester`, `connector-e2e-runner`.
- **Search**: `generating-trino-queries`.
- **Content/media + huddle**: the report/email skills in 5.2.

## 6. Setup runbook

### 6.1 Relay on hermes-ec2
1. Install Docker Engine + Compose v2 (≥ 2.24.4); add `ubuntu` to the `docker` group.
2. `git clone https://github.com/block/buzz ~/buzz` (or sparse-checkout `deploy/compose/`).
3. `cd ~/buzz/deploy/compose && cp .env.example .env`; fill every `CHANGE_ME` (generate secrets with `openssl rand -hex 32`; relay key + owner key via `buzz-admin`); set `BUZZ_AUTO_MIGRATE=true`; keep WS on 3000; leave TLS off. `chmod 600 .env`.
4. `./run.sh config` then `./run.sh start`; verify `./run.sh status` healthy and `curl http://127.0.0.1:$BUZZ_HTTP_PORT/_liveness`.
5. Confirm restart policy (`restart: unless-stopped`) so it survives reboots.

### 6.2 Client on the Mac
1. `gh release download v0.4.26 --repo block/buzz --pattern "Buzz_*_aarch64.dmg" --dir ~/Downloads`.
2. Mount, copy `Buzz.app` → `/Applications`, detach; clear quarantine if blocked (`xattr -dr com.apple.quarantine /Applications/Buzz.app`).
3. Launch: `BUZZ_RELAY_URL=ws://100.84.240.65:3000 open -a Buzz`; sign in with the owner keypair.

### 6.3 First feature check
Create a channel, post a message (verify it persists and appears in Cmd+K search), then add one agent member wired to an LLM provider (reuse the OpenAI/Gemini keys already on hermes-ec2).

## 7. Living config (keep this updated)

| Item | Target | Status | Notes |
|---|---|---|---|
| Docker on hermes-ec2 | installed | [x] | Compose v5.3.1 |
| Relay stack up | `./run.sh status` green | [x] | relay + Postgres + Redis + MinIO, `restart: unless-stopped` |
| Owner keypair | `RELAY_OWNER_PUBKEY` set | [x] | `508163fa…37a3`, closed-relay mode, sole member role=owner |
| HTTPS | valid cert, tailnet-only | [x] | `tailscale serve` → `https://hermes-ec2.tail9f6b4e.ts.net` |
| Desktop app | connects to relay | [x] | v0.4.26, `/query` traffic flowing, 0 non-200 |
| Agent keypairs | one per RegisteredAgent | [~] | Builder/Communicator/Researcher have keypairs + personas (`builtin:fizz/honey/bumble`); runtime `claude` |
| Channels | repo + operational (#cashflow, #settlements, #receivables, #rto, #feedback) | [~] | `agent-marketplace` (`a8848ae6-…`) created and seeded; 4 scaffolding channels also exist |
| Buzz nest (`~/.buzz`) | seeded, Mac-local | [x] | `RESEARCH/CURRENT_ACTIVE_WORK.md`, `GUIDES/BUZZ_RELAY_RUNBOOK.md`, 6 repos symlinked into `REPOS/` |
| Personal beads | one canonical store | [x] | `~/my-personal-os/.beads` (git-backed via `obsidian-vault`), `BEADS_DIR` exported; empty shadow store retired |
| Workflow YAML | 6-step + go-live profiles | [ ] | port from MemoryWorkflowDescriptor |
| Crons | 8am / weekly / 15d / daily | [ ] | cashflow, settlement, rto, feedback, receivables |

### 7.1 Working configuration (as deployed)

```
Relay URL (app + clients):  https://hermes-ec2.tail9f6b4e.ts.net
Community host (DB):        hermes-ec2.tail9f6b4e.ts.net
BUZZ_HTTP_PORT:             8787  (fronted by tailscale serve on 443)
BUZZ_CORS_ORIGINS:          tauri://localhost,https://tauri.localhost,
                            https://hermes-ec2.tail9f6b4e.ts.net,http://localhost:3000
Owner key file:             ~/.buzz-owner.nsec (600), hex plus npub/nsec forms
```

The community keeps a stable id (`28df2a91-…`) across host changes: change `communities.host`, never recreate the row, or you lose channels/data.

### 7.2 Blockers hit during first setup (and fixes)

Three separate issues blocked the desktop client. All three are config, not code:

1. **`404 relay: no community is configured for this host`**. The relay routes by HTTP `Host` header; the community was provisioned as `buzz.example.com` but the client connected by IP. Fix: `update communities set host = '<what clients actually use>'`.
2. **Client refuses plain HTTP to a remote host.** The community handshake never left the app. Fix: real TLS. `tailscale cert <magicdns-name>` + `tailscale serve --bg http://127.0.0.1:8787` gives a valid Let's Encrypt cert, tailnet-only, no tunnel to babysit. Requires **HTTPS Certificates** enabled in the Tailscale admin (DNS page) first.
3. **CORS, the hard one.** `BUZZ_CORS_ORIGINS` was left at the `.env.example` default (`https://buzz.example.com`), so the relay returned **no** `access-control-allow-origin` and WebKit silently killed the fetch with a generic "Load failed". Nothing appeared in the app log *or* the relay log, because the request never left the webview. Diagnostic tell: preflight returns `allow-headers: *` and `allow-methods: *` but no `allow-origin`.

**Probe gap to fix:** P3 only asserted `grep -c CHANGE_ME == 0`. That passes while `example.com` defaults remain in `BUZZ_DOMAIN`, `BUZZ_CORS_ORIGINS`, and `BUZZ_MEDIA_SERVER_DOMAIN`. Strengthen P3 to also assert no `example.com` remains, and add a probe asserting the preflight returns `access-control-allow-origin` for the client's origin.

### 7.3 Work-tracking layout (verified 28 Jul 2026)

Two independent systems, easy to conflate:

- **Personal backlog**: beads at `~/my-personal-os/.beads` (git-backed via the `obsidian-vault` repo). Source of truth is `issues.jsonl`. Reachable from any directory via `export BEADS_DIR="$HOME/my-personal-os/.beads"`. 32 open items, mostly Jan/Feb dated, pending triage.
- **spanda work items**: **none yet**. The spanda repo has neither `.knots/` nor `.beads/`, and `kno` (its declared primary per repo `CLAUDE.md`) is not installed on the Mac. `my-personal-os/.knots/` holds only `cache/` and `workflows/`, zero knots. No personal beads item references spanda, foolery, or buzz.

So the personal backlog does not feed spanda, and spanda tracking is unstarted. Installing `kno` is the prerequisite for spanda-side work items.

**Buzz nest is Mac-local.** `~/.buzz` exists only on the Mac (the desktop app scaffolds it); there is no server-side copy. Repos are **symlinked**, not cloned, per `AGENTS.md` ("work in an existing local checkout when one exists"), so agents operate on the real working trees.

## 8. Gaps / open items
- **Canvases**: no spanda or merchant-board primitive maps cleanly. Net-new; Setlist/Gantt is the closest surface.
- **Public/TLS**: deliberately skipped; add Caddy/TLS + DNS only if off-tailnet access is needed.
- **EC2 disk**: relay images + Postgres/MinIO volumes consume space; watch it (the VPS recently hit a full-disk gridlock).
- Source files cited above (`types.ts`, `workflows.ts`) are per the taxonomy docs, not yet read line-by-line; verify against source before locking the workflow YAML.
