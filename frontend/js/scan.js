Auth.requireAuth();
Nav.render("scan");

const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");
const manualBtn = document.getElementById("manual-btn");
const manualEl = document.getElementById("manual");
const resultEl = document.getElementById("result");
const scanModeEl = document.getElementById("scanMode");

let html5QrCode = null;
let scanning = false;

function activeMode() {
  const raw = (scanModeEl && scanModeEl.value) || "validate";
  return ["validate", "checkin", "checkout"].includes(raw) ? raw : "validate";
}

function extractRoomIdFromText(text) {
  const roomPattern = /ROOM-(\d+)-/i;
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

  if (mode === "validate") {
    if (asJson) {
      return normalizeSuccessData(await Api.validateReservationQR(value));
    }
    return normalizeSuccessData(await Api.validateRoomQR(value));
  }

  // check-in / check-out flow
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
    throw new Error("Room ID could not be resolved from QR payload.");
  }

  const payload = { roomId, qrValue };

  if (mode === "checkin") {
    return normalizeSuccessData(await Api.checkIn(payload));
  }

  return normalizeSuccessData(await Api.checkOut(payload));
}

function showSuccess(res) {
  const actionLabel = activeMode() === "validate"
    ? "Access Validation Successful"
    : activeMode() === "checkin"
      ? "Check-In Successful"
      : "Check-Out Successful";

  resultEl.innerHTML = `
    <div class="result-card success">
      <h3>${actionLabel}</h3>
      <p>${res.message || "Operation completed successfully."}</p>
      <dl>
        ${res.reservationID ? `<dt>Reservation</dt><dd>#${res.reservationID}</dd>` : ""}
        ${res.roomID ? `<dt>Room</dt><dd>#${res.roomID}</dd>` : ""}
        ${res.userID ? `<dt>User</dt><dd>#${res.userID}</dd>` : ""}
        ${res.status ? `<dt>Status</dt><dd>${res.status}</dd>` : ""}
        ${res.validUntil ? `<dt>Valid Until</dt><dd>${new Date(res.validUntil).toLocaleString()}</dd>` : ""}
      </dl>
      <div class="scanner-actions">
        <button class="primary-btn" type="button" onclick="window.scanReset()">Scan Again</button>
      </div>
    </div>`;
}

function showError(message) {
  resultEl.innerHTML = `
    <div class="result-card error">
      <h3>Action Failed</h3>
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
