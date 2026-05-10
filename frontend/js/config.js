// ──────────────────────────────────────────────────────────────────
// RoomLink frontend configuration
//
// API_BASE precedence (highest first):
//   1. window.RRS_API_BASE  — set inline at the top of every HTML page,
//                              or injected at deploy-time on Vercel via
//                              `vercel.json`'s rewrites/headers, or by an
//                              env-var-baked config.production.js.
//   2. localStorage.rrs_api_base — useful for "configure once" demos.
//   3. <meta name="api-base" content="...">
//   4. Same hostname as the page on port 5000 — fits local LAN dev.
//   5. http://localhost:5000 fallback.
// ──────────────────────────────────────────────────────────────────

(function () {
  function resolveApiBase() {
    if (typeof window.RRS_API_BASE === "string" && window.RRS_API_BASE.length > 0) {
      return window.RRS_API_BASE;
    }
    var stored = localStorage.getItem("rrs_api_base");
    if (stored) return stored;
    var meta = document.querySelector('meta[name="api-base"]');
    if (meta && meta.content) return meta.content;

    var host = window.location.hostname || "localhost";
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:5000";
    }
    // Same hostname as the page (LAN access) on port 5000.
    return window.location.protocol + "//" + host + ":5000";
  }

  window.APP_CONFIG = {
    API_BASE: resolveApiBase(),
    APP_NAME: "RoomLink",
    TAGLINE:  "QR-Integrated University Room Reservation"
  };
})();
