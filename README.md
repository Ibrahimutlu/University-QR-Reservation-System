# 🏛️ RoomLink — QR-Integrated University Room Reservation System

> Course: **Com6064 Software Engineering**

A three-tier room reservation platform with QR-based check-in.
Students, staff and administrators can browse rooms, reserve time slots,
generate per-booking QR codes, and validate access by scanning either a
room sticker or a student's reservation QR.

---

## 📦 Modules

| Module       | Status         | Tech Stack                                                                 |
|--------------|----------------|----------------------------------------------------------------------------|
| **Backend**  | ✅ Complete    | ASP.NET Core 5.0 · EF Core · JWT Bearer · QRCoder · Swagger                |
| **Database** | ✅ Complete    | PostgreSQL 14+ (Npgsql provider)                                           |
| **Frontend** | ✅ Complete    | HTML5 · TailwindCSS (CDN) · Vanilla JS · html5-qrcode · No build step      |
| **QR Layer** | ✅ Complete    | `QRService` generates per-reservation QRs · `QRController` validates both |

---

## 🗂️ Repository Layout

```
RoomReservationSystem-Integrated/
├── backend/
│   ├── README.md
│   ├── RoomReservationSystem.sln
│   └── RoomReservationSystem/
│       ├── Controllers/   (Auth, Room, Reservation, QR)
│       ├── Models/        (User, Room, Reservation, QR, LoginRequest)
│       ├── Services/      (JwtService, QRService)
│       ├── Data/          (AppDbContext)
│       ├── Properties/    (launchSettings.json)
│       ├── appsettings.json
│       ├── Program.cs · Startup.cs
│       └── RoomReservationSystem.csproj
│
├── frontend/
│   ├── README.md
│   ├── index.html         ← Login page (entry point)
│   ├── dashboard.html     ← Browse rooms + book
│   ├── reservations.html  ← My bookings + QR display
│   ├── scan.html          ← Camera-based QR scanner
│   ├── admin.html         ← Admin: room CRUD
│   ├── css/styles.css
│   └── js/                (config, auth, api, nav, login, dashboard,
│                           reservations, scan, admin)
│
├── database/
│   ├── README.md
│   ├── schema.sql
│   └── seed.sql
│
├── docs/
│   └── README.md          ← Place reports here
│
├── .gitignore
├── .env.example
└── README.md              ← This file
```

---

## 🚀 Quick Start (3 terminals — total ~5 min)

### Terminal 1 — Database (one-time)

```bash
sudo service postgresql start
psql -U postgres -h localhost -c "CREATE DATABASE \"RoomReservationDB\";"
psql -U postgres -h localhost -d RoomReservationDB -f database/schema.sql
psql -U postgres -h localhost -d RoomReservationDB -f database/seed.sql
```

### Terminal 2 — Backend API

```bash
cd backend/RoomReservationSystem
dotnet restore
dotnet run
```
- Swagger UI: <http://localhost:5000/swagger>
- API base:   <http://localhost:5000>

### Terminal 3 — Frontend

The frontend is plain static files. Use any local web server:

```bash
# Option A — Python (zero install on most systems)
cd frontend
python -m http.server 8080

# Option B — Node http-server
npx http-server frontend -p 8080
```

Open <http://localhost:8080> and sign in with one of the demo accounts below.

> **Why a server and not double-clicking `index.html`?**
> Modern browsers block `fetch()` calls from `file://` origins.
> Any tiny static-file server works.

---

## 🔐 Demo Accounts

| Role    | Email                       | Password   |
|---------|-----------------------------|------------|
| Student | `ahmed@university.com`        | `123456`     |
| Student | `sara@university.com`         | `654321`     |
| Staff   | `sara.staff@university.com`   | `123456`     |
| Admin   | `admin@university.com`        | `admin123`   |

---

## 🧭 Walking Through the Demo

1. **Login** as a Student → land on **Dashboard** with three room cards.
2. Click **Reserve** on *Lab 101* → pick a date and a time window → confirm.
3. Toast confirms the booking; navigate to **My Bookings**.
4. Click **View QR** → modal shows the generated QR PNG.
5. Open **Scan QR** in another tab (or on your phone). Either:
   - Type a room sticker code (e.g. `ROOM-1-LAB101`) and click **Validate** → ✓ Access granted
   - Or scan the QR from step 4 with your camera → server checks the JSON payload, validity window, and reservation status.
