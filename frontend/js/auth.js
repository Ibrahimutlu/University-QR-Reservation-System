// Authentication helpers with backward-compatible localStorage keys.
(function () {
  const KEYS = {
    modern: {
      token: "rrs.token",
      role: "rrs.role",
      userId: "rrs.userId",
      email: "rrs.email"
    },
    legacy: {
      token: "token",
      role: "role",
      userId: "userID"
    }
  };

  function firstValue(keys) {
    for (const key of keys) {
      const value = localStorage.getItem(key);
      if (value) return value;
    }
    return null;
  }

  function getToken() {
    return firstValue([KEYS.modern.token, KEYS.legacy.token]);
  }

  function getRole() {
    return firstValue([KEYS.modern.role, KEYS.legacy.role]);
  }

  function getUserIdRaw() {
    return firstValue([KEYS.modern.userId, KEYS.legacy.userId]);
  }

  function clearAll() {
    localStorage.removeItem(KEYS.modern.token);
    localStorage.removeItem(KEYS.modern.role);
    localStorage.removeItem(KEYS.modern.userId);
    localStorage.removeItem(KEYS.modern.email);

    localStorage.removeItem(KEYS.legacy.token);
    localStorage.removeItem(KEYS.legacy.role);
    localStorage.removeItem(KEYS.legacy.userId);
  }

  window.Auth = {
    save({ token, role, userID, email }) {
      if (token) {
        localStorage.setItem(KEYS.modern.token, token);
        localStorage.setItem(KEYS.legacy.token, token);
      }
      if (role) {
        localStorage.setItem(KEYS.modern.role, role);
        localStorage.setItem(KEYS.legacy.role, role);
      }
      if (userID !== undefined && userID !== null) {
        const asText = String(userID);
        localStorage.setItem(KEYS.modern.userId, asText);
        localStorage.setItem(KEYS.legacy.userId, asText);
      }
      if (email) {
        localStorage.setItem(KEYS.modern.email, email);
      }
    },
    token() {
      return getToken();
    },
    role() {
      return getRole();
    },
    userId() {
      const raw = getUserIdRaw();
      return raw ? Number(raw) : null;
    },
    email() {
      return localStorage.getItem(KEYS.modern.email) || "";
    },
    isAuthenticated() {
      return !!getToken();
    },
    isAdmin() {
      return getRole() === "Admin";
    },
    logout() {
      clearAll();
      window.location.href = "login.html";
    },
    requireAuth() {
      if (!this.isAuthenticated()) {
        window.location.href = "login.html";
      }
    },
    requireRole(role) {
      this.requireAuth();
      if (this.role() !== role) {
        window.location.href = "rooms.html";
      }
    }
  };
})();
