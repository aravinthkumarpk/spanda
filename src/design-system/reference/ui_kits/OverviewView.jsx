/* global React, PriorityChip, StatePill, AgentChip */
const { useState: useOState } = React;

// Same beat data, grouped by workflow state for the kanban.
const STATE_COLUMNS = [
  { key: "Ready for planning",    label: "Ready for planning",    tint: "#e2f6d5" },
  { key: "Ready plan review",     label: "Ready plan review",     tint: "#e2f6d5" },
  { key: "Ready impl",            label: "Ready impl",            tint: "#e2f6d5" },
  { key: "Implementation",        label: "Implementation",        tint: "#fff4cc" },
  { key: "Impl review",           label: "Impl review",           tint: "#fff4cc" },
  { key: "Ready shipment",        label: "Ready shipment",        tint: "#e2f6d5" },
  { key: "Shipment",              label: "Shipment",              tint: "#fff4cc" },
];

function OverviewView({ onOpenBeat }) {
  return (
    <section style={{ padding: "20px 28px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <Tab active>Work items <Count>70</Count></Tab>
        <Tab>Exploration <Count>1</Count></Tab>
        <Tab>Gates <Count>6</Count></Tab>
        <Tab>Terminated <Count subdued>105</Count></Tab>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <Tab>Tags ▾</Tab>
          <Tab>Setlists ▾</Tab>
          <Tab>Stale beats <Count subdued>41</Count></Tab>
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
        gap: 12,
      }}>
        {STATE_COLUMNS.map(col => (
          <div key={col.key} style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
            <div style={{
              background: col.tint,
              padding: "8px 14px",
              borderRadius: 9999,
              fontSize: 13,
              fontWeight: 600,
              color: "#0e0f0c",
              alignSelf: "flex-start",
              maxWidth: "100%",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>{col.label}</div>
            <BeatsForColumn state={col.key} onOpenBeat={onOpenBeat} />
          </div>
        ))}
      </div>
    </section>
  );
}

function BeatsForColumn({ state, onOpenBeat }) {
  const beats = BEATS.filter(b => b.state === state).slice(0, 4);
  if (beats.length === 0) {
    return <div style={{ fontSize: 13, color: "#868685", padding: "8px 4px" }}>No beats</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {beats.map(b => (
        <OverviewCard key={b.id} beat={b} onClick={() => onOpenBeat(b)} />
      ))}
    </div>
  );
}

function OverviewCard({ beat, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: "#fff",
      borderRadius: 16,
      padding: 14,
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      minWidth: 0,
      transition: "transform 140ms ease-out",
    }}
    onMouseEnter={e => e.currentTarget.style.background = "#fdfffb"}
    onMouseLeave={e => e.currentTarget.style.background = "#fff"}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#454745", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>maestro-{beat.id}</span>
        <PriorityChip level={beat.prio} />
      </div>
      <div style={{
        fontSize: 14,
        fontWeight: 500,
        lineHeight: "20px",
        color: "#0e0f0c",
        overflowWrap: "anywhere",
        wordBreak: "break-word",
        minWidth: 0,
      }}>
        {beat.title}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", minWidth: 0 }}>
        {beat.tags.slice(0, 2).map(t => (
          <span key={t} style={{ fontSize: 11, color: "#454745", background: "#e8ebe6", padding: "1px 8px", borderRadius: 9999, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t}</span>
        ))}
      </div>
      {beat.agent ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2, minWidth: 0, overflow: "hidden" }}>
          <AgentChip name={beat.agent} />
        </div>
      ) : null}
      <div style={{ fontSize: 11, color: "#868685" }}>{beat.ago}</div>
    </div>
  );
}

function Tab({ active, children }) {
  return (
    <button style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: active ? "#9fe870" : "#fff",
      color: "#0e0f0c",
      border: active ? "0" : "1px solid rgba(14,15,12,0.10)",
      fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
      padding: "6px 12px",
      borderRadius: 9999,
      cursor: "pointer",
    }}>{children}</button>
  );
}

function Count({ children, subdued }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      minWidth: 22, height: 18,
      padding: "0 6px",
      background: subdued ? "rgba(14,15,12,0.08)" : "rgba(14,15,12,0.12)",
      borderRadius: 9999,
      fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600,
      color: "#0e0f0c",
    }}>{children}</span>
  );
}

Object.assign(window, { OverviewView });
