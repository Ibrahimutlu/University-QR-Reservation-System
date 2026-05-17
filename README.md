# RoomLink - University QR Room Reservation System

RoomLink is a university room reservation system with QR-based check-in,
check-out, break mode, in-app notifications, and role-based administration.

The current production setup is:

- Backend API: https://university-qr-reservation-system-production.up.railway.app
- API health: https://university-qr-reservation-system-production.up.railway.app/health
- Frontend: https://university-qr-reservation-system.vercel.app
- Database: Railway PostgreSQL

## Stack

| Layer | Technology |
|---|---|
| Backend | ASP.NET Core 5 Web API, EF Core, Npgsql, JWT Bearer, QRCoder |
| Database | PostgreSQL 14+ |
| Frontend | Static HTML, vanilla JavaScript, page-level CSS, html5-qrcode |
| Hosting | Railway API + Railway PostgreSQL + Vercel frontend |

## Roles

| Role | Login | Main capabilities |
|---|---|---|
| Student | student number + password | Browse rooms, reserve, scan QR, start/end break, view reservations and notifications |
| Staff | email + password | Monitor reservations, view room QR codes, use QR monitor |
| Admin | email + password | Staff capabilities plus room/user management and QR rotation |

Students are created by an admin. There is no student self-registration flow.

## Current Features

- Standard study rooms use fixed 2-hour slots between 08:00 and 22:00.
- Demo Presentation Room is flagged with `IsDemoRoom` and can be booked at any start/end time, any duration, subject to capacity.
- QR scanner has three modes: Check In, Start/End Break, Check Out.
- Break mode keeps the reservation slot held with status `OnBreak`.
- Break limit is configurable with `BREAK_DURATION_MINUTES`, default 15.
- Dynamic room QR values rotate every 2 minutes by default.
- QR acceptance window is configurable with `QR_ACCEPTANCE_WINDOWS`, default 4 windows.
- QR scan time matching accepts both UTC and app-local time, default UTC+3 (`APP_LOCAL_UTC_OFFSET_HOURS=3`).
- In-app notification bar polls `/api/notifications/me` every 30 seconds.
- Notifications are produced for reservation created/cancelled, check-out, break start/end, break overrun, expired check-in, no-show, and no-exit.
- `SchemaRepairService` runs on backend startup to add missing production DB columns/tables/check constraints without dropping data.

## Local Development

Windows one-click flow:

```bat
start-demo.bat
```

Manual flow:

```powershell
# backend
cd backend\RoomReservationSystem
dotnet restore
dotnet run

# frontend, in another terminal
cd frontend
python -m http.server 8000
```

Local URLs:

- Frontend: http://localhost:8000
- Backend: http://localhost:5000
- Swagger: http://localhost:5000/swagger

## Demo Accounts

| Role | Login |
|---|---|
| Student | `20210001` / `123456` |
| Student | `20210002` / `654321` |
| Staff | `sara.staff@university.com` / `123456` |
| Admin | `admin@university.com` / `admin123` |

## Production Notes

Do not run `database/schema.sql` against Railway unless you intentionally want
to reset all data. The schema file drops and recreates tables. Production
incremental repair is handled by `SchemaRepairService` when the backend
deploys/restarts.

Important environment variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Railway/PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret |
| `FRONTEND_URL` | Extra allowed CORS origins |
| `QR_DYNAMIC_SECRET` | Dynamic QR signing secret |
| `QR_ROTATION_INTERVAL_MINUTES` | Dynamic QR bucket size, default 2 |
| `QR_ACCEPTANCE_WINDOWS` | Number of accepted QR buckets, default 4 |
| `BREAK_DURATION_MINUTES` | Break limit, default 15 |
| `CHECKIN_GRACE_PERIOD_MINUTES` | No-check-in grace period, default 15 |
| `CHECKOUT_GRACE_PERIOD_MINUTES` | No-exit grace period, default 5 |
| `APP_LOCAL_UTC_OFFSET_HOURS` | App-local scan comparison offset, default 3 |

## Repository Layout

```text
backend/    ASP.NET Core API, Dockerfile, Railway config
database/   PostgreSQL schema and seed scripts
frontend/   Static HTML/CSS/JS frontend for Vercel
docs/       API/deployment notes and course reports
```

## Documentation

- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)
- [Database README](database/README.md)
- [API endpoints](docs/api-endpoints.md)
- [Deployment guide](docs/deployment-guide.md)

## License

Academic project for coursework demonstration.
