Auth.requireAuth();

const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");
const manualBtn = document.getElementById("manual-btn");
const manualEl = document.getElementById("manual");
const resultEl = document.getElementById("result");
const modeButtons = Array.from(document.querySelectorAll(".scan-mode-toggle button"));
const breakBtn = document.getElementById("breakModeBtn");
const breakHint = document.getElementById("breakHint");
const logoutBtn = document.getElementById("logoutBtn");
const adminNavLink = document.getElementById("adminNavLink");

const VALID_MODES = ["checkin", "break", "checkout"];

let html5QrCode = null;
let scanning = false;
let currentMode = "checkin";
let currentReservationStatus = null;

function activeMode() {
  return VALID_MODES.includes(currentMode) ? currentMode : "checkin";
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
  currentMode = VALID_MODES.includes(mode) ? mode : "checkin";
  modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === currentMode);
  });
}

function updateBreakButtonLabel() {
  if (!breakBtn) return;
  if (currentReservationStatus === "OnBreak") {
    breakBtn.textContent = "End Break";
  } else {
    breakBtn.textContent = "Start Break";
  }
}

function updateBreakHint() {
  if (!breakHint) return;
  if (!currentReservationStatus) {
    breakHint.textContent = "";
    return;
  }
  if (currentReservationStatus === "CheckedIn") {
    breakHint.textContent = "Tip: scan with 'Start Break' to step out for up to 15 minutes without losing your slot.";
  } else if (currentReservationStatus === "OnBreak") {
    breakHint.textContent = "You are currently on break. Scan with 'End Break' to resume your session.";
  } else {
    breakHint.textContent = "";
  }
}

async function refreshReservationStatus() {
  try {
    const active = await Api.activeReservation();
    currentReservationStatus = active && active.status ? active.status : null;
  } catch {
    currentReservationStatus = null;
  }
  updateBreakButtonLabel();
  updateBreakHint();
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
    const res = normalizeSuccessData(await Api.checkIn(payload));
    await refreshReservationStatus();
    return res;
  }

  if (mode === "break") {
    const op = currentReservationStatus === "OnBreak" ? Api.breakIn : Api.breakOut;
    const raw = await op(payload);
    await refreshReservationStatus();
    return normalizeSuccessData(raw);
  }

  const res = normalizeSuccessData(await Api.checkOut(payload));
  await refreshReservationStatus();
  return res;
}

function showSuccess(res) {
  const mode = activeMode();
  let actionLabel = "Operation Successful";
  if (mode === "checkin") actionLabel = "Access Granted";
  else if (mode === "checkout") actionLabel = "Check-Out Complete";
  else if (mode === "break") {
    actionLabel = currentReservationStatus === "CheckedIn" ? "Break Ended" : "Break Started";
  }
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

function showValidating() {
  resultEl.innerHTML = `
    <div class="access-result" style="background:#f4f6fb;border:1px solid #b9c5de;color:#243b66;">
      <div class="result-icon">…</div>
      <h3>Validating QR</h3>
      <p>Checking your scan with the server.</p>
    </div>`;
}

async function handleScanned(text) {
  if (!scanning) return;
  scanning = false;
  showValidating();

  try {
    const response = await routePayload(text);
    await stopCamera();
    showSuccess(response);
  } catch (err) {
    await stopCamera();
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
refreshReservationStatus();
