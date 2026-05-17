// MessageBox.jsx — Inline banner: success / warning / error / info.
function MessageBox({ tone = "info", title, children }) {
  const tones = {
    success: { icon: "✓", color: "var(--success)", border: "rgba(15,122,58,.3)",  bg: "rgba(15,122,58,.06)",  iconBg: "rgba(15,122,58,.16)" },
    warning: { icon: "!", color: "var(--warning)", border: "rgba(164,100,0,.34)", bg: "rgba(164,100,0,.06)", iconBg: "rgba(164,100,0,.18)" },
    error:   { icon: "!", color: "var(--danger)",  border: "rgba(200,30,37,.3)",  bg: "rgba(200,30,37,.06)", iconBg: "rgba(200,30,37,.16)" },
    info:    { icon: "i", color: "var(--info)",    border: "rgba(28,93,210,.3)",  bg: "rgba(28,93,210,.06)", iconBg: "rgba(28,93,210,.16)" },
  };
  const s = tones[tone] || tones.info;
  return (
    <div style={{
      display: "flex", gap: 12, alignItems: "flex-start",
      padding: "14px 16px", borderRadius: "var(--r-md)",
      border: `1px solid ${s.border}`, background: s.bg,
    }}>
      <span style={{
        width: 28, height: 28, borderRadius: 999,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        font: '700 14px/1 var(--font-sans)', background: s.iconBg, color: s.color, flex: "0 0 auto",
      }}>{s.icon}</span>
      <div style={{ minWidth: 0 }}>
        <h4 style={{ margin: 0, font: "var(--t-h4)" }}>{title}</h4>
        {children && <p style={{ margin: "2px 0 0", color: "var(--muted)", font: "var(--t-small)" }}>{children}</p>}
      </div>
    </div>
  );
}

Object.assign(window, { MessageBox });
