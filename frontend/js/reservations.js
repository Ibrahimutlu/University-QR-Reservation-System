// "My Bookings" page — list reservations and show QR codes.
Auth.requireAuth();
Nav.render("reservations");

const listEl    = document.getElementById("list");
const modalRoot = document.getElementById("modal-root");
let cache       = [];

async function load() {
  try {
    cache = await Api.myReservations(Auth.userId());
    render(cache);
  } catch (err) {
    listEl.innerHTML = `<div class="empty">⚠️ ${err.message}</div>`;
  }
}

function statusPill(status) {
  const map = {
    Confirmed: "pill-confirmed",
    Cancelled: "pill-cancelled",
    Pending:   "pill-pending",
    Expired:   "pill-expired"
  };
  return `<span class="pill ${map[status] || "pill-pending"}">${status}</span>`;
}

function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " · " +
         d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function render(items) {
  if (!items || items.length === 0) {
    listEl.innerHTML = `<div class="empty">You have no bookings yet.</div>`;
    return;
  }

  listEl.innerHTML = items.map(r => `
    <div class="card p-5 flex flex-wrap items-center gap-4">
      <div class="flex-1 min-w-[200px]">
        <div class="flex items-center gap-2 mb-1">
          <h3 class="font-semibold text-slate-900">${r.room?.roomName || "Room"}</h3>
          ${statusPill(r.status)}
        </div>
        <p class="text-sm text-slate-500">
          ${r.room?.roomType || ""} · ${r.room?.location || ""}
        </p>
        <p class="text-sm text-slate-700 mt-1">
          ${fmtDateTime(r.startTime)} → ${new Date(r.endTime).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}
        </p>
      </div>

      <div class="flex gap-2">
        ${r.status === "Confirmed" ? `
          <button class="btn-secondary text-sm" onclick="showQR(${r.reservationID})">View QR</button>
          <button class="btn-danger" onclick="cancel(${r.reservationID})">Cancel</button>
        ` : ``}
      </div>
    </div>
  `).join("");
}

window.showQR = function (id) {
  const r = cache.find(x => x.reservationID === id);
  if (!r) return;

  modalRoot.innerHTML = `
    <div class="modal-backdrop" onclick="if(event.target===this) closeModal()">
      <div class="modal text-center">
        <div class="flex justify-end">
          <button class="text-slate-400 hover:text-slate-700" onclick="closeModal()">✕</button>
        </div>
        <h2 class="text-xl font-semibold text-slate-900 mb-1">${r.room?.roomName}</h2>
        <p class="text-sm text-slate-500 mb-5">
          ${fmtDateTime(r.startTime)} → ${new Date(r.endTime).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}
        </p>

        ${r.qrImage
          ? `<div class="qr-canvas mx-auto"><img src="${r.qrImage}" alt="Reservation QR" class="w-56 h-56"/></div>`
          : `<div class="empty">No QR available for this booking.</div>`}

        <p class="text-xs text-slate-400 mt-4">
          Show this QR at the door scanner to check in.
        </p>
      </div>
    </div>`;
};

window.closeModal = function () { modalRoot.innerHTML = ""; };

window.cancel = async function (id) {
  if (!confirm("Cancel this reservation?")) return;
  try {
    await Api.cancelReservation(id);
    toast("Reservation cancelled", "success");
    load();
  } catch (err) {
    toast(err.message, "error");
  }
};

load();
