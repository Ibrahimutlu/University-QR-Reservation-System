# Frontend — RoomLink

Modern responsive UI for the Room Reservation System.
**No build step required** — static HTML, Tailwind CSS via CDN,
Inter via Google Fonts, vanilla JavaScript.

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

| File                | Purpose                                            |
|---------------------|----------------------------------------------------|
| `index.html`        | Login (entry point) with demo-account hint card    |
| `dashboard.html`    | Browse rooms grid · book modal · open door QR      |
| `reservations.html` | List user's bookings · view per-reservation QR · cancel |
| `scan.html`         | Camera-based QR scanner (door OR reservation QR)   |
| `admin.html`        | Admin-only room CRUD + door-QR access              |
| `print-qr.html`     | Printable / displayable door-QR sheet              |

---

## How auth works

1. `index.html` posts credentials to `POST /api/auth/login`.
2. The returned JWT, role, and userID are stored in `localStorage`.
3. `js/api.js` automatically attaches `Authorization: Bearer <token>` to every call.
4. `js/auth.js` exposes `Auth.requireAuth()` and `Auth.requireRole("Admin")`,
   which redirect unauthenticated/unauthorised visitors away.

---

## How QR scanning works

The frontend supports **two scanning modes** through the same UI:

| Source                                | Endpoint hit                         |
|---------------------------------------|--------------------------------------|
| Door sticker (`ROOM-1-LAB101` style)  | `GET  /api/qr/validate`              |
| Student's screen (JSON payload)       | `POST /api/qr/validate-reservation`  |

`scan.html` decides between them by looking at the scanned text — JSON-shaped
strings are routed as reservation tokens; everything else is treated as a
room sticker.

### How to display a QR for scanning

There are three QR-display flows in the system:

1. **Reservation QR (the student's "ticket")** — generated automatically
   when the booking is created. View it under **My Bookings -> View QR**.
   The modal shows the QR PNG ready to be scanned.

2. **Door sticker QR (admin / signage)** — open `print-qr.html?room=1` (or
   click the **QR** button on any room card / admin row). The page renders
   a clean, printable A4-friendly card with the room name and QR. Click
   **Print** to send it to your printer; or maximise the window and use it
   as a standalone screen for scanning.

3. **Manual fallback** — if the camera is blocked (some browsers refuse
   over plain HTTP), open **Scan QR**, type the sticker code (e.g.
   `ROOM-1-LAB101`) into the manual input box, and press **Validate**.

---

## Configuration

Edit one constant in `js/config.js` if your backend URL differs:

```js
window.APP_CONFIG = { API_BASE: "http://localhost:5000", ... };
```

---

## Libraries used (CDN — no install)

- [Tailwind CSS](https://tailwindcss.com/) — utility styling
- [Inter](https://fonts.google.com/specimen/Inter) — typeface
- [html5-qrcode](https://github.com/mebjas/html5-qrcode) — camera-based QR scanning
