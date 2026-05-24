/* global React */
const { useState } = React;

// Shared atoms used across every spanda surface.

function Badge({ children, variant = "neutral", style }) {
  const variants = {
    neutral:  { background: "#e8ebe6", color: "#0e0f0c" },
    positive: { background: "#e2f6d5", color: "#054d28" },
    warning:  { background: "#fff4cc", color: "#4a3b1c" },
    negative: { background: "#320707", color: "#fff" },
    info:     { background: "#fff", color: "#0e0f0c", border: "1px solid rgba(14,15,12,0.10)" },
  };
  return (
    <span style={{
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fontSize: 13,
      lineHeight: "18px",
      padding: "3px 10px",
      borderRadius: 9999,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      whiteSpace: "nowrap",
      ...variants[variant],
      ...style,
    }}>
      {children}
    </span>
  );
}

function PriorityChip({ level }) {
  const styles = {
    P0: { background: "#fce8e9", color: "#a72027" },
    P1: { background: "#fff4cc", color: "#4a3b1c" },
    P2: { background: "#e8ebe6", color: "#0e0f0c" },
    P3: { background: "#fff",   color: "#454745", border: "1px solid rgba(14,15,12,0.10)" },
  };
  return (
    <span style={{
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      fontWeight: 600,
      padding: "2px 9px",
      borderRadius: 8,
      display: "inline-block",
      textAlign: "center",
      minWidth: 24,
      ...styles[level],
    }}>{level}</span>
  );
}

function AgentChip({ name }) {
  return (
    <span style={{
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "#454745",
      background: "#fff",
      border: "1px solid rgba(14,15,12,0.10)",
      padding: "2px 8px",
      borderRadius: 9999,
      whiteSpace: "nowrap",
    }}>{name}</span>
  );
}

function StatePill({ state }) {
  const map = {
    "Ready for planning":     { variant: "positive" },
    "Planning":               { variant: "warning" },
    "Ready plan review":      { variant: "positive" },
    "Ready impl":             { variant: "positive" },
    "Implementation":         { variant: "warning" },
    "Ready impl review":      { variant: "positive" },
    "Impl review":            { variant: "warning" },
    "Ready shipment":         { variant: "positive" },
    "Shipment":               { variant: "warning" },
    "Shipped":                { variant: "positive", dot: "#2ead4b" },
    "Blocked":                { variant: "negative" },
    "Deferred":               { variant: "neutral" },
  };
  const cfg = map[state] || { variant: "neutral" };
  return (
    <Badge variant={cfg.variant}>
      {cfg.dot ? <span style={{ width: 7, height: 7, borderRadius: 9999, background: cfg.dot, display: "inline-block" }}></span> : null}
      {state}
    </Badge>
  );
}

function IconBtn({ children, label, onClick, active }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      style={{
        width: 40, height: 40, padding: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: active ? "#e8ebe6" : "#fff",
        color: "#0e0f0c",
        border: "1px solid rgba(14,15,12,0.10)",
        borderRadius: 9999,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

// Lightweight icon set, copies the lucide line geometry we need.
function Icon({ name, size = 16 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const paths = {
    setlist:    <><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>,
    overview:   <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    queues:     <><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></>,
    active:     <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
    escalations:<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    retakes:    <><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></>,
    history:    <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    diag:       <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    plus:       <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    search:     <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    bell:       <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    settings:   <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    monitor:    <><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>,
    db:         <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>,
    chevron:    <polyline points="6 9 12 15 18 9"/>,
    play:       <polygon points="5 3 19 12 5 21 5 3"/>,
    take:       <><polyline points="14 9 17 12 14 15"/><path d="M5 12h12"/><path d="M19 4v16"/></>,
    close:      <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    cmd:        <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>,
    terminal:   <><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></>,
    check:      <polyline points="20 6 9 17 4 12"/>,
    arrow:      <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

Object.assign(window, { Badge, PriorityChip, AgentChip, StatePill, IconBtn, Icon });
