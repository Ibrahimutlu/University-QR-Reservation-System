const API_BASE_URL = (typeof window !== "undefined" && window.RRS_API_BASE
    ? window.RRS_API_BASE
    : "http://localhost:5000") + "/api";

const statusBadge = document.getElementById("statusBadge");
const loadingState = document.getElementById("loadingState");
const detailsContent = document.getElementById("detailsContent");
const messageBox = document.getElementById("messageBox");
const messageIcon = document.getElementById("messageIcon");
const messageTitle = document.getElementById("messageTitle");
const messageText = document.getElementById("messageText");
const actionRow = document.getElementById("actionRow");
const cancelBtn = document.getElementById("cancelBtn");
const reschedulePanel = document.getElementById("reschedulePanel");
const updateDateInput = document.getElementById("updateDate");
const updateStartInput = document.getElementById("updateStart");
const updateEndInput = document.getElementById("updateEnd");
const updateBtn = document.getElementById("updateBtn");
const logoutBtn = document.getElementById("logoutBtn");
const adminNavLink = document.getElementById("adminNavLink");

const reservationIdEl = document.getElementById("reservationId");
const roomNameEl = document.getElementById("roomName");
const reservationDateEl = document.getElementById("reservationDate");
const startTimeEl = document.getElementById("startTime");
const endTimeEl = document.getElementById("endTime");
const statusTextEl = document.getElementById("statusText");
const createdAtEl = document.getElementById("createdAt");

const summaryReservationIdEl = document.getElementById("summaryReservationId");
const summaryRoomNameEl = document.getElementById("summaryRoomName");
const summaryStatusEl = document.getElementById("summaryStatus");
const summaryStartEl = document.getElementById("summaryStart");
const summaryEndEl = document.getElementById("summaryEnd");

const qrBox = document.getElementById("qrBox");
const qrFallbackText = document.getElementById("qrFallbackText");
const qrImage = document.getElementById("qrImage");
const qrMessage = document.getElementById("qrMessage");
const qrStatus = document.getElementById("qrStatus");
const qrExpiry = document.getElementById("qrExpiry");
const viewQrBtn = document.getElementById("viewQrBtn");
const qrReservationIdText = document.getElementById("qrReservationIdText");
const qrRoomNameText = document.getElementById("qrRoomNameText");

function getToken() {
  return localStorage.getItem("token");
}

function getStoredUserId() {
  return localStorage.getItem("userID");
}

function getRole() {
  return localStorage.getItem("role");
}

function getReservationIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("reservationId") || params.get("reservationID") || params.get("id");
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function toDateTimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function normalizeStatus(status) {
  if (!status) return "Pending";
  return String(status);
}

function getStatusClass(status) {
  const normalized = normalizeStatus(status).toLowerCase();
  if (normalized === "confirmed" || normalized === "checkedin" || normalized === "active") {
    return "status-confirmed";
  }
  if (normalized === "cancelled" || normalized === "canceled") return "status-cancelled";
  return "status-pending";
}

function showMessage(type, title, text) {
  messageBox.classList.remove("hidden", "success", "error", "warning");
  messageBox.classList.add(type);
  messageTitle.textContent = title;
  messageText.textContent = text;

  if (type === "success") messageIcon.textContent = "OK";
  else if (type === "warning") messageIcon.textContent = "!";
  else messageIcon.textContent = "X";
}

function hideMessage() {
  messageBox.classList.add("hidden");
  messageBox.classList.remove("success", "error", "warning");
}

function showLoading() {
  loadingState.classList.remove("hidden");
  detailsContent.classList.add("hidden");
  actionRow.classList.add("hidden");
  if (reschedulePanel) reschedulePanel.classList.add("hidden");
}

function hideLoading() {
  loadingState.classList.add("hidden");
}

function extractArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.$values)) return data.$values;
  if (Array.isArray(data?.reservations)) return data.reservations;
  if (Array.isArray(data?.Reservations)) return data.Reservations;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.Data)) return data.Data;
  return [];
}

function getReservationObject(data) {
  if (!data) return null;
  if (data.reservation) return data.reservation;
  if (data.Reservation) return data.Reservation;
  if (data.data && !Array.isArray(data.data)) return data.data;
  if (data.Data && !Array.isArray(data.Data)) return data.Data;

  if (
    data.reservationID !== undefined ||
    data.ReservationID !== undefined ||
    data.reservationId !== undefined
  ) {
    return data;
  }

  return data;
}

function getReservationNumericId(reservation) {
  return (
    reservation.reservationID ??
    reservation.ReservationID ??
    reservation.reservationId ??
    reservation.id ??
    reservation.ID ??
    null
  );
}

function getRoomId(reservation) {
  return reservation.roomID ?? reservation.RoomID ?? reservation.roomId ?? null;
}