6. Logout → log in as **admin@university.com** → access the **Admin** tab → add / edit / delete rooms.

---

## 🔄 End-to-End Data Flow

```
┌──────────┐  POST /api/auth/login    ┌──────────┐  SELECT user        ┌──────────┐
│ FRONTEND │ ───{email,password}────▶ │ BACKEND  │ ──WHERE Email=?───▶ │PostgreSQL│
│          │ ◀────{token,role,id}──── │ +JwtSvc  │ ◀──user row──────── │          │
└──────────┘                           └──────────┘                      └──────────┘
     │ stores JWT in localStorage
     │
     │ POST /api/reservation/create   (Authorization: Bearer …)
     ▼
┌──────────────────────────────────────────────────────────────┐
│ ReservationController                                        │
│   • Validate range, ownership                                │
│   • Overlap check on (RoomID, !Cancelled, halfopen interval) │
│   • INSERT reservation                                       │
│   • QRService.GenerateReservationQR(...)                     │
│   • UPDATE reservations.QRCodeData = payload                 │
│   • Return { reservationID, qrPayload, qrImage(base64 PNG) } │
└──────────────────────────────────────────────────────────────┘
     │
     │ GET /api/qr/validate?qrCodeValue=ROOM-1-LAB101  (scan time)
     │ POST /api/qr/validate-reservation  { payload: "<JSON>" }
     ▼
┌──────────────────────────────────────────────────────────────┐
│ QRController                                                 │
│   • Look up room QR  OR  parse reservation JSON              │
│   • Cross-check current time against the reservation window  │
│   • Cross-check reservation status == "Confirmed"            │
│   • Return Access granted / denied                           │
└──────────────────────────────────────────────────────────────┘
```

---

## 📡 API Reference (high level)

| Method | Path                                            | Auth                     |
|--------|-------------------------------------------------|--------------------------|
| POST   | `/api/auth/login`                               | Public                   |
| GET    | `/api/room`                                     | Student / Staff / Admin  |
| GET    | `/api/room/status/{roomId}`                     | Student / Staff / Admin  |
| GET    | `/api/room/available-slots/{roomId}?date=…`     | Student / Staff / Admin  |
| POST   | `/api/room/add`                                 | Admin                    |
| PUT    | `/api/room/update/{roomId}`                     | Admin                    |
| DELETE | `/api/room/delete/{roomId}`                     | Admin                    |
| POST   | `/api/reservation/create`                       | Student / Staff / Admin  |
| GET    | `/api/reservation/{id}`                         | Owner or Admin           |
| GET    | `/api/reservation/user/{userId}`                | Owner or Admin           |
| PUT    | `/api/reservation/cancel/{id}`                  | Owner or Admin           |
| GET    | `/api/qr/validate?qrCodeValue=…`                | Student / Staff / Admin  |
| POST   | `/api/qr/validate-reservation`                  | Student / Staff / Admin  |

Full request/response schemas live in Swagger at `/swagger`.

---

## 🗄️ Database Schema

```
users         (UserID PK, FirstName, LastName, Email UNIQUE,
               Password, Role CHECK ∈ {Student,Admin,Staff}, StudentNumber)

rooms         (RoomID PK, RoomName, RoomType, Capacity,
               Location, IsAvailable, QRCode)

reservations  (ReservationID PK, UserID FK→users, RoomID FK→rooms,
               ReservationDate, StartTime, EndTime,
               Status, CreatedAt, QRCodeData)

qr_codes      (QRID PK, RoomID FK→rooms UNIQUE, QRCodeValue, IsActive)

INDEX idx_reservations_conflict_check
      ON reservations (RoomID, Status, StartTime, EndTime)
```

---

## 👥 Module Owners

| Area                    | Owner      |
|-------------------------|------------|
| Backend (controllers, JWT, QR)  | Roba       |
| **Database & Integration**     | **Ibrahim** |
| Frontend / UX           | (this repo) |
| Reports / Documentation | Ibrahim    |

---

## 📚 Documentation

- `docs/Report1-*.pdf` — Initial design / requirements
- `docs/Report2-*.pdf` — Conflict-control algorithm
- `docs/Report3-*.pdf` — Implementation report
- `docs/Report4-BackendImplementation.pdf` — Backend implementation
- `docs/Report5-DatabaseAndIntegration.pdf` — **Database design + module integration (Ibrahim's part)**

---

## ⚖️ License

Academic project — for coursework demonstration only.
