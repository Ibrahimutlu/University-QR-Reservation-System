// Renders a printable / displayable card for a room's door QR.
// Usage: print-qr.html?room=1
Auth.requireAuth();
Nav.render(null);

const params = new URLSearchParams(window.location.search);
const roomId = parseInt(params.get("room"), 10);

const loading = document.getElementById("loading");
const card    = document.getElementById("card");
const errBox  = document.getElementById("error");

if (!roomId) {
  showError("No room id supplied. Open this page as print-qr.html?room=1");
} else {
  load();
}

async function load() {
  try {
    // Use the Api wrapper but with a custom path
    const res = await fetch(window.APP_CONFIG.API_BASE + "/api/qr/room/" + roomId, {
      headers: { "Authorization": "Bearer " + Auth.token() }
    });
    if (!res.ok) {
      const txt = await res.text();
      let parsed; try { parsed = JSON.parse(txt); } catch {}
      throw new Error((parsed && parsed.message) || txt || res.statusText);
    }
    const data = await res.json();

    document.getElementById("title").textContent    = data.roomName;
    document.getElementById("type").textContent     = data.roomType;
    document.getElementById("location").textContent = data.location;
    document.getElementById("qr-img").src           = data.qrImage;
    document.getElementById("code").textContent     = data.qrCodeValue;

    loading.classList.add("hidden");
    card.classList.remove("hidden");

    document.title = "RoomLink — " + data.roomName + " QR";
  } catch (err) {
    showError(err.message);
  }
}

function showError(msg) {
  loading.classList.add("hidden");
  document.getElementById("error-msg").textContent = msg;
  errBox.classList.remove("hidden");
}
