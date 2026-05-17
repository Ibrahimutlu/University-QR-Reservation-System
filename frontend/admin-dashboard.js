const __RRS_BASE = (() => {
    const fallback = "https://university-qr-reservation-system-production.up.railway.app";
    if (typeof window === "undefined") return "http://localhost:5000";
    const host = window.location.hostname;
    const explicit = window.RRS_API_BASE ? String(window.RRS_API_BASE).replace(/\/+$/, "") : "";
    const pageOrigin = String(window.location.origin || "").replace(/\/+$/, "");
    if (explicit && (["localhost", "127.0.0.1"].includes(host) || explicit !== pageOrigin)) return explicit;
    return ["localhost", "127.0.0.1"].includes(host) ? "http://localhost:5000" : fallback;
})();
const ROOM_API_BASE_URL        = __RRS_BASE + "/api/room";
const RESERVATION_API_BASE_URL = __RRS_BASE + "/api/reservation";

const roomIdInput = document.getElementById("roomId");
const roomNameInput = document.getElementById("roomName");
const roomTypeInput = document.getElementById("roomType");
const roomCapacityInput = document.getElementById("roomCapacity");
const roomLocationInput = document.getElementById("roomLocation");

const roomIdError = document.getElementById("roomIdError");
const roomNameError = document.getElementById("roomNameError");
const roomTypeError = document.getElementById("roomTypeError");
const roomCapacityError = document.getElementById("roomCapacityError");
const roomLocationError = document.getElementById("roomLocationError");

const addRoomBtn = document.getElementById("addRoomBtn");
const updateRoomBtn = document.getElementById("updateRoomBtn");
const deleteRoomBtn = document.getElementById("deleteRoomBtn");

const loadReservationsBtn = document.getElementById("loadReservationsBtn");
const loadBtnText = loadReservationsBtn.querySelector(".btn-text");
const loadBtnLoader = loadReservationsBtn.querySelector(".btn-loader");

const roomReservationFilter = document.getElementById("roomReservationFilter");

const reservationsContainer = document.getElementById("reservationsContainer");
const reservationCount = document.getElementById("reservationCount");
const emptyState = document.getElementById("emptyState");

const roomsCount = document.getElementById("roomsCount");
const roomsEmptyState = document.getElementById("roomsEmptyState");
const adminRoomsContainer = document.getElementById("adminRoomsContainer");

const logoutBtn = document.getElementById("logoutBtn");
const manageRoomsPanel = document.getElementById("manageRoomsPanel");

const dashboardRoleLabel = document.getElementById("dashboardRoleLabel");
const dashboardTitle = document.getElementById("dashboardTitle");
const dashboardSubtitle = document.getElementById("dashboardSubtitle");
const registerUsersPanel = document.getElementById("registerUsersPanel");

const registerUserForm = document.getElementById("registerUserForm");
const regFirstName = document.getElementById("regFirstName");
const regLastName = document.getElementById("regLastName");
const regEmail = document.getElementById("regEmail");
const regPassword = document.getElementById("regPassword");
const regStudentNumber = document.getElementById("regStudentNumber");
const registerUserBtn = document.getElementById("registerUserBtn");

const messageBox = document.getElementById("messageBox");
const messageIcon = document.getElementById("messageIcon");
const messageTitle = document.getElementById("messageTitle");
const messageText = document.getElementById("messageText");

let allRooms = [];
let allReservations = [];

function getToken() {
    return localStorage.getItem("token") || localStorage.getItem("rrs.token");
}

function getRole() {
    return localStorage.getItem("role") || localStorage.getItem("rrs.role");
}

function getStoredUserId() {
    return localStorage.getItem("userID") || localStorage.getItem("rrs.userId");
}

function isAdmin() {
    return getRole() === "Admin";
}

function isStaff() {
    return getRole() === "Staff";
}

function canAccessDashboard() {
    return isAdmin() || isStaff();
}

