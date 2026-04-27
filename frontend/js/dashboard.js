// Dashboard — list rooms and trigger the booking modal.
Auth.requireAuth();
Nav.render("dashboard");

const grid     = document.getElementById("rooms-grid");
const search   = document.getElementById("search");
const modalRoot = document.getElementById("modal-root");

let allRooms = [];

async function loadRooms() {
  try {
    allRooms = await Api.listRooms();
    renderRooms(allRooms);
  } catch (err) {
    grid.innerHTML = `<div class="empty col-span-full">⚠️ ${err.message}</div>`;
  }
}

function renderRooms(rooms) {
  if (!rooms || rooms.length === 0) {
    grid.innerHTML = `<div class="empty col-span-full">No rooms match your search.</div>`;
    return;
  }
  grid.innerHTML = rooms.map(r => roomCard(r)).join("");
}

function roomCard(r) {
  const badgeClass = r.isAvailable
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-slate-100 text-slate-500 border-slate-200";
  const badgeText = r.isAvailable ? "Available" : "Full";
  const typeIcon = r.roomType?.toLowerCase().includes("lab") ? "🧪"
                 : r.roomType?.toLowerCase().includes("class") ? "📚"
                 : r.roomType?.toLowerCase().includes("meet") ? "💼"
                 : "🏛️";

  return `
    <div class="card card-hoverable p-5">
      <div class="flex items-start justify-between mb-3">
        <div class="text-3xl leading-none">${typeIcon}</div>
        <span class="text-xs font-semibold px-2 py-1 rounded-full border ${badgeClass}">${badgeText}</span>
      </div>
      <h3 class="text-lg font-semibold text-slate-900 mb-1">${r.roomName}</h3>
      <p class="text-sm text-slate-500 mb-4">${r.roomType} · ${r.location}</p>

      <div class="flex items-center gap-4 text-xs text-slate-600 mb-4">
        <span>👥 Capacity: <strong class="text-slate-900">${r.capacity}</strong></span>
        <span>🆔 #${r.roomID}</span>
      </div>

      <button onclick="openBooking(${r.roomID})"
              class="btn-primary w-full" ${r.isAvailable ? "" : "disabled"}>
        Reserve
      </button>
    </div>`;
}

search.addEventListener("input", () => {
  const q = search.value.toLowerCase().trim();
  renderRooms(
    allRooms.filter(r =>
      (r.roomName || "").toLowerCase().includes(q) ||
      (r.roomType || "").toLowerCase().includes(q) ||
      (r.location || "").toLowerCase().includes(q))
  );
});

// ─── Booking modal ─────────────────────────────────────────
window.openBooking = function (roomId) {
  const room = allRooms.find(r => r.roomID === roomId);
  if (!room) return;

  const today = new Date().toISOString().split("T")[0];

  modalRoot.innerHTML = `
    <div class="modal-backdrop" onclick="if(event.target===this) closeBooking()">
      <div class="modal">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="text-xl font-semibold text-slate-900">Reserve ${room.roomName}</h2>
            <p class="text-sm text-slate-500">${room.roomType} · ${room.location}</p>
          </div>
          <button class="text-slate-400 hover:text-slate-700" onclick="closeBooking()">✕</button>
        </div>

        <form id="booking-form" class="space-y-4">
          <div>
            <label>Date</label>
            <input id="b-date" type="date" min="${today}" value="${today}" required>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label>Start time</label>
              <input id="b-start" type="time" required value="10:00">
            </div>
            <div>
              <label>End time</label>
              <input id="b-end" type="time" required value="11:00">
            </div>
          </div>

          <div id="b-error" class="hidden p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"></div>

          <div class="flex gap-2 pt-2">
            <button type="button" class="btn-secondary flex-1" onclick="closeBooking()">Cancel</button>
            <button type="submit" class="btn-primary flex-1" id="b-submit">Confirm reservation</button>
          </div>
        </form>
      </div>
    </div>`;

  document.getElementById("booking-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errBox = document.getElementById("b-error");
    const submit = document.getElementById("b-submit");
    errBox.classList.add("hidden");
    submit.disabled = true;
    submit.textContent = "Booking…";

    const date  = document.getElementById("b-date").value;
    const start = document.getElementById("b-start").value;
    const end   = document.getElementById("b-end").value;

    const payload = {
      userID:          Auth.userId(),
      roomID:          roomId,
      reservationDate: date + "T00:00:00",
      startTime:       date + "T" + start + ":00",
      endTime:         date + "T" + end   + ":00"
    };

    try {
      await Api.createReservation(payload);
      closeBooking();
      toast("Reservation confirmed ✓", "success");
      // Soft-refresh so capacity flips reflect.
      loadRooms();
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.remove("hidden");
      submit.disabled = false;
      submit.textContent = "Confirm reservation";
    }
  });
};

window.closeBooking = function () {
  modalRoot.innerHTML = "";
};

loadRooms();
