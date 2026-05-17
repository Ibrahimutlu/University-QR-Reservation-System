const __RRS_BASE = (() => {
    const fallback = "https://university-qr-reservation-system-production.up.railway.app";
    if (typeof window === "undefined") return "http://localhost:5000";
    const host = window.location.hostname;
    const explicit = window.RRS_API_BASE ? String(window.RRS_API_BASE).replace(/\/+$/, "") : "";
    const pageOrigin = String(window.location.origin || "").replace(/\/+$/, "");
    if (explicit && (["localhost", "127.0.0.1"].includes(host) || explicit !== pageOrigin)) return explicit;
    return ["localhost", "127.0.0.1"].includes(host) ? "http://localhost:5000" : fallback;
})();
const API_BASE_URL = __RRS_BASE + "/api/room";

const roomsContainer = document.getElementById("roomsContainer");
const filterForm = document.getElementById("filterForm");
const searchInput = document.getElementById("search");
const roomTypeSelect = document.getElementById("roomType");
const filterResultCount = document.getElementById("filterResultCount");
const emptyState = document.getElementById("emptyState");
const totalRoomsElement = document.getElementById("totalRooms");
const availableRoomsElement = document.getElementById("availableRooms");
const logoutBtn = document.getElementById("logoutBtn");
const adminNavLink = document.getElementById("adminNavLink");

let rooms = [];

function getToken() {
    return localStorage.getItem("token") || localStorage.getItem("rrs.token");
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

function setupDashboardLink() {
    if (!adminNavLink) return;

    const role = getRole();

    if (role === "admin" || role === "staff") {
        adminNavLink.classList.remove("hidden");
        adminNavLink.textContent = "Dashboard";
        adminNavLink.href = "admin-dashboard.html";
    } else {
        adminNavLink.classList.add("hidden");
    }
}

if (!getToken()) {
    window.location.href = "login.html";
}

function normalizeRoom(room) {
    const capacity = room.capacity ?? room.Capacity ?? 0;
    const isAvailable = room.isAvailable ?? room.IsAvailable ?? true;

    return {
        id: room.roomID ?? room.RoomID ?? room.id ?? room.ID,
        name: room.roomName ?? room.RoomName ?? room.name ?? room.Name ?? "Unknown Room",
        type: room.roomType ?? room.RoomType ?? room.type ?? room.Type ?? "Unknown Type",
        capacity,
        location: room.location ?? room.Location ?? "Unknown Location",
        isAvailable,
        isDemoRoom: Boolean(room.isDemoRoom ?? room.IsDemoRoom ?? false),
        status: isAvailable ? "Available" : "Unavailable"
    };
}

async function apiRequest(url) {
    const token = getToken();

    const response = await fetch(url, {
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
            typeof data === "string" ? data : data?.message || "Request failed.";
        throw new Error(errorMessage);
    }

    return data;
}

function extractRoomsArray(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.rooms)) return data.rooms;
    if (Array.isArray(data?.Rooms)) return data.Rooms;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.Data)) return data.Data;
    if (Array.isArray(data?.$values)) return data.$values;
    return [];
}

async function fetchRooms() {
    const data = await apiRequest(API_BASE_URL);
    console.log("Raw /api/room response:", data);

    const roomsArray = extractRoomsArray(data);
    return roomsArray.map(normalizeRoom);
}

async function syncReservationWarnings() {
    const baseUrl = API_BASE_URL.replace("/api/room", "/api/reservation/warnings");
    try {
        const data = await apiRequest(baseUrl);
        if (Array.isArray(data) && data.length) {
            console.log("Reservation warnings synced:", data);
        }
    } catch (error) {
        // Warnings are non-blocking for this page.
        console.warn("Warning sync failed:", error.message || error);
    }
}

function updateStats(data) {
    if (totalRoomsElement) {
        totalRoomsElement.textContent = data.length;
    }

    if (availableRoomsElement) {
        availableRoomsElement.textContent = data.filter((room) => room.isAvailable).length;
    }
}

