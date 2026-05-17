// ReservationForm.jsx — Room + date + 2-hour slot picker.
function ReservationForm({ rooms, defaultRoomId, onBack, onSubmit }) {
  const [roomId, setRoomId] = React.useState(defaultRoomId || (rooms[0] && rooms[0].id));
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = React.useState(null);

  const slots = React.useMemo(() => makeSlots(roomId, date), [roomId, date]);

  function submit(e) {
    e.preventDefault();
    if (!slot) return;
    onSubmit && onSubmit({ roomId, date, slot });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.9fr", gap: 18 }}>
      <form onSubmit={submit} style={card}>
        <div>
          <span className="eyebrow">Form Details</span>
          <h3 style={{ margin: "8px 0 14px" }}>Reservation Information</h3>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={lbl}>Room</label>
            <select value={roomId} onChange={e => { setRoomId(Number(e.target.value)); setSlot(null); }}
                    style={inp}>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Reservation Date</label>
            <input type="date" value={date} onChange={e => { setDate(e.target.value); setSlot(null); }}
                   style={inp} />
          </div>
        </div>

        <div style={{
          marginTop: 14, border: "1px solid var(--line)",
          borderRadius: 10, background: "var(--surface-2)", padding: 14,
        }}>
          <h4 style={{ margin: 0 }}>Available Time Slots</h4>
          <p style={{ margin: "4px 0 10px", color: "var(--muted)", font: "var(--t-small)" }}>
            Select one slot for this room on the chosen date.
          </p>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8,
          }}>
            {slots.map(s => {
              const active = slot && slot.start === s.start;
              return (
                <button type="button" key={s.start}
                  disabled={!s.available}
                  onClick={() => setSlot(s)}
                  style={{
                    textAlign: "left", padding: "10px 12px",
                    border: `1px solid ${active ? "var(--accent-line)" : "var(--line)"}`,
                    borderRadius: 8,
                    background: active ? "var(--accent-soft)" : "var(--surface)",
                    color: active ? "var(--accent)" : (s.available ? "var(--text)" : "var(--muted)"),
                    cursor: s.available ? "pointer" : "not-allowed",
                    opacity: s.available ? 1 : 0.55,
                    font: "var(--t-body-strong)", fontSize: 13,
                  }}>
                  {s.start} – {s.end}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button type="submit" disabled={!slot}
            style={{ ...btnPrimary, opacity: slot ? 1 : 0.55, cursor: slot ? "pointer" : "not-allowed" }}>
            Submit Reservation
          </button>
          <button type="button" onClick={onBack} style={btnSecondary}>Back to Rooms</button>
        </div>
      </form>

      <aside style={card}>
        <span className="eyebrow">Summary</span>
        <h3 style={{ margin: "8px 0 14px" }}>Your selection</h3>
        <SummaryRow label="Room"
                    value={rooms.find(r => r.id === roomId)?.name || "—"} />
        <SummaryRow label="Date" value={date} />
        <SummaryRow label="Slot" value={slot ? `${slot.start} – ${slot.end}` : "Pick a slot"} />
        <p style={{ color: "var(--muted)", font: "var(--t-small)", marginTop: 14 }}>
          The reservation will use the selected room, date, and available slot only.
        </p>
      </aside>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center",
      padding: "10px 0", borderTop: "1px solid var(--line)",
    }}>
      <span style={{ color: "var(--muted)", font: "var(--t-small)" }}>{label}</span>
      <strong style={{ font: "var(--t-body-strong)" }}>{value}</strong>
    </div>
  );
}

function makeSlots(roomId, date) {
  // 8 → 22 in 2h slots, with a stable pseudo-random availability.
  const seed = (Number(roomId) * 7) + (date ? date.charCodeAt(date.length - 1) : 0);
  const out = [];
  for (let h = 8; h <= 20; h += 2) {
    const idx = (h + seed) % 5;
    out.push({
      start: `${String(h).padStart(2, "0")}:00`,
      end:   `${String(h + 2).padStart(2, "0")}:00`,
      available: idx !== 0 && idx !== 3,
    });
  }
  return out;
}

const card = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 22, boxShadow: "var(--shadow-sm)" };
const lbl = { font: "var(--t-label)", display: "block", marginBottom: 6 };
const inp = { width: "100%", height: 44, border: "1px solid var(--line)", borderRadius: 10, padding: "0 12px", background: "var(--surface)", color: "var(--text)", font: "var(--t-body)" };
const btnPrimary = { border: 0, minHeight: 42, padding: "0 18px", borderRadius: 10, background: "var(--accent)", color: "var(--on-accent)", font: "var(--t-body-strong)", cursor: "pointer", boxShadow: "var(--shadow-glow)" };
const btnSecondary = { border: "1px solid var(--line)", minHeight: 42, padding: "0 18px", borderRadius: 10, background: "var(--surface)", color: "var(--text)", font: "var(--t-body-strong)", cursor: "pointer" };

Object.assign(window, { ReservationForm });
