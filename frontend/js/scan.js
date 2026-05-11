Auth.requireAuth();
Nav.render("scan");

const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");
const manualBtn = document.getElementById("manual-btn");
const manualEl = document.getElementById("manual");
const resultEl = document.getElementById("result");
const modeButtons = Array.from(document.querySelectorAll(".scan-mode-toggle button"));
const logoutBtn = document.getElementById("logoutBtn");
const adminNavLink = document.getElementById("adminNavLink");

let html5QrCode = null;
let scanning = false;
let currentMode = "checkin";

function activeMode() {
  return currentMode === "checkout" ? "checkout" : "checkin";
}

function setupDashboardLink() {
  const role = String(Auth.role() || "").trim().toLowerCase();
  if (!adminNavLink) return;

  if (role === "admin" || role === "staff") {
    adminNavLink.classList.remove("hidden");
  } else {
    adminNavLink.classList.add("hidden");
  }
}

function canViewRoomIds() {
  const role = String(Auth.role() || "").trim().toLowerCase();
  return role === "admin" || role === "staff";
}

function setMode(mode) {
  currentMode = mode === "checkout" ? "checkout" : "checkin";
  modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === currentMode);
  });
}

function extractRoomIdFromText(text) {
  const roomPattern = /(?:ROOM|DYN)-(\d+)-/i;
  const roomMatch = String(text || "").match(roomPattern);
  if (roomMatch && roomMatch[1]) return Number(roomMatch[1]);

  const numeric = Number(text);
  if (Number.isInteger(numeric) && numeric > 0) return numeric;

  return null;
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function roomIdFromReservationPayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  const candidates = [payload.roomId, payload.RoomId, payload.roomID, payload.RoomID];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isInteger(n) && n > 0) return n;
  }
  return null;
}

function normalizeSuccessData(raw) {
  return {
    message: raw?.message || "Success",
    reservationID: raw?.reservationID ?? raw?.ReservationID ?? raw?.reservationId ?? null,
    roomID: raw?.roomID ?? raw?.RoomID ?? raw?.roomId ?? null,
    userID: raw?.userID ?? raw?.UserID ?? raw?.userId ?? null,
    status: raw?.status ?? raw?.Status ?? null,
    validUntil: raw?.validUntil ?? raw?.ValidUntil ?? null
  };
}

async function routePayload(text) {
  const mode = activeMode();
  const value = String(text || "").trim();

  if (!value) {
    throw new Error("QR value is empty.");
  }

  const asJson = value.startsWith("{") ? tryParseJson(value) : null;

  let roomId = null;
  let qrValue = null;

  if (asJson) {
    roomId = roomIdFromReservationPayload(asJson);
    if (!roomId) {
      const validated = await Api.validateReservationQR(value);
      roomId = Number(validated.roomID ?? validated.RoomID ?? 0) || null;
    }
  } else {
    roomId = extractRoomIdFromText(value);
    qrValue = value;
  }

  if (!roomId) {
    throw new Error("Room could not be resolved from QR payload.");
  }

  const payload = { roomId, qrValue };

  if (mode === "checkin") {
    return normalizeSuccessData(await Api.checkIn(payload));
  }

  return normalizeSuccessData(await Api.checkOut(payload));
}

function showSuccess(res) {
  const isCheckIn = activeMode() === "checkin";
  const actionLabel = isCheckIn ? "Access Granted" : "Check-Out Complete";
  const roomText = canViewRoomIds() && res.roomID ? `Room #${res.roomID}` : "Room confirmed";
  const timeText = new Date().toLocaleString();

  resultEl.innerHTML = `
    <div class="access-result granted">
      <div class="result-icon">OK</div>
      <h3>${actionLabel}</h3>
      <p>${res.message || "Operation completed successfully."}</p>
      <p class="meta">${roomText}</p>
      <p class="meta">${timeText}</p>
      ${res.status ? `<p class="meta">Status: ${res.status}</p>` : ""}
      <div class="scanner-actions">
        <button class="primary-btn" type="button" onclick="window.scanReset()">Scan Again</button>
      </div>
    </div>`;
}

function showError(message) {
  resultEl.innerHTML = `
    <div class="access-result denied">
      <div class="result-icon">!</div>
      <h3>Access Denied</h3>
      <p>${message}</p>
      <div class="scanner-actions">
        <button class="secondary-btn" type="button" onclick="window.scanReset()">Try Again</button>
      </div>
    </div>`;
}

window.scanReset = function () {
  resultEl.innerHTML = "";
  manualEl.value = "";
};

async function handleScanned(text) {
  if (!scanning) return;
  scanning = false;
  await stopCamera();

  try {
    const response = await routePayload(text);
    showSuccess(response);
  } catch (err) {
    showError(err.message || "Unexpected scan error.");
  }
}

async function startCamera() {
  if (!html5QrCode) {
    html5QrCode = new Html5Qrcode("reader");
  }

  try {
    scanning = true;
    await html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      handleScanned,
      () => {}
    );
    startBtn.classList.add("hidden");
    stopBtn.classList.remove("hidden");
  } catch (err) {
    scanning = false;
    showError("Camera could not be started: " + err);
  }
}

async function stopCamera() {
  if (html5QrCode && html5QrCode.isScanning) {
    try {
      await html5QrCode.stop();
    } catch {
      // no-op
    }
  }
  startBtn.classList.remove("hidden");
  stopBtn.classList.add("hidden");
}

startBtn.addEventListener("click", startCamera);
stopBtn.addEventListener("click", stopCamera);
modeButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});
manualBtn.addEventListener("click", async () => {
  const raw = manualEl.value.trim();
  if (!raw) {
    showError("Please provide a QR value for manual action.");
    return;
  }

  try {
    const response = await routePayload(raw);
    showSuccess(response);
  } catch (err) {
    showError(err.message || "Manual action failed.");
  }
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", Auth.logout);
}

setupDashboardLink();
setMode("checkin");