function getRoomDisplayName(reservation) {
  const room = reservation.room || reservation.Room;
  if (room) {
    const name = room.roomName || room.RoomName;
    if (name) return name;
  }

  const roomId = getRoomId(reservation);
  if (roomId !== null && roomId !== undefined) return `Room #${roomId}`;
  return "-";
}

function setQRNotAvailable(message = "QR is currently unavailable.") {
  qrImage.classList.add("hidden");
  qrImage.removeAttribute("src");
  qrFallbackText.classList.remove("hidden");
  qrBox.classList.remove("has-image");
  qrMessage.textContent = message;
  qrStatus.textContent = "Not Available";
  qrExpiry.textContent = "-";
  viewQrBtn.textContent = "QR Not Ready";
  viewQrBtn.disabled = true;
  viewQrBtn.onclick = null;
}

async function generateExternalRoomQr(roomId, roomName) {
  // Spec: only staff/admin may VIEW QR codes.  Backend enforces with 403
  // when a student calls this endpoint; the caller already handles errors.
  const base  = (typeof window !== "undefined" && window.RRS_API_BASE
      ? window.RRS_API_BASE
      : "http://localhost:5000");
  const token = localStorage.getItem("token");
  const response = await fetch(base + "/api/qr/room/" + roomId, {
    headers: token ? { Authorization: "Bearer " + token } : {}
  });

  if (!response.ok) {
    let msg = "Failed to generate QR.";
    if (response.status === 403) msg = "Only staff/admin can view this QR.";
    if (response.status === 404) msg = "Room QR not found.";
    throw new Error(msg);
  }
  return await response.json();
}

async function loadExternalRoomQr(reservation) {
  const roomId = getRoomId(reservation);
  const roomName = getRoomDisplayName(reservation);

  if (!roomId) {
    setQRNotAvailable("Room not found.");
    return;
  }

  try {
    const qrData = await generateExternalRoomQr(roomId, roomName);

    if (!qrData.qrImage) {
      setQRNotAvailable();
      return;
    }

    qrImage.src = qrData.qrImage;
    qrImage.classList.remove("hidden");
    qrFallbackText.classList.add("hidden");
    qrBox.classList.add("has-image");

    qrStatus.textContent = "Ready";
    qrExpiry.textContent = "Dynamic QR";
    qrMessage.textContent = "Generated for this reservation.";
    viewQrBtn.disabled = false;
    viewQrBtn.textContent = "Open Printable QR";
    viewQrBtn.onclick = () => {
      window.location.href = `print-qr.html?room=${encodeURIComponent(roomId)}`;
    };
  } catch (error) {
    console.error("External QR load failed:", error);
    setQRNotAvailable("QR generation failed.");
  }
}

function populateDetails(reservation) {
  const reservationId = getReservationNumericId(reservation) ?? "-";
  const roomDisplay = getRoomDisplayName(reservation);

  const date = reservation.reservationDate ?? reservation.ReservationDate ?? "";
  const start = reservation.startTime ?? reservation.StartTime ?? "";
  const end = reservation.endTime ?? reservation.EndTime ?? "";
  const status = normalizeStatus(reservation.status ?? reservation.Status);
  const created = reservation.createdAt ?? reservation.CreatedAt ?? "";

  reservationIdEl.textContent = reservationId;
  roomNameEl.textContent = roomDisplay;
  reservationDateEl.textContent = formatDate(date);
  startTimeEl.textContent = formatDateTime(start);
  endTimeEl.textContent = formatDateTime(end);
  statusTextEl.textContent = status;
  createdAtEl.textContent = formatDateTime(created);

  summaryReservationIdEl.textContent = reservationId;
  summaryRoomNameEl.textContent = roomDisplay;
  summaryStatusEl.textContent = status;
  summaryStartEl.textContent = formatDateTime(start);
  summaryEndEl.textContent = formatDateTime(end);

  if (qrReservationIdText) {
    qrReservationIdText.textContent = reservationId;
  }

  if (qrRoomNameText) {
    qrRoomNameText.textContent = roomDisplay;
  }

  statusBadge.textContent = status;
  statusBadge.className = `status-badge ${getStatusClass(status)}`;

  const isCancelled =
    status.toLowerCase() === "cancelled" || status.toLowerCase() === "canceled";

  if (isCancelled) {
    actionRow.classList.add("hidden");
    if (reschedulePanel) reschedulePanel.classList.add("hidden");
  } else {
    actionRow.classList.remove("hidden");
    if (reschedulePanel) reschedulePanel.classList.remove("hidden");
  }

  if (updateDateInput) {
    updateDateInput.value = toDateInputValue(start || date);
  }

  if (updateStartInput) {
    updateStartInput.value = toDateTimeLocalValue(start);
  }

  if (updateEndInput) {
    updateEndInput.value = toDateTimeLocalValue(end);
  }

  detailsContent.classList.remove("hidden");
  loadExternalRoomQr(reservation);
}

