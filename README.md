# RoomLink — University QR Room Reservation System

> **Course:** Com6064 Software Engineering
> **Status:** Demo-ready — three modules integrated, one-click launcher provided.

A three-tier room reservation platform with QR-based check-in.
Students, staff and administrators can browse rooms, reserve time slots,
generate per-booking QR codes, and validate access by scanning either a
room sticker or a student's reservation QR.

<p align="center">
  <img alt=".NET 5" src="https://img.shields.io/badge/.NET-5.0-512BD4?logo=dotnet&logoColor=white">
  <img alt="ASP.NET Core" src="https://img.shields.io/badge/ASP.NET%20Core-Web%20API-512BD4">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-14%2B-336791?logo=postgresql&logoColor=white">
  <img alt="JWT" src="https://img.shields.io/badge/Auth-JWT%20Bearer-000000?logo=jsonwebtokens&logoColor=white">
  <img alt="TailwindCSS" src="https://img.shields.io/badge/Tailwind-CDN-06B6D4?logo=tailwindcss&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/license-Academic-lightgrey">
</p>

---

## Modules

| Module       | Status   | Tech Stack                                                                |
|--------------|----------|---------------------------------------------------------------------------|
| **Backend**  | Complete | ASP.NET Core 5.0 · EF Core · JWT Bearer · QRCoder · Swagger               |
| **Database** | Complete | PostgreSQL 14+ (Npgsql provider)                                          |
| **Frontend** | Complete | HTML5 · TailwindCSS (CDN) · Vanilla JS · html5-qrcode · No build step     |
| **QR Layer** | Complete | Per-reservation QR + per-room door stickers, both rendered server-side    |

---

## One-Click Demo (Windows)

The project ships with two batch files at the repo root:

| Script           | What it does                                                                                       |
|------------------|----------------------------------------------------------------------------------------------------|
| `start-demo.bat` | Verifies prerequisites · sets up the database · starts backend · starts frontend · opens browser. |
| `stop-demo.bat`  | Closes the spawned terminals and frees ports 5000 and 8000.                                       |

**Just double-click `start-demo.bat`** and wait ~15 seconds. The browser opens to <http://localhost:8000>.

> **Prerequisites (one-time):**
> - .NET 5 SDK at `C:\Program Files\dotnet\` (verify with `dotnet --list-sdks`)
> - WSL with PostgreSQL (`sudo service postgresql start`)
> - Python 3 on PATH (for the static frontend server)

---

## Repository Layout

```
University-QR-Reservation-System/
├── start-demo.bat            ← one-click launcher (Windows)
├── stop-demo.bat             ← clean shutdown
│
├── backend/
│   ├── README.md
│   ├── global.json           ← pins SDK to 5.0.408
│   ├── RoomReservationSystem.sln
│   └── RoomReservationSystem/
│       ├── Controllers/      Auth · Room · Reservation · QR
│       ├── Models/           User · Room · Reservation · QR · LoginRequest
│       ├── Services/         JwtService · QRService
│       ├── Data/             AppDbContext
│       ├── Properties/       launchSettings.json
│       ├── Program.cs · Startup.cs
│       ├── appsettings.json
│       └── RoomReservationSystem.csproj
│
├── frontend/
│   ├── README.md
│   ├── index.html            ← Login (entry point)
│   ├── dashboard.html        ← Browse rooms + book + open door QR
│   ├── reservations.html     ← My bookings + per-booking QR
│   ├── scan.html             ← Camera-based QR scanner
│   ├── admin.html            ← Admin: room CRUD + door-QR access
│   ├── print-qr.html         ← Printable / displayable door QR
│   ├── css/styles.css
│   └── js/                   config · auth · api · nav · login · dashboard ·
│                             reservations · scan · admin · print-qr
│
├── database/
│   ├── README.md
│   ├── schema.sql            ← 4 tables, FKs, CHECK, composite index
│   ├── seed.sql              ← 4 users, 3 rooms, 3 QR codes
│   └── fix-pg-bind.sh        ← one-time WSL Postgres bind fix
│
├── docs/
│   ├── README.md
│   └── Report5-DatabaseAndIntegration.pdf
│
├── .gitignore
├── .env.example
└── README.md                 ← this file
```

---

## Demo Accounts

| Role    | Email                       | Password   |
|---------|-----------------------------|------------|
| Student | `ahmed@university.com`      | `123456`   |
| Student | `sara@university.com`       | `654321`   |
| Staff   | `sara.staff@university.com` | `123456`   |
| Admin   | `admin@university.com`      | `admin123` |

---

## Demo Walkthrough (5 minutes)

1. **`start-demo.bat`** — wait until the browser opens.
2. **Login** as Ahmed → Dashboard with three room cards.
3. Click **Reserve** on *Lab 101* → pick a time → confirm. Toast: *Reservation confirmed*.
4. **My Bookings** → click **View QR** → modal shows the per-reservation QR.
5. Click the **QR** button on a room card → opens a printable door-QR sheet.
6. Open **Scan QR** in another tab (or your phone) → either:
   - Type a sticker code (`ROOM-1-LAB101`) and click **Validate**.
   - Or scan the QR from step 4 with your camera.
7. Logout → log in as **Admin** → **Admin** tab → add / edit / delete rooms; click **QR** to print door stickers.

---

## End-to-End Data Flow

```
+----------+  POST /api/auth/login    +----------+  SELECT user        +----------+
| FRONTEND | ---{email,password}----> | BACKEND  | --WHERE Email=?---> |PostgreSQL|
|          | <----{token,role,id}---- | +JwtSvc  | <--user row-------- |          |
+----------+                          +----------+                     +----------+
     |  stores JWT in localStorage
     |
     |  POST /api/reservation/create   (Authorization: Bearer ...)
     v
