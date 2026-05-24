/* global React, Icon */
const { useState: useTAState } = React;

function TakeABeatCard({ onClose, onStage }) {
  const [title, setTitle] = useTAState("Fix stale grooming queue cutoff");
  const [prio, setPrio] = useTAState("P1");
  const [profile, setProfile] = useTAState("Autopilot");

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
          background: "#fff",
          border: "1px solid #0e0f0c",
          borderRadius: 24,
          padding: 28,
          width: "min(460px, 100%)",
          display: "flex", flexDirection: "column", gap: 18,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#454745" }}>Take a beat</span>
          <button onClick={onClose} aria-label="Close" style={{
            width: 32, height: 32, padding: 0, border: 0,
            background: "transparent", color: "#0e0f0c", cursor: "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}><Icon name="close" size={16} /></button>
        </div>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="What needs doing?"
          style={{
            fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 26,
            lineHeight: "30px", letterSpacing: "-0.5px",
            border: 0, outline: 0, padding: 0,
            color: "#0e0f0c", background: "transparent",
            width: "100%",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 4, borderTop: "1px solid rgba(14,15,12,0.08)" }}>
          <Field label="Priority">
            <Segmented
              options={["P0","P1","P2","P3"]}
              value={prio}
              onChange={setPrio}
            />
          </Field>
          <Field label="Profile">
            <Segmented
              options={["Autopilot","Semi-auto","PR"]}
              value={profile}
              onChange={setProfile}
            />
          </Field>
          <Field label="Agent pool">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={chipStyle}>claude · opus 4.7</span>
              <span style={chipStyle}>codex · gpt-5</span>
              <span style={addChipStyle}>+ add</span>
            </div>
          </Field>
        </div>

        <button onClick={onStage} style={{
          background: "#9fe870", color: "#0e0f0c",
          fontFamily: "var(--font-sans)", fontSize: 16, fontWeight: 600,
          padding: "14px 16px", borderRadius: 9999, border: 0, cursor: "pointer",
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          Stage as ready <Icon name="arrow" size={14} />
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 13, color: "#454745", fontWeight: 500 }}>{label}</span>
      {children}
    </div>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: "inline-flex", background: "#e8ebe6", borderRadius: 9999, padding: 3, gap: 2 }}>
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)} style={{
          padding: "5px 14px",
          background: value === o ? "#fff" : "transparent",
          color: "#0e0f0c",
          border: 0, borderRadius: 9999,
          fontSize: 13, fontWeight: 600,
          cursor: "pointer",
        }}>{o}</button>
      ))}
    </div>
  );
}

const chipStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "#454745",
  background: "#e8ebe6",
  padding: "4px 10px",
  borderRadius: 9999,
};

const addChipStyle = {
  ...chipStyle,
  background: "transparent",
  border: "1px dashed rgba(14,15,12,0.30)",
  cursor: "pointer",
};

Object.assign(window, { TakeABeatCard });
