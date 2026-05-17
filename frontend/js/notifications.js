// Self-contained in-app notifications banner.
//
// Resolves its own API base + token so it works on every authenticated
// page, regardless of whether that page already loads config.js / api.js /
// auth.js. Polls /api/notifications/me every 30s while the tab is visible
// and renders unread notifications as a sticky banner at the top of <main>.
(function () {
  const POLL_MS = 30000;

  // ── token + API base ────────────────────────────────────────────────
  function token() {
    try {
      return localStorage.getItem("rrs.token") || localStorage.getItem("token") || null;
    } catch (_) { return null; }
  }
  if (!token()) return;

  function apiBase() {
    if (window.APP_CONFIG && window.APP_CONFIG.API_BASE) return window.APP_CONFIG.API_BASE;
    if (window.RRS_API_BASE) return window.RRS_API_BASE;
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return "http://localhost:5000";
    return window.location.origin;
  }

  async function callJson(method, path) {
    const res = await fetch(apiBase() + path, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + token()
      }
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const txt = await res.text();
    return txt ? JSON.parse(txt) : null;
  }

  // ── rendering ───────────────────────────────────────────────────────
  let bannerEl = null;
  let pollTimer = null;
  let lastPayload = [];

  function ensureBanner() {
    if (bannerEl && document.body.contains(bannerEl)) return bannerEl;
    bannerEl = document.createElement("aside");
    bannerEl.id = "rrs-notifications-banner";
    bannerEl.setAttribute("role", "status");
    bannerEl.setAttribute("aria-live", "polite");
    bannerEl.style.cssText = [
      "position:sticky",
      "top:0",
      "z-index:9999",
      "display:none",
      "flex-direction:column",
      "gap:8px",
      "padding:10px 16px",
      "background:#fff8ec",
      "border-bottom:1px solid #f3c97a",
      "font-family:inherit",
      "font-size:14px"
    ].join(";");
    const main = document.querySelector("main") || document.body;
    main.insertBefore(bannerEl, main.firstChild);
    return bannerEl;
  }

  function severityColor(sev) {
    switch ((sev || "").toLowerCase()) {
      case "error":   return { bg: "#fdecea", border: "#e57373", fg: "#7a1414" };
      case "info":    return { bg: "#e8f1fd", border: "#7aa6e0", fg: "#163b66" };
      default:        return { bg: "#fff8ec", border: "#f3c97a", fg: "#6a4900" };
    }
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function render(items) {
    const el = ensureBanner();
    const visible = (items || []).filter(function (n) { return !n.isRead; });
    if (visible.length === 0) {
      el.style.display = "none";
      el.innerHTML = "";
      return;
    }
    el.style.display = "flex";
    el.innerHTML = "";
    visible.forEach(function (n) {
      const tones = severityColor(n.severity);
      const row = document.createElement("div");
      row.style.cssText = [
        "display:flex",
        "align-items:flex-start",
        "gap:12px",
        "padding:8px 12px",
        "background:" + tones.bg,
        "border:1px solid " + tones.border,
        "color:" + tones.fg,
        "border-radius:6px"
      ].join(";");

      const msg = document.createElement("div");
      msg.style.flex = "1";
      msg.innerHTML =
        '<strong style="text-transform:uppercase;letter-spacing:0.04em;font-size:11px;display:block;margin-bottom:2px;">'
        + escapeHtml(n.type) + '</strong>'
        + '<span>' + escapeHtml(n.message) + '</span>';

      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Dismiss";
      btn.style.cssText = [
        "background:transparent",
        "color:" + tones.fg,
        "border:1px solid currentColor",
        "border-radius:4px",
        "padding:4px 10px",
        "font:inherit",
        "cursor:pointer"
      ].join(";");
      btn.addEventListener("click", function () { dismiss(n.notificationID); });

      row.appendChild(msg);
      row.appendChild(btn);
      el.appendChild(row);
    });
  }

  async function dismiss(id) {
    try {
      await callJson("POST", "/api/notifications/" + id + "/read");
      lastPayload = lastPayload.map(function (n) {
        return n.notificationID === id
          ? Object.assign({}, n, { isRead: true, readAt: new Date().toISOString() })
          : n;
      });
      render(lastPayload);
    } catch (_) { /* silent */ }
  }

  async function poll() {
    try {
      const data = await callJson("GET", "/api/notifications/me");
      lastPayload = Array.isArray(data) ? data : [];
      render(lastPayload);
    } catch (_) { /* tab/network blip — keep last view */ }
  }

  function startPolling() {
    stopPolling();
    poll();
    pollTimer = setInterval(function () {
      if (document.visibilityState === "visible") poll();
    }, POLL_MS);
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") poll();
  });

  window.RrsNotifications = {
    refresh: poll,
    latest:  function () { return lastPayload.slice(); }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startPolling);
  } else {
    startPolling();
  }
})();
