/* global React, Icon, StatePill, PriorityChip, AgentChip */
const { useState: useBDState } = React;

function BeatDetail({ beat, onClose, onTake }) {
  if (!beat) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(14,15,12,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 80, padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 24,
          width: "min(820px, 100%)", maxHeight: "82vh",
          overflow: "auto",
          boxShadow: "0 20px 50px -12px rgba(14,15,12,0.30), 0 4px 12px -4px rgba(14,15,12,0.10)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "22px 28px 14px", display: "flex", flexDirection: "column", gap: 12, borderBottom: "1px solid rgba(14,15,12,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#454745" }}>maestro-{beat.id}</span>
            <PriorityChip level={beat.prio} />
            <StatePill state={beat.state} />
            <button onClick={onClose} aria-label="Close" style={{
              marginLeft: "auto", width: 36, height: 36,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              border: "1px solid rgba(14,15,12,0.10)",
              background: "#fff", borderRadius: 9999, cursor: "pointer",
            }}><Icon name="close" size={16} /></button>
          </div>
          <h2 style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontSize: 32,
            lineHeight: 1.1,
            letterSpacing: "-0.5px",
            color: "#0e0f0c",
          }}>{beat.title}</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {beat.tags.map(t => (
              <span key={t} style={{ fontSize: 12, color: "#454745", background: "#e8ebe6", padding: "3px 10px", borderRadius: 9999 }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Two-column body */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 0 }}>
          {/* Left: meta */}
          <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 22 }}>
            <Section eyebrow="Description">
              <p style={{ margin: 0, fontSize: 15, lineHeight: "22px", color: "#0e0f0c" }}>
                Coordinates every hetzner-blocker knot needed to ship maestro on Hetzner now that AWS (S3 + EC2) is shut down and upstream apps publish to Hetzner Object Storage.
              </p>
              <ol style={{ margin: "12px 0 0 18px", padding: 0, fontSize: 14, color: "#454745", lineHeight: "22px" }}>
                <li>Maestro must run on Hetzner without any AWS API call (S3 / EC2).</li>
                <li>1-host-per-shard invariant restored before going daily.</li>
                <li>Tue-Sat automated pipeline with end-to-end failure notifications.</li>
              </ol>
            </Section>

            <Section eyebrow="Acceptance criteria">
              <ul style={{ margin: 0, padding: "0 0 0 18px", fontSize: 14, color: "#0e0f0c", lineHeight: "22px" }}>
                <li>Zero AWS API calls observed in 7-day trace.</li>
                <li>Pipeline succeeds on every Tue/Sat run for 2 consecutive weeks.</li>
                <li>Slack notification fires within 60s of failure.</li>
              </ul>
            </Section>

            <Section eyebrow="Handoff capsules">
              <div style={{ background: "#e2f6d5", padding: 12, borderRadius: 12, fontSize: 13, color: "#054d28" }}>
                <strong>plan → impl</strong> · 23h ago · claude opus 4.7<br />
                4 waves, 14 beats. Wave 1 unblocks AWS shutdown, Wave 4 is the go-live gate.
              </div>
            </Section>
          </div>

          {/* Right: agent dispatch panel */}
          <div style={{ padding: "20px 24px", background: "#e8ebe6", display: "flex", flexDirection: "column", gap: 18 }}>
            <Section eyebrow="Workflow">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Field label="Profile" value="Autopilot" />
                <Field label="Owner" value="Agent" />
                <Field label="Created" value="23h ago" />
                <Field label="Lease" value="None" muted />
              </div>
            </Section>

            <Section eyebrow="Dispatch">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <AgentChip name="claude · opus 4.7" />
                  <span style={{ fontSize: 12, color: "#868685", marginLeft: "auto" }}>weight 60</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <AgentChip name="codex · gpt-5" />
                  <span style={{ fontSize: 12, color: "#868685", marginLeft: "auto" }}>weight 30</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <AgentChip name="gemini · 2.5-pro" />
                  <span style={{ fontSize: 12, color: "#868685", marginLeft: "auto" }}>weight 10</span>
                </div>
              </div>
            </Section>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
              <button onClick={() => onTake(beat)} style={{
                background: "#9fe870", color: "#0e0f0c",
                fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 600,
                padding: "12px 16px", borderRadius: 9999, border: 0, cursor: "pointer",
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                <Icon name="play" size={14} /> Take!
              </button>
              <button style={{
                background: "#0e0f0c", color: "#9fe870",
                fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 600,
                padding: "12px 16px", borderRadius: 9999, border: 0, cursor: "pointer",
              }}>
                Run a scene
              </button>
              <button style={{
                background: "#fff", color: "#0e0f0c",
                fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600,
                padding: "10px 16px", borderRadius: 9999, border: "1px solid #0e0f0c", cursor: "pointer",
              }}>
                Close beat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ eyebrow, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#868685" }}>{eyebrow}</div>
      {children}
    </div>
  );
}

function Field({ label, value, muted }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <span style={{ fontSize: 13, color: "#454745" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: muted ? "#868685" : "#0e0f0c" }}>{value}</span>
    </div>
  );
}

Object.assign(window, { BeatDetail });
