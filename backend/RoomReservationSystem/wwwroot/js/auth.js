// Authentication helpers — token storage, role checks, and route guards.
// All pages (except login) call requireAuth() at startup; admin pages call requireRole("Admin").
(function () {
  const STORAGE_KEYS = {
    TOKEN:  "rrs.token",
    ROLE:   "rrs.role",
    USERID: "rrs.userId",
    EMAIL:  "rrs.email"
  };

  window.Auth = {
    save({ token, role, userID, email }) {
      localStorage.setItem(STORAGE_KEYS.TOKEN,  token);
      localStorage.setItem(STORAGE_KEYS.ROLE,   role);
      localStorage.setItem(STORAGE_KEYS.USERID, String(userID));
      if (email) localStorage.setItem(STORAGE_KEYS.EMAIL, email);
    },
    token()   { return localStorage.getItem(STORAGE_KEYS.TOKEN); },
    role()    { return localStorage.getItem(STORAGE_KEYS.ROLE); },
    userId()  { return Number(localStorage.getItem(STORAGE_KEYS.USERID)); },
    email()   { return localStorage.getItem(STORAGE_KEYS.EMAIL); },
    isAuthenticated() { return !!this.token(); },
    isAdmin() { return this.role() === "Admin"; },
    logout() {
      Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
      window.location.href = "index.html";
    },
    requireAuth() {
      if (!this.isAuthenticated()) window.location.href = "index.html";
    },
    requireRole(role) {
      this.requireAuth();
      if (this.role() !== role) window.location.href = "dashboard.html";
    }
  };
})();
