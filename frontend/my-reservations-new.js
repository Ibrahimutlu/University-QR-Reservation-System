const API_BASE_URL = (typeof window !== "undefined" && window.RRS_API_BASE
    ? window.RRS_API_BASE
    : "http://localhost:5000") + "/api/reservation";

const reservationCount = document.getElementById("reservationCount");
const reservationsContainer = document.getElementById("reservationsContainer");
const emptyState = document.getElementById("emptyState");

const messageBox = document.getElementById("messageBox");
const messageIcon = document.getElementById("messageIcon");
const messageTitle = document.getElementById("messageTitle");
const messageText = document.getElementById("messageText");

const refreshBtn = document.getElementById("refreshBtn");
const clearBtn = document.getElementById("clearBtn");

const logoutBtn = document.getElementById("logoutBtn");
const adminNavLink = document.getElementById("adminNavLink");
const ACTIVE_STATUSES = new Set(["pending", "confirmed", "active", "checkedin"]);

function getStoredUserId() {
    return localStorage.getItem("userID") || localStorage.getItem("rrs.userId");
}

function getToken() {
    return localStorage.getItem("token") || localStorage.getItem("rrs.token");
}

function getRole() {
    return localStorage.getItem("role") || localStorage.getItem("rrs.role");
}

if (!getToken()) {
    window.location.href = "login.html";
}

function showMessage(type, title, text) {
    messageBox.classList.remove("hidden", "success", "error", "warning");
    messageBox.classList.add(type);

    messageTitle.textContent = title;
    messageText.textContent = text;

    if (type === "success") {
        messageIcon.textContent = "OK";
    } else if (type === "warning") {
        messageIcon.textContent = "!";
    } else {
        messageIcon.textContent = "X";
    }
}

function hideMessage() {
    messageBox.classList.add("hidden");
    messageBox.classList.remove("success", "error", "warning");
}

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString();
}

function formatDateTime(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString();
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

    if (normalized === "confirmed" || normalized === "checkedin" || normalized === "active") {
        return "status-confirmed";
    }

    if (normalized === "cancelled" || normalized === "canceled") {
        return "status-cancelled";
    }

    return "status-pending";
}

function extractReservationsArray(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.reservations)) return data.reservations;
    if (Array.isArray(data?.Reservations)) return data.Reservations;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.Data)) return data.Data;
    if (Array.isArray(data?.$values)) return data.$values;
    return [];
}

function getRole() {
    return (
        localStorage.getItem("role") ||
        localStorage.getItem("rrs.role") ||
        ""
    ).trim().toLowerCase();
}

function canViewRoomIds() {
    const role = getRole();
    return role === "admin" || role === "staff";
}

function createReservationCard(reservation) {
    const article = document.createElement("article");
    article.className = "reservation-card";

    const reservationId =
        reservation.reservationID ??
        reservation.ReservationID ??
        reservation.id ??
        reservation.ID ??
        "-";

    const roomId =
        reservation.roomID ??
        reservation.RoomID ??
        reservation.room?.roomID ??
        reservation.Room?.RoomID ??
        "-";

    const roomName =
        reservation.room?.roomName ??
        reservation.Room?.RoomName ??
        "Room Reservation";

    const date =
        reservation.reservationDate ??
        reservation.ReservationDate ??
        "";

    const startTime =
        reservation.startTime ??
        reservation.StartTime ??
        "";

    const endTime =
        reservation.endTime ??
        reservation.EndTime ??
        "";

    const status = normalizeStatus(reservation.status ?? reservation.Status);
    const statusClass = getStatusClass(status);
    const isCancelled = isCancelledStatus(status);
    const roomIdLine = canViewRoomIds()
        ? `<p><strong>Room ID:</strong> ${roomId}</p>`
        : "";

    article.innerHTML = `
    <div class="reservation-top">
      <span class="reservation-id">${roomName}</span>
      <span class="status-badge ${statusClass}">${status}</span>
    </div>

    <div class="reservation-grid">
      ${roomIdLine}
      <p><strong>Date:</strong> ${formatDate(date)}</p>
      <p><strong>Start Time:</strong> ${formatDateTime(startTime)}</p>
      <p><strong>End Time:</strong> ${formatDateTime(endTime)}</p>
    </div>

    <div class="reservation-actions">
      <a class="action-btn" href="reservation-details.html?reservationId=${reservationId}">
        View Details
      </a>

      ${
          isCancelled
              ? ""
              : `<button class="action-btn danger" data-reservation-id="${reservationId}">
                    Cancel
                 </button>`
      }
    </div>
  `;

    const cancelBtn = article.querySelector(".action-btn.danger");

    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => cancelReservation(reservationId));
    }

    return article;
}

function filterActiveReservations(reservations) {
    return reservations.filter((reservation) => {
        const normalized = normalizeStatus(reservation.status ?? reservation.Status).toLowerCase();
        return ACTIVE_STATUSES.has(normalized);
    });
}

