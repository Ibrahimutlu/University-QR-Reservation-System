// ─────────────────────────────────────────────────────────────────
// Live QR Monitor — Staff/Admin only.
// Fetches the rotating dynamic QR for every room every 15 seconds and
// shows a countdown to the next backend-side rotation (2-minute window).
// ─────────────────────────────────────────────────────────────────

const __RRS_BASE = (typeof window !== "undefined" && window.RRS_API_BASE
    ? window.RRS_API_BASE
    : "http://localhost:5000");

const ROOM_API_BASE_URL    = __RRS_BASE + "/api/room";
const QR_DYNAMIC_BASE_URL  = __RRS_BASE + "/api/qr/dynamic";

const POLL_INTERVAL_MS     = 15 * 1000;
const ROTATION_WINDOW_SEC  = 120; // backend QRService uses 2-minute buckets

const grid       = document.getElementById("qrMonitorGrid");
const emptyState = document.getElementById("qrMonitorEmpty");
const logoutBtn  = document.getElementById("logoutBtn");

let rooms = [];
let pollTimer = null;
let countdownTimer = null;

// ─── Auth helpers ───────────────────────────────────────────────
function getToken() { return localStorage.getItem("token"); }
function getRole()  { return (localStorage.getItem("role") || "").trim().toLowerCase(); }

function requireStaffOrAdmin() {
    const token = getToken();
    const role  = getRole();
    if (!token || (role !== "admin" && role !== "staff")) {
        window.location.href = "login.html";
        return false;
    }
    return true;
}

// ─── API helpers ────────────────────────────────────────────────
async function apiGet(url) {
    const token = getToken();
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || ("HTTP " + response.status));
    }
    return response.json();
}

function extractRoomsArray(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.rooms)) return data.rooms;
    if (Array.isArray(data?.$values)) return data.$values;
    return [];
}

function normalizeRoom(room) {
    return {
        id:       room.roomID ?? room.RoomID ?? room.id ?? room.ID,
        name:     room.roomName ?? room.RoomName ?? "Unknown Room",
        type:     room.roomType ?? room.RoomType ?? "",
        location: room.location ?? room.Location ?? ""
    };
}

// ─── Card lifecycle ─────────────────────────────────────────────
function renderRoomCards(roomList) {
    grid.innerHTML = "";
    if (!roomList.length) {
        emptyState.classList.remove("hidden");
        return;
    }
    emptyState.classList.add("hidden");

    roomList.forEach(room => {
        const card = document.createElement("article");
        card.className = "qr-monitor-card";
        card.dataset.roomId = room.id;
        card.innerHTML = `
            <h3>${escapeHtml(room.name)}</h3>
            <p class="room-meta">
                ${escapeHtml(room.type)}${room.type && room.location ? " &middot; " : ""}${escapeHtml(room.location)}
            </p>
            <div class="qr-image-frame">
                <img alt="Live QR for ${escapeHtml(room.name)}" src="" />
            </div>
            <div class="countdown-row">
                Next rotation in&nbsp;<strong data-role="countdown">--:--</strong>
            </div>
            <div class="error-banner hidden" data-role="error"></div>
        `;
        grid.appendChild(card);
    });
}

function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g,
        c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

async function refreshRoomQR(card) {
    const roomId = card.dataset.roomId;
    const errEl  = card.querySelector('[data-role="error"]');
    const img    = card.querySelector("img");
    const frame  = card.querySelector(".qr-image-frame");

    try {
        const data = await apiGet(`${QR_DYNAMIC_BASE_URL}/${roomId}`);
        if (!data || !data.qrImage) throw new Error("Empty QR response");

        // Avoid the flash if the image hasn't changed.
        if (img.src !== data.qrImage) {
            frame.classList.add("fading");
            setTimeout(() => {
                img.src = data.qrImage;
                frame.classList.remove("fading");
            }, 120);
        }

        errEl.classList.add("hidden");
        errEl.textContent = "";
    } catch (err) {
        console.warn("QR refresh failed for room", roomId, err);
        errEl.textContent = "Could not load QR: " + (err.message || "network error");
        errEl.classList.remove("hidden");
    }
}

async function refreshAllRooms() {
    const cards = grid.querySelectorAll(".qr-monitor-card");
    await Promise.all(Array.from(cards).map(refreshRoomQR));
}

// ─── Countdown — synced to 2-minute server windows ──────────────
function updateCountdown() {
    const remaining =
        ROTATION_WINDOW_SEC - (Math.floor(Date.now() / 1000) % ROTATION_WINDOW_SEC);
    const m = Math.floor(remaining / 60).toString().padStart(1, "0");
    const s = (remaining % 60).toString().padStart(2, "0");
    grid.querySelectorAll('[data-role="countdown"]').forEach(el => {
        el.textContent = `${m}:${s}`;
    });
}

// ─── Bootstrap ──────────────────────────────────────────────────
async function init() {
    if (!requireStaffOrAdmin()) return;

    try {
        const raw = await apiGet(ROOM_API_BASE_URL);
        rooms = extractRoomsArray(raw).map(normalizeRoom).filter(r => r.id);
    } catch (err) {
        console.error("Could not load room list:", err);
        rooms = [];
    }

    renderRoomCards(rooms);
    if (!rooms.length) return;

    await refreshAllRooms();
    updateCountdown();

    pollTimer      = setInterval(refreshAllRooms, POLL_INTERVAL_MS);
    countdownTimer = setInterval(updateCountdown, 1000);
}

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("userID");
        localStorage.removeItem("role");
        if (pollTimer)      clearInterval(pollTimer);
        if (countdownTimer) clearInterval(countdownTimer);
        window.location.href = "login.html";
    });
}

window.addEventListener("beforeunload", () => {
    if (pollTimer)      clearInterval(pollTimer);
    if (countdownTimer) clearInterval(countdownTimer);
});

init();