function showMessage(type, title, text) {
    messageBox.classList.remove("hidden", "success", "error", "warning");
    messageBox.classList.add(type);

    messageTitle.textContent = title;
    messageText.textContent = text;
    messageIcon.textContent = type === "success" ? "OK" : type === "warning" ? "!" : "X";

    messageBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

function hideMessage() {
    messageBox.classList.add("hidden");
    messageBox.classList.remove("success", "error", "warning");
}

function setupRoleView() {
    if (isAdmin()) {
        dashboardRoleLabel.textContent = "Admin Dashboard";
        dashboardTitle.textContent = "Admin Dashboard";
        dashboardSubtitle.textContent =
            "Manage rooms and active reservations. Cancelled reservations are hidden from this dashboard.";

        if (manageRoomsPanel) {
            manageRoomsPanel.classList.remove("hidden");
        }

        if (registerUsersPanel) {
            registerUsersPanel.classList.remove("hidden");
        }

        return;
    }

    if (isStaff()) {
        dashboardRoleLabel.textContent = "Staff Dashboard";
        dashboardTitle.textContent = "Staff Dashboard";
        dashboardSubtitle.textContent =
            "Monitor rooms and your own active reservations. Staff can cancel only their own reservations and cannot edit rooms.";

        if (manageRoomsPanel) {
            manageRoomsPanel.classList.add("hidden");
        }

        if (registerUsersPanel) {
            registerUsersPanel.classList.add("hidden");
        }
    }
}

function clearRoomErrors() {
    roomIdError.textContent = "";
    roomNameError.textContent = "";
    roomTypeError.textContent = "";
    roomCapacityError.textContent = "";
    roomLocationError.textContent = "";
}

function clearRoomForm() {
    roomIdInput.value = "";
    roomNameInput.value = "";
    roomTypeInput.value = "";
    roomCapacityInput.value = "";
    roomLocationInput.value = "";
    clearRoomErrors();
}

function validateAddOrUpdateRoom(requireRoomId = false) {
    clearRoomErrors();
    let isValid = true;

    if (requireRoomId) {
        if (!roomIdInput.value.trim()) {
            roomIdError.textContent = "Room ID is required.";
            isValid = false;
        } else if (Number(roomIdInput.value) <= 0) {
            roomIdError.textContent = "Room ID must be greater than 0.";
            isValid = false;
        }
    }

    if (!roomNameInput.value.trim()) {
        roomNameError.textContent = "Room name is required.";
        isValid = false;
    }

    if (!roomTypeInput.value.trim()) {
        roomTypeError.textContent = "Room type is required.";
        isValid = false;
    }

    if (!roomCapacityInput.value.trim()) {
        roomCapacityError.textContent = "Capacity is required.";
        isValid = false;
    } else if (Number(roomCapacityInput.value) <= 0) {
        roomCapacityError.textContent = "Capacity must be greater than 0.";
        isValid = false;
    }

    if (!roomLocationInput.value.trim()) {
        roomLocationError.textContent = "Location is required.";
        isValid = false;
    }

    return isValid;
}

function validateDeleteRoom() {
    clearRoomErrors();

    if (!roomIdInput.value.trim()) {
        roomIdError.textContent = "Room ID is required.";
        return false;
    }

    if (Number(roomIdInput.value) <= 0) {
        roomIdError.textContent = "Room ID must be greater than 0.";
        return false;
    }

    return true;
}

function buildRoomPayload() {
    return {
        roomName: roomNameInput.value.trim(),
        roomType: roomTypeInput.value.trim(),
        capacity: Number(roomCapacityInput.value),
        location: roomLocationInput.value.trim()
    };
}

function extractArray(data, keys = []) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.$values)) return data.$values;

    for (const key of keys) {
        if (Array.isArray(data?.[key])) return data[key];
        if (Array.isArray(data?.[key]?.$values)) return data[key].$values;
    }

    return [];
}

function normalizeRoom(room) {
    return {
        roomID: room.roomID ?? room.RoomID ?? room.id ?? room.ID,
        roomName: room.roomName ?? room.RoomName ?? room.name ?? room.Name ?? "Unknown Room",
        roomType: room.roomType ?? room.RoomType ?? room.type ?? room.Type ?? "Unknown Type",
        capacity: room.capacity ?? room.Capacity ?? 0,
        location: room.location ?? room.Location ?? "Unknown Location",
        isAvailable: room.isAvailable ?? room.IsAvailable ?? true
    };
}

