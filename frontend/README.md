# Frontend — RoomLink

Modern responsive UI for the Room Reservation System.
**No build step required** — just static files, Tailwind CSS via CDN,
and vanilla JavaScript.

## Pages

| File                   | Purpose                              |
|------------------------|--------------------------------------|
| `index.html`           | Login (entry point)                  |
| `dashboard.html`       | Browse rooms · open booking modal    |
| `reservations.html`    | List user's bookings · view QR · cancel |
| `scan.html`            | Camera-based QR scanner              |
| `admin.html`           | Admin-only room CRUD                 |

## Run locally

```bash
# Any static file server works:
cd frontend
python -m http.server 8080
# or
npx http-server -p 8080
```
Open <http://localhost:8080>.

## Configuration

Edit one constant in `js/config.js` if your backend URL differs:
```js
window.APP_CONFIG = { API_BASE: "http://localhost:5000", ... };
```

## How auth works

1. `index.html` posts credentials to `/api/auth/login`.
2. The returned JWT, role and userID are stored in `localStorage`.
3. `js/api.js` automatically attaches `Authorization: Bearer <token>` to every call.
4. `js/auth.js` exposes `Auth.requireAuth()` and `Auth.requireRole("Admin")`,
   which redirect unauthenticated/unauthorised visitors away.

## Libraries used (CDN)

- [Tailwind CSS](https://tailwindcss.com/) — styling
- [Inter](https://fonts.google.com/specimen/Inter) — typeface
- [html5-qrcode](https://github.com/mebjas/html5-qrcode) — camera QR scanning
