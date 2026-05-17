// LoginCard.jsx — Student/admin login with segmented control.
function LoginCard({ onSubmit }) {
  const [mode, setMode] = React.useState("student");
  const [student, setStudent] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  function submit(e) {
    e.preventDefault();
    setErr("");
    if (mode === "student" && !student) return setErr("Please enter your student number.");
    if (mode === "staff"   && !email)   return setErr("Please enter your university email.");
    if (!password) return setErr("Please enter your password.");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSubmit && onSubmit({ mode, identifier: mode === "student" ? student : email });
    }, 450);
  }

  return (
    <div style={{
      width: "min(540px, 100%)", margin: "0 auto",
      background: "var(--surface)", border: "1px solid var(--line)",
      borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-sm)", padding: 28,
    }}>
      <span className="eyebrow">Authentication</span>
      <h2 style={{ margin: "10px 0 4px", letterSpacing: "var(--ls-tight)" }}>Sign In</h2>
      <p style={{ color: "var(--muted)", marginBottom: 18 }}>
        Choose your role and sign in to continue to the reservation system.
      </p>

      <div role="tablist" style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: 4,
        borderRadius: "var(--r-pill)", border: "1px solid var(--line)",
        background: "var(--surface-2)", marginBottom: 16,
      }}>
        {[
          { id: "student", label: "Student Login" },
          { id: "staff",   label: "Admin / Staff Login" },
        ].map(t => (
          <button key={t.id} type="button"
            onClick={() => setMode(t.id)}
            style={{
              border: 0, borderRadius: "var(--r-pill)",
              background: mode === t.id ? "var(--surface)" : "transparent",
              color: mode === t.id ? "var(--accent)" : "var(--muted)",
              boxShadow: mode === t.id ? "var(--shadow-xs)" : "none",
              padding: "10px 12px", font: "var(--t-body-strong)", fontSize: 14, cursor: "pointer",
            }}>{t.label}</button>
        ))}
      </div>

      <form onSubmit={submit} noValidate>
        {mode === "student" ? (
          <Field label="Student Number"
                 value={student} onChange={setStudent} placeholder="Enter your student number" />
        ) : (
          <Field label="University Email" type="email"
                 value={email} onChange={setEmail} placeholder="name@university.com" />
        )}
        <Field label="Password" type="password"
               value={password} onChange={setPassword} placeholder="Enter your password" />

        {err && <p style={{ color: "var(--danger)", font: "var(--t-small)", margin: "4px 0 12px" }}>{err}</p>}

        <button type="submit" disabled={loading}
          style={{
            width: "100%", marginTop: 8, height: 44, border: 0,
            borderRadius: 10, background: "var(--accent)", color: "var(--on-accent)",
            font: "var(--t-body-strong)", cursor: loading ? "wait" : "pointer",
            boxShadow: "var(--shadow-glow)", opacity: loading ? 0.7 : 1,
          }}>
          {loading ? "Signing in…" : "Login"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
      <label style={{ font: "var(--t-label)" }}>{label}</label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{
          height: 44, border: "1px solid var(--line)", borderRadius: 10,
          background: "var(--surface)", padding: "0 14px",
          font: "var(--t-body)", color: "var(--text)",
        }} />
    </div>
  );
}

Object.assign(window, { LoginCard });