function normalizeReservation(reservation) {
    const user = reservation.user ?? reservation.User ?? {};
    const room = reservation.room ?? reservation.Room ?? {};

    return {
        reservationID:
            reservation.reservationID ??
            reservation.ReservationID ??
            reservation.id ??
            reservation.ID ??
            "-",

        userID:
            reservation.userID ??
            reservation.UserID ??
            "-",

        roomID:
            reservation.roomID ??
            reservation.RoomID ??
            room.roomID ??
            room.RoomID ??
            "-",

        reservationDate:
            reservation.reservationDate ??
            reservation.ReservationDate ??
            "",

        startTime:
            reservation.startTime ??
            reservation.StartTime ??
            "",

        endTime:
            reservation.endTime ??
            reservation.EndTime ??
            "",

        status:
            reservation.status ??
            reservation.Status ??
            "Pending",

        createdAt:
            reservation.createdAt ??
            reservation.CreatedAt ??
            "",

        userName:
            `${user.firstName ?? user.FirstName ?? ""} ${user.lastName ?? user.LastName ?? ""}`.trim() ||
            "Unknown User",

        userEmail:
            user.email ??
            user.Email ??
            "-",

        roomName:
            room.roomName ??
            room.RoomName ??
            "Unknown Room"
    };
}

async function apiRequest(url, options = {}) {
    const token = getToken();

    const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
    };

    if (options.body) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
        ...options,
        headers
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
            typeof data === "string" ? data : data?.message || "Request failed.";
        throw new Error(errorMessage);
    }

    return data;
}

function populateRoomFilter(rooms) {
    const currentValue = roomReservationFilter.value || "all";
    roomReservationFilter.innerHTML = `<option value="all">All Rooms</option>`;

    rooms.forEach((room) => {
        const option = document.createElement("option");
        option.value = String(room.roomID);
        option.textContent = `${room.roomName} (ID: ${room.roomID})`;
        roomReservationFilter.appendChild(option);
    });

    const stillExists = Array.from(roomReservationFilter.options).some(
        (option) => option.value === currentValue
    );

    roomReservationFilter.value = stillExists ? currentValue : "all";
}

async function loadAllRooms() {
    try {
        const data = await apiRequest(`${ROOM_API_BASE_URL}`, {
            method: "GET"
        });

        allRooms = extractArray(data).map(normalizeRoom);
        renderRoomsList(allRooms);
        populateRoomFilter(allRooms);
    } catch (error) {
        allRooms = [];
        renderRoomsList([]);
        populateRoomFilter([]);
        console.error(error);
    }
}

function getRoomStatusText(isAvailable) {
    return isAvailable ? "Available" : "Full";
}

function getRoomStatusClass(isAvailable) {
    return isAvailable ? "status-confirmed" : "status-cancelled";
}

function populateRoomForm(room) {
    if (!isAdmin()) return;

    roomIdInput.value = room.roomID ?? "";
    roomNameInput.value = room.roomName ?? "";
    roomTypeInput.value = room.roomType ?? "";
    roomCapacityInput.value = room.capacity ?? "";
    roomLocationInput.value = room.location ?? "";

    clearRoomErrors();
    roomIdInput.scrollIntoView({ behavior: "smooth", block: "center" });
}

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString();
}

