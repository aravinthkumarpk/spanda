/* global React, Icon */
const { useState: useStateHeader } = React;

function AppHeader({ activeView, onView, onAdd }) {
  const views = [
    { id: "setlist",     label: "Setlist",     icon: "setlist" },
    { id: "overview",    label: "Overview",    icon: "overview" },
    { id: "queues",      label: "Queues",      icon: "queues" },
    { id: "active",      label: "Active",      icon: "active" },
    { id: "escalations", label: "Escalations", icon: "escalations" },
    { id: "retakes",     label: "ReTakes",     icon: "retakes" },
    { id: "history",     label: "History",     icon: "history" },
    { id: "diag",        label: "Diagnostics", icon: "diag" },
  ];

  return (
    <header style={{
      background: "#fff",
      padding: "16px 28px 14px",
      borderBottom: "1px solid rgba(14,15,12,0.06)",
      display: "flex",
      flexDirection: "column",
      gap: 14,
    }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Wordmark */}
        <a href="#" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <img src="../../assets/spanda_mark.svg" width="32" height="32" alt="spanda" />
          <span style={{
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontSize: 30,
            letterSpacing: "-1.5px",
            color: "#0e0f0c",
            lineHeight: 1,
          }}>spanda</span>
        </a>

        {/* Version pill */}
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "#e2f6d5",
          color: "#054d28",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          fontWeight: 600,
          padding: "3px 10px",
          borderRadius: 9999,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: 9999, background: "#2ead4b", display: "inline-block" }}></span>
          v0.14.8
        </span>

        {/* Repo selector */}
        <button style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#fff", border: "1px solid #0e0f0c",
          padding: "8px 14px", borderRadius: 9999,
          fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600,
          color: "#0e0f0c", cursor: "pointer",
        }}>
          <Icon name="db" size={14} />
          maestro
          <Icon name="chevron" size={14} />
        </button>

        {/* Search */}
        <div style={{ position: "relative", flex: 1, maxWidth: 520 }}>
          <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#868685", display: "flex" }}>
            <Icon name="search" size={16} />
          </span>
          <input
            placeholder="Search beats…"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 16px 10px 42px",
              borderRadius: 9999,
              border: "1px solid rgba(14,15,12,0.10)",
              background: "#e8ebe6",
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              color: "#0e0f0c",
              outline: "none",
            }}
          />
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <button style={iconBtnStyle} aria-label="Terminal"><Icon name="terminal" /></button>
          <button style={iconBtnStyle} aria-label="Notifications"><Icon name="bell" /></button>
          <button style={iconBtnStyle} aria-label="Settings"><Icon name="settings" /></button>
        </div>
      </div>

      {/* Tabs row */}
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 2,
          background: "#e8ebe6", padding: 4, borderRadius: 9999,
        }}>
          {views.map(v => (
            <button
              key={v.id}
              onClick={() => onView(v.id)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600,
                padding: "8px 14px",
                borderRadius: 9999, border: 0,
                cursor: "pointer",
                background: activeView === v.id ? "#9fe870" : "transparent",
                color: "#0e0f0c",
                transition: "background 140ms ease-out",
              }}
            >
              <Icon name={v.icon} size={15} />
              {v.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }}></div>
        <button onClick={onAdd} style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#0e0f0c", color: "#9fe870",
          fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 600,
          padding: "10px 18px",
          borderRadius: 9999, border: 0, cursor: "pointer",
        }}>
          <Icon name="plus" size={16} /> Add
        </button>
      </div>
    </header>
  );
}

const iconBtnStyle = {
  width: 40, height: 40, padding: 0,
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  background: "#fff",
  color: "#0e0f0c",
  border: "1px solid rgba(14,15,12,0.10)",
  borderRadius: 9999,
  cursor: "pointer",
};

Object.assign(window, { AppHeader });
