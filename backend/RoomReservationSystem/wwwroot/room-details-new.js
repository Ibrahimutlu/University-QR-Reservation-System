const ROOM_API_BASE_URL = (typeof window !== "undefined" && window.RRS_API_BASE
    ? window.RRS_API_BASE
    : "http://localhost:5000") + "/api/room";

const heroRoomName = document.getElementById("heroRoomName");
const heroRoomSubtitle = document.getElementById("heroRoomSubtitle");
const heroStatusText = document.getElementById("heroStatusText");
const heroRoomId = document.getElementById("heroRoomId");
const heroRoomType = document.getElementById("heroRoomType");

const roomIdEl = document.getElementById("roomId");
const roomNameEl = document.getElementById("roomName");
const roomTypeEl = document.getElementById("roomType");
const availabilityText = document.getElementById("availabilityText");
const availabilityBadge = document.getElementById("availabilityBadge");
const capacityText = document.getElementById("capacityText");

const reservationEmpty = document.getElementById("reservationEmpty");
const reservationDetails = document.getElementById("reservationDetails");
const reservationStatusEl = document.getElementById("reservationStatus");
const reservationStart = document.getElementById("reservationStart");
const reservationEnd = document.getElementById("reservationEnd");

const reserveRoomBtn = document.getElementById("reserveRoomBtn");
const reserveRoomBtnQr = document.getElementById("reserveRoomBtnQr");
const reserveNavBtn = document.getElementById("reserveNavBtn");

const logoutBtn = document.getElementById("logoutBtn");
const adminNavLink = document.getElementById("adminNavLink");

const messageBox = document.getElementById("messageBox");
const messageIcon = document.getElementById("messageIcon");
const messageTitle = document.getElementById("messageTitle");
const messageText = document.getElementById("messageText");

const qrSection = document.getElementById("qrSection");
const qrBox = document.getElementById("qrBox");
const qrFallbackText = document.getElementById("qrFallbackText");
const qrImage = document.getElementById("qrImage");
const qrMessage = document.getElementById("qrMessage");
const qrStatus = document.getElementById("qrStatus");
const qrExpiry = document.getElementById("qrExpiry");
const viewQrBtn = document.getElementById("viewQrBtn");

function getToken() {
    return localStorage.getItem("token");
}

function getRole() {
    return (localStorage.getItem("role") || "").trim().toLowerCase();
}

function getRoomIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("roomId");
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

function showMessage(type, title, text) {
    if (!messageBox) return;

    messageBox.classList.remove("hidden", "success", "error", "warning");
    messageBox.classList.add(type);

    messageTitle.textContent = title;
    messageText.textContent = text;
    messageIcon.textContent = type === "success" ? "✓" : type === "warning" ? "!" : "×";
}

function hideMessage() {
    if (!messageBox) return;

    messageBox.classList.add("hidden");
    messageBox.classList.remove("success", "error", "warning");
}

function formatDateTime(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString();
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

function normalizeRoom(room) {
    return {
        roomID: room.roomID ?? room.RoomID ?? room.id ?? room.ID,
        roomName: room.roomName ?? room.RoomName ?? room.name ?? room.Name ?? "Unknown Room",
        roomType: room.roomType ?? room.RoomType ?? room.type ?? room.Type ?? "Unknown Type",
        capacity: room.capacity ?? room.Capacity ?? 0,
        isAvailable: room.isAvailable ?? room.IsAvailable ?? true
    };
}

function normalizeStatusData(statusData) {
    const currentReservation =
        statusData.currentReservation ?? statusData.CurrentReservation ?? null;

    return {
        isAvailable: statusData.isAvailable ?? statusData.IsAvailable ?? true,
        currentReservation: currentReservation
            ? {
                startTime: currentReservation.startTime ?? currentReservation.StartTime ?? null,
                endTime: currentReservation.endTime ?? currentReservation.EndTime ?? null,
                status: currentReservation.status ?? currentReservation.Status ?? "Reserved"
            }
            : null
    };
}

async function fetchRoomById(targetRoomId) {
    const data = await apiRequest(`${ROOM_API_BASE_URL}`);
    const roomsArray = extractRoomsArray(data);
    const normalizedRooms = roomsArray.map(normalizeRoom);

    return normalizedRooms.find((room) => String(room.roomID) === String(targetRoomId));
}

async function fetchRoomStatus(roomIdValue) {
    const statusData = await apiRequest(`${ROOM_API_BASE_URL}/status/${roomIdValue}`);
    return normalizeStatusData(statusData);
}

function setReserveButtonState(button, isAvailable, reserveUrl) {
    if (!button) return;

    button.href = reserveUrl;

    if (!isAvailable) {
        button.classList.add("disabled");
        button.setAttribute("aria-disabled", "true");
        button.onclick = (event) => event.preventDefault();
    } else {
        button.classList.remove("disabled");
        button.removeAttribute("aria-disabled");
        button.onclick = null;
    }
}

function hideQrSection() {
    if (qrSection) {
        qrSection.classList.add("hidden");
    }
}

function showQrSection() {
    if (qrSection) {
        qrSection.classList.remove("hidden");
    }
}

function setQRNotAvailable(message = "QR could not be loaded.") {
    showQrSection();

    if (qrImage) {
        qrImage.classList.add("hidden");
        qrImage.removeAttribute("src");
    }

    if (qrFallbackText) {
        qrFallbackText.classList.remove("hidden");
    }

    if (qrBox) {
        qrBox.classList.remove("has-image");
    }

    if (qrStatus) {
        qrStatus.textContent = "Not Available";
    }

    if (qrExpiry) {
        qrExpiry.textContent = "—";
    }

    if (qrMessage) {
        qrMessage.textContent = message;
    }

    if (viewQrBtn) {
        viewQrBtn.disabled = true;
        viewQrBtn.textContent = "QR Not Ready";
        viewQrBtn.onclick = null;
    }
}

async function generateRoomQr(roomId, roomName) {
    const response = await fetch("http://localhost:3000/api/qr/generate-room", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            roomId: roomId,
            roomName: roomName || "",
            frontendBaseUrl: "http://localhost:5500"
        })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate QR.");
    }

    return data;
}