function formatTimeOnly(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function normalizeStatus(status) {
    if (!status) return "Pending";
    return String(status);
}

function isCancelledStatus(status) {
    const normalized = normalizeStatus(status).toLowerCase();
    return normalized === "cancelled" || normalized === "canceled";
}

function getStatusClass(status) {
    const normalized = normalizeStatus(status).toLowerCase();

    if (normalized === "confirmed") return "status-confirmed";
    if (normalized === "cancelled" || normalized === "canceled") return "status-cancelled";

    return "status-pending";
}

function createRoomCard(room) {
    const article = document.createElement("article");
    article.className = "room-card-admin";

    const statusText = getRoomStatusText(room.isAvailable);
    const statusClass = getRoomStatusClass(room.isAvailable);

    article.innerHTML = `
    <div class="room-card-admin-top">
      <span class="room-card-admin-id">Room ID: ${room.roomID}</span>
      <span class="status-badge ${statusClass}">${statusText}</span>
    </div>

    <div class="room-card-admin-grid">
      <p><strong>Name:</strong> ${room.roomName}</p>
      <p><strong>Type:</strong> ${room.roomType}</p>
      <p><strong>Capacity:</strong> ${room.capacity}</p>
      <p><strong>Location:</strong> ${room.location}</p>
    </div>

    ${
        isAdmin()
            ? `<div class="room-card-admin-actions">
                 <button type="button" class="action-btn edit-room-btn">Edit</button>
                 <button type="button" class="action-btn danger delete-room-btn">Delete</button>
               </div>`
            : ""
    }
  `;

    if (isAdmin()) {
        const editBtn = article.querySelector(".edit-room-btn");
        const deleteBtn = article.querySelector(".delete-room-btn");

        editBtn.addEventListener("click", () => {
            populateRoomForm(room);
            showMessage("success", "Room Selected", `Room ${room.roomID} is ready for editing.`);
        });

        deleteBtn.addEventListener("click", async () => {
            const confirmed = window.confirm(`Are you sure you want to delete Room ${room.roomID}?`);
            if (!confirmed) return;

            try {
                hideMessage();

                await apiRequest(`${ROOM_API_BASE_URL}/delete/${room.roomID}`, {
                    method: "DELETE"
                });

                showMessage("success", "Room Deleted", `Room ${room.roomID} was deleted successfully.`);
                clearRoomForm();
                await loadAllRooms();
                applyReservationFilter();
            } catch (error) {
                showMessage("error", "Delete Room Failed", error.message || "Unable to delete room.");
            }
        });
    }

    return article;
}

function renderRoomsList(rooms) {
    adminRoomsContainer.innerHTML = "";
    roomsCount.textContent = `${rooms.length} room${rooms.length === 1 ? "" : "s"}`;

    if (!Array.isArray(rooms) || rooms.length === 0) {
        roomsEmptyState.classList.remove("hidden");
        return;
    }

    roomsEmptyState.classList.add("hidden");

    rooms.forEach((room) => {
        adminRoomsContainer.appendChild(createRoomCard(room));
    });
}

async function addRoom() {
    if (!isAdmin()) {
        showMessage("error", "Access Denied", "Only admins can add rooms.");
        return;
    }

    if (!validateAddOrUpdateRoom(false)) return;

    try {
        hideMessage();

        const data = await apiRequest(`${ROOM_API_BASE_URL}/add`, {
            method: "POST",
            body: JSON.stringify(buildRoomPayload())
        });

        showMessage(
            "success",
            "Room Added",
            `The room was added successfully. Room ID: ${data.RoomID || data.roomID || "N/A"}`
        );

        clearRoomForm();
        await loadAllRooms();
        applyReservationFilter();
    } catch (error) {
        showMessage("error", "Add Room Failed", error.message || "Unable to add room.");
    }
}

async function updateRoom() {
    if (!isAdmin()) {
        showMessage("error", "Access Denied", "Only admins can update rooms.");
        return;
    }

    if (!validateAddOrUpdateRoom(true)) return;

    try {
        hideMessage();

        await apiRequest(`${ROOM_API_BASE_URL}/update/${roomIdInput.value.trim()}`, {
            method: "PUT",
            body: JSON.stringify(buildRoomPayload())
        });

        showMessage("success", "Room Updated", "The room was updated successfully.");
        clearRoomForm();
        await loadAllRooms();
        applyReservationFilter();
    } catch (error) {
        showMessage("error", "Update Room Failed", error.message || "Unable to update room.");
    }
}

async function deleteRoom() {
    if (!isAdmin()) {
        showMessage("error", "Access Denied", "Only admins can delete rooms.");
        return;
    }

    if (!validateDeleteRoom()) return;

    const confirmed = window.confirm("Are you sure you want to delete this room?");
    if (!confirmed) return;

    try {
        hideMessage();

        await apiRequest(`${ROOM_API_BASE_URL}/delete/${roomIdInput.value.trim()}`, {
            method: "DELETE"
        });

        showMessage("success", "Room Deleted", "The room was deleted successfully.");
        clearRoomForm();
        await loadAllRooms();
        applyReservationFilter();
    } catch (error) {
        showMessage("error", "Delete Room Failed", error.message || "Unable to delete room.");
    }
}

function createReservationCard(reservation) {
    const article = document.createElement("article");
    article.className = "reservation-card";

    const reservationId = reservation.reservationID;
    const roomName = reservation.roomName || "Unknown Room";
    const userName = reservation.userName || "Unknown User";
    const date = reservation.reservationDate;
    const startTime = reservation.startTime;
    const endTime = reservation.endTime;
    const status = normalizeStatus(reservation.status);
    const statusClass = getStatusClass(status);

    article.innerHTML = `
    <div class="reservation-top">
      <span class="reservation-id">${roomName}</span>
      <span class="status-badge ${statusClass}">${status}</span>
    </div>

    <div class="reservation-grid">
      <p><strong>User Name:</strong> ${userName}</p>
      <p><strong>Room Name:</strong> ${roomName}</p>
      <p><strong>Date:</strong> ${formatDate(date)}</p>
      <p><strong>Time:</strong> ${formatTimeOnly(startTime)} - ${formatTimeOnly(endTime)}</p>
    </div>

    <div class="reservation-actions">
      <a class="action-btn" href="reservation-details.html?reservationId=${reservationId}">
        View Details
      </a>
      <button class="action-btn danger" data-reservation-id="${reservationId}">
        Cancel
      </button>
    </div>
  `;

    const cancelBtn = article.querySelector(".action-btn.danger");

    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => cancelReservation(reservationId));
    }

    return article;
}