async function syncWarnings() {
    const token = getToken();
    if (!token) return [];

    const response = await fetch(`${API_BASE_URL}/warnings`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const contentType = response.headers.get("content-type") || "";
    let data = [];

    if (contentType.includes("application/json")) {
        data = await response.json();
    } else {
        const text = await response.text();
        data = text ? [] : [];
    }

    if (!response.ok) {
        const errorMessage =
            typeof data === "string"
                ? data
                : data?.message || "Warning sync failed.";
        throw new Error(errorMessage);
    }

    return Array.isArray(data) ? data : [];
}

function renderReservations(reservations) {
    reservationsContainer.innerHTML = "";

    const activeReservations = filterActiveReservations(reservations);

    if (!Array.isArray(activeReservations) || activeReservations.length === 0) {
        emptyState.classList.remove("hidden");
        reservationCount.textContent = "0 active reservations";

        const emptyTitle = emptyState.querySelector("h4");
        const emptyText = emptyState.querySelector("p");

        if (emptyTitle) {
            emptyTitle.textContent = "No active reservations found";
        }

        if (emptyText) {
            emptyText.textContent = "Cancelled reservations are hidden from this page.";
        }

        return;
    }

    emptyState.classList.add("hidden");

    reservationCount.textContent =
        `${activeReservations.length} active reservation${activeReservations.length > 1 ? "s" : ""}`;

    activeReservations.forEach((reservation) => {
        reservationsContainer.appendChild(createReservationCard(reservation));
    });
}

async function loadReservationsForUser(userId) {
    const token = getToken();

    const response = await fetch(`${API_BASE_URL}/user/${userId}`, {
        headers: {
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
            typeof data === "string"
                ? data
                : data?.message || "Failed to load reservations.";

        throw new Error(errorMessage);
    }

    return extractReservationsArray(data);
}

async function refreshReservations(showSuccessMessage = false) {
    const userId = getStoredUserId();

    if (!userId) {
        showMessage(
            "error",
            "Login Required",
            "You must log in first before viewing reservations."
        );

        reservationsContainer.innerHTML = "";
        emptyState.classList.remove("hidden");
        reservationCount.textContent = "0 active reservations";
        return;
    }

    try {
        hideMessage();
        const warnings = await syncWarnings();

        const reservations = await loadReservationsForUser(userId);
        renderReservations(reservations);

        if (!showSuccessMessage && warnings.length > 0) {
            showMessage(
                "warning",
                "Reservation Alerts",
                warnings[0]?.message || "Some reservation statuses were updated."
            );
            return;
        }

        if (showSuccessMessage) {
            const activeReservations = filterActiveReservations(reservations);

            if (activeReservations.length > 0) {
                showMessage(
                    "success",
                    "Reservations Loaded",
                    "Active reservations were loaded successfully."
                );
            } else {
                showMessage(
                    "warning",
                    "No Active Reservations Found",
                    "No active reservations were found for your account."
                );
            }
        }
    } catch (error) {
        reservationsContainer.innerHTML = "";
        emptyState.classList.remove("hidden");
        reservationCount.textContent = "0 active reservations";

        showMessage(
            "error",
            "Load Failed",
            error.message || "Unable to load reservations."
        );
    }
}

async function cancelReservation(reservationId) {
    const confirmed = window.confirm("Are you sure you want to cancel this reservation?");

    if (!confirmed) return;

    try {
        hideMessage();

        const token = getToken();

        const response = await fetch(`${API_BASE_URL}/cancel/${reservationId}`, {
            method: "PUT",
            headers: {
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
                typeof data === "string"
                    ? data
                    : data?.message || "Failed to cancel reservation.";

            throw new Error(errorMessage);
        }

        showMessage(
            "success",
            "Reservation Cancelled",
            "The reservation was cancelled successfully."
        );

        await refreshReservations(false);
    } catch (error) {
        showMessage(
            "error",
            "Cancellation Failed",
            error.message || "Unable to cancel reservation."
        );
    }
}

refreshBtn.addEventListener("click", async () => {
    await refreshReservations(true);
});

clearBtn.addEventListener("click", () => {
    hideMessage();

    reservationsContainer.innerHTML = "";
    emptyState.classList.remove("hidden");
    reservationCount.textContent = "0 active reservations";

    const emptyTitle = emptyState.querySelector("h4");
    const emptyText = emptyState.querySelector("p");

    if (emptyTitle) {
        emptyTitle.textContent = "No active reservations found";
    }

    if (emptyText) {
        emptyText.textContent = "Cancelled reservations are hidden from this page.";
    }
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

function setupDashboardLink() {
    const dashboardLink = document.getElementById("adminNavLink");
    const role = (
        localStorage.getItem("role") ||
        localStorage.getItem("rrs.role") ||
        ""
    ).trim().toLowerCase();

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
refreshReservations(false);


