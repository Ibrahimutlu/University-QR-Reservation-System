// Hero.jsx — Rooms-page hero with eyebrow, heading, two stats.
function Hero({ totalRooms = 24, available = 11, onBrowse, onReserve }) {
  return (
    <section style={{
      background: "linear-gradient(180deg, var(--accent-tint), transparent 70%)",
      borderRadius: "var(--r-xl)", padding: 32, border: "1px solid var(--line)",
      display: "grid", gridTemplateColumns: "1.4fr 0.8fr", gap: 28, alignItems: "center",
    }}>
      <div>
        <span className="eyebrow">Room List</span>
        <h2 className="display" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", margin: "10px 0 8px" }}>
          Find and reserve university rooms.
        </h2>
        <p style={{ color: "var(--muted)", maxWidth: 520 }}>
          Browse rooms and start a reservation directly from a single
          streamlined flow.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button onClick={onBrowse} style={btnPrimary}>Browse Rooms</button>
          <button onClick={onReserve} style={btnSecondary}>Reserve a Room</button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Stat n={totalRooms} label="Total Rooms" />
        <Stat n={available} label="Bookable Rooms" />
      </div>
    </section>
  );
}

function Stat({ n, label }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--line)",
      borderRadius: "var(--r-lg)", padding: "18px 16px",
      boxShadow: "var(--shadow-xs)",
    }}>
      <div style={{
        font: "var(--t-display)", fontSize: "2.4rem", letterSpacing: "var(--ls-display)",
        color: "var(--accent)",
      }}>{n}</div>
      <div style={{ color: "var(--muted)", font: "var(--t-small)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

const btnPrimary = {
  border: 0, minHeight: 42, padding: "0 18px",
  borderRadius: "var(--r-md)", background: "var(--accent)", color: "var(--on-accent)",
  font: "var(--t-body-strong)", cursor: "pointer", boxShadow: "var(--shadow-glow)",
  display: "inline-flex", alignItems: "center", gap: 6,
};
const btnSecondary = {
  border: "1px solid var(--line)", minHeight: 42, padding: "0 18px",
  borderRadius: "var(--r-md)", background: "var(--surface)", color: "var(--text)",
  font: "var(--t-body-strong)", cursor: "pointer", boxShadow: "var(--shadow-xs)",
};

Object.assign(window, { Hero });
