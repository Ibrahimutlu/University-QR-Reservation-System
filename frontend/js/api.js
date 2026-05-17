// Thin wrapper around fetch that automatically attaches JWT, parses payloads,
// and normalizes ASP.NET reference metadata.
(function () {
  async function request(method, path, { body, query } = {}) {
    const url = new URL(window.APP_CONFIG.API_BASE + path);
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          url.searchParams.set(k, v);
        }
      });
    }

    const headers = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (Auth.token()) headers.Authorization = "Bearer " + Auth.token();

    let response;
    try {
      response = await fetch(url.toString(), {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
    } catch (_) {
      throw new Error("Cannot reach backend at " + window.APP_CONFIG.API_BASE + ".");
    }

    if (response.status === 401) {
      Auth.logout();
      throw new Error("Session expired. Please log in again.");
    }

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      const message = (data && (data.message || data.error)) || data || response.statusText;
      throw new Error(typeof message === "string" ? message : JSON.stringify(message));
    }

    return unwrap(data);
  }

  function unwrap(value) {
    if (Array.isArray(value)) return value.map(unwrap);
    if (value && typeof value === "object") {
      if (Array.isArray(value.$values)) return value.$values.map(unwrap);
      const out = {};
      Object.keys(value).forEach((k) => {
        if (k === "$id" || k === "$ref") return;
        out[k] = unwrap(value[k]);
      });
      return out;
    }
    return value;
  }

  window.Api = {
    // Auth
    login: (email, password) => request("POST", "/api/auth/login", { body: { email, password } }),
    studentLogin: (studentNumber, password) =>
      request("POST", "/api/auth/student-login", { body: { studentNumber, password } }),
    register: (payload) => request("POST", "/api/auth/register", { body: payload }),

    // Rooms
    listRooms: () => request("GET", "/api/room"),
    roomStatus: (id) => request("GET", `/api/room/status/${id}`),
    availableSlots: (id, date) => request("GET", `/api/room/available-slots/${id}`, { query: { date } }),
    searchRooms: (filters) => request("GET", "/api/room/search", { query: filters }),
    addRoom: (room) => request("POST", "/api/room/add", { body: room }),
    updateRoom: (id, room) => request("PUT", `/api/room/update/${id}`, { body: room }),
    deleteRoom: (id) => request("DELETE", `/api/room/delete/${id}`),

    // Reservations
    createReservation: (payload) => request("POST", "/api/reservation/create", { body: payload }),
    myReservations: (uid) => request("GET", `/api/reservation/user/${uid}`),
    getReservation: (id) => request("GET", `/api/reservation/${id}`),
    allReservations: () => request("GET", "/api/reservation/all"),
    cancelReservation: (id) => request("PUT", `/api/reservation/cancel/${id}`),
    updateReservation: (id, payload) => request("PUT", `/api/reservation/update/${id}`, { body: payload }),
    warnings: () => request("GET", "/api/reservation/warnings"),
    activeReservation: () => request("GET", "/api/reservation/active"),

    // QR
    roomQr: (roomId) => request("GET", `/api/qr/room/${roomId}`),
    createRoomQr: (roomId) => request("POST", `/api/qr/create/${roomId}`),
    dynamicQr: (roomId) => request("GET", `/api/qr/dynamic/${roomId}`),
    rotateRoomQr: (roomId) => request("POST", `/api/qr/rotate/${roomId}`),
    qrHealth: (roomId) => request("GET", `/api/qr/health/${roomId}`),
    validateRoomQR: (qrCodeValue) => request("GET", "/api/qr/validate", { query: { qrCodeValue } }),
    validateDynamicQR: (qrValue, roomId) => request("GET", "/api/qr/validate-dynamic", { query: { qrValue, roomId } }),
    validateReservationQR: (payload) => request("POST", "/api/qr/validate-reservation", { body: { payload } }),
    scan: (payload) => request("POST", "/api/qr/scan", { body: payload }),
    checkIn: (payload) => request("POST", "/api/qr/check-in", { body: payload }),
    checkOut: (payload) => request("POST", "/api/qr/check-out", { body: payload }),
    breakOut: (payload) => request("POST", "/api/qr/break-out", { body: payload }),
    breakIn: (payload) => request("POST", "/api/qr/break-in", { body: payload }),

    // Notifications
    notifications: () => request("GET", "/api/notifications/me"),
    markNotificationRead: (id) => request("POST", `/api/notifications/${id}/read`),
    markAllNotificationsRead: () => request("POST", "/api/notifications/read-all")
  };
})();