async function apiRequest(url, options = {}) {
  const token = getToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    }
  });

  const contentType = response.headers.get("content-type") || "";
  let data;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMessage =
      typeof data === "string" ? data : data?.message || data?.Message || "Request failed.";
    throw new Error(errorMessage);
  }

  return data;
}

async function fetchReservationForStudent(reservationId) {
  const userId = getStoredUserId();

  if (!userId) {
    throw new Error("You must log in first.");
  }

  const data = await apiRequest(`${API_BASE_URL}/reservation/user/${userId}`);
  const reservations = extractArray(data);

  const reservation = reservations.find((item) => {
    const currentId = getReservationNumericId(item);
    return String(currentId) === String(reservationId);
  });

  if (!reservation) {
    throw new Error("Reservation not found for this user.");
  }

  return reservation;
}

async function fetchReservationForAdmin(reservationId) {
  const data = await apiRequest(`${API_BASE_URL}/reservation/${reservationId}`);
  return getReservationObject(data);
}

async function fetchReservationDetails() {
  const reservationId = getReservationIdFromUrl();
  const role = getRole();

  if (!reservationId) {
    throw new Error("No reservation ID was provided in the URL.");
  }

  if (String(role || "").trim().toLowerCase() === "admin") {
    return await fetchReservationForAdmin(reservationId);
  }

  return await fetchReservationForStudent(reservationId);
}

async function loadReservationDetails() {
  const token = getToken();
  const userId = getStoredUserId();
  const role = getRole();

  if (!token || (!userId && !["admin", "staff"].includes(String(role || "").trim().toLowerCase()))) {
    hideLoading();
    setQRNotAvailable("Login is required.");
    showMessage("error", "Login Required", "You must log in first before viewing reservation details.");
    return;
  }

  showLoading();
  hideMessage();

  try {
    const reservation = await fetchReservationDetails();

    if (!reservation) {
      throw new Error("Reservation data could not be loaded.");
    }

    hideLoading();
    populateDetails(reservation);
  } catch (error) {
    hideLoading();
    setQRNotAvailable();
    showMessage("error", "Load Failed", error.message || "Unable to load reservation details.");
    console.error("Error loading reservation details:", error);
  }
}

async function cancelReservation() {
  const reservationId = getReservationIdFromUrl();

  if (!reservationId || !getToken()) return;

  const confirmed = window.confirm("Are you sure you want to cancel this reservation?");
  if (!confirmed) return;

  hideMessage();

  try {
    await apiRequest(`${API_BASE_URL}/reservation/cancel/${reservationId}`, {
      method: "PUT"
    });

    showMessage("success", "Reservation Cancelled", "The reservation was cancelled successfully.");
    await loadReservationDetails();
  } catch (error) {
    showMessage("error", "Cancellation Failed", error.message || "Unable to cancel reservation.");
    console.error("Error cancelling reservation:", error);
  }
}

function buildUpdatePayload() {
  const reservationDate = (updateDateInput?.value || "").trim();
  const startTime = (updateStartInput?.value || "").trim();
  const endTime = (updateEndInput?.value || "").trim();

  if (!reservationDate || !startTime || !endTime) {
    throw new Error("Date, start time, and end time are required for update.");
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    throw new Error("End time must be later than start time.");
  }

  return {
    reservationDate: `${reservationDate}T00:00:00`,
    startTime,
    endTime
  };
}

async function updateReservation() {
  const reservationId = getReservationIdFromUrl();
  if (!reservationId || !getToken()) return;

  const confirmed = window.confirm("Do you want to update this reservation?");
  if (!confirmed) return;

  try {
    hideMessage();
    const payload = buildUpdatePayload();
    await apiRequest(`${API_BASE_URL}/reservation/update/${reservationId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    showMessage("success", "Reservation Updated", "Reservation time was updated successfully.");
    await loadReservationDetails();
  } catch (error) {
    showMessage("error", "Update Failed", error.message || "Unable to update reservation.");
  }
}

if (cancelBtn) {
  cancelBtn.addEventListener("click", cancelReservation);
}

if (updateBtn) {
  updateBtn.addEventListener("click", updateReservation);
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userID");
    localStorage.removeItem("role");
    localStorage.removeItem("rrs.token");
    localStorage.removeItem("rrs.role");
    localStorage.removeItem("rrs.userId");
    localStorage.removeItem("rrs.email");
    window.location.href = "login.html";
  });
}

function setupDashboardLink() {
    const dashboardLink = document.getElementById("adminNavLink");
    const role = (localStorage.getItem("role") || "").trim().toLowerCase();

    if (!dashboardLink) return;

    if (role === "admin" || role === "staff") {
        dashboardLink.classList.remove("hidden");
        dashboardLink.textContent = "Dashboard";
        dashboardLink.href = "admin-dashboard.html";
    } else {
        dashboardLink.classList.add("hidden");
    }
}

setupDashboardLink();
loadReservationDetails();


