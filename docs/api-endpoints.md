# API Endpoints

Base URL:
* **Local**: `http://localhost:5000`
* **Production**: `https://your-api.up.railway.app`

All non-public endpoints expect:

```http
Authorization: Bearer <jwt-token>
```

The token is returned by `POST /api/auth/login` and carries claims for `NameIdentifier` (UserID), `Email`, and `Role`.

---

## Authentication

### `POST /api/auth/login` — public

Request:
```json
{ "email": "admin@university.com", "password": "admin123" }
```

Response 200:
```json
{
  "message": "Login successful",
  "token":   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role":    "Admin",
  "userID":  2
}
```

Response 401:
```json
"Invalid email or password"
```

> Student-number + name login is on the roadmap; for now students log in with the email seeded by the admin (see `docs/final-integration-report.md`).

### `POST /api/auth/register` — Admin only

Request:
```json
{
  "firstName":     "Yeni",
  "lastName":      "Ogrenci",
  "email":         "yeni@university.com",
  "password":      "demo123",
  "role":          "Student",
  "studentNumber": "20210099"
}
```

Response 200 — `{ message, userID, email, role }`.

---

## Rooms

| Method | Path                                            | Auth                     |
|--------|-------------------------------------------------|--------------------------|
| GET    | `/api/room`                                     | Student / Staff / Admin  |
| GET    | `/api/room/status/{roomId}`                     | Student / Staff / Admin  |
| GET    | `/api/room/available-slots/{roomId}?date=...`   | Student / Staff / Admin  |
| GET    | `/api/room/search?type=&minCapacity=&...`       | Student / Staff / Admin  |
| POST   | `/api/room/add`                                 | Admin                    |
| PUT    | `/api/room/update/{roomId}`                     | Admin                    |
| DELETE | `/api/room/delete/{roomId}`                     | Admin                    |

### `GET /api/room/available-slots/{roomId}?date=YYYY-MM-DD`

Returns 2-hour slots between 08:00 and 22:00 with availability counts.

```json
{
  "RoomID": 1, "RoomName": "Room A", "totalCapacity": 1, "Date": "2026-04-29",
  "AvailableSlots": [
    { "StartTime": "08:00", "EndTime": "10:00", "remainingCapacity": 1, "isAvailable": true, "Status": "Available" },
    { "StartTime": "10:00", "EndTime": "12:00", "remainingCapacity": 1, "isAvailable": true, "Status": "Available" }
  ],
  "BookedSlots": [
    { "StartTime": "12:00", "EndTime": "14:00", "remainingCapacity": 0, "isAvailable": false, "Status": "Full" }
  ]
}
```

---

## Reservations

| Method | Path                                           | Auth                     |
|--------|------------------------------------------------|--------------------------|
| POST   | `/api/reservation/create`                      | Student / Staff / Admin  |
| GET    | `/api/reservation/{id}`                        | Owner or Admin           |
| GET    | `/api/reservation/user/{userId}`               | Owner or Admin           |
| GET    | `/api/reservation/all`                         | Admin                    |
| PUT    | `/api/reservation/cancel/{id}`                 | Owner or Admin           |
| PUT    | `/api/reservation/update/{id}`                 | Owner or Admin           |
| GET    | `/api/reservation/warnings`                    | Student / Staff / Admin  |

### `POST /api/reservation/create`

Rules enforced in this order:
1. Body present, `endTime > startTime`.
2. **Slot must be exactly 2 hours**, start on the hour, start hour ∈ {8,10,12,14,16,18,20}.
3. Date / time must be in the future.
4. Caller must own the reservation (or be Admin).
5. Room and user must exist.
6. **Single-active rule** — caller cannot already have a `Pending` / `Confirmed` / `Active` / `CheckedIn` reservation.
7. **Overlap rule** — no two confirmed reservations on the same room and time.

Request:
```json
{
  "userID":          1,
  "roomID":          1,
  "reservationDate": "2026-04-29T00:00:00",
  "startTime":       "2026-04-29T10:00:00",
  "endTime":         "2026-04-29T12:00:00"
}
```

Response 200:
```json
{
  "message":       "Reservation created successfully",
  "reservationID": 42,
  "status":        "Confirmed",
  "qrPayload":     "{...JSON encoded inside the QR...}",
  "qrImage":       "data:image/png;base64,..."
}
```

