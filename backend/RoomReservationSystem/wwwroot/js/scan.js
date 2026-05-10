// QR scanner page — uses html5-qrcode for the camera feed.
Auth.requireAuth();
Nav.render("scan");

const startBtn  = document.getElementById("start-btn");
const stopBtn   = document.getElementById("stop-btn");
const manualBtn = document.getElementById("manual-btn");
const manualEl  = document.getElementById("manual");
const resultEl  = document.getElementById("result");

let html5QrCode = null;
let scanning    = false;

async function handleScanned(text) {
  // Avoid double-firing while we route the result.
  if (!scanning) return;
  scanning = false;
  await stopCamera();

  await routePayload(text);
}

async function routePayload(text) {
  try {
    let res;
    if (text.trim().startsWith("{")) {
      // Looks like a reservation QR (JSON payload)
      res = await Api.validateReservationQR(text);
    } else {
      // Plain string → room sticker
      res = await Api.validateRoomQR(text);
    }
    showSuccess(res);
  } catch (err) {
    showError(err.message);
  }
}

function showSuccess(res) {
  resultEl.innerHTML = `
    <div class="card p-6 border-l-4" style="border-left-color:#10b981">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-2xl">✓</div>
        <h3 class="text-lg font-semibold text-emerald-700">Access granted</h3>
      </div>
      <dl class="grid grid-cols-2 gap-y-2 text-sm mt-3">
        ${res.reservationID ? `<dt class="text-slate-500">Reservation</dt><dd class="text-slate-900 font-medium">#${res.reservationID}</dd>` : ""}
        ${res.roomID        ? `<dt class="text-slate-500">Room</dt><dd class="text-slate-900 font-medium">#${res.roomID}</dd>` : ""}
        ${res.userID        ? `<dt class="text-slate-500">User</dt><dd class="text-slate-900 font-medium">#${res.userID}</dd>` : ""}
        ${res.validUntil    ? `<dt class="text-slate-500">Valid until</dt><dd class="text-slate-900 font-medium">${new Date(res.validUntil).toLocaleString()}</dd>` : ""}
      </dl>
      <button class="btn-primary mt-5" onclick="reset()">Scan again</button>
    </div>`;
}

function showError(message) {
  resultEl.innerHTML = `
    <div class="card p-6 border-l-4" style="border-left-color:#dc2626">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-2xl">✕</div>
        <h3 class="text-lg font-semibold text-red-700">Access denied</h3>
      </div>
      <p class="text-sm text-slate-700">${message}</p>
      <button class="btn-primary mt-5" onclick="reset()">Try again</button>
    </div>`;
}

window.reset = function () {
  resultEl.innerHTML = "";
  manualEl.value = "";
};

async function startCamera() {
  if (!html5QrCode) html5QrCode = new Html5Qrcode("reader");

  try {
    scanning = true;
    await html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      handleScanned,
      () => {} // ignore frame-level decode errors
    );
    startBtn.classList.add("hidden");
    stopBtn.classList.remove("hidden");
  } catch (err) {
    scanning = false;
    showError("Could not access camera: " + err);
  }
}

async function stopCamera() {
  if (html5QrCode && html5QrCode.isScanning) {
    try { await html5QrCode.stop(); } catch (_) {}
  }
  startBtn.classList.remove("hidden");
  stopBtn.classList.add("hidden");
}

startBtn.addEventListener("click", startCamera);
stopBtn .addEventListener("click", stopCamera);
manualBtn.addEventListener("click", () => {
  const v = manualEl.value.trim();
  if (v) routePayload(v);
});
