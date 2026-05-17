// StatPill.jsx — small status capsule used in cards and lists.
function StatPill({ tone = "neutral", dot = true, children }) {
  const tones = {
    success: { color: "var(--success)", bg: "var(--success-bg)", border: "rgba(15,122,58,.28)" },
    warning: { color: "var(--warning)", bg: "var(--warning-bg)", border: "rgba(164,100,0,.28)" },
    danger:  { color: "var(--danger)",  bg: "var(--danger-bg)",  border: "rgba(200,30,37,.28)" },
    info:    { color: "var(--info)",    bg: "var(--info-bg)",    border: "rgba(28,93,210,.28)" },
    accent:  { color: "var(--accent)",  bg: "var(--accent-soft)", border: "var(--accent-line)" },
    neutral: { color: "var(--text-2)",  bg: "var(--surface-2)",  border: "var(--line)" },
  };
  const s = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px",
      borderRadius: "var(--r-pill)", font: "var(--t-label)",
      color: s.color, background: s.bg, border: `1px solid ${s.border}`,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: "currentColor" }} />}
      {children}
    </span>
  );
}

Object.assign(window, { StatPill });