Common 400 errors:
| Message                                                            | Cause                       |
|--------------------------------------------------------------------|------------------------------|
| `Reservations must be exactly 2 hours long`                        | duration != 2h               |
| `Reservation start time must be on the hour`                       | non-zero minutes / seconds   |
| `Reservation must start on an even hour between 08:00 and 20:00`   | start hour off-grid          |
| `This student already has an active reservation. ...`              | single-active rule           |
| `Room is fully booked for the selected time slot`                  | overlap                      |

### `GET /api/reservation/warnings`

Called by the student dashboard on every load. Returns one entry per stale reservation:

```json
[
  {
    "kind": "missing_checkin",
    "reservationID": 42,
    "roomID": 1,
    "graceMinutesRemaining": 10,
    "message": "Rezervasyon saatiniz basladi ancak QR girisiniz yapilmadi. ..."
  },
  {
    "kind": "expired",
    "reservationID": 43,
    "roomID": 2,
    "message": "Giris suresi doldu. Rezervasyon iptal edildi."
  }
]
```

The endpoint also writes status updates (`Expired`, `NoShow`) directly to the DB — so a single call to `/warnings` is enough to keep state consistent without a background job.

---

## QR

| Method | Path                                            | Auth                     |
|--------|-------------------------------------------------|--------------------------|
| GET    | `/api/qr/room/{roomId}`                         | Staff / Admin            |
| POST   | `/api/qr/create/{roomId}`                       | Admin                    |
| GET    | `/api/qr/dynamic/{roomId}`                      | Staff / Admin            |
| GET    | `/api/qr/validate?qrCodeValue=...`              | Student / Staff / Admin  |
| GET    | `/api/qr/validate-dynamic?qrValue=...&roomId=`  | Student / Staff / Admin  |
| POST   | `/api/qr/scan`                                  | Student / Staff / Admin  |
| POST   | `/api/qr/check-in`                              | Student / Staff / Admin  |
| POST   | `/api/qr/check-out`                             | Student / Staff / Admin  |
| POST   | `/api/qr/rotate/{roomId}`                       | Admin                    |
| POST   | `/api/qr/validate-reservation`                  | Student / Staff / Admin  |

> **Visibility rule**: students can only call the *scanning* endpoints (`scan`, `check-in`, `check-out`, `validate*`). They cannot retrieve QR images via `GET /api/qr/room/...` or `GET /api/qr/dynamic/...` — those return 403.

### `POST /api/qr/check-in`

Request:
```json
{ "roomId": 1, "qrValue": "ROOM-1-A" }
```

Response 200:
```json
{
  "message":       "Checked in",
  "reservationID": 42,
  "status":        "CheckedIn",
  "validUntil":    "2026-04-29T12:00:00"
}
```

Validations:
1. QR token belongs to that room AND is still active.
2. Caller has a `Confirmed` or `Active` reservation now.
3. The reservation is not already checked-in.

### `POST /api/qr/check-out`

Same body as check-in. Requires reservation to be in `CheckedIn` status. Transitions to `CheckedOut`, writes scan log.

### `POST /api/qr/rotate/{roomId}` — Admin only

Forces a fresh dynamic QR token. Useful for "the previous code leaked" scenarios.

---

## Health

| Method | Path       | Auth | Description |
|--------|------------|------|-------------|
| GET    | `/`        | open | Plain text "API is running" |
| GET    | `/health`  | open | `{ "status": "ok" }` |

---

## Status enum (reservations)

| Value         | When set                                                                       |
|---------------|--------------------------------------------------------------------------------|
| `Pending`     | (reserved for future flows, currently unused)                                  |
| `Confirmed`   | Initial state on `POST /create`                                                |
| `Active`      | (reserved — currently controllers go straight to `CheckedIn`)                  |
| `CheckedIn`   | After successful `POST /check-in`                                              |
| `CheckedOut`  | After `POST /check-out`                                                        |
| `Cancelled`   | After `PUT /cancel/{id}`                                                       |
| `Expired`     | After `GET /warnings` finds a reservation past its start + grace, no check-in |
| `NoShow`      | After `GET /warnings` finds a reservation past its end with no check-in       |

A partial unique index in `schema.sql` ensures a student cannot have more than one row in `Pending`, `Confirmed`, `Active`, or `CheckedIn` at a time.
