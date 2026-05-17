// Header.jsx — Sticky brand header + nav + logout.
function Header({ active = "rooms", onNav, onLogout }) {
  const links = [
    { id: "rooms",   label: "Rooms" },
    { id: "reserve", label: "Reserve" },
    { id: "my",      label: "My Reservations" },
    { id: "scan",    label: "Scan QR" },
  ];
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 40,
      background: "var(--header-bg)",
      backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
      borderBottom: "1px solid var(--line)",
    }}>
      <div style={{
        width: "min(1200px, calc(100% - 40px))", margin: "0 auto",
        minHeight: "var(--header-h)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
        padding: "12px 0",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            width: 44, height: 44, borderRadius: 12, background: "#fff",
            border: "1px solid var(--accent-line)",
            boxShadow: "0 12px 25px var(--accent-glow)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            padding: 3, overflow: "hidden", flex: "0 0 auto",
          }}>
            <img src="../../assets/roomlink-logo.png" alt="RoomLink"
                 style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 9 }} />
          </span>
          <div>
            <div style={{ font: "var(--t-h4)", letterSpacing: "var(--ls-tight)", fontWeight: 700 }}>RoomLink</div>
            <div style={{ font: "var(--t-small)", color: "var(--muted)" }}>
              QR‑Integrated University Room Reservation System
            </div>
          </div>
        </div>

        <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {links.map(l => (
            <a key={l.id} href="#"
               onClick={e => { e.preventDefault(); onNav && onNav(l.id); }}
               style={{
                 padding: "8px 14px", borderRadius: "var(--r-pill)",
                 font: "var(--t-body-strong)", fontSize: 14,
                 color: active === l.id ? "var(--accent)" : "var(--muted)",
                 background: active === l.id ? "var(--accent-soft)" : "transparent",
                 textDecoration: "none",
                 transition: "all var(--dur-base) var(--ease-out)",
               }}>{l.label}</a>
          ))}
          <button
            onClick={onLogout}
            style={{
              marginLeft: 8, height: 36, padding: "0 14px",
              borderRadius: "var(--r-pill)", border: "1px solid var(--line)",
              background: "var(--surface)", color: "var(--text)",
              font: "var(--t-body-strong)", fontSize: 13, cursor: "pointer",
              boxShadow: "var(--shadow-xs)",
            }}>Logout</button>
        </nav>
      </div>
    </header>
  );
}

Object.assign(window, { Header });
