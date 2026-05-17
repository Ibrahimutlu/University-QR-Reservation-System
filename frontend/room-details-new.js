const __RRS_BASE = (() => {
    const fallback = "https://university-qr-reservation-system-production.up.railway.app";
    if (typeof window === "undefined") return "http://localhost:5000";
    const host = window.location.hostname;
    const explicit = window.RRS_API_BASE ? String(window.RRS_API_BASE).replace(/\/+$/, "") : "";
    const pageOrigin = String(window.location.origin || "").replace(/\/+$/, "");
    if (explicit && (["localhost", "127.0.0.1"].includes(host) || explicit !== pageOrigin)) return explicit;
    return ["localhost", "127.0.0.1"].includes(host) ? "http://localhost:5000" : fallback;
})();
const ROOM_API_BASE_URL = __RRS_BASE + "/api/room";

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
    return localStorage.getItem("token") || localStorage.getItem("rrs.token");
}

function getRole() {
    return (
        localStorage.getItem("role") ||
        localStorage.getItem("rrs.role") ||
        ""
    ).trim().toLowerCase();
}

if (!getToken()) {
    window.location.href = "login.html";
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

function canViewRoomIds() {
    const role = getRole();
    return role === "admin" || role === "staff";
}

function applyRoomIdVisibility() {
    document.querySelectorAll(".room-id-only").forEach((element) => {
        element.classList.toggle("hidden", !canViewRoomIds());
    });
}

function showMessage(type, title, text) {
    if (!messageBox) return;

    messageBox.classList.remove("hidden", "success", "error", "warning");
    messageBox.classList.add(type);

    messageTitle.textContent = title;
    messageText.textContent = text;
    messageIcon.textContent = type === "success" ? "OK" : type === "warning" ? "!" : "X";
}

function hideMessage() {
    if (!messageBox) return;

    messageBox.classList.add("hidden");
    messageBox.classList.remove("success", "error", "warning");
}

function formatDateTime(value) {
    if (!value) return "-";

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
        qrExpiry.textContent = "-";
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
    // Spec: only staff/admin may VIEW QR codes.  Backend enforces with 403
    // when a student calls this endpoint; the caller already handles errors.
    const token = getToken();
    const response = await fetch(__RRS_BASE + "/api/qr/room/" + roomId, {
        headers: token ? { Authorization: "Bearer " + token } : {}
    });

    if (!response.ok) {
        let msg = "Failed to generate QR.";
        if (response.status === 403) msg = "Only staff/admin can view this QR.";
        if (response.status === 404) msg = "Room QR not found.";
        const error = new Error(msg);
        error.status = response.status;
        throw error;
    }
    return await response.json();
}

async function createRoomQr(roomId) {
    const token = getToken();
    const response = await fetch(__RRS_BASE + "/api/qr/create/" + roomId, {
        method: "POST",
        headers: token ? { Authorization: "Bearer " + token } : {}
    });

    if (!response.ok) {
        throw new Error("QR could not be created.");
    }
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
            viewQrBtn.textContent = "Open Printable QR";
            viewQrBtn.onclick = () => {
                const qrLink = `print-qr.html?room=${encodeURIComponent(roomId)}`;
                window.location.href = qrLink;
            };
        }
    } catch (error) {
        if (getRole() === "admin" && error?.status === 404) {
            try {
                await createRoomQr(roomId);
                await loadRoomQr(roomId, roomName);
                return;
            } catch (createErr) {
                console.error("QR create failed:", createErr);
            }
        }

        console.error("QR load failed:", error);
        setQRNotAvailable(error?.message || "QR service is not available.");
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
    if (canViewRoomIds()) {
        heroRoomId.textContent = room.roomID;
        roomIdEl.textContent = room.roomID;
    }
    heroRoomType.textContent = room.roomType;

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

    const role = getRole();
    if (role === "admin" || role === "staff") {
        loadRoomQr(room.roomID, room.roomName);
    } else {
        hideQrSection();
    }
}

async function initializePage() {
    const targetRoomId = getRoomIdFromUrl();

    if (!targetRoomId) {
        showMessage("warning", "Missing Room", "No room was provided in the URL.");
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
        localStorage.removeItem("rrs.token");
        localStorage.removeItem("rrs.role");
        localStorage.removeItem("rrs.userId");
        localStorage.removeItem("rrs.email");
        window.location.href = "login.html";
    });
}

setupDashboardLink();
applyRoomIdVisibility();
initializePage();


