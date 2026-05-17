// Self-contained in-app notifications bar.
//
// Resolves its own API base + token so it works on every authenticated page.
// Polls /api/notifications/me every 30s while the tab is visible and renders
// a sticky status bar at the top of <main>.
(function () {
  const POLL_MS = 30000;
  const PROD_API_BASE = "https://university-qr-reservation-system-production.up.railway.app";

  function token() {
    try {
      return localStorage.getItem("rrs.token") || localStorage.getItem("token") || null;
    } catch (_) {
      return null;
    }
  }

  if (!token()) return;

  function apiBase() {
    if (window.APP_CONFIG && window.APP_CONFIG.API_BASE) return window.APP_CONFIG.API_BASE;

    if (window.RRS_API_BASE) {
      const explicit = String(window.RRS_API_BASE).replace(/\/+$/, "");
      const pageOrigin = String(window.location.origin || "").replace(/\/+$/, "");
      if (isLocalHost(window.location.hostname) || explicit !== pageOrigin) {
        return explicit;
      }
    }

    return isLocalHost(window.location.hostname) ? "http://localhost:5000" : PROD_API_BASE;
  }

  function isLocalHost(host) {
    return host === "localhost" || host === "127.0.0.1";
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

    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

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
      "display:flex",
      "flex-direction:column",
      "gap:8px",
      "padding:10px 16px",
      "background:#f7fafc",
      "border-bottom:1px solid #d9e2ec",
      "font-family:inherit",
      "font-size:14px"
    ].join(";");

    const main = document.querySelector("main") || document.body;
    main.insertBefore(bannerEl, main.firstChild);
    return bannerEl;
  }

  function severityColor(severity) {
    switch ((severity || "").toLowerCase()) {
      case "error":
        return { bg: "#fdecea", border: "#e57373", fg: "#7a1414" };
      case "info":
        return { bg: "#e8f1fd", border: "#7aa6e0", fg: "#163b66" };
      default:
        return { bg: "#fff8ec", border: "#f3c97a", fg: "#6a4900" };
    }
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function render(items) {
    const el = ensureBanner();
    const unread = (items || [])
      .map(normalizeNotification)
      .filter(function (item) { return !item.isRead; });

    el.style.display = "flex";
    el.innerHTML = "";

    if (unread.length === 0) {
      el.appendChild(buildEmptyRow());
      return;
    }

    unread.forEach(function (item) {
      el.appendChild(buildNotificationRow(item));
    });
  }

  function buildEmptyRow() {
    const row = document.createElement("div");
    row.style.cssText = [
      "display:flex",
      "align-items:center",
      "gap:12px",
      "padding:8px 12px",
      "background:#f7fafc",
      "border:1px solid #d9e2ec",
      "color:#334e68",
      "border-radius:6px"
    ].join(";");
    row.innerHTML =
      '<strong style="text-transform:uppercase;letter-spacing:0.04em;font-size:11px;">Notifications</strong>' +
      '<span>No new notifications</span>';
    return row;
  }

  function buildErrorRow(message) {
    return buildNotificationRow({
      notificationID: null,
      type: "Notifications",
      message: message || "Notifications could not be loaded.",
      severity: "error",
      isRead: false
    });
  }

  function buildNotificationRow(item) {
    const tones = severityColor(item.severity);
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

    const message = document.createElement("div");
    message.style.flex = "1";
    message.innerHTML =
      '<strong style="text-transform:uppercase;letter-spacing:0.04em;font-size:11px;display:block;margin-bottom:2px;">' +
      escapeHtml(item.type) +
      "</strong><span>" +
      escapeHtml(item.message) +
      "</span>";
    row.appendChild(message);

    if (item.notificationID) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Dismiss";
      button.style.cssText = [
        "background:transparent",
        "color:" + tones.fg,
        "border:1px solid currentColor",
        "border-radius:4px",
        "padding:4px 10px",
        "font:inherit",
        "cursor:pointer"
      ].join(";");
      button.addEventListener("click", function () { dismiss(item.notificationID); });
      row.appendChild(button);
    }

    return row;
  }

  async function dismiss(id) {
    try {
      await callJson("POST", "/api/notifications/" + id + "/read");
      lastPayload = lastPayload.map(normalizeNotification).map(function (item) {
        return item.notificationID === id
          ? Object.assign({}, item, { isRead: true, readAt: new Date().toISOString() })
          : item;
      });
      render(lastPayload);
    } catch (_) {
      // Keep the current bar visible; the next poll will reconcile state.
    }
  }

  async function poll() {
    try {
      const data = await callJson("GET", "/api/notifications/me");
      lastPayload = Array.isArray(data) ? data.map(normalizeNotification) : [];
      render(lastPayload);
    } catch (error) {
      const el = ensureBanner();
      el.style.display = "flex";
      el.innerHTML = "";
      el.appendChild(buildErrorRow(error && error.message));
    }
  }

  function normalizeNotification(item) {
    item = item || {};
    const readAt = item.readAt ?? item.ReadAt ?? null;
    return {
      notificationID: item.notificationID ?? item.NotificationID ?? item.id ?? item.ID,
      userID: item.userID ?? item.UserID,
      reservationID: item.reservationID ?? item.ReservationID,
      type: item.type ?? item.Type ?? "Info",
      message: item.message ?? item.Message ?? "",
      severity: item.severity ?? item.Severity ?? "warning",
      createdAt: item.createdAt ?? item.CreatedAt,
      readAt: readAt,
      isRead: Boolean(item.isRead ?? item.IsRead ?? readAt)
    };
  }

  function startPolling() {
    stopPolling();
    poll();
    pollTimer = setInterval(function () {
      if (document.visibilityState === "visible") poll();
    }, POLL_MS);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") poll();
  });

  window.RrsNotifications = {
    refresh: poll,
    latest: function () { return lastPayload.slice(); }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startPolling);
  } else {
    startPolling();
  }
})();