async function loadRoomQr(roomId, roomName) {
    if (!roomId) {
        hideQrSection();
        return;
    }

    showQrSection();

    try {
        const qrData = await generateRoomQr(roomId, roomName);

        if (!qrData.qrImage) {
            setQRNotAvailable("QR image was not returned.");
            return;
        }

        if (qrImage) {
            qrImage.src = qrData.qrImage;
            qrImage.classList.remove("hidden");
        }

        if (qrFallbackText) {
            qrFallbackText.classList.add("hidden");
        }

        if (qrBox) {
            qrBox.classList.add("has-image");
        }

        if (qrStatus) {
            qrStatus.textContent = "Ready";
        }

        if (qrExpiry) {
            qrExpiry.textContent = "Static Room QR";
        }

        if (qrMessage) {
            qrMessage.textContent = "Scan this QR code to open this room directly.";
        }

        if (viewQrBtn) {
            viewQrBtn.disabled = false;
            viewQrBtn.textContent = "Open Room Link";
            viewQrBtn.onclick = () => {
                window.open(qrData.targetUrl, "_blank");
            };
        }
    } catch (error) {
        console.error("QR load failed:", error);
        setQRNotAvailable("QR service is not available.");
    }
}

function renderRoomDetails(room, statusData) {
    const isAvailable =
        typeof statusData?.isAvailable === "boolean"
            ? statusData.isAvailable
            : room.isAvailable;

    const statusText = isAvailable ? "Available" : "Full";

    hideMessage();

    heroRoomName.textContent = room.roomName;
    heroRoomSubtitle.textContent = `View the live status and room information for ${room.roomName}.`;

    heroStatusText.textContent = statusText;
    heroRoomId.textContent = room.roomID;
    heroRoomType.textContent = room.roomType;

    roomIdEl.textContent = room.roomID;
    roomNameEl.textContent = room.roomName;
    roomTypeEl.textContent = room.roomType;
    availabilityText.textContent = statusText;
    capacityText.textContent = room.capacity;

    availabilityBadge.textContent = statusText;
    availabilityBadge.classList.remove("available", "busy");
    availabilityBadge.classList.add(isAvailable ? "available" : "busy");

    const reserveUrl = `reserve.html?roomId=${encodeURIComponent(room.roomID)}`;

    setReserveButtonState(reserveRoomBtn, isAvailable, reserveUrl);
    setReserveButtonState(reserveRoomBtnQr, isAvailable, reserveUrl);

    if (reserveNavBtn) {
        reserveNavBtn.href = reserveUrl;
    }

    if (isAvailable) {
        reservationEmpty.classList.remove("hidden");
        reservationDetails.classList.add("hidden");
    } else {
        reservationEmpty.classList.add("hidden");
        reservationDetails.classList.remove("hidden");

        reservationStatusEl.textContent =
            statusData?.currentReservation?.status || "Reserved";

        reservationStart.textContent = formatDateTime(
            statusData?.currentReservation?.startTime || null
        );

        reservationEnd.textContent = formatDateTime(
            statusData?.currentReservation?.endTime || null
        );
    }

    loadRoomQr(room.roomID, room.roomName);
}

async function initializePage() {
    const targetRoomId = getRoomIdFromUrl();

    if (!targetRoomId) {
        showMessage("warning", "Missing Room ID", "No room ID was provided in the URL.");
        hideQrSection();
        return;
    }

    try {
        const room = await fetchRoomById(targetRoomId);

        if (!room) {
            showMessage("error", "Room Not Found", "The requested room could not be found.");
            hideQrSection();
            return;
        }

        let statusData = null;

        try {
            statusData = await fetchRoomStatus(targetRoomId);
        } catch (error) {
            statusData = {
                isAvailable: room.isAvailable,
                currentReservation: null
            };
        }

        renderRoomDetails(room, statusData);
    } catch (error) {
        showMessage("error", "Load Failed", error.message || "Unable to load room details.");
        hideQrSection();
    }
}

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("userID");
        localStorage.removeItem("role");
        window.location.href = "login.html";
    });
}

setupDashboardLink();
initializePage();