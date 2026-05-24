/* global React, PriorityChip, Icon */
const { useState: useSState } = React;

const WAVES = [
  {
    title: "Wave 1",
    subtitle: "Stop crashing on AWS",
    tint: "#f4eaff",
    beats: [
      { id: "461a", title: "Switch maestro defaults from brutus-data-prod to brutus-data-dev", row: 0, ok: true, prio: "P0" },
      { id: "8f0c", title: "Boto3 S3 clients receive endpoint per-client; no global AWS_ENDPOINT_URL export", row: 1, ok: true, prio: "P0" },
      { id: "78f5", title: "Remove predictor.env_loader.load_env and override behavior", row: 2, ok: true, prio: "P1" },
      { id: "08e9", title: "Extend RuntimeEnv boundary to src/predictor/ and scripts/hetzner/", row: 3, ok: true, prio: "P1" },
      { id: "4137", title: "Runtime guard enforces AWS-free Hetzner runs; AWS provider stays as dormant opt-in", row: 4, ok: false, prio: "P2" },
      { id: "314a", title: "Fail fast at preflight when instance_type contradicts COMPUTE_PROVIDER", row: 5, ok: true, prio: "P2" },
      { id: "7409", title: "Default VENV_UPLOAD_BACKENDS=hetzner; AWS leg remains as opt-in", row: 6, ok: false, prio: "P2" },
    ],
  },
  {
    title: "Wave 2",
    subtitle: "Single-shard validation on Hetzner",
    tint: "#eaf3f9",
    beats: [
      { id: "32e7", title: "Prepare provider-enabled checkout and shard inputs", row: 7, ok: true, prio: "P1" },
      { id: "72c9", title: "Run one provider-path Hetzner shard on CCX53", row: 8, ok: false, prio: "P1" },
    ],
  },
  {
    title: "Wave 3",
    subtitle: "Production wiring",
    tint: "#e6f5e3",
    beats: [
      { id: "ca91", title: "Set COMPUTE_PROVIDER=hetzner as production default", row: 9, ok: true, prio: "P1" },
      { id: "11c1", title: "Wire pipeline failure notifications to Slack via env-backed webhook", row: 10, ok: false, prio: "P1" },
      { id: "824a", title: "Set up systemd timer for Tue-Sat automated pipeline", row: 11, ok: false, prio: "P2" },
      { id: "0d2a", title: "Test failure notification delivery end-to-end", row: 12, ok: false, prio: "P1" },
    ],
  },
  {
    title: "Wave 4",
    subtitle: "Go-live gates",
    tint: "#f4eaff",
    beats: [
      { id: "5493", title: "VERIFY: Go/No-Go decision gate before production cutover", row: 13, ok: false, prio: "P0" },
      { id: "2123", title: "VERIFY: First automated Tue-Sat production run completes end-to-end", row: 14, ok: false, prio: "P0" },
    ],
  },
];

function SetlistView({ onOpenBeat, selectedBeatId, setSelectedBeatId }) {
  return (
    <section style={{ padding: "20px 28px 80px" }}>
      {/* Plan header card */}
      <div style={{ background: "#fff", borderRadius: 24, padding: 22, marginBottom: 18, display: "flex", alignItems: "flex-start", gap: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <Icon name="setlist" size={18} />
            <span style={{ fontWeight: 600, fontSize: 16 }}>Setlist</span>
            <span style={{
              background: "#9fe870", color: "#0e0f0c",
              fontWeight: 600, fontSize: 12,
              padding: "2px 10px", borderRadius: 9999,
              marginLeft: 8,
            }}>Selected</span>
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 12, color: "#454745" }}>maestro-927e</span>
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 28, lineHeight: 1.1, letterSpacing: "-0.5px", color: "#0e0f0c", marginBottom: 8 }}>
            Get maestro running daily on Hetzner with no AWS dependencies and the brutus 1-host-per-shard invariant restored.
          </div>
          <div style={{ fontSize: 14, color: "#454745", lineHeight: "20px", maxWidth: 720 }}>
            Execution plan for going AWS-free on Hetzner. 4 waves · 14 beats · ETA Tue-Sat.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <span style={{ background: "#e8ebe6", padding: "4px 12px", borderRadius: 9999, fontSize: 13, fontWeight: 600 }}>4 remaining</span>
            <span style={{ background: "#e8ebe6", padding: "4px 12px", borderRadius: 9999, fontSize: 13, fontWeight: 600 }}>groom</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <span style={{ background: "#fff", border: "1px solid rgba(14,15,12,0.10)", padding: "6px 14px", borderRadius: 9999, fontSize: 13, fontWeight: 600 }}>1 plan</span>
          <span style={{ fontSize: 12, color: "#868685" }}>Steps 2–13 of 13</span>
        </div>
      </div>

      {/* Wave grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0,1fr))",
        gap: 10,
        position: "relative",
      }}>
        {WAVES.map(w => (
          <div key={w.title} style={{
            background: w.tint,
            borderRadius: 16,
            padding: 14,
            minHeight: 480,
            position: "relative",
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#454745" }}>{w.title}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#0e0f0c", marginBottom: 14 }}>{w.subtitle}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {w.beats.map(b => (
                <BeatCard
                  key={b.id}
                  beat={b}
                  selected={selectedBeatId === b.id}
                  onClick={() => { setSelectedBeatId(b.id); onOpenBeat?.(b); }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BeatCard({ beat, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        borderRadius: 8,
        padding: "8px 10px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        outline: selected ? "2px solid #9fe870" : "0",
        outlineOffset: selected ? "1px" : "0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#454745", textDecoration: beat.ok ? "line-through" : "none", opacity: beat.ok ? 0.6 : 1 }}>
          maestro-{beat.id}
        </span>
        {beat.ok ? <Icon name="check" size={12} /> : <PriorityChip level={beat.prio} />}
      </div>
      <div style={{ fontSize: 12, lineHeight: "16px", color: "#0e0f0c", opacity: beat.ok ? 0.55 : 1 }}>
        {beat.title}
      </div>
    </div>
  );
}

Object.assign(window, { SetlistView });
