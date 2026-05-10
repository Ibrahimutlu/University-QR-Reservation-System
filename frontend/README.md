# Frontend — RoomLink

Modern responsive UI for the Room Reservation System.
**No build step required** — static HTML, vanilla JavaScript, CSS via the
team's per-page stylesheets.

---

## Run

The fastest path is the repo-root launcher:

```bat
..\start-demo.bat
```

Or, manually:

```bash
cd frontend
python -m http.server 8000
```

Open <http://localhost:8000>.

> **Why a server and not double-click?** Modern browsers block `fetch()`
> calls from `file://` origins. Any tiny static file server works.

---

## Pages

| File                          | Purpose                                              | Auth                |
|-------------------------------|------------------------------------------------------|---------------------|
| `index.html`                  | Auto-redirect to `login.html`                        | public              |
| `login.html`                  | Login page (email + password)                        | public              |
| `rooms.html`                  | Browse rooms grid                                    | Student/Staff/Admin |
| `room-details.html`           | Room detail view                                     | Student/Staff/Admin |
| `reserve.html`                | Booking form (2-hour slots)                          | Student/Staff/Admin |
| `my-reservations.html`        | List user's bookings                                 | Student/Staff/Admin |
| `reservation-details.html`    | Reservation detail / cancel / re-schedule            | Student/Staff/Admin |
| `admin-dashboard.html`        | Admin: room CRUD + reservation oversight             | Admin only          |
| `scan.html`                   | Camera-based QR scanner (entry / exit)               | Student/Staff/Admin |
| `print-qr.html`               | Printable / displayable door QR                      | Staff/Admin only    |

After login, students/staff land on `rooms.html`; admins land on `admin-dashboard.html`.

---

## How auth works

1. `login.html` posts credentials to `POST /api/auth/login`.
2. The returned JWT, role, and `userID` are stored in `localStorage`
   under the keys `token`, `role`, `userID` respectively.
3. Every fetch in the page-specific scripts attaches
   `Authorization: Bearer <token>`.
4. Pages that require auth check `localStorage.getItem("token")` and
   redirect back to `login.html` when missing or expired.

---

## How the API base URL is resolved

Every entry HTML injects this **before** loading any page-specific script:

```html
<script>window.RRS_API_BASE = "https://university-qr-reservation-system-production.up.railway.app";</script>
```

The page-specific scripts (`login.js`, `rooms-api.js`, `reserve-new.js`,
`my-reservations-new.js`, `reservation-details-new.js`, `room-details-new.js`,
`admin-dashboard.js`) read `window.RRS_API_BASE` and fall back to
`http://localhost:5000` when the variable is absent (local dev).

The shared `js/` modules (`config.js`, `api.js`, `auth.js`, `nav.js`,
`scan.js`, `print-qr.js`) used by `scan.html` and `print-qr.html` follow
the same convention.

---

## How QR scanning works

The frontend supports **two scanning modes** through `scan.html`:

| Source                                | Endpoint hit                          |
|---------------------------------------|---------------------------------------|
| Door sticker (e.g. `ROOM-1-A`)        | `GET  /api/qr/validate`               |
| Student's reservation token (JSON)    | `POST /api/qr/validate-reservation`   |

`scan.html` decides between them by looking at the scanned text — JSON-shaped
strings are routed as reservation tokens; everything else is treated as a
room sticker.

### Spec rule — only Staff/Admin can VIEW a QR

The backend enforces this with `[Authorize(Roles="Staff,Admin")]` on the
`GET /api/qr/room/{id}` and `GET /api/qr/dynamic/{id}` endpoints. Students
can scan but never see a QR image inside the UI.

### Three QR-display flows

1. **Door sticker QR (Staff / Admin only)** — open `print-qr.html?room=1`,
   prints a clean A4-friendly card with the room name and QR. Click **Print**
   or maximise the window for live demos.
2. **Door scanning (any role)** — `scan.html` reads the QR from the camera,
   posts to `/api/qr/check-in` or `/api/qr/check-out`.
3. **Manual fallback** — if the camera is blocked over plain HTTP, type the
   sticker code (`ROOM-1-A`) directly into the manual input box on `scan.html`.

---

## Configuration

The runtime API base lives in two places:

* **Production (Vercel / GitHub Pages / Railway-served):** the inline
  `<script>window.RRS_API_BASE="..."</script>` injected at the top of every
  entry HTML.
* **Local dev:** the fallback inside `js/config.js`:

```js
// frontend/js/config.js
window.APP_CONFIG = {
  API_BASE: "http://localhost:5000",  // fallback
  ...
};
```

Override at any time by setting `localStorage.setItem("rrs_api_base", "...")`
in the browser console — useful when probing the staging URL from a deployed
build.

---

## Libraries used (CDN — no install)

- [Tailwind CSS](https://tailwindcss.com/) — utility styling for `scan.html`,
  `print-qr.html`, and the redirect `index.html`
- [Inter](https://fonts.google.com/specimen/Inter) — typeface for the same set
- [html5-qrcode](https://github.com/mebjas/html5-qrcode) — camera-based QR scanning

The team's pages (`login.html`, `rooms.html`, `reserve.html`,
`my-reservations.html`, `reservation-details.html`, `room-details.html`,
`admin-dashboard.html`) use their own per-page CSS files (`login.css`,
`reserve.css`, etc.) plus the shared `style.css`.
