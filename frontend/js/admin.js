// Admin page — Room CRUD. Locked to Admin role.
Auth.requireRole("Admin");
Nav.render("admin");

const tbody     = document.getElementById("tbody");
const modalRoot = document.getElementById("modal-root");

async function load() {
  try {
    const rooms = await Api.listRooms();
    if (!rooms || rooms.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-slate-400 py-8">No rooms yet — add one.</td></tr>`;
      return;
    }
    tbody.innerHTML = rooms.map(r => `
      <tr class="border-t border-slate-100">
        <td class="px-4 py-3 text-slate-500">#${r.roomID}</td>
        <td class="px-4 py-3 font-medium text-slate-900">${r.roomName}</td>
        <td class="px-4 py-3">${r.roomType}</td>
        <td class="px-4 py-3">${r.capacity}</td>
        <td class="px-4 py-3">${r.location}</td>
        <td class="px-4 py-3">
          ${r.isAvailable
            ? `<span class="pill pill-confirmed">Available</span>`
            : `<span class="pill pill-expired">Full</span>`}
        </td>
        <td class="px-4 py-3 text-right">
          <button class="btn-secondary text-xs" onclick='openEdit(${JSON.stringify(r)})'>Edit</button>
          <button class="btn-danger text-xs"   onclick="del(${r.roomID})">Delete</button>
        </td>
      </tr>`).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-red-500 py-8">⚠️ ${err.message}</td></tr>`;
  }
}

function roomForm(action, room = {}) {
  return `
    <div class="modal-backdrop" onclick="if(event.target===this) closeModal()">
      <div class="modal">
        <div class="flex justify-between items-start mb-4">
          <h2 class="text-xl font-semibold">${action} room</h2>
          <button class="text-slate-400 hover:text-slate-700" onclick="closeModal()">✕</button>
        </div>
        <form id="rf" class="space-y-3">
          <div>
            <label>Name</label>
            <input id="f-name"     value="${room.roomName || ""}"  required>
          </div>
          <div>
            <label>Type</label>
            <input id="f-type"     value="${room.roomType || ""}"  required placeholder="Laboratory / Classroom / Meeting Room">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label>Capacity</label>
              <input id="f-cap"     type="number" min="1" value="${room.capacity || 1}" required>
            </div>
            <div>
              <label>Location</label>
              <input id="f-loc"     value="${room.location || ""}" required>
            </div>
          </div>
          <div id="f-err" class="hidden p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"></div>
          <div class="flex gap-2 pt-2">
            <button type="button" class="btn-secondary flex-1" onclick="closeModal()">Cancel</button>
            <button type="submit"  class="btn-primary flex-1">Save</button>
          </div>
        </form>
      </div>
    </div>`;
}

window.openAdd = function () {
  modalRoot.innerHTML = roomForm("Add");
  document.getElementById("rf").addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = readForm();
    try {
      await Api.addRoom(body);
      closeModal(); toast("Room added", "success"); load();
    } catch (err) { showFormError(err.message); }
  });
};

window.openEdit = function (r) {
  modalRoot.innerHTML = roomForm("Edit", r);
  document.getElementById("rf").addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = readForm();
    try {
      await Api.updateRoom(r.roomID, body);
      closeModal(); toast("Room updated", "success"); load();
    } catch (err) { showFormError(err.message); }
  });
};

window.del = async function (id) {
  if (!confirm("Delete this room? This cannot be undone.")) return;
  try {
    await Api.deleteRoom(id);
    toast("Room deleted", "success");
    load();
  } catch (err) {
    toast(err.message, "error");
  }
};

window.closeModal = function () { modalRoot.innerHTML = ""; };

function readForm() {
  return {
    roomName: document.getElementById("f-name").value.trim(),
    roomType: document.getElementById("f-type").value.trim(),
    capacity: Number(document.getElementById("f-cap").value),
    location: document.getElementById("f-loc").value.trim()
  };
}
function showFormError(msg) {
  const e = document.getElementById("f-err");
  e.textContent = msg;
  e.classList.remove("hidden");
}

load();
