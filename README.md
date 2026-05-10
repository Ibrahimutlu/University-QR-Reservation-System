# RoomLink — University QR Room Reservation System

> **Course:** Com6064 Software Engineering
> **Status:** Production-ready — deployable to Railway + Vercel; runs locally with the one-click launcher.

A three-tier room reservation platform with **QR-based check-in / check-out**.
Students reserve study rooms in fixed 2-hour slots; staff and administrators
oversee room usage and view rotating QR codes; entry and exit are gated by
scanning a QR sticker at the door.

---

## Tech stack

| Layer        | Technology                                                       |
|--------------|------------------------------------------------------------------|
| **Backend**  | ASP.NET Core 5.0 Web API · Entity Framework Core · JWT Bearer · QRCoder · Swagger |
| **Database** | PostgreSQL 14+ (Railway / Neon / local WSL)                      |
| **Frontend** | HTML5 · TailwindCSS (CDN) · Vanilla JS · html5-qrcode · No build step |
| **Hosting**  | Backend on Railway (Docker) · Frontend on Vercel · DB on Railway or Neon |

---

## Roles

| Role     | Login                                | Capabilities                                                                 |
|----------|--------------------------------------|------------------------------------------------------------------------------|
| Student  | student-number + name (planned UI)   | Browse rooms · book a 2-hour slot · scan QR to check in / check out · see warnings |
| Staff    | email + password                     | View reservations · monitor room usage · view active QR codes (protected panel) |
| Admin    | email + password                     | Everything above + create students · manage rooms · rotate QR codes          |

Students are created **only by an admin** — there is no self-registration.

---

## Main features

- 3 example rooms (Room A, Room B, Room C) reservable in fixed 2-hour slots between 08:00 and 22:00.
- Single active reservation per student enforced at the database level (partial unique index) AND in controller logic.
- Per-room rotating QR tokens (`QR_ROTATION_INTERVAL_MINUTES`, default 2 min).
- Append-only `scan_logs` audit table for every entry / exit attempt.
- No-show / missed-scan validation on every dashboard load (`CHECKIN_GRACE_PERIOD_MINUTES`, default 15 min).
- Role-based authorization — students never see QR codes inside the UI.
- JWT bearer authentication signed with `JWT_SECRET`.
- CORS allow-list driven by the `FRONTEND_URL` environment variable.
- Same code base runs locally (WSL Postgres) and in production (Railway / Neon).

---

## Local development (one-click launcher, Windows)

| Script           | What it does                                                                                       |
|------------------|----------------------------------------------------------------------------------------------------|
| `start-demo.bat` | Verifies prerequisites - sets up the database - starts backend - starts frontend - opens browser. |
| `stop-demo.bat`  | Closes the spawned terminals and frees ports 5000 and 8000.                                       |

Just **double-click `start-demo.bat`** and wait ~15 seconds.

> Prerequisites (one-time):
> - .NET 5 SDK at `C:\Program Files\dotnet\` (`dotnet --list-sdks` should show `5.0.408`)
> - WSL with PostgreSQL (`sudo service postgresql start`)
> - Python 3 on PATH for the static frontend server

For a deeper local-only walkthrough see [`docs/api-endpoints.md`](docs/api-endpoints.md).

---

## Production deployment overview

| Step | Where        | What                                                                |
|------|--------------|---------------------------------------------------------------------|
| 1    | Railway DB   | Provision a PostgreSQL plugin (or use Neon) and copy `DATABASE_URL` |
| 2    | psql one-off | `psql $DATABASE_URL -f database/schema.sql && psql $DATABASE_URL -f database/seed.sql` |
| 3    | Railway API  | Deploy this repo's `backend/` directory using the Dockerfile        |
| 4    | Railway env  | Set `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, optional `QR_ROTATION_INTERVAL_MINUTES` and `CHECKIN_GRACE_PERIOD_MINUTES` |
| 5    | Vercel       | Import the repo, set root directory to `frontend`                    |
| 6    | Vercel env   | Optional `RRS_API_BASE` env var; or rely on the runtime config in `js/config.js` |

Detailed instructions live in [`docs/deployment-guide.md`](docs/deployment-guide.md).

---

## Repository layout

```
University-QR-Reservation-System/
├── start-demo.bat / stop-demo.bat   one-click local demo (Windows)
├── .env.example                     full reference of every env var
├── README.md
│
├── backend/
│   ├── Dockerfile                   used by Railway
│   ├── railway.json                 Railway service config
│   ├── .dockerignore
│   ├── .env.example                 backend-specific subset
│   ├── global.json                  pins SDK to 5.0.408
│   ├── RoomReservationSystem.sln
│   └── RoomReservationSystem/       all C# source code
│
├── frontend/
│   ├── vercel.json                  Vercel routing config
│   ├── .env.example
│   ├── index.html / login.html / dashboard.html / ...
│   ├── css/, js/                    shared assets
│   └── ...
│
├── database/
│   ├── schema.sql                   tables, FKs, CHECK enums, indexes
│   ├── seed.sql                     3 rooms + 4 demo users
│   └── fix-pg-bind.sh               WSL bind helper
│
└── docs/
    ├── deployment-guide.md          Railway + Vercel + Neon
    ├── api-endpoints.md             every endpoint, role, body, response
    ├── final-integration-report.md  what changed, what is left, how to test
    └── Report5-DatabaseAndIntegration.pdf
```

---

## Demo accounts

| Role    | Login                                        |
|---------|----------------------------------------------|
| Student | `ahmed@university.com` / `123456`            |
| Student | `sara@university.com`  / `654321`            |
| Staff   | `sara.staff@university.com` / `123456`       |
| Admin   | `admin@university.com` / `admin123`          |

---

## Documentation

- [`docs/deployment-guide.md`](docs/deployment-guide.md) — step-by-step Railway / Neon / Vercel setup
- [`docs/api-endpoints.md`](docs/api-endpoints.md) — every endpoint, role, and example
- [`docs/final-integration-report.md`](docs/final-integration-report.md) — change log, risks, test checklist
- [`docs/Report5-DatabaseAndIntegration.pdf`](docs/Report5-DatabaseAndIntegration.pdf) — academic report on the database / integration phase

## License

Academic project — for coursework demonstration only.