function getActiveReservations() {
    return allReservations.filter((reservation) => {
        return !isCancelledStatus(reservation.status);
    });
}

function getFilteredReservations() {
    const selectedRoomId = roomReservationFilter.value || "all";
    const activeReservations = getActiveReservations();

    if (selectedRoomId === "all") {
        return activeReservations;
    }

    return activeReservations.filter(
        (reservation) => String(reservation.roomID) === String(selectedRoomId)
    );
}

function renderReservations(reservations) {
    reservationsContainer.innerHTML = "";

    if (!Array.isArray(reservations) || reservations.length === 0) {
        emptyState.classList.remove("hidden");
        reservationCount.textContent = "0 active reservations";

        const emptyTitle = emptyState.querySelector("h4");
        const emptyText = emptyState.querySelector("p");

        if (emptyTitle) {
            emptyTitle.textContent = "No active reservations loaded";
        }

        if (emptyText) {
            emptyText.textContent =
                "Active reservations will appear here automatically. Cancelled reservations are hidden.";
        }

        return;
    }

    emptyState.classList.add("hidden");

    reservationCount.textContent =
        `${reservations.length} active reservation${reservations.length > 1 ? "s" : ""}`;

    reservations.forEach((reservation) => {
        reservationsContainer.appendChild(createReservationCard(reservation));
    });
}

function applyReservationFilter() {
    renderReservations(getFilteredReservations());
}

function setLoadReservationsLoading(isLoading) {
    loadReservationsBtn.disabled = isLoading;

    if (isLoading) {
        loadBtnText.textContent = "Loading...";
        loadBtnLoader.classList.remove("hidden");
    } else {
        loadBtnText.textContent = "Refresh Reservations";
        loadBtnLoader.classList.add("hidden");
    }
}

async function loadAllReservations() {
    let endpoint = `${RESERVATION_API_BASE_URL}/all`;

    if (!isAdmin()) {
        const userId = getStoredUserId();
        if (!userId) {
            throw new Error("User ID is missing. Please sign in again.");
        }
        endpoint = `${RESERVATION_API_BASE_URL}/user/${encodeURIComponent(userId)}`;
    }

    const data = await apiRequest(endpoint, { method: "GET" });

    return extractArray(data, ["reservations", "Reservations", "data", "Data"]).map(normalizeReservation);
}

