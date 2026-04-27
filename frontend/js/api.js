// Thin wrapper around fetch that automatically attaches the JWT
// and parses JSON / surfaces error messages.
(function () {
  async function request(method, path, { body, query } = {}) {
    const url  = new URL(window.APP_CONFIG.API_BASE + path);
    if (query) Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });

    const headers = { "Accept": "application/json" };
    if (body)              headers["Content-Type"]  = "application/json";
    if (Auth.token())      headers["Authorization"] = "Bearer " + Auth.token();

    let response;
    try {
      response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (e) {
      throw new Error("Cannot reach backend at " + window.APP_CONFIG.API_BASE +
                      ". Is the API running?");
    }

    if (response.status === 401) {
      Auth.logout();
      throw new Error("Session expired — please log in again");
    }

    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : null; }
    catch { data = text; }

    if (!response.ok) {
      const message = (data && (data.message || data.error)) || data || response.statusText;
      throw new Error(typeof message === "string" ? message : JSON.stringify(message));
    }
    return data;
  }

  window.Api = {
    // Auth
    login: (email, password) => request("POST", "/api/auth/login", { body: { email, password } }),

    // Rooms
    listRooms:        ()                  => request("GET",    "/api/room"),
    roomStatus:       (id)                => request("GET",    `/api/room/status/${id}`),
    availableSlots:   (id, date)          => request("GET",    `/api/room/available-slots/${id}`, { query: { date } }),
    addRoom:          (room)              => request("POST",   "/api/room/add",            { body: room }),
    updateRoom:       (id, room)          => request("PUT",    `/api/room/update/${id}`,   { body: room }),
    deleteRoom:       (id)                => request("DELETE", `/api/room/delete/${id}`),

    // Reservations
    createReservation: (r)                => request("POST",   "/api/reservation/create",  { body: r }),
    myReservations:    (uid)              => request("GET",    `/api/reservation/user/${uid}`),
    getReservation:    (id)               => request("GET",    `/api/reservation/${id}`),
    cancelReservation: (id)               => request("PUT",    `/api/reservation/cancel/${id}`),

    // QR
    validateRoomQR:        (qrCodeValue)  => request("GET",    "/api/qr/validate", { query: { qrCodeValue } }),
    validateReservationQR: (payload)      => request("POST",   "/api/qr/validate-reservation", { body: { payload } })
  };
})();
