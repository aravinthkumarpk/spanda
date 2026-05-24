/* global React, PriorityChip, AgentChip, StatePill, Icon, Badge */
const { useState: useQState, useMemo: useQMemo } = React;

const BEATS = [
  { id: "927e", prio: "P0", title: "Hetzner Go-Live: maestro post-AWS-shutdown execution plan", tags: ["hetzner-blocker","hetzner_migration"], profile: "Autopilot", owner: "Agent", state: "Ready for planning", ago: "23h ago", agent: null },
  { id: "0d2a", prio: "P1", title: "Test failure notification delivery end-to-end",            tags: ["hetzner_migration","hetzner-blocker"], profile: "Autopilot", owner: "Agent", state: "Ready for planning", ago: "23h ago", agent: null },
  { id: "824a", prio: "P1", title: "Set up systemd timer for Tue-Sat automated pipeline",      tags: ["hetzner_migration","hetzner-blocker"], profile: "Autopilot", owner: "Agent", state: "Ready impl",         ago: "23h ago", agent: "claude · opus 4.7" },
  { id: "11c1", prio: "P1", title: "Set up failure notifications",                              tags: ["hetzner_migration","hetzner-blocker"], profile: "Autopilot", owner: "Agent", state: "Implementation",     ago: "23h ago", agent: "claude · opus 4.7" },
  { id: "ca91", prio: "P2", title: "Set COMPUTE_PROVIDER=hetzner as production default",        tags: ["hetzner_migration","hetzner-blocker"], profile: "Autopilot", owner: "Agent", state: "Impl review",        ago: "23h ago", agent: "codex · gpt-5" },
  { id: "72c9", prio: "P2", title: "Run one provider-path Hetzner shard on CCX53",              tags: ["hetzner_migration","hetzner-blocker"], profile: "Autopilot", owner: "Agent", state: "Ready impl review",  ago: "23h ago", agent: null },
  { id: "32e7", prio: "P2", title: "Prepare provider-enabled checkout and shard inputs",        tags: ["hetzner_migration","hetzner-blocker"], profile: "Autopilot", owner: "Agent", state: "Ready impl",         ago: "23h ago", agent: null },
  { id: "7409", prio: "P2", title: "Default VENV_UPLOAD_BACKENDS=hetzner; AWS leg remains as opt-in", tags: ["hetzner_migration","tech_debt","hetzner-maestro-followup"], profile: "Autopilot", owner: "Agent", state: "Ready for planning", ago: "23h ago", agent: null },
  { id: "4137", prio: "P2", title: "Runtime guard enforces AWS-free Hetzner runs",              tags: ["hetzner_migration"], profile: "Semi-auto", owner: "Human", state: "Deferred",            ago: "1d ago",  agent: null },
  { id: "5493", prio: "P3", title: "VERIFY: Go/No-Go decision gate before production cutover",  tags: ["gate"], profile: "Autopilot", owner: "Human", state: "Blocked",             ago: "2d ago",  agent: null },
  { id: "e935", prio: "P0", title: "Fix active lease metadata refresh", tags: ["lease"], profile: "Autopilot", owner: "Agent", state: "Shipped", ago: "32m ago", agent: "claude · opus 4.7" },
];

function QueuesView({ onOpenBeat, onTake }) {
  const [filter, setFilter] = useQState("all");
  const [prioFilter, setPrioFilter] = useQState("all");

  const rows = useQMemo(() => BEATS.filter(b => {
    if (filter !== "all" && b.state !== filter) return false;
    if (prioFilter !== "all" && b.prio !== prioFilter) return false;
    return true;
  }), [filter, prioFilter]);

  return (
    <section style={{ padding: "20px 28px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <SelectChip value={filter} onChange={setFilter} options={[
          ["all","All states"],["Ready for planning","Ready for planning"],["Implementation","Implementation"],["Shipped","Shipped"],["Deferred","Deferred"],
        ]} />
        <SelectChip value={prioFilter} onChange={setPrioFilter} options={[
          ["all","All priorities"],["P0","P0 only"],["P1","P1 only"],["P2","P2 only"],["P3","P3 only"],
        ]} />
        <span style={{ marginLeft: "auto", fontSize: 13, color: "#868685" }}>{rows.length} beats</span>
      </div>

      {/* Table card: header inside, hairline divides header from body */}
      <div style={{ background: "#fff", borderRadius: 24, overflow: "hidden" }}>
        {/* Column header: transparent bg, hairline bottom border, reads as caption not frozen pane */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "24px 80px 56px minmax(0, 1fr) 160px 160px 96px",
          gap: 16, padding: "12px 18px",
          fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
          color: "#868685",
          background: "transparent",
          borderBottom: "1px solid rgba(14,15,12,0.08)",
        }}>
          <div></div>
          <div>ID</div>
          <div>Priority</div>
          <div>Title</div>
          <div>Profile · owner</div>
          <div>State</div>
          <div style={{ textAlign: "right" }}>Action</div>
        </div>

        {rows.map((b, i) => (
          <div
            key={b.id}
            onClick={() => onOpenBeat(b)}
            style={{
              display: "grid",
              gridTemplateColumns: "24px 80px 56px minmax(0, 1fr) 160px 160px 96px",
              gap: 16, padding: "16px 18px",
              borderBottom: i === rows.length - 1 ? 0 : "1px solid rgba(14,15,12,0.06)",
              alignItems: "center",
              cursor: "pointer",
              background: "transparent",
              transition: "background 140ms ease-out",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#f5f7f3"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <div style={{ width: 14, height: 14, border: "1.5px solid rgba(14,15,12,0.40)", borderRadius: 4 }}></div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#454745", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>maestro-{b.id}</div>
            <PriorityChip level={b.prio} />
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#0e0f0c",
                lineHeight: "20px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>{b.title}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "#868685" }}>{b.ago}</span>
                {b.tags.slice(0, 2).map(t => (
                  <span key={t} style={{ fontSize: 11, color: "#454745", background: "#eef0ec", padding: "1px 8px", borderRadius: 9999, whiteSpace: "nowrap" }}>{t}</span>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 13, color: "#454745", minWidth: 0, overflow: "hidden" }}>
              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <span style={{ fontWeight: 600, color: "#0e0f0c" }}>{b.profile}</span>
                <span style={{ color: "#868685" }}> · {b.owner}</span>
              </div>
              {b.agent ? <div style={{ marginTop: 4 }}><AgentChip name={b.agent} /></div> : null}
            </div>
            <div><StatePill state={b.state} /></div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={(e) => { e.stopPropagation(); onTake(b); }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "#9fe870", color: "#0e0f0c",
                  fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
                  padding: "7px 14px", borderRadius: 9999, border: 0, cursor: "pointer",
                }}
              >
                <Icon name="play" size={11} />
                Take!
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SelectChip({ value, onChange, options }) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          appearance: "none",
          background: "#fff",
          border: "1px solid rgba(14,15,12,0.10)",
          color: "#0e0f0c",
          fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600,
          padding: "8px 32px 8px 14px",
          borderRadius: 9999,
          cursor: "pointer",
        }}
      >
        {options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
      </select>
      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex" }}>
        <Icon name="chevron" size={14} />
      </span>
    </div>
  );
}

Object.assign(window, { QueuesView, BEATS });