function clearRegisterUserForm() {
    if (!registerUserForm) return;
    registerUserForm.reset();
}

function validateRegisterUserForm() {
    const firstName = (regFirstName?.value || "").trim();
    const lastName = (regLastName?.value || "").trim();
    const password = (regPassword?.value || "").trim();
    const studentNumber = (regStudentNumber?.value || "").trim();

    if (!firstName || !lastName || !password || !studentNumber) {
        throw new Error("First name, last name, student number, and password are required.");
    }
}

function buildRegisterPayload() {
    const studentNumber = (regStudentNumber?.value || "").trim();
    const email = (regEmail?.value || "").trim();

    return {
        firstName: (regFirstName?.value || "").trim(),
        lastName: (regLastName?.value || "").trim(),
        email: email || `${studentNumber}@students.roomlink.local`,
        password: (regPassword?.value || "").trim(),
        role: "Student",
        studentNumber
    };
}

async function registerUser() {
    if (!isAdmin()) {
        showMessage("error", "Access Denied", "Only admins can register new users.");
        return;
    }

    try {
        validateRegisterUserForm();
        hideMessage();

        const payload = buildRegisterPayload();
        const data = await apiRequest(`${__RRS_BASE}/api/auth/register`, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        showMessage(
            "success",
            "Student Registered",
            `Student created successfully. User ID: ${data.userID || data.UserID || "N/A"}`
        );
        clearRegisterUserForm();
    } catch (error) {
        showMessage("error", "Register Failed", error.message || "Unable to register user.");
    }
}

async function refreshAllReservations(showSuccess = false) {
    try {
        setLoadReservationsLoading(true);
        hideMessage();

        allReservations = await loadAllReservations();
        applyReservationFilter();

        if (showSuccess) {
            const activeCount = getActiveReservations().length;

            showMessage(
                "success",
                "Reservations Loaded",
                `${activeCount} active reservation${activeCount === 1 ? "" : "s"} loaded. Cancelled reservations are hidden.`
            );
        }
    } catch (error) {
        allReservations = [];
        reservationsContainer.innerHTML = "";
        emptyState.classList.remove("hidden");
        reservationCount.textContent = "0 active reservations";
        showMessage("error", "Load Failed", error.message || "Unable to load reservations.");
    } finally {
        setLoadReservationsLoading(false);
    }
}

async function cancelReservation(reservationId) {
    const confirmed = window.confirm("Are you sure you want to cancel this reservation?");
    if (!confirmed) return;

    try {
        hideMessage();

        await apiRequest(`${RESERVATION_API_BASE_URL}/cancel/${reservationId}`, {
            method: "PUT"
        });

        showMessage("success", "Reservation Cancelled", "The reservation was cancelled successfully.");

        await refreshAllReservations(false);
        await loadAllRooms();
    } catch (error) {
        showMessage("error", "Cancellation Failed", error.message || "Unable to cancel reservation.");
    }
}

if (addRoomBtn) {
    addRoomBtn.addEventListener("click", addRoom);
}

if (updateRoomBtn) {
    updateRoomBtn.addEventListener("click", updateRoom);
}

if (deleteRoomBtn) {
    deleteRoomBtn.addEventListener("click", deleteRoom);
}

if (registerUserBtn) {
    registerUserBtn.addEventListener("click", registerUser);
}

loadReservationsBtn.addEventListener("click", async () => {
    await refreshAllReservations(true);
});

roomReservationFilter.addEventListener("change", () => {
    applyReservationFilter();
});

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

window.addEventListener("load", async () => {
    if (!canAccessDashboard()) {
        showMessage("error", "Access Denied", "This page is available for admin and staff users only.");

        setTimeout(() => {
            window.location.href = "login.html";
        }, 1200);

        return;
    }

    setupRoleView();

    await loadAllRooms();
    await refreshAllReservations(false);
});