function populateSelect(select, values, defaultLabel) {
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = defaultLabel;
    select.appendChild(defaultOption);

    values.forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });

    const hasCurrent = values.includes(currentValue);
    select.value = hasCurrent ? currentValue : "";
}

function populateDynamicFilters(data) {
    const roomTypes = [...new Set(
        data
            .map((room) => String(room.type || "").trim())
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));

    populateSelect(roomTypeSelect, roomTypes, "All Types");
}

function createRoomCard(room) {
    const article = document.createElement("article");
    article.className = "room-card";
    const roomIdBadge = canViewRoomIds()
        ? `<span class="room-id">Room ID: ${room.id}</span>`
        : "";

    const demoBadge = room.isDemoRoom
        ? '<span class="room-status" style="margin-left:6px;background:#e9f5ff;color:#0a4a78;border:1px solid #7aa6e0;">Demo Room — book any time</span>'
        : "";

    article.innerHTML = `
    <div class="room-header">
      ${roomIdBadge}
      <span class="room-status status-available">${room.status}</span>
      ${demoBadge}
    </div>

    <h3>${room.name}</h3>

    <div class="room-info">
      <p><strong>Room Type:</strong> ${room.type}</p>
      <p><strong>Total Capacity:</strong> ${room.capacity}</p>
      <p><strong>Location:</strong> ${room.location}</p>
      ${room.isDemoRoom ? '<p><strong>Booking:</strong> Free-form (any start time, any duration)</p>' : ''}
    </div>

    <div class="room-actions">
      <a href="reserve.html?roomId=${encodeURIComponent(room.id)}" class="primary-btn">Reserve This Room</a>
    </div>
  `;

    return article;
}

function renderRooms(data) {
    roomsContainer.innerHTML = "";

    if (!Array.isArray(data) || data.length === 0) {
        emptyState.classList.remove("hidden");
        return;
    }

    emptyState.classList.add("hidden");

    data.forEach((room) => {
        roomsContainer.appendChild(createRoomCard(room));
    });
}

function filterRooms() {
    const searchValue = searchInput.value.trim().toLowerCase();
    const roomTypeValue = roomTypeSelect.value;

    const filteredRooms = rooms.filter((room) => {
        const matchesSearch =
            room.name.toLowerCase().includes(searchValue) ||
            String(room.id).includes(searchValue);

        const matchesType = !roomTypeValue || room.type === roomTypeValue;

        return matchesSearch && matchesType;
    });

    renderRooms(filteredRooms);
    updateStats(filteredRooms);
    updateFilterCount(filteredRooms.length);
}

function updateFilterCount(count) {
    if (!filterResultCount) return;
    filterResultCount.textContent = `${count} ${count === 1 ? "room" : "rooms"}`;
}

async function loadRooms() {
    try {
        roomsContainer.innerHTML = "";
        emptyState.classList.add("hidden");

        await syncReservationWarnings();
        rooms = await fetchRooms();
        populateDynamicFilters(rooms);

        console.log("Normalized rooms:", rooms);

        renderRooms(rooms);
        updateStats(rooms);
        updateFilterCount(rooms.length);
    } catch (error) {
        console.error("Failed to load rooms:", error);

        rooms = [];
        renderRooms([]);
        updateStats([]);
        updateFilterCount(0);

        const titleEl = emptyState.querySelector("h3");
        const textEl = emptyState.querySelector("p");
        const rawMessage = String(error?.message || "");
        const unauthorized =
            /401|unauthorized|onaylanmad|session expired/i.test(rawMessage);

        if (titleEl) {
            titleEl.textContent = unauthorized
                ? "Session is not authorized"
                : "Rooms could not be loaded";
        }

        if (textEl) {
            textEl.textContent = unauthorized
                ? "Your login token is being rejected by the backend. Please sign out and log in again."
                : "Unable to fetch room data from backend. Please try again.";
        }

        emptyState.classList.remove("hidden");
    }
}

filterForm.addEventListener("submit", function (event) {
    event.preventDefault();
});

if (searchInput) searchInput.addEventListener("input", filterRooms);
if (roomTypeSelect) roomTypeSelect.addEventListener("change", filterRooms);

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

setupDashboardLink();
loadRooms();
