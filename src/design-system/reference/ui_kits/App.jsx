/* global React, ReactDOM, AppHeader, QueuesView, OverviewView, SetlistView, BeatDetail, TakeABeatCard, TerminalPanel, Icon */
const { useState, useCallback } = React;

function App() {
  const [view, setView] = useState("queues");
  const [openBeat, setOpenBeat] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [selectedSetlistId, setSelectedSetlistId] = useState("8f0c");

  const handleTake = useCallback((beat) => {
    setOpenBeat(null);
    setTerminalOpen(true);
    // Visual cue: in a real app this would start a session and push it to the active terminal tab.
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-page)", paddingBottom: terminalOpen ? 320 : 56 }} data-screen-label={`spanda · ${view}`}>
      <AppHeader
        activeView={view}
        onView={setView}
        onAdd={() => setShowAdd(true)}
      />

      {view === "queues"   && <QueuesView   onOpenBeat={setOpenBeat} onTake={handleTake} />}
      {view === "overview" && <OverviewView onOpenBeat={setOpenBeat} />}
      {view === "setlist"  && <SetlistView  onOpenBeat={setOpenBeat} selectedBeatId={selectedSetlistId} setSelectedBeatId={setSelectedSetlistId} />}
      {view === "active"      && <Placeholder name="Active"      hint="Beats with a live agent session. Same row primitive as Queues, filtered to wf:state=*active*." />}
      {view === "escalations" && <Placeholder name="Escalations" hint="Approval gates and human-action queue." />}
      {view === "retakes"     && <Placeholder name="ReTakes"     hint="Review lane for shipped beats. Click in to inspect what changed." />}
      {view === "history"     && <Placeholder name="History"     hint="Past agent sessions with full conversation logs." />}
      {view === "diag"        && <Placeholder name="Diagnostics" hint="Runtime perf + lease health." />}

      {openBeat && <BeatDetail beat={openBeat} onClose={() => setOpenBeat(null)} onTake={handleTake} />}
      {showAdd && <TakeABeatCard onClose={() => setShowAdd(false)} onStage={() => { setShowAdd(false); setTerminalOpen(true); }} />}

      <TerminalPanel open={terminalOpen} onToggle={() => setTerminalOpen(o => !o)} />
    </div>
  );
}

function Placeholder({ name, hint }) {
  return (
    <section style={{ padding: "60px 28px" }}>
      <div style={{
        background: "#fff",
        borderRadius: 24,
        padding: "44px 32px",
        textAlign: "center",
        maxWidth: 580,
        margin: "0 auto",
        display: "flex", flexDirection: "column", gap: 14, alignItems: "center",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 9999,
          background: "#e2f6d5",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="arrow" size={22} />
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 32, letterSpacing: "-0.5px" }}>{name}</div>
        <div style={{ fontSize: 15, color: "#454745", maxWidth: 380, lineHeight: "22px" }}>{hint}</div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#868685", marginTop: 6 }}>extends Queues with a state filter, same primitives</span>
      </div>
    </section>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
