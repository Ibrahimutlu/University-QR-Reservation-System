// ScanPanel.jsx — QR scanner with mode toggle.
function ScanPanel({ onResult }) {
  const [mode, setMode] = React.useState("checkin");
  const [manual, setManual] = React.useState("");
  const [result, setResult] = React.useState(null);
  const [active, setActive] = React.useState(false);

  function run(payload) {
    const granted = !payload || !payload.toLowerCase().includes("deny");
    const r = {
      granted,
      room: "Conference Hall A",
      mode,
      at: new Date().toLocaleTimeString(),
      payload: payload || "RRS-ROOM-104-2DAA",
    };
    setResult(r);
    onResult && onResult(r);
  }

  return (
    <div style={{ display: "grid", gap: 18, maxWidth: 720, margin: "0 auto" }}>
      <div>
        <span className="eyebrow">QR Scanner</span>
        <h2 style={{ margin: "8px 0 4px" }}>Room Entry Scanner</h2>
        <p style={{ color: "var(--muted)" }}>
          Choose check‑in or check‑out before scanning the current room QR.
        </p>
      </div>

      <div style={{
        display: "inline-flex", alignSelf: "center",
        background: "var(--surface)", border: "1px solid var(--line)",
        borderRadius: "var(--r-pill)", padding: 4,
      }}>
        {[
          { id: "checkin",  label: "Check In" },
          { id: "break",    label: "Start Break" },
          { id: "checkout", label: "Check Out" },
        ].map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            style={{
              border: 0, padding: "8px 18px",
              font: "var(--t-body-strong)", fontSize: 14,
              borderRadius: "var(--r-pill)",
              background: mode === m.id ? "var(--accent)" : "transparent",
              color: mode === m.id ? "#fff" : "var(--muted)",
              cursor: "pointer",
              transition: "background var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out)",
            }}>{m.label}</button>
        ))}
      </div>

      <article style={{
        background: "var(--surface)", border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)", padding: 22, boxShadow: "var(--shadow-sm)",
      }}>
        <div style={{
          aspectRatio: "5/3", border: "1px solid var(--line)", borderRadius: 10,
          background: active ? "radial-gradient(circle at center, rgba(11,127,117,.15), transparent 60%), #0a1416" : "var(--surface-2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: active ? "#9bd9c8" : "var(--muted)", font: "var(--t-small)",
          overflow: "hidden", position: "relative",
        }}>
          {active ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="scan-line" size={28} />
              <span>Scanning… point at the room QR.</span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="qr-code" size={28} />
              <span>Camera off. Click Start to scan.</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "center", flexWrap: "wrap" }}>
          {!active ? (
            <button onClick={() => setActive(true)}
              style={{ border: 0, height: 40, padding: "0 18px", borderRadius: 10,
                       background: "var(--accent)", color: "#fff", font: "var(--t-body-strong)",
                       cursor: "pointer", boxShadow: "var(--shadow-glow)" }}>Start Camera</button>
          ) : (
            <button onClick={() => setActive(false)}
              style={{ height: 40, padding: "0 18px", borderRadius: 10,
                       border: "1px solid var(--line)", background: "var(--surface)",
                       color: "var(--text)", font: "var(--t-body-strong)", cursor: "pointer" }}>Stop Camera</button>
          )}
          <button onClick={() => run()}
            style={{ height: 40, padding: "0 18px", borderRadius: 10,
                     border: "1px solid var(--line)", background: "var(--surface)",
                     color: "var(--text)", font: "var(--t-body-strong)", cursor: "pointer" }}>
            Demo Scan
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
          <input value={manual} onChange={e => setManual(e.target.value)}
                 placeholder="Paste QR value manually"
                 style={{ flex: "1 1 220px", height: 40, padding: "0 14px",
                          borderRadius: 10, border: "1px solid var(--line)",
                          background: "var(--surface)", color: "var(--text)", font: "var(--t-body)" }} />
          <button onClick={() => run(manual)}
            style={{ height: 40, padding: "0 14px", borderRadius: 10,
                     border: "1px solid var(--line)", background: "var(--surface)",
                     color: "var(--text)", font: "var(--t-body-strong)", cursor: "pointer" }}>
            Run
          </button>
        </div>
      </article>

      {result && (
        <article style={{
          borderRadius: "var(--r-lg)", padding: 24, textAlign: "center",
          border: `1px solid ${result.granted ? "rgba(15,122,58,.3)" : "rgba(200,30,37,.3)"}`,
          background: result.granted ? "rgba(15,122,58,.06)" : "rgba(200,30,37,.06)",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            background: result.granted ? "rgba(15,122,58,.16)" : "rgba(200,30,37,.16)",
            color: result.granted ? "var(--success)" : "var(--danger)",
            font: "700 26px/1 var(--font-sans)",
          }}>{result.granted ? "✓" : "✕"}</div>
          <h3 style={{ margin: "10px 0 4px",
                       color: result.granted ? "var(--success)" : "var(--danger)" }}>
            {result.granted ? "Access granted" : "Access denied"}
          </h3>
          <p style={{ color: "var(--muted)", font: "var(--t-small)" }}>
            {result.room} · {labelForMode(result.mode)} · {result.at}
          </p>
          <p style={{ font: "var(--t-mono)", fontSize: 12, color: "var(--muted-2)", marginTop: 4 }}>
            {result.payload}
          </p>
        </article>
      )}
    </div>
  );
}

function labelForMode(m) {
  return ({ checkin: "Check‑In", break: "Break", checkout: "Check‑Out" })[m] || m;
}

Object.assign(window, { ScanPanel });
