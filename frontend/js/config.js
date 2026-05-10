// ──────────────────────────────────────────────────────────────────
// RoomLink frontend configuration — single source of truth for API_BASE.
//
// Resolution order (highest priority first):
//   1. window.RRS_API_BASE       — set inline at the top of every entry HTML
//   2. localStorage.rrs_api_base — "configure once" override for demos
//   3. <meta name="api-base">    — alternative to window.RRS_API_BASE
//   4. host-based fallback:
//        * localhost / 127.0.0.1  -> http://localhost:5000          (local dev)
//        * any other host         -> RRS_PROD_API_BASE              (production)
//      We NEVER fall back to "<page-host>:5000" anymore, because on Vercel
//      that produces "https://...vercel.app:5000" which is invalid.
//
// buildApiUrl(path) is the helper every other script SHOULD use.  It
// guarantees:
//   * exactly one slash between base and path
//   * no double-slash, no trailing-slash drift
//   * never returns a localhost URL when the page itself is on https://
// ──────────────────────────────────────────────────────────────────

(function () {
  // Hard-coded production fallback. Update if the Railway URL changes.
  var RRS_PROD_API_BASE =
      "https://university-qr-reservation-system-production.up.railway.app";

  function stripTrailingSlash(s) {
    if (typeof s !== "string") return s;
    return s.replace(/\/+$/, "");
  }

  function isLocalHost(h) {
    return h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0";
  }

  function resolveApiBase() {
    if (typeof window.RRS_API_BASE === "string" && window.RRS_API_BASE.length > 0) {
      return stripTrailingSlash(window.RRS_API_BASE);
    }
    var stored = (typeof localStorage !== "undefined")
      ? localStorage.getItem("rrs_api_base")
      : null;
    if (stored) return stripTrailingSlash(stored);

    var meta = document.querySelector('meta[name="api-base"]');
    if (meta && meta.content) return stripTrailingSlash(meta.content);

    var host = (window.location && window.location.hostname) || "localhost";
    if (isLocalHost(host)) {
      return "http://localhost:5000";   // local dev
    }
    // Production fallback — NEVER returns "<page-host>:5000".
    return stripTrailingSlash(RRS_PROD_API_BASE);
  }

  function buildApiUrl(path) {
    var base = window.APP_CONFIG && window.APP_CONFIG.API_BASE
      ? window.APP_CONFIG.API_BASE
      : resolveApiBase();
    if (typeof path !== "string" || path.length === 0) return base;
    if (path.charAt(0) !== "/") path = "/" + path;
    return base + path;
  }

  window.APP_CONFIG = {
    API_BASE: resolveApiBase(),
    APP_NAME: "RoomLink",
    TAGLINE:  "QR-Integrated University Room Reservation"
  };
  window.buildApiUrl = buildApiUrl;
})();
