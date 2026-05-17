// ThemeSchemeSwitcher.jsx — floating control that swaps schemas + light/dark.
function ThemeSchemeSwitcher() {
  const [scheme, setScheme] = React.useState(() =>
    document.documentElement.dataset.scheme || "emerald");
  const [dark, setDark] = React.useState(() =>
    document.documentElement.dataset.theme === "dark");

  React.useEffect(() => { document.documentElement.dataset.scheme = scheme; }, [scheme]);
  React.useEffect(() => {
    if (dark) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
  }, [dark]);

  const schemes = [
    { id: "emerald", color: "#0b7f75" },
    { id: "indigo",  color: "#4f46e5" },
    { id: "amber",   color: "#b45309" },
    { id: "plum",    color: "#a21caf" },
    { id: "slate",   color: "#1f2937" },
  ];

  return (
    <div style={{
      position: "fixed", right: 18, bottom: 18, zIndex: 80,
      background: "var(--surface)", border: "1px solid var(--line)",
      borderRadius: 12, padding: 10, boxShadow: "var(--shadow-md)",
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <span style={{ font: "var(--t-label)", color: "var(--muted)", marginRight: 4 }}>
        Schema
      </span>
      {schemes.map(s => {
        const active = scheme === s.id;
        return (
          <button key={s.id}
            title={s.id}
            onClick={() => setScheme(s.id)}
            aria-label={`Use ${s.id} schema`}
            style={{
              width: 26, height: 26, padding: 0,
              borderRadius: 7,
              border: `2px solid ${active ? "var(--text)" : "transparent"}`,
              background: s.color, cursor: "pointer",
              outline: "none", boxShadow: "var(--shadow-xs)",
            }} />
        );
      })}
      <span style={{ width: 1, height: 22, background: "var(--line)", margin: "0 4px" }} />
      <button
        onClick={() => setDark(d => !d)}
        title={dark ? "Light mode" : "Dark mode"}
        aria-label="Toggle dark mode"
        style={{
          width: 30, height: 30, borderRadius: 7,
          border: "1px solid var(--line)",
          background: "var(--surface-2)", color: "var(--text)",
          cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}>
        <Icon name={dark ? "sun" : "moon"} size={16} />
      </button>
    </div>
  );
}

Object.assign(window, { ThemeSchemeSwitcher });
