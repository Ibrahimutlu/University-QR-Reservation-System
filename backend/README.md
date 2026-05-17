# Backend - RoomLink API

ASP.NET Core 5 Web API for authentication, room management, reservations,
QR scanning, break mode, and in-app notifications.

## Run Locally

```powershell
cd backend\RoomReservationSystem
dotnet restore
dotnet run
```

Default local URLs:

- API: http://localhost:5000
- Swagger: http://localhost:5000/swagger
- Health: http://localhost:5000/health

`global.json` pins the SDK to 5.0.408.

## Main Services

| File | Purpose |
|---|---|
| `Controllers/AuthenticationController.cs` | Login and admin student registration |
| `Controllers/RoomController.cs` | Room list, status, slots, room CRUD |
| `Controllers/ReservationController.cs` | Create/cancel/update/list reservations and warning sync |
| `Controllers/QRController.cs` | Static QR, dynamic QR, check-in/out, break-in/out, QR health |
| `Controllers/NotificationController.cs` | In-app notification feed and read actions |
| `Services/QRService.cs` | QR image generation and dynamic QR validation |
| `Services/NotificationService.cs` | Idempotent notification writes |
| `Services/ReservationSweepService.cs` | Background expired/no-show/no-exit/break-overrun sweep |
| `Services/SchemaRepairService.cs` | Safe production schema repair on startup |

## Key Endpoints

| Method | Path | Auth |
|---|---|---|
| POST | `/api/auth/login` | Public staff/admin |
| POST | `/api/auth/student-login` | Public student |
| POST | `/api/auth/register` | Admin |
| GET | `/api/room` | Student/Staff/Admin |
| GET | `/api/room/status/{roomId}` | Student/Staff/Admin |
| GET | `/api/room/available-slots/{roomId}?date=YYYY-MM-DD` | Student/Staff/Admin |
| POST | `/api/reservation/create` | Student/Staff/Admin |
| GET | `/api/reservation/active` | Student/Staff/Admin |
| GET | `/api/reservation/warnings` | Student/Staff/Admin |
| GET | `/api/reservation/user/{userId}` | Owner/Admin |
| PUT | `/api/reservation/cancel/{id}` | Owner/Admin |
| POST | `/api/qr/check-in` | Student/Staff/Admin |
| POST | `/api/qr/break-out` | Student/Staff/Admin |
| POST | `/api/qr/break-in` | Student/Staff/Admin |
| POST | `/api/qr/check-out` | Student/Staff/Admin |
| GET | `/api/qr/dynamic/{roomId}` | Staff/Admin |
| GET | `/api/qr/health/{roomId}` | Staff/Admin |
| POST | `/api/qr/rotate/{roomId}` | Admin |
| GET | `/api/notifications/me` | Student/Staff/Admin |
| POST | `/api/notifications/{id}/read` | Student/Staff/Admin |
| POST | `/api/notifications/read-all` | Student/Staff/Admin |

## Reservation Rules

- Standard rooms must be reserved in exact 2-hour slots starting at 08:00,
  10:00, 12:00, 14:00, 16:00, 18:00, or 20:00.
- `IsDemoRoom=true` rooms bypass the 2-hour slot rule and the
  one-active-reservation-per-user rule, but capacity is still enforced.
- Live statuses that hold capacity are `Pending`, `Confirmed`, `Active`,
  `CheckedIn`, and `OnBreak`.
- `OnBreak` keeps the slot held until the user scans back in or the
  reservation ends.

## QR Flow

Staff/admin can display room QR codes. Students scan the QR from `scan.html`.

Accepted QR scan sources:

- Static room QR value, for example `ROOM-1-ROOMA`
- Dynamic rotating room QR value, for example `DYN-1-...`
- Reservation QR JSON payload

The scan endpoints check:

1. QR value is valid.
2. The caller has a matching reservation for the room.
3. The reservation status and time window allow the requested action.

Scan time matching compares both UTC and app-local time. The local offset is
controlled by `APP_LOCAL_UTC_OFFSET_HOURS`, default `3`.

## Notifications

Notifications are stored in `notifications` and returned by
`GET /api/notifications/me`.

Current notification types:

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
- `Info`

## Production Schema Repair

`SchemaRepairService` runs on backend startup. It adds missing final-submission
columns/tables/check constraints on older Railway databases without dropping
data. Do not use `database/schema.sql` in production unless a full reset is
intended.
