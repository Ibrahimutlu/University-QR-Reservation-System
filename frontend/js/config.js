// Single point of configuration for the frontend.
//
// API_BASE — where the backend lives.
//   Local dev (browser on the same PC):    "http://localhost:5000"
//   LAN access (phone / other device):     "http://<your-PC-IP>:5000"
//
// The block below auto-resolves the right value:
//   * If the page itself was opened on localhost, use http://localhost:5000.
//   * Otherwise (page opened from a phone via http://192.168.X.Y:8000),
//     use the same hostname for the API on port 5000.
// You can also hard-code an explicit IP by replacing the whole expression.

(function () {
  const host = window.location.hostname;
  const apiHost = (host === "localhost" || host === "127.0.0.1") ? "localhost" : host;

  window.APP_CONFIG = {
    API_BASE: "http://" + apiHost + ":5000",
    APP_NAME: "RoomLink",
    TAGLINE:  "QR-Integrated University Room Reservation"
  };
})();
