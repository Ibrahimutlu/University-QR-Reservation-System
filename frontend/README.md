# Frontend - RoomLink

Static HTML/CSS/JavaScript frontend for the University QR Room Reservation
System. There is no build step.

## Run Locally

```bash
cd frontend
python -m http.server 8000
```

Open http://localhost:8000.

Do not open pages directly with `file://`; browser security blocks API fetches
from file origins.

## Pages

| File | Purpose | Auth |
|---|---|---|
| `index.html` | Redirects to login | Public |
| `login.html` | Student/staff/admin login | Public |
| `rooms.html` | Room list and reserve links | Student/Staff/Admin |
| `reserve.html` | Reservation form with slot picker or demo-room free-form time picker | Student/Staff/Admin |
| `my-reservations.html` | User reservations | Student/Staff/Admin |
| `reservation-details.html` | Reservation details and actions | Student/Staff/Admin |
| `scan.html` | QR scanner for check-in, break, and check-out | Student/Staff/Admin |
| `admin-dashboard.html` | Room/user/reservation management | Admin/Staff with role-specific UI |
| `qr-monitor.html` | Live rotating QR monitor | Staff/Admin |
| `print-qr.html` | Printable room QR page | Staff/Admin |

The old `room-details.html` page was removed because it duplicated room data
and caused broken navigation.

## API Base Resolution

Most pages set `window.RRS_API_BASE` before loading page scripts:

```html
<script>
window.RRS_API_BASE =
  (["localhost","127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:5000"
    : "https://university-qr-reservation-system-production.up.railway.app");
</script>
```

Shared modules that use `window.APP_CONFIG` fall back to the same Railway API
URL in production.

## Authentication

Login stores JWT and user metadata in both modern and legacy localStorage keys:

- `rrs.token`, `rrs.role`, `rrs.userId`, `rrs.email`
- `token`, `role`, `userID`

Scripts attach `Authorization: Bearer <token>` on API calls.

## Reservation UI

- Standard rooms show the 2-hour slot grid from
  `/api/room/available-slots/{roomId}`.
- Demo Presentation Room uses a free-form start/end time picker.
- Demo room detection uses `isDemoRoom` from the backend and a fallback check
  on room name/type containing `Demo`.

## QR Scanner

`scan.html` supports three modes:

- Check In -> `POST /api/qr/check-in`
- Start Break / End Break -> `POST /api/qr/break-out` or `/break-in`
- Check Out -> `POST /api/qr/check-out`

The scanner accepts camera input and manual pasted QR values.

## Notifications

`js/notifications.js` injects a sticky notification bar at the top of `<main>`
on authenticated pages. It polls `/api/notifications/me` every 30 seconds while
the tab is visible.

If there are no unread notifications, it shows `No new notifications` so the
bar is visibly present during demos. If the endpoint fails, it renders an error
row instead of failing silently.

## Libraries

- `html5-qrcode` CDN for camera scanning
- Vanilla JavaScript fetch helpers
- Page-level CSS files plus shared `style.css`
