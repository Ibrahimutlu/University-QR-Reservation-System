const API_BASE_URL = (typeof window !== "undefined" && window.RRS_API_BASE
    ? window.RRS_API_BASE
    : "http://localhost:5000") + "/api/room";

const roomsContainer = document.getElementById("roomsContainer");
const filterForm = document.getElementById("filterForm");
const searchInput = document.getElementById("search");
const roomTypeSelect = document.getElementById("roomType");
const capacitySelect = document.getElementById("capacity");
const locationSelect = document.getElementById("location");
const availabilitySelect = document.getElementById("availability");
const emptyState = document.getElementById("emptyState");
const totalRoomsElement = document.getElementById("totalRooms");
const availableRoomsElement = document.getElementById("availableRooms");
const logoutBtn = document.getElementById("logoutBtn");
const adminNavLink = document.getElementById("adminNavLink");

let rooms = [];

function getToken() {
    return localStorage.getItem("token");
}

function getRole() {
    return (localStorage.getItem("role") || "").trim().toLowerCase();
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

    const locations = [...new Set(
        data
            .map((room) => String(room.location || "").trim())
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));

    populateSelect(roomTypeSelect, roomTypes, "All Types");
    populateSelect(locationSelect, locations, "All Locations");
}

function createRoomCard(room) {
    const article = document.createElement("article");
    article.className = "room-card";

    article.innerHTML = `
    <div class="room-header">
      <span class="room-id">Room ID: ${room.id}</span>
      <span class="room-status status-available">${room.status}</span>
    </div>

    <h3>${room.name}</h3>

    <div class="room-info">
      <p><strong>Room Type:</strong> ${room.type}</p>
      <p><strong>Total Capacity:</strong> ${room.capacity}</p>
      <p><strong>Location:</strong> ${room.location}</p>
    </div>

    <div class="room-actions">
      <a href="room-details.html?roomId=${encodeURIComponent(room.id)}" class="secondary-btn">Check Status</a>
      <a href="reserve.html?roomId=${encodeURIComponent(room.id)}" class="primary-btn">Reserve</a>
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

function matchesCapacity(roomCapacity, selectedRange) {
    if (!selectedRange) return true;

    if (selectedRange === "1-10") {
        return roomCapacity >= 1 && roomCapacity <= 10;
    }

    if (selectedRange === "11-30") {
        return roomCapacity >= 11 && roomCapacity <= 30;
    }

    if (selectedRange === "31-50") {
        return roomCapacity >= 31 && roomCapacity <= 50;
    }

    if (selectedRange === "50-plus") {
        return roomCapacity > 50;
    }

    return true;
}

function filterRooms() {
    const searchValue = searchInput.value.trim().toLowerCase();
    const roomTypeValue = roomTypeSelect.value;
    const capacityValue = capacitySelect.value;
    const locationValue = locationSelect.value;
    const availabilityValue = availabilitySelect.value;

    const filteredRooms = rooms.filter((room) => {
        const matchesSearch =
            room.name.toLowerCase().includes(searchValue) ||
            String(room.id).includes(searchValue);

        const matchesType = !roomTypeValue || room.type === roomTypeValue;
        const matchesLocation = !locationValue || room.location === locationValue;

        const matchesAvailability =
            !availabilityValue ||
            (availabilityValue === "Available" && room.isAvailable);

        const capacityMatch = matchesCapacity(Number(room.capacity), capacityValue);

        return (
            matchesSearch &&
            matchesType &&
            matchesLocation &&
            matchesAvailability &&
            capacityMatch
        );
    });

    renderRooms(filteredRooms);
    updateStats(filteredRooms);
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
    } catch (error) {
        console.error("Failed to load rooms:", error);

        rooms = [];
        renderRooms([]);
        updateStats([]);
    }
}

filterForm.addEventListener("submit", function (event) {
    event.preventDefault();
    filterRooms();
});

filterForm.addEventListener("reset", function () {
    setTimeout(() => {
        renderRooms(rooms);
        updateStats(rooms);
    }, 0);
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

setupDashboardLink();
loadRooms();