+----------------------------------------------------------------+
| ReservationController                                          |
|   - Validate range, ownership                                  |
|   - Overlap check on (RoomID, !Cancelled, half-open range)     |
|   - INSERT reservation                                         |
|   - QRService.GenerateReservationQR(...)                       |
|   - UPDATE reservations.QRCodeData = payload                   |
|   - Return { reservationID, qrPayload, qrImage(base64 PNG) }   |
+----------------------------------------------------------------+
     |
     |  GET /api/qr/validate?qrCodeValue=ROOM-1-LAB101  (door scan)
     |  POST /api/qr/validate-reservation { payload: "<JSON>" }  (phone scan)
     v
+----------------------------------------------------------------+
| QRController                                                   |
|   - Look up room QR  OR  parse reservation JSON                |
|   - Cross-check current time against the reservation window    |
|   - Cross-check reservation status == "Confirmed"              |
|   - Return Access granted / denied                             |
+----------------------------------------------------------------+
```

---

## API Reference (high level)

| Method | Path                                            | Auth                     |
|--------|-------------------------------------------------|--------------------------|
| POST   | `/api/auth/login`                               | Public                   |
| GET    | `/api/room`                                     | Student / Staff / Admin  |
| GET    | `/api/room/status/{roomId}`                     | Student / Staff / Admin  |
| GET    | `/api/room/available-slots/{roomId}?date=...`   | Student / Staff / Admin  |
| POST   | `/api/room/add`                                 | Admin                    |
| PUT    | `/api/room/update/{roomId}`                     | Admin                    |
| DELETE | `/api/room/delete/{roomId}`                     | Admin                    |
| POST   | `/api/reservation/create`                       | Student / Staff / Admin  |
| GET    | `/api/reservation/{id}`                         | Owner or Admin           |
| GET    | `/api/reservation/user/{userId}`                | Owner or Admin           |
| PUT    | `/api/reservation/cancel/{id}`                  | Owner or Admin           |
| GET    | `/api/qr/room/{roomId}`                         | Student / Staff / Admin  |
| GET    | `/api/qr/validate?qrCodeValue=...`              | Student / Staff / Admin  |
| POST   | `/api/qr/validate-reservation`                  | Student / Staff / Admin  |

Full request/response schemas live in Swagger at <http://localhost:5000/swagger>.

---

## Database Schema

```
users         (UserID PK, FirstName, LastName, Email UNIQUE,
               Password, Role CHECK in {Student,Admin,Staff}, StudentNumber)

rooms         (RoomID PK, RoomName, RoomType, Capacity,
               Location, IsAvailable, QRCode)

reservations  (ReservationID PK, UserID FK->users, RoomID FK->rooms,
               ReservationDate, StartTime, EndTime,
               Status, CreatedAt, QRCodeData)

qr_codes      (QRID PK, RoomID FK->rooms UNIQUE, QRCodeValue, IsActive)

INDEX idx_reservations_conflict_check
      ON reservations (RoomID, Status, StartTime, EndTime)
```

---

## Manual Test Scenarios

Detailed scenarios (booking, conflict detection, cancellation, scanner, role separation, admin CRUD) are in [`docs/Report5-DatabaseAndIntegration.pdf`](docs/Report5-DatabaseAndIntegration.pdf).
TL;DR — all six scenarios pass on a fresh `start-demo.bat` run.

---

## Module Owners

| Area                                | Owner          |
|-------------------------------------|----------------|
| Backend (controllers, JWT, QR)      | Roba           |
| **Database & Module Integration**   | **Ibrahim**    |
| Frontend / UX                       | This repo      |
| Reports                             | Ibrahim & Roba |

---

## Documentation

- `docs/Report1-*.pdf` — Initial design / requirements
- `docs/Report2-*.pdf` — Conflict-control algorithm
- `docs/Report3-*.pdf` — Implementation report
- `docs/Report4-*.pdf` — Backend implementation (Roba)
- **`docs/Report5-DatabaseAndIntegration.pdf` — Database + integration (Ibrahim)**

---

## License

Academic project — for coursework demonstration only.
