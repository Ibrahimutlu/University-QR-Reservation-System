# API Endpoints

Base URLs:

- Local: `http://localhost:5000`
- Production: `https://university-qr-reservation-system-production.up.railway.app`

All protected endpoints require:

```http
Authorization: Bearer <jwt-token>
```

## Authentication

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Staff/admin email login |
| POST | `/api/auth/student-login` | Public | Student number login |
| POST | `/api/auth/register` | Admin | Create student accounts |

Student login body:

```json
{ "studentNumber": "20210001", "password": "123456" }
```

Staff/admin login body:

```json
{ "email": "admin@university.com", "password": "admin123" }
```

Successful login response:

```json
{
  "message": "Login successful",
  "token": "jwt...",
  "role": "Admin",
  "userID": 2,
  "email": "admin@university.com"
}
```

## Rooms

| Method | Path | Auth |
|---|---|---|
| GET | `/api/room` | Student/Staff/Admin |
| GET | `/api/room/status/{roomId}` | Student/Staff/Admin |
| GET | `/api/room/available-slots/{roomId}?date=YYYY-MM-DD` | Student/Staff/Admin |
| GET | `/api/room/search?...` | Student/Staff/Admin |
| POST | `/api/room/add` | Admin |
| PUT | `/api/room/update/{roomId}` | Admin |
| DELETE | `/api/room/delete/{roomId}` | Admin |

`available-slots` returns the standard 2-hour grid. Demo rooms do not use the
grid in the frontend; they use a free-form start/end picker and are validated
by `/api/reservation/create`.

## Reservations

| Method | Path | Auth |
|---|---|---|
| POST | `/api/reservation/create` | Student/Staff/Admin |
| GET | `/api/reservation/{id}` | Owner/Admin |
| GET | `/api/reservation/user/{userId}` | Owner/Admin |
| GET | `/api/reservation/active` | Student/Staff/Admin |
| GET | `/api/reservation/all` | Admin |
| PUT | `/api/reservation/cancel/{id}` | Owner/Admin |
| PUT | `/api/reservation/update/{id}` | Owner/Admin |
| GET | `/api/reservation/warnings` | Student/Staff/Admin |

Create request:

```json
{
  "userID": 1,
  "roomID": 1,
  "reservationDate": "2026-05-18T00:00:00",
  "startTime": "2026-05-18T10:00:00",
  "endTime": "2026-05-18T12:00:00"
}
```

Rules:

- Standard rooms require exact 2-hour slots starting at 08:00, 10:00, 12:00,
  14:00, 16:00, 18:00, or 20:00.
- Demo rooms (`IsDemoRoom=true`) bypass the 2-hour grid and single-active rule.
- Demo rooms still enforce room capacity.
- Standard rooms enforce one live reservation per user.
- Live statuses are `Pending`, `Confirmed`, `Active`, `CheckedIn`, and
  `OnBreak`.

## QR

| Method | Path | Auth |
|---|---|---|
| GET | `/api/qr/room/{roomId}` | Staff/Admin |
| POST | `/api/qr/create/{roomId}` | Admin |
| GET | `/api/qr/dynamic/{roomId}` | Staff/Admin |
| GET | `/api/qr/health/{roomId}` | Staff/Admin |
| GET | `/api/qr/validate?qrCodeValue=...` | Student/Staff/Admin |
| GET | `/api/qr/validate-dynamic?qrValue=...&roomId=...` | Student/Staff/Admin |
| POST | `/api/qr/validate-reservation` | Student/Staff/Admin |
| POST | `/api/qr/scan` | Student/Staff/Admin |
| POST | `/api/qr/check-in` | Student/Staff/Admin |
| POST | `/api/qr/break-out` | Student/Staff/Admin |
| POST | `/api/qr/break-in` | Student/Staff/Admin |
| POST | `/api/qr/check-out` | Student/Staff/Admin |
| POST | `/api/qr/rotate/{roomId}` | Admin |

QR scan body:

```json
{ "roomId": 1, "qrValue": "ROOM-1-A" }
```

Accepted QR sources:

- Static room QR values such as `ROOM-1-A`
- Dynamic rotating values such as `DYN-1-...`
- Reservation QR JSON payloads

Scan time matching compares both UTC and app-local time. The app-local offset
is configured by `APP_LOCAL_UTC_OFFSET_HOURS`, default `3`.

## Notifications

| Method | Path | Auth |
|---|---|---|
| GET | `/api/notifications/me` | Student/Staff/Admin |
| POST | `/api/notifications/{id}/read` | Student/Staff/Admin |
| POST | `/api/notifications/read-all` | Student/Staff/Admin |

Notification types:

- `ReservationCreated`
- `ReservationCancelled`
- `ReservationEnded`
- `BreakStarted`
- `BreakEnded`
- `BreakOverrun`
- `CheckInGraceWarning`
- `Expired`
- `NoShow`
- `NoExit`
- `Overstay`
- `Info`

## Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Public | Plain text API status |
| GET | `/health` | Public | `{ "status": "ok" }` |

## Reservation Status Values

- `Pending`
- `Confirmed`
- `Active`
- `CheckedIn`
- `OnBreak`
- `CheckedOut`
- `Cancelled`
- `Expired`
- `NoShow`
