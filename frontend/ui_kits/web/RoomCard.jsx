// RoomCard.jsx — Single room card in the rooms grid.
function RoomCard({ room, onReserve, onDetails }) {
  const available = room.status === "available";
  return (
    <article style={{
      background: "var(--surface)", border: "1px solid var(--line)",
      borderRadius: "var(--r-lg)", padding: 20,
      boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 8,
      transition: "transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out)",
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.borderColor = "var(--accent-line)"; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; e.currentTarget.style.borderColor = "var(--line)"; }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <h3>{room.name}</h3>
        <StatPill tone={available ? "success" : "danger"}>
          {available ? "Available" : "Busy"}
        </StatPill>
      </div>
      <p style={{ color: "var(--muted)", font: "var(--t-small)" }}>{room.type}</p>
      <div style={{
        display: "flex", gap: 14, color: "var(--muted)", font: "var(--t-small)",
        marginTop: 4,
      }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Icon name="users" size={14} />{room.capacity} seats
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Icon name="map-pin" size={14} />{room.location}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          disabled={!available}
          onClick={() => onReserve && onReserve(room)}
          style={{
            border: 0, height: 36, padding: "0 14px",
            borderRadius: "var(--r-md)",
            background: "var(--accent)", color: "var(--on-accent)",
            font: "var(--t-body-strong)", fontSize: 13, cursor: available ? "pointer" : "not-allowed",
            opacity: available ? 1 : 0.55,
            boxShadow: available ? "var(--shadow-glow)" : "none",
          }}>Reserve</button>
        <button
          onClick={() => onDetails && onDetails(room)}
          style={{
            height: 36, padding: "0 14px",
            borderRadius: "var(--r-md)", border: "1px solid var(--line)",
            background: "var(--surface)", color: "var(--text)",
            font: "var(--t-body-strong)", fontSize: 13, cursor: "pointer",
          }}>Details</button>
      </div>
    </article>
  );
}

Object.assign(window, { RoomCard });
