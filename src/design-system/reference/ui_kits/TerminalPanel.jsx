/* global React, Icon */
const { useState: useTState, useEffect: useTEffect, useRef: useTRef } = React;

const TRANSCRIPT_LINES = [
  { kind: "cmd",    text: "$ kno take maestro-927e --agent claude --model opus-4.7" },
  { kind: "dim",    text: "  → claim acquired (lease k1f3)" },
  { kind: "dim",    text: "  → workflow: autopilot · step: planning" },
  { kind: "arrow",  text: "→ Reading TAXONOMY.md and beats/scope.md" },
  { kind: "arrow",  text: "→ Drafting plan: 4 waves, 14 beats" },
  { kind: "out",    text: "Plan saved. handoff_capsule attached." },
  { kind: "dim",    text: "  turn.completed (is_error: false)" },
  { kind: "cmd",    text: "$ kno next maestro-927e" },
  { kind: "dim",    text: "  → ready_for_plan_review → plan_review" },
  { kind: "arrow",  text: "→ Reviewing plan against acceptance criteria…" },
];

function TerminalPanel({ open, onToggle }) {
  return (
    <div style={{
      position: "fixed", left: 0, right: 0, bottom: 0,
      background: "#0e0f0c",
      borderTop: "1px solid rgba(159,232,112,0.18)",
      color: "#e8ebe6",
      fontFamily: "var(--font-mono)",
      transition: "transform 220ms ease-out",
      transform: open ? "translateY(0)" : "translateY(calc(100% - 44px))",
      zIndex: 60,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <TerminalTab active>maestro-242a · Honor knots-e2e over claim_id collisions</TerminalTab>
        <TerminalTab>maestro-e1e2 · Preserve tag casing</TerminalTab>
        <TerminalTab>maestro-e935 · Fix active lease metadata refresh</TerminalTab>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "#868685" }}>claude · opus 4.7 · 10m 20s</span>
          <button onClick={onToggle} aria-label="Toggle terminal" style={{
            background: "transparent", border: 0, color: "#9fe870", cursor: "pointer",
            fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            <Icon name="chevron" size={14} /> {open ? "Hide" : "Show"}
          </button>
        </span>
      </div>
      {/* Transcript */}
      <div style={{ padding: "12px 22px 18px", maxHeight: 240, overflow: "auto", fontSize: 13, lineHeight: "20px" }}>
        {TRANSCRIPT_LINES.map((l, i) => {
          let color = "#e8ebe6";
          if (l.kind === "cmd")   color = "#9fe870";
          if (l.kind === "arrow") color = "#cdffad";
          if (l.kind === "dim")   color = "rgba(232,235,230,0.55)";
          return <div key={i} style={{ color, whiteSpace: "pre-wrap" }}>{l.text}</div>;
        })}
        <div style={{ color: "#9fe870" }}>$ <span style={{ color: "#e8ebe6", borderRight: "2px solid #9fe870", paddingRight: 2 }}> </span></div>
      </div>
    </div>
  );
}

function TerminalTab({ active, children }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "4px 12px",
      background: active ? "rgba(159,232,112,0.16)" : "transparent",
      color: active ? "#cdffad" : "#868685",
      border: active ? "1px solid rgba(159,232,112,0.30)" : "1px solid transparent",
      borderRadius: 9999,
      fontSize: 12, fontWeight: 500,
      maxWidth: 280, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    }}>{children}</span>
  );
}

Object.assign(window, { TerminalPanel });
